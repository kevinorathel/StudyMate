# experiment
import base64
import os
import subprocess
from time import sleep

import requests
from gtts import gTTS
from mutagen.mp3 import MP3
from PIL import Image, ImageDraw, ImageFont
from huggingface_hub import InferenceClient
import json

from openai import OpenAI

from dbconnect import get_cursor
from ScriptGen import generate_video_script

import os
import shutil

from gtts import gTTS

from dotenv import load_dotenv

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



API_URL = "https://api.tokenfactory.nebius.com/v1/images/generations"

# --- Request Headers ---
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {nebius_api_key}"
}

schnell_model = "black-forest-labs/flux-schnell"



def generate_tts_gtts(text, outfile="speech.mp3"):
    tts = gTTS(text=text, lang="en")
    tts.save(outfile)
    return outfile


def script_to_video(slides):
    # Ensure folders are empty / created
    ensure_empty_dir("EduVideo/audio")
    ensure_empty_dir("EduVideo/frames")
    ensure_empty_dir("EduVideo/output")
    ensure_empty_dir("EduVideo/generated_images")

    # === Visual Style ===
    font_path = "./misc/Times Regular.ttf"
    font = ImageFont.truetype(font_path, 70)
    text_color = (50, 25, 5)
    bg_color = (245, 240, 230)

    slide_videos = []

    # === Generate Each Slide ===
    for i, slide in enumerate(slides):
        print(f"\n Slide {i+1}: {slide['text'].splitlines()[0]}")

        print("Generating image from Nebius prompt...")

        data = {
            "model": schnell_model,
            "prompt": slide["img_prompt"],
            "size": "1024x1024",
            "response_format": "b64_json",
            "n": 1,
            "extra_body": {
                "negative_prompt": "ugly, blurry, low quality, duplicate"
            }
        }

        try:
            response = requests.post(API_URL, headers=headers, data=json.dumps(data))
            response.raise_for_status()

            response_data = response.json()

            if response.status_code == 402:
                print(f"Error 402: Payment Required. Response ID: {response_data.get('id')}")
                return

            image_b64 = response_data['data'][0]['b64_json']

            image_data = base64.b64decode(image_b64)
            BASE_DIR = "EduVideo/generated_images"

            file_name = f"slide_{i}.png"
            full_path = os.path.join(BASE_DIR, file_name)

            try:
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
            except OSError as e:
                print(f"Error creating directory structure: {e}")
            try:
                with open(full_path, "wb") as f:
                    f.write(image_data)

                print(f"Image successfully generated and saved to: {full_path}")
            except Exception as e:
                print(f"Error occured: {e}")

        except Exception as e:
            print(f"Exception occured: {e}")



        img_path = f"EduVideo/generated_images/slide_{i}.png"

        # === Generate audio using gTTS (REPLACED Coqui) ===
        print(" Generating narration...")
        audio_path = f"EduVideo/audio/slide_{i}.mp3"
        generate_tts_gtts(slide["narration"], audio_path)

        # Get audio duration
        duration = MP3(audio_path).info.length

        # === Create frames ===
        bg_img = Image.new("RGB", (1920, 1080), bg_color)
        w, h = bg_img.size
        corner_img = Image.open(img_path).convert("RGBA")
        corner_img.thumbnail((600, 600))

        frame_dir = f"EduVideo/frames/slide_{i}"
        os.makedirs(frame_dir, exist_ok=True)

        text = slide["text"]
        total_chars = len(text)
        step_delay = 0.1  # seconds per character

        # ensure typing has enough time to finish even if narration is short
        min_duration_for_typing = total_chars * step_delay
        duration = max(duration, min_duration_for_typing)

        total_frames = int(duration / step_delay)
        if total_frames < 1:
            total_frames = 1

        # build partial texts (typewriter)
        partial_texts = [text[:j] for j in range(1, total_chars + 1)]
        while len(partial_texts) < total_frames:
            partial_texts.append(text)

        for f_idx, partial_text in enumerate(partial_texts):
            frame = bg_img.copy()
            draw = ImageDraw.Draw(frame)

            # Calculate zoom factor but cap size at 650x650
            zoom_factor = 1 + 0.01 * f_idx
            new_w = min(int(corner_img.width * zoom_factor), 650)
            new_h = min(int(corner_img.height * zoom_factor), 650)
            zoomed_img = corner_img.resize((new_w, new_h), resample=Image.LANCZOS)

            # Paste the zoomed image first
            frame.paste(zoomed_img, (w - new_w - 50, 80), zoomed_img)

            # Draw text on top
            draw.multiline_text((200, 400), partial_text, font=font, fill=text_color, spacing=15)
            frame.save(f"{frame_dir}/frame_{f_idx:04d}.png")

        # === Create slide video (duration synced to narration/typing) ===
        fps = max(5, int(len(partial_texts) / duration))
        video_path = f"EduVideo/output/slide_{i}.mp4"
        subprocess.run([
            "ffmpeg", "-y",
            "-framerate", str(fps),
            "-i", f"{frame_dir}/frame_%04d.png",
            "-i", audio_path,
            "-t", str(duration),
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-ar", "44100", "-ac", "2",
            video_path
        ], check=True)

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

    return final_video




