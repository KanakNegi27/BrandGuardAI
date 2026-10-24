import time
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import desc
from app.utils.db import get_session
from app.models.models import (
    BrandGuideline, GuidelineVersion, VerifiedFact, RestrictedClaim, BrandAsset
)
from app.utils.security import get_current_user, role_required
from app.services.audit_service import record_audit_event

logger = logging.getLogger(__name__)
guidelines_bp = Blueprint('guidelines', __name__, url_prefix='/api/guidelines')

@guidelines_bp.route('', methods=['GET'])
@jwt_required()
def list_guidelines():
    session = get_session()
    try:
        workspace_id = 1
        category = request.args.get('category', '').strip()
        status = request.args.get('status', '').strip()
        search = request.args.get('search', '').strip().lower()

        query = session.query(BrandGuideline).filter_by(workspace_id=workspace_id)

        if category:
            query = query.filter(BrandGuideline.category == category)
        if status:
            query = query.filter(BrandGuideline.status == status)
        if search:
            query = query.filter(
                (BrandGuideline.title.ilike(f"%{search}%")) |
                (BrandGuideline.content.ilike(f"%{search}%")) |
                (BrandGuideline.guideline_code.ilike(f"%{search}%"))
            )

        guidelines = query.order_by(BrandGuideline.guideline_code.asc()).all()
        return jsonify({'guidelines': [g.to_dict() for g in guidelines]}), 200
    finally:
        session.close()


@guidelines_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['admin'])
def create_guideline():
    user = get_current_user()
    data = request.get_json() or {}

    title = data.get('title', '').strip()
    category = data.get('category', 'tone_voice')
    content = data.get('content', '').strip()
    guideline_code = data.get('guideline_code', '').strip().upper()

    if not title or not content:
        return jsonify({'error': 'Title and content are required.'}), 400

    if not guideline_code:
        # Generate default code
        prefix_map = {
            'tone_voice': 'BG-TONE',
            'terminology': 'BG-TERM',
            'required_phrase': 'BG-PHRASE',
            'verified_fact': 'BG-FACT',
            'restricted_claim': 'BG-CLAIM',
            'legal_compliance': 'BG-LEGAL',
            'visual_asset': 'BG-ASSET'
        }
        prefix = prefix_map.get(category, 'BG-RULE')
        guideline_code = f"{prefix}-{int(time.time()) % 10000:04d}"

    session = get_session()
    try:
        guideline = BrandGuideline(
            workspace_id=1,
            guideline_code=guideline_code,
            title=title,
            category=category,
            content=content,
            status='active',
            owner_id=user.id,
            version=1
        )
        session.add(guideline)
        session.flush()

        # Create version 1 record
        gv = GuidelineVersion(
            guideline_id=guideline.id,
            version_number=1,
            title=title,
            content=content,
            category=category,
            changed_by_id=user.id,
            change_summary='Initial creation'
        )
        session.add(gv)

        record_audit_event(
            event_type='GUIDELINE_CREATED',
            resource_type='guideline',
            resource_id=str(guideline.id),
            metadata={'code': guideline.guideline_code, 'title': title, 'category': category},
            actor=user,
            session=session
        )

        session.commit()
        return jsonify({'message': 'Brand guideline created.', 'guideline': guideline.to_dict()}), 201

    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@guidelines_bp.route('/<int:gid>', methods=['GET'])
@jwt_required()
def get_guideline(gid: int):
    session = get_session()
    try:
        guideline = session.query(BrandGuideline).filter_by(id=gid).first()
        if not guideline:
            return jsonify({'error': 'Guideline not found'}), 404

        data = guideline.to_dict()
        data['versions'] = [v.to_dict() for v in guideline.versions]
        return jsonify({'guideline': data}), 200
    finally:
        session.close()


@guidelines_bp.route('/<int:gid>', methods=['PUT'])
@jwt_required()
@role_required(['admin'])
def update_guideline(gid: int):
    user = get_current_user()
    data = request.get_json() or {}

    session = get_session()
    try:
        guideline = session.query(BrandGuideline).filter_by(id=gid).first()
        if not guideline:
            return jsonify({'error': 'Guideline not found'}), 404

        title = data.get('title', guideline.title).strip()
        content = data.get('content', guideline.content).strip()
        category = data.get('category', guideline.category)
        change_summary = data.get('change_summary', 'Updated guideline content')

        new_version_num = guideline.version + 1
        guideline.title = title
        guideline.content = content
        guideline.category = category
        guideline.version = new_version_num

        if 'status' in data:
            guideline.status = data['status']

        # Add to guideline versions
        gv = GuidelineVersion(
            guideline_id=guideline.id,
            version_number=new_version_num,
            title=title,
            content=content,
            category=category,
            changed_by_id=user.id,
            change_summary=change_summary
        )
        session.add(gv)

        record_audit_event(
            event_type='GUIDELINE_UPDATED',
            resource_type='guideline',
            resource_id=str(guideline.id),
            metadata={'version': new_version_num, 'change_summary': change_summary},
            actor=user,
            session=session
        )

        session.commit()
        return jsonify({'message': 'Guideline updated.', 'guideline': guideline.to_dict()}), 200

    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@guidelines_bp.route('/<int:gid>', methods=['DELETE'])
@jwt_required()
@role_required(['admin'])
def delete_guideline(gid: int):
    user = get_current_user()
    session = get_session()
    try:
        guideline = session.query(BrandGuideline).filter_by(id=gid).first()
        if not guideline:
            return jsonify({'error': 'Guideline not found'}), 404

        guideline.status = 'archived'
        record_audit_event(
            event_type='GUIDELINE_ARCHIVED',
            resource_type='guideline',
            resource_id=str(guideline.id),
            metadata={'code': guideline.guideline_code},
            actor=user,
            session=session
        )
        session.commit()
        return jsonify({'message': 'Guideline successfully archived.'}), 200
    finally:
        session.close()


# --- Sub-endpoints: Facts, Claims, Assets ---

@guidelines_bp.route('/facts', methods=['GET', 'POST'])
@jwt_required()
def handle_facts():
    session = get_session()
    try:
        if request.method == 'GET':
            facts = session.query(VerifiedFact).filter_by(workspace_id=1, is_active=True).all()
            return jsonify({'facts': [f.to_dict() for f in facts]}), 200

        user = get_current_user()
        if user.role != 'admin':
            return jsonify({'error': 'Admin required'}), 403

        data = request.get_json() or {}
        topic = data.get('topic', '').strip()
        statement = data.get('statement', '').strip()
        verified_source = data.get('verified_source', '').strip()

        if not topic or not statement or not verified_source:
            return jsonify({'error': 'Topic, statement, and verified_source are required.'}), 400

        fact = VerifiedFact(
            workspace_id=1,
            topic=topic,
            statement=statement,
            verified_source=verified_source,
            is_active=True
        )
        session.add(fact)
        session.commit()
        return jsonify({'message': 'Fact created.', 'fact': fact.to_dict()}), 201

    finally:
        session.close()


@guidelines_bp.route('/claims', methods=['GET', 'POST'])
@jwt_required()
def handle_claims():
    session = get_session()
    try:
        if request.method == 'GET':
            claims = session.query(RestrictedClaim).filter_by(workspace_id=1, is_active=True).all()
            return jsonify({'claims': [c.to_dict() for c in claims]}), 200

        user = get_current_user()
        if user.role != 'admin':
            return jsonify({'error': 'Admin required'}), 403

        data = request.get_json() or {}
        claim = RestrictedClaim(
            workspace_id=1,
            claim_type=data.get('claim_type', 'performance'),
            trigger_pattern=data.get('trigger_pattern', '').strip(),
            restriction_reason=data.get('restriction_reason', '').strip(),
            required_substantiation=data.get('required_substantiation', '').strip(),
            mandatory_disclaimer=data.get('mandatory_disclaimer', ''),
            severity=data.get('severity', 'High'),
            is_active=True
        )
        if not claim.trigger_pattern or not claim.restriction_reason:
            return jsonify({'error': 'Trigger pattern and restriction reason required'}), 400

        session.add(claim)
        session.commit()
        return jsonify({'message': 'Restricted claim registered.', 'claim': claim.to_dict()}), 201

    finally:
        session.close()


@guidelines_bp.route('/assets', methods=['GET', 'POST'])
@jwt_required()
def handle_assets():
    session = get_session()
    try:
        if request.method == 'GET':
            assets = session.query(BrandAsset).filter_by(workspace_id=1, is_approved=True).all()
            return jsonify({'assets': [a.to_dict() for a in assets]}), 200

        user = get_current_user()
        if user.role != 'admin':
            return jsonify({'error': 'Admin required'}), 403

        data = request.get_json() or {}
        asset = BrandAsset(
            workspace_id=1,
            name=data.get('name', '').strip(),
            asset_type=data.get('asset_type', 'logo'),
            file_url=data.get('file_url', ''),
            usage_instructions=data.get('usage_instructions', ''),
            is_approved=True
        )
        session.add(asset)
        session.commit()
        return jsonify({'message': 'Asset created.', 'asset': asset.to_dict()}), 201

    finally:
        session.close()
