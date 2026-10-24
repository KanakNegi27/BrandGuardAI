import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(backend_dir / '.env')

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'brandguard-secret-2026')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'brandguard-jwt-secret-2026')
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 86400))
    
    # CORS
    cors_str = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')
    CORS_ORIGINS = [origin.strip() for origin in cors_str.split(',') if origin.strip()]
    
    # Database Configuration
    DATABASE_URL = os.getenv('DATABASE_URL')
    MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
    MYSQL_PORT = int(os.getenv('MYSQL_PORT', 3306))
    MYSQL_USER = os.getenv('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
    MYSQL_DATABASE = os.getenv('MYSQL_DATABASE', 'brandguard_db')
    
    # Default SQLite fallback path
    SQLITE_PATH = backend_dir / 'brandguard.db'
    
    @classmethod
    def get_database_uri(cls):
        """Build database URI or return SQLite fallback if specified or needed."""
        if cls.DATABASE_URL:
            return cls.DATABASE_URL
        if cls.MYSQL_USER and cls.MYSQL_DATABASE:
            # Construct MySQL URI
            pwd = f":{cls.MYSQL_PASSWORD}" if cls.MYSQL_PASSWORD else ""
            return f"mysql+pymysql://{cls.MYSQL_USER}{pwd}@{cls.MYSQL_HOST}:{cls.MYSQL_PORT}/{cls.MYSQL_DATABASE}"
        return f"sqlite:///{cls.SQLITE_PATH}"

    # AI Configuration
    AI_PROVIDER = os.getenv('AI_PROVIDER', 'gemini').lower()
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
    GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')
    
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
    OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
    OPENAI_BASE_URL = os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')
    
    # Workspace & Uploads
    DEFAULT_WORKSPACE_ID = int(os.getenv('DEFAULT_WORKSPACE_ID', 1))
    UPLOAD_FOLDER = backend_dir / os.getenv('UPLOAD_FOLDER', 'uploads')
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 10 * 1024 * 1024))
    ALLOWED_EXTENSIONS = {'txt', 'docx', 'pdf'}
