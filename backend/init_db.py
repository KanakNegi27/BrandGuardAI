import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.config import Config
from app.utils.db import get_engine, get_session, Base
from app.utils.security import hash_password
from app.models.models import (
    Workspace, User, WorkspaceMember, BrandGuideline, GuidelineVersion,
    TerminologyRule, VerifiedFact, RestrictedClaim, BrandAsset,
    ContentSubmission, ContentVersion, AnalysisRun, Finding,
    ReviewComment, ReviewDecision, AuditEvent
)

def init_database(drop_existing=False):
    print("=" * 60)
    print("Initializing BrandGuard AI Database...")
    print("=" * 60)

    engine = get_engine()
    
    if drop_existing:
        print("Dropping existing tables...")
        Base.metadata.drop_all(bind=engine)

    print("Creating tables according to SQLAlchemy schema...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")

    session = get_session()
    try:
        # Check if already seeded
        existing_user = session.query(User).filter_by(email='admin@brandguard.ai').first()
        if existing_user and not drop_existing:
            print("Database already contains seed data. Skipping seed step.")
            return

        print("Seeding demo data...")

        # 1. Default Workspace
        ws = Workspace(
            id=1,
            name='ApexPulse Global',
            slug='apexpulse-global',
            description='Primary enterprise workspace for ApexPulse Health & Clinical Technologies.',
            settings={'strict_mode': True, 'require_disclaimers': True, 'auto_flag_absolute_claims': True}
        )
        session.add(ws)
        session.flush()

        # 2. Users
        users = [
            User(
                id=1,
                email='admin@brandguard.ai',
                password_hash=hash_password('Admin@123'),
                name='Sarah Connor',
                role='admin',
                department='Brand Governance & Legal',
                is_active=True
            ),
            User(
                id=2,
                email='creator@brandguard.ai',
                password_hash=hash_password('Creator@123'),
                name='Alex Mercer',
                role='creator',
                department='Product Marketing',
                is_active=True
            ),
            User(
                id=3,
                email='reviewer@brandguard.ai',
                password_hash=hash_password('Reviewer@123'),
                name='Dr. Evelyn Vance',
                role='reviewer',
                department='Medical & Compliance Review',
                is_active=True
            )
        ]
        for u in users:
            session.merge(u)
        session.flush()

        # 3. Workspace Memberships
        for u in users:
            wm = WorkspaceMember(workspace_id=1, user_id=u.id, role=u.role)
            session.add(wm)
        session.flush()

        # 4. Brand Guidelines
        guidelines = [
            BrandGuideline(
                id=1,
                workspace_id=1,
                guideline_code='BG-TONE-01',
                title='Empathetic & Evidence-Based Voice',
                category='tone_voice',
                content='All content must project empathy, clinical rigor, and transparency. Never employ fear-mongering, miracle exaggerations, or ungrounded urgency. Frame all product benefits around user agency and verifiable clinical evidence.',
                status='active',
                owner_id=1,
                version=1
            ),
            BrandGuideline(
                id=2,
                workspace_id=1,
                guideline_code='BG-TERM-01',
                title='Approved Clinical AI Terminology',
                category='terminology',
                content='Refer to our software suite as "AI-Assisted Clinical Support" or "AI-Assisted Diagnostics". Never use autonomous diagnostic terms such as "Automated Physician", "Doctor Replacement", or "Self-Healing AI".',
                status='active',
                owner_id=1,
                version=1
            ),
            BrandGuideline(
                id=3,
                workspace_id=1,
                guideline_code='BG-CLAIM-01',
                title='Prohibition of Unsubstantiated Guarantees',
                category='restricted_claim',
                content='Absolute claims such as "guarantees 100% results", "completely cure", or "zero risk" are strictly prohibited by FDA guidelines and company compliance standards. Frame outcomes around empirical test ranges.',
                status='active',
                owner_id=1,
                version=1
            ),
            BrandGuideline(
                id=4,
                workspace_id=1,
                guideline_code='BG-DISC-01',
                title='Mandatory Medical Advice Disclaimer',
                category='legal_compliance',
                content='Any public-facing communication discussing symptoms, treatment protocols, or health diagnostics must explicitly include the disclaimer: "Consult your healthcare provider before beginning any new treatment protocol."',
                status='active',
                owner_id=1,
                version=1
            ),
            BrandGuideline(
                id=5,
                workspace_id=1,
                guideline_code='BG-FACT-01',
                title='Verified Clinical Study Citations',
                category='verified_fact',
                content='ApexPulse Pro has been proven to reduce diagnostic triage latency by 42% according to the 2025 Johns Hopkins multicenter study across 14,000 patient records.',
                status='active',
                owner_id=1,
                version=1
            ),
            BrandGuideline(
                id=6,
                workspace_id=1,
                guideline_code='BG-ASSET-01',
                title='Official Logo and Palette Specifications',
                category='visual_asset',
                content='Use the Primary Deep Teal (#0F766E) on light backgrounds. Ensure a minimum 4.5:1 contrast ratio for all accessibility compliance tiers.',
                status='active',
                owner_id=1,
                version=1
            )
        ]
        for g in guidelines:
            session.merge(g)
        session.flush()

        # 5. Guideline Versions
        for g in guidelines:
            gv = GuidelineVersion(
                guideline_id=g.id,
                version_number=1,
                title=g.title,
                content=g.content,
                category=g.category,
                changed_by_id=1,
                change_summary='Initial creation'
            )
            session.add(gv)
        session.flush()

        # 6. Terminology Rules (Deterministic Rule Engine)
        rules = [
            TerminologyRule(
                id=1,
                workspace_id=1,
                rule_name='100% Results Guarantee',
                rule_type='disallowed_absolute_claim',
                pattern=r'guarantee(s)?\s+100%\s+results?',
                replacement='delivers clinically validated outcomes based on individual adherence',
                explanation='Absolute efficacy guarantees violate FTC advertising and healthcare regulations.',
                severity='Critical',
                is_regex=True,
                case_sensitive=False,
                exceptions='quoted clinical study with explicit disclaimer',
                is_active=True,
                guideline_id=3
            ),
            TerminologyRule(
                id=2,
                workspace_id=1,
                rule_name='Automated Physician Prohibited',
                rule_type='prohibited_term',
                pattern='automated physician',
                replacement='AI-assisted clinical workflow',
                explanation='ApexPulse does not replace medical doctors. Using "automated physician" misleads patients.',
                severity='Critical',
                is_regex=False,
                case_sensitive=False,
                is_active=True,
                guideline_id=2
            ),
            TerminologyRule(
                id=3,
                workspace_id=1,
                rule_name='Doctor Replacement Prohibited',
                rule_type='prohibited_term',
                pattern='doctor replacement',
                replacement='clinical decision support tool',
                explanation='Company policy explicitly prohibits positioning the product as replacing qualified clinicians.',
                severity='Critical',
                is_regex=False,
                case_sensitive=False,
                is_active=True,
                guideline_id=2
            ),
            TerminologyRule(
                id=4,
                workspace_id=1,
                rule_name='Cure Any Illness Prohibited',
                rule_type='disallowed_absolute_claim',
                pattern=r'cure(s)?\s+any\s+(chronic\s+)?illness',
                replacement='helps manage symptoms and support clinical outcomes',
                explanation='Claims of curing all or arbitrary diseases are scientifically unfounded and illegal.',
                severity='Critical',
                is_regex=True,
                case_sensitive=False,
                is_active=True,
                guideline_id=3
            ),
            TerminologyRule(
                id=5,
                workspace_id=1,
                rule_name='Zero Side Effects Prohibited',
                rule_type='prohibited_term',
                pattern='zero side effects',
                replacement='well-tolerated in clinical evaluations',
                explanation='No biological intervention or therapeutic protocol has absolute zero risk.',
                severity='High',
                is_regex=False,
                case_sensitive=False,
                is_active=True,
                guideline_id=3
            ),
            TerminologyRule(
                id=6,
                workspace_id=1,
                rule_name='Sensationalist Miracle Phrasing',
                rule_type='prohibited_term',
                pattern=r'miracle\s+(cure|solution|fix)',
                replacement='scientifically formulated protocol',
                explanation='Superlatives and sensationalist words undermine clinical credibility.',
                severity='Medium',
                is_regex=True,
                case_sensitive=False,
                is_active=True,
                guideline_id=1
            ),
            TerminologyRule(
                id=7,
                workspace_id=1,
                rule_name='Mandatory Healthcare Provider Disclaimer',
                rule_type='required_disclaimer',
                pattern='Consult your healthcare provider before beginning any new treatment protocol',
                replacement='Consult your healthcare provider before beginning any new treatment protocol.',
                explanation='Mandatory statutory disclaimer for promotional health content.',
                severity='High',
                is_regex=False,
                case_sensitive=False,
                exceptions='internal memo, b2b contract draft',
                is_active=True,
                guideline_id=4
            ),
            TerminologyRule(
                id=8,
                workspace_id=1,
                rule_name='ApexPulse Product Capitalization',
                rule_type='approved_product_name',
                pattern='Apex Pulse',
                replacement='ApexPulse',
                explanation='ApexPulse is written as one unified camel-cased word without spaces.',
                severity='Low',
                is_regex=False,
                case_sensitive=False,
                is_active=True,
                guideline_id=2
            ),
            TerminologyRule(
                id=9,
                workspace_id=1,
                rule_name='Cheapest In Market Prohibited',
                rule_type='prohibited_term',
                pattern=r'cheapest\s+(in the market|solution|option)',
                replacement='cost-effective enterprise healthcare solution',
                explanation='We position ApexPulse on clinical quality and ROI, not discount pricing.',
                severity='Medium',
                is_regex=True,
                case_sensitive=False,
                is_active=True,
                guideline_id=1
            )
        ]
        for r in rules:
            session.merge(r)
        session.flush()

        # 7. Verified Facts
        facts = [
            VerifiedFact(
                id=1,
                workspace_id=1,
                topic='Diagnostic Latency & Accuracy',
                statement='ApexPulse Pro reduces diagnostic triage latency by 42% according to the 2025 Johns Hopkins multicenter study across 14,000 patient records.',
                verified_source='Johns Hopkins Medicine Journal of Digital Health 2025',
                effective_date=datetime(2025, 1, 1),
                expiration_date=datetime(2027, 12, 31),
                is_active=True
            ),
            VerifiedFact(
                id=2,
                workspace_id=1,
                topic='Data Privacy & Security Compliance',
                statement='ApexPulse maintains SOC 2 Type II certification, HIPAA compliance, and stores all customer health data using 256-bit AES encryption at rest and in transit.',
                verified_source='KPMG 2025 Security Audit Report #8472',
                effective_date=datetime(2025, 6, 15),
                expiration_date=datetime(2027, 6, 15),
                is_active=True
            ),
            VerifiedFact(
                id=3,
                workspace_id=1,
                topic='Real-Time Biomarker Sensor Array',
                statement='ApexPulse Core actively monitors 7 key physiological biomarkers: heart rate variability, SpO2, core temp trends, sleep architecture, respiratory rate, resting HR, and stress response index.',
                verified_source='Clinical Spec Sheet v4.2',
                effective_date=datetime(2025, 3, 1),
                expiration_date=datetime(2028, 1, 1),
                is_active=True
            )
        ]
        for f in facts:
            session.merge(f)
        session.flush()

        # 8. Restricted Claims
        claims = [
            RestrictedClaim(
                id=1,
                workspace_id=1,
                claim_type='performance',
                trigger_pattern='guarantees 100% results in seven days',
                restriction_reason='Absolute time-bound efficacy guarantees violate healthcare regulations and company governance.',
                required_substantiation='Double-blind peer-reviewed clinical trial published in recognized medical journal.',
                mandatory_disclaimer='Individual clinical results vary according to patient physiology.',
                severity='Critical',
                is_active=True
            ),
            RestrictedClaim(
                id=2,
                workspace_id=1,
                claim_type='medical',
                trigger_pattern='completely cure',
                restriction_reason='Therapeutic cures cannot be promised for multi-factorial health conditions.',
                required_substantiation='FDA pre-market approval specifying curative indication.',
                mandatory_disclaimer='ApexPulse is intended to aid clinical decision making, not diagnose or cure without physician guidance.',
                severity='Critical',
                is_active=True
            ),
            RestrictedClaim(
                id=3,
                workspace_id=1,
                claim_type='safety',
                trigger_pattern='zero side effects',
                restriction_reason='Absolute safety claims violate standard pharmaceutical and medical device advertising codes.',
                required_substantiation='Safety endpoint analysis from Phase III multi-site trials.',
                mandatory_disclaimer='Patients should discuss potential risks with their attending physician.',
                severity='High',
                is_active=True
            )
        ]
        for c in claims:
            session.merge(c)
        session.flush()

        # 9. Brand Assets
        assets = [
            BrandAsset(
                id=1,
                workspace_id=1,
                name='ApexPulse Primary Teal Logo',
                asset_type='logo',
                file_url='https://assets.brandguard.ai/logos/apexpulse-teal.svg',
                usage_instructions='Use on pure white or slate-50 backgrounds with at least 32px padding on all sides.',
                is_approved=True
            ),
            BrandAsset(
                id=2,
                workspace_id=1,
                name='HIPAA & SOC2 Verified Trust Badge',
                asset_type='badge',
                file_url='https://assets.brandguard.ai/badges/trust-hipaa-soc2.svg',
                usage_instructions='Must appear in footer of all marketing landing pages and PDF brochures.',
                is_approved=True
            ),
            BrandAsset(
                id=3,
                workspace_id=1,
                name='Standard Medical Advice Disclaimer Block',
                asset_type='disclaimer_block',
                file_url='Text: "Consult your healthcare provider before beginning any new treatment protocol."',
                usage_instructions='Mandatory for all B2C marketing assets, newsletters, and social media carousels.',
                is_approved=True
            )
        ]
        for a in assets:
            session.merge(a)
        session.flush()

        # 10. Submissions, Versions, Findings
        now = datetime.utcnow()

        # Submission 1: Pending Review (Contains 100% guarantee test case!)
        sub1 = session.merge(ContentSubmission(
            id=1,
            workspace_id=1,
            creator_id=2,
            assigned_reviewer_id=3,
            title='Q4 Social Campaign - Winter Wellness Boost',
            content_type='social_media_post',
            publishing_channel='instagram',
            campaign_name='Winter Health Sprint 2026',
            current_status='Pending Review',
            created_at=now - timedelta(days=3)
        ))
        session.flush()

        v1_text = 'Tired of slow health improvements? Our product guarantees 100% results in seven days. Apex Pulse monitors key vitals and helps you transform your wellness. Try it now and experience the miracle cure for winter fatigue!'
        v1 = session.merge(ContentVersion(
            id=1,
            submission_id=1,
            version_number=1,
            content_body=v1_text,
            word_count=len(v1_text.split()),
            character_count=len(v1_text),
            created_by_id=2,
            change_notes='Initial draft prepared for social post.',
            created_at=now - timedelta(days=3)
        ))
        session.flush()
        sub1.current_version_id = v1.id
        session.flush()

        ar1 = AnalysisRun(
            id=1,
            submission_id=1,
            version_id=1,
            engine_type='hybrid',
            model_identifier='gemini-1.5-flash',
            ai_available=True,
            run_status='completed',
            total_findings=4,
            critical_count=1,
            high_count=1,
            medium_count=1,
            low_count=1,
            execution_time_ms=384,
            created_at=now - timedelta(days=3)
        )
        session.merge(ar1)
        session.flush()

        findings1 = [
            Finding(
                id=1,
                analysis_run_id=1,
                submission_id=1,
                version_id=1,
                issue_category='Restricted Claim',
                severity='Critical',
                affected_text='guarantees 100% results in seven days',
                start_char=v1_text.find('guarantees 100% results in seven days'),
                end_char=v1_text.find('guarantees 100% results in seven days') + len('guarantees 100% results in seven days'),
                explanation='Unsupported by available references. Absolute efficacy claims violate FDA advertising regulations and brand policy BG-CLAIM-01.',
                guideline_id=3,
                rule_id=1,
                reference_ids=[3],
                suggested_correction='delivers clinically validated outcomes based on individual adherence',
                confidence=0.98,
                engine_source='rule',
                status='open'
            ),
            Finding(
                id=2,
                analysis_run_id=1,
                submission_id=1,
                version_id=1,
                issue_category='Missing Disclaimer',
                severity='High',
                affected_text=v1_text[-60:],
                start_char=len(v1_text) - 60,
                end_char=len(v1_text),
                explanation='Marketing content discussing health symptoms must include the mandatory medical advice disclaimer (BG-DISC-01).',
                guideline_id=4,
                rule_id=7,
                reference_ids=[4],
                suggested_correction='Try it now to support your wellness journey. Consult your healthcare provider before beginning any new treatment protocol.',
                confidence=0.95,
                engine_source='rule',
                status='open'
            ),
            Finding(
                id=3,
                analysis_run_id=1,
                submission_id=1,
                version_id=1,
                issue_category='Brand Voice & Tone',
                severity='Medium',
                affected_text='miracle cure',
                start_char=v1_text.find('miracle cure'),
                end_char=v1_text.find('miracle cure') + len('miracle cure'),
                explanation='Sensationalist phrasing undermines clinical credibility and breaches guideline BG-TONE-01.',
                guideline_id=1,
                rule_id=6,
                reference_ids=[1],
                suggested_correction='scientifically formulated wellness support',
                confidence=0.92,
                engine_source='rule',
                status='open'
            ),
            Finding(
                id=4,
                analysis_run_id=1,
                submission_id=1,
                version_id=1,
                issue_category='Product Naming',
                severity='Low',
                affected_text='Apex Pulse',
                start_char=v1_text.find('Apex Pulse'),
                end_char=v1_text.find('Apex Pulse') + len('Apex Pulse'),
                explanation='Brand name must be written as one unified camel-cased word: "ApexPulse".',
                guideline_id=2,
                rule_id=8,
                reference_ids=[2],
                suggested_correction='ApexPulse',
                confidence=1.0,
                engine_source='rule',
                status='open'
            )
        ]
        for f in findings1:
            session.merge(f)
        session.flush()

        # Submission 2: Changes Required (Returned by reviewer)
        sub2 = session.merge(ContentSubmission(
            id=2,
            workspace_id=1,
            creator_id=2,
            assigned_reviewer_id=3,
            title='ApexPulse Enterprise Product Launch Announcement',
            content_type='advertisement',
            publishing_channel='linkedin',
            campaign_name='Enterprise Global Launch',
            current_status='Changes Required',
            created_at=now - timedelta(days=2)
        ))
        session.flush()

        v2_text = 'Introducing ApexPulse: the automated physician that completely cures fatigue with zero side effects. It is the cheapest in the market for hospitals looking to modernize care.'
        v2 = session.merge(ContentVersion(
            id=2,
            submission_id=2,
            version_number=1,
            content_body=v2_text,
            word_count=len(v2_text.split()),
            character_count=len(v2_text),
            created_by_id=2,
            change_notes='Initial draft for sponsored ad.',
            created_at=now - timedelta(days=2)
        ))
        session.flush()
        sub2.current_version_id = v2.id
        session.flush()

        dec2 = ReviewDecision(
            id=1,
            submission_id=2,
            version_id=2,
            reviewer_id=3,
            decision='changes_requested',
            reason='Multiple Critical compliance findings: unauthorized "automated physician" moniker and absolute cure claims must be revised.',
            created_at=now - timedelta(days=1)
        )
        session.merge(dec2)

        comm2 = ReviewComment(
            id=1,
            submission_id=2,
            version_id=2,
            user_id=3,
            comment_type='decision_rationale',
            comment_text='Calling the platform an "automated physician" exposes the organization to severe regulatory liability. Please rewrite to emphasize clinician empowerment.',
            created_at=now - timedelta(days=1)
        )
        session.merge(comm2)

        # Submission 3: Approved
        sub3 = session.merge(ContentSubmission(
            id=3,
            workspace_id=1,
            creator_id=2,
            assigned_reviewer_id=3,
            title='ApexPulse Q3 Patient Outcomes Summary',
            content_type='product_description',
            publishing_channel='website',
            campaign_name='Clinical Evidence Hub',
            current_status='Approved',
            created_at=now - timedelta(days=1)
        ))
        session.flush()

        v3_text = 'ApexPulse Pro reduces diagnostic triage latency by 42% according to the 2025 Johns Hopkins multicenter study across 14,000 patient records. Developed with clinical rigor, our platform supports physician decision-making while maintaining full HIPAA compliance and 256-bit encryption. Consult your healthcare provider before beginning any new treatment protocol.'
        v3 = session.merge(ContentVersion(
            id=3,
            submission_id=3,
            version_number=1,
            content_body=v3_text,
            word_count=len(v3_text.split()),
            character_count=len(v3_text),
            created_by_id=2,
            change_notes='Revised with clinical citations and mandatory disclaimer.',
            created_at=now - timedelta(days=1)
        ))
        session.flush()
        sub3.current_version_id = v3.id
        session.flush()

        dec3 = ReviewDecision(
            id=2,
            submission_id=3,
            version_id=3,
            reviewer_id=3,
            decision='approved',
            reason='Fully compliant with brand voice, terminology, and legal disclaimer requirements. Clinical metrics verified.',
            created_at=now - timedelta(hours=8)
        )
        session.merge(dec3)

        # Submission 4: Draft
        sub4 = session.merge(ContentSubmission(
            id=4,
            workspace_id=1,
            creator_id=2,
            assigned_reviewer_id=None,
            title='Ethical AI in Modern Triage Workflows',
            content_type='email',
            publishing_channel='email_campaign',
            campaign_name='Thought Leadership 2026',
            current_status='Draft',
            created_at=now - timedelta(hours=4)
        ))
        session.flush()

        v4_text = 'As healthcare organizations adopt AI-assisted diagnostics, establishing trustworthy guardrails is paramount. ApexPulse provides deterministic compliance checks alongside deep contextual evaluation, safeguarding both patient trust and institutional brand equity.'
        v4 = session.merge(ContentVersion(
            id=4,
            submission_id=4,
            version_number=1,
            content_body=v4_text,
            word_count=len(v4_text.split()),
            character_count=len(v4_text),
            created_by_id=2,
            change_notes='Working draft for upcoming email blast.',
            created_at=now - timedelta(hours=4)
        ))
        session.flush()
        sub4.current_version_id = v4.id
        session.flush()

        # 11. Audit Events
        audit_events = [
            AuditEvent(
                workspace_id=1,
                actor_id=1,
                actor_email='admin@brandguard.ai',
                actor_role='admin',
                event_type='WORKSPACE_INITIALIZED',
                resource_type='workspace',
                resource_id='1',
                metadata_json={'name': 'ApexPulse Global', 'tier': 'enterprise'},
                ip_address='127.0.0.1',
                created_at=now - timedelta(days=4)
            ),
            AuditEvent(
                workspace_id=1,
                actor_id=1,
                actor_email='admin@brandguard.ai',
                actor_role='admin',
                event_type='GUIDELINE_CREATED',
                resource_type='guideline',
                resource_id='1',
                metadata_json={'code': 'BG-TONE-01', 'title': 'Empathetic & Evidence-Based Voice'},
                ip_address='127.0.0.1',
                created_at=now - timedelta(days=4)
            ),
            AuditEvent(
                workspace_id=1,
                actor_id=2,
                actor_email='creator@brandguard.ai',
                actor_role='creator',
                event_type='SUBMISSION_CREATED',
                resource_type='submission',
                resource_id='1',
                metadata_json={'title': 'Q4 Social Campaign - Winter Wellness Boost', 'channel': 'instagram'},
                ip_address='127.0.0.1',
                created_at=now - timedelta(days=3)
            ),
            AuditEvent(
                workspace_id=1,
                actor_id=2,
                actor_email='creator@brandguard.ai',
                actor_role='creator',
                event_type='ANALYSIS_RUN',
                resource_type='submission',
                resource_id='1',
                metadata_json={'total_findings': 4, 'critical': 1, 'engine': 'hybrid'},
                ip_address='127.0.0.1',
                created_at=now - timedelta(days=3)
            ),
            AuditEvent(
                workspace_id=1,
                actor_id=2,
                actor_email='creator@brandguard.ai',
                actor_role='creator',
                event_type='SUBMITTED_FOR_REVIEW',
                resource_type='submission',
                resource_id='1',
                metadata_json={'version': 1, 'assigned_to': 'reviewer@brandguard.ai'},
                ip_address='127.0.0.1',
                created_at=now - timedelta(days=3)
            ),
            AuditEvent(
                workspace_id=1,
                actor_id=3,
                actor_email='reviewer@brandguard.ai',
                actor_role='reviewer',
                event_type='REVIEW_CHANGES_REQUESTED',
                resource_type='submission',
                resource_id='2',
                metadata_json={'reason': 'Critical regulatory violations in copy'},
                ip_address='127.0.0.1',
                created_at=now - timedelta(days=1)
            ),
            AuditEvent(
                workspace_id=1,
                actor_id=3,
                actor_email='reviewer@brandguard.ai',
                actor_role='reviewer',
                event_type='REVIEW_APPROVED',
                resource_type='submission',
                resource_id='3',
                metadata_json={'version': 1, 'verified_citations': True},
                ip_address='127.0.0.1',
                created_at=now - timedelta(hours=8)
            )
        ]
        for ae in audit_events:
            session.add(ae)

        session.commit()
        print("Demo database initialization completed successfully!")
        print("=" * 60)
        print("Demo User Credentials:")
        print("  Administrator: admin@brandguard.ai    / Admin@123")
        print("  Creator:       creator@brandguard.ai  / Creator@123")
        print("  Reviewer:      reviewer@brandguard.ai / Reviewer@123")
        print("=" * 60)

    except Exception as e:
        session.rollback()
        print(f"Error during initialization: {e}")
        raise
    finally:
        session.close()

if __name__ == '__main__':
    drop = '--drop' in sys.argv
    init_database(drop_existing=drop)
