import os

import google.generativeai as genai
from PDFUtil import read_scanned_pdf
from test import search_index, read_scanned_pdf, chunk_text, embed_chunks, build_faiss_index

api_key = os.environ["GEMINI_API_KEY"]

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
