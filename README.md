# KernelLab — Web Edition
> Browser-based, real PC-style OS Simulation Platform

---

## Overview

KernelLab is an interactive multiprogramming OS simulator rendered as a full PC-style desktop inside the browser. It visualises:

- **Process Management** — PCB structures, Round Robin scheduling, process lifecycle (New → Ready → Running → Waiting → Terminated)
- **Memory Paging** — Logical-to-physical address translation, frame allocation, page fault handling
- **Interrupt Handling** — Timer, I/O, Syscall, and Page Fault interrupts with full ISR flow
- **Context Switching** — CPU register save/restore with live PCB inspection
- **Analytics** — CPU utilisation, page fault rate, throughput, context switch history

---

## Architecture

```
┌─────────────────────────────────────┐   HTTP/REST   ┌────────────────────────────────┐
│   Frontend (React / Next.js)        │◄─────────────►│   Backend (FastAPI / Python)   │
│                                     │               │                                │
│  • Boot Screen + Landing Page       │               │  • OSSimulation engine         │
│  • PC-style Desktop (draggable      │               │  • PCB + Round Robin Scheduler │
│    windows, taskbar, start menu)    │               │  • Paging & Memory Manager     │
│  • Process Manager Panel            │               │  • Interrupt Handler           │
│  • Memory Viewer Panel              │               │  • Error Handler               │
│  • Interrupt Console                │               │  • In-memory state store       │
│  • Analytics Panel                  │               │                                │
│  • System Console                   │               │  Auto-docs: /docs              │
└─────────────────────────────────────┘               └────────────────────────────────┘
```

---

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
# API running at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### 2. Frontend

**Option A — Next.js (recommended)**
```bash
npx create-next-app@latest kernellab-ui --app --js --no-tailwind --no-eslint
cd kernellab-ui
# Copy App.jsx to app/page.js (or src/app/page.js)
# Add to layout.js head: <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;900&display=swap" rel="stylesheet" />
npm run dev
# Open http://localhost:3000
```

**Option B — Vite React**
```bash
npm create vite@latest kernellab-ui -- --template react
cd kernellab-ui
# Replace src/App.jsx with the provided App.jsx
npm install
npm run dev
```

---

## REST API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/state` | Full simulation state snapshot |
| POST | `/process/add` | Add a new process |
| POST | `/process/kill` | Forcibly terminate a process |
| POST | `/process/priority` | Change process priority |
| POST | `/simulation/step` | Advance simulation by 1 step |
| POST | `/simulation/reset` | Reset to initial state |
| POST | `/interrupt/trigger` | Fire timer / I/O / syscall interrupt |
| POST | `/memory/page_fault` | Inject a page fault |
| POST | `/scheduler/quantum` | Set Round Robin quantum |
| GET | `/health` | Health check |
| GET | `/docs` | Interactive Swagger UI |

---

## UI Features

| Feature | Description |
|---------|-------------|
| Boot Screen | Animated KernelLab splash with progress bar |
| Landing Page | Hero + architecture diagram + feature cards |
| Desktop | Draggable/resizable windows, taskbar, start menu, desktop icons |
| Process Manager | Add/kill processes, live PCB inspector, priority editor |
| Memory Viewer | 32-frame grid colour-coded by PID, page table viewer |
| Interrupt Console | One-click Timer/IO/Syscall triggers, page fault injection |
| Analytics | Live CPU%, fault rate, throughput chart canvas |
| System Console | Timestamped event log with colour-coded severity |
| Settings | Quantum config, step/reset controls |
| Toast Notifications | OS-style event toasts bottom-right |
| Auto-Run Toggle | Toggle continuous simulation from the desktop |

---

## Simulation Parameters

| Parameter | Default | Notes |
|-----------|---------|-------|
| Total Physical Frames | 32 | Fixed per session |
| Frame / Page Size | 256 bytes | Fixed per session |
| Max Concurrent Processes | 20 | Per SRS §3.1.2 |
| Default Time Quantum | 3 steps | Configurable at runtime |
| Auto-step interval | 800ms | Frontend polling + step |
| Max log entries | 200 | Rolling |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (JSX) / Next.js |
| Backend | FastAPI (Python 3.10+) |
| Simulation Core | Python — dataclasses, deque, enums |
| State Management | In-memory Python dicts |
| API Protocol | REST / JSON (HTTP) |
| Fonts | JetBrains Mono (Google Fonts) |

---

## Project Structure

```
kernellab/
├── backend/
│   ├── main.py           # FastAPI app, route handlers
│   ├── simulation.py     # OS simulation engine (PCB, Scheduler, Memory, Interrupts)
│   └── requirements.txt
├── frontend/
│   └── App.jsx           # Complete React desktop UI (single file)
└── README.md
```

---

## Academic Notes

- Only Round Robin scheduling is implemented in v1.0 (SRS §3.1.2)
- All simulation state is volatile — lost on backend restart (SRS §8.2)
- Instruction streams are abstracted; no real code execution occurs
- Page and frame sizes are equal and fixed for the session duration
