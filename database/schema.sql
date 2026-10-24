-- BrandGuard AI — AI-Powered Brand Governance Platform
-- Team Slayers
-- MySQL 8.0+ Database Schema

CREATE DATABASE IF NOT EXISTS brandguard_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE brandguard_db;

-- 1. Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_workspace_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'creator', 'reviewer') NOT NULL DEFAULT 'creator',
    department VARCHAR(150),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Workspace Members
CREATE TABLE IF NOT EXISTS workspace_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspace_id INT NOT NULL,
    user_id INT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'creator',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_workspace_user (workspace_id, user_id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Brand Guidelines
CREATE TABLE IF NOT EXISTS brand_guidelines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspace_id INT NOT NULL,
    guideline_code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    category ENUM('tone_voice', 'terminology', 'required_phrase', 'verified_fact', 'restricted_claim', 'legal_compliance', 'visual_asset') NOT NULL,
    content TEXT NOT NULL,
    status ENUM('active', 'archived', 'draft') NOT NULL DEFAULT 'active',
    owner_id INT NULL,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_guideline_category (category),
    INDEX idx_guideline_code (guideline_code),
    INDEX idx_guideline_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Guideline Versions
CREATE TABLE IF NOT EXISTS guideline_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guideline_id INT NOT NULL,
    version_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    changed_by_id INT NULL,
    change_summary VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guideline_id) REFERENCES brand_guidelines(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_gv_guideline (guideline_id, version_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Terminology Rules (Deterministic rule engine)
CREATE TABLE IF NOT EXISTS terminology_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspace_id INT NOT NULL,
    rule_type ENUM('prohibited_term', 'required_term', 'approved_product_name', 'required_disclaimer', 'disallowed_absolute_claim', 'character_limit', 'word_limit') NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    pattern VARCHAR(500) NOT NULL,
    replacement VARCHAR(500),
    explanation TEXT NOT NULL,
    severity ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
    is_regex BOOLEAN NOT NULL DEFAULT FALSE,
    case_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
    exceptions TEXT,
    min_count INT NULL,
    max_count INT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    guideline_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (guideline_id) REFERENCES brand_guidelines(id) ON DELETE SET NULL,
    INDEX idx_rule_type (rule_type),
    INDEX idx_rule_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Verified Facts
CREATE TABLE IF NOT EXISTS verified_facts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspace_id INT NOT NULL,
    topic VARCHAR(255) NOT NULL,
    statement TEXT NOT NULL,
    verified_source VARCHAR(255) NOT NULL,
    effective_date DATETIME NULL,
    expiration_date DATETIME NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    INDEX idx_fact_topic (topic),
    INDEX idx_fact_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Restricted Claims
CREATE TABLE IF NOT EXISTS restricted_claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspace_id INT NOT NULL,
    claim_type VARCHAR(100) NOT NULL,
    trigger_pattern VARCHAR(255) NOT NULL,
    restriction_reason TEXT NOT NULL,
    required_substantiation TEXT NOT NULL,
    mandatory_disclaimer TEXT,
    severity ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'High',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    INDEX idx_claim_type (claim_type),
    INDEX idx_claim_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Brand Assets
CREATE TABLE IF NOT EXISTS brand_assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspace_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(100) NOT NULL,
    file_url TEXT,
    usage_instructions TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    INDEX idx_asset_type (asset_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Content Submissions
CREATE TABLE IF NOT EXISTS content_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspace_id INT NOT NULL,
    creator_id INT NOT NULL,
    assigned_reviewer_id INT NULL,
    title VARCHAR(255) NOT NULL,
    content_type ENUM('advertisement', 'email', 'social_media_post', 'product_description', 'other') NOT NULL DEFAULT 'other',
    publishing_channel VARCHAR(100) NOT NULL,
    campaign_name VARCHAR(255),
    current_status ENUM('Draft', 'Analyzing', 'Changes Required', 'Pending Review', 'Escalated', 'Approved') NOT NULL DEFAULT 'Draft',
    current_version_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_reviewer_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_sub_status (current_status),
    INDEX idx_sub_channel (publishing_channel),
    INDEX idx_sub_creator (creator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Content Versions
CREATE TABLE IF NOT EXISTS content_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    version_number INT NOT NULL,
    content_body MEDIUMTEXT NOT NULL,
    word_count INT NOT NULL DEFAULT 0,
    character_count INT NOT NULL DEFAULT 0,
    created_by_id INT NOT NULL,
    change_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES content_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_sub_version (submission_id, version_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add foreign key constraint for current_version_id on content_submissions
ALTER TABLE content_submissions
    ADD CONSTRAINT fk_sub_current_version
    FOREIGN KEY (current_version_id) REFERENCES content_versions(id) ON DELETE SET NULL;

-- 12. Analysis Runs
CREATE TABLE IF NOT EXISTS analysis_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    version_id INT NOT NULL,
    engine_type ENUM('rule', 'ai', 'hybrid') NOT NULL DEFAULT 'hybrid',
    model_identifier VARCHAR(100),
    ai_available BOOLEAN NOT NULL DEFAULT FALSE,
    run_status ENUM('completed', 'failed') NOT NULL DEFAULT 'completed',
    total_findings INT NOT NULL DEFAULT 0,
    critical_count INT NOT NULL DEFAULT 0,
    high_count INT NOT NULL DEFAULT 0,
    medium_count INT NOT NULL DEFAULT 0,
    low_count INT NOT NULL DEFAULT 0,
    execution_time_ms INT NOT NULL DEFAULT 0,
    raw_response JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES content_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (version_id) REFERENCES content_versions(id) ON DELETE CASCADE,
    INDEX idx_ar_submission (submission_id),
    INDEX idx_ar_version (version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Findings
CREATE TABLE IF NOT EXISTS findings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    analysis_run_id INT NOT NULL,
    submission_id INT NOT NULL,
    version_id INT NOT NULL,
    issue_category VARCHAR(150) NOT NULL,
    severity ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
    affected_text TEXT NOT NULL,
    start_char INT NULL,
    end_char INT NULL,
    explanation TEXT NOT NULL,
    guideline_id INT NULL,
    rule_id INT NULL,
    reference_ids JSON,
    suggested_correction TEXT,
    confidence FLOAT NOT NULL DEFAULT 1.0,
    engine_source ENUM('rule', 'ai') NOT NULL DEFAULT 'rule',
    status ENUM('open', 'accepted', 'edited', 'dismissed') NOT NULL DEFAULT 'open',
    dismiss_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (submission_id) REFERENCES content_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (version_id) REFERENCES content_versions(id) ON DELETE CASCADE,
    FOREIGN KEY (guideline_id) REFERENCES brand_guidelines(id) ON DELETE SET NULL,
    FOREIGN KEY (rule_id) REFERENCES terminology_rules(id) ON DELETE SET NULL,
    INDEX idx_finding_severity (severity),
    INDEX idx_finding_status (status),
    INDEX idx_finding_category (issue_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Review Comments
CREATE TABLE IF NOT EXISTS review_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    version_id INT NOT NULL,
    user_id INT NOT NULL,
    comment_type ENUM('general', 'line_note', 'decision_rationale', 'escalation_reason') NOT NULL DEFAULT 'general',
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES content_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (version_id) REFERENCES content_versions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_comment_sub (submission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Review Decisions
CREATE TABLE IF NOT EXISTS review_decisions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    version_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    decision ENUM('approved', 'changes_requested', 'escalated') NOT NULL,
    reason TEXT,
    critical_exception_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    critical_exception_rationale TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES content_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (version_id) REFERENCES content_versions(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_decision_sub (submission_id),
    INDEX idx_decision_type (decision)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Audit Events (Immutable audit log)
CREATE TABLE IF NOT EXISTS audit_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspace_id INT NULL,
    actor_id INT NULL,
    actor_email VARCHAR(255),
    actor_role VARCHAR(50),
    event_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100),
    metadata_json JSON,
    ip_address VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_event_type (event_type),
    INDEX idx_audit_resource (resource_type, resource_id),
    INDEX idx_audit_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
