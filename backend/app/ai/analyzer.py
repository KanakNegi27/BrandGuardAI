import time
import logging
from typing import Dict, Any, List, Tuple
from app.utils.db import get_session
from app.models.models import (
    ContentSubmission, ContentVersion, BrandGuideline, 
    TerminologyRule, RestrictedClaim, VerifiedFact, 
    AnalysisRun, Finding
)
from app.rules.evaluator import RuleEvaluator
from app.ai.provider import get_ai_provider, BaseAIProvider
from app.services.audit_service import record_audit_event

logger = logging.getLogger(__name__)

class ContentAnalysisPipeline:
    """
    Executes the hybrid deterministic rule-based and AI-powered 
    brand governance analysis pipeline.
    """

    def __init__(self, session=None, ai_provider: BaseAIProvider = None):
        self.session = session
        self.ai_provider = ai_provider or get_ai_provider()

    def run(self, submission_id: int, version_id: int, user=None) -> Dict[str, Any]:
        start_time = time.time()
        close_session = False
        if self.session is None:
            self.session = get_session()
            close_session = True

        try:
            # 1. Retrieve submission & version
            submission = self.session.query(ContentSubmission).filter_by(id=submission_id).first()
            if not submission:
                raise ValueError(f"Submission #{submission_id} not found.")

            version = self.session.query(ContentVersion).filter_by(id=version_id, submission_id=submission_id).first()
            if not version:
                raise ValueError(f"Version #{version_id} for submission #{submission_id} not found.")

            text = version.content_body or ""
            workspace_id = submission.workspace_id

            # 2. Load active rules, claims, guidelines, and verified facts
            active_rules = self.session.query(TerminologyRule).filter_by(workspace_id=workspace_id, is_active=True).all()
            active_claims = self.session.query(RestrictedClaim).filter_by(workspace_id=workspace_id, is_active=True).all()
            active_guidelines = self.session.query(BrandGuideline).filter_by(workspace_id=workspace_id, status='active').all()
            active_facts = self.session.query(VerifiedFact).filter_by(workspace_id=workspace_id, is_active=True).all()

            # Compile reference dictionary for validation
            valid_reference_ids = {g.id for g in active_guidelines}
            reference_payload = [
                {
                    'id': g.id,
                    'code': g.guideline_code,
                    'title': g.title,
                    'category': g.category,
                    'content': g.content
                }
                for g in active_guidelines
            ]
            for f in active_facts:
                reference_payload.append({
                    'id': f.id + 10000, # offset for distinction
                    'code': f"FACT-{f.id}",
                    'title': f.topic,
                    'category': 'verified_fact',
                    'content': f"{f.statement} (Source: {f.verified_source})"
                })

            # 3. Step 4: Execute Deterministic Rule Checks
            rule_evaluator = RuleEvaluator(rules=active_rules, claims=active_claims)
            rule_findings = rule_evaluator.evaluate(text)

            # 4. Step 5: Execute AI Analysis (if provider is configured)
            ai_findings = []
            ai_available = self.ai_provider.is_configured()
            model_id = self.ai_provider.get_model_identifier()
            engine_type = 'rule'

            if ai_available:
                try:
                    logger.info(f"Running AI analysis using model {model_id}...")
                    ai_response = self.ai_provider.analyze_content(text, reference_payload)
                    raw_findings = ai_response.get('findings', [])
                    ai_findings = self._normalize_ai_findings(raw_findings, text, valid_reference_ids)
                    engine_type = 'hybrid'
                except Exception as e:
                    logger.warning(f"AI analysis failed or timed out: {e}. Falling back gracefully to deterministic rule findings.")
                    ai_available = False
                    engine_type = 'rule'

            # 5. Step 6 & 7: Merge, normalize, and eliminate duplicate findings
            merged_findings = self._merge_findings(rule_findings, ai_findings, text)

            # Calculate counts
            critical_count = sum(1 for f in merged_findings if f['severity'] == 'Critical')
            high_count = sum(1 for f in merged_findings if f['severity'] == 'High')
            medium_count = sum(1 for f in merged_findings if f['severity'] == 'Medium')
            low_count = sum(1 for f in merged_findings if f['severity'] == 'Low')

            execution_ms = int((time.time() - start_time) * 1000)

            # 6. Step 8: Persist Analysis Run
            analysis_run = AnalysisRun(
                submission_id=submission_id,
                version_id=version_id,
                engine_type=engine_type,
                model_identifier=model_id if ai_available else "rule-engine-v1",
                ai_available=ai_available,
                run_status='completed',
                total_findings=len(merged_findings),
                critical_count=critical_count,
                high_count=high_count,
                medium_count=medium_count,
                low_count=low_count,
                execution_time_ms=execution_ms
            )
            self.session.add(analysis_run)
            self.session.flush() # obtain analysis_run.id

            # Remove previous open findings for this version to avoid duplicates on re-analysis
            self.session.query(Finding).filter_by(version_id=version_id, status='open').delete()

            # Insert new findings
            db_findings = []
            for item in merged_findings:
                # Find matching guideline if guideline_id passed or link to first reference
                guideline_id = item.get('guideline_id')
                if not guideline_id and item.get('reference_ids'):
                    for r_id in item['reference_ids']:
                        if r_id in valid_reference_ids:
                            guideline_id = r_id
                            break

                finding = Finding(
                    analysis_run_id=analysis_run.id,
                    submission_id=submission_id,
                    version_id=version_id,
                    issue_category=item['issue_category'],
                    severity=item['severity'],
                    affected_text=item['affected_text'],
                    start_char=item.get('start_char'),
                    end_char=item.get('end_char'),
                    explanation=item['explanation'],
                    guideline_id=guideline_id,
                    rule_id=item.get('rule_id') if item.get('rule_id', 0) > 0 else None,
                    reference_ids=item.get('reference_ids', []),
                    suggested_correction=item.get('suggested_correction'),
                    confidence=item.get('confidence', 1.0),
                    engine_source=item.get('engine_source', 'rule'),
                    status='open'
                )
                self.session.add(finding)
                db_findings.append(finding)

            # Update submission status if needed:
            # If critical/high findings exist and status is Draft or Analyzing, can set to Changes Required or keep Draft
            if submission.current_status == 'Analyzing':
                submission.current_status = 'Changes Required' if critical_count > 0 else 'Draft'

            # 7. Step 10: Record Audit Event
            record_audit_event(
                event_type='ANALYSIS_RUN',
                resource_type='submission',
                resource_id=str(submission_id),
                metadata={
                    'version_id': version_id,
                    'engine_type': engine_type,
                    'total_findings': len(merged_findings),
                    'critical': critical_count,
                    'high': high_count,
                    'ai_available': ai_available,
                    'duration_ms': execution_ms
                },
                actor=user,
                workspace_id=workspace_id,
                session=self.session
            )

            self.session.commit()

            result = {
                'analysis_run': analysis_run.to_dict(),
                'findings': [f.to_dict() for f in db_findings],
                'ai_available': ai_available,
                'engine_type': engine_type,
                'duration_ms': execution_ms
            }

            return result

        except Exception as e:
            logger.error(f"Analysis pipeline error for submission #{submission_id}: {e}")
            if self.session:
                self.session.rollback()
            raise
        finally:
            if close_session and self.session:
                self.session.close()

    def _normalize_ai_findings(
        self, 
        raw_findings: List[Dict[str, Any]], 
        text: str, 
        valid_reference_ids: set
    ) -> List[Dict[str, Any]]:
        normalized = []
        valid_severities = {'Low', 'Medium', 'High', 'Critical'}
        valid_categories = {
            'Brand Voice & Tone', 'Unsupported Claim', 'Prohibited Terminology', 
            'Missing Disclaimer', 'Restricted Claim', 'Product Naming', 'Content Limit'
        }

        for item in raw_findings:
            affected = item.get('affected_text', '').strip()
            if not affected:
                continue

            # Find character offsets in content
            start_pos = text.find(affected)
            end_pos = start_pos + len(affected) if start_pos != -1 else None

            # Validate severity
            sev = item.get('severity', 'Medium').capitalize()
            if sev not in valid_severities:
                sev = 'Medium'

            # Validate category
            cat = item.get('issue_category', 'Brand Voice & Tone')
            if cat not in valid_categories:
                cat = 'Brand Voice & Tone'

            # NEVER accept a model-generated reference ID unless it exists in valid_reference_ids
            model_refs = item.get('reference_ids', [])
            sanitized_refs = [
                r for r in model_refs 
                if isinstance(r, int) and r in valid_reference_ids
            ]

            # Confidence check
            conf = float(item.get('confidence', 0.85))
            conf = max(0.5, min(1.0, conf))

            # Validate explanation
            explanation = item.get('explanation', '')
            if not sanitized_refs and 'claim' in cat.lower():
                if 'unsupported' not in explanation.lower():
                    explanation = f"Unsupported by available references. {explanation}"

            normalized.append({
                'issue_category': cat,
                'severity': sev,
                'affected_text': affected,
                'start_char': start_pos if start_pos != -1 else 0,
                'end_char': end_pos if end_pos is not None else len(affected),
                'explanation': explanation,
                'reference_ids': sanitized_refs,
                'suggested_correction': item.get('suggested_correction'),
                'confidence': round(conf, 2),
                'engine_source': 'ai'
            })

        return normalized

    def _merge_findings(
        self, 
        rule_findings: List[Dict[str, Any]], 
        ai_findings: List[Dict[str, Any]], 
        text: str
    ) -> List[Dict[str, Any]]:
        """
        Combines rule findings and AI findings, prioritizing high-precision rule matches
        and enriching with AI contextual insights when they target the same text.
        """
        merged = list(rule_findings)

        for ai_item in ai_findings:
            ai_text = ai_item['affected_text'].lower()
            ai_start = ai_item['start_char']
            ai_end = ai_item['end_char']

            # Check if this affected range or text is already covered by a rule finding
            match = None
            for r_item in merged:
                r_text = r_item['affected_text'].lower()
                r_start = r_item.get('start_char', -1)
                r_end = r_item.get('end_char', -1)

                if (ai_text in r_text or r_text in ai_text) or (
                    r_start != -1 and ai_start != -1 and abs(r_start - ai_start) < 5
                ):
                    match = r_item
                    break

            if match:
                # Merge: Preserve deterministic rule ID and name, but enrich explanation and reference IDs
                if not match.get('reference_ids') and ai_item.get('reference_ids'):
                    match['reference_ids'] = ai_item['reference_ids']
                if not match.get('suggested_correction') and ai_item.get('suggested_correction'):
                    match['suggested_correction'] = ai_item['suggested_correction']
            else:
                merged.append(ai_item)

        # Sort findings by start character position in text
        merged.sort(key=lambda x: x.get('start_char', 0) if x.get('start_char') is not None else 0)
        return merged
