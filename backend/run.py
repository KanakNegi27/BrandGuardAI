import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Ensure backend directory is in python path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

load_dotenv(backend_dir / '.env')

from app import create_app
from init_db import init_database

app = create_app()

if __name__ == '__main__':
    # Auto-initialize database schema and seeds on startup if first run
    try:
        init_database(drop_existing=False)
    except Exception as e:
        print(f"Database init check notice: {e}")

    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    
    print(f"\n=======================================================")
    print(f" BrandGuard AI — Backend Service Active")
    print(f" URL: http://127.0.0.1:{port}")
    print(f" Health Check: http://127.0.0.1:{port}/api/health")
    print(f"=======================================================\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
