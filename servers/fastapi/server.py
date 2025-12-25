import uvicorn
import argparse
import os

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, required=True)
    args = parser.parse_args()
    
    # Defaults to 127.0.0.1 for local Nginx routing
    host = os.getenv("HOST", "127.0.0.1")

    print(f"✅ FastAPI starting on {host}:{args.port}")

    uvicorn.run(
        "api.main:app",
        host=host,
        port=args.port,
        log_level="info",
        reload=False
    )
