from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from werkzeug.security import generate_password_hash, check_password_hash
from app.utils.db import get_session
from app.models.models import User

def hash_password(password: str) -> str:
    """Hash password securely using Werkzeug PBKDF2/scrypt."""
    return generate_password_hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password hash."""
    if not hashed_password or not plain_password:
        return False
    # If standard Werkzeug hash
    try:
        return check_password_hash(hashed_password, plain_password)
    except Exception:
        # Fallback check
        return False

def get_current_user():
    """Retrieve currently authenticated user from JWT identity."""
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if not user_id:
            return None
        session = get_session()
        user = session.query(User).filter_by(id=int(user_id), is_active=True).first()
        session.close()
        return user
    except Exception:
        return None

def role_required(allowed_roles):
    """
    Decorator to protect routes by user role.
    allowed_roles: list of allowed roles e.g. ['admin'], ['admin', 'reviewer']
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception as e:
                return jsonify({'error': 'Authentication required', 'message': str(e)}), 401

            user_id = get_jwt_identity()
            session = get_session()
            user = session.query(User).filter_by(id=int(user_id), is_active=True).first()
            session.close()

            if not user:
                return jsonify({'error': 'User not found or inactive'}), 401

            if user.role not in allowed_roles:
                return jsonify({
                    'error': 'Forbidden',
                    'message': f'Access requires one of: {", ".join(allowed_roles)}. Your role is {user.role}.'
                }), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator
