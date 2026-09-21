import cognee
from cognee.infrastructure.llm.config import get_llm_config
from cognee.infrastructure.databases.vector.embeddings.config import get_embedding_config

try:
    llm_cfg = get_llm_config()
    print("LLM Config:", llm_cfg)
except Exception as e:
    print("LLM Config error:", e)

try:
    emb_cfg = get_embedding_config()
    print("Embedding Config:", emb_cfg)
except Exception as e:
    print("Embedding Config error:", e)
