import os
import shutil
import sys

from google import genai
from google.genai.types import GenerateContentConfig

from markdown_it import MarkdownIt
import re
from xhtml2pdf import pisa
from sentence_transformers import SentenceTransformer

from dbconnect import get_cursor

GEMINI_MODEL_NAME = "gemini-2.5-flash-lite"

LOCAL_EMBED_MODEL = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
CHUNK_LIMIT = 75

try:
    CLIENT = genai.Client()
except Exception as e:
    print(f"CRITICAL ERROR: Failed to initialize Gemini Client. Check GEMINI_API_KEY. {e}", file=sys.stderr)
    sys.exit(1)

class ContextNotFoundError(Exception): pass

class DBConnection:
    def update_session_status(self, session_id, status): pass
db_connection = DBConnection()

class NotificationService:
    def send_completion_alert(self, session_id, pdf_path): pass
notification_service = NotificationService()

def get_rag_context(session_id: int, summarization_query: str, k: int = CHUNK_LIMIT) -> str:
    try:
        query_vector = LOCAL_EMBED_MODEL.encode([summarization_query], convert_to_numpy=True, normalize_embeddings=True).astype("float32")
        query_embedding = query_vector[0].tolist()
    except Exception as e:
        raise RuntimeError(f"Failed to generate embedding for query using local model: {e}")

    query_vector_string = '[' + ','.join(map(str, query_embedding)) + ']'

    try:
        with get_cursor() as cursor:
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

def run_summarization_job(session_id: int, output_dir: str) -> str:
    db_connection.update_session_status(session_id, "Processing: Generating Context")

    summarization_query = "Generate a comprehensive, structured summary of all documents in this session, formatted as revision notes."

    context_text = get_rag_context(session_id, summarization_query, CHUNK_LIMIT)

    if not context_text:
        db_connection.update_session_status(session_id, "Failed: No context found")
        raise ContextNotFoundError("No document chunks available for this session.")

    db_connection.update_session_status(session_id, "Processing: Generating Summary with LLM")
    final_summary_markdown = generate_llm_summary(context_text, summarization_query)

    db_connection.update_session_status(session_id, "Processing: Generating PDF Output")

    pdf_path = generate_pdf(final_summary_markdown, session_id, output_dir)

    db_connection.update_session_status(session_id, "Completed")
    notification_service.send_completion_alert(session_id, pdf_path)

    return pdf_path

def generate_llm_summary(context: str, query: str) -> str:
    """
    Constructs a RAG-augmented prompt and calls the Gemini API
    to synthesize a summary from the retrieved context.
    """

    system_prompt = (
        "You are a professional academic summarizer and note-taker. "
        "Your task is to synthesize the provided context into a set of "
        "highly structured, concise revision notes using Markdown. "
        "The summary must ONLY use the information found in the CONTEXT section. "
        "Do not include any external information or conversational filler."
    )

    user_prompt = f"""
        MAIN TASK: Convert the following CONTEXT into easy-to-read, structured revision notes based on the query: "{query}".
        
        FORMAT REQUIREMENTS:
        1. Use **Markdown Headings** (##, ###) for topics and sub-topics.
        2. Use **Bullet Points** (`*`) for key facts, definitions, and steps.
        3. Focus on definitions, algorithms, methods, and examples.
        
        ---
        CONTEXT:
        {context}
        ---
    """

    try:

        config = GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.1
        )

        response = CLIENT.models.generate_content(
            model=GEMINI_MODEL_NAME,
            contents=user_prompt,
            config=config
        )

        if not response.text:
             raise ValueError("Gemini returned an empty response text.")

        return response.text

    except Exception as e:
        print(f"\n--- DEBUG API FAILURE ---", file=sys.stderr)
        print(f"Exception Type: {type(e)}", file=sys.stderr)
        print(f"Full Error Message: {e}", file=sys.stderr)
        print(f"Prompt Length: {len(user_prompt)} characters", file=sys.stderr)
        print(f"--- END DEBUG ---\n", file=sys.stderr)

        return "ERROR: Summary generation failed"

def generate_pdf(markdown_content: str, session_id: int, output_dir: str) -> str:
    """
    Converts Markdown content into a styled PDF file and saves it locally
    using the xhtml2pdf library.
    """

    STYLESHEET = """
        
        <style>
        @page { size: A4; margin: 2cm; }
        body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            color: #333;
            font-size: 12pt;
        }
        
        h1, h2, h3 {
            font-family: 'Georgia', serif;
            color: #004d99;
            border-bottom: 2px solid #ccc;
            padding-bottom: 0.2em;
            margin-top: 1.5em;
        }
        
        h1 { font-size: 24pt; color: #004d99; border-bottom: 4px solid #004d99; }
        
        h2 { font-size: 18pt; }
        
        h3 { font-size: 16pt; color: #555; border-bottom: none; }
        
        ul {
            margin-left: 0;
            padding-left: 1.5em;
        }
        
        li {
            margin-bottom: 0.5em;
        }
        
        pre {
            background-color: #f4f4f4;
            border: 1px solid #ddd;
            padding: 10px;
            overflow: auto;
        }
        
        </style>
        
    """

    md = MarkdownIt().enable(['table', 'strikethrough', 'link', 'image'])
    content_html = md.render(markdown_content)
    styled_html = f"<html><head>{STYLESHEET}</head><body>{content_html}</body></html>"

    try:
        with get_cursor() as cur:
            cur.execute(
                "SELECT s.session_name "
                "FROM sessions s "
                "WHERE s.session_id = %s;",
                (session_id,)
            )
            session_name_result = cur.fetchone()

            if session_name_result and session_name_result[0]:
                raw_name = session_name_result[0]
                sanitized_name = re.sub(r'[\\/:*?"<>|]', '_', raw_name)
                summary_filename = sanitized_name
            else:
                summary_filename = f"Session_{session_id}_Summary"

    except Exception as e:
        print(f"Database error during session name retrieval: {e}", file=sys.stderr)
        raise RuntimeError(f"Failed to retrieve session name for ID {session_id}.")

    file_name = f"{summary_filename}.pdf"
    output_path = os.path.join(output_dir, file_name)

    with open(output_path, "w+b") as result_file:
        pisa_status = pisa.CreatePDF(
            styled_html,
            dest=result_file
        )

    if pisa_status.err:
        raise RuntimeError("PDF generation failed using xhtml2pdf.")

    print(f"PDF saved successfully to: {output_path}")
    return output_path

def cleanup_file(path: str):
    """Deletes the file at the given path."""
    os.remove(path)

def Summarizer_main(session_id: int):
    """
    The entry point for the summarization job, which handles directory creation,
    calls the job runner, and returns the path to the generated PDF.
    """

    OUTPUT_DIR = os.path.join(os.getcwd(), f"temp_summary_{session_id}")
    file_path_to_return = None

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"Created output directory: {OUTPUT_DIR}")

    if session_id <= 0:
        raise ValueError(f"Error: Invalid session ID: {session_id}. Must be a positive integer.")

    try:
        print(f"Starting summarization job for session ID: {session_id}...")

        file_path_to_return = run_summarization_job(session_id, OUTPUT_DIR)

        print(f"Job for session ID {session_id} completed successfully.")

        return file_path_to_return

    except Exception as e:
        print(f"A critical error occurred during the job for session ID {session_id}: {e}", file=sys.stderr)

        if os.path.exists(OUTPUT_DIR):
             shutil.rmtree(OUTPUT_DIR, ignore_errors=True)

        raise e
