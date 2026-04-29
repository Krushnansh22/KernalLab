# KernelLab — Web Edition

> Browser-based, interactive OS simulation platform with real PC-style desktop interface for learning operating system concepts.

[![Python](https://img.shields.io/badge/Python-3.x-blue?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-green?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.2+-61DAFB?logo=react)](https://react.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-16.1+-black?logo=next.js)](https://nextjs.org/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Key Components](#key-components)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**KernelLab** is an interactive multiprogramming OS simulator that renders a full PC-style desktop environment inside your browser. It provides hands-on visualization and manipulation of core operating system concepts, making it an ideal tool for students and educators learning OS fundamentals.

The platform features a realistic desktop interface with draggable windows, taskbar, and start menu, coupled with a powerful backend simulation engine that handles process management, memory paging, interrupt handling, and context switching.

---

## Features

### Core OS Simulation

- **Process Management**
  - Process Control Block (PCB) structures and inspection
  - Round Robin scheduling algorithm
  - Process lifecycle management: New → Ready → Running → Waiting → Terminated
  - Priority-based process handling
  - Process creation and termination

- **Memory Management**
  - Virtual-to-physical address translation
  - Logical-to-physical paging system
  - Frame allocation and deallocation
  - Page fault detection and handling
  - Memory access control and protection

- **Interrupt Handling**
  - Timer interrupts (context switching)
  - I/O interrupts
  - System call interrupts
  - Page fault interrupts
  - Complete interrupt service routine (ISR) flow visualization

- **Context Switching**
  - CPU register save/restore operations
  - Live PCB inspection during switches
  - Switch history tracking

- **Analytics & Monitoring**
  - CPU utilization metrics
  - Page fault rate calculation
  - Throughput analysis
  - Context switch history
  - Real-time system statistics

### User Interface

- **Boot Screen** — Authentic OS boot experience
- **PC-style Desktop** — Draggable windows, taskbar, start menu
- **Process Manager Panel** — View and manage running processes
- **Memory Viewer Panel** — Inspect page tables and memory allocation
- **Interrupt Console** — Real-time interrupt and ISR monitoring
- **Analytics Panel** — Performance metrics and statistics
- **System Console** — Detailed system logs and diagnostics

---

**Technology Stack:**
- **Backend:** FastAPI, Python, Uvicorn
- **Frontend:** React, Next.js, Vite
- **Communication:** REST API with JSON payloads
- **Styling:** CSS, responsive design

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+** — [Download Python](https://www.python.org/downloads/)
- **Node.js 16+** — [Download Node.js](https://nodejs.org/)
- **npm or yarn** — Included with Node.js

---

## Installation

### 1. Clone or Extract the Repository

```bash
cd KernelLaab
```

### 2. Backend Setup

Navigate to the backend directory and create a virtual environment:

```bash
cd backend

# Create virtual environment
python -m venv env

# Activate virtual environment
# On Windows:
env\Scripts\activate
# On macOS/Linux:
source env/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**Backend Dependencies:**
- `fastapi==0.111.0` — Web framework
- `uvicorn[standard]==0.29.0` — ASGI server
- `pydantic==2.7.1` — Data validation

### 3. Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd ../frontend

# Install dependencies
npm install
```

**Frontend Dependencies:**
- `next==16.1.6` — React framework
- `react==19.2.3` — UI library
- `react-dom==19.2.3` — DOM rendering

---

## Usage

### Starting the Backend

From the `backend` directory:

```bash
python main.py
```

**Expected Output:**
```
Uvicorn running on http://localhost:8000 (Press CTRL+C to quit)
```

- **API Base URL:** `http://localhost:8000`
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

### Starting the Frontend

From the `frontend` directory:

#### Development Mode

```bash
npm run dev
```

**Expected Output:**
```
> next dev
  ▲ Next.js 16.1.6
  - Local:        http://localhost:3000
```

Access the application at `http://localhost:3000`

#### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Typical Workflow

1. **Start the backend server** (ensure it's running at `http://localhost:8000`)
2. **Start the frontend development server** (opens at `http://localhost:3000`)
3. **Open the browser** to interact with the OS simulator
4. **Use the UI** to:
   - Add processes
   - Monitor process states
   - Trigger interrupts
   - View memory allocation
   - Analyze system metrics

---

## API Documentation

### Base Endpoint
```
http://localhost:8000
```

### Auto-Generated Docs
- **Swagger UI:** `GET /docs`
- **ReDoc:** `GET /redoc`
- **OpenAPI Schema:** `GET /openapi.json`

### Core Endpoints

#### System State
```
GET /state
```
Returns the complete current simulation state (all processes, memory, interrupts, logs).

#### Process Management
```
POST /process/add
POST /process/kill
POST /process/priority
POST /simulation/step
```

#### Request Models

**AddProcessRequest**
```json
{
  "name": "optional_process_name",
  "priority": 1-10,
  "num_pages": 1-16
}
```

**KillProcessRequest**
```json
{
  "pid": 1
}
```

**ChangePriorityRequest**
```json
{
  "pid": 1,
  "priority": 1-10
}
```

---

## Project Structure

```
KernelLaab/
├── README.md                          # Project documentation
├── requirements.txt                   # Root-level requirements (if any)
│
├── backend/                           # FastAPI backend
│   ├── main.py                        # FastAPI app, routes, CORS setup
│   ├── simulation.py                  # Core OS simulation engine
│   ├── requirements.txt               # Python dependencies
│   └── env/                           # Python virtual environment
│
└── frontend/                          # Next.js frontend
    ├── package.json                   # npm dependencies and scripts
    ├── next.config.mjs                # Next.js configuration
    ├── jsconfig.json                  # JavaScript path configuration
    ├── public/                        # Static assets
    ├── src/
    │   ├── app/
    │   │   ├── layout.js              # Root layout
    │   │   ├── page.js                # Home page
    │   │   ├── page.module.css        # Page styles
    │   │   └── globals.css            # Global styles
    │   ├── main.jsx                   # React entry point
    │   ├── App.jsx                    # Root React component
    │   ├── App.css                    # App styles
    │   ├── index.css                  # Index styles
    │   └── assets/                    # Images and other assets
    ├── kernellab-ui/                  # Vite-based UI components
    │   ├── package.json
    │   ├── vite.config.js
    │   ├── index.html
    │   ├── src/
    │   │   ├── main.jsx
    │   │   ├── App.jsx
    │   │   └── App.css
    │   └── public/
    └── README.md                      # Frontend-specific docs
```

---

## Key Components

### Backend (Python/FastAPI)

#### `simulation.py` — Core Engine
- **OSSimulation Class** — Main simulation orchestrator
- **ProcessState Enum** — Process lifecycle states (NEW, READY, RUNNING, WAITING, TERMINATED)
- **InterruptType Enum** — Interrupt types (TIMER, I/O, SYSCALL, PAGE_FAULT)
- **ProcessControlBlock (PCB)** — Process metadata and state
- **PageTableEntry** — Virtual memory page mapping
- **Memory Manager** — Frame allocation and page fault handling
- **Scheduler** — Round Robin process scheduling
- **Interrupt Handler** — ISR execution and context switching

#### `main.py` — API Layer
- FastAPI application setup
- CORS middleware configuration
- RESTful endpoint definitions
- Request/response model validation using Pydantic
- Error handling and HTTP status codes

### Frontend (React/Next.js)

#### Desktop Environment
- Boot screen simulation
- PC-style desktop with draggable windows
- Taskbar and start menu UI
- Real-time state synchronization with backend

#### Panels
- **Process Manager** — Add, remove, modify processes
- **Memory Viewer** — Visualize page tables and memory allocation
- **Interrupt Console** — Monitor interrupt events and ISRs
- **Analytics Dashboard** — Display system metrics and statistics
- **System Console** — Detailed logs and diagnostic information

---

## Development

### Backend Development

1. **Activate virtual environment:**
   ```bash
   cd backend
   env\Scripts\activate  # Windows
   source env/bin/activate  # macOS/Linux
   ```

2. **Edit `simulation.py`** for core logic changes
3. **Edit `main.py`** for API endpoint changes
4. **Restart the server** to see changes

### Frontend Development

1. **Development server** provides hot-reload:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Edit component files** in `src/` directory
3. **Changes automatically refresh** in the browser

### Adding New Endpoints

1. Define request/response models in `main.py`
2. Implement handler function with `@app.post()` or `@app.get()` decorator
3. Call appropriate `OSSimulation` methods
4. Return state changes to frontend

### Adding New Simulation Features

1. Add new data structures to `simulation.py` (enums, dataclasses)
2. Implement logic in the `OSSimulation` class
3. Expose via new API endpoints in `main.py`
4. Build frontend UI components to interact with the feature

---

## Contributing

Contributions are welcome! To contribute:

1. **Fork** or **clone** the repository
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** with clear commit messages
4. **Test thoroughly** before submitting
5. **Submit a pull request** with a detailed description

### Guidelines

- Follow PEP 8 for Python code
- Use meaningful variable and function names
- Add comments for complex logic
- Keep components small and focused
- Test API endpoints before committing

---

## Learning Objectives

This simulator helps students understand:

- ✅ Process management and scheduling algorithms
- ✅ Virtual memory and paging systems
- ✅ Interrupt handling and ISR execution
- ✅ Context switching mechanisms
- ✅ CPU utilization and throughput analysis
- ✅ Process synchronization concepts
- ✅ Real-time OS behavior simulation

---

## Troubleshooting

### Backend Issues

**Port 8000 already in use:**
```bash
# Change the port in main.py
python main.py --host 127.0.0.1 --port 8001
```

**Virtual environment not activated:**
```bash
env\Scripts\activate  # Windows
source env/bin/activate  # macOS/Linux
```

**Missing dependencies:**
```bash
pip install -r requirements.txt
```

### Frontend Issues

**Port 3000 already in use:**
```bash
npm run dev -- -p 3001
```

**Dependencies not installed:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Build errors:**
```bash
npm run build
```

---

## License

This project is developed as part of the AIML Semester 4 curriculum for operating systems education.

---

## Support & Contact

For issues, questions, or suggestions:
- Review the API documentation at `http://localhost:8000/docs`
- Check the system console logs for error messages
- Refer to the inline code comments for implementation details

---

**Last Updated:** April 2026
**Version:** 1.0.0

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
