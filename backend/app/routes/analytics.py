from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from app.utils.db import get_session
from app.models.models import (
    ContentSubmission, Finding, ReviewDecision, BrandGuideline, TerminologyRule
)

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

@analytics_bp.route('/overview', methods=['GET'])
@jwt_required()
def get_overview():
    session = get_session()
    try:
        workspace_id = 1
        days = request.args.get('days', 30, type=int)

        # 1. Submissions by status
        status_counts = session.query(
            ContentSubmission.current_status, func.count(ContentSubmission.id)
        ).filter_by(workspace_id=workspace_id).group_by(ContentSubmission.current_status).all()

        status_breakdown = {status: count for status, count in status_counts}

        # 2. Submissions over time (Grouped by date)
        submissions_time = session.query(
            func.date(ContentSubmission.created_at).label('sub_date'),
            func.count(ContentSubmission.id).label('count')
        ).filter_by(workspace_id=workspace_id).group_by('sub_date').order_by('sub_date').all()

        submissions_chart = [
            {'date': str(row[0]), 'submissions': row[1]}
            for row in submissions_time
        ]

        # 3. Approvals vs Change Requests Trends
        decisions_time = session.query(
            func.date(ReviewDecision.created_at).label('dec_date'),
            ReviewDecision.decision,
            func.count(ReviewDecision.id)
        ).group_by('dec_date', ReviewDecision.decision).order_by('dec_date').all()

        decisions_map = {}
        for row in decisions_time:
            d_str = str(row[0])
            if d_str not in decisions_map:
                decisions_map[d_str] = {'date': d_str, 'approved': 0, 'changes_requested': 0, 'escalated': 0}
            if row[1] == 'approved':
                decisions_map[d_str]['approved'] += row[2]
            elif row[1] == 'changes_requested':
                decisions_map[d_str]['changes_requested'] += row[2]
            elif row[1] == 'escalated':
                decisions_map[d_str]['escalated'] += row[2]

        approval_trend = list(decisions_map.values())

        # 4. Turnaround time (time between submission created_at and decision created_at)
        decisions_with_sub = session.query(ReviewDecision, ContentSubmission).join(
            ContentSubmission, ReviewDecision.submission_id == ContentSubmission.id
        ).all()

        turnaround_hours = []
        for dec, sub in decisions_with_sub:
            if dec.created_at and sub.created_at and dec.created_at >= sub.created_at:
                diff = (dec.created_at - sub.created_at).total_seconds() / 3600.0
                turnaround_hours.append(diff)

        avg_turnaround_hrs = round(sum(turnaround_hours) / len(turnaround_hours), 1) if turnaround_hours else 0.0

        return jsonify({
            'status_breakdown': status_breakdown,
            'submissions_chart': submissions_chart,
            'approval_trend': approval_trend,
            'avg_turnaround_hours': avg_turnaround_hrs,
            'total_decisions_recorded': len(decisions_with_sub)
        }), 200

    finally:
        session.close()


@analytics_bp.route('/findings', methods=['GET'])
@jwt_required()
def get_findings_analytics():
    session = get_session()
    try:
        # 1. Findings by Category
        category_counts = session.query(
            Finding.issue_category, func.count(Finding.id)
        ).group_by(Finding.issue_category).order_by(desc(func.count(Finding.id))).all()

        findings_by_category = [
            {'category': row[0] or 'Other', 'count': row[1]}
            for row in category_counts
        ]

        # 2. Findings by Severity
        severity_counts = session.query(
            Finding.severity, func.count(Finding.id)
        ).group_by(Finding.severity).all()

        findings_by_severity = [
            {'severity': row[0], 'count': row[1]}
            for row in severity_counts
        ]

        # 3. Frequently Violated Guidelines
        violated_guidelines = session.query(
            BrandGuideline.guideline_code,
            BrandGuideline.title,
            func.count(Finding.id).label('violations')
        ).join(Finding, Finding.guideline_id == BrandGuideline.id).group_by(
            BrandGuideline.guideline_code, BrandGuideline.title
        ).order_by(desc('violations')).limit(6).all()

        top_violated = [
            {'code': row[0], 'title': row[1], 'count': row[2]}
            for row in violated_guidelines
        ]

        # 4. Repeat Issues by Content Type
        type_issues = session.query(
            ContentSubmission.content_type,
            func.count(Finding.id)
        ).join(Finding, Finding.submission_id == ContentSubmission.id).group_by(
            ContentSubmission.content_type
        ).all()

        issues_by_content_type = [
            {'content_type': row[0] or 'other', 'count': row[1]}
            for row in type_issues
        ]

        return jsonify({
            'findings_by_category': findings_by_category,
            'findings_by_severity': findings_by_severity,
            'top_violated_guidelines': top_violated,
            'issues_by_content_type': issues_by_content_type
        }), 200

    finally:
        session.close()
