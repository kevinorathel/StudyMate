import ast
import shutil
from typing import Optional, List, Dict

import numpy as np
from faiss import IndexFlatL2
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import uvicorn
import os
from pydub import AudioSegment
import glob

from rest_framework import status
from starlette.background import BackgroundTask
from starlette.responses import  FileResponse

from Flashcards import run_flashcard_job
from Summarizer import Summarizer_main, db_connection
from dbconnect import get_cursor
import bcrypt
from PDFUtil import read_scanned_pdf, chunk_text, embed_chunks, search_index, generate_response, generate_session_name
from AudioGen import summarize_chunk, generate_continued_script, generate_initial_script, text_to_speech, \
    cleanup_directory


app = FastAPI(title="StudyMate API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Keep only the frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

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

def cleanup_file_and_dir(file_path: str, dir_path: str):
    """Deletes the file and the temporary directory."""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
        if os.path.exists(dir_path):
            shutil.rmtree(dir_path, ignore_errors=True)
        print(f"Cleaned up temporary summary directory: {dir_path}")
    except Exception as e:
        print(f"Error during file cleanup: {e}")

@app.get("/TestAPI", status_code=status.HTTP_200_OK)
async def test_api():
    return {"message": "Server is running fine"}

@app.post("/signup", status_code=status.HTTP_200_OK)
async def signup_user(payload: SignupRequest):
    try:
        with get_cursor() as cur:

            full_name = payload.full_name.strip()
            first_name, last_name = (full_name.split(" ", 1) + [""])[:2]

            cur.execute("SELECT user_id FROM user_login WHERE email = %s", (payload.email,))
            existing_user = cur.fetchone()
            if existing_user:
                raise HTTPException(status_code=400, detail="Email already registered")

            hashed_pw = bcrypt.hashpw(payload.password.encode('utf-8'), bcrypt.gensalt())

            cur.execute(
                """
                INSERT INTO user_login (first_name, last_name, email, pwd, is_verified)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING user_id;
                """,
                (first_name, last_name, payload.email, hashed_pw.decode('utf-8'), False)
            )

            user_id = cur.fetchone()[0]

            cur.close()

            return {"message": "User registered successfully", "user_id": user_id}

    except HTTPException as e:
        raise e
    except Exception as e:
        print("Signup error:", e)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/login", status_code=status.HTTP_200_OK)
async def login_user(payload: LoginRequest):
    try:
        with get_cursor() as cur:

            cur.execute("SELECT user_id, pwd FROM user_login WHERE email = %s", (payload.email,))
            user = cur.fetchone()

            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            user_id, stored_hashed_pw = user

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
            session_exists = False
            if(session_id is None):

                cur.execute(
                    "INSERT INTO sessions (user_id, session_name) VALUES (%s, %s) RETURNING session_id;",
                    (user_id, session_name)
                )
                sessionResult = cur.fetchone()

                if not sessionResult:
                    raise Exception("Failed to retrieve session ID.")

                session_id = sessionResult[0]
                session_exists = True
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
                sessionDoc_id = sessionDocumentResult[0]
                print(f"SessionDocument entry created with ID: {sessionDoc_id}")

                if not sessionDocumentResult:
                    raise Exception("Failed to create sessionDocument entry after session creation.")

            else:
                raise Exception(f"Provided session ID {session_id} is not found in the database.")



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

@app.get("/retrieveChatHistory/", status_code=status.HTTP_200_OK)
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

@app.post("/ask/", status_code=status.HTTP_200_OK)
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

                cur.execute(
                    "SELECT embedding, chunk_text FROM embeddings e "
                    "LEFT JOIN sessiondocuments sd on sd.session_id = %s "
                    "WHERE e.document_id = sd.document_id;",
                    (session_id,)
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


    except Exception as db_error:

        print(f"Database operation failed: {db_error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"A database operation failed (e.g., connection or insertion error): {db_error}"
        )

@app.get("/getDocumentsBySession", status_code=status.HTTP_200_OK)
async def getSessionFiles(session_id: int):

    try:
        with get_cursor() as cur:
            cur.execute(
                    "SELECT EXISTS(SELECT 1 FROM sessions WHERE session_id = %s);",
                    (session_id,)
                )
            session_exists = cur.fetchone()
            if session_exists and session_exists[0]:
                cur.execute(
                    "SELECT d.document_title  "
                    "FROM sessions s "
                    "LEFT JOIN sessiondocuments sd ON sd.session_id = s.session_id "
                    "LEFT JOIN document d ON d.document_id = sd.document_id "
                    "WHERE s.session_id = %s;",
                    (session_id,)
                )
                document_titles = cur.fetchall()

    except Exception as db_error:
        print(f"Database operation failed: {db_error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"A database operation failed (e.g., connection or insertion error): {db_error}"
        )

    return {"documents": document_titles}

@app.get("/getSessionsByUserId", status_code=status.HTTP_200_OK)
async def getSessions(user_id: int):

    try:
        with get_cursor() as cur:
            cur.execute(
                    "SELECT EXISTS(SELECT 1 FROM user_login WHERE user_id = %s);",
                    (user_id,)
                )
            session_exists = cur.fetchone()
            if session_exists and session_exists[0]:
                cur.execute(
                    "SELECT s.session_id, s.session_name  "
                    "FROM sessions s "
                    "WHERE s.user_id = %s;",
                    (user_id,)
                )
                session_data = cur.fetchall()


    except Exception as db_error:
        print(f"Database operation failed: {db_error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"A database operation failed (e.g., connection or insertion error): {db_error}"
        )

    return {"session_data": session_data}

@app.get("/generateAudioLesson", status_code=status.HTTP_200_OK)
async def generate_audio_lesson(session_id: int):
    """
    Processes a scanned PDF, generates multiple MP3 audio lessons,
    and returns them bundled as a single ZIP file.
    """

    OUTPUT_DIR = "Audio Lessons"
    FILLER_AUDIO_PATH = "misc/page-flip.mp3"

    if not os.path.exists(OUTPUT_DIR):

        os.makedirs(OUTPUT_DIR)
        print(f"Created output directory: {OUTPUT_DIR}")

    try:
        with get_cursor() as cur:

            cur.execute(
                "SELECT e.chunk_text " 
                "FROM embeddings e "
                "LEFT JOIN sessiondocuments sd ON sd.document_id  = e.document_id "
                "WHERE sd.session_id = %s;",
                (session_id,)
            )
            session_chunks = cur.fetchall()

            for i, chunk in enumerate(session_chunks):

                print(f"\nProcessing Chunk {i+1} of {len(session_chunks)}")
                summary = summarize_chunk(chunk)
                if(i == 0):
                    script = generate_initial_script(summary)
                else:
                    script = generate_continued_script(summary)

                base_filename = f"{i+1}.mp3"

                audio_file = os.path.join(OUTPUT_DIR, base_filename)

                text_to_speech(script, audio_file, voice_name='en-US-Wavenet-I')

            print("\nAudios generated for individual chunks! ",)

            cur.execute(
                "SELECT s.session_name "
                "FROM sessions s "
                "WHERE s.session_id = %s;",
                (session_id,)
            )
            session_name = cur.fetchone()
            if session_name:
                audiofile_name = session_name[0]
            else:
                audiofile_name = None
            FINAL_AUDIO_FILENAME = f"{audiofile_name}.mp3"

            file_paths = sorted(glob.glob(os.path.join(OUTPUT_DIR, "*.mp3")),
                    key=lambda x: int(os.path.basename(x).split('.')[0]))

            combined_audio = AudioSegment.empty()

            print(f"\nStitching {len(file_paths)} individual audio files...")

            if not os.path.exists(FILLER_AUDIO_PATH):
                print(f"ERROR: Filler audio not found at {FILLER_AUDIO_PATH}")
                filler_audio = AudioSegment.empty()
            else:
                filler_audio = AudioSegment.from_mp3(FILLER_AUDIO_PATH)

            for i, file_path in enumerate(file_paths):
                print(f"Adding: {os.path.basename(file_path)}")

                chunk_audio = AudioSegment.from_mp3(file_path)

                combined_audio += chunk_audio

                if i < len(file_paths) - 1:
                    combined_audio += filler_audio
                    print("   - Added filler audio (page-flip).")

            final_output_path = os.path.join(OUTPUT_DIR, FINAL_AUDIO_FILENAME)

            combined_audio.export(final_output_path, format="mp3")

            print(f"\nAll audios successfully stitched into: {final_output_path}")


            file_to_return = final_output_path

            return FileResponse(
                path=file_to_return,
                filename=FINAL_AUDIO_FILENAME,
                media_type="audio/mpeg",
                background=BackgroundTask(cleanup_directory, OUTPUT_DIR)
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Audio generation failed.")

    finally:
        if file_to_return is None and os.path.exists(OUTPUT_DIR):
            print(f"Error occurred. Attempting cleanup of {OUTPUT_DIR}...")
            shutil.rmtree(OUTPUT_DIR, ignore_errors=True)

@app.get("/generateSessionSummary", status_code=status.HTTP_200_OK)
async def generate_session_summary(session_id: int):

    try:
        pdf_path = Summarizer_main(session_id)

        file_name = os.path.basename(pdf_path)
        temp_dir = os.path.dirname(pdf_path)

        return FileResponse(
            path=pdf_path,
            filename=file_name,
            media_type="application/pdf",
            background=BackgroundTask(cleanup_file_and_dir, pdf_path, temp_dir)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Summary generation failed: {e}"
        )

@app.get("/generateFlashcards", status_code=status.HTTP_200_OK, response_model=List[Dict])
async def generate_session_flashcards(session_id: int):
    """
    Triggers the RAG pipeline to generate a list of question-and-answer flashcards
    for a specified session ID.
    """

    if session_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session_id. Must be a positive integer."
        )

    try:
        print(f"Starting Flashcards job for session ID: {session_id}")

        flashcards_list = run_flashcard_job(
            session_id=session_id,
            db_connection_service=db_connection
        )

        return flashcards_list

    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Flashcard generation failed due to internal process error: {e}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during flashcard generation: {e}"
        )


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


