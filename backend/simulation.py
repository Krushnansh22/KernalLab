"""
KernelLab - OS Simulation Engine
Implements: PCB, Round Robin Scheduler, Paging/Memory Manager, Interrupt Handler, Error Handler.
"""

import time
import random
import string
from dataclasses import dataclass, field
from typing import Optional
from collections import deque
from enum import Enum


class SimulationError(Exception):
    pass


# ─── Enums ───────────────────────────────────────────────────────────────────

class ProcessState(str, Enum):
    NEW = "New"
    READY = "Ready"
    RUNNING = "Running"
    WAITING = "Waiting"
    TERMINATED = "Terminated"


class InterruptType(str, Enum):
    TIMER = "Timer"
    IO = "I/O"
    SYSCALL = "Syscall"
    PAGE_FAULT = "PageFault"


class LogLevel(str, Enum):
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"
    SUCCESS = "SUCCESS"


# ─── Data Structures ─────────────────────────────────────────────────────────

@dataclass
class PageTableEntry:
    page_number: int
    frame_number: Optional[int] = None
    valid: bool = False
    protected: bool = False


@dataclass
class PCB:
    pid: int
    name: str
    state: ProcessState
    priority: int
    program_counter: int
    cpu_registers: dict
    page_table: list  # list of PageTableEntry
    memory_base: int
    memory_limit: int
    time_used: int = 0
    quantum_remaining: int = 0
    creation_time: float = field(default_factory=time.time)
    completion_time: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "pid": self.pid,
            "name": self.name,
            "state": self.state.value,
            "priority": self.priority,
            "program_counter": self.program_counter,
            "cpu_registers": self.cpu_registers,
            "page_table": [
                {
                    "page_number": e.page_number,
                    "frame_number": e.frame_number,
                    "valid": e.valid,
                    "protected": e.protected,
                }
                for e in self.page_table
            ],
            "memory_base": self.memory_base,
            "memory_limit": self.memory_limit,
            "time_used": self.time_used,
            "quantum_remaining": self.quantum_remaining,
            "creation_time": self.creation_time,
            "completion_time": self.completion_time,
        }


@dataclass
class LogEntry:
    timestamp: float
    level: LogLevel
    message: str
    pid: Optional[int] = None
    interrupt_type: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "timestamp": round(self.timestamp, 3),
            "level": self.level.value,
            "message": self.message,
            "pid": self.pid,
            "interrupt_type": self.interrupt_type,
        }


# ─── Constants ───────────────────────────────────────────────────────────────

TOTAL_FRAMES = 32
FRAME_SIZE = 256       # bytes (logical)
MAX_PROCESSES = 20
DEFAULT_QUANTUM = 3
MAX_LOG_ENTRIES = 200


# ─── OS Simulation ───────────────────────────────────────────────────────────

class OSSimulation:
    def __init__(self):
        self._pid_counter = 1
        self._quantum = DEFAULT_QUANTUM
        self._sim_time = 0.0
        self._step_count = 0

        # Process tables
        self._processes: dict[int, PCB] = {}
        self._ready_queue: deque[int] = deque()
        self._waiting_queue: deque[int] = deque()
        self._running_pid: Optional[int] = None

        # Memory
        self._free_frames: list[int] = list(range(TOTAL_FRAMES))
        self._frame_owner: dict[int, int] = {}  # frame_number -> pid

        # Metrics
        self._context_switches: int = 0
        self._page_faults: int = 0
        self._processes_completed: int = 0
        self._cpu_busy_steps: int = 0
        self._throughput_history: list[dict] = []

        # Log
        self._log: list[LogEntry] = []

        self._log_event(LogLevel.INFO, "KernelLab simulation initialised. Ready.")

    # ── Logging ──────────────────────────────────────────────────────────────

    def _log_event(
        self,
        level: LogLevel,
        message: str,
        pid: Optional[int] = None,
        interrupt_type: Optional[str] = None,
    ):
        entry = LogEntry(
            timestamp=self._sim_time,
            level=level,
            message=message,
            pid=pid,
            interrupt_type=interrupt_type,
        )
        self._log.append(entry)
        if len(self._log) > MAX_LOG_ENTRIES:
            self._log = self._log[-MAX_LOG_ENTRIES:]

    # ── Memory Management ────────────────────────────────────────────────────

    def _allocate_frames(self, pid: int, num_pages: int) -> list[PageTableEntry]:
        """Allocate frames for a new process. May partially allocate."""
        page_table = []
        for page_num in range(num_pages):
            entry = PageTableEntry(page_number=page_num)
            if self._free_frames:
                frame = self._free_frames.pop(0)
                entry.frame_number = frame
                entry.valid = True
                self._frame_owner[frame] = pid
            # If no free frames, leave page invalid (will fault on access)
            page_table.append(entry)
        return page_table

    def _release_frames(self, pid: int):
        """Return all frames owned by a process back to the free list."""
        released = [f for f, owner in list(self._frame_owner.items()) if owner == pid]
        for frame in released:
            del self._frame_owner[frame]
            self._free_frames.append(frame)
        self._free_frames.sort()

    def _translate_address(self, pid: int, logical_address: int) -> Optional[int]:
        """Perform logical-to-physical address translation."""
        pcb = self._processes.get(pid)
        if not pcb:
            return None
        page_num = logical_address // FRAME_SIZE
        offset = logical_address % FRAME_SIZE
        if page_num >= len(pcb.page_table):
            return None
        entry = pcb.page_table[page_num]
        if not entry.valid or entry.frame_number is None:
            return None
        return entry.frame_number * FRAME_SIZE + offset

    # ── Process Management ───────────────────────────────────────────────────

    def add_process(
        self,
        name: Optional[str],
        priority: int,
        num_pages: int,
    ) -> int:
        active = [p for p in self._processes.values() if p.state != ProcessState.TERMINATED]
        if len(active) >= MAX_PROCESSES:
            raise SimulationError(f"Maximum process limit ({MAX_PROCESSES}) reached.")

        pid = self._pid_counter
        self._pid_counter += 1

        if not name:
            suffix = "".join(random.choices(string.ascii_uppercase, k=3))
            name = f"proc_{suffix}"

        page_table = self._allocate_frames(pid, num_pages)
        mem_base = 0
        mem_limit = num_pages * FRAME_SIZE

        pcb = PCB(
            pid=pid,
            name=name,
            state=ProcessState.NEW,
            priority=priority,
            program_counter=0,
            cpu_registers={"AX": 0, "BX": 0, "CX": 0, "DX": 0, "SP": mem_limit, "BP": 0},
            page_table=page_table,
            memory_base=mem_base,
            memory_limit=mem_limit,
            quantum_remaining=self._quantum,
        )

        self._processes[pid] = pcb
        self._log_event(LogLevel.INFO, f"Process '{name}' (PID {pid}) created with {num_pages} pages.", pid=pid)

        # Admit to ready queue
        pcb.state = ProcessState.READY
        self._ready_queue.append(pid)
        self._log_event(LogLevel.INFO, f"PID {pid} admitted to Ready queue.", pid=pid)

        # If CPU is idle, schedule immediately
        if self._running_pid is None:
            self._schedule_next()

        return pid

    def kill_process(self, pid: int):
        pcb = self._processes.get(pid)
        if not pcb:
            raise SimulationError(f"PID {pid} does not exist.")
        if pcb.state == ProcessState.TERMINATED:
            raise SimulationError(f"PID {pid} is already terminated.")

        self._terminate_process(pid, reason="Killed by user")

    def change_priority(self, pid: int, priority: int):
        pcb = self._processes.get(pid)
        if not pcb:
            raise SimulationError(f"PID {pid} does not exist.")
        if pcb.state == ProcessState.TERMINATED:
            raise SimulationError(f"Cannot change priority of terminated process.")
        old = pcb.priority
        pcb.priority = priority
        self._log_event(LogLevel.INFO, f"PID {pid} priority changed {old} → {priority}.", pid=pid)

    def set_quantum(self, quantum: int):
        self._quantum = quantum
        self._log_event(LogLevel.INFO, f"Time quantum set to {quantum}.")

    # ── Scheduler ────────────────────────────────────────────────────────────

    def _schedule_next(self):
        """Round Robin: pick next process from ready queue."""
        if not self._ready_queue:
            self._running_pid = None
            self._log_event(LogLevel.INFO, "CPU idle — no ready processes.")
            return

        # Sort ready queue by priority (higher priority first) but maintain FIFO within same priority
        sorted_ready = sorted(
            list(self._ready_queue),
            key=lambda p: -self._processes[p].priority,
        )
        next_pid = sorted_ready[0]
        self._ready_queue.remove(next_pid)

        pcb = self._processes[next_pid]
        pcb.state = ProcessState.RUNNING
        pcb.quantum_remaining = self._quantum
        self._running_pid = next_pid
        self._log_event(LogLevel.SUCCESS, f"PID {next_pid} dispatched to CPU (quantum={self._quantum}).", pid=next_pid)

    def _context_switch(self, from_pid: Optional[int], to_state: ProcessState = ProcessState.READY):
        """Save current process context and schedule next."""
        if from_pid is not None:
            pcb = self._processes.get(from_pid)
            if pcb and pcb.state == ProcessState.RUNNING:
                # Simulate saving registers
                pcb.cpu_registers["AX"] = random.randint(0, 255)
                pcb.cpu_registers["BX"] = random.randint(0, 255)
                pcb.state = to_state
                if to_state == ProcessState.READY:
                    self._ready_queue.append(from_pid)
                elif to_state == ProcessState.WAITING:
                    self._waiting_queue.append(from_pid)

        self._context_switches += 1
        self._log_event(
            LogLevel.INFO,
            f"Context switch #{self._context_switches}: PID {from_pid} → {'idle' if not self._ready_queue else 'next'}",
            pid=from_pid,
            interrupt_type="ContextSwitch",
        )
        self._schedule_next()

    def _terminate_process(self, pid: int, reason: str = "Completed"):
        pcb = self._processes.get(pid)
        if not pcb:
            return

        # Remove from queues
        if pid in self._ready_queue:
            self._ready_queue.remove(pid)
        if pid in self._waiting_queue:
            self._waiting_queue.remove(pid)

        pcb.state = ProcessState.TERMINATED
        pcb.completion_time = self._sim_time
        self._release_frames(pid)
        self._processes_completed += 1

        if self._running_pid == pid:
            self._running_pid = None

        level = LogLevel.WARN if reason != "Completed" else LogLevel.SUCCESS
        self._log_event(level, f"PID {pid} ({pcb.name}) terminated. Reason: {reason}.", pid=pid)

        if self._running_pid is None:
            self._schedule_next()

    # ── Interrupt Handling ────────────────────────────────────────────────────

    def trigger_interrupt(self, interrupt_type: str, pid: Optional[int] = None):
        itype = interrupt_type.lower()

        if itype == "timer":
            self._handle_timer_interrupt()
        elif itype == "io":
            self._handle_io_interrupt(pid)
        elif itype == "syscall":
            self._handle_syscall_interrupt(pid)
        else:
            raise SimulationError(f"Unknown interrupt type: {interrupt_type}")

    def _handle_timer_interrupt(self):
        """Timer interrupt: force context switch."""
        self._log_event(LogLevel.WARN, "INTERRUPT: Timer fired — quantum expired.", interrupt_type="Timer")
        if self._running_pid is not None:
            self._context_switch(self._running_pid, ProcessState.READY)
        else:
            self._log_event(LogLevel.INFO, "Timer interrupt: no running process.")

    def _handle_io_interrupt(self, pid: Optional[int]):
        """I/O interrupt: move a waiting process back to ready."""
        if pid is not None:
            pcb = self._processes.get(pid)
            if not pcb:
                raise SimulationError(f"PID {pid} does not exist.")
            if pcb.state != ProcessState.WAITING:
                raise SimulationError(f"PID {pid} is not in Waiting state (current: {pcb.state.value}).")
            pcb.state = ProcessState.READY
            self._waiting_queue.discard(pid) if hasattr(self._waiting_queue, 'discard') else None
            if pid in self._waiting_queue:
                self._waiting_queue.remove(pid)
            self._ready_queue.append(pid)
            self._log_event(LogLevel.SUCCESS, f"INTERRUPT: I/O complete for PID {pid} → moved to Ready.", pid=pid, interrupt_type="I/O")
        else:
            # Pick a random waiting process
            if self._waiting_queue:
                target_pid = self._waiting_queue[0]
                self._handle_io_interrupt(target_pid)
            else:
                self._log_event(LogLevel.INFO, "I/O Interrupt: no processes in Waiting state.")

        if self._running_pid is None:
            self._schedule_next()

    def _handle_syscall_interrupt(self, pid: Optional[int]):
        """Syscall: move running or specified process to Waiting."""
        target = pid if pid is not None else self._running_pid
        if target is None:
            self._log_event(LogLevel.INFO, "Syscall: no target process.")
            return
        pcb = self._processes.get(target)
        if not pcb or pcb.state == ProcessState.TERMINATED:
            raise SimulationError(f"PID {target} is not available for syscall.")

        self._log_event(LogLevel.INFO, f"INTERRUPT: Syscall from PID {target} — process moved to Waiting.", pid=target, interrupt_type="Syscall")

        if pcb.state == ProcessState.RUNNING:
            self._context_switch(target, ProcessState.WAITING)
        else:
            pcb.state = ProcessState.WAITING
            if target in self._ready_queue:
                self._ready_queue.remove(target)
            self._waiting_queue.append(target)

    def inject_page_fault(self, pid: int):
        """Manually inject a page fault for a process."""
        pcb = self._processes.get(pid)
        if not pcb:
            raise SimulationError(f"PID {pid} does not exist.")
        if pcb.state == ProcessState.TERMINATED:
            raise SimulationError(f"PID {pid} is terminated.")

        self._page_faults += 1
        self._log_event(LogLevel.WARN, f"PAGE FAULT: PID {pid} accessed unmapped page.", pid=pid, interrupt_type="PageFault")

        # Find an invalid page and try to allocate a frame
        faulted_page = None
        for entry in pcb.page_table:
            if not entry.valid:
                faulted_page = entry
                break

        if faulted_page is None:
            # All pages are valid; mark a random one as faulted then re-map
            faulted_page = random.choice(pcb.page_table)
            if faulted_page.frame_number is not None:
                del self._frame_owner[faulted_page.frame_number]
                self._free_frames.append(faulted_page.frame_number)
                self._free_frames.sort()
            faulted_page.valid = False
            faulted_page.frame_number = None

        if self._free_frames:
            frame = self._free_frames.pop(0)
            faulted_page.frame_number = frame
            faulted_page.valid = True
            self._frame_owner[frame] = pid
            self._log_event(LogLevel.SUCCESS, f"PAGE FAULT resolved: PID {pid}, page {faulted_page.page_number} → frame {frame}.", pid=pid)
        else:
            self._log_event(LogLevel.ERROR, f"PAGE FAULT: PID {pid} — memory exhausted, no free frames.", pid=pid)
            self._handle_error(pid, "MemoryExhaustion", f"No free frames for PID {pid}")

    # ── Error Handling ────────────────────────────────────────────────────────

    def _handle_error(self, pid: int, error_type: str, detail: str):
        """Respond to a detected error condition per SRS §3.5.2."""
        self._log_event(LogLevel.ERROR, f"ERROR [{error_type}]: {detail} — PID {pid} terminated.", pid=pid)
        self._terminate_process(pid, reason=f"Error: {error_type}")

    # ── Simulation Step ───────────────────────────────────────────────────────

    def step(self):
        """Advance simulation by one time unit."""
        self._step_count += 1
        self._sim_time = round(self._sim_time + 1.0, 1)

        # Move all NEW processes to READY (admit)
        for pcb in list(self._processes.values()):
            if pcb.state == ProcessState.NEW:
                pcb.state = ProcessState.READY
                self._ready_queue.append(pcb.pid)

        running = self._running_pid
        if running is None:
            self._schedule_next()
            return

        pcb = self._processes.get(running)
        if not pcb or pcb.state != ProcessState.RUNNING:
            self._schedule_next()
            return

        self._cpu_busy_steps += 1

        # Advance program counter and time
        pcb.program_counter += random.randint(1, 8)
        pcb.time_used += 1
        pcb.quantum_remaining -= 1

        # Simulate register activity
        pcb.cpu_registers["AX"] = (pcb.cpu_registers["AX"] + random.randint(0, 15)) & 0xFF
        pcb.cpu_registers["CX"] = pcb.time_used & 0xFF

        # Random events
        r = random.random()
        if r < 0.04 and len([p for p in self._processes.values() if p.state == ProcessState.RUNNING]) > 0:
            # Simulate I/O request (syscall)
            self._log_event(LogLevel.INFO, f"PID {running} issued I/O request.", pid=running)
            self._context_switch(running, ProcessState.WAITING)
            return

        if r < 0.08:
            # Simulate process completion
            self._log_event(LogLevel.SUCCESS, f"PID {running} completed execution.", pid=running)
            self._terminate_process(running, reason="Completed")
            # Track throughput
            self._throughput_history.append({"time": self._sim_time, "completed": self._processes_completed})
            if len(self._throughput_history) > 50:
                self._throughput_history = self._throughput_history[-50:]
            return

        # Quantum expiry → timer interrupt
        if pcb.quantum_remaining <= 0:
            self._log_event(LogLevel.WARN, f"PID {running} quantum expired — timer interrupt.", pid=running, interrupt_type="Timer")
            self._context_switch(running, ProcessState.READY)

    # ── State Export ──────────────────────────────────────────────────────────

    def get_state(self) -> dict:
        total_steps = max(self._step_count, 1)
        cpu_util = round((self._cpu_busy_steps / total_steps) * 100, 1)

        # Build physical frame grid
        frame_grid = []
        for f in range(TOTAL_FRAMES):
            owner = self._frame_owner.get(f)
            frame_grid.append({
                "frame": f,
                "pid": owner,
                "free": owner is None,
            })

        return {
            "sim_time": self._sim_time,
            "step_count": self._step_count,
            "quantum": self._quantum,
            "running_pid": self._running_pid,
            "ready_queue": list(self._ready_queue),
            "waiting_queue": list(self._waiting_queue),
            "processes": {pid: pcb.to_dict() for pid, pcb in self._processes.items()},
            "frame_grid": frame_grid,
            "free_frames": len(self._free_frames),
            "total_frames": TOTAL_FRAMES,
            "context_switches": self._context_switches,
            "page_faults": self._page_faults,
            "processes_completed": self._processes_completed,
            "cpu_utilisation": cpu_util,
            "throughput_history": self._throughput_history[-20:],
            "log": [e.to_dict() for e in self._log[-100:]],
        }
