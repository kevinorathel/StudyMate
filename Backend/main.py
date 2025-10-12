# main.py
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os

from rest_framework import status

from dbconnect import get_cursor
from PDFUtil import read_scanned_pdf, chunk_text, embed_chunks, search_index, generate_response, generate_session_name
from AudioGen import audiogenmain


app = FastAPI(title="StudyMate API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Keep only the frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

conversation_store = {}
index_store = {}

class AskRequest(BaseModel):
    session_id: str
    question: str

@app.get("/TestAPI")
def read_root():
    return {"message": "Server is running fine"}


@app.post("/upload/", status_code=status.HTTP_200_OK)
async def upload_pdf(file: UploadFile, user_id: int):
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
                    vector.tolist()
                )
                for i, vector in enumerate(vectors)
            ]

            insert_query = """
                INSERT INTO embeddings (document_id, chunk_index, embedding) 
                VALUES (%s, %s, %s);
            """

            cur.executemany(insert_query, data_to_insert)

            print("All vectors uploaded successfully.")

            session_name = generate_session_name(file.filename)

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

@app.post("/ask/")
async def ask_question(request: AskRequest):
    """Handles chat interaction and remembers conversation history."""
    session_id = request.session_id
    question = request.question

    if session_id not in index_store:
        return {"error": "Invalid session. Please upload a PDF first."}

    index, chunks = index_store[session_id]
    results = search_index(question, index, chunks, k=3)
    context = results[0][0]
    history = conversation_store.get(session_id, [])

    bot_response = generate_response(question, context, history)

    history.append(f"User: {question}")
    history.append(f"Bot: {bot_response}")
    conversation_store[session_id] = history

    return {"response": bot_response, "conversation_history": history}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


