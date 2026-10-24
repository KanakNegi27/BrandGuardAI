import pytest
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app import create_app
from app.config import Config
from app.utils.db import get_session, Base, get_engine
from init_db import init_database

class TestConfig(Config):
    TESTING = True
    DATABASE_URL = "sqlite:///:memory:"
    JWT_SECRET_KEY = "test-jwt-secret-key"

@pytest.fixture(scope='session')
def app():
    # Use memory or local sqlite database for test session
    app = create_app(TestConfig)
    with app.app_context():
        init_database(drop_existing=True)
        yield app

@pytest.fixture(scope='function')
def client(app):
    return app.test_client()

@pytest.fixture(scope='function')
def db_session():
    session = get_session()
    yield session
    session.close()

def get_auth_token(client, email, password):
    resp = client.post('/api/auth/login', json={'email': email, 'password': password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.json}"
    return resp.json['token']
