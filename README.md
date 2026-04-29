# KernelLab — Web Edition
> Browser-based, real PC-style OS Simulation Platform

---

## 🎓 NEW: Simplified & Animated Frontend!

The frontend has been **completely redesigned** to be **clearer and easier to understand** for students!

### ✨ What's Improved:
- **Interactive Tutorial** 📚 - 6-step guided learning on first launch
- **Animated Visualizations** 🎨 - See process states, memory operations, and context switches in real-time
- **Better Console** 📟 - Events highlighted with smooth animations
- **Clearer Processes** ⚙️ - Running process glows, state changes animated
- **Visual Memory** 🧠 - Page faults flash red, better frame visualization
- **Help Button** ❓ - Reshow tutorial anytime

### 📖 Documentation:
- [**FRONTEND_QUICKSTART.md**](FRONTEND_QUICKSTART.md) - **Start here!** How to use the new interface
- [**FRONTEND_SHOWCASE.md**](FRONTEND_SHOWCASE.md) - Visual walkthrough of all features
- [**FRONTEND_IMPROVEMENTS.md**](FRONTEND_IMPROVEMENTS.md) - Detailed changes & explanations
- [**CHANGES_SUMMARY.md**](CHANGES_SUMMARY.md) - Technical overview

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
│  ✨ IMPROVED:                       │               │  • OSSimulation engine         │
│  • Interactive Tutorial             │               │  • PCB + Round Robin Scheduler │
│  • Animated Process Manager         │               │  • Paging & Memory Manager     │
│  • Animated Memory Viewer           │               │  • Interrupt Handler           │
│  • Animated Interrupt Console       │               │  • Error Handler               │
│  • Better System Console            │               │  • In-memory state store       │
│  • Enhanced Analytics               │               │                                │
│  • Help/Tutorial Button             │               │  Auto-docs: /docs              │
└─────────────────────────────────────┘               └────────────────────────────────┘
```

---

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment (if not already done)
python -m venv env
# On Windows:
env\Scripts\activate
# On macOS/Linux:
source env/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python main.py
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **OpenAPI Spec**: http://localhost:8000/openapi.json

### 2. Frontend Setup (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Expected Output:**
```
▲ Next.js 15.0.0
- Local:        http://localhost:3000
```

- **Application**: http://localhost:3000

### 3. Vite Development (Optional)

If using the Vite React setup alongside Next.js:

```bash
cd frontend/kernellab-ui

# Install dependencies
npm install

# Start development server
npm run dev
```

---

### Full Stack Startup Checklist

- [ ] Backend running on port 8000 (FastAPI/Uvicorn)
- [ ] Frontend running on port 3000 (Next.js or Vite)
- [ ] Both services have internet connectivity for cross-origin requests
- [ ] Browser opens to http://localhost:3000

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
KernelLab/
├── README.md                          # Project documentation
│
├── backend/                           # FastAPI backend (Python)
│   ├── main.py                        # FastAPI app & route handlers
│   ├── simulation.py                  # OS simulation engine
│   ├── requirements.txt               # Python dependencies
│   └── env/                           # Virtual environment (venv)
│       ├── pyvenv.cfg
│       ├── Scripts/                   # Activation scripts
│       └── Lib/site-packages/         # Installed packages
│
└── frontend/                          # Next.js frontend (React)
    ├── jsconfig.json                  # JavaScript config
    ├── next.config.mjs                # Next.js configuration
    ├── package.json                   # Node dependencies
    ├── README.md                      # Frontend-specific docs
    ├── public/                        # Static assets
    │
    ├── src/                           # Next.js app source
    │   ├── app/
    │   │   ├── layout.js              # Root layout
    │   │   ├── page.js                # Home page
    │   │   └── globals.css            # Global styles
    │   └── (other pages)
    │
    └── kernellab-ui/                  # Vite React development setup
        ├── vite.config.js             # Vite configuration
        ├── package.json               # Vite project dependencies
        ├── index.html                 # HTML entry point
        ├── eslint.config.js
        ├── public/                    # Static assets
        └── src/
            ├── main.jsx               # React entry point
            ├── App.jsx                # Main App component
            ├── App.css                # App styles
            ├── index.css              # Global styles
            └── assets/                # Component assets
```

---

## Academic Notes

- Only Round Robin scheduling is implemented in v1.0 (SRS §3.1.2)
- All simulation state is volatile — lost on backend restart (SRS §8.2)
- Instruction streams are abstracted; no real code execution occurs
- Page and frame sizes are equal and fixed for the session duration
