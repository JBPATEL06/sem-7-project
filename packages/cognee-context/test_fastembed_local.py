from fastembed import TextEmbedding

print("Loading TextEmbedding...")
model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5", cache_dir=r"C:\Users\elluminati\AppData\Local\Temp\fastembed_cache")
print("Model loaded! Generating test embedding...")
embeddings = list(model.embed(["Hello world test from local Cognee"]))
print(f"Success! Generated embedding of length: {len(embeddings[0])}")
