import logging
from typing import Dict, Any, Optional, Tuple
from app.models.models import (
    ContentSubmission, ContentVersion, Finding, ReviewDecision, ReviewComment, User
)
from app.services.audit_service import record_audit_event

logger = logging.getLogger(__name__)

VALID_TRANSITIONS = {
    'Draft': {'Analyzing', 'Pending Review'},
    'Analyzing': {'Draft', 'Changes Required', 'Pending Review'},
    'Changes Required': {'Draft', 'Analyzing', 'Pending Review'},
    'Pending Review': {'Approved', 'Changes Required', 'Escalated'},
    'Escalated': {'Approved', 'Changes Required', 'Pending Review'},
    'Approved': {'Draft'} # Only if re-opened for major redesign
}

class SubmissionService:
    @staticmethod
    def create_submission(
        session,
        creator: User,
        title: str,
        content_body: str,
        content_type: str = 'other',
        publishing_channel: str = 'website',
        campaign_name: str = None,
        workspace_id: int = 1
    ) -> ContentSubmission:
        words = len(content_body.split())
        chars = len(content_body)

        # 1. Create submission in Draft state
        submission = ContentSubmission(
            workspace_id=workspace_id,
            creator_id=creator.id,
            title=title.strip(),
            content_type=content_type,
            publishing_channel=publishing_channel,
            campaign_name=campaign_name.strip() if campaign_name else None,
            current_status='Draft'
        )
        session.add(submission)
        session.flush()

        # 2. Create version 1
        v1 = ContentVersion(
            submission_id=submission.id,
            version_number=1,
            content_body=content_body,
            word_count=words,
            character_count=chars,
            created_by_id=creator.id,
            change_notes='Initial version created.'
        )
        session.add(v1)
        session.flush()

        submission.current_version_id = v1.id
        session.flush()

        record_audit_event(
            event_type='SUBMISSION_CREATED',
            resource_type='submission',
            resource_id=str(submission.id),
            metadata={'title': submission.title, 'version': 1, 'channel': publishing_channel},
            actor=creator,
            workspace_id=workspace_id,
            session=session
        )

        return submission

    @staticmethod
    def create_new_version(
        session,
        submission: ContentSubmission,
        creator: User,
        new_content_body: str,
        change_notes: str = None
    ) -> ContentVersion:
        next_ver = len(submission.versions) + 1
        words = len(new_content_body.split())
        chars = len(new_content_body)

        version = ContentVersion(
            submission_id=submission.id,
            version_number=next_ver,
            content_body=new_content_body,
            word_count=words,
            character_count=chars,
            created_by_id=creator.id,
            change_notes=change_notes or f"Revision {next_ver}"
        )
        session.add(version)
        session.flush()

        submission.current_version_id = version.id
        submission.current_status = 'Draft'
        session.flush()

        record_audit_event(
            event_type='CONTENT_REVISED',
            resource_type='submission',
            resource_id=str(submission.id),
            metadata={'version_number': next_ver, 'word_count': words, 'change_notes': change_notes},
            actor=creator,
            workspace_id=submission.workspace_id,
            session=session
        )

        return version

    @staticmethod
    def submit_for_review(
        session,
        submission: ContentSubmission,
        actor: User,
        reviewer_id: int = None
    ) -> Tuple[bool, str]:
        if submission.current_status not in ('Draft', 'Changes Required', 'Analyzing'):
            return False, f"Cannot submit for review from current status '{submission.current_status}'."

        if reviewer_id:
            submission.assigned_reviewer_id = reviewer_id

        submission.current_status = 'Pending Review'
        session.flush()

        record_audit_event(
            event_type='SUBMITTED_FOR_REVIEW',
            resource_type='submission',
            resource_id=str(submission.id),
            metadata={'version_id': submission.current_version_id, 'assigned_reviewer_id': submission.assigned_reviewer_id},
            actor=actor,
            workspace_id=submission.workspace_id,
            session=session
        )

        return True, "Submission moved to review queue."

    @staticmethod
    def approve_submission(
        session,
        submission: ContentSubmission,
        reviewer: User,
        reason: str = None,
        critical_exception_allowed: bool = False,
        critical_exception_rationale: str = None
    ) -> Tuple[bool, str]:
        if reviewer.role not in ('reviewer', 'admin'):
            return False, "Only authorized reviewers or administrators can approve content."

        if submission.current_status not in ('Pending Review', 'Escalated'):
            return False, f"Cannot approve submission in status '{submission.current_status}'. Must be 'Pending Review' or 'Escalated'."

        # Resolve active version
        version_id = submission.current_version_id or (submission.versions[-1].id if submission.versions else None)
        if not version_id:
            return False, "Submission has no version associated to approve."

        # Check for open Critical findings on current version
        open_criticals = session.query(Finding).filter_by(
            version_id=version_id,
            status='open',
            severity='Critical'
        ).count()

        if open_criticals > 0 and not critical_exception_allowed:
            return False, f"Cannot approve: {open_criticals} open Critical finding(s) exist. An explicit, justified exception must be recorded to proceed."

        if open_criticals > 0 and critical_exception_allowed and not (critical_exception_rationale and len(critical_exception_rationale.strip()) > 10):
            return False, "An explicit, detailed rationale is mandatory when recording a Critical compliance exception."

        # Record decision
        decision = ReviewDecision(
            submission_id=submission.id,
            version_id=version_id,
            reviewer_id=reviewer.id,
            decision='approved',
            reason=reason or 'Content meets all approved brand guidelines.',
            critical_exception_allowed=critical_exception_allowed,
            critical_exception_rationale=critical_exception_rationale if critical_exception_allowed else None
        )
        session.add(decision)

        submission.current_status = 'Approved'
        session.flush()

        record_audit_event(
            event_type='REVIEW_APPROVED',
            resource_type='submission',
            resource_id=str(submission.id),
            metadata={
                'version_id': submission.current_version_id,
                'critical_exception': critical_exception_allowed,
                'reason': reason
            },
            actor=reviewer,
            workspace_id=submission.workspace_id,
            session=session
        )

        return True, "Submission successfully approved."

    @staticmethod
    def request_changes(
        session,
        submission: ContentSubmission,
        reviewer: User,
        reason: str
    ) -> Tuple[bool, str]:
        if reviewer.role not in ('reviewer', 'admin'):
            return False, "Only reviewers or administrators can request changes."

        if not reason or len(reason.strip()) < 5:
            return False, "A clear explanation of required changes is mandatory."

        version_id = submission.current_version_id or (submission.versions[-1].id if submission.versions else None)
        if not version_id:
            return False, "Submission has no version associated."

        decision = ReviewDecision(
            submission_id=submission.id,
            version_id=version_id,
            reviewer_id=reviewer.id,
            decision='changes_requested',
            reason=reason.strip()
        )
        session.add(decision)

        # Add comment as well
        comment = ReviewComment(
            submission_id=submission.id,
            version_id=version_id,
            user_id=reviewer.id,
            comment_type='decision_rationale',
            comment_text=f"Changes Requested: {reason.strip()}"
        )
        session.add(comment)

        submission.current_status = 'Changes Required'
        session.flush()

        record_audit_event(
            event_type='REVIEW_CHANGES_REQUESTED',
            resource_type='submission',
            resource_id=str(submission.id),
            metadata={'reason': reason},
            actor=reviewer,
            workspace_id=submission.workspace_id,
            session=session
        )

        return True, "Content returned to creator with change request."

    @staticmethod
    def escalate_submission(
        session,
        submission: ContentSubmission,
        reviewer: User,
        reason: str
    ) -> Tuple[bool, str]:
        if reviewer.role not in ('reviewer', 'admin'):
            return False, "Only reviewers or administrators can escalate issues."

        if not reason or len(reason.strip()) < 5:
            return False, "A descriptive escalation reason is mandatory."

        version_id = submission.current_version_id or (submission.versions[-1].id if submission.versions else None)
        if not version_id:
            return False, "Submission has no version associated."

        decision = ReviewDecision(
            submission_id=submission.id,
            version_id=version_id,
            reviewer_id=reviewer.id,
            decision='escalated',
            reason=reason.strip()
        )
        session.add(decision)

        comment = ReviewComment(
            submission_id=submission.id,
            version_id=version_id,
            user_id=reviewer.id,
            comment_type='escalation_reason',
            comment_text=f"Escalated: {reason.strip()}"
        )
        session.add(comment)

        submission.current_status = 'Escalated'
        session.flush()

        record_audit_event(
            event_type='REVIEW_ESCALATED',
            resource_type='submission',
            resource_id=str(submission.id),
            metadata={'reason': reason},
            actor=reviewer,
            workspace_id=submission.workspace_id,
            session=session
        )

        return True, "Submission escalated to executive and legal review."
