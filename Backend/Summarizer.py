import os
from huggingface_hub import InferenceClient
from PDFUtil import read_scanned_pdf_as_list

client = InferenceClient(
    provider="hf-inference",
    api_key=os.environ["HF_TOKEN"],
)

file_path = r"C:\Users\kevin\OneDrive\Desktop\College\Clark U\Design and Analysis of Algorithms\Chapter 1\1.1 What is an algorithm.pdf"
content = read_scanned_pdf_as_list(file_path)

for page_number, page_text in enumerate(content, start=1):
    print(f"\nPage {page_number}:\n")

    result = client.summarization(
        page_text,
        model="philschmid/bart-large-cnn-samsum",
    )

    print(result.summary_text)




