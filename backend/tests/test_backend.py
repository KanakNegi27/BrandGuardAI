import pytest
from tests.conftest import get_auth_token
from app.models.models import ContentSubmission, ContentVersion, Finding, AuditEvent, TerminologyRule
from app.rules.evaluator import RuleEvaluator
from app.ai.analyzer import ContentAnalysisPipeline
from app.ai.provider import FallbackAIProvider

# 1. Authentication & Role-Based Access Tests
def test_login_success(client):
    res = client.post('/api/auth/login', json={'email': 'admin@brandguard.ai', 'password': 'Admin@123'})
    assert res.status_code == 200
    assert 'token' in res.json
    assert res.json['user']['role'] == 'admin'

def test_login_invalid_password(client):
    res = client.post('/api/auth/login', json={'email': 'admin@brandguard.ai', 'password': 'WrongPassword!'})
    assert res.status_code == 401
    assert 'Invalid email or password' in res.json['error']

def test_role_based_access_admin_endpoint(client):
    # Creator tries to create a brand guideline -> should be 403 Forbidden
    creator_token = get_auth_token(client, 'creator@brandguard.ai', 'Creator@123')
    res = client.post('/api/guidelines', 
                      headers={'Authorization': f'Bearer {creator_token}'},
                      json={'title': 'Test Rule', 'content': 'Test Content', 'category': 'tone_voice'})
    assert res.status_code == 403

    # Admin creates guideline -> should succeed (201)
    admin_token = get_auth_token(client, 'admin@brandguard.ai', 'Admin@123')
    res = client.post('/api/guidelines', 
                      headers={'Authorization': f'Bearer {admin_token}'},
                      json={'title': 'Admin Guideline', 'content': 'Valid brand guideline', 'category': 'tone_voice'})
    assert res.status_code == 201

# 2. Deterministic Rule Matching Tests
def test_rule_matching_prohibited_terms(db_session):
    rules = db_session.query(TerminologyRule).filter_by(workspace_id=1, is_active=True).all()
    evaluator = RuleEvaluator(rules=rules)

    # Test phrase: "Our automated physician will assist you."
    findings = evaluator.evaluate("Our automated physician will assist you.")
    prohibited_matches = [f for f in findings if f['rule_name'] == 'Automated Physician Prohibited']
    assert len(prohibited_matches) == 1
    assert prohibited_matches[0]['severity'] == 'Critical'
    assert prohibited_matches[0]['suggested_correction'] == 'AI-assisted clinical workflow'

def test_rule_matching_100_percent_guarantee(db_session):
    rules = db_session.query(TerminologyRule).filter_by(workspace_id=1, is_active=True).all()
    evaluator = RuleEvaluator(rules=rules)

    # Test case from prompt: "Our product guarantees 100% results in seven days."
    test_text = "Our product guarantees 100% results in seven days."
    findings = evaluator.evaluate(test_text)
    
    assert any(f['rule_name'] == '100% Results Guarantee' for f in findings)
    assert any(f['severity'] == 'Critical' for f in findings)

def test_rule_word_boundaries_no_false_positives(db_session):
    rules = db_session.query(TerminologyRule).filter_by(workspace_id=1, is_active=True).all()
    evaluator = RuleEvaluator(rules=rules)

    # Text containing "cure" inside "secure" should NOT trigger "miracle cure" or "cure any illness"
    test_text = "We provide a secure cloud environment."
    findings = evaluator.evaluate(test_text)
    cure_rule_matches = [
        f for f in findings 
        if f.get('rule_name') in ('Cure Any Illness Prohibited', 'Sensationalist Miracle Phrasing')
    ]
    assert len(cure_rule_matches) == 0

# 3. AI Validation & Sanitization Tests
def test_ai_output_sanitizes_invalid_reference_ids():
    pipeline = ContentAnalysisPipeline()
    valid_ids = {1, 2, 3, 4}

    # Simulate raw AI response containing both valid and hallucinated reference IDs
    raw_ai_findings = [
        {
            'issue_category': 'Unsupported Claim',
            'severity': 'Critical',
            'affected_text': 'Guarantees total recovery',
            'explanation': 'Unsubstantiated claim',
            'reference_ids': [1, 99999, "invalid_id", 3],  # 99999 and str should be stripped!
            'suggested_correction': 'Supports recovery',
            'confidence': 0.95
        }
    ]

    normalized = pipeline._normalize_ai_findings(
        raw_ai_findings, 
        text="Guarantees total recovery with our kit.", 
        valid_reference_ids=valid_ids
    )

    assert len(normalized) == 1
    # Only IDs 1 and 3 should remain!
    assert normalized[0]['reference_ids'] == [1, 3]

def test_ai_fallback_when_provider_not_configured():
    fallback = FallbackAIProvider()
    assert not fallback.is_configured()
    res = fallback.analyze_content("Sample text", [])
    assert res['findings'] == []
    assert "not configured" in res['overall_summary'].lower()

# 4. Submission, Version Preservation, and Analysis Tests
def test_submission_creation_and_version_preservation(client, db_session):
    creator_token = get_auth_token(client, 'creator@brandguard.ai', 'Creator@123')

    # 1. Create initial draft
    create_res = client.post('/api/submissions',
                             headers={'Authorization': f'Bearer {creator_token}'},
                             json={
                                 'title': 'Test Campaign 2026',
                                 'content_type': 'social_media_post',
                                 'publishing_channel': 'instagram',
                                 'content_body': 'Initial copy: our system is fast.'
                             })
    assert create_res.status_code == 201
    sub_id = create_res.json['submission']['id']

    # 2. Create version 2
    v2_res = client.post(f'/api/submissions/{sub_id}/versions',
                         headers={'Authorization': f'Bearer {creator_token}'},
                         json={
                             'content_body': 'Revised copy: our system is verified fast.',
                             'change_notes': 'Added verification.'
                         })
    assert v2_res.status_code == 201
    assert v2_res.json['version']['version_number'] == 2

    # 3. Check version history: Version 1 and Version 2 must both exist intact!
    vers_res = client.get(f'/api/submissions/{sub_id}/versions',
                          headers={'Authorization': f'Bearer {creator_token}'})
    assert vers_res.status_code == 200
    versions = vers_res.json['versions']
    assert len(versions) == 2
    assert versions[0]['version_number'] == 1
    assert 'Initial copy' in versions[0]['content_body']
    assert versions[1]['version_number'] == 2
    assert 'Revised copy' in versions[1]['content_body']

# 5. Review Workflow and State Transition Tests
def test_reviewer_workflow_and_approval_barrier(client, db_session):
    creator_token = get_auth_token(client, 'creator@brandguard.ai', 'Creator@123')
    reviewer_token = get_auth_token(client, 'reviewer@brandguard.ai', 'Reviewer@123')

    # Submission 1 has an open Critical finding in seed data
    # Attempting to approve Submission 1 without exception rationale should be rejected (400)
    approve_res = client.post('/api/submissions/1/approve',
                              headers={'Authorization': f'Bearer {reviewer_token}'},
                              json={'reason': 'Premature approval attempt'})
    assert approve_res.status_code == 400
    assert 'Critical finding' in approve_res.json['error']

    # Creator cannot approve submission
    creator_approve_res = client.post('/api/submissions/1/approve',
                                      headers={'Authorization': f'Bearer {creator_token}'},
                                      json={'reason': 'Creator self-approval'})
    assert creator_approve_res.status_code == 403

def test_request_changes_workflow(client, db_session):
    reviewer_token = get_auth_token(client, 'reviewer@brandguard.ai', 'Reviewer@123')

    # Reviewer requests changes on submission 1
    res = client.post('/api/submissions/1/request-changes',
                      headers={'Authorization': f'Bearer {reviewer_token}'},
                      json={'reason': 'Please remove the absolute 100% guarantee.'})
    assert res.status_code == 200
    assert res.json['submission']['current_status'] == 'Changes Required'

# 6. Audit Trail Tests
def test_audit_event_logged(client, db_session):
    admin_token = get_auth_token(client, 'admin@brandguard.ai', 'Admin@123')

    res = client.get('/api/audit-events', headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 200
    events = res.json['events']
    assert len(events) > 0
    # Audit events contain actor, timestamp, and event_type
    first_event = events[0]
    assert 'event_type' in first_event
    assert 'created_at' in first_event
    assert 'resource_type' in first_event
