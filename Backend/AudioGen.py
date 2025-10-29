import os
import shutil
import urllib.parse
import pytesseract
from pdf2image import convert_from_path
from google import genai
from google.cloud import texttospeech
import io
import zipfile 

pytesseract.pytesseract.tesseract_cmd = os.environ["TESSERACT_PATH"]
POPPLER_PATH = os.environ["POPPLER_PATH"]
API_KEY = os.environ.get("GEMINI_API_KEY")
MODEL = "gemini-2.5-flash"

client = genai.Client(api_key=API_KEY)

try:
    tts_client = texttospeech.TextToSpeechClient()
except Exception as e:
    print(f"Warning: Could not initialize Google Cloud TTS Client. Ensure 'GOOGLE_APPLICATION_CREDENTIALS' is set correctly. Error: {e}")
    tts_client = None

def chunk_text(text, chunk_size=500, overlap=50):
    words = text.split()
    chunks, start = [], 0
    while start < len(words):
        end = start + chunk_size
        chunks.append(" ".join(words[start:end]))
        start += chunk_size - overlap
    return chunks

def read_scanned_pdf_with_chunks(file_path, dpi=300, chunk_size=200, overlap=50):
    try:
        file_path = urllib.parse.unquote(file_path)
        pages = convert_from_path(file_path, dpi=dpi, poppler_path=POPPLER_PATH)

        text = ""
        for page in pages:
            text += "\n" + pytesseract.image_to_string(page)

        return chunk_text(text, chunk_size=chunk_size, overlap=overlap)

    except Exception as e:
        return [f"Error reading scanned PDF: {e}"]

def generate_initial_script(summary):
    prompt = f"""
        You are an expert AI Tutor creating a short, engaging audio lesson script for students.    
        Your task is to take a textbook summary and transform it into a script that sounds natural, conversational, and energetic when read aloud.
        
        Input Summary:  
        {summary}
        
        Tone and Style Requirements:
        
        1. Persona: Enthusiastic, knowledgeable tutor.
        2. Tone: Conversational, encouraging, and clear (like a popular education podcast).   
        3. Delivery Goal: Make the content feel easy to understand and memorable. Use natural speaking patterns, including conversational transition phrases.
        4. Size: The script must be brief. It should not cross the limit of 5000 bytes.

        Output Script Structure:
        
        Structure the script into three distinct sections and use the following formatting to ensure smooth text-to-speech generation:
        
        - [Intro Hook]: Start with a friendly greeting and a high-energy "hook" question or statement to grab the listener's attention and state the lesson's main point. (1-2 sentences)
        - [Core Explanation]: Break down the "Key Ideas" and "Explanation" from the summary. Use casual transition words (e.g., "So," "Think of it this way," "The main takeaway here is") to connect points smoothly. Define all technical terms simply. You can also add pauses to make it feel more human.
        - [Quick Review & Call to Action]: End with a quick, memorable summary sentence and an encouraging closing statement. (1-2 sentences)
        
        **DO NOT** use bullet points, asterisks, or headings (like 'Section Title' or 'Key Ideas') in the final script, as these disrupt spoken flow. Present the final script as a single, smooth block of text.
        
        """
    response = client.models.generate_content(
        model=MODEL,
        contents=prompt
    )

    return response.text.strip().replace('*', '')

def generate_continued_script(summary):
    prompt = f"""
        You are an expert AI Tutor creating a short, engaging audio lesson script for students.    
        Your task is to take a textbook summary and transform it into a script that sounds natural, conversational, and energetic when read aloud.
        
        Input Summary:  
        {summary}
        
        Tone and Style Requirements:
        
        1. Persona: Enthusiastic, knowledgeable tutor.
        2. Tone: Conversational, encouraging, and clear (like a popular education podcast).   
        3. Delivery Goal: Make the content feel easy to understand and memorable. Use natural speaking patterns, including conversational transition phrases.
        4. Continuity: The script must be as if you are continuing from somewhere you left off
        5. Size: The script must be brief. It should not cross the limit of 5000 bytes.

        Output Script Structure:
        
        Structure the script into three distinct sections and use the following formatting to ensure smooth text-to-speech generation:
        
        - [Core Explanation]: Break down the "Key Ideas" and "Explanation" from the summary. Use casual transition words (e.g., "So," "Think of it this way," "The main takeaway here is") to connect points smoothly. Define all technical terms simply. You can also add pauses to make it feel more human.
        - [Quick Review & Call to Action]: End with a quick, memorable summary sentence and an encouraging closing statement. (1-2 sentences)
        
        **DO NOT** use bullet points, asterisks, or headings (like 'Section Title' or 'Key Ideas') in the final script, as these disrupt spoken flow. Present the final script as a single, smooth block of text.
        
        Format the output in valid SSML for Google Cloud Text-to-Speech.
        Include natural pauses (<break/>),
        and some emphasis (<emphasis>) where appropriate.
        """
    response = client.models.generate_content(
        model=MODEL,
        contents=prompt
    )

    return response.text.strip().replace('*', '')

def generate_mp3_title(script):
        prompt = f"""
            I have an mp3 file that I generated based on the following script:
            
            {script}
            
            I want you to suggest a short, descriptive name for the mp3 file based on this script.
            
            The output must contain only the suggested filename and no other text, punctuation, explanation, or conversational filler.
            """
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt
        )
        title = response.text.strip().replace('"', '').replace("'", "")
        return ''.join(c for c in title if c.isalnum() or c in (' ', '_', '-')).strip().replace(' ', '_')

def cleanup_directory(directory_path: str):
    """Deletes a directory and all its contents."""
    print(f"Running background cleanup for: {directory_path}")
    try:
        # Use shutil.rmtree to delete the directory and all files within it
        shutil.rmtree(directory_path)
        print(f"Successfully cleaned up temporary directory: {directory_path}")
    except OSError as e:
        print(f"Error during cleanup of {directory_path}: {e}")

def summarize_chunk(chunk):
    prompt = f"""
        You are an AI tutor helping to create study lessons from textbook material.
        
        Input:
        {chunk}
        
        Task:
        
        1. Summarize this content clearly and concisely.
        2. Highlight the most important concepts, definitions, and processes.
        3. Write in a student-friendly tone, as if you are preparing material for a short video lesson.
        4. Structure the output in this format:
        
        - Section Title: (short phrase)
        
        - Key Ideas:
        
        • Point 1
        
        • Point 2
        
        • Point 3
        
        - Explanation: (2–3 sentences simplifying the key ideas)
        """
    response = client.models.generate_content(
        model=MODEL,
        contents=prompt
    )
    return response.text.strip().replace('*', '')

def text_to_speech(text, audio_file, voice_name='en-US-Wavenet-I'):
    """
    Converts text to speech and SAVES the MP3 audio to the path
    specified by the audio_file variable. It returns nothing.
    """
    if not tts_client:
        raise ConnectionError("Cloud TTS Client not initialized.")

    if text.strip().startswith("<speak>"):
        synthesis_input = texttospeech.SynthesisInput(ssml=text)
    else:
        synthesis_input = texttospeech.SynthesisInput(text=text)

    voice = texttospeech.VoiceSelectionParams(
        language_code="en-US",
        name=voice_name,
    )

    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )

    response = tts_client.synthesize_speech(
        input=synthesis_input, voice=voice, audio_config=audio_config
    )

    # --- THE MODIFIED PART STARTS HERE ---
    # 1. Open the file in binary write mode ('wb').
    try:
        with open(audio_file, "wb") as out:
            # 2. Write the raw MP3 binary data to the file.
            out.write(response.audio_content)
    except IOError as e:
        print(f"Error saving audio file to {audio_file}: {e}")
        # Re-raise the exception to let the calling code know saving failed
        raise

    print(f"Audio content successfully saved to {audio_file}")

# def audiogenmain(file_path: str):
#
#     OUTPUT_DIR = "Audio Lessons"
#
#     if not os.path.exists(OUTPUT_DIR):
#
#         os.makedirs(OUTPUT_DIR)
#         print(f"Created output directory: {OUTPUT_DIR}")
#
#     chunks = read_scanned_pdf_with_chunks(file_path)
#     print(f"Total chunks extracted: {len(chunks)}")
#
#     for i, chunk in enumerate(chunks[:1]):
#
#         print(f"\n=== Processing Chunk {i+1} ===\n")
#         summary = summarize_chunk(chunk)
#         script = generate_script(summary)
#         print("Script: \n", script)
#
#         base_filename = f"lesson_chunk_{i+1}.mp3"
#
#         audio_file = os.path.join(OUTPUT_DIR, base_filename)
#
#         text_to_speech(script, audio_file, voice_name='en-US-Wavenet-I')
#
# if __name__ == "__main__":
#
#     file_path = r"C:\Users\kevin\OneDrive\Desktop\College\Clark U\Design and Analysis of Algorithms\Chapter 1\1.2 Fundamentals of Algorithmic problem solving.pdf"
#     OUTPUT_DIR = "Audio Lessons"
#
#     if not os.path.exists(OUTPUT_DIR):
#
#         os.makedirs(OUTPUT_DIR)
#         print(f"Created output directory: {OUTPUT_DIR}")
#
#     chunks = read_scanned_pdf_with_chunks(file_path)
#     print(f"Total chunks extracted: {len(chunks)}")
#
#     for i, chunk in enumerate(chunks[:1]):
#
#         print(f"\n=== Processing Chunk {i+1} ===\n")
#         summary = summarize_chunk(chunk)
#         script = generate_script(summary)
#         print("Script: \n", script)
#
#         base_filename = f"lesson_chunk_{i+1}.mp3"
#
#         audio_file = os.path.join(OUTPUT_DIR, base_filename)
#
#         text_to_speech(script, audio_file, voice_name='en-US-Wavenet-I')
