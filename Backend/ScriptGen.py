import google.generativeai as genai
import psycopg2
import fitz
import io
import json
import re

from dbconnect import get_cursor

import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

gemini_api_key = os.environ["GEMINI_API_KEY"]

genai.configure(api_key=gemini_api_key)





def fetch_and_summarize_pdfs(session_id):
    """
    1. Fetch all pdf_content (bytea) for a given session_id.
    2. Extract text from all PDFs.
    3. Summarize the combined content using Google Gemini.
    4. Return the summarized text.
    """

    with get_cursor() as cur:
        cur.execute("""
            SELECT e.chunk_text
            FROM embeddings e
            JOIN sessiondocuments s ON s.document_id = e.document_id
            WHERE s.session_id = %s;
        """, (session_id,))
        rows = cur.fetchall()

    if not rows:
        raise Exception(f"No PDFs found for session_id={session_id}")

    doc_text_list = [row[0] for row in rows]

    all_text = ""

    for doc_text in doc_text_list:
        all_text += " " + doc_text


    if not all_text.strip():
        all_text = "No readable text extracted from the PDFs."

    model = genai.GenerativeModel("gemini-2.5-flash")

    prompt = f"""
        You are an expert educational content creator.

        Below is raw extracted text from multiple PDF documents belonging to the same learning session.
        The text may be messy, repetitive, out of order, or contain artifacts.

        Your job is to create a **single, clean, concise, learning-optimized document** that is suitable for producing a short educational video (maximum 7 minutes).

        ### Your tasks:
        1. Identify all unique concepts across the PDFs and **remove duplicates completely**.
        2. Reorganize the content into the **best teaching sequence**, regardless of the order the PDFs were originally provided.
        3. Produce a clear, structured, high-quality educational document.

        ### Requirements for the final combined learning document:
        - Must be **short, focused, and optimized for a ~7-minute video**.
        - Prioritize **core ideas**, not lengthy details.
        - Keep the writing clear, teacher-friendly, and student-friendly.
        - Use **sections**, **bullet points**, and smooth transitions.
        - No artifacts, no broken sentences, no unnecessary repetition.
        - Add clarity, definitions, and brief explanations while staying concise.
        - Produce a cohesive "chapter" style document that flows naturally from topic to topic.
        - Completely eliminate duplicated or overlapping content from multiple PDFs.
        - Ensure the final content feels like a **single high-quality lesson**.

        Do NOT mention PDFs, pages, or original ordering.

        ### Now produce the final polished learning document.

        Raw Extracted Text:
        {all_text}
        """



    response = model.generate_content(prompt)
    summary = response.text

    
    # 4. Return summary text

    return summary






def summarize_and_generate_script(pdf_text):
    """Use Google Gemini to summarize and write a video script"""
    model = genai.GenerativeModel("gemini-2.5-flash")

    prompt = f"""
        You are an expert educational content creator.

        Your task is to convert the following cleaned learning document into a concise, engaging, well-structured script for a short educational video (maximum 7 minutes).

        ### Requirements:
        1. Break the content into **frames** — each frame will become one slide in the video.
        2. Each frame MUST include exactly these fields:
        - "text": short bullet-style content for the on-screen slide.
        - "narration": clear, friendly, educational explanation.
        - "img_prompt": a meaningful description of the ideal visual for this frame.
        3. Keep the overall script **short and focused**, appropriate for a ~7-minute video.
        4. Maintain strong educational value: clarity, simplicity, and logical flow are essential.
        5. Ensure the teaching sequence follows the **best educational order**, not the order the text originally appeared in.
        6. **Absolutely no duplication** — if multiple PDFs covered similar topics, include them only once.
        7. Make each frame meaningful, with 1 to 3 core ideas maximum.
        8. Keep the narration conversational, smooth, and easy for learners.

        ### Output format example (strict formatting required):

        {{
            "text": "Water Cycle:\\n- evaporates\\n- clouds\\n- rain",
            "narration": "Water from oceans evaporates, condenses into clouds, and returns as rain, forming a continuous natural cycle.",
            "img_prompt": "A realistic illustration of the water cycle showing evaporation, condensation, and rainfall."
        }},
        {{
            "text": "Photosynthesis:\\n- sunlight\\n- water & CO2\\n- glucose\\n- oxygen",
            "narration": "Plants use sunlight, water, and carbon dioxide to make glucose and oxygen — a process essential for nearly all life.",
            "img_prompt": "A close-up of green leaves receiving sunlight and releasing oxygen bubbles during photosynthesis."
        }}

        ### Document Content:
        {pdf_text}

        Now generate the frames in **only the JSON object format** shown above.
        Do not include brackets, markdown, or any extra commentary.
        Each frame object should be separated by a comma, with no list wrapper.
        """



    response = model.generate_content(prompt)
    response_text = response.text

   
    raw_text = response_text.strip()

    # Remove wrapping ```json ... ```
    match = re.search(r"```(?:json)?\s*(.*)\s*```", raw_text, re.DOTALL)
    if match:
        json_text = match.group(1).strip()
    else:
        json_text = raw_text

    # Ensure it's a valid JSON array
    if not json_text.startswith("["):
        # Wrap multiple objects in [ ... ]
        json_text = f"[{json_text}]"

    try:
        frames = json.loads(json_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse JSON. Error: {e}\nRaw text:\n{raw_text}")

    # visual = [f.get("image", "") for f in frames]
    # narrate = [f.get("description", "") for f in frames]
    # text_overlay = [f.get("text", "") for f in frames]

    return raw_text


# Main Function
def generate_video_script(session_id):
    # pdf_bytes = fetch_pdf_from_db(session_id)
    # pdf_text = extract_text_from_pdf(pdf_bytes)
    print("Fetching PDFs\n")
    pdf_text = fetch_and_summarize_pdfs(session_id)
    print("Generating script\n")
    script = summarize_and_generate_script(pdf_text)
    return script



