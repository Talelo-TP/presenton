import uvicorn
import argparse
import os
import sys

# Flush output immediately for Cloud Run logs
sys.stdout.reconfigure(line_buffering=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--reload", type=str, default="false")
    args = parser.parse_args()
    
    # We bind to 0.0.0.0 to listen on all interfaces
    host = os.getenv("HOST", "0.0.0.0")
    
    print(f"✅ FastAPI starting on {host}:{args.port}")
    
    uvicorn.run(
        "api.main:app",
        host=host,
        port=args.port,
        log_level="info",
        reload=False
    )
