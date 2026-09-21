import os
import requests
import time

url = "https://huggingface.co/qdrant/bge-small-en-v1.5-onnx-q/resolve/main/model_optimized.onnx"
dest = r"C:\Users\elluminati\AppData\Local\Temp\fastembed_cache\models--qdrant--bge-small-en-v1.5-onnx-q\snapshots\52398278842ec620401d67a149c09930f789e574\model_optimized.onnx"
os.makedirs(os.path.dirname(dest), exist_ok=True)

print(f"Downloading {url} to {dest}...")
t0 = time.time()
r = requests.get(url, stream=True, timeout=30)
r.raise_for_status()
total = int(r.headers.get("content-length", 0))
downloaded = 0
with open(dest, "wb") as f:
    for chunk in r.iter_content(chunk_size=1024 * 1024):
        if chunk:
            f.write(chunk)
            downloaded += len(chunk)
            pct = (downloaded / total) * 100 if total else 0
            mb = downloaded / (1024 * 1024)
            speed = mb / max(time.time() - t0, 0.001)
            print(f"Downloaded {mb:.1f}/{total/(1024*1024):.1f} MB ({pct:.1f}%) at {speed:.2f} MB/s", end="\r")

print(f"\nFinished in {time.time()-t0:.2f}s!")
