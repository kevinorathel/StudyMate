import os
import pytesseract
import faiss
import google.generativeai as genai
from sentence_transformers import SentenceTransformer
import urllib.parse
from pdf2image import convert_from_path

api_key = os.environ["GEMINI_API_KEY"]
pytesseract.pytesseract.tesseract_cmd = os.environ["TESSERACT_PATH"]
model_embed = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2") # Renamed for clarity

genai.configure(api_key=api_key)
model_gen = genai.GenerativeModel(model_name="gemini-2.5-flash") # Renamed for clarity

conversation_history = []

def read_scanned_pdf(file_path, dpi=300):
    try:
        file_path = urllib.parse.unquote(file_path)
        poppler_path = os.environ["POPPLER_PATH"]

        pages = convert_from_path(file_path, dpi=dpi, poppler_path=poppler_path)

        text = ""
        for page in pages:
            page_text = pytesseract.image_to_string(page)
            text += f"\n{page_text}"

        return text.strip()
    except Exception as e:
        return f"Error reading scanned PDF: {e}"

def chunk_text(text, chunk_size=500, overlap=50):
    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap

    return chunks


def embed_chunks(chunks):
    return model_embed.encode(chunks, convert_to_numpy=True, normalize_embeddings=True).astype("float32")

def build_faiss_index(vectors):
    dimension = vectors.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(vectors)
    return index

def search_index(query, index, chunks, k=3):
    query_vec = model_embed.encode([query], convert_to_numpy=True, normalize_embeddings=True).astype("float32")
    distances, indices = index.search(query_vec, k)
    results = [(chunks[i], float(distances[0][j])) for j, i in enumerate(indices[0])]
    return results

def format_history(history_list):
    """Converts the list of history strings into a single, newline-separated block."""
    if not history_list:
        return "No prior conversation history."

    recent_history = history_list[-10:]
    return "\n".join(recent_history)


if __name__ == "__main__":
    file_path = r"C:\Users\kevin\OneDrive\Desktop\College\Clark U\Design and Analysis of Algorithms\Chapter 1\Introduction to Graph theory.pdf"
    print("Initializing RAG system...")

    text = read_scanned_pdf(file_path)
    chunks = chunk_text(text, chunk_size=200, overlap=50)
    vectors = embed_chunks(chunks)
    index = build_faiss_index(vectors)
    print("Document indexing complete. Starting chat loop.")
    print("-" * 30)

    while True:
        question = input("You: ")
        if question.lower() in ["quit", "exit", "stop"]:
            print("Chatbot session ended. Goodbye!")
            break

        results = search_index(question, index, chunks, k=3)
        context = results[0][0]

        history_text = format_history(conversation_history)

        prompt = f"""
            You are a helpful assistant. Use the provided context AND the conversation history 
            to answer the user's latest question. This allows you to remember previous turns.
            Make sure that the answer is explained in a way that is easy to understand.
            If the answer cannot be found in the context, say "I don’t know based on the given document."

            --- Conversation History ---
            {history_text}
            -----------------------------

            Context (Relevant document passage):
            {context}
            
            Latest Question:
            {question}
            """

        response = model_gen.generate_content(prompt)
        bot_response = response.text

        conversation_history.append(f"User: {question}")
        conversation_history.append(f"Bot: {bot_response}")

        print(f"Bot: {bot_response}")
        print("-" * 30)

