---
description: Repository Information Overview
alwaysApply: true
---

# ByteFlow Repository Information

## Repository Summary
ByteFlow is a multi-project repository designed for Instagram automation and workflow management. It features a React-based frontend, a scalable Node.js backend with background processing capabilities, and a dedicated GCP Cloud Function for webhook handling.

## Repository Structure
- **instaflow/**: Frontend application built with React, Vite, and TypeScript.
- **instaflow-backend/**: Core backend services including an Express API and a BullMQ-based worker for background tasks.
- **instaflow-backend/gcp/webhook-function/**: Serverless function specifically for handling Instagram webhooks on Google Cloud Platform.
- **docker-compose.yml**: Root-level and backend-specific configurations for local development orchestration.

---

## Projects

### instaflow (Frontend)
**Configuration File**: `instaflow/package.json`

#### Language & Runtime
- **Language**: TypeScript
- **Runtime**: Node.js
- **Build System**: Vite
- **Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- `react` (^19.2.0), `react-router-dom` (^6.30.2)
- `@reduxjs/toolkit` (^2.11.2), `react-redux` (^9.2.0)
- `@tanstack/react-query` (^5.90.19)
- `@google/genai` (^1.34.0)
- `tailwindcss` (^4.1.18), `lucide-react` (^0.562.0)
- `axios` (^1.13.2), `zod` (^4.3.5)

#### Build & Installation
```bash
cd instaflow
npm install
npm run build
```

#### Testing
**Framework**: Vitest
**Test Location**: `instaflow/src/test/`
**Naming Convention**: `*.test.ts`, `*.test.tsx` (implied by Vitest)
**Configuration**: `instaflow/vitest.config.ts`
**Run Command**:
```bash
npm run test
```

---

### instaflow-backend (Core Backend)
**Configuration File**: `instaflow-backend/package.json`

#### Language & Runtime
- **Language**: TypeScript
- **Runtime**: Node.js (v20)
- **Build System**: tsc (TypeScript Compiler)
- **Package Manager**: npm
- **Database**: PostgreSQL (Prisma ORM)
- **Queue System**: BullMQ (Redis-backed)

#### Dependencies
**Main Dependencies**:
- `express` (^4.22.1)
- `@prisma/client` (^7.2.0)
- `bullmq` (^5.66.4), `@bull-board/api` (^6.16.2)
- `axios` (^1.6.8), `jsonwebtoken` (^9.0.3)
- `pino` (^10.2.0), `zod` (^4.3.5)

#### Build & Installation
```bash
cd instaflow-backend
npm install
npx prisma generate
npm run build
```

#### Docker
- **Dockerfile (API)**: `instaflow-backend/Dockerfile.api`
- **Dockerfile (Worker)**: `instaflow-backend/Dockerfile.worker`
- **Configuration**: Multi-stage builds using `node:20-alpine`. Orchestrated via `instaflow-backend/docker-compose.yml`.

---

### instagram-webhook-function (GCP)
**Configuration File**: `instaflow-backend/gcp/webhook-function/package.json`

#### Language & Runtime
- **Language**: TypeScript
- **Runtime**: Node.js 20
- **Type**: GCP Cloud Function

#### Usage & Operations
**Deploy Command**:
```bash
cd instaflow-backend/gcp/webhook-function
npm run deploy
```
