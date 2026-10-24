import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import desc
from app.utils.db import get_session
from app.models.models import AuditEvent
from app.utils.security import get_current_user

logger = logging.getLogger(__name__)
audit_bp = Blueprint('audit', __name__, url_prefix='/api')

@audit_bp.route('/audit-events', methods=['GET'])
@jwt_required()
def list_audit_events():
    session = get_session()
    try:
        user = get_current_user()
        workspace_id = 1

        event_type = request.args.get('event_type', '').strip()
        resource_type = request.args.get('resource_type', '').strip()
        search = request.args.get('search', '').strip().lower()
        page = max(1, request.args.get('page', 1, type=int))
        limit = min(100, max(1, request.args.get('limit', 20, type=int)))

        query = session.query(AuditEvent)

        if event_type:
            query = query.filter(AuditEvent.event_type == event_type)
        if resource_type:
            query = query.filter(AuditEvent.resource_type == resource_type)
        if search:
            query = query.filter(
                (AuditEvent.event_type.ilike(f"%{search}%")) |
                (AuditEvent.actor_email.ilike(f"%{search}%")) |
                (AuditEvent.resource_type.ilike(f"%{search}%")) |
                (AuditEvent.resource_id.ilike(f"%{search}%"))
            )

        query = query.order_by(desc(AuditEvent.created_at))

        total_count = query.count()
        events = query.offset((page - 1) * limit).limit(limit).all()

        return jsonify({
            'events': [e.to_dict() for e in events],
            'total': total_count,
            'page': page,
            'limit': limit,
            'total_pages': (total_count + limit - 1) // limit if limit else 1
        }), 200

    finally:
        session.close()
