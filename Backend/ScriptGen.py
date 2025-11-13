import google.generativeai as genai
import psycopg2
import fitz  # PyMuPDF
import io
import json
import re

from dbconnect import get_cursor


genai.configure(api_key="AIzaSyD7ITCowOXMl89hNQ_Xmco9gZogR6h-g2s")


def fetch_pdf_from_db(document_id):
    """Fetch pdf_content (bytea) safely using your existing db connection."""
    with get_cursor() as cur:
        cur.execute("SELECT pdf_content FROM document WHERE document_id = %s", (document_id,))
        row = cur.fetchone()  # fetch before context closes
        if not row:
            raise Exception(f"No document found with id={document_id}")
        return row[0]  # bytea content


def extract_text_from_pdf(pdf_bytes):
    """Convert PDF bytes to text"""
    text = ""
    pdf_stream = io.BytesIO(pdf_bytes)
    with fitz.open(stream=pdf_stream, filetype="pdf") as doc:
        for page in doc:
            text += page.get_text("text") + "\n"
    return text.strip()


def summarize_and_generate_script(pdf_text):
    """Use Google Gemini to summarize and write a video script"""
    model = genai.GenerativeModel("gemini-2.5-flash")

    prompt = f"""
    You are an expert educational content creator. 
    Your task is to convert the following document into a concise, engaging, and structured script for a short educational video. 

    ### Requirements:
    1. Break the content into **frames**. Each frame represents one valuable slide for the video. 
    2. For each frame, output **3 fields** exactly:
    - "text": concise bullet-style content that will be displayed on screen (as a memory anchor for learners)
    - "narration": full explanatory narration in clear, educational tone
    - "img_prompt": a sentence describing the image or visual that should appear for that frame
    3. Each frame must be **educational, meaningful, and focused** — prioritize key ideas over small details.
    4. Keep sentences student-friendly and naturally teachable.
    5. The response **must follow the format exactly as below** — no markdown, no brackets, no commentary.

    ### Output format example (strictly follow this JSON object structure):

    {{
        "text": "Water Cycle:\\n- evaporates\\n- clouds\\n- rain",
        "narration": "Water from oceans evaporates, condenses into clouds, and falls back as rain, completing a continuous natural cycle.",
        "img_prompt": "A realistic illustration of the water cycle showing evaporation, condensation, and rainfall."
    }},
    {{
        "text": "Photosynthesis:\\n- sunlight\\n- water & CO2\\n- glucose\\n- oxygen",
        "narration": "Plants use sunlight, water, and carbon dioxide to produce glucose and oxygen — this process sustains almost all life on Earth.",
        "img_prompt": "A beautiful scene of photosynthesis, sunlight on green leaves producing oxygen bubbles."
    }},
    {{
        "text": "Carbon Cycle:\\n- carbon moves\\n- atmosphere, oceans, soil\\n- balance",
        "narration": "The carbon cycle describes how carbon moves through the atmosphere, oceans, soil, and living organisms, maintaining Earth's balance.",
        "img_prompt": "Diagram of the carbon cycle with arrows showing CO2 movement between plants, ocean, and atmosphere."
    }}

    ### Document Content:
    {pdf_text}

    Now, convert the document above into the same JSON object format, one per frame.
    Each object should be separated by a comma, but do not include square brackets or extra text.
    Output only the JSON objects — nothing else.
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
def generate_video_script(document_id):
    pdf_bytes = fetch_pdf_from_db(document_id)
    pdf_text = extract_text_from_pdf(pdf_bytes)
    script = summarize_and_generate_script(pdf_text)
    return script



