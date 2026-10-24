# BrandGuard AI — AI-Powered Brand Governance Platform
**Developed for Team Slayers**

BrandGuard AI is a comprehensive enterprise brand governance and regulatory compliance web application. It automates marketing compliance review using a hybrid deterministic rule engine and an LLM-powered evaluation pipeline, while keeping final release authority strictly under authorized human review.

---

## 1. Key Platform Capabilities

- **Central Brand Standards Library**: Manage voice & tone rules, approved/prohibited terminology, mandatory phrases, legal disclaimers, verified facts, restricted claims, and brand assets.
- **Content Review Workspace**: Interactive rich editor supporting pasted copy and direct document uploads (`.txt`, `.docx`, `.pdf`).
- **Interactive Passage Highlighting**: Real-time visual markers across affected passages color-coded by severity (`Critical`, `High`, `Medium`, `Low`). Selecting a finding navigates directly to the affected text.
- **Deterministic Rule-Based Validation**: Evaluates case-insensitive exact word boundaries, compiled regex patterns, configured character/word limits, and configurable exception contexts.
- **Grounded AI Analysis**: Integrates configurable LLM providers (Google Gemini, OpenAI, or local OpenAI-compatible models) generating structured JSON assessments.
- **Strict Anti-Hallucination & Grounding**: Reference citations are strictly validated against active database IDs. Any unsupported claim is classified as *"Unsupported by available references"* without fabricating citations.
- **Correction & Version Management**: Creators can accept, edit, or dismiss findings with logged justifications. Submissions maintain a complete, immutable version history with side-by-side visual diff comparison.
- **Human-in-the-Loop Review Workflow**: Backend-enforced state transitions (`Draft` → `Analyzing` → `Changes Required` → `Pending Review` → `Escalated` → `Approved`). Critical compliance conditions prevent approval unless an explicit, justified exception is recorded.
- **Operational Analytics (Recharts)**: Visualizations for submission volume over time, approval velocity, violation categories, severity distribution, and top violated guidelines.
- **Immutable Audit Trail**: Append-only audit events tracking logins, submissions, analysis runs, revisions, review decisions, comments, and guideline modifications.

---

## 2. Technology Stack

### Frontend
- **Framework**: React 19 with Vite 8
- **Language**: JavaScript (ES Modules)
- **Styling**: Tailwind CSS v4 (with `@tailwindcss/vite`)
- **Routing**: React Router DOM v7
- **Data Visualization**: Recharts v3
- **Icons**: Lucide React
- **HTTP Client**: Axios with automatic JWT request/response interceptors

### Backend
- **Framework**: Python 3.14+ / Flask 3.1
- **API Security**: Flask-JWT-Extended & Flask-CORS
- **ORM / Database Layer**: SQLAlchemy 2.0 with MySQL 8 (`PyMySQL`) and seamless local SQLite resilience fallback
- **Validation**: Regex engine with word boundary enforcement & Pydantic
- **AI Integration**: Google Gemini API & OpenAI-compatible structured JSON schema provider abstraction
- **Testing**: Pytest automated test suite (12 tests, 100% passing)

### Database
- **Primary**: MySQL 8.0+
- **Schema & Seed Files**: `database/schema.sql` and `database/seed.sql`

---

## 3. Seeded Demonstration Accounts

The database comes pre-seeded with three enterprise roles and accounts:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Administrator** | `admin@brandguard.ai` | `Admin@123` | Full access: manage guidelines, rules, verified facts, assets, analytics, audit log. |
| **Creator** | `creator@brandguard.ai` | `Creator@123` | Draft content, run checks, accept suggestions, compare versions, submit for review. |
| **Reviewer** | `reviewer@brandguard.ai` | `Reviewer@123` | Inspect queue, add line notes, approve content, request changes, escalate high-risk items. |

*Quick-fill demo buttons are provided directly on the login screen for rapid hackathon evaluation.*

---

## 4. Project Directory Structure

```
friendly-pasteur/
├── backend/
│   ├── app/
│   │   ├── ai/               # AI provider abstraction & 10-step analysis pipeline
│   │   ├── auth/             # Login, logout, JWT token handling
│   │   ├── models/           # SQLAlchemy models for all 16 tables
│   │   ├── routes/           # Blueprints for dashboard, submissions, reviews, etc.
│   │   ├── rules/            # Deterministic regex and word boundary rule evaluator
│   │   ├── services/         # Submission workflow, document parser, audit service
│   │   ├── utils/            # DB connection resilience, password hashing, roles
│   │   ├── config.py         # App configuration & environment loader
│   │   └── __init__.py       # Flask application factory
│   ├── tests/                # Pytest test suite (12 automated tests)
│   ├── init_db.py            # Database initialization and demo seeding script
│   ├── run.py                # Backend server entrypoint
│   ├── requirements.txt      # Python dependencies
│   ├── .env.example          # Environment variables template
│   └── .env                  # Active local backend configuration
├── frontend/
│   ├── src/
│   │   ├── components/       # Badges, Navbar, Sidebar, Modals, Highlighter, Diff
│   │   ├── context/          # AuthContext with token & role management
│   │   ├── layouts/          # AppLayout
│   │   ├── pages/            # 10 fully integrated SaaS dashboard pages
│   │   ├── services/         # Axios API client
│   │   ├── App.jsx           # Router configuration & protected routes
│   │   └── main.jsx          # React DOM entry
│   ├── package.json          # Node dependencies
│   └── vite.config.js        # Vite + Tailwind v4 + API proxy configuration
├── database/
│   ├── schema.sql            # MySQL 8.0+ DDL schema (16 relational tables)
│   └── seed.sql              # Enterprise demo dataset SQL script
├── docs/
│   ├── architecture.md       # High-level system architecture & pipeline
│   └── api_spec.md           # Complete REST API reference
├── .gitignore
└── README.md
```

---

## 5. Getting Started & Installation

### Step 1: Clone and Configure Environment

```powershell
# Navigate to the project root
cd friendly-pasteur

# Configure Backend Environment
cp backend/.env.example backend/.env
```

### Step 2: MySQL Database Setup

Ensure your local MySQL 8.0+ server is running. Create the database:

```sql
CREATE DATABASE brandguard_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Update `backend/.env` with your database credentials:
```env
DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/brandguard_db
MYSQL_USER=root
MYSQL_PASSWORD=YOUR_PASSWORD
MYSQL_DATABASE=brandguard_db
```

*(Note: If MySQL credentials are not yet configured or the server is unavailable, BrandGuard AI automatically and seamlessly falls back to a local SQLite database `backend/brandguard.db` so the platform works immediately out-of-the-box!)*

### Step 3: Initialize Database & Seed Demo Data

```powershell
cd backend
python init_db.py --drop
```

### Step 4: Run Automated Tests

```powershell
python -m pytest tests/
```
All 12 backend tests will execute and pass:
- Login and role-based access control
- Rule matching (word boundaries, prohibited terms, 100% guarantee)
- AI output validation and reference ID sanitization
- Version preservation (V1 is never overwritten)
- Review state transitions & critical condition barrier enforcement
- Immutable audit event logging

### Step 5: Start Backend Service

```powershell
python run.py
```
Backend API will start on **http://127.0.0.1:5000**. Health check: `http://127.0.0.1:5000/api/health`.

### Step 6: Start Frontend Application

In a separate terminal:
```powershell
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173** in your browser.

---

## 6. End-to-End Demonstration Workflow

1. **Sign In**: Navigate to `http://localhost:5173/login`. Click the **Creator** pill (`creator@brandguard.ai` / `Creator@123`).
2. **Review Workspace**:
   - Go to **Review Workspace**.
   - Input test copy:
     > *"Our product guarantees 100% results in seven days. Apex Pulse monitors key vitals and cures winter fatigue with zero side effects."*
   - Or upload a `.docx`, `.txt`, or `.pdf` file.
   - Click **Analyze Content**.
   - Review flagged items in the Findings panel:
     - **Critical**: Disallowed absolute claim *"guarantees 100% results in seven days"* (violates FDA & BG-CLAIM-01).
     - **High**: Overly broad safety claim *"zero side effects"*.
     - **Low**: Product capitalization *"Apex Pulse"* → suggested *"ApexPulse"*.
   - Click **Accept** on the suggested corrections to watch the text update automatically.
   - Click **Compare Versions** to view a side-by-side diff between the original and revised text.
   - Click **Submit for Review**.
3. **Reviewer Evaluation**:
   - Log out and sign in with the **Reviewer** account (`reviewer@brandguard.ai` / `Reviewer@123`).
   - Navigate to the **Review Queue**. Notice high-risk submissions prioritized at the top.
   - Click **Review & Decide** on the submission.
   - Add an internal reviewer comment.
   - Click **Approve Content**. Notice that if open Critical issues remain, approval is blocked unless an explicit, justified exception rationale is entered.
   - Alternatively, click **Request Changes** with a note to return it to the Creator.
4. **Governance & Analytics**:
   - Check the **Analytics Hub** to view real-time Recharts visualizations showing approval velocity, category violations, and turnaround time.
   - Check the **Audit Trail** to see the append-only record tracking every action taken by each user.
