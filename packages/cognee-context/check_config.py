import cognee
import json

try:
    all_cfg = cognee.config.get_all()
    print("ALL CONFIG:")
    for k, v in all_cfg.items():
        print(f"  {k}: {v}")
except Exception as e:
    print("Error:", e)
