import os
import json
import sys
from typing import List, Dict
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from sentence_transformers import SentenceTransformer

from dbconnect import get_cursor

GEMINI_MODEL_NAME = "gemini-2.5-flash-lite"
LOCAL_EMBED_MODEL = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
FLASHCARD_CHUNK_LIMIT = 75

try:
    CLIENT = genai.Client()
except Exception as e:
    print(f"CRITICAL ERROR: Failed to initialize Gemini Client. Check GEMINI_API_KEY. {e}", file=sys.stderr)
    sys.exit(1)


class Flashcard(BaseModel):
    """A single question and answer pair."""
    question: str = Field(description="A concise question based on the context.")
    answer: str = Field(description="A detailed answer to the question, strictly from the context.")

class FlashcardSet(BaseModel):
    """A collection of generated flashcards."""
    flashcards: List[Flashcard] = Field(description="A list of 15 distinct generated flashcard objects.")



def get_rag_context(session_id: int, summarization_query: str, k: int) -> str:
    """
    RAG Context Retrieval: Generates query embedding using the local SentenceTransformer
    and fetches relevant chunks from the database based on the session_id.
    """

    try:
        query_vector = LOCAL_EMBED_MODEL.encode(
            [summarization_query],
            convert_to_numpy=True,
            normalize_embeddings=True
        ).astype("float32")
        query_embedding = query_vector[0].tolist()
    except Exception as e:
        raise RuntimeError(f"Failed to generate embedding for query using local model: {e}")

    query_vector_string = '[' + ','.join(map(str, query_embedding)) + ']'

    try:
        with get_cursor() as cursor:
            print(f" Executing vector search for session {session_id}...")

            sql_query = """
                SELECT  e.chunk_text 
                FROM embeddings e
                LEFT JOIN sessiondocuments s on s.document_id = e.document_id 
                WHERE  s.session_id = %s 
                ORDER BY e.embedding <=> %s::vector
                LIMIT %s;
            """

            cursor.execute(sql_query, (session_id, query_vector_string, k))
            chunks = cursor.fetchall()

    except Exception as e:
        raise RuntimeError(f"Database query failed during RAG context retrieval: {e}")

    context_text = "\n\n---\n\n".join([row[0] for row in chunks if isinstance(row, tuple) and len(row) > 0])

    if not context_text:
        print(f"Warning: RAG query returned 0 chunks for session ID {session_id}.")
        return ""

    return context_text

def generate_flashcards(context: str) -> List[Dict[str, str]]:
    """
    Generates structured flashcards (Q&A pairs) from the RAG context using Gemini.
    """
    system_prompt = (
        "You are an academic flashcard generator. "
        "Your task is to create 15 distinct question-and-answer pairs "
        "that cover the most important concepts, definitions, and facts "
        "found ONLY in the CONTEXT section provided below. "
        "Your output MUST strictly follow the requested JSON schema."
    )

    user_prompt = f"""
        CONTEXT:
        {context}
    """

    try:
        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.4,
            response_mime_type="application/json",
            response_schema=FlashcardSet,
        )

        response = CLIENT.models.generate_content(
            model=GEMINI_MODEL_NAME,
            contents=user_prompt,
            config=config
        )

        flashcard_data = json.loads(response.text)
        return flashcard_data.get('flashcards', [])

    except Exception as e:
        print(f"Error generating flashcards: {e}", file=sys.stderr)
        return []



def run_flashcard_job(session_id: int, db_connection_service) -> List[Dict[str, str]]:
    """
    Orchestrates the flashcard generation process. RAG context is handled internally.

    Args:
        session_id: The ID of the session.
        db_connection_service: An object with update_session_status method.

    Returns:
        A list of generated flashcards.
    """
    try:
        db_connection_service.update_session_status(session_id, "Processing: Generating Flashcards")

        flashcard_query = "Extract all key facts, definitions, and concepts for creating 15 flashcards."

        context_text = get_rag_context(session_id, flashcard_query, FLASHCARD_CHUNK_LIMIT)

        if not context_text:
            db_connection_service.update_session_status(session_id, "Failed: No context found")
            raise RuntimeError("No document chunks available for this session.")

        db_connection_service.update_session_status(session_id, "Processing: Generating Flashcards with LLM")
        flashcards = generate_flashcards(context_text)

        if not flashcards:
            db_connection_service.update_session_status(session_id, "Failed: LLM returned no flashcards")
            raise RuntimeError("LLM failed to produce flashcards.")

        db_connection_service.update_session_status(session_id, "Flashcards Generated")

        print(f"Flashcard job completed for session {session_id}.")

        return flashcards

    except Exception as e:
        db_connection_service.update_session_status(session_id, f"Failed: {e}")
        print(f"Flashcard job failed for session {session_id}. Error: {e}", file=sys.stderr)
        raise
