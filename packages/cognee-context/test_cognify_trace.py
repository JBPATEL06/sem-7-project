import asyncio
import os
import traceback
import cognee

os.environ["ENABLE_BACKEND_ACCESS_CONTROL"] = "false"
os.environ["CACHING"] = "false"

async def main():
    cognee.config.set_embedding_provider("fastembed")
    cognee.config.set_embedding_model("BAAI/bge-small-en-v1.5")
    cognee.config.set_embedding_dimensions(384)

    try:
        await cognee.cognify(datasets=["test_dataset"])
    except Exception as e:
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
