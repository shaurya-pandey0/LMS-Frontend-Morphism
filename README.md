# 🌟 LifeTrack — AI-Powered Lifestyle & Financial Intelligence

> **Live Website:** [https://lifetrack.fun](https://lifetrack.fun) 🔒 *(SSL/TLS Encrypted)*  
> **A complete lifestyle tracking and intelligence platform built with React, Spring Boot, MySQL, and FastAPI.**

---

## 📖 What is LifeTrack?

Most people track their life in separate apps:
* 🏃 **Fitness apps** only count steps.
* 💰 **Expense apps** only show how much you spent.
* 📝 **Habit apps** are just simple checklists.
* 📖 **Journal apps** are completely isolated.

**LifeTrack connects the dots.** It brings your daily habits, sleep, meals, expenses, moods, and journals into **one single intelligent dashboard** so you can see how your lifestyle affects your energy, mood, and wallet.

```text
    📝 Daily Logs (Sleep, Water, Steps, Mood)
                 ➕
    💰 Expenses (Categories, Budgets)          ➔  🤖 AI Insights & Smart Coaching
                 ➕
    📓 Journal & Habits (Daily Check-ins)
```

---

## ✨ Key Features

### 1. 📝 Smart Daily Logs
* **Log anytime:** Add your morning sleep, afternoon meal, and evening habits throughout the day with automatic partial check-in (`merge`).
* **Track essentials:** Sleep hours, manual step targets, water intake, day type, and self-reported energy levels.
* **Mood tracking:** Record morning, afternoon, and evening moods.
* **Custom meals:** Log custom meals like Breakfast, Lunch, Brunch, or High Tea.

### 2. 🎯 Custom Habit Tracking
* Create up to **5 active personalized habits** (e.g., "Read 20 mins", "Meditation", "Gym").
* Date-specific completion check-offs.
* Deactivate habits without losing your past historical records.

### 3. 💰 Expense & Budget Manager
* Owner-scoped income and expense tracking with custom categories (Food, Utilities, Travel, Shopping, etc.).
* Date-filtered transactions and monthly budget progress meters.

### 4. 🤖 AI Assistant & Smart Insights
* **Deterministic Insights:** Instant rule-based feedback from your data (never fails even if AI is offline).
* **AI Chat Assistant:** Talk to your personal wellness coach grounded in your recent lifestyle data.
* **Natural Language Extraction (`/command`):** Type *"Spent ₹250 on lunch and drank 2L water today"* and the AI automatically creates structured drafts for your review before saving.

### 5. 🎨 Modern Glassmorphism UI
* Ultra-modern translucent card design with smooth animations and dark mode aesthetics.
* Responsive layouts optimized for desktops, tablets, and mobile screens.

---

## 🏗️ System Architecture

LifeTrack uses a **Spring Boot core monolith** paired with an **optional FastAPI AI microservice**.

```text
                        🌐 Users / Web Browser
                                   │
                     HTTPS :443    ▼   HTTP :80 (Auto-Redirect)
                    ┌──────────────────────────────┐
                    │    Nginx Reverse Proxy       │
                    │   (Let's Encrypt SSL/TLS)    │
                    └──────────────┬───────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         │                                                   │
  /api/* │ (JWT Authenticated)                        /ai/*  │ (Same-Origin)
         ▼                                                   ▼
┌─────────────────────────┐                         ┌─────────────────────────┐
│   Spring Boot Backend   │                         │   FastAPI AI Service    │
│       (Java 17)         │                         │      (Python 3.12)      │
│                         │                         │                         │
│ • Identity & JWT Auth   │                         │ • Prompt Engineering    │
│ • Business Calculations │                         │ • Pydantic Validation   │
│ • Daily Log Merges      │                         │ • Natural Language Text │
│ • Trusted Data Store    │                         │ • Rule-Based Fallbacks  │
└────────────┬────────────┘                         └────────────┬────────────┘
             │                                                   │
             ▼                                                   ▼
┌─────────────────────────┐                         ┌─────────────────────────┐
│     MySQL 8 Database    │                         │  OpenAI-Compatible LLM  │
│  (Relational Storage)   │                         │  (Groq / OpenAI / Local)│
└─────────────────────────┘                         └─────────────────────────┘
```

> 🔒 **Security First:** The database and backend ports are completely hidden inside Docker's private network. All external traffic enters securely through Nginx on Port 443 with SSL encryption!

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | React 19, React Router 7, Vite 8, Redux Toolkit, Axios, Glassmorphism CSS |
| **Backend Core** | Java 17, Spring Boot 3.3.4, Spring Security, JWT (jjwt), Hibernate, Spring Data JPA |
| **Database** | MySQL 8 (Docker container with persistent volumes) |
| **AI Microservice** | Python 3.12, FastAPI, Pydantic v2, Uvicorn, OpenAI API Protocol |
| **Reverse Proxy & SSL** | Nginx 1.27 (Alpine) + Certbot (Let's Encrypt SSL Auto-Renewal) |
| **Cloud Hosting** | Google Cloud Platform (Compute Engine — Debian 13 VM) |
| **CI/CD Pipeline** | GitHub Actions (Auto-tests, builds, and deploys on `git push origin main`) |
| **Monitoring** | Spring Boot Actuator, Micrometer, Prometheus, Grafana |

---

## 🚀 Quick Start (Local Setup)

### 📋 Prerequisites
* **Java 17+** (JDK)
* **Node.js 18+** & npm
* **MySQL 8** (Running on port `3306`)
* **Python 3.10+** (Optional, for AI service)

---

### 🟢 1-Click Startup (Recommended)

#### On Windows:
Double-click or run in Command Prompt:
```cmd
start-lifetrack.bat
```

#### On Linux / macOS:
```bash
chmod +x start-lifetrack.sh
./start-lifetrack.sh
```

*The startup script automatically verifies dependencies, starts Spring Boot, launches FastAPI, builds the frontend, and opens your browser!*

---

### 💻 Manual Startup (Step-by-Step)

If you prefer running services in separate terminal windows:

#### 1. Backend (Spring Boot):
```bash
cd backend
./mvnw spring-boot:run
# Backend runs at http://localhost:8080
# Swagger UI available at http://localhost:8080/swagger-ui/index.html
```

#### 2. Frontend (React + Vite):
```bash
cd frontend
npm install
npm run dev
# Frontend runs at http://localhost:5173
```

#### 3. AI Service (FastAPI — Optional):
```bash
cd ai-service
python -m venv .venv
# On Windows: .\.venv\Scripts\activate
# On Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env     # Add your LLM API Key here
python run.py
# AI service runs at http://localhost:8100
```

---

## 🌐 Production Cloud Deployment & CI/CD

LifeTrack is deployed on **Google Cloud Platform (GCP Compute Engine)**.

### 🔄 Automated GitHub Actions CI/CD
Every commit pushed to the `main` branch triggers `.github/workflows/deploy.yml`:
1. Connects to the GCP VM over passwordless SSH using ED25519 keys.
2. Pulls the latest code (`git pull origin main`).
3. Rebuilds and redeploys containers with zero downtime using `deploy.sh --pull`.
4. Runs automated health checks on `/api/health` and `/ai/health`.

### 💰 Cloud Cost Optimization
* **Downsized VM:** Running on `e2-standard-4` (4 vCPUs, 16 GB RAM) with a low ~3 GB RAM Docker footprint.
* **Automated Sleep Schedule:** GCP Cloud Scheduler automatically turns off the VM between `23:00` and `07:00 IST`, cutting hosting costs by **67%** (100% covered by credits = **₹0 out of pocket**).

---

## 📚 Central Documentation Hub

All detailed technical documentation is organized inside the [`docs/`](docs/README.md) directory:

```text
📁 LifeTrack Documentation (docs/)
│
├── 🚢 deployment/             DevOps, SSH keys, GCP billing & deployment files
├── 🏗️ architecture/           JSON contracts, project evolution & monitoring
├── 🎯 interview-prep/         Viva defense, technical Q&A & backend presentation plan
├── 🔍 Full Pipeline Tracing/  Request-by-request traces of all 5 core APIs
└── 🎨 Design System/          UI tokens, color palettes & mockups
```

### 🔗 Quick Links:
* 📘 [**Master Documentation Index**](docs/README.md)
* 🔒 [**Production Deployment Guide**](DEPLOYMENT.md)
* 🔑 [**Local Windows SSH & CI/CD Guide**](docs/deployment/LOCALPC-TO-VM.md)
* 💸 [**GCP Billing & Cost Analysis Report**](docs/deployment/GCP-BILLING-ANALYSIS.md)
* 🔌 [**Integration Contracts & Seams**](docs/architecture/INTEGRATION-SEAMS.md)
* 📜 [**Project Story & Evolution**](docs/architecture/PROJECT-STORY.md)
* 🎤 [**Interview Defense & Viva Q&A**](docs/interview-prep/PROJECT-QNA.md)
* 🔭 [**Future Scope & Reference Designs**](FUTURE%20SCOPE/README.md)

---

## 📄 License & Attribution

Built with passion as an advanced lifestyle and health-tech project.  
**Live Application:** [https://lifetrack.fun](https://lifetrack.fun)
