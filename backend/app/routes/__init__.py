from app.routes.dashboard import dashboard_bp
from app.routes.submissions import submissions_bp
from app.routes.findings import findings_bp
from app.routes.reviews import reviews_bp
from app.routes.guidelines import guidelines_bp
from app.routes.rules import rules_bp
from app.routes.analytics import analytics_bp
from app.routes.audit import audit_bp

__all__ = [
    'dashboard_bp',
    'submissions_bp',
    'findings_bp',
    'reviews_bp',
    'guidelines_bp',
    'rules_bp',
    'analytics_bp',
    'audit_bp'
]
