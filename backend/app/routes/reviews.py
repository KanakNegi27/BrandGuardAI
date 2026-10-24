import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import desc
from app.utils.db import get_session
from app.models.models import ContentSubmission, ReviewComment, ReviewDecision, Finding
from app.services.submission_service import SubmissionService
from app.utils.security import get_current_user, role_required
from app.services.audit_service import record_audit_event

logger = logging.getLogger(__name__)
reviews_bp = Blueprint('reviews', __name__, url_prefix='/api')

@reviews_bp.route('/reviews/queue', methods=['GET'])
@jwt_required()
def get_review_queue():
    session = get_session()
    try:
        user = get_current_user()
        workspace_id = 1

        # Review queue shows items in 'Pending Review' or 'Escalated'
        queue_subs = session.query(ContentSubmission).filter(
            ContentSubmission.workspace_id == workspace_id,
            ContentSubmission.current_status.in_(['Pending Review', 'Escalated'])
        ).order_by(
            # Prioritize Escalated first, then Pending Review
            desc(ContentSubmission.current_status == 'Escalated'),
            desc(ContentSubmission.created_at)
        ).all()

        queue_items = [s.to_dict(include_version=True) for s in queue_subs]
        return jsonify({'queue': queue_items, 'total': len(queue_items)}), 200

    finally:
        session.close()


@reviews_bp.route('/submissions/<int:sub_id>/submit-for-review', methods=['POST'])
@jwt_required()
def submit_for_review(sub_id: int):
    user = get_current_user()
    data = request.get_json() or {}
    assigned_reviewer_id = data.get('assigned_reviewer_id')

    session = get_session()
    try:
        submission = session.query(ContentSubmission).filter_by(id=sub_id).first()
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404

        success, msg = SubmissionService.submit_for_review(
            session=session,
            submission=submission,
            actor=user,
            reviewer_id=assigned_reviewer_id
        )

        if not success:
            return jsonify({'error': msg}), 400

        session.commit()
        return jsonify({'message': msg, 'submission': submission.to_dict(include_version=True)}), 200

    finally:
        session.close()


@reviews_bp.route('/submissions/<int:sub_id>/reviews', methods=['POST'])
@jwt_required()
def add_review_comment(sub_id: int):
    user = get_current_user()
    data = request.get_json() or {}
    comment_text = data.get('comment_text', '').strip()
    comment_type = data.get('comment_type', 'general')

    if not comment_text:
        return jsonify({'error': 'Comment text cannot be empty.'}), 400

    session = get_session()
    try:
        submission = session.query(ContentSubmission).filter_by(id=sub_id).first()
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404

        comment = ReviewComment(
            submission_id=sub_id,
            version_id=submission.current_version_id,
            user_id=user.id,
            comment_type=comment_type,
            comment_text=comment_text
        )
        session.add(comment)

        record_audit_event(
            event_type='REVIEWER_COMMENT_ADDED',
            resource_type='submission',
            resource_id=str(sub_id),
            metadata={'comment_type': comment_type, 'version_id': submission.current_version_id},
            actor=user,
            session=session
        )

        session.commit()
        return jsonify({'message': 'Comment added successfully.', 'comment': comment.to_dict()}), 201

    finally:
        session.close()


@reviews_bp.route('/submissions/<int:sub_id>/approve', methods=['POST'])
@jwt_required()
def approve_submission(sub_id: int):
    user = get_current_user()
    if user.role not in ('reviewer', 'admin'):
        return jsonify({'error': 'Unauthorized: Only reviewers or administrators can approve content.'}), 403

    data = request.get_json() or {}
    reason = data.get('reason', '')
    critical_exception = data.get('critical_exception_allowed', False)
    critical_rationale = data.get('critical_exception_rationale', '')

    session = get_session()
    try:
        submission = session.query(ContentSubmission).filter_by(id=sub_id).first()
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404

        success, msg = SubmissionService.approve_submission(
            session=session,
            submission=submission,
            reviewer=user,
            reason=reason,
            critical_exception_allowed=critical_exception,
            critical_exception_rationale=critical_rationale
        )

        if not success:
            return jsonify({'error': msg}), 400

        session.commit()
        return jsonify({
            'message': msg,
            'submission': submission.to_dict(include_version=True)
        }), 200

    except Exception as e:
        session.rollback()
        logger.error(f"Error approving submission #{sub_id}: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@reviews_bp.route('/submissions/<int:sub_id>/request-changes', methods=['POST'])
@jwt_required()
def request_changes(sub_id: int):
    user = get_current_user()
    if user.role not in ('reviewer', 'admin'):
        return jsonify({'error': 'Unauthorized: Only reviewers or administrators can request changes.'}), 403

    data = request.get_json() or {}
    reason = data.get('reason', '').strip()

    if not reason:
        return jsonify({'error': 'A detailed explanation of required changes is mandatory.'}), 400

    session = get_session()
    try:
        submission = session.query(ContentSubmission).filter_by(id=sub_id).first()
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404

        success, msg = SubmissionService.request_changes(
            session=session,
            submission=submission,
            reviewer=user,
            reason=reason
        )

        if not success:
            return jsonify({'error': msg}), 400

        session.commit()
        return jsonify({
            'message': msg,
            'submission': submission.to_dict(include_version=True)
        }), 200

    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@reviews_bp.route('/submissions/<int:sub_id>/escalate', methods=['POST'])
@jwt_required()
def escalate_submission(sub_id: int):
    user = get_current_user()
    if user.role not in ('reviewer', 'admin'):
        return jsonify({'error': 'Unauthorized: Only reviewers or administrators can escalate submissions.'}), 403

    data = request.get_json() or {}
    reason = data.get('reason', '').strip()

    if not reason:
        return jsonify({'error': 'An explicit escalation reason is mandatory.'}), 400

    session = get_session()
    try:
        submission = session.query(ContentSubmission).filter_by(id=sub_id).first()
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404

        success, msg = SubmissionService.escalate_submission(
            session=session,
            submission=submission,
            reviewer=user,
            reason=reason
        )

        if not success:
            return jsonify({'error': msg}), 400

        session.commit()
        return jsonify({
            'message': msg,
            'submission': submission.to_dict(include_version=True)
        }), 200

    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()
