import json
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey, Enum as SQLEnum, JSON
)
from sqlalchemy.orm import relationship
from app.utils.db import Base

class Workspace(Base):
    __tablename__ = 'workspaces'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    settings = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    members = relationship('WorkspaceMember', back_populates='workspace', cascade='all, delete-orphan')
    guidelines = relationship('BrandGuideline', back_populates='workspace', cascade='all, delete-orphan')
    rules = relationship('TerminologyRule', back_populates='workspace', cascade='all, delete-orphan')
    facts = relationship('VerifiedFact', back_populates='workspace', cascade='all, delete-orphan')
    claims = relationship('RestrictedClaim', back_populates='workspace', cascade='all, delete-orphan')
    assets = relationship('BrandAsset', back_populates='workspace', cascade='all, delete-orphan')
    submissions = relationship('ContentSubmission', back_populates='workspace', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'settings': self.settings if isinstance(self.settings, dict) else {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default='creator')  # 'admin', 'creator', 'reviewer'
    department = Column(String(150), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workspace_memberships = relationship('WorkspaceMember', back_populates='user', cascade='all, delete-orphan')
    created_submissions = relationship('ContentSubmission', foreign_keys='ContentSubmission.creator_id', back_populates='creator')
    assigned_submissions = relationship('ContentSubmission', foreign_keys='ContentSubmission.assigned_reviewer_id', back_populates='assigned_reviewer')

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'department': self.department,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class WorkspaceMember(Base):
    __tablename__ = 'workspace_members'

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    role = Column(String(50), nullable=False, default='creator')
    created_at = Column(DateTime, default=datetime.utcnow)

    workspace = relationship('Workspace', back_populates='members')
    user = relationship('User', back_populates='workspace_memberships')


class BrandGuideline(Base):
    __tablename__ = 'brand_guidelines'

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    guideline_code = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)  # 'tone_voice', 'terminology', 'required_phrase', 'verified_fact', 'restricted_claim', 'legal_compliance', 'visual_asset'
    content = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default='active')  # 'active', 'archived', 'draft'
    owner_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workspace = relationship('Workspace', back_populates='guidelines')
    owner = relationship('User', foreign_keys=[owner_id])
    versions = relationship('GuidelineVersion', back_populates='guideline', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'guideline_code': self.guideline_code,
            'title': self.title,
            'category': self.category,
            'content': self.content,
            'status': self.status,
            'owner_id': self.owner_id,
            'owner_name': self.owner.name if self.owner else 'System Admin',
            'version': self.version,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class GuidelineVersion(Base):
    __tablename__ = 'guideline_versions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    guideline_id = Column(Integer, ForeignKey('brand_guidelines.id', ondelete='CASCADE'), nullable=False)
    version_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    changed_by_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    change_summary = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    guideline = relationship('BrandGuideline', back_populates='versions')
    changed_by = relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'guideline_id': self.guideline_id,
            'version_number': self.version_number,
            'title': self.title,
            'content': self.content,
            'category': self.category,
            'changed_by_name': self.changed_by.name if self.changed_by else None,
            'change_summary': self.change_summary,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class TerminologyRule(Base):
    __tablename__ = 'terminology_rules'

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    rule_type = Column(String(100), nullable=False)  # 'prohibited_term', 'required_term', 'approved_product_name', 'required_disclaimer', 'disallowed_absolute_claim', 'character_limit', 'word_limit'
    rule_name = Column(String(255), nullable=False)
    pattern = Column(String(500), nullable=False)
    replacement = Column(String(500), nullable=True)
    explanation = Column(Text, nullable=False)
    severity = Column(String(50), nullable=False, default='Medium')  # 'Low', 'Medium', 'High', 'Critical'
    is_regex = Column(Boolean, nullable=False, default=False)
    case_sensitive = Column(Boolean, nullable=False, default=False)
    exceptions = Column(Text, nullable=True)
    min_count = Column(Integer, nullable=True)
    max_count = Column(Integer, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    guideline_id = Column(Integer, ForeignKey('brand_guidelines.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workspace = relationship('Workspace', back_populates='rules')
    guideline = relationship('BrandGuideline')

    def to_dict(self):
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'rule_type': self.rule_type,
            'rule_name': self.rule_name,
            'pattern': self.pattern,
            'replacement': self.replacement,
            'explanation': self.explanation,
            'severity': self.severity,
            'is_regex': self.is_regex,
            'case_sensitive': self.case_sensitive,
            'exceptions': self.exceptions,
            'min_count': self.min_count,
            'max_count': self.max_count,
            'is_active': self.is_active,
            'guideline_id': self.guideline_id,
            'guideline_code': self.guideline.guideline_code if self.guideline else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class VerifiedFact(Base):
    __tablename__ = 'verified_facts'

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    topic = Column(String(255), nullable=False)
    statement = Column(Text, nullable=False)
    verified_source = Column(String(255), nullable=False)
    effective_date = Column(DateTime, nullable=True)
    expiration_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workspace = relationship('Workspace', back_populates='facts')

    def to_dict(self):
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'topic': self.topic,
            'statement': self.statement,
            'verified_source': self.verified_source,
            'effective_date': self.effective_date.isoformat() if self.effective_date else None,
            'expiration_date': self.expiration_date.isoformat() if self.expiration_date else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class RestrictedClaim(Base):
    __tablename__ = 'restricted_claims'

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    claim_type = Column(String(100), nullable=False)
    trigger_pattern = Column(String(255), nullable=False)
    restriction_reason = Column(Text, nullable=False)
    required_substantiation = Column(Text, nullable=False)
    mandatory_disclaimer = Column(Text, nullable=True)
    severity = Column(String(50), nullable=False, default='High')
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workspace = relationship('Workspace', back_populates='claims')

    def to_dict(self):
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'claim_type': self.claim_type,
            'trigger_pattern': self.trigger_pattern,
            'restriction_reason': self.restriction_reason,
            'required_substantiation': self.required_substantiation,
            'mandatory_disclaimer': self.mandatory_disclaimer,
            'severity': self.severity,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class BrandAsset(Base):
    __tablename__ = 'brand_assets'

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(255), nullable=False)
    asset_type = Column(String(100), nullable=False)
    file_url = Column(Text, nullable=True)
    usage_instructions = Column(Text, nullable=True)
    is_approved = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workspace = relationship('Workspace', back_populates='assets')

    def to_dict(self):
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'name': self.name,
            'asset_type': self.asset_type,
            'file_url': self.file_url,
            'usage_instructions': self.usage_instructions,
            'is_approved': self.is_approved,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class ContentSubmission(Base):
    __tablename__ = 'content_submissions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    creator_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    assigned_reviewer_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    title = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False, default='other')  # 'advertisement', 'email', 'social_media_post', 'product_description', 'other'
    publishing_channel = Column(String(100), nullable=False)
    campaign_name = Column(String(255), nullable=True)
    current_status = Column(String(50), nullable=False, default='Draft')  # 'Draft', 'Analyzing', 'Changes Required', 'Pending Review', 'Escalated', 'Approved'
    current_version_id = Column(Integer, ForeignKey('content_versions.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workspace = relationship('Workspace', back_populates='submissions')
    creator = relationship('User', foreign_keys=[creator_id], back_populates='created_submissions')
    assigned_reviewer = relationship('User', foreign_keys=[assigned_reviewer_id], back_populates='assigned_submissions')
    versions = relationship('ContentVersion', foreign_keys='ContentVersion.submission_id', back_populates='submission', cascade='all, delete-orphan')
    current_version = relationship('ContentVersion', foreign_keys=[current_version_id], post_update=True)
    analysis_runs = relationship('AnalysisRun', back_populates='submission', cascade='all, delete-orphan')
    findings = relationship('Finding', back_populates='submission', cascade='all, delete-orphan')
    comments = relationship('ReviewComment', back_populates='submission', cascade='all, delete-orphan')
    decisions = relationship('ReviewDecision', back_populates='submission', cascade='all, delete-orphan')

    def to_dict(self, include_version=True):
        latest_analysis = self.analysis_runs[-1] if self.analysis_runs else None
        
        # Count open findings
        open_findings = [f for f in self.findings if f.status == 'open']
        critical_count = sum(1 for f in open_findings if f.severity == 'Critical')
        high_count = sum(1 for f in open_findings if f.severity == 'High')
        
        res = {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'creator_id': self.creator_id,
            'creator_name': self.creator.name if self.creator else 'Unknown',
            'creator_email': self.creator.email if self.creator else '',
            'assigned_reviewer_id': self.assigned_reviewer_id,
            'assigned_reviewer_name': self.assigned_reviewer.name if self.assigned_reviewer else None,
            'title': self.title,
            'content_type': self.content_type,
            'publishing_channel': self.publishing_channel,
            'campaign_name': self.campaign_name,
            'current_status': self.current_status,
            'current_version_id': self.current_version_id,
            'version_count': len(self.versions),
            'issue_count': len(open_findings),
            'critical_count': critical_count,
            'high_count': high_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_version and self.current_version:
            res['current_version'] = self.current_version.to_dict()
        elif include_version and self.versions:
            res['current_version'] = self.versions[-1].to_dict()
            
        return res


class ContentVersion(Base):
    __tablename__ = 'content_versions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    submission_id = Column(Integer, ForeignKey('content_submissions.id', ondelete='CASCADE'), nullable=False)
    version_number = Column(Integer, nullable=False)
    content_body = Column(Text, nullable=False)
    word_count = Column(Integer, nullable=False, default=0)
    character_count = Column(Integer, nullable=False, default=0)
    created_by_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    change_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    submission = relationship('ContentSubmission', foreign_keys=[submission_id], back_populates='versions')
    created_by = relationship('User')
    findings = relationship('Finding', back_populates='version', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'submission_id': self.submission_id,
            'version_number': self.version_number,
            'content_body': self.content_body,
            'word_count': self.word_count,
            'character_count': self.character_count,
            'created_by_id': self.created_by_id,
            'created_by_name': self.created_by.name if self.created_by else 'Unknown',
            'change_notes': self.change_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class AnalysisRun(Base):
    __tablename__ = 'analysis_runs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    submission_id = Column(Integer, ForeignKey('content_submissions.id', ondelete='CASCADE'), nullable=False)
    version_id = Column(Integer, ForeignKey('content_versions.id', ondelete='CASCADE'), nullable=False)
    engine_type = Column(String(50), nullable=False, default='hybrid')  # 'rule', 'ai', 'hybrid'
    model_identifier = Column(String(100), nullable=True)
    ai_available = Column(Boolean, nullable=False, default=False)
    run_status = Column(String(50), nullable=False, default='completed')
    total_findings = Column(Integer, nullable=False, default=0)
    critical_count = Column(Integer, nullable=False, default=0)
    high_count = Column(Integer, nullable=False, default=0)
    medium_count = Column(Integer, nullable=False, default=0)
    low_count = Column(Integer, nullable=False, default=0)
    execution_time_ms = Column(Integer, nullable=False, default=0)
    raw_response = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    submission = relationship('ContentSubmission', back_populates='analysis_runs')
    findings = relationship('Finding', back_populates='analysis_run', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'submission_id': self.submission_id,
            'version_id': self.version_id,
            'engine_type': self.engine_type,
            'model_identifier': self.model_identifier,
            'ai_available': self.ai_available,
            'run_status': self.run_status,
            'total_findings': self.total_findings,
            'critical_count': self.critical_count,
            'high_count': self.high_count,
            'medium_count': self.medium_count,
            'low_count': self.low_count,
            'execution_time_ms': self.execution_time_ms,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Finding(Base):
    __tablename__ = 'findings'

    id = Column(Integer, primary_key=True, autoincrement=True)
    analysis_run_id = Column(Integer, ForeignKey('analysis_runs.id', ondelete='CASCADE'), nullable=False)
    submission_id = Column(Integer, ForeignKey('content_submissions.id', ondelete='CASCADE'), nullable=False)
    version_id = Column(Integer, ForeignKey('content_versions.id', ondelete='CASCADE'), nullable=False)
    issue_category = Column(String(150), nullable=False)
    severity = Column(String(50), nullable=False, default='Medium')  # 'Low', 'Medium', 'High', 'Critical'
    affected_text = Column(Text, nullable=False)
    start_char = Column(Integer, nullable=True)
    end_char = Column(Integer, nullable=True)
    explanation = Column(Text, nullable=False)
    guideline_id = Column(Integer, ForeignKey('brand_guidelines.id', ondelete='SET NULL'), nullable=True)
    rule_id = Column(Integer, ForeignKey('terminology_rules.id', ondelete='SET NULL'), nullable=True)
    reference_ids = Column(JSON, nullable=True)
    suggested_correction = Column(Text, nullable=True)
    confidence = Column(Float, nullable=False, default=1.0)
    engine_source = Column(String(50), nullable=False, default='rule')  # 'rule', 'ai'
    status = Column(String(50), nullable=False, default='open')  # 'open', 'accepted', 'edited', 'dismissed'
    dismiss_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    submission = relationship('ContentSubmission', back_populates='findings')
    version = relationship('ContentVersion', back_populates='findings')
    analysis_run = relationship('AnalysisRun', back_populates='findings')
    guideline = relationship('BrandGuideline')
    rule = relationship('TerminologyRule')

    def to_dict(self):
        ref_ids = self.reference_ids if isinstance(self.reference_ids, list) else []
        return {
            'id': self.id,
            'analysis_run_id': self.analysis_run_id,
            'submission_id': self.submission_id,
            'version_id': self.version_id,
            'issue_category': self.issue_category,
            'severity': self.severity,
            'affected_text': self.affected_text,
            'start_char': self.start_char,
            'end_char': self.end_char,
            'explanation': self.explanation,
            'guideline_id': self.guideline_id,
            'guideline_code': self.guideline.guideline_code if self.guideline else None,
            'guideline_title': self.guideline.title if self.guideline else None,
            'rule_id': self.rule_id,
            'rule_name': self.rule.rule_name if self.rule else None,
            'reference_ids': ref_ids,
            'suggested_correction': self.suggested_correction,
            'confidence': round(self.confidence, 2),
            'engine_source': self.engine_source,
            'status': self.status,
            'dismiss_reason': self.dismiss_reason,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ReviewComment(Base):
    __tablename__ = 'review_comments'

    id = Column(Integer, primary_key=True, autoincrement=True)
    submission_id = Column(Integer, ForeignKey('content_submissions.id', ondelete='CASCADE'), nullable=False)
    version_id = Column(Integer, ForeignKey('content_versions.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    comment_type = Column(String(50), nullable=False, default='general')
    comment_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    submission = relationship('ContentSubmission', back_populates='comments')
    version = relationship('ContentVersion')
    user = relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'submission_id': self.submission_id,
            'version_id': self.version_id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else 'User',
            'user_role': self.user.role if self.user else '',
            'comment_type': self.comment_type,
            'comment_text': self.comment_text,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ReviewDecision(Base):
    __tablename__ = 'review_decisions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    submission_id = Column(Integer, ForeignKey('content_submissions.id', ondelete='CASCADE'), nullable=False)
    version_id = Column(Integer, ForeignKey('content_versions.id', ondelete='CASCADE'), nullable=False)
    reviewer_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    decision = Column(String(50), nullable=False)  # 'approved', 'changes_requested', 'escalated'
    reason = Column(Text, nullable=True)
    critical_exception_allowed = Column(Boolean, nullable=False, default=False)
    critical_exception_rationale = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    submission = relationship('ContentSubmission', back_populates='decisions')
    version = relationship('ContentVersion')
    reviewer = relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'submission_id': self.submission_id,
            'version_id': self.version_id,
            'reviewer_id': self.reviewer_id,
            'reviewer_name': self.reviewer.name if self.reviewer else 'Reviewer',
            'decision': self.decision,
            'reason': self.reason,
            'critical_exception_allowed': self.critical_exception_allowed,
            'critical_exception_rationale': self.critical_exception_rationale,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class AuditEvent(Base):
    __tablename__ = 'audit_events'

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey('workspaces.id', ondelete='SET NULL'), nullable=True)
    actor_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    actor_email = Column(String(255), nullable=True)
    actor_role = Column(String(50), nullable=True)
    event_type = Column(String(100), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(100), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    ip_address = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    actor = relationship('User')

    def to_dict(self):
        meta = self.metadata_json if isinstance(self.metadata_json, dict) else {}
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'actor_id': self.actor_id,
            'actor_name': self.actor.name if self.actor else (self.actor_email or 'System'),
            'actor_email': self.actor_email,
            'actor_role': self.actor_role,
            'event_type': self.event_type,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'metadata': meta,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
