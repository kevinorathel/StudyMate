import os
from huggingface_hub import InferenceClient

client = InferenceClient(
    provider="hf-inference",
    api_key="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",
)

q = input("Enter the question: ")

answer = client.question_answering(
    question=q,
    context="The tower is 324 metres (1,063 ft) tall, about the same height as an 81-storey building, and the tallest structure in Paris. Its base is square, measuring 125 metres (410 ft) on each side. During its construction, the Eiffel Tower surpassed the Washington Monument to become the tallest man-made structure in the world, a title it held for 41 years until the Chrysler Building in New York City was finished in 1930. It was the first structure to reach a height of 300 metres. Due to the addition of a broadcasting aerial at the top of the tower in 1957, it is now taller than the Chrysler Building by 5.2 metres (17 ft). Excluding transmitters, the Eiffel Tower is the second tallest free-standing structure in France after the Millau Viaduct.",
    model="timpal0l/mdeberta-v3-base-squad2",
)

print(answer.answer)
