import logging
from flask import request
from app.utils.db import get_session
from app.models.models import AuditEvent
from app.utils.security import get_current_user

logger = logging.getLogger(__name__)

def record_audit_event(
    event_type: str,
    resource_type: str,
    resource_id: str = None,
    metadata: dict = None,
    actor=None,
    workspace_id: int = 1,
    ip_address: str = None,
    session=None
):
    """
    Record an immutable audit event in the database.
    If session is provided, uses that session within the active transaction;
    otherwise creates a standalone session and commits immediately.
    """
    close_session_at_end = False
    if session is None:
        session = get_session()
        close_session_at_end = True

    try:
        # Resolve actor if not explicitly passed
        if actor is None:
            actor = get_current_user()

        # Resolve IP address
        if ip_address is None:
            try:
                ip_address = request.remote_addr if request else '127.0.0.1'
            except Exception:
                ip_address = '127.0.0.1'

        audit_entry = AuditEvent(
            workspace_id=workspace_id,
            actor_id=actor.id if actor else None,
            actor_email=actor.email if actor else 'system@brandguard.ai',
            actor_role=actor.role if actor else 'system',
            event_type=event_type,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            metadata_json=metadata or {},
            ip_address=ip_address
        )

        session.add(audit_entry)
        if close_session_at_end:
            session.commit()
            session.close()
        return audit_entry
    except Exception as e:
        logger.error(f"Failed to record audit event '{event_type}': {e}")
        if close_session_at_end:
            session.rollback()
            session.close()
        return None
