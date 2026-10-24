from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func, desc
from app.utils.db import get_session
from app.models.models import (
    ContentSubmission, Finding, ReviewDecision, AuditEvent, BrandGuideline
)
from app.utils.security import get_current_user

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    session = get_session()
    try:
        user = get_current_user()
        workspace_id = 1

        # 1. Submission counts by status
        total_submissions = session.query(ContentSubmission).filter_by(workspace_id=workspace_id).count()
        pending_reviews = session.query(ContentSubmission).filter_by(
            workspace_id=workspace_id, current_status='Pending Review'
        ).count()
        approved = session.query(ContentSubmission).filter_by(
            workspace_id=workspace_id, current_status='Approved'
        ).count()
        changes_required = session.query(ContentSubmission).filter_by(
            workspace_id=workspace_id, current_status='Changes Required'
        ).count()
        escalated = session.query(ContentSubmission).filter_by(
            workspace_id=workspace_id, current_status='Escalated'
        ).count()
        drafts = session.query(ContentSubmission).filter_by(
            workspace_id=workspace_id, current_status='Draft'
        ).count()

        # 2. High-risk & Critical open findings
        high_risk_findings = session.query(Finding).filter(
            Finding.status == 'open',
            Finding.severity.in_(['Critical', 'High'])
        ).count()

        critical_findings = session.query(Finding).filter(
            Finding.status == 'open',
            Finding.severity == 'Critical'
        ).count()

        # 3. Issue category distribution
        category_counts_query = session.query(
            Finding.issue_category, func.count(Finding.id)
        ).group_by(Finding.issue_category).all()

        issue_categories = [
            {'category': cat or 'Other', 'count': count}
            for cat, count in category_counts_query
        ]
        issue_categories.sort(key=lambda x: x['count'], reverse=True)

        # 4. Severity breakdown
        severity_counts_query = session.query(
            Finding.severity, func.count(Finding.id)
        ).group_by(Finding.severity).all()

        severity_counts = {sev: count for sev, count in severity_counts_query}

        # 5. Content Approval Trend (Group decisions by day or simulated time series from real data)
        # We can fetch recent submissions grouped by creation date
        recent_subs_for_trend = session.query(
            ContentSubmission.created_at, ContentSubmission.current_status
        ).order_by(ContentSubmission.created_at.asc()).all()

        trend_map = {}
        for sub in recent_subs_for_trend:
            date_key = sub.created_at.strftime('%b %d') if sub.created_at else 'Recent'
            if date_key not in trend_map:
                trend_map[date_key] = {'date': date_key, 'submitted': 0, 'approved': 0, 'changes_required': 0}
            trend_map[date_key]['submitted'] += 1
            if sub.current_status == 'Approved':
                trend_map[date_key]['approved'] += 1
            elif sub.current_status == 'Changes Required':
                trend_map[date_key]['changes_required'] += 1

        trend_data = list(trend_map.values())
        if not trend_data:
            trend_data = [
                {'date': 'Day 1', 'submitted': total_submissions, 'approved': approved, 'changes_required': changes_required}
            ]

        # 6. Recent Submissions Table (Latest 6)
        recent_submissions = session.query(ContentSubmission).filter_by(
            workspace_id=workspace_id
        ).order_by(desc(ContentSubmission.created_at)).limit(6).all()

        # 7. Guidelines count
        guidelines_count = session.query(BrandGuideline).filter_by(
            workspace_id=workspace_id, status='active'
        ).count()

        return jsonify({
            'total_submissions': total_submissions,
            'pending_reviews': pending_reviews,
            'approved_submissions': approved,
            'changes_required_submissions': changes_required,
            'escalated_submissions': escalated,
            'draft_submissions': drafts,
            'high_risk_findings': high_risk_findings,
            'critical_findings': critical_findings,
            'active_guidelines_count': guidelines_count,
            'issue_categories': issue_categories,
            'severity_counts': severity_counts,
            'approval_trend': trend_data,
            'recent_submissions': [s.to_dict() for s in recent_submissions]
        }), 200

    finally:
        session.close()


@dashboard_bp.route('/activity', methods=['GET'])
@jwt_required()
def get_activity():
    session = get_session()
    try:
        events = session.query(AuditEvent).order_by(desc(AuditEvent.created_at)).limit(10).all()
        return jsonify({'activity': [e.to_dict() for e in events]}), 200
    finally:
        session.close()
