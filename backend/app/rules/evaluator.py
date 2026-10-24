import re
import logging
from typing import List, Dict, Any
from app.models.models import TerminologyRule, RestrictedClaim, BrandGuideline

logger = logging.getLogger(__name__)

class RuleEvaluationResult:
    def __init__(
        self,
        rule_id: int,
        rule_name: str,
        issue_category: str,
        severity: str,
        affected_text: str,
        explanation: str,
        start_char: int,
        end_char: int,
        suggested_correction: str = None,
        guideline_id: int = None,
        reference_ids: list = None,
        confidence: float = 1.0
    ):
        self.rule_id = rule_id
        self.rule_name = rule_name
        self.issue_category = issue_category
        self.severity = severity
        self.affected_text = affected_text
        self.explanation = explanation
        self.start_char = start_char
        self.end_char = end_char
        self.suggested_correction = suggested_correction
        self.guideline_id = guideline_id
        self.reference_ids = reference_ids or []
        self.confidence = confidence

    def to_dict(self) -> Dict[str, Any]:
        return {
            'rule_id': self.rule_id,
            'rule_name': self.rule_name,
            'issue_category': self.issue_category,
            'severity': self.severity,
            'affected_text': self.affected_text,
            'explanation': self.explanation,
            'start_char': self.start_char,
            'end_char': self.end_char,
            'suggested_correction': self.suggested_correction,
            'guideline_id': self.guideline_id,
            'reference_ids': self.reference_ids,
            'confidence': self.confidence,
            'engine_source': 'rule'
        }


class RuleEvaluator:
    """
    Evaluates text against database-backed terminology rules, 
    restricted claims, and length constraints.
    """

    def __init__(self, rules: List[TerminologyRule], claims: List[RestrictedClaim] = None):
        self.rules = [r for r in rules if r.is_active]
        self.claims = [c for c in (claims or []) if c.is_active]

    def evaluate(self, text: str) -> List[Dict[str, Any]]:
        findings = []
        if not text:
            return findings

        # 1. Evaluate Terminology Rules
        for rule in self.rules:
            # Check exceptions
            exceptions = []
            if rule.exceptions:
                exceptions = [exc.strip().lower() for exc in rule.exceptions.split(',') if exc.strip()]

            # Handle word limit rule
            if rule.rule_type == 'word_limit':
                words = text.split()
                word_count = len(words)
                if rule.max_count and word_count > rule.max_count:
                    findings.append(RuleEvaluationResult(
                        rule_id=rule.id,
                        rule_name=rule.rule_name,
                        issue_category='Content Limit',
                        severity=rule.severity,
                        affected_text=f"Total word count: {word_count}",
                        explanation=f"{rule.explanation} (Max allowed: {rule.max_count}, Current: {word_count})",
                        start_char=0,
                        end_char=min(len(text), 100),
                        suggested_correction=f"Trim content by {word_count - rule.max_count} words to meet platform limit.",
                        guideline_id=rule.guideline_id,
                        reference_ids=[rule.guideline_id] if rule.guideline_id else []
                    ).to_dict())
                continue

            # Handle character limit rule
            if rule.rule_type == 'character_limit':
                char_count = len(text)
                if rule.max_count and char_count > rule.max_count:
                    findings.append(RuleEvaluationResult(
                        rule_id=rule.id,
                        rule_name=rule.rule_name,
                        issue_category='Content Limit',
                        severity=rule.severity,
                        affected_text=f"Character length: {char_count}",
                        explanation=f"{rule.explanation} (Max allowed: {rule.max_count}, Current: {char_count})",
                        start_char=rule.max_count,
                        end_char=char_count,
                        suggested_correction=f"Shorten content by {char_count - rule.max_count} characters.",
                        guideline_id=rule.guideline_id,
                        reference_ids=[rule.guideline_id] if rule.guideline_id else []
                    ).to_dict())
                continue

            # Handle required disclaimer / required terms
            if rule.rule_type in ('required_term', 'required_disclaimer'):
                # Check if exception applies to the whole text
                exception_found = any(exc in text.lower() for exc in exceptions)
                if not exception_found:
                    pattern_to_check = rule.pattern
                    found = False
                    if rule.is_regex:
                        flags = 0 if rule.case_sensitive else re.IGNORECASE
                        found = bool(re.search(pattern_to_check, text, flags))
                    else:
                        if rule.case_sensitive:
                            found = pattern_to_check in text
                        else:
                            found = pattern_to_check.lower() in text.lower()

                    if not found:
                        findings.append(RuleEvaluationResult(
                            rule_id=rule.id,
                            rule_name=rule.rule_name,
                            issue_category='Missing Disclaimer' if rule.rule_type == 'required_disclaimer' else 'Required Terminology',
                            severity=rule.severity,
                            affected_text=text[-60:] if len(text) > 60 else text,
                            explanation=f"{rule.explanation} Missing required text: \"{rule.pattern}\"",
                            start_char=max(0, len(text) - 60),
                            end_char=len(text),
                            suggested_correction=f"{text.rstrip()} {rule.replacement or rule.pattern}",
                            guideline_id=rule.guideline_id,
                            reference_ids=[rule.guideline_id] if rule.guideline_id else []
                        ).to_dict())
                continue

            # Handle matching patterns: prohibited terms, approved product names, absolute claims
            try:
                if rule.is_regex:
                    regex_str = rule.pattern
                else:
                    # Enforce word boundary for exact phrases/words to avoid partial matches
                    escaped = re.escape(rule.pattern)
                    regex_str = rf"\b{escaped}\b"

                flags = 0 if rule.case_sensitive else re.IGNORECASE
                compiled_regex = re.compile(regex_str, flags)

                for match in compiled_regex.finditer(text):
                    match_str = match.group()
                    start_pos = match.start()
                    end_pos = match.end()

                    # Check if matching context matches an exception
                    surrounding_context = text[max(0, start_pos - 40):min(len(text), end_pos + 40)].lower()
                    if any(exc in surrounding_context for exc in exceptions):
                        continue

                    # Determine category
                    cat_map = {
                        'prohibited_term': 'Prohibited Terminology',
                        'approved_product_name': 'Product Naming',
                        'disallowed_absolute_claim': 'Restricted Claim',
                        'required_phrase': 'Required Phrase'
                    }
                    category = cat_map.get(rule.rule_type, 'Brand Voice & Tone')

                    # Compute suggested replacement
                    suggestion = rule.replacement
                    if suggestion and not rule.is_regex:
                        # Match capitalization if appropriate
                        if match_str.istitle():
                            suggestion = suggestion.title()
                        elif match_str.isupper() and len(match_str) <= 5:
                            suggestion = suggestion.upper()

                    findings.append(RuleEvaluationResult(
                        rule_id=rule.id,
                        rule_name=rule.rule_name,
                        issue_category=category,
                        severity=rule.severity,
                        affected_text=match_str,
                        explanation=rule.explanation,
                        start_char=start_pos,
                        end_char=end_pos,
                        suggested_correction=suggestion,
                        guideline_id=rule.guideline_id,
                        reference_ids=[rule.guideline_id] if rule.guideline_id else []
                    ).to_dict())

            except re.error as err:
                logger.error(f"Invalid regex in rule #{rule.id} ({rule.pattern}): {err}")
                continue

        # 2. Evaluate Restricted Claims
        for claim in self.claims:
            pattern = claim.trigger_pattern
            try:
                # Case insensitive search with word boundary
                escaped = re.escape(pattern)
                regex = re.compile(rf"\b{escaped}\b", re.IGNORECASE)
                for match in regex.finditer(text):
                    # Check if text already has duplicate finding at this position
                    already_flagged = any(
                        f['start_char'] == match.start() and f['end_char'] == match.end()
                        for f in findings
                    )
                    if already_flagged:
                        continue

                    findings.append(RuleEvaluationResult(
                        rule_id=0,
                        rule_name=f"Restricted Claim: {claim.claim_type.title()}",
                        issue_category='Restricted Claim',
                        severity=claim.severity,
                        affected_text=match.group(),
                        explanation=f"Unsupported by available references. {claim.restriction_reason}. Requires: {claim.required_substantiation}.",
                        start_char=match.start(),
                        end_char=match.end(),
                        suggested_correction=claim.mandatory_disclaimer or "Reword with clinically verified ranges without absolute promises.",
                        guideline_id=None,
                        reference_ids=[]
                    ).to_dict())
            except Exception as e:
                logger.error(f"Error checking restricted claim {claim.id}: {e}")

        return findings
