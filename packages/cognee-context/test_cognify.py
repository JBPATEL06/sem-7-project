import asyncio
import os
import cognee

os.environ["ENABLE_BACKEND_ACCESS_CONTROL"] = "false"
os.environ["CACHING"] = "false"

async def main():
    cognee.config.set_embedding_provider("fastembed")
    cognee.config.set_embedding_model("BAAI/bge-small-en-v1.5")
    cognee.config.set_embedding_dimensions(384)

    print("Calling cognee.cognify()...")
    try:
        await cognee.cognify(datasets=["test_dataset"])
        print("cognee.cognify() succeeded!")
    except Exception as e:
        print("cognify error:", type(e).__name__, e)

if __name__ == "__main__":
    asyncio.run(main())
