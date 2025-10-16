import ast
from typing import Optional

import numpy as np
from faiss import IndexFlatL2
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import uvicorn
import os

from rest_framework import status

from dbconnect import get_cursor
import bcrypt
from PDFUtil import read_scanned_pdf, chunk_text, embed_chunks, search_index, generate_response, generate_session_name
#from AudioGen import audiogenmain

from fastapi import APIRouter


app = FastAPI(title="StudyMate API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Keep only the frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#Pydantic models for request validation
class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AskRequest(BaseModel):
    session_id: int
    question: str



@app.get("/TestAPI", status_code=status.HTTP_200_OK)
def read_root():
    return {"message": "Server is running fine"}

#Signup route
@app.post("/api/auth/signup")
def signup_user(payload: SignupRequest):
    try:
        with get_cursor() as cur:

            # Split full name into first/last
            full_name = payload.full_name.strip()
            first_name, last_name = (full_name.split(" ", 1) + [""])[:2]

            # Check if email already exists
            cur.execute("SELECT user_id FROM user_login WHERE email = %s", (payload.email,))
            existing_user = cur.fetchone()
            if existing_user:
                raise HTTPException(status_code=400, detail="Email already registered")

            # Hash password before storing
            hashed_pw = bcrypt.hashpw(payload.password.encode('utf-8'), bcrypt.gensalt())

            # Insert user record
            cur.execute(
                """
                INSERT INTO user_login (first_name, last_name, email, pwd, is_verified)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING user_id;
                """,
                (first_name, last_name, payload.email, hashed_pw.decode('utf-8'), False)
            )

            # conn.commit()
            user_id = cur.fetchone()[0]

            cur.close()
            # conn.close()

            return {"message": "User registered successfully", "user_id": user_id}

    except HTTPException as e:
        raise e
    except Exception as e:
        print("Signup error:", e)
        raise HTTPException(status_code=500, detail="Internal server error")


#Login route
@app.post("/api/auth/login")
def login_user(payload: LoginRequest):
    try:
        with get_cursor() as cur:

            cur.execute("SELECT user_id, pwd FROM user_login WHERE email = %s", (payload.email,))
            user = cur.fetchone()

            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            user_id, stored_hashed_pw = user

            # Verify password
            if not bcrypt.checkpw(payload.password.encode('utf-8'), stored_hashed_pw.encode('utf-8')):
                raise HTTPException(status_code=401, detail="Invalid credentials")

            cur.close()
            #conn.close()

            return {"message": "Login successful", "user_id": user_id}

    except HTTPException as e:
        raise e
    except Exception as e:
        print("Login error:", e)
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/upload/", status_code=status.HTTP_200_OK)
async def upload_pdf(file: UploadFile, user_id: int, session_id: Optional[int] = None):
    """Uploads a PDF, extracts text, embeds, and stores vectors using pgvector."""

    print("Uploading document and generating vectors...")

    pdf_content_bytes = await file.read()

    file_path = f"./uploads/{file.filename}"
    os.makedirs("uploads", exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(pdf_content_bytes)

    try:
        text = read_scanned_pdf(file_path)
        chunks = chunk_text(text, chunk_size=200, overlap=50)
        vectors = embed_chunks(chunks)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF processing failed: {e}"
        )

    try:
        with get_cursor() as cur:

            cur.execute(
                "INSERT INTO document (document_title, pdf_content, user_id) VALUES (%s, %s, %s) RETURNING document_id;",
                (file.filename, pdf_content_bytes, user_id)
            )
            documentResult = cur.fetchone()

            if not documentResult:
                raise Exception("Failed to retrieve document ID after insertion.")

            document_id = documentResult[0]
            print(f"Document uploaded with ID: {document_id}")

            print(f"Inserting {len(vectors)} vectors into embeddings table...")

            data_to_insert = [
                (
                    document_id,
                    i,
                    chunks[i],
                    vector.tolist()
                )
                for i, vector in enumerate(vectors)
            ]

            insert_query = """
                INSERT INTO embeddings (document_id, chunk_index, chunk_text, embedding) 
                VALUES (%s, %s, %s, %s);
            """
            cur.executemany(insert_query, data_to_insert)

            print("All vectors uploaded successfully.")

            session_name = generate_session_name(file.filename)

            if(session_id is None):

                cur.execute(
                    "INSERT INTO sessions (user_id, session_name) VALUES (%s, %s) RETURNING session_id;",
                    (user_id, session_name)
                )
                sessionResult = cur.fetchone()

                if not sessionResult:
                    raise Exception("Failed to retrieve session ID.")

                session_id = sessionResult[0]
                print(f"Session created with ID: {session_id}")

            else:
                cur.execute(
                    "SELECT EXISTS(SELECT 1 FROM sessions WHERE session_id = %s);",
                    (session_id,)
                )
                session_exists = cur.fetchone()[0]

                if session_exists:
                    cur.execute(
                        "INSERT INTO sessiondocuments (session_id, document_id) VALUES (%s, %s) RETURNING id;",
                        (session_id, document_id)
                    )

                    sessionDocumentResult = cur.fetchone()

                    if not sessionDocumentResult:
                        raise Exception("Failed to create sessionDocument entry after session creation.")

                else:
                    raise Exception(f"Provided session ID {session_id} is not found in the database.")

            sessionDoc_id = sessionDocumentResult[0]
            print(f"SessionDocument entry created with ID: {sessionDoc_id}")

            return {
                "message": "Document uploaded and processed successfully",
                "document_id": document_id,
                "session_id": session_id,
                "session_name": session_name
            }

    except Exception as db_error:
        print(f"Database operation failed: {db_error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"A database operation failed (e.g., connection or insertion error): {db_error}"
        )

@app.get("/retrieveChatHistory/")
async def retrieve_chat_history(session_id: int):
    """Handles chat interaction and remembers conversation history."""

    try:
        with get_cursor() as cur:
            cur.execute(
                    "SELECT EXISTS(SELECT 1 FROM sessions WHERE session_id = %s);",
                    (session_id,)
                )
            session_exists = cur.fetchone()
            if session_exists and session_exists[0]:
                cur.execute(
                    "SELECT sender, message, created_at FROM chat_history WHERE session_id = %s;",
                    (session_id,)
                )
                ChatHistory = cur.fetchall()
                # print(ChatHistory)

    except Exception as db_error:
        print(f"Database operation failed: {db_error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"A database operation failed (e.g., connection or insertion error): {db_error}"
        )

    return {"response": ChatHistory}

@app.get("/ask/")
async def ask_question(request: AskRequest):
    """Handles chat interaction and remembers conversation history."""
    session_id = request.session_id
    question = request.question

    try:
        with get_cursor() as cur:

            cur.execute(
                    "SELECT EXISTS(SELECT 1 FROM sessions WHERE session_id = %s);",
                    (session_id,)
                )
            session_exists = cur.fetchone()

            if session_exists and session_exists[0]:

                cur.execute(
                    "SELECT sender, message, created_at FROM chat_history WHERE session_id = %s;",
                    (session_id,)
                )

                ChatHistory = cur.fetchall()

                formatted_lines = []

                for entry in ChatHistory:
                    sender = entry[0]
                    message = entry[1]
                    formatted_line = f"{sender}: {message}"

                    formatted_lines.append(formatted_line)

                history = "\n".join(formatted_lines)

                # print(history)

                cur.execute(
                    "SELECT embedding, chunk_text FROM embeddings e "
                    "LEFT JOIN sessiondocuments sd on sd.session_id = %s "
                    "WHERE e.document_id = sd.document_id;",
                    (session_id,)
                )

                index_store = cur.fetchall()

                # print(index_store)

                raw_embeddings = []
                chunks = []

                for embedding_data, chunk_text in index_store:
                    chunks.append(chunk_text)

                    try:
                        float_list = ast.literal_eval(embedding_data)
                        vector = np.array(float_list, dtype='float32')
                        raw_embeddings.append(vector)

                    except Exception as e:
                        print(f"Error converting embedding data to vector: {e}")

                if not raw_embeddings:
                    print("Warning: No embeddings found for this session.")
                    index = None
                    chunks = []
                else:
                    vectors_matrix = np.vstack(raw_embeddings)
                    dimension = vectors_matrix.shape[1]

                    index = IndexFlatL2(dimension)
                    index.add(vectors_matrix)

                results = search_index(question, index, chunks, k=3)
                context = results[0][0]
                response = generate_response(question, context, history)

                # print(f"Context:{context} \nHistory:{history}")

                cur.execute(
                    "INSERT INTO chat_history (session_id, sender, message) VALUES (%s, %s, %s);",
                    (session_id, 'User', question)
                )

                cur.execute(
                    "INSERT INTO chat_history (session_id, sender, message) VALUES (%s, %s, %s);",
                    (session_id, 'Bot', response)
                )

                return {"response": response}


    except Exception as db_error:

        print(f"Database operation failed: {db_error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"A database operation failed (e.g., connection or insertion error): {db_error}"
        )

# @app.get("/generateAudioLesson")
# async def generate_audio_lesson(
#     file_path: str = Query(..., description="The full, URL-encoded path to the scanned PDF file.")
# ):
#     """
#     Processes a scanned PDF, generates multiple MP3 audio lessons,
#     and returns them bundled as a single ZIP file.
#     """
#     if not audiogenmain:
#         return JSONResponse(
#             status_code=500,
#             content={"status": "error", "message": "Audio generation module failed to load. Check server logs."}
#         )
#
#     print(f"Received request for file_path: {file_path}")
#
#     try:
#         # Run the core logic, which now returns ZIP binary data and filename
#         zip_bytes, output_zip_filename = audiogenmain(file_path)
#
#         # Use io.BytesIO to create a file-like object from the binary data
#         zip_file_like = io.BytesIO(zip_bytes)
#
#         # Return a StreamingResponse to stream the ZIP file to the client
#         return StreamingResponse(
#             zip_file_like,
#             media_type="application/zip",
#             headers={
#                 "Content-Disposition": f"attachment; filename={output_zip_filename}",
#                 "Content-Length": str(len(zip_bytes))
#             }
#         )
#
#     except ConnectionError as e:
#         # Handle TTS client initialization failure
#         return JSONResponse(
#             status_code=503,
#             content={"status": "error", "message": f"Service unavailable: {str(e)}"}
#         )
#
#     except ValueError as e:
#         # Handle errors from PDF reading/chunking
#         return JSONResponse(
#             status_code=400,
#             content={"status": "error", "message": f"PDF processing error: {str(e)}"}
#         )
#
#     except Exception as e:
#         # Catch any other unexpected errors
#         return JSONResponse(
#             status_code=500,
#             content={"status": "error", "message": f"An unexpected server error occurred: {str(e)}"}
#         )


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


