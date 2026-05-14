# GRC Evidence Collector

A web app for collecting compliance evidence from systems like GitHub, AWS, and Jira. Each collector can pull evidence either as structured API data (JSON) or as a visual screenshot — your choice per collection task.

## Features

- **Multiple integrations** — GitHub, AWS, Jira (more coming)
- **Dual collection modes** — API data or Playwright screenshot, chosen per collector
- **Evidence library** — browse all artifacts with inline JSON viewer and screenshot preview
- **5-step collector wizard** — integration → evidence type → method → configure → schedule
- **Cron scheduling** — set collectors to run automatically on any schedule
- **Control tagging** — map evidence artifacts to compliance controls (SOC 2, ISO 27001, etc.)

## Screenshots

| Dashboard | Collector Wizard | Evidence Library |
|-----------|-----------------|-----------------|
| Recent runs, artifact counts, quick stats | Pick integration, evidence type, and collection method | Browse and preview all collected artifacts |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
git clone https://github.com/stephenward21/new-grc.git
cd new-grc

npm install
npx playwright install chromium   # required for screenshot collection

cp .env.example .env
# edit .env with your credentials (see below)

npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```env
DATABASE_URL="file:./dev.db"

# GitHub integration
GITHUB_TOKEN=ghp_...

# AWS integration
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Jira integration
JIRA_HOST=https://your-org.atlassian.net
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=...
```

Credentials can also be entered per-integration in the UI — environment variables are optional fallbacks.

## Collection Methods

### API Mode
Calls the system's REST API and returns structured JSON data. Best for:
- Access control lists (IAM users, repo collaborators)
- Audit logs
- Configuration exports

### Screenshot Mode
Uses a headless Playwright browser to capture a screenshot of the relevant URL. Best for:
- Visual proof of a dashboard or settings state
- Evidence that requires showing a UI (e.g. MFA enforcement screen)
- Any page that's easier to capture visually than parse via API

> **Note:** Screenshot mode for private content requires the browser to be authenticated. For now, screenshots of public URLs work out of the box; private pages will capture a login screen unless session cookies are configured.

## Supported Evidence Types

### GitHub
| Evidence Type | API | Screenshot |
|--------------|-----|-----------|
| Repository List | ✅ | ✅ |
| Branch Protection Rules | ✅ | ✅ |
| Repository Collaborators | ✅ | ✅ |
| Organization Audit Log | ✅ | ✅ |

### AWS
| Evidence Type | API | Screenshot |
|--------------|-----|-----------|
| IAM Users | ✅ | ✅ |
| IAM Policies | ✅ | ✅ |
| S3 Buckets | ✅ | ✅ |
| Security Groups | ✅ | ✅ |

### Jira
| Evidence Type | API | Screenshot |
|--------------|-----|-----------|
| Open Issues | ✅ | ✅ |
| Closed Issues | ✅ | ✅ |
| Audit Log | ✅ | — |
| User List | ✅ | ✅ |

## Tech Stack

- [Next.js 14](https://nextjs.org/) (App Router)
- [Prisma](https://www.prisma.io/) + SQLite (dev) / PostgreSQL (prod)
- [Playwright](https://playwright.dev/) for screenshot collection
- [Tailwind CSS](https://tailwindcss.com/)
- [Zod](https://zod.dev/) for schema validation

## Project Structure

```
├── app/
│   ├── (dashboard)/        # UI pages (dashboard, integrations, collectors, evidence)
│   └── api/                # REST API routes
├── components/
│   ├── collectors/         # MethodSelector component
│   ├── evidence/           # ArtifactViewer component
│   ├── nav/                # Sidebar
│   └── ui/                 # Button, Badge, Card, Input, etc.
├── lib/
│   ├── collectors/
│   │   ├── api/            # GitHub, AWS, Jira collector implementations
│   │   └── screenshot/     # Playwright browser wrapper
│   ├── aws-sigv4.ts        # AWS SigV4 request signing
│   └── db.ts               # Prisma client singleton
└── prisma/
    └── schema.prisma
```

## Roadmap

- [ ] Session cookie injection for authenticated screenshots
- [ ] PostgreSQL support for production deployments
- [ ] Additional integrations (Okta, Datadog, Slack, Kubernetes)
- [ ] Credential encryption at rest
- [ ] Evidence export (PDF report, ZIP bundle)
- [ ] Webhook triggers for evidence collection
