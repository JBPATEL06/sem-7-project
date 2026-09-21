import asyncio
import os
import sys
import json
import cognee
from cognee import SearchType

os.environ["ENABLE_BACKEND_ACCESS_CONTROL"] = "false"
os.environ["CACHING"] = "false"

async def run_pipeline():
    print("=== Cognee Contradiction Detection Pipeline ===")
    
    # Configure 100% local embedding engine
    cognee.config.set_embedding_provider("fastembed")
    cognee.config.set_embedding_model("BAAI/bge-small-en-v1.5")
    cognee.config.set_embedding_dimensions(384)

    # 1. Read the 3 conflict docs
    docs_dir = os.path.join(os.path.dirname(__file__), "conflict_docs")
    doc_files = [
        "data-dictionary.md",
        "mongodb-atlas-persistence.md",
        "tier1-architecture.md"
    ]
    
    docs_data = []
    for f in doc_files:
        f_path = os.path.join(docs_dir, f)
        with open(f_path, "r", encoding="utf-8") as fh:
            content = fh.read()
            docs_data.append((f, content))
            print(f"Loaded {f} ({len(content)} chars)")

    # 2. Ingest documents into Cognee
    dataset_name = "architecture_storage_conflict"
    print(f"\n[Phase 2] Ingesting {len(docs_data)} conflict documents into dataset '{dataset_name}'...")
    for filename, content in docs_data:
        print(f"  Adding {filename} to cognee...")
        await cognee.add(content, dataset_name=dataset_name)
    print("  All documents ingested successfully!")

    # 3. Run Cognify to construct Knowledge Graph
    print(f"\n[Phase 3] Running cognify() to construct knowledge graph...")
    await cognee.cognify(datasets=[dataset_name])
    print("  cognify() completed successfully!")

    # 4. Search and analyze contradictions
    queries = [
        "Where are projects, diagrams, and application data stored according to the documents?",
        "What is the storage model for users versus other application entities?",
        "Are there any conflicting statements about MongoDB Atlas versus local-first JSON storage?"
    ]

    print("\n[Phase 3] Executing contradiction detection queries...")
    results = {}
    for q in queries:
        print(f"\nQuery: '{q}'")
        search_res = await cognee.search(q, datasets=[dataset_name])
        results[q] = search_res
        print(f"Result count: {len(search_res) if isinstance(search_res, list) else 1}")
        print("Preview:")
        print(search_res)

    # Save structured results to file
    out_path = os.path.join(os.path.dirname(__file__), "contradiction_results.json")
    with open(out_path, "w", encoding="utf-8") as out:
        # Convert non-serializable objects
        def default_serializer(o):
            if hasattr(o, "__dict__"):
                return o.__dict__
            return str(o)
        json.dump(results, out, default=default_serializer, indent=2)
    print(f"\nResults saved to {out_path}")

if __name__ == "__main__":
    asyncio.run(run_pipeline())
