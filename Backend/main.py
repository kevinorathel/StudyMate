import ast
from typing import Optional, List, Dict, Any

import numpy as np
from faiss import IndexFlatL2
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import uvicorn
import os
from datetime import datetime

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

class SessionCreateRequest(BaseModel):
    user_id: int
    session_name: Optional[str] = None

class SessionDocument(BaseModel):
    document_id: int
    document_title: str

class SessionResponse(BaseModel):
    session_id: int
    session_name: str
    documents: List[SessionDocument]



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

            full_name_joined = " ".join(
                part for part in [first_name, last_name] if part
            ).strip()

            return {
                "message": "User registered successfully",
                "user_id": user_id,
                "user": {
                    "id": user_id,
                    "first_name": first_name,
                    "last_name": last_name,
                    "full_name": full_name_joined if full_name_joined else None,
                    "email": payload.email,
                },
            }

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

            cur.execute(
                """
                SELECT user_id, pwd, first_name, last_name, email
                FROM user_login
                WHERE email = %s
                """,
                (payload.email,),
            )
            user = cur.fetchone()

            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            user_id, stored_hashed_pw, first_name, last_name, email = user

            # Verify password
            if not bcrypt.checkpw(payload.password.encode('utf-8'), stored_hashed_pw.encode('utf-8')):
                raise HTTPException(status_code=401, detail="Invalid credentials")

            cur.close()
            #conn.close()

            full_name_joined = " ".join(
                part for part in [first_name, last_name] if part
            ).strip()

            return {
                "message": "Login successful",
                "user_id": user_id,
                "user": {
                    "id": user_id,
                    "first_name": first_name,
                    "last_name": last_name,
                    "full_name": full_name_joined if full_name_joined else None,
                    "email": email,
                },
            }

    except HTTPException as e:
        raise e
    except Exception as e:
        print("Login error:", e)
        raise HTTPException(status_code=500, detail="Internal server error")

def _normalize_session_rows(rows: List[tuple]) -> List[Dict[str, Any]]:
    by_session: Dict[int, Dict[str, Any]] = {}
    for row in rows:
        (
            session_id,
            session_name,
            document_id,
            document_title,
        ) = row

        if session_id not in by_session:
            by_session[session_id] = {
                "session_id": session_id,
                "session_name": session_name,
                "documents": [],
            }

        if document_id is not None:
            by_session[session_id]["documents"].append(
                {
                    "document_id": document_id,
                    "document_title": document_title,
                }
            )

    # Sort sessions by creation order (descending) so newest first
    sessions = list(by_session.values())
    sessions.sort(key=lambda item: item["session_id"], reverse=True)
    for session in sessions:
        session["documents"].sort(key=lambda doc: doc["document_id"], reverse=True)
    return sessions


def _default_session_name() -> str:
    return f"Study Session {datetime.utcnow():%Y%m%d%H%M%S}"


def _group_session_history_rows(rows: List[tuple]) -> List[Dict[str, Any]]:
    grouped: Dict[int, Dict[str, Any]] = {}
    for row in rows:
        (
            session_id,
            session_name,
            sender,
            message,
            created_at,
        ) = row

        if session_id not in grouped:
            grouped[session_id] = {
                "session_id": session_id,
                "session_name": session_name,
                "messages": [],
            }

        if sender is not None:
            grouped[session_id]["messages"].append((sender, message, created_at))

    sessions = list(grouped.values())
    sessions.sort(key=lambda item: item["session_id"], reverse=True)
    for session in sessions:
        session["messages"].sort(
            key=lambda entry: entry[2] if entry[2] is not None else datetime.min
        )

    return sessions


@app.get("/sessions/", response_model=List[SessionResponse])
@app.get("/sessions", response_model=List[SessionResponse])
@app.get("/api/sessions/", response_model=List[SessionResponse])
@app.get("/api/sessions", response_model=List[SessionResponse])
def list_sessions(user_id: int):
    if user_id is None:
        raise HTTPException(status_code=400, detail="user_id is required.")

    try:
        with get_cursor() as cur:
            cur.execute(
                """
                SELECT
                    s.session_id,
                    s.session_name,
                    d.document_id,
                    d.document_title
                FROM sessions s
                LEFT JOIN sessiondocuments sd ON sd.session_id = s.session_id
                LEFT JOIN document d ON d.document_id = sd.document_id
                WHERE s.user_id = %s
                ORDER BY s.session_id DESC, d.document_id DESC;
                """,
                (user_id,),
            )
            rows = cur.fetchall()

            if not rows:
                return []

            return _normalize_session_rows(rows)

    except Exception as db_error:
        print(f"Failed to load sessions: {db_error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to load sessions: {db_error}",
        )


@app.post("/sessions/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
@app.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
@app.post("/api/sessions/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
@app.post("/api/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(payload: SessionCreateRequest):
    session_name = payload.session_name.strip() if payload.session_name else _default_session_name()

    try:
        with get_cursor() as cur:
            cur.execute(
                """
                INSERT INTO sessions (user_id, session_name)
                VALUES (%s, %s)
                RETURNING session_id, session_name;
                """,
                (payload.user_id, session_name),
            )
            result = cur.fetchone()
            if not result:
                raise Exception("Failed to create session.")

            session_id, created_name = result

        return {
            "session_id": session_id,
            "session_name": created_name,
            "documents": [],
        }

    except Exception as db_error:
        print(f"Failed to create session: {db_error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to create session: {db_error}",
        )


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
                cur.execute(
                    "INSERT INTO sessiondocuments (session_id, document_id) VALUES (%s, %s) RETURNING id;",
                    (session_id, document_id)
                )
                sessionDocumentResult = cur.fetchone()

                if not sessionDocumentResult:
                    raise Exception("Failed to create sessionDocument entry after session creation.")

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

    except HTTPException:
        raise
    except Exception as db_error:
        print(f"Database operation failed: {db_error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"A database operation failed (e.g., connection or insertion error): {db_error}"
        )

@app.get("/retrieveChatHistory/")
async def retrieve_chat_history(session_id: Optional[int] = None, user_id: Optional[int] = None):
    """Fetches chat history for a session or all sessions that belong to a user."""

    if session_id is None and user_id is None:
        raise HTTPException(status_code=400, detail="Provide either session_id or user_id.")

    try:
        with get_cursor() as cur:
            if session_id is not None:
                cur.execute(
                    "SELECT user_id, session_name FROM sessions WHERE session_id = %s;",
                    (session_id,),
                )
                session_row = cur.fetchone()
                if not session_row:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Session {session_id} not found.",
                    )

                session_user_id, session_name = session_row
                if user_id is not None and session_user_id != user_id:
                    raise HTTPException(
                        status_code=403,
                        detail="Session does not belong to the requested user.",
                    )

                cur.execute(
                    """
                    SELECT sender, message, created_at
                    FROM chat_history
                    WHERE session_id = %s
                    ORDER BY created_at ASC;
                    """,
                    (session_id,),
                )
                chat_history = cur.fetchall()
                return {
                    "session_id": session_id,
                    "session_name": session_name,
                    "response": chat_history,
                }

            # Only user_id provided: return chat history grouped by session
            cur.execute(
                """
                SELECT
                    s.session_id,
                    s.session_name,
                    ch.sender,
                    ch.message,
                    ch.created_at
                FROM sessions s
                LEFT JOIN chat_history ch ON ch.session_id = s.session_id
                WHERE s.user_id = %s
                ORDER BY s.session_id DESC, ch.created_at ASC;
                """,
                (user_id,),
            )
            rows = cur.fetchall()

            if not rows:
                return {"sessions": []}

            sessions = _group_session_history_rows(rows)
            return {"sessions": sessions}

    except HTTPException:
        raise
    except Exception as db_error:
        print(f"Database operation failed: {db_error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"A database operation failed (e.g., connection or insertion error): {db_error}",
        )

def _ensure_session_exists(cur, session_id: int) -> None:
    cur.execute(
        "SELECT EXISTS(SELECT 1 FROM sessions WHERE session_id = %s);",
        (session_id,),
    )
    session_exists = cur.fetchone()
    if not (session_exists and session_exists[0]):
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found.")

def _answer_for_question(session_id: int, question: str) -> Dict[str, str]:
    if not question or not question.strip():
        raise HTTPException(status_code=400, detail="Question text is required.")

    try:
        with get_cursor() as cur:

            _ensure_session_exists(cur, session_id)

            cur.execute(
                "SELECT sender, message, created_at FROM chat_history WHERE session_id = %s;",
                (session_id,),
            )
            chat_history = cur.fetchall()

            formatted_lines = [
                f"{sender}: {message}"
                for sender, message, _ in chat_history
            ]
            history = "\n".join(formatted_lines)

            cur.execute(
                "SELECT embedding, chunk_text FROM embeddings e "
                "LEFT JOIN sessiondocuments sd on sd.session_id = %s "
                "WHERE e.document_id = sd.document_id;",
                (session_id,),
            )
            index_store = cur.fetchall()

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

            cur.execute(
                "INSERT INTO chat_history (session_id, sender, message) VALUES (%s, %s, %s);",
                (session_id, 'User', question)
            )

            cur.execute(
                "INSERT INTO chat_history (session_id, sender, message) VALUES (%s, %s, %s);",
                (session_id, 'Bot', response)
            )

            return {"response": response}

    except HTTPException:
        raise
    except Exception as db_error:
        print(f"Database operation failed: {db_error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"A database operation failed (e.g., connection or insertion error): {db_error}"
        )

@app.post("/ask/", status_code=status.HTTP_200_OK)
@app.post("/ask", status_code=status.HTTP_200_OK)
@app.post("/api/ask/", status_code=status.HTTP_200_OK)
@app.post("/api/ask", status_code=status.HTTP_200_OK)
async def ask_question_post(payload: AskRequest):
    """Accepts a JSON payload for a chat question."""
    return _answer_for_question(payload.session_id, payload.question)

@app.get("/ask/", status_code=status.HTTP_200_OK)
@app.get("/ask", status_code=status.HTTP_200_OK)
@app.get("/api/ask/", status_code=status.HTTP_200_OK)
@app.get("/api/ask", status_code=status.HTTP_200_OK)
async def ask_question_get(session_id: int, question: str):
    """Supports legacy GET requests with query parameters."""
    return _answer_for_question(session_id, question)

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
