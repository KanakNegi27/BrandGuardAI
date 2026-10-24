import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.utils.db import get_session
from app.models.models import TerminologyRule
from app.utils.security import get_current_user, role_required
from app.services.audit_service import record_audit_event

logger = logging.getLogger(__name__)
rules_bp = Blueprint('rules', __name__, url_prefix='/api/rules')

@rules_bp.route('', methods=['GET'])
@jwt_required()
def list_rules():
    session = get_session()
    try:
        workspace_id = 1
        rule_type = request.args.get('rule_type', '').strip()
        search = request.args.get('search', '').strip().lower()

        query = session.query(TerminologyRule).filter_by(workspace_id=workspace_id)
        if rule_type:
            query = query.filter(TerminologyRule.rule_type == rule_type)
        if search:
            query = query.filter(
                (TerminologyRule.rule_name.ilike(f"%{search}%")) |
                (TerminologyRule.pattern.ilike(f"%{search}%"))
            )

        rules = query.order_by(TerminologyRule.id.asc()).all()
        return jsonify({'rules': [r.to_dict() for r in rules]}), 200
    finally:
        session.close()


@rules_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['admin'])
def create_rule():
    user = get_current_user()
    data = request.get_json() or {}

    rule_name = data.get('rule_name', '').strip()
    rule_type = data.get('rule_type', 'prohibited_term')
    pattern = data.get('pattern', '').strip()
    explanation = data.get('explanation', '').strip()

    if not rule_name or not pattern or not explanation:
        return jsonify({'error': 'Rule name, pattern, and explanation are required.'}), 400

    session = get_session()
    try:
        rule = TerminologyRule(
            workspace_id=1,
            rule_name=rule_name,
            rule_type=rule_type,
            pattern=pattern,
            replacement=data.get('replacement', ''),
            explanation=explanation,
            severity=data.get('severity', 'Medium'),
            is_regex=bool(data.get('is_regex', False)),
            case_sensitive=bool(data.get('case_sensitive', False)),
            exceptions=data.get('exceptions', ''),
            min_count=data.get('min_count'),
            max_count=data.get('max_count'),
            is_active=True,
            guideline_id=data.get('guideline_id')
        )
        session.add(rule)
        session.commit()

        record_audit_event(
            event_type='RULE_CREATED',
            resource_type='rule',
            resource_id=str(rule.id),
            metadata={'rule_name': rule_name, 'rule_type': rule_type},
            actor=user
        )

        return jsonify({'message': 'Rule created successfully.', 'rule': rule.to_dict()}), 201

    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@rules_bp.route('/<int:rid>', methods=['PUT'])
@jwt_required()
@role_required(['admin'])
def update_rule(rid: int):
    user = get_current_user()
    data = request.get_json() or {}

    session = get_session()
    try:
        rule = session.query(TerminologyRule).filter_by(id=rid).first()
        if not rule:
            return jsonify({'error': 'Rule not found'}), 404

        if 'rule_name' in data:
            rule.rule_name = data['rule_name'].strip()
        if 'rule_type' in data:
            rule.rule_type = data['rule_type']
        if 'pattern' in data:
            rule.pattern = data['pattern'].strip()
        if 'replacement' in data:
            rule.replacement = data['replacement'].strip()
        if 'explanation' in data:
            rule.explanation = data['explanation'].strip()
        if 'severity' in data:
            rule.severity = data['severity']
        if 'is_regex' in data:
            rule.is_regex = bool(data['is_regex'])
        if 'case_sensitive' in data:
            rule.case_sensitive = bool(data['case_sensitive'])
        if 'exceptions' in data:
            rule.exceptions = data['exceptions']
        if 'is_active' in data:
            rule.is_active = bool(data['is_active'])

        session.commit()

        record_audit_event(
            event_type='RULE_UPDATED',
            resource_type='rule',
            resource_id=str(rule.id),
            metadata={'rule_name': rule.rule_name},
            actor=user
        )

        return jsonify({'message': 'Rule updated.', 'rule': rule.to_dict()}), 200
    finally:
        session.close()


@rules_bp.route('/<int:rid>/toggle', methods=['PATCH'])
@jwt_required()
@role_required(['admin'])
def toggle_rule(rid: int):
    user = get_current_user()
    session = get_session()
    try:
        rule = session.query(TerminologyRule).filter_by(id=rid).first()
        if not rule:
            return jsonify({'error': 'Rule not found'}), 404

        rule.is_active = not rule.is_active
        session.commit()

        record_audit_event(
            event_type='RULE_TOGGLED',
            resource_type='rule',
            resource_id=str(rule.id),
            metadata={'rule_name': rule.rule_name, 'is_active': rule.is_active},
            actor=user
        )

        return jsonify({'message': f"Rule {'enabled' if rule.is_active else 'disabled'}.", 'rule': rule.to_dict()}), 200
    finally:
        session.close()


@rules_bp.route('/<int:rid>', methods=['DELETE'])
@jwt_required()
@role_required(['admin'])
def delete_rule(rid: int):
    user = get_current_user()
    session = get_session()
    try:
        rule = session.query(TerminologyRule).filter_by(id=rid).first()
        if not rule:
            return jsonify({'error': 'Rule not found'}), 404

        session.delete(rule)
        session.commit()

        record_audit_event(
            event_type='RULE_DELETED',
            resource_type='rule',
            resource_id=str(rid),
            metadata={'rule_name': rule.rule_name},
            actor=user
        )

        return jsonify({'message': 'Rule deleted successfully.'}), 200
    finally:
        session.close()
