# BrandGuard AI — REST API Specification
**Base URL:** `/api`

## Authentication
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/login` | Authenticate with email/password; returns JWT | No |
| `POST` | `/api/auth/logout` | Invalidate current session and log event | Yes |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes |
| `GET` | `/api/auth/users` | List active organization users | Yes |

## Dashboard
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/dashboard/stats` | Aggregated KPI stats, approval trends, categories | Yes |
| `GET` | `/api/dashboard/activity` | Latest 10 immutable audit events | Yes |

## Content Submissions & Workspace
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/submissions` | List and filter submissions (pagination, search, status) | Yes |
| `POST` | `/api/submissions` | Create draft content submission and Version 1 | Yes |
| `GET` | `/api/submissions/<id>` | Full details with all versions, findings, comments | Yes |
| `PUT` | `/api/submissions/<id>` | Update submission metadata | Yes |
| `POST` | `/api/submissions/<id>/analyze` | Run 10-step hybrid analysis pipeline on version | Yes |
| `POST` | `/api/submissions/<id>/versions` | Create revised version without overwriting original | Yes |
| `GET` | `/api/submissions/<id>/versions` | Retrieve version history | Yes |
| `GET` | `/api/submissions/<id>/findings` | Get findings for submission version | Yes |
| `POST` | `/api/submissions/upload-document`| Extract text from TXT, DOCX, or PDF | Yes |

## Findings & Corrections
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `PATCH` | `/api/findings/<id>` | Update finding status (`open`, `accepted`, `dismissed`) | Yes |
| `POST` | `/api/findings/<id>/apply-suggestion` | Apply suggested or edited text to document | Yes |
| `POST` | `/api/findings/<id>/dismiss` | Dismiss finding with mandatory justification reason | Yes |

## Review Queue & Approvals
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/reviews/queue` | Priority review queue (`Pending Review`, `Escalated`) | Yes |
| `POST` | `/api/submissions/<id>/submit-for-review` | Submit content to human reviewer queue | Yes |
| `POST` | `/api/submissions/<id>/reviews` | Add internal reviewer comment | Yes |
| `POST` | `/api/submissions/<id>/approve` | Approve content (validates Critical findings barrier) | Reviewer/Admin |
| `POST` | `/api/submissions/<id>/request-changes` | Return content with revision instructions | Reviewer/Admin |
| `POST` | `/api/submissions/<id>/escalate` | Escalate high-risk submission with reason | Reviewer/Admin |

## Brand Guidelines & Knowledge
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/guidelines` | List guidelines with search and category filters | Yes |
| `POST` | `/api/guidelines` | Create brand guideline | Admin |
| `GET` | `/api/guidelines/<id>` | Retrieve guideline and version history | Yes |
| `PUT` | `/api/guidelines/<id>` | Update guideline and increment version | Admin |
| `DELETE` | `/api/guidelines/<id>` | Archive guideline | Admin |
| `GET` / `POST` | `/api/guidelines/facts` | Manage verified facts knowledge base | Yes / Admin |
| `GET` / `POST` | `/api/guidelines/claims` | Manage restricted claims knowledge base | Yes / Admin |
| `GET` / `POST` | `/api/guidelines/assets` | Manage approved brand assets | Yes / Admin |

## Terminology Rules
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/rules` | List terminology validation rules | Yes |
| `POST` | `/api/rules` | Create terminology rule | Admin |
| `PUT` | `/api/rules/<id>` | Update rule pattern or replacement | Admin |
| `PATCH` | `/api/rules/<id>/toggle` | Enable or disable rule | Admin |
| `DELETE` | `/api/rules/<id>` | Delete terminology rule | Admin |

## Analytics & Audit
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/analytics/overview` | Turnaround velocity, status ratios, time trends | Yes |
| `GET` | `/api/analytics/findings` | Issue category breakdown, top violated guidelines | Yes |
| `GET` | `/api/audit-events` | Immutable audit trail with pagination and filters | Yes |
