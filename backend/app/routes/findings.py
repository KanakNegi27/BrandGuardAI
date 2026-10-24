import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.utils.db import get_session
from app.models.models import Finding, ContentVersion, ContentSubmission
from app.utils.security import get_current_user
from app.services.audit_service import record_audit_event

logger = logging.getLogger(__name__)
findings_bp = Blueprint('findings', __name__, url_prefix='/api/findings')

@findings_bp.route('/<int:finding_id>', methods=['PATCH'])
@jwt_required()
def update_finding(finding_id: int):
    user = get_current_user()
    data = request.get_json() or {}
    new_status = data.get('status')

    if new_status not in ('open', 'accepted', 'edited', 'dismissed'):
        return jsonify({'error': 'Invalid status'}), 400

    session = get_session()
    try:
        finding = session.query(Finding).filter_by(id=finding_id).first()
        if not finding:
            return jsonify({'error': 'Finding not found'}), 404

        finding.status = new_status
        if 'dismiss_reason' in data:
            finding.dismiss_reason = data['dismiss_reason']

        session.commit()
        return jsonify({'finding': finding.to_dict()}), 200
    finally:
        session.close()


@findings_bp.route('/<int:finding_id>/apply-suggestion', methods=['POST'])
@jwt_required()
def apply_suggestion(finding_id: int):
    user = get_current_user()
    data = request.get_json() or {}
    custom_replacement = data.get('custom_text') # If user edited suggestion

    session = get_session()
    try:
        finding = session.query(Finding).filter_by(id=finding_id).first()
        if not finding:
            return jsonify({'error': 'Finding not found'}), 404

        version = session.query(ContentVersion).filter_by(id=finding.version_id).first()
        if not version:
            return jsonify({'error': 'Associated version not found'}), 404

        replacement = custom_replacement or finding.suggested_correction
        if not replacement:
            return jsonify({'error': 'No suggested correction available to apply.'}), 400

        # Replace affected text in version content
        affected = finding.affected_text
        content = version.content_body

        if affected in content:
            updated_content = content.replace(affected, replacement, 1)
            version.content_body = updated_content
            version.word_count = len(updated_content.split())
            version.character_count = len(updated_content)

            finding.status = 'edited' if custom_replacement else 'accepted'
            session.commit()

            record_audit_event(
                event_type='SUGGESTION_APPLIED',
                resource_type='finding',
                resource_id=str(finding.id),
                metadata={
                    'submission_id': finding.submission_id,
                    'version_id': finding.version_id,
                    'original': affected,
                    'applied': replacement
                },
                actor=user,
                session=session
            )
            session.commit()

            return jsonify({
                'message': 'Suggestion applied to content.',
                'finding': finding.to_dict(),
                'updated_content': updated_content
            }), 200
        else:
            return jsonify({'error': 'Target passage could not be found in active content.'}), 400

    except Exception as e:
        session.rollback()
        logger.error(f"Error applying suggestion: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@findings_bp.route('/<int:finding_id>/dismiss', methods=['POST'])
@jwt_required()
def dismiss_finding(finding_id: int):
    user = get_current_user()
    data = request.get_json() or {}
    reason = data.get('reason', '').strip()

    if not reason or len(reason) < 4:
        return jsonify({'error': 'A valid justification reason is required to dismiss a finding.'}), 400

    session = get_session()
    try:
        finding = session.query(Finding).filter_by(id=finding_id).first()
        if not finding:
            return jsonify({'error': 'Finding not found'}), 404

        finding.status = 'dismissed'
        finding.dismiss_reason = reason
        session.commit()

        record_audit_event(
            event_type='FINDING_DISMISSED',
            resource_type='finding',
            resource_id=str(finding.id),
            metadata={
                'submission_id': finding.submission_id,
                'severity': finding.severity,
                'category': finding.issue_category,
                'reason': reason
            },
            actor=user,
            session=session
        )
        session.commit()

        return jsonify({
            'message': 'Finding dismissed.',
            'finding': finding.to_dict()
        }), 200
    finally:
        session.close()
