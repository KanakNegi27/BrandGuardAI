import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from app.config import Config
from app.utils.db import init_engine, get_db_type
from app.ai.provider import get_ai_provider

logger = logging.getLogger(__name__)

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize Engine & Connection
    init_engine()

    # Setup CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": config_class.CORS_ORIGINS or "*",
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Setup JWT
    jwt = JWTManager(app)

    @jwt.unauthorized_loader
    def unauthorized_callback(callback):
        return jsonify({
            'error': 'Unauthorized',
            'message': 'Missing or invalid authentication token.'
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(callback):
        return jsonify({
            'error': 'Invalid Token',
            'message': 'Signature verification failed or token malformed.'
        }), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            'error': 'Token Expired',
            'message': 'Your session token has expired. Please log in again.'
        }), 401

    # Register blueprints
    from app.auth.routes import auth_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.submissions import submissions_bp
    from app.routes.findings import findings_bp
    from app.routes.reviews import reviews_bp
    from app.routes.guidelines import guidelines_bp
    from app.routes.rules import rules_bp
    from app.routes.analytics import analytics_bp
    from app.routes.audit import audit_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(submissions_bp)
    app.register_blueprint(findings_bp)
    app.register_blueprint(reviews_bp)
    app.register_blueprint(guidelines_bp)
    app.register_blueprint(rules_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(audit_bp)

    # Health & Diagnostics endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        ai_provider = get_ai_provider()
        return jsonify({
            'status': 'healthy',
            'service': 'BrandGuard AI API',
            'version': '1.0.0',
            'database': {
                'type': get_db_type(),
                'status': 'connected'
            },
            'ai_engine': {
                'configured': ai_provider.is_configured(),
                'provider': Config.AI_PROVIDER,
                'model': ai_provider.get_model_identifier()
            }
        }), 200

    # Global Error Handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Bad Request', 'message': str(error)}), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not Found', 'message': 'The requested resource does not exist.'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal server error: {error}")
        return jsonify({'error': 'Internal Server Error', 'message': 'An unexpected server error occurred.'}), 500

    return app
