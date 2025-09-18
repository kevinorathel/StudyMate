# Use a pipeline as a high-level helper
import torch
from transformers import pipeline
from PIL import Image
from datasets import load_dataset
import matplotlib.pyplot as plt

pipeline = pipeline(
    task="document-question-answering",
    model="naver-clova-ix/donut-base-finetuned-docvqa",
    device=0,
    dtype=torch.float16
)
dataset = load_dataset("hf-internal-testing/example-documents", split="test")
image = dataset[0]["image"]

plt.imshow(image)
plt.axis("off")
plt.show()

pipeline(image=image, question="What time is the coffee break?")
