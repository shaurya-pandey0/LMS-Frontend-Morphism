# 📚 LifeTrack Documentation Hub

Welcome to the centralized documentation index for **LifeTrack**. All system documentation, architecture designs, deployment manuals, and interview preparation notes are organized below by category.

---
```
📁 LifeTrack (Root)
│
├── README.md                               <-- Main repository overview & live deployment link
├── DEPLOYMENT.md                           <-- Primary single-VM GCP production guide
│
├── 📁 docs/
│   ├── README.md                           <-- 📚 Master Documentation Hub
│   │
│   ├── 📁 deployment/                      <-- DevOps, SSH, Billing & File Index
│   │   ├── LOCALPC-TO-VM.md                (Direct Windows SSH & CI/CD secrets guide)
│   │   ├── GCP-BILLING-ANALYSIS.md         (Resource optimization & daytime schedule)
│   │   └── DEPLOYMENT-FILES.md             (Index of all deployment scripts and images)
│   │
│   ├── 📁 architecture/                    <-- System Design, Mechanics & Evolution
│   │   ├── INTEGRATION-SEAMS.md            (JSON contracts, Pydantic boundaries & security)
│   │   ├── PROJECT-STORY.md                (The 4-stage evolutionary story of LifeTrack)
│   │   ├── INITIAL-PROMISE.md              (Original 3-pillar tracking vision & motivation)
│   │   ├── MONITORING-GRAFANA.md           (Actuator + Prometheus + Grafana setup)
│   │   ├── PAGE-COMPONENT-GUIDE.md         (Frontend component standards & glassmorphism)
│   │   ├── FRONTEND-AXIOS-REDUX-MIGRATION.md
│   │   └── FRONTEND-UI-CONSOLIDATION-PHASE-1.md
│   │
│   └── 📁 interview-prep/                  <-- Technical Defense, Viva Q&A & Slices
│       ├── PROJECT-QNA.md                  (Comprehensive viva defense questions & answers)
│       ├── AI-FLUENCY.md                   (LLM architecture, prompt engineering & fallbacks)
│       ├── BACKEND-PRESENTATION-PLAN.md    (Vertical slices across the stack)
│       └── REACT-QUESTIONS.md              (React hooks, Redux Toolkit & state management)
│
├── 📁 FUTURE SCOPE/                        <-- Unimplemented & Scaling Reference Designs
│   ├── README.md                           (Explanation of future features)
│   ├── DEPLOYMENT-SPLIT.md                 (Split 2-VM distributed enterprise architecture)
│   └── vector-db-turbovec.md               (Local RAG vector DB design for journals)
│
├── 📁 Full Pipeline Tracing Docs/          <-- Step-by-step API traces
└── 📁 UI/design-system/                    <-- Design tokens & color system specifications

```

---

## 1. 🏗️ Architecture & Design

In-depth system mechanics, integration contracts, component guidelines, and the evolutionary story of the platform:

| Document | Purpose |
|---|---|
| [**INTEGRATION-SEAMS.md**](architecture/INTEGRATION-SEAMS.md) | The strict JSON contracts, Pydantic validation boundaries, and security model between Spring Boot, FastAPI, and React. |
| [**PROJECT-STORY.md**](architecture/PROJECT-STORY.md) | The 4-stage evolutionary story of LifeTrack (Mongo ➔ MySQL, untrusted client calculations ➔ Spring trusted core, daily check-in redesign). |
| [**INITIAL-PROMISE.md**](architecture/INITIAL-PROMISE.md) | The original product vision: why siloed apps (Fitbit, Splitwise, Habitica) fail and why unified 3-pillar tracking works. |
| [**MONITORING-GRAFANA.md**](architecture/MONITORING-GRAFANA.md) | Prometheus metrics scraping and Grafana visualization with Spring Boot Actuator and Micrometer. |
| [**PAGE-COMPONENT-GUIDE.md**](architecture/PAGE-COMPONENT-GUIDE.md) | Frontend component design guidelines, glassmorphism standards, and UI architecture. |
| [**FRONTEND-AXIOS-REDUX-MIGRATION.md**](architecture/FRONTEND-AXIOS-REDUX-MIGRATION.md) | Migration history moving from `fetch()` to Axios interceptors and React Context to Redux Toolkit. |
| [**FRONTEND-UI-CONSOLIDATION-PHASE-1.md**](architecture/FRONTEND-UI-CONSOLIDATION-PHASE-1.md) | Consolidation of fragmented stylesheets into unified design tokens. |

---

## 2. 🚢 Deployment, DevOps & Infrastructure

Production cloud setup, direct SSH access, cost optimization reports, and deployment file index:

| Document | Purpose |
|---|---|
| [**DEPLOYMENT.md**](../DEPLOYMENT.md) *(Root)* | **Primary Production Guide:** Single-VM GCP deployment, Let's Encrypt SSL/TLS, Docker Compose, systemd, and zero-downtime CI/CD. |
| [**LOCALPC-TO-VM.md**](deployment/LOCALPC-TO-VM.md) | Direct passwordless ED25519 SSH from Windows CMD/PowerShell, `~/.ssh/config` shortcut, and GitHub Actions deploy-key troubleshooting. |
| [**GCP-BILLING-ANALYSIS.md**](deployment/GCP-BILLING-ANALYSIS.md) | Financial and resource optimization report: downsizing to `e2-standard-4` and automated daytime schedule saving 67% (₹0 out-of-pocket). |
| [**DEPLOYMENT-FILES.md**](deployment/DEPLOYMENT-FILES.md) | Index and description of every Dockerfile, compose file, Nginx template, and shell script used for deployment. |

---

## 3. 🎯 Interview & Viva Defense Preparation

Comprehensive technical rationale, viva defense notes, and deep architectural questions:

| Document | Purpose |
|---|---|
| [**PROJECT-QNA.md**](interview-prep/PROJECT-QNA.md) | Technical defense and Q&A covering state management, authentication, database constraints, and full-stack flow. |
| [**AI-FLUENCY.md**](interview-prep/AI-FLUENCY.md) | Technical rationale for LLM architecture, prompt construction, structured output negotiation, and deterministic rule fallbacks. |
| [**BACKEND-PRESENTATION-PLAN.md**](interview-prep/BACKEND-PRESENTATION-PLAN.md) | Defensible vertical slices across the stack (React ➔ Filter ➔ Controller ➔ DTO ➔ Service ➔ JPA ➔ MySQL). |
| [**REACT-QUESTIONS.md**](interview-prep/REACT-QUESTIONS.md) | React lifecycle, custom hooks, Redux Toolkit architecture, and state optimization questions. |

---

## 4. 🔭 Future Scope & Alternative Blueprints

Architectural designs and scaling blueprints planned for future milestones:

| Document | Purpose |
|---|---|
| [**FUTURE SCOPE/README.md**](../FUTURE%20SCOPE/README.md) | Overview of proposed enhancements not in the current production build. |
| [**DEPLOYMENT-SPLIT.md**](../FUTURE%20SCOPE/DEPLOYMENT-SPLIT.md) | 2-VM distributed enterprise deployment separating App VM and AI/GPU VM across private VPC. |
| [**vector-db-turbovec.md**](../FUTURE%20SCOPE/vector-db-turbovec.md) | Local RAG vector store design for semantic journal retrieval. |

---

## 5. 🔍 Subsystem Deep Dives

- [**Backend Guide (Spring Boot)**](../backend/README.md)
- [**Frontend Guide (React + Redux)**](../frontend/README.md)
- [**AI Microservice Guide (FastAPI)**](../ai-service/README.md)
- [**UI Design System (Tokens & Specs)**](../UI/design-system/README.md)
- [**Full Pipeline Tracing Docs**](../Full%20Pipeline%20Tracing%20Docs/)
