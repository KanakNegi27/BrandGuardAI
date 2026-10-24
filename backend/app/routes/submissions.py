import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import desc, asc
from app.utils.db import get_session
from app.models.models import (
    ContentSubmission, ContentVersion, Finding, AnalysisRun, 
    ReviewComment, ReviewDecision, User
)
from app.services.submission_service import SubmissionService
from app.services.document_parser import extract_text_from_file, allowed_file
from app.ai.analyzer import ContentAnalysisPipeline
from app.utils.security import get_current_user
from app.config import Config

logger = logging.getLogger(__name__)
submissions_bp = Blueprint('submissions', __name__, url_prefix='/api/submissions')

@submissions_bp.route('', methods=['GET'])
@jwt_required()
def list_submissions():
    session = get_session()
    try:
        user = get_current_user()
        workspace_id = 1

        search = request.args.get('search', '').strip().lower()
        status = request.args.get('status', '').strip()
        content_type = request.args.get('content_type', '').strip()
        creator_id = request.args.get('creator_id', type=int)
        severity = request.args.get('severity', '').strip()
        sort = request.args.get('sort', 'newest').strip().lower()
        page = max(1, request.args.get('page', 1, type=int))
        limit = min(50, max(1, request.args.get('limit', 10, type=int)))

        query = session.query(ContentSubmission).filter_by(workspace_id=workspace_id)

        # Creator sees their submissions unless they're reviewer or admin
        if user and user.role == 'creator':
            # Creator can see all submissions in workspace or filter by own
            # Let's allow creators to see all submissions in workspace or prioritize own
            pass

        if search:
            query = query.filter(ContentSubmission.title.ilike(f"%{search}%"))

        if status:
            query = query.filter(ContentSubmission.current_status == status)

        if content_type:
            query = query.filter(ContentSubmission.content_type == content_type)

        if creator_id:
            query = query.filter(ContentSubmission.creator_id == creator_id)

        if sort == 'oldest':
            query = query.order_by(asc(ContentSubmission.created_at))
        elif sort == 'risk':
            # Risk sorting: prioritize items with Pending Review or Escalated and high findings
            query = query.order_by(desc(ContentSubmission.current_status == 'Escalated'),
                                   desc(ContentSubmission.current_status == 'Pending Review'),
                                   desc(ContentSubmission.created_at))
        else:
            query = query.order_by(desc(ContentSubmission.created_at))

        total_count = query.count()
        submissions = query.offset((page - 1) * limit).limit(limit).all()

        res_data = [s.to_dict(include_version=True) for s in submissions]

        # Optional severity filtering in memory if requested
        if severity:
            res_data = [
                s for s in res_data 
                if (severity == 'Critical' and s.get('critical_count', 0) > 0) or
                   (severity == 'High' and s.get('high_count', 0) > 0)
            ]

        return jsonify({
            'submissions': res_data,
            'total': total_count,
            'page': page,
            'limit': limit,
            'total_pages': (total_count + limit - 1) // limit if limit else 1
        }), 200

    finally:
        session.close()


@submissions_bp.route('', methods=['POST'])
@jwt_required()
def create_submission():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    title = data.get('title', '').strip()
    content_body = data.get('content_body', '').strip()
    content_type = data.get('content_type', 'other')
    publishing_channel = data.get('publishing_channel', 'website')
    campaign_name = data.get('campaign_name', '')

    if not title:
        return jsonify({'error': 'Submission title is required.'}), 400
    if not content_body:
        return jsonify({'error': 'Content text cannot be empty.'}), 400

    session = get_session()
    try:
        submission = SubmissionService.create_submission(
            session=session,
            creator=user,
            title=title,
            content_body=content_body,
            content_type=content_type,
            publishing_channel=publishing_channel,
            campaign_name=campaign_name,
            workspace_id=1
        )
        session.commit()
        return jsonify({
            'message': 'Submission draft created successfully.',
            'submission': submission.to_dict(include_version=True)
        }), 201
    except Exception as e:
        session.rollback()
        logger.error(f"Error creating submission: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@submissions_bp.route('/<int:sub_id>', methods=['GET'])
@jwt_required()
def get_submission(sub_id: int):
    session = get_session()
    try:
        submission = session.query(ContentSubmission).filter_by(id=sub_id).first()
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404

        # Load versions
        versions = [v.to_dict() for v in submission.versions]

        # Load findings for current version
        findings = []
        if submission.current_version_id:
            db_findings = session.query(Finding).filter_by(version_id=submission.current_version_id).all()
            findings = [f.to_dict() for f in db_findings]

        # Load comments
        comments = [c.to_dict() for c in submission.comments]

        # Load decisions
        decisions = [d.to_dict() for d in submission.decisions]

        # Latest analysis run
        latest_run = submission.analysis_runs[-1].to_dict() if submission.analysis_runs else None

        sub_dict = submission.to_dict(include_version=True)
        sub_dict['versions'] = versions
        sub_dict['findings'] = findings
        sub_dict['comments'] = comments
        sub_dict['decisions'] = decisions
        sub_dict['latest_analysis_run'] = latest_run

        return jsonify({'submission': sub_dict}), 200

    finally:
        session.close()


@submissions_bp.route('/<int:sub_id>', methods=['PUT'])
@jwt_required()
def update_submission(sub_id: int):
    user = get_current_user()
    data = request.get_json() or {}

    session = get_session()
    try:
        submission = session.query(ContentSubmission).filter_by(id=sub_id).first()
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404

        # Creators can only update their own drafts unless reviewer or admin
        if user.role == 'creator' and submission.creator_id != user.id:
            return jsonify({'error': 'You do not have permission to edit this submission.'}), 403

        if 'title' in data and data['title'].strip():
            submission.title = data['title'].strip()
        if 'content_type' in data:
            submission.content_type = data['content_type']
        if 'publishing_channel' in data:
            submission.publishing_channel = data['publishing_channel']
        if 'campaign_name' in data:
            submission.campaign_name = data['campaign_name']

        session.commit()
        return jsonify({'submission': submission.to_dict(include_version=True)}), 200
    finally:
        session.close()


@submissions_bp.route('/<int:sub_id>/analyze', methods=['POST'])
@jwt_required()
def analyze_submission(sub_id: int):
    user = get_current_user()
    data = request.get_json() or {}

    session = get_session()
    try:
        submission = session.query(ContentSubmission).filter_by(id=sub_id).first()
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404

        version_id = data.get('version_id') or submission.current_version_id
        if not version_id:
            return jsonify({'error': 'Submission has no version to analyze.'}), 400

        # Mark status as Analyzing temporarily
        prev_status = submission.current_status
        submission.current_status = 'Analyzing'
        session.commit()

        pipeline = ContentAnalysisPipeline(session=session)
        analysis_result = pipeline.run(submission_id=sub_id, version_id=version_id, user=user)

        # Refresh submission
        submission = session.query(ContentSubmission).filter_by(id=sub_id).first()

        return jsonify({
            'message': 'Content analysis completed successfully.',
            'analysis': analysis_result,
            'submission': submission.to_dict(include_version=True)
        }), 200

    except Exception as e:
        session.rollback()
        logger.error(f"Analysis error: {e}")
        return jsonify({'error': f"Analysis failed: {str(e)}"}), 500
    finally:
        session.close()


@submissions_bp.route('/<int:sub_id>/versions', methods=['POST'])
@jwt_required()
def create_version(sub_id: int):
    user = get_current_user()
    data = request.get_json() or {}
    new_content = data.get('content_body', '').strip()
    change_notes = data.get('change_notes', '')

    if not new_content:
        return jsonify({'error': 'Content body cannot be empty.'}), 400

    session = get_session()
    try:
        submission = session.query(ContentSubmission).filter_by(id=sub_id).first()
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404

        version = SubmissionService.create_new_version(
            session=session,
            submission=submission,
            creator=user,
            new_content_body=new_content,
            change_notes=change_notes
        )
        session.commit()

        return jsonify({
            'message': f"Version {version.version_number} created successfully.",
            'version': version.to_dict(),
            'submission': submission.to_dict(include_version=True)
        }), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@submissions_bp.route('/<int:sub_id>/versions', methods=['GET'])
@jwt_required()
def get_versions(sub_id: int):
    session = get_session()
    try:
        submission = session.query(ContentSubmission).filter_by(id=sub_id).first()
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404

        versions = [v.to_dict() for v in submission.versions]
        return jsonify({'versions': versions}), 200
    finally:
        session.close()


@submissions_bp.route('/<int:sub_id>/findings', methods=['GET'])
@jwt_required()
def get_submission_findings(sub_id: int):
    session = get_session()
    try:
        submission = session.query(ContentSubmission).filter_by(id=sub_id).first()
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404

        version_id = request.args.get('version_id', submission.current_version_id, type=int)
        findings = session.query(Finding).filter_by(submission_id=sub_id, version_id=version_id).all()

        return jsonify({'findings': [f.to_dict() for f in findings]}), 200
    finally:
        session.close()


@submissions_bp.route('/upload-document', methods=['POST'])
@jwt_required()
def upload_document():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in upload request.'}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'No selected file.'}), 400

    if not allowed_file(file.filename, Config.ALLOWED_EXTENSIONS):
        return jsonify({
            'error': f"File type not supported. Supported extensions: {', '.join(Config.ALLOWED_EXTENSIONS)}"
        }), 400

    success, result_text = extract_text_from_file(file)
    if not success:
        return jsonify({'error': result_text}), 400

    return jsonify({
        'filename': file.filename,
        'extracted_text': result_text,
        'word_count': len(result_text.split()),
        'character_count': len(result_text)
    }), 200
