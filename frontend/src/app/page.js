'use client'
import { useState, useEffect, useRef, useCallback, useReducer } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const API = "http://localhost:8000";
const POLL_MS = 800;

const STATE_COLORS = {
  Running: "#00ff88",
  Ready: "#4fc3f7",
  Waiting: "#ffb74d",
  New: "#ce93d8",
  Terminated: "#ef5350",
};

const DESKTOP_ICONS = [
  { id: "processes", label: "Process Manager", icon: "⚙️" },
  { id: "memory", label: "Memory Viewer", icon: "🧠" },
  { id: "interrupts", label: "Interrupt Console", icon: "⚡" },
  { id: "analytics", label: "Analytics", icon: "📊" },
  { id: "console", label: "System Console", icon: "📟" },
  { id: "settings", label: "Settings", icon: "🔧" },
];

const INITIAL_WINDOW_POSITIONS = {
  processes: { x: 60, y: 60, w: 520, h: 420 },
  memory: { x: 620, y: 60, w: 480, h: 400 },
  interrupts: { x: 60, y: 510, w: 380, h: 300 },
  analytics: { x: 620, y: 490, w: 460, h: 320 },
  console: { x: 460, y: 510, w: 420, h: 300 },
  settings: { x: 300, y: 180, w: 360, h: 280 },
};

// ─── Utility ─────────────────────────────────────────────────────────────────
function fmtTime(t) {
  return typeof t === "number" ? t.toFixed(1) + "s" : "—";
}

function ago(ts) {
  const d = Date.now() / 1000 - ts;
  if (d < 60) return `${d.toFixed(0)}s ago`;
  return `${(d / 60).toFixed(0)}m ago`;
}

// ─── API helpers ─────────────────────────────────────────────────────────────
async function apiFetch(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API + path, opts);
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }));
    throw new Error(err.detail || r.statusText);
  }
  return r.json();
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function ToastContainer({ toasts }) {
  return (
    <div style={{
      position: "fixed", bottom: 52, right: 16, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end",
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "error" ? "#c62828" : t.type === "warn" ? "#e65100" : "#1b5e20",
          color: "#fff", padding: "8px 16px", borderRadius: 6,
          fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          border: `1px solid ${t.type === "error" ? "#ef9a9a" : t.type === "warn" ? "#ffcc80" : "#69f0ae"}`,
          animation: "slideIn 0.2s ease",
          maxWidth: 320,
        }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── Boot Screen ─────────────────────────────────────────────────────────────
function BootScreen({ onDone }) {
  const [progress, setProgress] = useState(0);
  const [line, setLine] = useState("Initialising KernelLab...");
  const LINES = [
    "Loading simulation engine...",
    "Mounting memory subsystem...",
    "Initialising PCB tables...",
    "Starting Round Robin scheduler...",
    "Binding interrupt handlers...",
    "KernelLab ready.",
  ];
  useEffect(() => {
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 18 + 5;
      if (p >= 100) { p = 100; clearInterval(iv); setTimeout(onDone, 400); }
      setProgress(Math.min(p, 100));
      setLine(LINES[Math.min(Math.floor((p / 100) * LINES.length), LINES.length - 1)]);
    }, 180);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'JetBrains Mono', monospace", color: "#00ff88", zIndex: 99999,
    }}>
      <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: 8, marginBottom: 8 }}>KERNELLAB</div>
      <div style={{ fontSize: 13, color: "#4fc3f7", marginBottom: 40, letterSpacing: 2 }}>OS SIMULATION PLATFORM v1.0</div>
      <div style={{
        width: 400, height: 4, background: "#111", borderRadius: 2, overflow: "hidden", marginBottom: 16,
        border: "1px solid #00ff8840",
      }}>
        <div style={{
          width: `${progress}%`, height: "100%", background: "#00ff88",
          transition: "width 0.18s ease",
          boxShadow: "0 0 12px #00ff88",
        }} />
      </div>
      <div style={{ fontSize: 11, color: "#4fc3f7", letterSpacing: 1 }}>{line}</div>
      <div style={{ fontSize: 10, color: "#333", marginTop: 40 }}>© 2026 KernelLab Academic Edition</div>
    </div>
  );
}

// ─── Draggable Window ─────────────────────────────────────────────────────────
function Window({ id, title, icon, children, pos, onMove, onClose, onFocus, zIndex, minimized, onMinimize, width, height }) {
  const headerRef = useRef(null);
  const dragState = useRef(null);
  const [size, setSize] = useState({ w: width || 480, h: height || 400 });

  const onMouseDown = useCallback((e) => {
    if (e.target.closest(".win-ctrl")) return;
    onFocus(id);
    dragState.current = { ox: e.clientX - pos.x, oy: e.clientY - pos.y };
    const move = (ev) => {
      onMove(id, {
        x: Math.max(0, ev.clientX - dragState.current.ox),
        y: Math.max(0, ev.clientY - dragState.current.oy),
      });
    };
    const up = () => { dragState.current = null; window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    e.preventDefault();
  }, [pos, id, onFocus, onMove]);

  if (minimized) return null;

  return (
    <div
      onMouseDown={() => onFocus(id)}
      style={{
        position: "absolute", left: pos.x, top: pos.y,
        width: size.w, height: size.h,
        background: "rgba(10,14,20,0.97)",
        border: "1px solid #1e3a5f",
        borderRadius: 8,
        boxShadow: zIndex > 10 ? "0 8px 40px rgba(0,200,255,0.15), 0 2px 8px rgba(0,0,0,0.8)" : "0 4px 20px rgba(0,0,0,0.7)",
        zIndex,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        userSelect: "none",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {/* Title Bar */}
      <div
        ref={headerRef}
        onMouseDown={onMouseDown}
        style={{
          background: "linear-gradient(90deg, #0d1b2a 0%, #1a2a3a 100%)",
          padding: "6px 10px",
          display: "flex", alignItems: "center", gap: 8,
          cursor: "grab", borderBottom: "1px solid #1e3a5f",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ flex: 1, fontSize: 11, color: "#7ec8e3", letterSpacing: 1, fontWeight: 700 }}>{title}</span>
        <div style={{ display: "flex", gap: 5 }} className="win-ctrl">
          <button onClick={() => onMinimize(id)} style={btnStyle("#e6a817")}>─</button>
          <button onClick={() => onClose(id)} style={btnStyle("#ef5350")}>✕</button>
        </div>
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 12, userSelect: "text" }}>
        {children}
      </div>
    </div>
  );
}

function btnStyle(color) {
  return {
    width: 14, height: 14, borderRadius: "50%",
    background: color, border: "none", cursor: "pointer",
    fontSize: 8, color: "rgba(0,0,0,0.6)", display: "flex",
    alignItems: "center", justifyContent: "center",
    padding: 0,
  };
}

// ─── PCB Detail ───────────────────────────────────────────────────────────────
function PCBDetail({ pcb }) {
  if (!pcb) return <div style={{ color: "#666", fontSize: 11 }}>Select a process to inspect its PCB.</div>;
  const stateColor = STATE_COLORS[pcb.state] || "#aaa";
  return (
    <div style={{ fontSize: 11 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          ["PID", pcb.pid],
          ["Name", pcb.name],
          ["State", <span style={{ color: stateColor, fontWeight: 700 }}>{pcb.state}</span>],
          ["Priority", pcb.priority],
          ["PC", `0x${pcb.program_counter.toString(16).padStart(4, "0")}`],
          ["Time Used", pcb.time_used],
          ["Quantum Left", pcb.quantum_remaining],
          ["Mem Base", `0x${pcb.memory_base.toString(16)}`],
          ["Mem Limit", `0x${pcb.memory_limit.toString(16)}`],
        ].map(([k, v]) => (
          <div key={k} style={{ background: "#0d1b2a", borderRadius: 4, padding: "4px 8px", border: "1px solid #1e3a5f" }}>
            <div style={{ color: "#4fc3f7", fontSize: 9, marginBottom: 2 }}>{k}</div>
            <div style={{ color: "#e0f0ff" }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ color: "#4fc3f7", fontSize: 9, marginBottom: 4 }}>CPU REGISTERS</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {Object.entries(pcb.cpu_registers).map(([k, v]) => (
            <div key={k} style={{ background: "#0a1420", border: "1px solid #1e3a5f", borderRadius: 3, padding: "2px 6px", fontSize: 10 }}>
              <span style={{ color: "#4fc3f7" }}>{k}:</span> <span style={{ color: "#00ff88" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ color: "#4fc3f7", fontSize: 9, marginBottom: 4 }}>PAGE TABLE</div>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {pcb.page_table.map(e => (
            <div key={e.page_number} style={{
              background: e.valid ? "#0a2a0a" : "#2a0a0a",
              border: `1px solid ${e.valid ? "#00ff88" : "#ef5350"}`,
              borderRadius: 3, padding: "2px 5px", fontSize: 9,
            }}>
              P{e.page_number}→{e.valid ? `F${e.frame_number}` : "—"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Process Manager Panel ────────────────────────────────────────────────────
function ProcessManagerPanel({ state, onAction, onToast }) {
  const [selected, setSelected] = useState(null);
  const [newName, setNewName] = useState("");
  const [newPriority, setNewPriority] = useState(1);
  const [newPages, setNewPages] = useState(4);

  const procs = state ? Object.values(state.processes).filter(p => p.state !== "Terminated") : [];
  const terminated = state ? Object.values(state.processes).filter(p => p.state === "Terminated") : [];
  const selPCB = selected != null && state ? state.processes[selected] : null;

  const handleAdd = async () => {
    try {
      await apiFetch("/process/add", "POST", { name: newName || null, priority: newPriority, num_pages: newPages });
      onAction();
      setNewName("");
      onToast("Process added.", "success");
    } catch (e) { onToast(e.message, "error"); }
  };

  const handleKill = async () => {
    if (selected == null) return;
    try {
      await apiFetch("/process/kill", "POST", { pid: selected });
      onAction(); setSelected(null);
      onToast(`PID ${selected} killed.`, "warn");
    } catch (e) { onToast(e.message, "error"); }
  };

  const handlePriorityChange = async (pid, p) => {
    try {
      await apiFetch("/process/priority", "POST", { pid, priority: Number(p) });
      onAction(); onToast(`PID ${pid} priority → ${p}`, "success");
    } catch (e) { onToast(e.message, "error"); }
  };

  return (
    <div style={{ fontSize: 11, display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
      {/* Add process */}
      <div style={{ background: "#0a1420", border: "1px solid #1e3a5f", borderRadius: 6, padding: 8 }}>
        <div style={{ color: "#4fc3f7", fontSize: 9, marginBottom: 6, letterSpacing: 1 }}>NEW PROCESS</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name (optional)"
            style={inputStyle} />
          <label style={{ color: "#888", fontSize: 10 }}>Pri:
            <input type="number" min={1} max={10} value={newPriority}
              onChange={e => setNewPriority(Number(e.target.value))}
              style={{ ...inputStyle, width: 40, marginLeft: 4 }} />
          </label>
          <label style={{ color: "#888", fontSize: 10 }}>Pages:
            <input type="number" min={1} max={16} value={newPages}
              onChange={e => setNewPages(Number(e.target.value))}
              style={{ ...inputStyle, width: 40, marginLeft: 4 }} />
          </label>
          <button onClick={handleAdd} style={actionBtn("#00ff88", "#000")}>+ Add</button>
        </div>
      </div>

      {/* Process list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ color: "#4fc3f7", fontSize: 9, marginBottom: 4, letterSpacing: 1 }}>
          ACTIVE PROCESSES ({procs.length})
        </div>
        {procs.length === 0 && <div style={{ color: "#444", fontStyle: "italic" }}>No active processes.</div>}
        {procs.map(p => (
          <div
            key={p.pid}
            onClick={() => setSelected(p.pid === selected ? null : p.pid)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "5px 8px", borderRadius: 4, marginBottom: 3, cursor: "pointer",
              background: selected === p.pid ? "#1a2a3a" : "#0a1420",
              border: `1px solid ${selected === p.pid ? "#4fc3f7" : "#1e3a5f"}`,
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: STATE_COLORS[p.state] || "#666",
              boxShadow: `0 0 6px ${STATE_COLORS[p.state] || "#666"}`,
              flexShrink: 0,
            }} />
            <span style={{ color: "#7ec8e3", width: 32 }}>P{p.pid}</span>
            <span style={{ flex: 1, color: "#c0d8f0" }}>{p.name}</span>
            <span style={{ color: STATE_COLORS[p.state], fontSize: 9, width: 62 }}>{p.state}</span>
            <span style={{ color: "#666", fontSize: 9, width: 28 }}>pr:{p.priority}</span>
            {p.state !== "Terminated" && (
              <select
                value={p.priority}
                onClick={e => e.stopPropagation()}
                onChange={e => { e.stopPropagation(); handlePriorityChange(p.pid, e.target.value); }}
                style={{ background: "#0d1b2a", border: "1px solid #1e3a5f", color: "#4fc3f7", borderRadius: 3, fontSize: 9, padding: "1px 2px" }}
              >
                {[1,2,3,4,5,6,7,8,9,10].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            )}
          </div>
        ))}
        {terminated.length > 0 && (
          <>
            <div style={{ color: "#555", fontSize: 9, marginTop: 6, marginBottom: 4, letterSpacing: 1 }}>
              TERMINATED ({terminated.length})
            </div>
            {terminated.slice(-5).map(p => (
              <div key={p.pid} style={{
                display: "flex", gap: 8, padding: "3px 8px", borderRadius: 3,
                background: "#0a0a0a", border: "1px solid #1a1a1a", marginBottom: 2, opacity: 0.5,
              }}>
                <span style={{ color: "#ef5350", width: 32 }}>P{p.pid}</span>
                <span style={{ flex: 1, color: "#666" }}>{p.name}</span>
                <span style={{ color: "#ef5350", fontSize: 9 }}>Terminated</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* PCB detail */}
      {selPCB && (
        <div style={{ borderTop: "1px solid #1e3a5f", paddingTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ color: "#4fc3f7", fontSize: 9, letterSpacing: 1 }}>PCB — PID {selPCB.pid}</div>
            {selPCB.state !== "Terminated" && (
              <button onClick={handleKill} style={actionBtn("#ef5350", "#fff")}>☠ Kill</button>
            )}
          </div>
          <PCBDetail pcb={selPCB} />
        </div>
      )}
    </div>
  );
}

// ─── Memory Panel ─────────────────────────────────────────────────────────────
function MemoryPanel({ state }) {
  const [selectedPid, setSelectedPid] = useState(null);
  if (!state) return <div style={{ color: "#666" }}>Loading...</div>;

  const procs = Object.values(state.processes).filter(p => p.state !== "Terminated");
  const pidColors = {};
  const palette = ["#4fc3f7","#00ff88","#ffb74d","#ce93d8","#f48fb1","#80cbc4","#fff176","#ef9a9a"];
  procs.forEach((p, i) => { pidColors[p.pid] = palette[i % palette.length]; });

  return (
    <div style={{ fontSize: 11 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        <Metric label="Free Frames" val={state.free_frames} color="#00ff88" />
        <Metric label="Used Frames" val={state.total_frames - state.free_frames} color="#ffb74d" />
        <Metric label="Page Faults" val={state.page_faults} color="#ef5350" />
      </div>

      {/* Frame grid */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ color: "#4fc3f7", fontSize: 9, marginBottom: 4, letterSpacing: 1 }}>PHYSICAL FRAME MAP ({state.total_frames} frames)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 3 }}>
          {state.frame_grid.map(f => (
            <div
              key={f.frame}
              title={f.free ? `Frame ${f.frame}: Free` : `Frame ${f.frame}: PID ${f.pid}`}
              style={{
                height: 24, borderRadius: 3,
                background: f.free ? "#0a1420" : pidColors[f.pid] || "#666",
                border: `1px solid ${f.free ? "#1e3a5f" : "transparent"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, color: f.free ? "#333" : "#000", fontWeight: 700,
                cursor: "default",
                opacity: f.free ? 0.6 : 1,
              }}
            >
              {f.free ? "" : `P${f.pid}`}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "#888" }}>
          <div style={{ width: 10, height: 10, background: "#0a1420", border: "1px solid #1e3a5f", borderRadius: 2 }} />
          Free
        </div>
        {procs.map(p => (
          <div key={p.pid} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "#aaa" }}>
            <div style={{ width: 10, height: 10, background: pidColors[p.pid], borderRadius: 2 }} />
            P{p.pid} ({p.name})
          </div>
        ))}
      </div>

      {/* Page table viewer */}
      <div style={{ borderTop: "1px solid #1e3a5f", paddingTop: 8 }}>
        <div style={{ color: "#4fc3f7", fontSize: 9, marginBottom: 4, letterSpacing: 1 }}>PAGE TABLE VIEWER</div>
        <select
          value={selectedPid || ""}
          onChange={e => setSelectedPid(e.target.value ? Number(e.target.value) : null)}
          style={{ ...inputStyle, width: "100%", marginBottom: 6 }}
        >
          <option value="">— Select Process —</option>
          {procs.map(p => <option key={p.pid} value={p.pid}>PID {p.pid} — {p.name}</option>)}
        </select>
        {selectedPid && state.processes[selectedPid] && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {state.processes[selectedPid].page_table.map(e => (
              <div key={e.page_number} style={{
                background: e.valid ? "#0a2a0a" : "#2a0a0a",
                border: `1px solid ${e.valid ? "#00ff88" : "#ef5350"}`,
                borderRadius: 4, padding: "4px 8px", fontSize: 10, textAlign: "center",
              }}>
                <div style={{ color: "#888", fontSize: 8 }}>PAGE {e.page_number}</div>
                <div style={{ color: e.valid ? "#00ff88" : "#ef5350", fontWeight: 700 }}>
                  {e.valid ? `Frame ${e.frame_number}` : "INVALID"}
                </div>
                <div style={{ color: "#555", fontSize: 8 }}>
                  {e.valid ? `→ 0x${(e.frame_number * 256).toString(16).toUpperCase()}` : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Interrupt Panel ──────────────────────────────────────────────────────────
function InterruptPanel({ state, onAction, onToast }) {
  const [selPid, setSelPid] = useState(null);
  const procs = state ? Object.values(state.processes).filter(p => p.state !== "Terminated") : [];

  const fire = async (type) => {
    try {
      await apiFetch("/interrupt/trigger", "POST", { interrupt_type: type, pid: selPid || null });
      onAction(); onToast(`${type} interrupt fired.`, "warn");
    } catch (e) { onToast(e.message, "error"); }
  };

  const pageFault = async () => {
    if (!selPid) return onToast("Select a process first.", "error");
    try {
      await apiFetch("/memory/page_fault", "POST", { pid: selPid });
      onAction(); onToast(`Page fault injected for PID ${selPid}.`, "warn");
    } catch (e) { onToast(e.message, "error"); }
  };

  const interruptBtns = [
    { label: "⏱ Timer Interrupt", type: "timer", color: "#ffb74d" },
    { label: "💾 I/O Interrupt", type: "io", color: "#4fc3f7" },
    { label: "🔧 Syscall", type: "syscall", color: "#ce93d8" },
  ];

  return (
    <div style={{ fontSize: 11 }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ color: "#4fc3f7", fontSize: 9, marginBottom: 4, letterSpacing: 1 }}>TARGET PID (optional)</div>
        <select value={selPid || ""} onChange={e => setSelPid(e.target.value ? Number(e.target.value) : null)}
          style={{ ...inputStyle, width: "100%" }}>
          <option value="">— Auto (current running) —</option>
          {procs.map(p => <option key={p.pid} value={p.pid}>PID {p.pid} — {p.name} [{p.state}]</option>)}
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        {interruptBtns.map(b => (
          <button key={b.type} onClick={() => fire(b.type)}
            style={{ ...actionBtn(b.color, "#000"), width: "100%", padding: "8px 12px", fontSize: 11, textAlign: "left" }}>
            {b.label}
          </button>
        ))}
        <button onClick={pageFault}
          style={{ ...actionBtn("#ef5350", "#fff"), width: "100%", padding: "8px 12px", fontSize: 11, textAlign: "left" }}>
          ⚠ Inject Page Fault
        </button>
      </div>

      {state && (
        <div style={{ background: "#0a1420", border: "1px solid #1e3a5f", borderRadius: 6, padding: 8 }}>
          <div style={{ color: "#4fc3f7", fontSize: 9, marginBottom: 4, letterSpacing: 1 }}>INTERRUPT STATS</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Metric label="Context Switches" val={state.context_switches} color="#4fc3f7" />
            <Metric label="Page Faults" val={state.page_faults} color="#ef5350" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────
function AnalyticsPanel({ state }) {
  const historyRef = useRef([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!state) return;
    historyRef.current.push({
      time: state.sim_time,
      cpu: state.cpu_utilisation,
      faults: state.page_faults,
      switches: state.context_switches,
    });
    if (historyRef.current.length > 60) historyRef.current.shift();
    drawChart();
  }, [state]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const data = historyRef.current;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#0a1420";
    ctx.fillRect(0, 0, W, H);

    if (data.length < 2) return;

    // Grid
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = (H / 4) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // CPU line (green)
    const drawLine = (values, color, maxVal = 100) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      data.forEach((d, i) => {
        const x = (i / (data.length - 1)) * W;
        const y = H - (values[i] / maxVal) * H;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    drawLine(data.map(d => d.cpu), "#00ff88");
    drawLine(data.map(d => Math.min(d.faults * 5, 100)), "#ef5350");
    drawLine(data.map(d => Math.min(d.switches * 3, 100)), "#4fc3f7");
  };

  if (!state) return <div style={{ color: "#666" }}>Loading...</div>;

  const completed = state.processes_completed;
  const elapsed = state.sim_time;
  const throughput = elapsed > 0 ? (completed / elapsed).toFixed(2) : "0.00";

  return (
    <div style={{ fontSize: 11 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <Metric label="CPU Utilisation" val={`${state.cpu_utilisation}%`} color="#00ff88" />
        <Metric label="Page Fault Rate" val={state.page_faults} color="#ef5350" />
        <Metric label="Context Switches" val={state.context_switches} color="#4fc3f7" />
        <Metric label="Throughput" val={`${throughput}/s`} color="#ce93d8" />
        <Metric label="Sim Time" val={fmtTime(state.sim_time)} color="#ffb74d" />
        <Metric label="Completed" val={state.processes_completed} color="#80cbc4" />
      </div>

      <div style={{ marginBottom: 6 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 4, fontSize: 9, color: "#666" }}>
          <span style={{ color: "#00ff88" }}>── CPU%</span>
          <span style={{ color: "#ef5350" }}>── Faults×5</span>
          <span style={{ color: "#4fc3f7" }}>── Switches×3</span>
        </div>
        <canvas ref={canvasRef} width={420} height={100}
          style={{ width: "100%", height: 100, borderRadius: 4, border: "1px solid #1e3a5f" }} />
      </div>

      {/* CPU utilisation bar */}
      <div style={{ background: "#0a1420", border: "1px solid #1e3a5f", borderRadius: 6, padding: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ color: "#4fc3f7", fontSize: 9 }}>CPU UTILISATION</span>
          <span style={{ color: "#00ff88", fontSize: 9 }}>{state.cpu_utilisation}%</span>
        </div>
        <div style={{ height: 8, background: "#0d1b2a", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            width: `${state.cpu_utilisation}%`, height: "100%",
            background: state.cpu_utilisation > 80 ? "#ef5350" : state.cpu_utilisation > 50 ? "#ffb74d" : "#00ff88",
            transition: "width 0.4s ease",
            boxShadow: "0 0 8px currentColor",
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── Console Panel ────────────────────────────────────────────────────────────
function ConsolePanel({ state }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [state?.log]);

  const levelColor = { INFO: "#4fc3f7", WARN: "#ffb74d", ERROR: "#ef5350", SUCCESS: "#00ff88" };

  if (!state) return <div style={{ color: "#666" }}>Loading...</div>;

  return (
    <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
      {state.log.length === 0 && <div style={{ color: "#444" }}>No events yet.</div>}
      {state.log.map((e, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 2, alignItems: "flex-start" }}>
          <span style={{ color: "#555", flexShrink: 0 }}>[{e.timestamp.toFixed(1)}]</span>
          <span style={{
            color: levelColor[e.level] || "#aaa",
            flexShrink: 0, width: 52, fontSize: 9,
            background: `${levelColor[e.level]}20`,
            borderRadius: 2, padding: "0 3px",
          }}>{e.level}</span>
          {e.pid != null && <span style={{ color: "#888", flexShrink: 0 }}>P{e.pid}</span>}
          <span style={{ color: "#c0d8f0" }}>{e.message}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function SettingsPanel({ state, onAction, onToast, quantum, setQuantum }) {
  const [localQ, setLocalQ] = useState(quantum);

  const handleStep = async () => {
    try {
      await apiFetch("/simulation/step", "POST");
      onAction(); onToast("Stepped simulation.", "success");
    } catch (e) { onToast(e.message, "error"); }
  };

  const handleReset = async () => {
    try {
      await apiFetch("/simulation/reset", "POST");
      onAction(); onToast("Simulation reset.", "warn");
    } catch (e) { onToast(e.message, "error"); }
  };

  const handleSetQuantum = async () => {
    try {
      await apiFetch("/scheduler/quantum", "POST", { quantum: localQ });
      setQuantum(localQ);
      onAction(); onToast(`Quantum set to ${localQ}.`, "success");
    } catch (e) { onToast(e.message, "error"); }
  };

  return (
    <div style={{ fontSize: 11, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ background: "#0a1420", border: "1px solid #1e3a5f", borderRadius: 6, padding: 8 }}>
        <div style={{ color: "#4fc3f7", fontSize: 9, marginBottom: 6, letterSpacing: 1 }}>SCHEDULER CONFIG</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ color: "#888" }}>Time Quantum:
            <input type="number" min={1} max={100} value={localQ}
              onChange={e => setLocalQ(Number(e.target.value))}
              style={{ ...inputStyle, width: 50, marginLeft: 6 }} />
          </label>
          <button onClick={handleSetQuantum} style={actionBtn("#4fc3f7", "#000")}>Apply</button>
        </div>
        <div style={{ color: "#555", fontSize: 9, marginTop: 4 }}>Current: {state?.quantum ?? quantum} steps</div>
      </div>

      <div style={{ background: "#0a1420", border: "1px solid #1e3a5f", borderRadius: 6, padding: 8 }}>
        <div style={{ color: "#4fc3f7", fontSize: 9, marginBottom: 6, letterSpacing: 1 }}>SIMULATION CONTROLS</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={handleStep} style={actionBtn("#4fc3f7", "#000")}>⏭ Step</button>
          <button onClick={handleReset} style={actionBtn("#ef5350", "#fff")}>🔄 Reset</button>
        </div>
      </div>

      {state && (
        <div style={{ background: "#0a1420", border: "1px solid #1e3a5f", borderRadius: 6, padding: 8 }}>
          <div style={{ color: "#4fc3f7", fontSize: 9, marginBottom: 6, letterSpacing: 1 }}>SYSTEM INFO</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 10 }}>
            <div style={{ color: "#888" }}>Sim Time: <span style={{ color: "#e0f0ff" }}>{fmtTime(state.sim_time)}</span></div>
            <div style={{ color: "#888" }}>Steps: <span style={{ color: "#e0f0ff" }}>{state.step_count}</span></div>
            <div style={{ color: "#888" }}>Scheduler: <span style={{ color: "#00ff88" }}>Round Robin</span></div>
            <div style={{ color: "#888" }}>Max Procs: <span style={{ color: "#e0f0ff" }}>20</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Metric pill ──────────────────────────────────────────────────────────────
function Metric({ label, val, color }) {
  return (
    <div style={{
      background: "#0d1b2a", border: `1px solid ${color}40`,
      borderRadius: 6, padding: "4px 10px", minWidth: 80,
    }}>
      <div style={{ color: "#666", fontSize: 8, marginBottom: 1 }}>{label}</div>
      <div style={{ color, fontSize: 14, fontWeight: 700 }}>{val}</div>
    </div>
  );
}

// ─── Common styles ────────────────────────────────────────────────────────────
const inputStyle = {
  background: "#0d1b2a", border: "1px solid #1e3a5f",
  color: "#c0d8f0", borderRadius: 4, padding: "3px 6px",
  fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
  outline: "none",
};

function actionBtn(bg, fg) {
  return {
    background: bg, color: fg, border: "none", borderRadius: 4,
    padding: "4px 10px", cursor: "pointer", fontSize: 10,
    fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
    letterSpacing: 0.5,
  };
}

// ─── Landing Page ─────────────────────────────────────────────────────────────
function LandingPage({ onLaunch }) {
  return (
    <div style={{
      minHeight: "100vh", background: "#000",
      fontFamily: "'JetBrains Mono', monospace",
      display: "flex", flexDirection: "column", alignItems: "center",
      color: "#e0f0ff", overflowY: "auto",
    }}>
      {/* Hero */}
      <div style={{
        width: "100%", padding: "80px 24px 60px",
        background: "radial-gradient(ellipse at 50% 0%, #0d1b2a 0%, #000 70%)",
        textAlign: "center", borderBottom: "1px solid #1e3a5f",
      }}>
        <div style={{ fontSize: 11, color: "#4fc3f7", letterSpacing: 4, marginBottom: 16 }}>ACADEMIC EDITION v1.0</div>
        <h1 style={{
          fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 900,
          margin: "0 0 16px", letterSpacing: 6,
          background: "linear-gradient(135deg, #00ff88 0%, #4fc3f7 50%, #ce93d8 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>KERNELLAB</h1>
        <p style={{ fontSize: 16, color: "#7ec8e3", maxWidth: 600, margin: "0 auto 32px", lineHeight: 1.7 }}>
          A real-time, browser-based simulation of a multiprogramming operating system.
          Explore paging, scheduling, interrupts, and context switching through an immersive PC-style desktop.
        </p>
        <button
          onClick={onLaunch}
          style={{
            background: "linear-gradient(135deg, #00ff88, #4fc3f7)",
            color: "#000", border: "none", borderRadius: 8,
            padding: "14px 40px", fontSize: 15, fontWeight: 900,
            cursor: "pointer", letterSpacing: 2,
            boxShadow: "0 0 30px rgba(0,255,136,0.4)",
          }}
        >
          ▶ LAUNCH SIMULATOR
        </button>
      </div>

      {/* Architecture */}
      <div style={{ padding: "48px 24px", maxWidth: 900, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ color: "#4fc3f7", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>ARCHITECTURE</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Two-Tier System Design</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            {
              title: "Frontend", sub: "React / Next.js",
              color: "#4fc3f7",
              items: ["Process Dashboard", "Memory Visualization", "Interrupt Control Panel", "System Console", "Analytics Panel"],
            },
            {
              title: "Backend", sub: "FastAPI / Python",
              color: "#00ff88",
              items: ["OS Simulation Engine", "PCB & Scheduler", "Paging & Memory Module", "Interrupt & Error Handler"],
            },
          ].map(col => (
            <div key={col.title} style={{
              background: "#0a1420", border: `1px solid ${col.color}40`,
              borderRadius: 8, padding: 20,
            }}>
              <div style={{ color: col.color, fontSize: 18, fontWeight: 800, marginBottom: 2 }}>{col.title}</div>
              <div style={{ color: "#555", fontSize: 10, marginBottom: 12 }}>{col.sub}</div>
              {col.items.map(i => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, color: "#c0d8f0", fontSize: 12 }}>
                  <span style={{ color: col.color }}>▸</span> {i}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{
          textAlign: "center", marginTop: 12, padding: "10px",
          background: "#0d1b2a", border: "1px solid #1e3a5f", borderRadius: 6,
          color: "#555", fontSize: 10,
        }}>
          Communication via RESTful API (JSON / HTTP) · In-Memory State Store
        </div>
      </div>

      {/* Feature cards */}
      <div style={{ padding: "0 24px 60px", maxWidth: 900, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ color: "#4fc3f7", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>CAPABILITIES</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Core Simulator Features</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {[
            { icon: "⚙️", title: "Process Scheduling", desc: "Round Robin scheduler with configurable time quantum and up to 20 concurrent processes.", color: "#4fc3f7" },
            { icon: "🧠", title: "Memory Paging", desc: "Logical-to-physical address translation with page tables, frame allocation, and page fault handling.", color: "#00ff88" },
            { icon: "⚡", title: "Interrupt Handling", desc: "Timer, I/O, Syscall, and Page Fault interrupts with full ISR flow and context save/restore.", color: "#ffb74d" },
            { icon: "🔄", title: "Context Switching", desc: "Full PCB save/restore on every context switch with live CPU register visualization.", color: "#ce93d8" },
          ].map(f => (
            <div key={f.title} style={{
              background: "#0a1420", border: `1px solid ${f.color}30`,
              borderRadius: 8, padding: 20,
              transition: "border-color 0.2s",
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ color: f.color, fontWeight: 700, marginBottom: 6, fontSize: 13 }}>{f.title}</div>
              <div style={{ color: "#888", fontSize: 11, lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Taskbar ──────────────────────────────────────────────────────────────────
function Taskbar({ state, openWindows, onToggleWindow, onStep, onReset }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const running = state?.running_pid;
  const ready = state?.ready_queue?.length ?? 0;
  const cpu = state?.cpu_utilisation ?? 0;
  const faults = state?.page_faults ?? 0;

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, height: 44,
      background: "rgba(5,10,18,0.97)",
      borderTop: "1px solid #1e3a5f",
      display: "flex", alignItems: "center", gap: 8,
      padding: "0 10px", zIndex: 1000,
      backdropFilter: "blur(10px)",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {/* Logo */}
      <div style={{
        background: "linear-gradient(135deg, #00ff88, #4fc3f7)",
        color: "#000", fontWeight: 900, fontSize: 11,
        padding: "4px 10px", borderRadius: 4, letterSpacing: 1, cursor: "default",
        flexShrink: 0,
      }}>
        KL
      </div>

      {/* App icons */}
      {DESKTOP_ICONS.map(ic => (
        <button
          key={ic.id}
          onClick={() => onToggleWindow(ic.id)}
          title={ic.label}
          style={{
            background: openWindows.has(ic.id) ? "#1a2a3a" : "transparent",
            border: `1px solid ${openWindows.has(ic.id) ? "#4fc3f7" : "transparent"}`,
            borderRadius: 4, padding: "3px 6px", cursor: "pointer",
            fontSize: 16, lineHeight: 1,
            transition: "all 0.15s",
          }}
        >
          {ic.icon}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      {/* Status chips */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <Chip label="CPU" val={`${cpu}%`} color={cpu > 80 ? "#ef5350" : "#00ff88"} />
        <Chip label="Running" val={running != null ? `P${running}` : "idle"} color="#4fc3f7" />
        <Chip label="Ready" val={ready} color="#ffb74d" />
        <Chip label="Faults" val={faults} color="#ef5350" />
      </div>

      {/* Quick controls */}
      <button onClick={onStep} style={{ ...actionBtn("#4fc3f7", "#000"), fontSize: 9, padding: "3px 8px" }}>⏭ STEP</button>
      <button onClick={onReset} style={{ ...actionBtn("#ef5350", "#fff"), fontSize: 9, padding: "3px 8px" }}>🔄 RESET</button>

      {/* Clock */}
      <div style={{ color: "#4fc3f7", fontSize: 11, minWidth: 60, textAlign: "right" }}>
        {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
    </div>
  );
}

function Chip({ label, val, color }) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 9 }}>
      <span style={{ color: "#555" }}>{label}:</span>
      <span style={{ color, fontWeight: 700 }}>{val}</span>
    </div>
  );
}

// ─── Desktop Icons ────────────────────────────────────────────────────────────
function DesktopIconGrid({ state, onOpen }) {
  return (
    <div style={{ position: "absolute", top: 20, left: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      {DESKTOP_ICONS.map(ic => {
        let badge = null;
        if (ic.id === "processes" && state) {
          const count = Object.values(state.processes).filter(p => p.state !== "Terminated").length;
          badge = count;
        }
        if (ic.id === "memory" && state) badge = state.page_faults;

        return (
          <div
            key={ic.id}
            onDoubleClick={() => onOpen(ic.id)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", userSelect: "none", width: 64 }}
          >
            <div style={{ position: "relative" }}>
              <div style={{
                fontSize: 28, background: "rgba(10,20,35,0.7)",
                border: "1px solid #1e3a5f", borderRadius: 8,
                padding: "8px 10px",
                textAlign: "center",
                transition: "all 0.15s",
              }}>
                {ic.icon}
              </div>
              {badge != null && badge > 0 && (
                <div style={{
                  position: "absolute", top: -4, right: -4,
                  background: "#ef5350", color: "#fff", borderRadius: "50%",
                  width: 16, height: 16, fontSize: 9, display: "flex",
                  alignItems: "center", justifyContent: "center", fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {badge > 9 ? "9+" : badge}
                </div>
              )}
            </div>
            <span style={{ fontSize: 9, color: "#c0d8f0", textAlign: "center", lineHeight: 1.3, textShadow: "0 1px 4px #000" }}>
              {ic.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Start Menu ───────────────────────────────────────────────────────────────
function StartMenu({ onOpen, onClose }) {
  return (
    <div style={{
      position: "fixed", bottom: 48, left: 10, width: 200,
      background: "rgba(5,10,18,0.98)", border: "1px solid #1e3a5f",
      borderRadius: 8, overflow: "hidden", zIndex: 2000,
      boxShadow: "0 -4px 30px rgba(0,200,255,0.1)",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #1e3a5f" }}>
        <div style={{ color: "#00ff88", fontSize: 13, fontWeight: 900, letterSpacing: 2 }}>KERNELLAB</div>
        <div style={{ color: "#555", fontSize: 9 }}>OS Simulation Platform</div>
      </div>
      {DESKTOP_ICONS.map(ic => (
        <div
          key={ic.id}
          onClick={() => { onOpen(ic.id); onClose(); }}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px", cursor: "pointer", fontSize: 11, color: "#c0d8f0",
            transition: "background 0.1s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#1a2a3a"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <span style={{ fontSize: 16 }}>{ic.icon}</span>
          {ic.label}
        </div>
      ))}
    </div>
  );
}

// ─── Main Desktop App ─────────────────────────────────────────────────────────
function Desktop() {
  const [simState, setSimState] = useState(null);
  const [windowStates, setWindowStates] = useState({});  // id -> {open, minimized, pos, zIndex}
  const [zCounter, setZCounter] = useState(10);
  const [toasts, setToasts] = useState([]);
  const [autoRun, setAutoRun] = useState(true);
  const [quantum, setQuantum] = useState(3);
  const [showStartMenu, setShowStartMenu] = useState(false);
  const [backendError, setBackendError] = useState(false);
  const autoRunRef = useRef(autoRun);
  autoRunRef.current = autoRun;

  const toast = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t.slice(-4), { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const s = await apiFetch("/state");
      setSimState(s);
      setBackendError(false);
    } catch (e) {
      setBackendError(true);
    }
  }, []);

  // Auto-step + polling
  useEffect(() => {
    let iv = setInterval(async () => {
      if (autoRunRef.current) {
        try { await apiFetch("/simulation/step", "POST"); } catch (_) {}
      }
      fetchState();
    }, POLL_MS);
    fetchState();
    return () => clearInterval(iv);
  }, [fetchState]);

  const openWindow = useCallback((id) => {
    setZCounter(z => {
      const newZ = z + 1;
      setWindowStates(ws => ({
        ...ws,
        [id]: {
          open: true,
          minimized: false,
          pos: ws[id]?.pos || { x: INITIAL_WINDOW_POSITIONS[id]?.x || 100, y: INITIAL_WINDOW_POSITIONS[id]?.y || 100 },
          zIndex: newZ,
        },
      }));
      return newZ;
    });
  }, []);

  const toggleWindow = useCallback((id) => {
    setWindowStates(ws => {
      const cur = ws[id];
      if (!cur || !cur.open) {
        openWindow(id);
        return ws;
      }
      return { ...ws, [id]: { ...cur, minimized: !cur.minimized } };
    });
  }, [openWindow]);

  const closeWindow = useCallback((id) => {
    setWindowStates(ws => ({ ...ws, [id]: { ...(ws[id] || {}), open: false } }));
  }, []);

  const focusWindow = useCallback((id) => {
    setZCounter(z => {
      const newZ = z + 1;
      setWindowStates(ws => ({ ...ws, [id]: { ...(ws[id] || {}), zIndex: newZ } }));
      return newZ;
    });
  }, []);

  const moveWindow = useCallback((id, pos) => {
    setWindowStates(ws => ({ ...ws, [id]: { ...(ws[id] || {}), pos } }));
  }, []);

  const minimizeWindow = useCallback((id) => {
    setWindowStates(ws => ({ ...ws, [id]: { ...(ws[id] || {}), minimized: true } }));
  }, []);

  const handleStep = async () => {
    try { await apiFetch("/simulation/step", "POST"); fetchState(); toast("Stepped.", "success"); }
    catch (e) { toast(e.message, "error"); }
  };

  const handleReset = async () => {
    try { await apiFetch("/simulation/reset", "POST"); fetchState(); toast("Simulation reset.", "warn"); }
    catch (e) { toast(e.message, "error"); }
  };

  const openWindows = new Set(Object.entries(windowStates).filter(([, v]) => v.open && !v.minimized).map(([k]) => k));

  const windowContent = {
    processes: <ProcessManagerPanel state={simState} onAction={fetchState} onToast={toast} />,
    memory: <MemoryPanel state={simState} />,
    interrupts: <InterruptPanel state={simState} onAction={fetchState} onToast={toast} />,
    analytics: <AnalyticsPanel state={simState} />,
    console: <ConsolePanel state={simState} />,
    settings: <SettingsPanel state={simState} onAction={fetchState} onToast={toast} quantum={quantum} setQuantum={setQuantum} />,
  };

  const windowTitles = {
    processes: "Process Manager",
    memory: "Memory Viewer",
    interrupts: "Interrupt Console",
    analytics: "Analytics",
    console: "System Console",
    settings: "Settings",
  };

  const windowSizes = {
    processes: { w: 520, h: 460 },
    memory: { w: 480, h: 400 },
    interrupts: { w: 360, h: 360 },
    analytics: { w: 460, h: 360 },
    console: { w: 440, h: 340 },
    settings: { w: 360, h: 300 },
  };

  return (
    <div
      onClick={() => setShowStartMenu(false)}
      style={{
        width: "100vw", height: "100vh", position: "relative", overflow: "hidden",
        background: "radial-gradient(ellipse at 30% 30%, #0a1a2a 0%, #000510 60%, #000 100%)",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {/* Scanline overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 500,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.01) 2px, rgba(0,255,136,0.01) 4px)",
      }} />

      {/* Backend error banner */}
      {backendError && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 900,
          background: "#c62828", color: "#fff", textAlign: "center",
          padding: "8px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
        }}>
          ⚠ Cannot connect to backend (localhost:8000). Start the FastAPI server: <code>cd backend && python main.py</code>
        </div>
      )}

      {/* Desktop icons */}
      <DesktopIconGrid state={simState} onOpen={openWindow} />

      {/* Desktop quick stats */}
      {simState && (
        <div style={{
          position: "absolute", top: 20, right: 20,
          background: "rgba(5,10,18,0.85)", border: "1px solid #1e3a5f",
          borderRadius: 8, padding: 12,
          display: "flex", flexDirection: "column", gap: 6, fontSize: 10,
          backdropFilter: "blur(8px)",
        }}>
          <div style={{ color: "#4fc3f7", fontSize: 9, letterSpacing: 2, marginBottom: 2 }}>SYSTEM STATUS</div>
          {[
            ["Running", simState.running_pid != null ? `PID ${simState.running_pid}` : "Idle", "#00ff88"],
            ["Ready Queue", simState.ready_queue.length, "#4fc3f7"],
            ["Waiting Queue", simState.waiting_queue.length, "#ffb74d"],
            ["CPU Usage", `${simState.cpu_utilisation}%`, simState.cpu_utilisation > 70 ? "#ef5350" : "#00ff88"],
            ["Free Frames", simState.free_frames, "#80cbc4"],
            ["Sim Time", fmtTime(simState.sim_time), "#ce93d8"],
          ].map(([k, v, c]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ color: "#555" }}>{k}</span>
              <span style={{ color: c, fontWeight: 700 }}>{v}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid #1e3a5f", paddingTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#555", fontSize: 9 }}>AUTO-RUN</span>
            <div
              onClick={() => setAutoRun(a => !a)}
              style={{
                width: 28, height: 14, borderRadius: 7, cursor: "pointer",
                background: autoRun ? "#00ff88" : "#333",
                position: "relative", transition: "background 0.2s",
                border: "1px solid #1e3a5f",
              }}
            >
              <div style={{
                position: "absolute", top: 1,
                left: autoRun ? 14 : 1,
                width: 10, height: 10, borderRadius: "50%",
                background: "#fff", transition: "left 0.2s",
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Windows */}
      {DESKTOP_ICONS.map(ic => {
        const ws = windowStates[ic.id];
        if (!ws?.open) return null;
        const sz = windowSizes[ic.id] || { w: 480, h: 400 };
        return (
          <Window
            key={ic.id}
            id={ic.id}
            title={windowTitles[ic.id]}
            icon={ic.icon}
            pos={ws.pos}
            onMove={moveWindow}
            onClose={closeWindow}
            onFocus={focusWindow}
            zIndex={ws.zIndex || 10}
            minimized={ws.minimized}
            onMinimize={minimizeWindow}
            width={sz.w}
            height={sz.h}
          >
            {windowContent[ic.id]}
          </Window>
        );
      })}

      {/* Start menu */}
      {showStartMenu && (
        <StartMenu onOpen={openWindow} onClose={() => setShowStartMenu(false)} />
      )}

      {/* Taskbar */}
      <div onClick={e => e.stopPropagation()}>
        <Taskbar
          state={simState}
          openWindows={openWindows}
          onToggleWindow={toggleWindow}
          onStep={handleStep}
          onReset={handleReset}
        />
      </div>

      {/* Toasts */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase] = useState("boot"); // boot | landing | desktop

  if (phase === "boot") return <BootScreen onDone={() => setPhase("landing")} />;
  if (phase === "landing") return <LandingPage onLaunch={() => setPhase("desktop")} />;
  return <Desktop />;
}
