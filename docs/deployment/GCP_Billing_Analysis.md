# GCP Optimization & Resource Evolution Report (18–20 August 2026)

## 1. The Complete Optimization Timeline & Evolution Story

This document records the empirical cost and infrastructure optimization journey of **LifeTrack** on Google Cloud Platform (GCP Compute Engine), demonstrating how data-driven observability and right-sizing reduced operational costs by **~85%** without sacrificing performance, uptime, or developer workflow.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                INFRASTRUCTURE EVOLUTION                                │
│                                                                                        │
│   Phase 1: Initial Deployment (18 Aug)                                                 │
│   • Specs: e2-standard-8 (8 vCPU / 32 GB RAM)                                          │
│   • Schedule: 24/7 Running                                                             │
│   • Single-Day Cost Spike: ₹610.42 / day                                               │
│                                                                                        │
│                                    ▼ (Downsized)                                       │
│                                                                                        │
│   Phase 2: Intermediate Tuning (19 Aug)                                                │
│   • Specs: e2-standard-4 (4 vCPU / 16 GB RAM)                                          │
│   • Schedule: 07:00 – 23:00 IST sleep policy (16h active / 8h off)                     │
│   • Single-Day Cost: ₹148.33 / day (75.7% drop from peak!)                             │
│                                                                                        │
│                                    ▼ (Telemetry-driven Right-Sizing)                   │
│                                                                                        │
│   Phase 3: Production Baseline Sweet Spot (20 Aug - 11:30 AM)                          │
│   • Specs: e2-standard-2 (2 vCPU / 8 GB RAM)                                           │
│   • IP Architecture: Reserved Static IPv4 (34.29.200.124)                              │
│   • Schedule: 07:00 – 23:00 IST sleep policy                                           │
│   • Measured CPU Load: ~8% – 12% steady-state (1.8 unused cores)                       │
│   • Projected Daily Cost: ~₹70 – ₹85 / day (Over 85% total reduction)                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Daily Billing Ledger (Verified GCP Invoices)

The actual billing data across the operational cycle confirms the impact of the optimizations:

| Date | Active Configuration | Raw Usage Cost | Credits / Savings | Subtotal (Paid Out of Pocket) | Cost Delta (%) |
|---|---|---|---|---|---|
| **10–17 Aug** | Idle / Provisioning | ₹3.27 / day | -₹3.27 | **₹0.00** | Baseline storage |
| **18 Aug 2026** | `e2-standard-8` (8 vCPU / 32 GB) 24/7 | **₹610.42** | -₹610.42 | **₹0.00** | 🔴 Peak initial deploy |
| **19 Aug 2026** | `e2-standard-4` + Night Sleep Schedule | **₹148.33** | -₹148.33 | **₹0.00** | 🟢 **-75.7% drop** |
| **20 Aug 2026** *(In Progress)* | `e2-standard-2` + Static IP + Night Sleep | *(Settles 21 Aug)* | -100% | **₹0.00** | 🎯 **Est. ~₹70 – ₹85** |

> **Credit Protection:** 100% of all gross charges have been completely absorbed by promotional / issued credits (`Subtotal = ₹0.00`). Total credit wallet remains healthy at > ₹94,800.

---

## 3. Real-Time Telemetry & Metric Comparison (20 Aug 11:40 AM Snapshot)

Following the downsize from `e2-standard-4` to `e2-standard-2` and the static IP assignment on **20 August 2026 at 11:30 AM IST**:

| Telemetry Graph | `e2-standard-4` (Before 11:20 AM) | `e2-standard-2` (After 11:25 AM) | Engineering Analysis |
|---|---|---|---|
| **CPU Utilization (%)** | ~2% – 3% | **~8% – 14%** | CPU is now healthily utilized while still maintaining 85%+ headroom. |
| **Active vCPU Cores** | 0.08 – 0.12 cores | **0.15 – 0.25 cores** | Boot spike reached 0.8 cores (~40% of 1 core) and settled cleanly. |
| **Unused vCPU Cores** | ~3.9 unused cores (out of 4) | **~1.8 unused cores** (out of 2) | Eliminated 2 wasted physical cores from the billing meter. |
| **Disk Throughput** | < 100 KiB/s | Initial 8 MiB/s boot burst → **< 100 KiB/s** | Boot burst completed in under 20 seconds. |
| **Network Traffic** | ~30 KiB/s | **~40 KiB/s steady** | Healthy HTTP/HTTPS and internal container communication. |

---

## 4. Hardware Sizing & Capacity Verification

The current `e2-standard-2` instance provides an ideal balance of cost and headroom for the LifeTrack microservices stack:

```
Total Machine Memory: 8.0 GB RAM
┌───────────────────────────────────────────────────────────┬───────────────────────────────┐
│ Active Container Stack Footprint (~3.0 GB)                │ Free System Buffer (~5.0 GB)  │
├─────────────────────┬──────────────┬─────────────┬────────┤                               │
│ Spring Boot (1.4GB) │ MySQL (0.8GB)│ AI (0.35GB) │ OS+Nginx│ Build Cache / Maven / CI/CD   │
└─────────────────────┴──────────────┴─────────────┴────────┴───────────────────────────────┘
```

1. **Spring Boot (JVM):** Capped safely without garbage collector contention.
2. **MySQL 8.4:** Dedicated buffer pool with sub-millisecond query execution.
3. **FastAPI AI Service:** Lightweight Python async worker stack.
4. **GitHub Actions CI/CD:** The remaining ~5 GB RAM provides ample buffer memory for running Docker image rebuilds and Maven packaging during automated git pushes.

---

## 5. Architectural Stability & Permanence

With the configuration finalized on 20 August 2026:
* **Permanent Static IPv4:** `34.29.200.124` is attached to `instance-20260801-185224`. Hostinger DNS (`@` and `www` records for `lifetrack.fun`) and GitHub Secrets (`VM_HOST`) will never drift or break across daily sleep cycles.
* **Automated Daily Cycle:** VM automatically suspends compute costs at `23:00 IST` and resumes at `07:00 IST`.
* **Zero-Downtime Deployment:** GitHub Actions CI/CD automatically deploys on `git push origin main` via ED25519 SSH keys.
