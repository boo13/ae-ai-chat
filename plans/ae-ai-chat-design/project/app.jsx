// AE AI Chat — redesigned plugin panel

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#4ec38b",
  "density": "compact",
  "messageStyle": "bubbles",
  "showFrame": true,
  "model": "Sonnet",
  "drawerVisible": true,
  "drawerLayout": "stacked",
  "drawerColumns": 4,
  "drawerLabels": true,
  "drawerTone": "darker",
  "iconAccent": true,
  "demoState": "error",
  "streamingStyle": "row"
}/*EDITMODE-END*/;

// ────────────── Icons (24px stroke) ──────────────
const Icon = {
  menu: (s=16) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  chevron: (s=12) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none">
      <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  search: (s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M9.2 9.2l2.6 2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  doc: (s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <path d="M3 1.5h5L11 4.5V12a.5.5 0 0 1-.5.5h-7A.5.5 0 0 1 3 12V2a.5.5 0 0 1 .5-.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M8 1.5V4.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M5 7h4M5 9.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  wrench: (s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <path d="M9.5 1.5a3 3 0 0 0-3.78 3.78L1.7 9.3a1 1 0 0 0 0 1.41l1.59 1.6a1 1 0 0 0 1.41 0l4.02-4.02A3 3 0 0 0 12.5 4.5L10.7 6.3 8.5 5.7 7.7 3.3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
  spark: (s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5l1.2 3.3L11.5 6 8.2 7.2 7 10.5 5.8 7.2 2.5 6l3.3-1.2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M11.5 10.5l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
    </svg>
  ),
  arrow: (s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7h9M7.5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  status: (s=8) => (
    <svg width={s} height={s} viewBox="0 0 8 8" fill="none">
      <circle cx="4" cy="4" r="3" fill="currentColor"/>
    </svg>
  ),
  plus: (s=12) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none">
      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  x: (s=10) => (
    <svg width={s} height={s} viewBox="0 0 10 10" fill="none">
      <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  stop: (s=10) => (
    <svg width={s} height={s} viewBox="0 0 10 10" fill="none">
      <rect x="2" y="2" width="6" height="6" rx="1" fill="currentColor"/>
    </svg>
  ),
  comp: (s=12) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none">
      <rect x="1.5" y="2" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  layer: (s=12) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none">
      <path d="M6 1.5l4.5 2.5L6 6.5 1.5 4z M1.5 7L6 9.5 10.5 7" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
    </svg>
  ),
  effect: (s=12) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none">
      <path d="M6 1.5l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
    </svg>
  ),
  warning: (s=14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <path d="M7 2L1.5 12h11z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M7 6v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="7" cy="10.6" r="0.6" fill="currentColor"/>
    </svg>
  ),
};

// ────────────── Mac window chrome (lightweight, dark) ──────────────
function MacFrame({ width, height, children }) {
  return (
    <div style={{
      width, height,
      borderRadius: 12,
      overflow: "hidden",
      background: "var(--ae-bg)",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 30px 80px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)",
      display: "flex",
      flexDirection: "column",
      position: "relative",
    }}>
      {/* titlebar */}
      <div style={{
        height: 36,
        flexShrink: 0,
        background: "#181818",
        borderBottom: "1px solid var(--ae-line)",
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        gap: 8,
      }}>
        <div style={{display:"flex", gap:8}}>
          <span style={{width:12,height:12,borderRadius:"50%",background:"#ff5f57",boxShadow:"inset 0 0 0 0.5px rgba(0,0,0,0.2)"}}/>
          <span style={{width:12,height:12,borderRadius:"50%",background:"#febc2e",boxShadow:"inset 0 0 0 0.5px rgba(0,0,0,0.2)"}}/>
          <span style={{width:12,height:12,borderRadius:"50%",background:"#28c840",boxShadow:"inset 0 0 0 0.5px rgba(0,0,0,0.2)"}}/>
        </div>
        <div style={{
          flex:1, textAlign:"center",
          fontSize: 12, color: "var(--ae-text-3)", fontWeight: 500,
          letterSpacing: 0.1,
        }}>AE AI Chat</div>
        <div style={{width:54}}/>
      </div>
      <div style={{flex:1, minHeight:0, display:"flex", flexDirection:"column"}}>
        {children}
      </div>
    </div>
  );
}

// ────────────── Reusable bits ──────────────
function RoleChip({ role }) {
  const map = {
    system:    { label: "System",    fg: "#a0a0a0", bg: "rgba(255,255,255,0.05)", dot: "#7a7a7a" },
    you:       { label: "You",       fg: "var(--accent)", bg: "color-mix(in oklch, var(--accent) 14%, transparent)", dot: "var(--accent)" },
    assistant: { label: "Claude",    fg: "#cfcfcf", bg: "rgba(255,255,255,0.06)", dot: "#cfcfcf" },
    error:     { label: "Error",     fg: "var(--ae-warn)", bg: "rgba(255,142,106,0.10)", dot: "var(--ae-warn)" },
  }[role] || { label: role, fg:"#aaa", bg:"rgba(255,255,255,0.05)", dot:"#888" };
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:6,
      height: 20, padding: "0 8px 0 7px",
      borderRadius: 6,
      background: map.bg,
      color: map.fg,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.2,
    }}>
      <span style={{
        width:5, height:5, borderRadius:"50%", background: map.dot, display:"inline-block"
      }}/>
      {map.label}
    </span>
  );
}

function QuickAction({ icon, label, layout, showLabel, iconAccent }) {
  const stacked = layout === "stacked";
  return (
    <button className="qa-btn" style={{
      flex: "1 1 0",
      minWidth: 0,
      height: stacked ? (showLabel ? 50 : 38) : 34,
      padding: stacked ? "4px 4px" : "0 8px",
      display: "inline-flex",
      flexDirection: stacked ? "column" : "row",
      alignItems: "center",
      justifyContent: "center",
      gap: stacked ? 4 : 7,
      background: "transparent",
      color: "var(--ae-text)",
      border: 0,
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 500,
      fontFamily: "inherit",
      cursor: "pointer",
      whiteSpace: "nowrap",
      transition: "background 120ms ease, color 120ms ease, transform 80ms ease",
    }}>
      <span style={{
        display:"inline-flex",
        alignItems:"center",
        justifyContent:"center",
        color: iconAccent ? "var(--accent)" : "var(--ae-text-2)",
      }}>{icon}</span>
      {showLabel && <span style={{color:"var(--ae-text-2)", fontSize: stacked ? 10.5 : 12}}>{label}</span>}
    </button>
  );
}

function ActionDrawer({ visible, tone, columns, children }) {
  if (!visible) return null;
  const bg =
    tone === "darker"  ? "#0e0e0e" :
    tone === "lighter" ? "#222"   :
    "var(--ae-bg)";
  return (
    <div style={{
      flexShrink: 0,
      background: bg,
      // Inset shadow at top makes it read as if the panel above is sitting on top —
      // the drawer is recessed beneath it, not floating over.
      boxShadow: "inset 0 8px 10px -8px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.02)",
      position: "relative",
    }}>
      <div style={{
        padding: "8px 8px 10px",
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 2,
      }}>
        {children}
      </div>
    </div>
  );
}

function ModelSelector({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const opts = ["Haiku", "Sonnet", "Opus"];
  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div ref={ref} style={{position:"relative"}}>
      <button onClick={() => setOpen(o=>!o)} style={{
        height: 26, padding: "0 8px 0 10px",
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "var(--ae-bg-2)",
        color: "var(--ae-text)",
        border: "1px solid var(--ae-line-2)",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        fontFamily: "inherit",
        cursor: "pointer",
      }}>
        <span style={{
          width:6, height:6, borderRadius:"50%",
          background:"var(--accent)",
          boxShadow:"0 0 0 2px color-mix(in oklch, var(--accent) 25%, transparent)",
        }}/>
        {value}
        <span style={{color:"var(--ae-text-3)", display:"inline-flex"}}>{Icon.chevron(10)}</span>
      </button>
      {open && (
        <div style={{
          position:"absolute", top: "calc(100% + 4px)", right: 0,
          minWidth: 130,
          background: "var(--ae-bg-3)",
          border: "1px solid var(--ae-line-2)",
          borderRadius: 8,
          padding: 4,
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          zIndex: 20,
        }}>
          {opts.map(o => (
            <button key={o} onClick={() => { onChange(o); setOpen(false); }} style={{
              display: "flex", alignItems: "center", gap: 8,
              width: "100%", padding: "6px 8px",
              background: o===value ? "rgba(255,255,255,0.05)" : "transparent",
              border: 0, color: "var(--ae-text)",
              fontSize: 12, fontFamily:"inherit",
              textAlign: "left", borderRadius: 5, cursor: "pointer",
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: o===value ? "var(--accent)" : "transparent",
                boxShadow: o===value ? "none" : "inset 0 0 0 1px var(--ae-text-3)",
              }}/>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────── Messages ──────────────
function TypingDots() {
  return <span className="typing"><span/><span/><span/></span>;
}

function fmtElapsed(s) {
  if (s < 60) return `${s.toFixed(1)}s`;
  const mm = Math.floor(s/60), ss = Math.floor(s%60);
  return `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

function StreamingIndicator({ style, elapsed }) {
  const timer = (
    <span style={{
      fontSize: 11.5,
      color: "var(--ae-text-3)",
      fontFamily: "JetBrains Mono, ui-monospace, monospace",
      fontVariantNumeric: "tabular-nums",
    }}>{fmtElapsed(elapsed)}</span>
  );

  if (style === "row") {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 16px",
        borderTop: "1px solid var(--ae-line)",
        background: "rgba(255,255,255,0.015)",
      }}>
        <span className="pulse-dot" style={{color:"var(--accent)", display:"inline-flex"}}>{Icon.status(8)}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase",
          color: "var(--accent)",
        }}>Claude</span>
        <span style={{fontSize: 12.5, color: "var(--ae-text-2)"}}>Thinking</span>
        <span className="ellipsis-anim" aria-hidden="true"/>
        <span style={{flex: 1}}/>
        {timer}
      </div>
    );
  }

  if (style === "shimmer") {
    return (
      <div style={{padding: "6px 14px 10px"}}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px",
          background: "var(--ae-bg-2)",
          border: "1px solid var(--ae-line)",
          borderRadius: 10, borderBottomLeftRadius: 4,
        }}>
          <span className="pulse-dot" style={{color: "var(--accent)", display: "inline-flex"}}>{Icon.status(7)}</span>
          <div className="shimmer-bar" style={{flex: 1, height: 6, borderRadius: 3}}/>
          {timer}
        </div>
      </div>
    );
  }

  if (style === "pulse") {
    return (
      <div style={{padding: "6px 14px 10px"}}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "7px 12px 7px 10px",
          background: "var(--ae-bg-2)",
          border: "1px solid var(--ae-line)",
          borderRadius: 999,
        }}>
          <span className="pulse-ring" aria-hidden="true"/>
          <span style={{fontSize: 12.5, color: "var(--ae-text-2)"}}>Thinking</span>
          <span style={{
            paddingLeft: 8, marginLeft: 2,
            borderLeft: "1px solid var(--ae-line)",
          }}>{timer}</span>
        </div>
      </div>
    );
  }

  if (style === "bar-sm") {
    return (
      <div style={{padding: "6px 14px 10px"}}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "7px 12px 7px 12px",
          background: "var(--ae-bg-2)",
          border: "1px solid var(--ae-line)",
          borderRadius: 999,
          minWidth: 150,
        }}>
          <div className="indeterminate-track" style={{flex: 1, minWidth: 60}}>
            <div className="indeterminate-fill"/>
          </div>
          {timer}
        </div>
      </div>
    );
  }

  if (style === "bar-md") {
    return (
      <div style={{padding: "6px 14px 10px"}}>
        <div style={{
          display: "flex", flexDirection: "column", gap: 6,
          padding: "8px 12px 9px",
          background: "var(--ae-bg-2)",
          border: "1px solid var(--ae-line)",
          borderRadius: 10, borderBottomLeftRadius: 4,
          width: 240,
        }}>
          <div style={{display: "flex", alignItems: "center", gap: 8}}>
            <span style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase",
              color: "var(--accent)",
            }}>Claude</span>
            <span style={{fontSize: 12, color: "var(--ae-text-2)"}}>thinking</span>
            <span style={{flex: 1}}/>
            {timer}
          </div>
          <div className="indeterminate-track">
            <div className="indeterminate-fill"/>
          </div>
        </div>
      </div>
    );
  }

  if (style === "bar") {
    return (
      <div style={{padding: "4px 14px 10px"}}>
        <div style={{
          display: "flex", flexDirection: "column", gap: 6,
          padding: "9px 12px",
          background: "var(--ae-bg-2)",
          border: "1px solid var(--ae-line)",
          borderRadius: 10, borderBottomLeftRadius: 4,
        }}>
          <div style={{display:"flex", alignItems:"center", gap:8}}>
            <span style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase",
              color: "var(--accent)",
            }}>Claude</span>
            <span style={{fontSize: 12, color: "var(--ae-text-2)"}}>is responding</span>
            <span style={{flex:1}}/>
            {timer}
          </div>
          <div className="indeterminate-track">
            <div className="indeterminate-fill"/>
          </div>
        </div>
      </div>
    );
  }

  // dots (default fallback)
  return (
    <div style={{padding: "6px 14px 10px"}}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        padding: "10px 12px",
        background: "var(--ae-bg-2)",
        border: "1px solid var(--ae-line)",
        borderRadius: 12, borderBottomLeftRadius: 4,
      }}>
        <TypingDots/>
        {timer}
      </div>
    </div>
  );
}

function Message({ role, time, children, density, style }) {
  const pad = density === "compact" ? "10px 16px" : density === "comfy" ? "16px 18px" : "13px 18px";

  if (style === "bubbles") {
    const isMe = role === "you";
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isMe ? "flex-end" : "flex-start",
        padding: density === "compact" ? "6px 14px" : "8px 14px",
        gap: 3,
      }}>
        <span style={{
          fontSize: 10.5,
          color: "var(--ae-text-3)",
          padding: "0 6px 2px",
          fontVariantNumeric: "tabular-nums",
        }}>{time}</span>
        <div style={{
          maxWidth: "84%",
          padding: "9px 12px",
          borderRadius: 12,
          borderBottomRightRadius: isMe ? 4 : 12,
          borderBottomLeftRadius:  isMe ? 12 : 4,
          background: isMe
            ? "color-mix(in oklch, var(--accent) 22%, transparent)"
            : "var(--ae-bg-2)",
          border: isMe
            ? "1px solid color-mix(in oklch, var(--accent) 28%, transparent)"
            : "1px solid var(--ae-line)",
          fontSize: 13.5,
          lineHeight: 1.5,
          color: "var(--ae-text)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: pad,
      borderBottom: "1px solid var(--ae-line)",
      display: "flex",
      flexDirection: "column",
      gap: density === "compact" ? 4 : 6,
    }}>
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between"
      }}>
        <RoleChip role={role}/>
        <span style={{fontSize:11, color:"var(--ae-text-3)", fontVariantNumeric:"tabular-nums"}}>{time}</span>
      </div>
      <div style={{
        fontSize: 13.5,
        lineHeight: 1.55,
        color: "var(--ae-text)",
      }}>
        {children}
      </div>
    </div>
  );
}

function ErrorBlock({ time, density, style }) {
  // Errors are system events — render full-width even in bubbles mode.
  const isBubbles = style === "bubbles";
  return (
    <div style={{
      padding: isBubbles ? "6px 14px" : (density === "compact" ? "10px 16px" : "13px 18px"),
      borderBottom: isBubbles ? "none" : "1px solid var(--ae-line)",
    }}>
      <div style={{
        display:"flex", gap:10, alignItems:"flex-start",
        padding: "10px 12px",
        background: "rgba(255,142,106,0.06)",
        border: "1px solid rgba(255,142,106,0.18)",
        borderRadius: 8,
        marginBottom: 8,
      }}>
        <span style={{color:"var(--ae-warn)", marginTop:1, display:"inline-flex"}}>{Icon.warning(14)}</span>
        <div style={{flex:1, minWidth:0}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:8}}>
            <div style={{fontSize:13, fontWeight:600, color:"var(--ae-warn)"}}>You’ve hit your limit</div>
            <span style={{fontSize:10.5, color:"var(--ae-text-3)", fontVariantNumeric:"tabular-nums"}}>{time}</span>
          </div>
          <div style={{fontSize:12, color:"var(--ae-text-2)", marginTop:2}}>Resets at 1:00 PM · America/New_York</div>
        </div>
      </div>

      <details style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--ae-line)",
        borderRadius: 8,
        overflow: "hidden",
      }}>
        <summary style={{
          listStyle:"none",
          padding: "8px 12px",
          fontSize: 11.5,
          fontWeight: 600,
          color: "var(--ae-text-2)",
          cursor: "pointer",
          letterSpacing: 0.3,
          textTransform: "uppercase",
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          Launch diagnostics
          <span style={{color:"var(--ae-text-3)", fontWeight:400, textTransform:"none", letterSpacing:0}}>haiku · new session</span>
        </summary>
        <div style={{
          padding: "8px 12px 12px",
          fontFamily: "JetBrains Mono, ui-monospace, monospace",
          fontSize: 11.5,
          lineHeight: 1.65,
          color: "var(--ae-text-2)",
          borderTop: "1px solid var(--ae-line)",
        }}>
          <DiagRow k="claudePath" v="/opt/homebrew/bin/claude"/>
          <DiagRow k="cwd"        v="/var/folders/k8/52rdq29n057fr29ybcm1b9_r0000gn/T"/>
          <DiagRow k="model"      v="haiku"/>
          <DiagRow k="sessionMode" v="new"/>
          <DiagRow k="pathLookupOnly" v="no"/>
          <DiagRow k="env"        v={<span>HOME=<span style={{color:"var(--ae-text)"}}>/Users/randy</span></span>}/>
        </div>
      </details>
    </div>
  );
}

function DiagRow({ k, v }) {
  return (
    <div style={{display:"flex", gap:8, alignItems:"baseline"}}>
      <span style={{color:"var(--ae-text-3)", minWidth: 110, flexShrink:0}}>{k}</span>
      <span style={{wordBreak:"break-all"}}>{v}</span>
    </div>
  );
}

// ────────────── Composer ──────────────
const CTX_OPTIONS = [
  { type: "comp",   label: "Comp 1" },
  { type: "comp",   label: "Hero Title" },
  { type: "layer",  label: "Logo.ai" },
  { type: "layer",  label: "Background" },
  { type: "layer",  label: "Selection (3 layers)" },
  { type: "effect", label: "Lumetri Color" },
  { type: "effect", label: "Drop Shadow" },
];

function CtxIcon({ type, size = 11 }) {
  if (type === "comp")   return Icon.comp(size);
  if (type === "layer")  return Icon.layer(size);
  if (type === "effect") return Icon.effect(size);
  return null;
}

function ContextChip({ ctx, onRemove }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      height: 22, padding: "0 6px 0 7px",
      borderRadius: 5,
      background: "rgba(255,255,255,0.05)",
      border: "1px solid var(--ae-line-2)",
      fontSize: 11,
      color: "var(--ae-text)",
    }}>
      <span style={{color:"var(--ae-text-3)", display:"inline-flex"}}>
        <CtxIcon type={ctx.type}/>
      </span>
      <span>{ctx.label}</span>
      <button onClick={onRemove} className="chip-x" style={{
        display:"inline-flex", alignItems:"center", justifyContent:"center",
        width:14, height:14, marginLeft:1, marginRight:-2,
        background:"transparent", border:0, padding:0,
        color:"var(--ae-text-3)", cursor:"pointer", borderRadius:3,
      }}>{Icon.x(9)}</button>
    </span>
  );
}

function Composer({ onSend, onStop, isStreaming, contexts, setContexts }) {
  const [val, setVal] = React.useState("");
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const taRef = React.useRef(null);
  const pickerRef = React.useRef(null);

  React.useEffect(() => {
    const ta = taRef.current; if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [val]);

  React.useEffect(() => {
    const onDoc = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const send = () => {
    if (!val.trim() || isStreaming) return;
    onSend(val.trim(), contexts);
    setVal("");
    setContexts([]);
  };

  return (
    <div style={{
      padding: 10,
      borderTop: "1px solid var(--ae-line)",
      background: "linear-gradient(to top, rgba(0,0,0,0.2), transparent)",
    }}>
      <div className="composer-wrap" style={{
        background: "var(--ae-bg-2)",
        border: "1px solid var(--ae-line-2)",
        borderRadius: 10,
        padding: "7px 8px 6px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        transition: "border-color 120ms ease, box-shadow 120ms ease",
      }}>
        {contexts.length > 0 && (
          <div style={{display:"flex", flexWrap:"wrap", gap:4}}>
            {contexts.map((c, i) => (
              <ContextChip key={i} ctx={c}
                onRemove={() => setContexts(contexts.filter((_, j) => j !== i))}/>
            ))}
          </div>
        )}

        <textarea
          ref={taRef}
          rows={1}
          value={val}
          disabled={isStreaming}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={isStreaming ? "Claude is responding…" : "Ask Claude about your AE project…"}
          style={{
            width: "100%",
            background: "transparent",
            border: 0, outline: 0, resize: "none",
            color: "var(--ae-text)",
            fontFamily: "inherit",
            fontSize: 13.5,
            lineHeight: 1.5,
            padding: "4px 0",
            minHeight: 22,
            maxHeight: 120,
            overflowY: "auto",
          }}
        />

        <div style={{display:"flex", alignItems:"center", gap:6}}>
          <div style={{position:"relative"}} ref={pickerRef}>
            <button onClick={() => setPickerOpen(o=>!o)} title="Add AE context" style={{
              height: 26, padding: "0 8px",
              display: "inline-flex", alignItems: "center", gap: 4,
              background: pickerOpen ? "rgba(255,255,255,0.06)" : "transparent",
              border: "1px solid var(--ae-line-2)",
              borderRadius: 6,
              color: "var(--ae-text-2)",
              fontFamily: "inherit",
              fontSize: 11.5,
              cursor: "pointer",
            }}>
              {Icon.plus(11)}
              <span>Context</span>
            </button>
            {pickerOpen && (
              <div style={{
                position:"absolute", bottom: "calc(100% + 6px)", left: 0,
                width: 220,
                background: "var(--ae-bg-3)",
                border: "1px solid var(--ae-line-2)",
                borderRadius: 8,
                padding: 4,
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                zIndex: 30,
                maxHeight: 240,
                overflowY: "auto",
              }}>
                <div style={{fontSize:10, fontWeight:600, letterSpacing:0.6, textTransform:"uppercase", color:"var(--ae-text-3)", padding:"6px 8px"}}>Add from project</div>
                {CTX_OPTIONS.map((o, i) => {
                  const already = contexts.some(c => c.label === o.label);
                  return (
                    <button key={i} disabled={already}
                      onClick={() => { setContexts([...contexts, o]); setPickerOpen(false); }}
                      className="ctx-pick"
                      style={{
                        display:"flex", alignItems:"center", gap:8, width:"100%",
                        padding:"6px 8px", background:"transparent", border:0,
                        color: already ? "var(--ae-text-3)" : "var(--ae-text)",
                        fontSize:12, fontFamily:"inherit",
                        textAlign:"left", borderRadius:5,
                        cursor: already ? "default" : "pointer",
                        opacity: already ? 0.5 : 1,
                      }}>
                      <span style={{color:"var(--ae-text-3)", display:"inline-flex", width:14}}>
                        <CtxIcon type={o.type} size={12}/>
                      </span>
                      <span style={{color:"var(--ae-text-3)", fontSize:10, textTransform:"uppercase", letterSpacing:0.4, minWidth:42}}>{o.type}</span>
                      <span style={{flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{o.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <span style={{fontSize:10.5, color:"var(--ae-text-3)", padding:"0 4px"}}>
            <span style={{fontFamily:"JetBrains Mono, monospace"}}>shift+↵</span> for newline
          </span>

          <div style={{flex:1}}/>

          {isStreaming ? (
            <button onClick={onStop} style={{
              height: 30, padding: "0 12px",
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(255,142,106,0.14)",
              color: "var(--ae-warn)",
              border: "1px solid rgba(255,142,106,0.3)",
              borderRadius: 7,
              fontFamily: "inherit",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
            }}>
              {Icon.stop(10)}
              Stop
            </button>
          ) : (
            <button onClick={send} disabled={!val.trim()} style={{
              height: 30, padding: "0 14px",
              display: "inline-flex", alignItems: "center", gap: 6,
              background: val.trim() ? "var(--accent)" : "color-mix(in oklch, var(--accent) 25%, var(--ae-bg-3))",
              color: val.trim() ? "#0a0a0a" : "var(--ae-text-3)",
              border: 0,
              borderRadius: 7,
              fontFamily: "inherit",
              fontWeight: 600,
              fontSize: 12,
              cursor: val.trim() ? "pointer" : "default",
              transition: "background 120ms ease, transform 80ms ease",
            }}>
              Send
              <span style={{display:"inline-flex"}}>{Icon.arrow(12)}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────── Mock reply ──────────────
function mockReply(prompt, ctxs) {
  const p = prompt.toLowerCase();
  const ctxNote = ctxs && ctxs.length ? ` (using ${ctxs.map(c => c.label).join(", ")})` : "";
  if (p.includes("comp")) return `Created Comp 2 — 1920×1080, 30 fps, 10s${ctxNote}. It's now active in the Timeline.`;
  if (p.includes("describe")) return `Active comp is 1920×1080 at 30 fps with 7 layers. The hero title uses an expression-driven wiggle on Position. Want details on a specific layer?`;
  if (p.includes("expression") || p.includes("fix")) return `Fixed: the expression on Logo.ai was referencing a deleted parent. Restored linkage to Comp 1's null and re-cached. Preview should play cleanly now.`;
  if (p.includes("report")) return `Project report:\n• 3 comps, 24 layers total\n• 2 missing footage references\n• 1 expression error (resolved)\n• Render queue: empty`;
  return `On it${ctxNote}. Anything specific you want me to focus on?`;
}

// ────────────── Empty-state suggestions ──────────────
function Suggestions({ onPick }) {
  const items = [
    "Describe my current comp",
    "Create a 1920×1080 comp at 30fps",
    "Fix the expression on the selected layer",
    "Generate a project report",
  ];
  return (
    <div style={{padding:"4px 14px 14px", display:"flex", flexDirection:"column", gap:5}}>
      <div style={{
        fontSize:10, fontWeight:600, letterSpacing:0.6, textTransform:"uppercase",
        color:"var(--ae-text-3)", padding:"6px 4px 4px",
      }}>Try asking</div>
      {items.map((s, i) => (
        <button key={i} onClick={() => onPick(s)} className="sugg-btn" style={{
          textAlign:"left",
          padding:"9px 12px",
          background:"var(--ae-bg-2)",
          border:"1px solid var(--ae-line)",
          borderRadius:9,
          color:"var(--ae-text-2)",
          fontFamily:"inherit",
          fontSize:12.5,
          cursor:"pointer",
          transition:"background 120ms ease, color 120ms ease, border-color 120ms ease",
        }}>{s}</button>
      ))}
    </div>
  );
}

// ────────────── Top header ──────────────
function PanelHeader({ model, setModel }) {
  return (
    <div style={{
      flexShrink: 0,
      borderBottom: "1px solid var(--ae-line)",
      padding: "12px 18px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: "linear-gradient(to bottom, rgba(255,255,255,0.02), transparent)",
    }}>
      <button title="Menu" style={{
        width: 28, height: 28,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: "transparent",
        border: "1px solid var(--ae-line-2)",
        borderRadius: 6,
        color: "var(--ae-text-2)",
        cursor: "pointer",
      }}>{Icon.menu(14)}</button>

      <div style={{display:"flex", flexDirection:"column", lineHeight:1.1}}>
        <div style={{fontSize: 13, fontWeight: 600, color: "var(--ae-text)", letterSpacing: 0.2}}>
          AE AI Chat
        </div>
        <div style={{fontSize: 11, color: "var(--ae-text-3)", marginTop:3, display:"flex", alignItems:"center", gap: 6}}>
          <span style={{color: "var(--ae-ok)", display:"inline-flex"}} title="Connected">{Icon.status(7)}</span>
          v0.1.1
        </div>
      </div>

      <div style={{flex:1}}/>
      <ModelSelector value={model} onChange={setModel}/>
    </div>
  );
}

// ────────────── Main app ──────────────
function initialMessages(demoState) {
  if (demoState === "fresh") {
    return [{ role: "system", time: "11:24", body: "Claude ready. Ask about your After Effects project." }];
  }
  if (demoState === "responded") {
    return [
      { role: "system",    time: "11:24", body: "Claude ready. Ask about your After Effects project." },
      { role: "you",       time: "11:24", body: "create a new comp" },
      { role: "assistant", time: "11:24", body: "Created Comp 2 — 1920×1080, 30 fps, 10s. It's now active in the Timeline. Want me to add layers from the project bin?" },
    ];
  }
  return [
    { role: "system", time: "11:24", body: "Claude ready. Ask about your After Effects project." },
    { role: "you",    time: "11:24", body: "create a new comp" },
    { role: "error",  time: "11:24", body: null },
  ];
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [model, setModel] = React.useState(t.model);
  React.useEffect(() => setModel(t.model), [t.model]);

  const [messages, setMessages] = React.useState(() => initialMessages(t.demoState));
  const [contexts, setContexts] = React.useState([]);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const streamTimer = React.useRef(null);
  const startedAt = React.useRef(0);
  const scrollRef = React.useRef(null);

  // Tick elapsed timer while streaming
  React.useEffect(() => {
    if (!isStreaming) { setElapsed(0); return; }
    startedAt.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 100);
    return () => clearInterval(id);
  }, [isStreaming]);

  // Reset messages when demo state changes via tweaks
  const lastDemo = React.useRef(t.demoState);
  React.useEffect(() => {
    if (lastDemo.current !== t.demoState) {
      lastDemo.current = t.demoState;
      stopStream();
      setMessages(initialMessages(t.demoState));
      setContexts([]);
    }
  }, [t.demoState]);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const now5 = () => new Date().toTimeString().slice(0,5);

  const stopStream = () => {
    if (streamTimer.current) { clearTimeout(streamTimer.current); streamTimer.current = null; }
    if (isStreaming) {
      setIsStreaming(false);
      setMessages(m => [...m, { role: "system", time: now5(), body: "Response stopped." }]);
    }
  };

  const onSend = (txt, ctxs) => {
    const time = now5();
    setMessages(m => [...m, { role: "you", time, body: txt, contexts: ctxs }]);
    setIsStreaming(true);
    streamTimer.current = setTimeout(() => {
      streamTimer.current = null;
      setIsStreaming(false);
      const reply = mockReply(txt, ctxs);
      setMessages(m => [...m, { role: "assistant", time: now5(), body: reply }]);
    }, 6000);
  };

  // Apply accent
  React.useEffect(() => {
    document.documentElement.style.setProperty("--accent", t.accent);
  }, [t.accent]);

  React.useEffect(() => () => { if (streamTimer.current) clearTimeout(streamTimer.current); }, []);

  const density = t.density;
  const style = t.messageStyle;
  const showSuggestions = t.demoState === "fresh" && messages.length === 1 && !isStreaming;

  const Panel = (
    <div style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "var(--ae-bg)",
      color: "var(--ae-text)",
    }}>
      <PanelHeader model={model} setModel={(m) => { setModel(m); setTweak('model', m); }}/>

      <div ref={scrollRef} style={{
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(255,255,255,0.12) transparent",
        paddingTop: 4,
      }} className="msg-scroll">
        {messages.map((m, i) => {
          if (m.role === "error") return <ErrorBlock key={i} time={m.time} density={density} style={style}/>;
          return (
            <Message key={i} role={m.role} time={m.time} density={density} style={style}>
              {m.body}
            </Message>
          );
        })}
        {isStreaming && (
          <StreamingIndicator style={t.streamingStyle} elapsed={elapsed}/>
        )}
        {showSuggestions && (
          <Suggestions onPick={(s) => onSend(s, [])}/>
        )}
      </div>

      <Composer
        onSend={onSend}
        onStop={stopStream}
        isStreaming={isStreaming}
        contexts={contexts}
        setContexts={setContexts}
      />

      <ActionDrawer visible={t.drawerVisible} tone={t.drawerTone} columns={t.drawerColumns}>
        {[
          { icon: Icon.search(14), label: "Proj Report" },
          { icon: Icon.doc(14),    label: "Describe" },
          { icon: Icon.wrench(14), label: "Fix Last Error" },
          { icon: Icon.spark(14),  label: "AI Action" },
        ].map((a, i) => (
          <QuickAction key={i}
            icon={a.icon} label={a.label}
            layout={t.drawerLayout}
            showLabel={t.drawerLabels}
            iconAccent={t.iconAccent}
          />
        ))}
      </ActionDrawer>
    </div>
  );

  return (
    <>
      <style>{`
        .qa-btn:hover { background: rgba(255,255,255,0.04) !important; }
        .qa-btn:active { transform: translateY(1px); }
        .composer-wrap:focus-within {
          border-color: color-mix(in oklch, var(--accent) 50%, var(--ae-line-2)) !important;
          box-shadow: 0 0 0 3px color-mix(in oklch, var(--accent) 18%, transparent);
        }
        .msg-scroll::-webkit-scrollbar { width: 8px; }
        .msg-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.12); border-radius: 4px;
          border: 2px solid transparent; background-clip: content-box;
        }
        .msg-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); background-clip: content-box; border: 2px solid transparent; }
        .sugg-btn:hover {
          background: var(--ae-bg-3) !important;
          color: var(--ae-text) !important;
          border-color: var(--ae-line-2) !important;
        }
        .ctx-pick:not(:disabled):hover { background: rgba(255,255,255,0.05) !important; }
        .chip-x:hover { background: rgba(255,255,255,0.08) !important; color: var(--ae-text) !important; }
        @keyframes typing-pulse { 0%, 80%, 100% { opacity: 0.25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-1px); } }
        .typing { display: inline-flex; gap: 4px; align-items: center; height: 18px; }
        .typing > span {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--ae-text-2);
          animation: typing-pulse 1.2s infinite ease-in-out;
        }
        .typing > span:nth-child(2) { animation-delay: 0.15s; }
        .typing > span:nth-child(3) { animation-delay: 0.3s; }

        @keyframes pulse-fade { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
        .pulse-dot { animation: pulse-fade 1.4s infinite ease-in-out; }

        @keyframes ellipsis-cycle {
          0%   { content: ""; }
          25%  { content: "."; }
          50%  { content: ".."; }
          75%, 100% { content: "..."; }
        }
        .ellipsis-anim { display: inline-block; width: 14px; color: var(--ae-text-2); font-size: 12.5px; }
        .ellipsis-anim::after { content: "..."; animation: ellipsis-cycle 1.4s infinite steps(1); }

        @keyframes shimmer-pan {
          0%   { background-position: -100% 0; }
          100% { background-position:  200% 0; }
        }
        .shimmer-bar {
          background:
            linear-gradient(90deg,
              transparent 0%,
              color-mix(in oklch, var(--accent) 70%, transparent) 50%,
              transparent 100%),
            color-mix(in oklch, var(--accent) 12%, var(--ae-bg-3));
          background-size: 50% 100%, 100% 100%;
          background-repeat: no-repeat;
          animation: shimmer-pan 1.6s infinite linear;
        }

        @keyframes ring-out {
          0%   { transform: scale(0.6); opacity: 0.7; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .pulse-ring {
          position: relative;
          width: 10px; height: 10px;
          border-radius: 50%;
          background: var(--accent);
          flex: none;
        }
        .pulse-ring::before, .pulse-ring::after {
          content: "";
          position: absolute; inset: 0;
          border-radius: 50%;
          background: var(--accent);
          animation: ring-out 1.6s infinite ease-out;
        }
        .pulse-ring::after { animation-delay: 0.8s; }

        @keyframes indeterminate-slide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .indeterminate-track {
          position: relative;
          height: 3px; width: 100%;
          background: var(--ae-bg-3);
          border-radius: 2px;
          overflow: hidden;
        }
        .indeterminate-fill {
          position: absolute; top: 0; left: 0; bottom: 0;
          width: 33%;
          background: linear-gradient(90deg,
            transparent,
            color-mix(in oklch, var(--accent) 90%, transparent),
            transparent);
          animation: indeterminate-slide 1.4s infinite ease-in-out;
        }
      `}</style>

      {t.showFrame ? (
        <MacFrame width={520} height={720}>
          {Panel}
        </MacFrame>
      ) : (
        <div style={{
          width: 480, height: 680,
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 30px 80px rgba(0,0,0,0.6)",
        }}>{Panel}</div>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme"/>
        <TweakColor
          label="Accent"
          value={t.accent}
          options={["#6aa3ff", "#8b78ff", "#4ec38b", "#ff8e6a", "#e4e4e4"]}
          onChange={(v) => setTweak('accent', v)}
        />
        <TweakSection label="Chat"/>
        <TweakRadio
          label="Density"
          value={t.density}
          options={["compact","regular","comfy"]}
          onChange={(v) => setTweak('density', v)}
        />
        <TweakRadio
          label="Messages"
          value={t.messageStyle}
          options={["rows","bubbles"]}
          onChange={(v) => setTweak('messageStyle', v)}
        />

        <TweakSection label="Action drawer"/>
        <TweakToggle
          label="Visible"
          value={t.drawerVisible}
          onChange={(v) => setTweak('drawerVisible', v)}
        />
        <TweakRadio
          label="Tone"
          value={t.drawerTone}
          options={["darker","same","lighter"]}
          onChange={(v) => setTweak('drawerTone', v)}
        />
        <TweakRadio
          label="Layout"
          value={t.drawerLayout}
          options={["stacked","row"]}
          onChange={(v) => setTweak('drawerLayout', v)}
        />
        <TweakRadio
          label="Columns"
          value={String(t.drawerColumns)}
          options={["2","4"]}
          onChange={(v) => setTweak('drawerColumns', Number(v))}
        />
        <TweakToggle
          label="Labels"
          value={t.drawerLabels}
          onChange={(v) => setTweak('drawerLabels', v)}
        />
        <TweakToggle
          label="Accent icons"
          value={t.iconAccent}
          onChange={(v) => setTweak('iconAccent', v)}
        />

        <TweakSection label="Window"/>
        <TweakToggle
          label="macOS frame"
          value={t.showFrame}
          onChange={(v) => setTweak('showFrame', v)}
        />
        <TweakSection label="Model"/>
        <TweakRadio
          label="Default"
          value={t.model}
          options={["Haiku","Sonnet","Opus"]}
          onChange={(v) => { setTweak('model', v); setModel(v); }}
        />
        <TweakSection label="Streaming indicator"/>
        <TweakSelect
          label="Style"
          value={t.streamingStyle}
          options={["row","dots","shimmer","pulse","bar-sm","bar-md","bar"]}
          onChange={(v) => setTweak('streamingStyle', v)}
        />
        <TweakSection label="Demo state"/>
        <TweakRadio
          label="State"
          value={t.demoState}
          options={["fresh","error","responded"]}
          onChange={(v) => setTweak('demoState', v)}
        />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
