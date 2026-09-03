# DIEMP — Digital Investigation & Evidence Management Platform

> **Official Government Digital Investigation Document & Evidence Management Platform**
> Built for internal law enforcement, criminal investigation, cyber forensics, prosecution, and judicial discovery workflows.

---

## 1. Product Overview

The **Digital Investigation & Evidence Management Platform (DIEMP)** is an internal, case-centric enterprise platform engineered to centralize criminal investigation case files, documentary evidence, and chain-of-custody artifacts.

Unlike generic cloud storage drives, **DIEMP treats the CASE as the primary operational workspace**. Every document, evidence item, version revision, user clearance, and audit record is cryptographically bound to its parent case under strict statutory evidentiary standards (e.g., Section 65B compliance, tamper-evident SHA-256 hashes, immutable append-only audit logging).

### Key Capabilities
- **Case Workspaces**: Case diaries, First Information Report (FIR) integration, jurisdictional assignments, and milestone timelines.
- **Strict Multi-Tier Authorization**: Enforces Role-Based Access Control (RBAC), Departmental Clearance, and Case-Level Memberships server-side.
- **Genuine Cryptographic Hashing**: Real SHA-256 hashes computed directly on incoming byte streams. No fake hashes or client-side trust.
- **Live On-Demand Integrity Verification**: Recalculates file hashes on demand from stored binary streams and compares with master records.
- **Non-Destructive Version Control**: Revisions (v1, v2, v3...) are preserved in an immutable revision ledger. Edits never overwrite history.
- **Zero-Purge Archival Policy**: Records can only be designated as `ARCHIVED` or `INVALID` with mandatory logged reasons. Files are never deleted.
- **Controlled Document Clearances**: Multi-party sharing with `VIEW` or `DOWNLOAD` permissions, optional expiry dates, and instant revocation.
- **Append-Only Forensic Audit Trail**: Every login, view, download, upload, version update, share, and hash check creates an immutable audit record.
- **Smart Natural-Language Discovery**: Searches only authorized documents using full-text indexing, telemetry tags, and content keywords.
- **Executive AI Briefing Engine**: Generates on-demand investigation summaries highlighting key factual observations, identified suspects/entities, telemetry, and chain-of-custody action points without altering the master record.

---

## 2. Technology Stack

- **Backend**: Node.js v24 + Express + TypeScript
- **Database**: SQLite (local zero-setup development) via **Prisma ORM** (easily switched to PostgreSQL / AWS RDS via `DATABASE_URL`)
- **Cryptography**: Node.js native `crypto` module (SHA-256 cryptographic digests)
- **Storage Layer**: Modular storage abstraction (`LocalStorageAdapter` for local disk, `S3StorageAdapter` for AWS S3)
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons
- **Design System**: Government Enterprise Aesthetic — deep navy accents (`#0f172a`, `#1e293b`, `#2563eb`), high information density, official status badges, zero marketing clutter

---

## 3. Demo Accounts for Hackathon Judges

All demo accounts use the standard password: **`DemoPass@2026`**

| Role | Official Name | Email | Department / Jurisdiction | Clearance Description |
| :--- | :--- | :--- | :--- | :--- |
| **POLICE OFFICER** | Inspector Rajesh Sharma | `police@demo.gov` | Central Police Command | Register FIRs, create cases, upload police reports, jurisdiction oversight |
| **INVESTIGATOR** | Senior Inspector Sarah Vance | `investigator@demo.gov` | Criminal Investigation Dept (CID) | Lead investigator, manage case diaries, evidence, revisions, sharing |
| **FORENSIC OFFICER** | Dr. K. Raman | `forensic@demo.gov` | Forensic Science Laboratory (FSL) | Lab custody, forensic lab reports, bitstream integrity verification |
| **LEGAL OFFICER** | Adv. Meera Sen | `legal@demo.gov` | Directorate of Public Prosecution | Pre-trial prosecution briefs, charge sheets, review shared evidence |
| **COURT USER** | Registrar P. K. Verma | `court@demo.gov` | Metropolitan Judicial Court | Judicial dockets, read-only discovery, verify trial evidence, no unauthorized edits |
| **ADMIN** | Director General A. K. Mehra | `admin@demo.gov` | Department of Internal Security | User clearances, departmental units, system-wide audit monitoring |

> **Tip for Judges**: A **"Switch Role Demo"** dropdown is located directly in the top header of the application, allowing instant switching between accounts during the presentation.

---

## 4. Quickstart & Local Installation

### Prerequisites
- Node.js (v18 or higher; tested on v20 and v24)
- npm (v9+)

### One-Command Combined Launch
From the repository root (`sih_2026/`):

```bash
# 1. Install all dependencies across root, server, and client
npm run install:all

# 2. Seed database with realistic cases, documents, evidence, and audit logs
npm run seed

# 3. Build both backend and frontend bundles
npm run build

# 4. Launch the combined platform (Single Port 5000)
npm start
```

The combined application is immediately accessible at:
- **Unified Portal (Frontend + Backend)**: `http://127.0.0.1:5000`
- **Backend API**: `http://127.0.0.1:5000/api`
- **System Healthcheck**: `http://127.0.0.1:5000/api/health`

### Live Development Mode (Optional)
If modifying code with Vite Hot Module Replacement (HMR):
```bash
npm run dev
```
(Runs Backend on `http://127.0.0.1:5000` and Vite dev server on `http://127.0.0.1:5173` concurrently).

---

## 5. End-to-End Hackathon Demonstration Walkthrough

Follow this 20-step official flow to test all capabilities:

1. **Step 1 — Login as Police Officer**: Navigate to `http://127.0.0.1:5173/login`, click the `Police Officer` demo button, and sign in.
2. **Step 2 — Create Case**: From the dashboard, click **"Register New FIR / Case"**, enter realistic fields (e.g. `FIR/2026/0290`, `State Bank Cyber Extortion`), and submit.
3. **Step 3 — Open Workspace**: Notice the generated Case ID (`CASE-2026-00104`), priority, and station metadata.
4. **Step 4 — Ingest Document**: In the **Documents** tab, click **"Ingest Case Document"**, select any text or PDF file. Observe auto-classification.
5. **Step 5 — SHA-256 Calculation**: Once uploaded, observe the genuine 64-character SHA-256 hash displayed in the document table.
6. **Step 6 — Audit Record**: Navigate to the **Case Audit** tab; notice the `DOCUMENT_UPLOADED` event logged immutably.
7. **Step 7 — Evidence Registration**: In the **Evidence** tab, click **"Register Evidence Artifact"** (e.g. `EVD-2026-00484`, `Encrypted NVMe SSD`) and verify.
8. **Step 8 — Switch to Investigator**: Use the top bar dropdown to switch to `Lead Investigator` (`investigator@demo.gov`).
9. **Step 9 — Access Case**: Open case `CASE-2026-00421` (Cyber Fraud & Crypto Laundering) automatically available via CID department clearance.
10. **Step 10 — Smart Discovery Search**: Open **Smart Discovery Search** from the sidebar and search *"Show all forensic reports related to hard drive dump"*.
11. **Step 11 — Open Forensic Report**: Click on the document `Cyber Forensic Analysis & Bitstream Verification Report`.
12. **Step 12 — Generate Executive AI Summary**: Click **"Executive Summary"**; observe the structured briefing outlining key findings, suspect entities, and action items.
13. **Step 13 — Controlled Share**: Click **"Manage Controlled Sharing"** and grant `Advocate Meera Sen` (Legal Officer) `DOWNLOAD` clearance.
14. **Step 14 — Login as Legal Officer**: Use the top bar switcher to switch to `Legal Prosecutor` (`legal@demo.gov`).
15. **Step 15 — Verify View/Download Clearance**: Confirm the shared document is accessible, and observe that unauthorized edit buttons are suppressed.
16. **Step 16 — Upload Revision (v2 / v3)**: As an authorized investigator, click the revision icon to upload supplemental findings with change notes.
17. **Step 17 — Inspect Multi-Version Ledger**: Open **Revisions (Version History)**; confirm that previous versions (v1, v2) remain intact with their distinct SHA-256 hashes.
18. **Step 18 — Run Live Integrity Verification**: Click **"Verify SHA-256"**; watch the live server recalculation confirm `INTEGRITY VERIFIED: ZERO TAMPERING DETECTED`.
19. **Step 19 — Review Case Timeline**: Open the **Case Timeline** tab to view the visual sequence of milestones.
20. **Step 20 — Admin System Review**: Switch to `System Admin` (`admin@demo.gov`) and open **System-Wide Audit Trail** to view all cross-departmental operations and inspect JSON payloads.

---

## 6. Automated Test Suite

To run the automated 20-step verification script against the backend:

```bash
cd server
node test-e2e.js
```

Expected result: `ALL 20 ACCEPTANCE STEPS COMPLETED: 20 PASSED / 0 FAILED`.

---

## 7. AWS Cloud Architecture & Storage Configuration

The system implements a pluggable `IStorageService` interface allowing seamless transition between local disk storage and AWS S3:

### Production Deployment Architecture
- **Frontend**: AWS CloudFront + Amazon S3 static hosting
- **Backend API**: Amazon ECS (Fargate) / EC2 containerized service
- **Database**: Amazon RDS PostgreSQL with Multi-AZ encryption
- **Document Storage**: Amazon S3 with SSE-KMS server-side encryption and Object Lock (WORM compliance)
- **Security & Logs**: AWS Secrets Manager + CloudWatch Logs

### Enabling AWS S3 Storage
To enable AWS S3 for document storage, set the following environment variables in `server/.env`:

```env
STORAGE_PROVIDER=S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET=your-investigation-documents-bucket
```

If AWS credentials are omitted, DIEMP defaults to `LocalStorageAdapter` (`./uploads`), requiring zero cloud credentials for local judging demonstrations.

---

## 8. AI API Configuration

DIEMP includes an internal, deterministic NLP and heuristic extraction engine that operates completely offline with zero API keys. 

To connect an external LLM (OpenAI or Google Gemini), configure:

```env
AI_API_KEY=your_api_key_here
AI_PROVIDER=gemini # or openai
```

If `AI_API_KEY` is not present, the system operates deterministically, providing realistic executive summaries and classification recommendations without disruption.

---

## 9. Security & Compliance Principles

1. **Defense in Depth**: Authorization checks exist on both the frontend UI and Express middleware (`requireRoles`, `requireCaseAccess`, `requireDocumentAccess`).
2. **Never Trust Client**: File types are validated using magic numbers/MIME headers and size limits. Hashes are computed on the server.
3. **No Silent Overwrites**: Document revisions create append-only version records.
4. **No Hard Deletes**: Deleting evidence is procedurally forbidden; records are marked `ARCHIVED` or `INVALID` with audited reasons.
5. **Traceability**: All interactions record Event ID, User, Role, Action, Case ID, Document ID, Source IP, and Timestamp.
