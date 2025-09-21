import os
import pytesseract
from pdf2image import convert_from_path
import urllib.parse

pytesseract.pytesseract.tesseract_cmd = os.environ["TESSERACT_PATH"]

def read_scanned_pdf(file_path, dpi=300):
    try:
        file_path = urllib.parse.unquote(file_path)
        poppler_path = os.environ["POPPLER_PATH"]

        pages = convert_from_path(file_path, dpi=dpi, poppler_path=poppler_path)

        text = ""
        for i, page in enumerate(pages):
            page_text = pytesseract.image_to_string(page)
            text += f"\n{page_text}"
        return text
    except Exception as e:
        return f"Error reading scanned PDF: {e}"

def read_scanned_pdf_as_list(file_path, dpi=300):
    try:
        file_path = urllib.parse.unquote(file_path)
        poppler_path = os.environ["POPPLER_PATH"]

        pages = convert_from_path(file_path, dpi=dpi, poppler_path=poppler_path)

        page_texts = []
        for i, page in enumerate(pages):
            text = pytesseract.image_to_string(page)
            page_texts.append(text.strip())

        return page_texts
    except Exception as e:
        return f"Error reading scanned PDF: {e}"

if __name__ == "__main__":

    file_path = r"C:\Users\kevin\OneDrive\Desktop\College\Clark U\Design and Analysis of Algorithms\Chapter 1\1.1 What is an algorithm.pdf"
    contents = read_scanned_pdf(file_path)
    print(contents)



