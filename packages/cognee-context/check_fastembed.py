try:
    import fastembed
    print("fastembed available")
except Exception as e:
    print("fastembed error:", e)

from cognee.infrastructure.databases.vector.embeddings.get_embedding_engine import get_embedding_engine
print("get_embedding_engine available")
