import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session
from app.config import Config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base = declarative_base()

_engine = None
_SessionFactory = None
_db_type = 'unknown'

def init_engine():
    global _engine, _SessionFactory, _db_type
    primary_uri = Config.get_database_uri()
    
    # Try primary URI (MySQL or custom URL)
    try:
        logger.info(f"Connecting to database: {primary_uri.split('@')[-1] if '@' in primary_uri else primary_uri}")
        # Only use pool settings for non-sqlite
        if primary_uri.startswith('sqlite'):
            engine = create_engine(primary_uri, connect_args={"check_same_thread": False})
            _db_type = 'sqlite'
        else:
            engine = create_engine(primary_uri, pool_pre_ping=True, pool_recycle=3600)
            # Test connection
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            _db_type = 'mysql'
            logger.info("Successfully connected to MySQL database.")
    except Exception as e:
        logger.warning(f"Could not connect to configured database ({e}). Falling back to local SQLite database.")
        sqlite_uri = f"sqlite:///{Config.SQLITE_PATH}"
        engine = create_engine(sqlite_uri, connect_args={"check_same_thread": False})
        _db_type = 'sqlite'
        logger.info(f"Initialized local SQLite fallback at: {Config.SQLITE_PATH}")

    _engine = engine
    _SessionFactory = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=_engine))
    return _engine

def get_engine():
    global _engine
    if _engine is None:
        init_engine()
    return _engine

def get_session():
    global _SessionFactory
    if _SessionFactory is None:
        init_engine()
    return _SessionFactory()

def get_db_type():
    global _db_type
    if _db_type == 'unknown':
        init_engine()
    return _db_type

class DBContext:
    """Context manager for database sessions."""
    def __enter__(self):
        self.session = get_session()
        return self.session

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.session.rollback()
        else:
            try:
                self.session.commit()
            except Exception:
                self.session.rollback()
                raise
        self.session.close()
