import os
import pytesseract

import faiss
import google.generativeai as genai
from sentence_transformers import SentenceTransformer
import urllib.parse
from pdf2image import convert_from_path

api_key = os.environ["GEMINI_API_KEY"]
pytesseract.pytesseract.tesseract_cmd = os.environ["TESSERACT_PATH"]
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

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
    return model.encode(chunks, convert_to_numpy=True, normalize_embeddings=True).astype("float32")

def build_faiss_index(vectors):
    dimension = vectors.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(vectors)
    return index

def search_index(query, index, chunks, k=3):
    query_vec = model.encode([query], convert_to_numpy=True, normalize_embeddings=True).astype("float32")
    distances, indices = index.search(query_vec, k)
    results = [(chunks[i], float(distances[0][j])) for j, i in enumerate(indices[0])]
    return results


if __name__ == "__main__":

    question = input("Enter your question: ")
    file_path = r"C:\Users\kevin\OneDrive\Desktop\College\Clark U\Design and Analysis of Algorithms\Chapter 1\Introduction to Graph theory.pdf"

    text = read_scanned_pdf(file_path)
    chunks = chunk_text(text, chunk_size=200, overlap=50)
    vectors = embed_chunks(chunks)
    index = build_faiss_index(vectors)
    results = search_index(question, index, chunks, k=3)
    context = results[0][0]


    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name="gemini-2.5-flash")

    prompt = f"""
        You are a helpful assistant. Use the provided context to answer the question. 
        Make sure that the answer is explained in a way that is easy to understand.
        If the answer cannot be found in the context, say "I don’t know based on the given document."
        
        Context:
        {context}
        
        Question:
        {question}
        """

    response = model.generate_content(prompt)

    print(response.text)
