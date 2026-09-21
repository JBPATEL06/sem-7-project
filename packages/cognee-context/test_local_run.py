import asyncio
import os
import cognee

os.environ["ENABLE_BACKEND_ACCESS_CONTROL"] = "false"
os.environ["CACHING"] = "false"

async def main():
    print("Testing cognee local run...")
    cognee.config.set_embedding_provider("fastembed")
    cognee.config.set_embedding_model("BAAI/bge-small-en-v1.5")
    cognee.config.set_embedding_dimensions(384)
    
    text = "The AI Manager uses local-first JSON storage in .ai-manager/ for projects, screens, and diagrams."
    print("Calling cognee.add()...")
    await cognee.add(text, dataset_name="test_dataset")
    print("cognee.add() succeeded!")

if __name__ == "__main__":
    asyncio.run(main())
