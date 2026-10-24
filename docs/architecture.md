# BrandGuard AI — Architecture & Technical Specification
**Team Slayers**

## System Architecture Overview

BrandGuard AI is an enterprise brand governance and regulatory compliance platform. It bridges marketing content creators, brand stewards, legal teams, and executive reviewers with a human-in-the-loop workflow backed by a hybrid deterministic and LLM-powered review engine.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (React + Vite)                    │
│   Tailwind CSS • Recharts • Lucide React • React Router • Axios │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP / REST API (JWT Authenticated)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Flask REST API)                     │
│    Blueprints • Services Layer • Security & Role Decorators     │
├──────────────────────────────┬──────────────────────────────────┤
│   Deterministic Rule Engine  │       AI Analysis Pipeline       │
│  - Exact Word Boundaries     │  - Gemini / OpenAI Providers     │
│  - Compiled Regex Patterns   │  - Structured JSON Output Schema │
│  - Configurable Exceptions   │  - Reference Grounding Filter    │
│  - Word & Character Limits   │  - Deduplication & Normalization │
└──────────────┬───────────────┴──────────────────┬───────────────┘
               │                                  │
               ▼                                  ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│     MySQL 8.0+ Database      │   │  Immutable Audit Log Service │
│ 16 Relational Tables • Seed  │   │  Actor, Timestamp, Metadata  │
│ (Resilient SQLite Fallback)  │   │  Append-Only Traceability    │
└──────────────────────────────┘   └──────────────────────────────┘
```

## Content Analysis Pipeline (10-Step Sequence)

1. **Authentication & Authorization**: Verify active session and user permissions.
2. **Content Ingestion**: Receive submitted text or parse uploaded document (`.txt`, `.docx`, `.pdf`).
3. **Knowledge Base Retrieval**: Load active workspace brand guidelines, verified facts, restricted claims, and terminology rules.
4. **Deterministic Validation**: Execute regex and exact word boundary pattern matches with configurable exception lists and character limit checks.
5. **AI Evaluation (Conditional)**: If an LLM provider is configured (`GEMINI_API_KEY` or `OPENAI_API_KEY`), send sanitized excerpts and approved references to the model requesting structured JSON output.
6. **Reference Sanitization**: Validate all model-generated references against the retrieved database set. Reject any hallucinated IDs.
7. **Finding Normalization & Deduplication**: Compute character offsets (`start_char`, `end_char`), normalize severities (`Critical`, `High`, `Medium`, `Low`), and merge overlapping rule and AI findings.
8. **Persistence**: Store the `AnalysisRun` record and associated `Finding` rows in the database.
9. **Payload Delivery**: Return structured findings, suggestions, and engine metadata to the frontend.
10. **Audit Recording**: Log an immutable `ANALYSIS_RUN` event in the audit trail.
