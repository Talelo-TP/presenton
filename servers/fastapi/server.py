import argparse
import faulthandler
import os
import time

import uvicorn

if __name__ == "__main__":
    faulthandler.enable()
    faulthandler.dump_traceback_later(60, repeat=True)

    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, required=True)
    args = parser.parse_args()
    
    # Defaults to 127.0.0.1 for local Nginx routing
    host = os.getenv("HOST", "127.0.0.1")

    print(f"✅ FastAPI starting on {host}:{args.port}")

    t0 = time.time()
    print("⏳ Importing FastAPI app (api.main:app)...")
    __import__("api.main")
    print(f"✅ Imported api.main in {time.time() - t0:.2f}s")

    uvicorn.run(
        "api.main:app",
        host=host,
        port=args.port,
        log_level="info",
        reload=False
    )
