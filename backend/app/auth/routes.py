from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.utils.db import get_session
from app.models.models import User
from app.utils.security import verify_password, get_current_user
from app.services.audit_service import record_audit_event

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    session = get_session()
    try:
        user = session.query(User).filter_by(email=email).first()
        if not user or not verify_password(password, user.password_hash):
            return jsonify({'error': 'Invalid email or password.'}), 401

        if not user.is_active:
            return jsonify({'error': 'Account is inactive. Please contact your administrator.'}), 403

        # Create access token with identity as stringified user ID
        token = create_access_token(identity=str(user.id))

        # Record audit event
        record_audit_event(
            event_type='AUTH_LOGIN',
            resource_type='user',
            resource_id=str(user.id),
            metadata={'email': user.email, 'role': user.role},
            actor=user,
            workspace_id=1,
            session=session
        )
        session.commit()

        return jsonify({
            'token': token,
            'user': user.to_dict()
        }), 200
    finally:
        session.close()


@auth_bp.route('/logout', methods=['POST'])
@jwt_required(optional=True)
def logout():
    user = get_current_user()
    if user:
        record_audit_event(
            event_type='AUTH_LOGOUT',
            resource_type='user',
            resource_id=str(user.id),
            metadata={'email': user.email},
            actor=user
        )
    return jsonify({'message': 'Successfully logged out.'}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found or inactive'}), 404
    return jsonify({'user': user.to_dict()}), 200


@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    session = get_session()
    try:
        users = session.query(User).filter_by(is_active=True).all()
        return jsonify({'users': [u.to_dict() for u in users]}), 200
    finally:
        session.close()
