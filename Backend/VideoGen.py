# experiment

import os
import subprocess
from time import sleep
from gtts import gTTS
from mutagen.mp3 import MP3
from PIL import Image, ImageDraw, ImageFont
from huggingface_hub import InferenceClient
import json

from dbconnect import get_cursor
from ScriptGen import generate_video_script

import os
import shutil

from dotenv import load_dotenv

#Load environment variables from .env
load_dotenv()

nebius_api_key = os.environ["NEBIUS_API_KEY"]


def ensure_empty_dir(path):
    """
    Ensure a directory exists and is empty.
    If it exists, deletes all its contents.
    If it doesn't exist, creates it.
    """
    if os.path.exists(path):
        shutil.rmtree(path)  # remove old contents
    os.makedirs(path, exist_ok=True)  # recreate folder


# === Setup HuggingFace Nebius client ===
client = InferenceClient(
    provider="nebius",
    api_key=nebius_api_key  # <-- Add your key here
)


def fetch_pdf_from_db(document_id):
    """Fetch pdf_content (bytea) safely using your existing db connection."""
    with get_cursor() as cur:
        cur.execute("SELECT pdf_content FROM document WHERE document_id = %s", (document_id,))
        row = cur.fetchone()  # fetch before context closes
        if not row:
            raise Exception(f"No document found with id={document_id}")
        return row[0]  # bytea content



def script_to_video(slides):
    # Ensure folders are empty / created
    ensure_empty_dir("EduVideo/audio")
    ensure_empty_dir("EduVideo/frames")
    ensure_empty_dir("EduVideo/output")
    ensure_empty_dir("EduVideo/generated_images")

    # === Visual Style ===
    font_path = "/System/Library/Fonts/Times.ttc"
    font = ImageFont.truetype(font_path, 70)
    text_color = (50, 25, 5)
    bg_color = (245, 240, 230)

    slide_videos = []

    # === Generate Each Slide ===
    for i, slide in enumerate(slides):
        print(f"\n Slide {i+1}: {slide['text'].splitlines()[0]}")

        # === Generate image ===
        print("Generating image from Nebius prompt...")
        img = client.text_to_image(
            slide["img_prompt"],
            model="black-forest-labs/FLUX.1-schnell"
        )
        img_path = f"EduVideo/generated_images/slide_{i}.png"
        img.save(img_path)

        # === Generate audio ===
        print(" Generating narration...")
        tts = gTTS(slide["narration"])
        audio_path = f"EduVideo/audio/slide_{i}.mp3"
        tts.save(audio_path)

        # Get audio duration
        duration = MP3(audio_path).info.length

        # === Create frames ===
        bg_img = Image.new("RGB", (1920, 1080), bg_color)
        w, h = bg_img.size
        corner_img = Image.open(img_path).convert("RGBA")
        corner_img.thumbnail((450, 450))

        frame_dir = f"EduVideo/frames/slide_{i}"
        os.makedirs(frame_dir, exist_ok=True)

        text = slide["text"]
        total_chars = len(text)
        step_delay = 0.1  # seconds per character (slow typewriter)
        total_frames = int(duration / step_delay)

        partial_texts = [text[:j] for j in range(1, total_chars + 1)]
        while len(partial_texts) < total_frames:
            partial_texts.append(text)

        for f_idx, partial_text in enumerate(partial_texts):
            frame = bg_img.copy()
            draw = ImageDraw.Draw(frame)
            draw.multiline_text((200, 400), partial_text, font=font, fill=text_color, spacing=15)
            frame.paste(corner_img, (w - corner_img.width - 50, 80), corner_img)
            frame.save(f"{frame_dir}/frame_{f_idx:04d}.png")

        # === Create slide video (duration synced to narration) ===
        fps = max(5, int(len(partial_texts) / duration))
        video_path = f"EduVideo/output/slide_{i}.mp4"
        subprocess.run([
            "ffmpeg", "-y",
            "-framerate", str(fps),
            "-i", f"{frame_dir}/frame_%04d.png",
            "-i", audio_path,
            "-t", str(duration),
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            video_path
        ])

        slide_videos.append(video_path)

    # === Merge all slides (no fade) ===
    with open("EduVideo/output/list.txt", "w") as f:
        for v in slide_videos:
            f.write(f"file '{os.path.abspath(v)}'\n")

    final_video = "EduVideo/output/teaching_video.mp4"
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", "EduVideo/output/list.txt",
        "-c", "copy",
        final_video
    ])

    # print(f"\n Teaching video created successfully: {final_video}")
    return final_video




    