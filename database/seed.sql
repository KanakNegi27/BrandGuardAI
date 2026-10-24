-- BrandGuard AI — Seed Data for MySQL 8.0+
-- Demo Organization: Team Slayers / ApexPulse Health
USE brandguard_db;

-- Clear previous test data in proper order
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE audit_events;
TRUNCATE TABLE review_decisions;
TRUNCATE TABLE review_comments;
TRUNCATE TABLE findings;
TRUNCATE TABLE analysis_runs;
TRUNCATE TABLE content_versions;
TRUNCATE TABLE content_submissions;
TRUNCATE TABLE brand_assets;
TRUNCATE TABLE restricted_claims;
TRUNCATE TABLE verified_facts;
TRUNCATE TABLE terminology_rules;
TRUNCATE TABLE guideline_versions;
TRUNCATE TABLE brand_guidelines;
TRUNCATE TABLE workspace_members;
TRUNCATE TABLE users;
TRUNCATE TABLE workspaces;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Default Workspace
INSERT INTO workspaces (id, name, slug, description, settings) VALUES
(1, 'ApexPulse Global', 'apexpulse-global', 'Primary brand workspace for ApexPulse Health & Clinical Technologies.', 
 JSON_OBJECT('strict_mode', true, 'require_disclaimers', true, 'auto_flag_absolute_claims', true));

-- 2. Demo Users (Passwords hashed with bcrypt: 'Admin@123', 'Creator@123', 'Reviewer@123')
-- Bcrypt hash for Admin@123: $2b$12$K19YF4O5p8nB0Z3M4xJXe.jJ0f61dJ9q98xS7xV2y5X9k0g2v7Oqm (or standard hashed format)
-- In our Python init_db script, we generate standard bcrypt hashes dynamically.
-- Here we provide reference rows:
INSERT INTO users (id, email, password_hash, name, role, department, is_active) VALUES
(1, 'admin@brandguard.ai', '$2b$12$L7R0hFjQ8fK0t2sM8lPnXe0oX8k3q6z2V1u9y4w7T5s8r0p3q6z2V', 'Sarah Connor (Admin)', 'admin', 'Brand Governance & Legal', 1),
(2, 'creator@brandguard.ai', '$2b$12$L7R0hFjQ8fK0t2sM8lPnXe0oX8k3q6z2V1u9y4w7T5s8r0p3q6z2V', 'Alex Mercer (Creator)', 'creator', 'Product Marketing', 1),
(3, 'reviewer@brandguard.ai', '$2b$12$L7R0hFjQ8fK0t2sM8lPnXe0oX8k3q6z2V1u9y4w7T5s8r0p3q6z2V', 'Dr. Evelyn Vance (Reviewer)', 'reviewer', 'Medical & Compliance Review', 1);

-- 3. Workspace Members
INSERT INTO workspace_members (workspace_id, user_id, role) VALUES
(1, 1, 'admin'),
(1, 2, 'creator'),
(1, 3, 'reviewer');

-- 4. Brand Guidelines
INSERT INTO brand_guidelines (id, workspace_id, guideline_code, title, category, content, status, owner_id, version) VALUES
(1, 1, 'BG-TONE-01', 'Empathetic & Evidence-Based Voice', 'tone_voice', 
 'All content must project empathy, clinical rigor, and transparency. Never employ fear-mongering, miracle exaggerations, or ungrounded urgency. Frame all product benefits around user agency and verifiable clinical evidence.', 'active', 1, 1),
(2, 1, 'BG-TERM-01', 'Approved Clinical AI Terminology', 'terminology', 
 'Refer to our software suite as "AI-Assisted Clinical Support" or "AI-Assisted Diagnostics". Never use autonomous diagnostic terms such as "Automated Physician", "Doctor Replacement", or "Self-Healing AI".', 'active', 1, 1),
(3, 1, 'BG-CLAIM-01', 'Prohibition of Unsubstantiated Guarantees', 'restricted_claim', 
 'Absolute claims such as "guarantees 100% results", "completely cure", or "zero risk" are strictly prohibited by FDA guidelines and company compliance standards. Frame outcomes around empirical test ranges.', 'active', 1, 1),
(4, 1, 'BG-DISC-01', 'Mandatory Medical Advice Disclaimer', 'legal_compliance', 
 'Any public-facing communication discussing symptoms, treatment protocols, or health diagnostics must explicitly include the disclaimer: "Consult your healthcare provider before beginning any new treatment protocol."', 'active', 1, 1),
(5, 1, 'BG-FACT-01', 'Verified Clinical Study Citations', 'verified_fact', 
 'ApexPulse Pro has been proven to reduce diagnostic triage latency by 42% according to the 2025 Johns Hopkins multicenter study across 14,000 patient records.', 'active', 1, 1),
(6, 1, 'BG-ASSET-01', 'Official Logo and Palette Specifications', 'visual_asset', 
 'Use the Primary Deep Teal (#0F766E) on light backgrounds. Ensure a minimum 4.5:1 contrast ratio for all accessibility compliance tiers.', 'active', 1, 1);

-- 5. Guideline Versions
INSERT INTO guideline_versions (guideline_id, version_number, title, content, category, changed_by_id, change_summary) VALUES
(1, 1, 'Empathetic & Evidence-Based Voice', 'Initial baseline established for FY2026 enterprise launch.', 'tone_voice', 1, 'Initial creation'),
(2, 1, 'Approved Clinical AI Terminology', 'Aligned with FDA guidance for software as medical device (SaMD).', 'terminology', 1, 'Initial creation'),
(3, 1, 'Prohibition of Unsubstantiated Guarantees', 'Compliance rules prohibiting absolute efficacy claims.', 'restricted_claim', 1, 'Initial creation');

-- 6. Terminology Rules (Deterministic Engine)
INSERT INTO terminology_rules (id, workspace_id, rule_type, rule_name, pattern, replacement, explanation, severity, is_regex, case_sensitive, exceptions, min_count, max_count, is_active, guideline_id) VALUES
(1, 1, 'disallowed_absolute_claim', '100% Results Guarantee', 'guarantee(s)?\\s+100%\\s+results?', 'delivers clinically validated outcomes', 'Absolute efficacy guarantees violate FTC advertising and healthcare regulations.', 'Critical', 1, 0, 'quoted customer feedback with explicit disclaimer', NULL, NULL, 1, 3),
(2, 1, 'prohibited_term', 'Automated Physician', 'automated physician', 'AI-assisted clinical workflow', 'ApexPulse does not replace medical doctors. Using "automated physician" misleads patients.', 'Critical', 0, 0, NULL, NULL, NULL, 1, 2),
(3, 1, 'prohibited_term', 'Doctor Replacement', 'doctor replacement', 'clinical decision support tool', 'Company policy explicitly prohibits positioning the product as replacing qualified clinicians.', 'Critical', 0, 0, NULL, NULL, NULL, 1, 2),
(4, 1, 'disallowed_absolute_claim', 'Cure Any Illness', 'cure(s)?\\s+any\\s+(chronic\\s+)?illness', 'helps manage symptoms and support clinical outcomes', 'Claims of curing all or arbitrary diseases are scientifically unfounded and illegal.', 'Critical', 1, 0, NULL, NULL, NULL, 1, 3),
(5, 1, 'prohibited_term', 'Zero Side Effects', 'zero side effects', 'well-tolerated in clinical evaluations', 'No biological intervention or therapeutic protocol has absolute zero risk.', 'High', 0, 0, NULL, NULL, NULL, 1, 3),
(6, 1, 'prohibited_term', 'Miracle Solution', 'miracle (cure|solution|fix)', 'scientifically formulated protocol', 'Superlatives and sensationalist words undermine clinical credibility.', 'Medium', 1, 0, NULL, NULL, NULL, 1, 1),
(7, 1, 'required_term', 'Consult Healthcare Provider Disclaimer', 'Consult your healthcare provider before beginning any new treatment protocol', 'Consult your healthcare provider before beginning any new treatment protocol.', 'Mandatory statutory disclaimer for promotional health content.', 'High', 0, 1, 'internal memo, b2b contract draft', 1, NULL, 1, 4),
(8, 1, 'approved_product_name', 'ApexPulse Pro Correct Spelling', 'Apex Pulse', 'ApexPulse', 'ApexPulse is written as one camel-cased word without a space.', 'Low', 0, 1, NULL, NULL, NULL, 1, 2),
(9, 1, 'prohibited_term', 'Cheapest In The Market', 'cheapest (in the market|solution|option)', 'cost-effective enterprise healthcare solution', 'We position ApexPulse on clinical quality and ROI, not discount pricing.', 'Medium', 1, 0, NULL, NULL, NULL, 1, 1);

-- 7. Verified Facts
INSERT INTO verified_facts (id, workspace_id, topic, statement, verified_source, effective_date, expiration_date, is_active) VALUES
(1, 1, 'Efficacy & Latency', 'ApexPulse Pro reduces diagnostic triage latency by 42% according to the 2025 Johns Hopkins multicenter study across 14,000 patient records.', 'Johns Hopkins Medicine Journal of Digital Health 2025', '2025-01-01 00:00:00', '2027-12-31 23:59:59', 1),
(2, 1, 'Security & Compliance', 'ApexPulse maintains SOC 2 Type II certification, HIPAA compliance, and stores all customer health data using 256-bit AES encryption at rest and in transit.', 'KPMG 2025 Security Audit Report #8472', '2025-06-15 00:00:00', '2027-06-15 00:00:00', 1),
(3, 1, 'Biomarker Tracking', 'ApexPulse Core actively monitors 7 key physiological biomarkers: heart rate variability, SpO2, core temp trends, sleep architecture, respiratory rate, resting HR, and stress response index.', 'Clinical Spec Sheet v4.2', '2025-03-01 00:00:00', '2028-01-01 00:00:00', 1);

-- 8. Restricted Claims
INSERT INTO restricted_claims (id, workspace_id, claim_type, trigger_pattern, restriction_reason, required_substantiation, mandatory_disclaimer, severity, is_active) VALUES
(1, 1, 'performance', 'guarantees 100% results in seven days', 'Absolute time-bound efficacy guarantees violate healthcare regulations and company governance.', 'Double-blind peer-reviewed clinical trial published in recognized medical journal.', 'Individual clinical results vary according to patient physiology.', 'Critical', 1),
(2, 1, 'medical', 'completely cure', 'Therapeutic cures cannot be promised for multi-factorial health conditions.', 'FDA pre-market approval specifying curative indication.', 'ApexPulse is intended to aid clinical decision making, not diagnose or cure without physician guidance.', 'Critical', 1),
(3, 1, 'safety', 'zero side effects', 'Absolute safety claims violate standard pharmaceutical and medical device advertising codes.', 'Safety endpoint analysis from Phase III multi-site trials.', 'Patients should discuss potential risks with their attending physician.', 'High', 1);

-- 9. Brand Assets
INSERT INTO brand_assets (id, workspace_id, name, asset_type, file_url, usage_instructions, is_approved) VALUES
(1, 1, 'ApexPulse Primary Teal Logo', 'logo', 'https://assets.brandguard.ai/logos/apexpulse-teal.svg', 'Use on pure white or slate-50 backgrounds with at least 32px padding on all sides.', 1),
(2, 1, 'HIPAA & SOC2 Verified Trust Badge', 'badge', 'https://assets.brandguard.ai/badges/trust-hipaa-soc2.svg', 'Must appear in footer of all marketing landing pages and PDF brochures.', 1),
(3, 1, 'Standard Medical Advice Disclaimer Block', 'disclaimer_block', 'Text: "Consult your healthcare provider before beginning any new treatment protocol."', 'Mandatory for all B2C marketing assets, newsletters, and social media carousels.', 1);

-- 10. Content Submissions
INSERT INTO content_submissions (id, workspace_id, creator_id, assigned_reviewer_id, title, content_type, publishing_channel, campaign_name, current_status, current_version_id, created_at) VALUES
(1, 1, 2, 3, 'Q4 Social Campaign - Winter Wellness Boost', 'social_media_post', 'instagram', 'Winter Health Sprint 2026', 'Pending Review', NULL, '2026-10-20 14:30:00'),
(2, 1, 2, 3, 'ApexPulse Enterprise Product Launch Announcement', 'advertisement', 'linkedin', 'Enterprise Global Launch', 'Changes Required', NULL, '2026-10-21 09:15:00'),
(3, 1, 2, 3, 'ApexPulse Q3 Patient Outcomes Summary', 'product_description', 'website', 'Clinical Evidence Hub', 'Approved', NULL, '2026-10-22 11:00:00'),
(4, 1, 2, NULL, 'Ethical AI in Modern Triage Workflows', 'email', 'email_campaign', 'Thought Leadership 2026', 'Draft', NULL, '2026-10-24 08:45:00');

-- 11. Content Versions
INSERT INTO content_versions (id, submission_id, version_number, content_body, word_count, character_count, created_by_id, change_notes, created_at) VALUES
(1, 1, 1, 'Tired of slow health improvements? Our product guarantees 100% results in seven days. Apex Pulse monitors key vitals and helps you transform your wellness. Try it now and experience the miracle cure for winter fatigue!', 34, 219, 2, 'Initial draft prepared for social post.', '2026-10-20 14:32:00'),
(2, 2, 1, 'Introducing ApexPulse: the automated physician that completely cures fatigue with zero side effects. It is the cheapest in the market for hospitals looking to modernize care.', 27, 182, 2, 'Initial copy for LinkedIn sponsored ad.', '2026-10-21 09:18:00'),
(3, 3, 1, 'ApexPulse Pro reduces diagnostic triage latency by 42% according to the 2025 Johns Hopkins multicenter study across 14,000 patient records. Developed with clinical rigor, our platform supports physician decision-making while maintaining full HIPAA compliance and 256-bit encryption. Consult your healthcare provider before beginning any new treatment protocol.', 50, 368, 2, 'Revised with clinical citations and mandatory disclaimer.', '2026-10-22 11:05:00'),
(4, 4, 1, 'As healthcare organizations adopt AI-assisted diagnostics, establishing trustworthy guardrails is paramount. ApexPulse provides deterministic compliance checks alongside deep contextual evaluation, safeguarding both patient trust and institutional brand equity.', 30, 252, 2, 'Working draft for upcoming email blast.', '2026-10-24 08:47:00');

-- Update submission foreign keys to link to current versions
UPDATE content_submissions SET current_version_id = 1 WHERE id = 1;
UPDATE content_submissions SET current_version_id = 2 WHERE id = 2;
UPDATE content_submissions SET current_version_id = 3 WHERE id = 3;
UPDATE content_submissions SET current_version_id = 4 WHERE id = 4;

-- 12. Analysis Runs
INSERT INTO analysis_runs (id, submission_id, version_id, engine_type, model_identifier, ai_available, run_status, total_findings, critical_count, high_count, medium_count, low_count, execution_time_ms, created_at) VALUES
(1, 1, 1, 'hybrid', 'gemini-1.5-flash', 1, 'completed', 4, 1, 1, 1, 1, 412, '2026-10-20 14:33:00'),
(2, 2, 1, 'hybrid', 'gemini-1.5-flash', 1, 'completed', 4, 2, 1, 1, 0, 385, '2026-10-21 09:20:00'),
(3, 3, 1, 'rule', 'rule-engine-v1', 0, 'completed', 0, 0, 0, 0, 0, 48, '2026-10-22 11:06:00');

-- 13. Findings
-- Submission 1 findings
INSERT INTO findings (id, analysis_run_id, submission_id, version_id, issue_category, severity, affected_text, start_char, end_char, explanation, guideline_id, rule_id, reference_ids, suggested_correction, confidence, engine_source, status) VALUES
(1, 1, 1, 1, 'Restricted Claim', 'Critical', 'guarantees 100% results in seven days', 35, 72, 'Unsupported by available references. Absolute efficacy claims violate FDA advertising regulations and brand policy BG-CLAIM-01.', 3, 1, JSON_ARRAY(3), 'delivers clinically validated outcomes based on individual adherence', 0.98, 'rule', 'open'),
(2, 1, 1, 1, 'Missing Disclaimer', 'High', 'Try it now and experience the miracle cure for winter fatigue!', 158, 218, 'Marketing content discussing health symptoms must include the mandatory medical advice disclaimer (BG-DISC-01).', 4, 7, JSON_ARRAY(4), 'Try it now to support your wellness journey. Consult your healthcare provider before beginning any new treatment protocol.', 0.95, 'rule', 'open'),
(3, 1, 1, 1, 'Brand Voice & Tone', 'Medium', 'miracle cure', 184, 196, 'Sensationalist phrasing undermines clinical credibility and breaches guideline BG-TONE-01.', 1, 6, JSON_ARRAY(1), 'scientifically formulated wellness support', 0.92, 'rule', 'open'),
(4, 1, 1, 1, 'Product Naming', 'Low', 'Apex Pulse', 74, 84, 'Brand name must be written as one unified camel-cased word: "ApexPulse".', 2, 8, JSON_ARRAY(2), 'ApexPulse', 1.0, 'rule', 'open');

-- Submission 2 findings
INSERT INTO findings (id, analysis_run_id, submission_id, version_id, issue_category, severity, affected_text, start_char, end_char, explanation, guideline_id, rule_id, reference_ids, suggested_correction, confidence, engine_source, status) VALUES
(5, 2, 2, 1, 'Prohibited Terminology', 'Critical', 'automated physician', 26, 45, 'ApexPulse is clinical support software, not an autonomous replacement for licensed doctors (BG-TERM-01).', 2, 2, JSON_ARRAY(2), 'AI-assisted clinical support platform', 1.0, 'rule', 'open'),
(6, 2, 2, 1, 'Restricted Claim', 'Critical', 'completely cures fatigue', 51, 75, 'Unsupported by available references. Cures cannot be guaranteed for multi-factorial health conditions.', 3, 4, JSON_ARRAY(3), 'assists clinicians in evaluating fatigue biomarkers', 0.96, 'ai', 'open'),
(7, 2, 2, 1, 'Restricted Claim', 'High', 'zero side effects', 81, 98, 'Absolute safety claims violate company compliance and medical advertising codes.', 3, 5, JSON_ARRAY(3), 'demonstrated high tolerability in clinical evaluations', 0.94, 'rule', 'open'),
(8, 2, 2, 1, 'Brand Voice & Tone', 'Medium', 'cheapest in the market', 110, 132, 'ApexPulse competes on clinical efficacy and security, not discount pricing.', 1, 9, JSON_ARRAY(1), 'cost-effective enterprise solution', 0.90, 'rule', 'open');

-- 14. Review Comments
INSERT INTO review_comments (id, submission_id, version_id, user_id, comment_type, comment_text, created_at) VALUES
(1, 2, 2, 3, 'line_note', 'Calling the platform an "automated physician" exposes the organization to severe regulatory liability. Please rewrite to emphasize physician empowerment.', '2026-10-21 10:15:00'),
(2, 2, 2, 3, 'decision_rationale', 'Content returned for revision due to Critical regulatory violations regarding autonomous medical practice claims.', '2026-10-21 10:16:00'),
(3, 3, 3, 3, 'decision_rationale', 'All statistics verified against the 2025 Johns Hopkins study. Disclaimer is correctly placed. Approved for publication.', '2026-10-22 11:30:00');

-- 15. Review Decisions
INSERT INTO review_decisions (id, submission_id, version_id, reviewer_id, decision, reason, critical_exception_allowed, critical_exception_rationale, created_at) VALUES
(1, 2, 2, 3, 'changes_requested', 'Multiple Critical findings: unauthorized "automated physician" claim and absolute cure promises must be removed before approval can be granted.', 0, NULL, '2026-10-21 10:16:00'),
(2, 3, 3, 3, 'approved', 'Fully compliant with brand voice, terminology, and legal disclaimer requirements. Clinical metrics verified.', 0, NULL, '2026-10-22 11:30:00');

-- 16. Audit Events
INSERT INTO audit_events (workspace_id, actor_id, actor_email, actor_role, event_type, resource_type, resource_id, metadata_json, ip_address, created_at) VALUES
(1, 1, 'admin@brandguard.ai', 'admin', 'WORKSPACE_INITIALIZED', 'workspace', '1', JSON_OBJECT('name', 'ApexPulse Global', 'tier', 'enterprise'), '127.0.0.1', '2026-10-20 09:00:00'),
(1, 1, 'admin@brandguard.ai', 'admin', 'GUIDELINE_CREATED', 'guideline', '1', JSON_OBJECT('code', 'BG-TONE-01', 'title', 'Empathetic & Evidence-Based Voice'), '127.0.0.1', '2026-10-20 09:30:00'),
(1, 2, 'creator@brandguard.ai', 'creator', 'SUBMISSION_CREATED', 'submission', '1', JSON_OBJECT('title', 'Q4 Social Campaign - Winter Wellness Boost', 'channel', 'instagram'), '127.0.0.1', '2026-10-20 14:30:00'),
(1, 2, 'creator@brandguard.ai', 'creator', 'ANALYSIS_RUN', 'analysis_run', '1', JSON_OBJECT('total_findings', 4, 'critical', 1, 'engine', 'hybrid'), '127.0.0.1', '2026-10-20 14:33:00'),
(1, 2, 'creator@brandguard.ai', 'creator', 'SUBMITTED_FOR_REVIEW', 'submission', '1', JSON_OBJECT('version', 1, 'assigned_to', 'reviewer@brandguard.ai'), '127.0.0.1', '2026-10-20 14:35:00'),
(1, 3, 'reviewer@brandguard.ai', 'reviewer', 'REVIEW_CHANGES_REQUESTED', 'submission', '2', JSON_OBJECT('reason', 'Critical regulatory violations in copy'), '127.0.0.1', '2026-10-21 10:16:00'),
(1, 3, 'reviewer@brandguard.ai', 'reviewer', 'REVIEW_APPROVED', 'submission', '3', JSON_OBJECT('version', 1, 'verified_citations', true), '127.0.0.1', '2026-10-22 11:30:00');
