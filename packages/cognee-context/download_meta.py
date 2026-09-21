import os
import requests

files = [
    "config.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "special_tokens_map.json"
]

dest_dir = r"C:\Users\elluminati\AppData\Local\Temp\fastembed_cache\models--qdrant--bge-small-en-v1.5-onnx-q\snapshots\52398278842ec620401d67a149c09930f789e574"
base_url = "https://huggingface.co/qdrant/bge-small-en-v1.5-onnx-q/resolve/main"

for f in files:
    url = f"{base_url}/{f}"
    dest = os.path.join(dest_dir, f)
    print(f"Downloading {f}...")
    r = requests.get(url, timeout=15)
    r.raise_for_status()
    with open(dest, "wb") as out:
        out.write(r.content)
    print(f"Saved {f} ({len(r.content)} bytes)")

print("All metadata files downloaded successfully!")
