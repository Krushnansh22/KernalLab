"""
KernelLab - OS Simulation Backend
FastAPI-based server exposing the OS simulation engine via REST API.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import uvicorn

from simulation import OSSimulation, SimulationError

app = FastAPI(
    title="KernelLab",  # Restored original title
    description="Browser-based OS Simulation Engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global simulation instance (in-memory, per session)
sim = OSSimulation()


# ─── Request / Response Models ───────────────────────────────────────────────

class AddProcessRequest(BaseModel):
    name: Optional[str] = None
    priority: int = Field(default=1, ge=1, le=10)
    num_pages: int = Field(default=4, ge=1, le=16)

class KillProcessRequest(BaseModel):
    pid: int

class ChangePriorityRequest(BaseModel):
    pid: int
    priority: int = Field(ge=1, le=10)

class PageFaultRequest(BaseModel):
    pid: int

class SetQuantumRequest(BaseModel):
    quantum: int = Field(ge=1, le=100)

class TriggerInterruptRequest(BaseModel):
    interrupt_type: str  # "timer" | "io" | "syscall"
    pid: Optional[int] = None


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/state")
def get_state():
    """Return the complete current simulation state."""
    return sim.get_state()


@app.post("/process/add")
def add_process(req: AddProcessRequest):
    """Add a new process to the simulation."""
    try:
        pid = sim.add_process(req.name, req.priority, req.num_pages)
        return {"success": True, "pid": pid, "state": sim.get_state()}
    except SimulationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/process/kill")
def kill_process(req: KillProcessRequest):
    """Forcibly terminate a process."""
    try:
        sim.kill_process(req.pid)
        return {"success": True, "state": sim.get_state()}
    except SimulationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/process/priority")
def change_priority(req: ChangePriorityRequest):
    """Change a process's scheduling priority."""
    try:
        sim.change_priority(req.pid, req.priority)
        return {"success": True, "state": sim.get_state()}
    except SimulationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/simulation/step")
def step_simulation():
    """Advance simulation by one step."""
    try:
        sim.step()
        return {"success": True, "state": sim.get_state()}
    except SimulationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/simulation/reset")
def reset_simulation():
    """Reset simulation to initial state."""
    global sim
    sim = OSSimulation()
    return {"success": True, "state": sim.get_state()}


@app.post("/interrupt/trigger")
def trigger_interrupt(req: TriggerInterruptRequest):
    """Manually trigger an interrupt."""
    try:
        sim.trigger_interrupt(req.interrupt_type, req.pid)
        return {"success": True, "state": sim.get_state()}
    except SimulationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/memory/page_fault")
def inject_page_fault(req: PageFaultRequest):
    """Manually inject a page fault for a process."""
    try:
        sim.inject_page_fault(req.pid)
        return {"success": True, "state": sim.get_state()}
    except SimulationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/scheduler/quantum")
def set_quantum(req: SetQuantumRequest):
    """Set the Round Robin time quantum."""
    sim.set_quantum(req.quantum)
    return {"success": True, "quantum": req.quantum}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/super_health")
def super_health():
    """Prints a message to the console"""
    print("Hello world")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)