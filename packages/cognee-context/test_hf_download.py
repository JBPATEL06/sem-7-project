from huggingface_hub import hf_hub_download
import sys
import time

print("Testing direct hf download...")
start = time.time()
try:
    file_path = hf_hub_download(
        repo_id="qdrant/bge-small-en-v1.5-onnx-q",
        filename="model_optimized.onnx",
        cache_dir=r"C:\Users\elluminati\AppData\Local\Temp\fastembed_cache"
    )
    print(f"Download completed in {time.time()-start:.2f}s: {file_path}")
except Exception as e:
    print(f"Download failed after {time.time()-start:.2f}s: {type(e).__name__}: {e}")
