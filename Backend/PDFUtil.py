import os
from dotenv import load_dotenv
import pytesseract
import faiss
from pdf2image import convert_from_path
from sentence_transformers import SentenceTransformer
import urllib.parse
import google.generativeai as genai


# Load environment variables from .env
load_dotenv()

gemini_api_key = os.environ["GEMINI_API_KEY"]
pytesseract.pytesseract.tesseract_cmd = os.environ["TESSERACT_PATH"]
poppler_path = os.environ["POPPLER_PATH"]

genai.configure(api_key=gemini_api_key)
model_gen = genai.GenerativeModel("gemini-2.5-flash")
model_embed = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


def read_scanned_pdf(file_path, dpi=300):
    """Extract text from a scanned PDF using Tesseract OCR."""
    try:
        file_path = urllib.parse.unquote(file_path)
        pages = convert_from_path(file_path, dpi=dpi, poppler_path=poppler_path)
        text = "".join(pytesseract.image_to_string(page) for page in pages)
        return text.strip()
    except Exception as e:
        return f"Error reading scanned PDF: {e}"

def chunk_text(text, chunk_size=500, overlap=50):
    """Split text into overlapping chunks for embedding."""
    words = text.split()
    chunks, start = [], 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks

def embed_chunks(chunks):
    """Generate embeddings for text chunks."""
    return model_embed.encode(chunks, convert_to_numpy=True, normalize_embeddings=True).astype("float32")

def build_faiss_index(vectors):
    """Build a FAISS index from embedded vectors."""
    dimension = vectors.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(vectors)
    return index

def search_index(query, index, chunks, k=3):
    """Search for the top-k relevant chunks in the FAISS index."""
    query_vec = model_embed.encode([query], convert_to_numpy=True, normalize_embeddings=True).astype("float32")
    distances, indices = index.search(query_vec, k)
    return [(chunks[i], float(distances[0][j])) for j, i in enumerate(indices[0])]

def format_history(history_list):
    """Format the recent chat history."""
    return "\n".join(history_list[-5:]) if history_list else "No prior conversation history."

def generate_response(question, context, history):
    """Generate Gemini response using context and conversation history."""
    history_text = format_history(history)

    prompt = f"""
    You are a helpful assistant. Use the provided context AND the conversation history 
    to answer the user's latest question. Keep the tone conversational but informative.
    If the answer cannot be found in the context, say "I don’t know based on the given document."

    --- Conversation History ---
    {history_text}
    -----------------------------

    Context:
    {context}

    Latest Question:
    {question}
    """

    response = model_gen.generate_content(prompt)
    return response.text

def generate_session_name(doc_name):

    prompt = f"""
    You are a helpful assistant. I am going to start a study session using a document
    .Use the provided document name and give me a general name which 
    i can you to name a study session that revolves around this document"

    {doc_name}
    
    In the response i only want the sessions name and nothing else. Make sure the name
    is brief and general but related to the document's name

    """

    response = model_gen.generate_content(prompt)
    return response.text
