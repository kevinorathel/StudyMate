import os
from huggingface_hub import InferenceClient
from PDFScanner import read_scanned_pdf

client = InferenceClient(
    provider="hf-inference",
    api_key=os.environ["HF_TOKEN"],
)

ques = input("Enter your question: ")
file_path = r"C:\Users\kevin\OneDrive\Desktop\College\Clark U\Design and Analysis of Algorithms\Chapter 1\1.1 What is an algorithm.pdf"
context = read_scanned_pdf(file_path)

answer = client.question_answering(
    question=ques,
    context=context,
    model="timpal0l/mdeberta-v3-base-squad2",
)

print(answer.answer)
