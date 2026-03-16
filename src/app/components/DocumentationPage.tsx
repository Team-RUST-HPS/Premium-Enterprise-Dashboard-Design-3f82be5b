import { useState, useEffect, useRef } from "react";
import {
  BookOpen, Home, FolderKanban, Activity, FileText, Terminal, Settings,
  GitBranch, ShieldCheck, Cog, Rocket, BarChart3, ChevronRight, ChevronDown,
  Zap, Database, FileCode2, AlertCircle, CheckCircle2, ArrowRight, Code2,
  Layers, Server, Cloud, HardDrive, Shield, Bell, Package, Link2,
  Sparkles, Hash, Eye, RefreshCw, Play, Download, Upload,
  Clock, AlertTriangle, Info, X, Search, Plus,
  Monitor, Palette, Layout, Cpu, Globe, Lock, Trash2, Save, RotateCcw,
} from "lucide-react";

// ─── Design tokens (CSS-var backed) ──────────────────────────────────────────
const C = {
  bg: "var(--c-bg)", surface: "var(--c-surface)", border: "var(--c-border)",
  borderMed: "var(--c-border-med)", cardSubtle: "var(--c-card-subtle)",
  iconInactive: "var(--c-icon-inactive)", subtle: "var(--c-subtle)",
  em: "#10B981", emDim: "rgba(16,185,129,0.12)", emGlow: "var(--c-em-glow)",
  text: "var(--c-text)", sub: "var(--c-sub)", muted: "var(--c-muted)",
  err: "#EF4444", errDim: "rgba(239,68,68,0.10)",
  warn: "#F59E0B", warnDim: "rgba(245,158,11,0.10)",
  info: "#3B82F6", infoDim: "rgba(59,130,246,0.10)",
  purple: "#8B5CF6", purpleDim: "rgba(139,92,246,0.10)",
};

// ─── Original copyright-free themes ──────────────────────────────────────────
const THEMES = [
  {
    id: "quantum-emerald",
    name: "Quantum Emerald",
    tag: "DARK · DEFAULT",
    desc: "Deep navy base with neon emerald accents — aerospace precision aesthetic",
    bg: "#080E1A", surface: "rgba(15,23,42,0.85)", accent: "#10B981",
    text: "#F1F5F9", sub: "#94A3B8", border: "rgba(255,255,255,0.07)",
    preview: ["#080E1A", "#0F1D30", "#10B981", "#3B82F6"],
    tagColor: "#10B981",
  },
  {
    id: "polar-canvas",
    name: "Polar Canvas",
    tag: "LIGHT · CLEAN",
    desc: "Pure white canvas with emerald data accents — clarity for every detail",
    bg: "#FFFFFF", surface: "rgba(248,250,252,0.95)", accent: "#10B981",
    text: "#0F172A", sub: "#475569", border: "rgba(0,0,0,0.08)",
    preview: ["#FFFFFF", "#F8FAFC", "#10B981", "#3B82F6"],
    tagColor: "#10B981",
  },
  {
    id: "deep-oceanic",
    name: "Deep Oceanic",
    tag: "DARK · BLUE",
    desc: "Abyssal navy with sapphire accents — deep-dive into your data streams",
    bg: "#060B18", surface: "rgba(8,14,32,0.85)", accent: "#3B82F6",
    text: "#E2E8F0", sub: "#7EA3CC", border: "rgba(59,130,246,0.12)",
    preview: ["#060B18", "#0C1530", "#3B82F6", "#06B6D4"],
    tagColor: "#3B82F6",
  },
  {
    id: "stellar-violet",
    name: "Stellar Violet",
    tag: "DARK · PURPLE",
    desc: "Cosmic deep-space background with violet nebula accents",
    bg: "#0A0612", surface: "rgba(18,10,36,0.85)", accent: "#8B5CF6",
    text: "#EDE9F6", sub: "#9B8FC0", border: "rgba(139,92,246,0.14)",
    preview: ["#0A0612", "#160A2E", "#8B5CF6", "#EC4899"],
    tagColor: "#8B5CF6",
  },
  {
    id: "solar-amber",
    name: "Solar Amber",
    tag: "DARK · WARM",
    desc: "Obsidian black with amber energy — high-contrast industrial precision",
    bg: "#0A0800", surface: "rgba(20,16,4,0.85)", accent: "#F59E0B",
    text: "#FEF3C7", sub: "#B45309", border: "rgba(245,158,11,0.12)",
    preview: ["#0A0800", "#1A1400", "#F59E0B", "#EF4444"],
    tagColor: "#F59E0B",
  },
];

// ─── Network Background (pure geometric SVG — copyright-free) ─────────────────
function NetworkBg() {
  const NODES = [
    [8,12],[22,38],[38,18],[52,55],[68,28],[82,48],[14,72],[28,82],
    [48,78],[62,65],[78,82],[88,18],[18,52],[44,44],[58,22],[74,62],
    [34,68],[56,38],[90,60],[6,45],[42,90],[72,10],[96,35],[30,20],
    [84,72],[50,8],[16,92],[64,44],[88,90],[40,60],
  ];
  const edges: [number[],number[]][] = [];
  for (let i = 0; i < NODES.length; i++) {
    for (let j = i + 1; j < NODES.length; j++) {
      const dx = NODES[i][0] - NODES[j][0], dy = NODES[i][1] - NODES[j][1];
      if (Math.sqrt(dx*dx+dy*dy) < 24) edges.push([NODES[i],NODES[j]]);
    }
  }
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="docBgGlow1" cx="20%" cy="20%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.04" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="docBgGlow2" cx="80%" cy="75%" r="45%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.03" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#docBgGlow1)" />
        <rect width="100%" height="100%" fill="url(#docBgGlow2)" />
        {edges.map(([a,b],i) => (
          <line key={i} x1={`${a[0]}%`} y1={`${a[1]}%`} x2={`${b[0]}%`} y2={`${b[1]}%`}
            stroke="#10B981" strokeOpacity="0.05" strokeWidth="1" />
        ))}
        {NODES.map(([x,y],i) => (
          <circle key={i} cx={`${x}%`} cy={`${y}%`} r="2" fill="#10B981" fillOpacity="0.12" />
        ))}
      </svg>
    </div>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────
function GlowCard({ children, style = {}, accent = C.em }: { children: React.ReactNode; style?: React.CSSProperties; accent?: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="rounded-2xl transition-all duration-300"
      style={{
        background: C.surface,
        border: `1px solid ${hover ? `${accent}40` : C.border}`,
        backdropFilter: "blur(16px)",
        boxShadow: hover ? `0 0 30px ${accent}12` : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children, accent = C.em }: { children: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${accent}40)` }} />
      <span className="font-mono px-4 py-1.5 rounded-full"
        style={{ color: accent, fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.15em",
          background: `${accent}12`, border: `1px solid ${accent}30` }}>
        {children}
      </span>
      <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${accent}40, transparent)` }} />
    </div>
  );
}

function Tag({ children, color = C.em }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="font-mono inline-flex items-center px-2.5 py-1 rounded-lg"
      style={{ background: `${color}12`, border: `1px solid ${color}30`, color, fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.08em" }}>
      {children}
    </span>
  );
}

// ─── Pulse Dot ────────────────────────────────────────────────────────────────
function PulseDot({ color = C.em, size = 8 }: { color?: string; size?: number }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <span className="animate-ping absolute inline-flex rounded-full opacity-50"
        style={{ background: color, width: size, height: size }} />
      <span className="relative inline-flex rounded-full"
        style={{ background: color, width: size, height: size }} />
    </span>
  );
}

// ─── Workspace Mockup (faithful to image) ─────────────────────────────────────
function WorkspaceMockupFull() {
  const tabs = ["Mapping Logic", "Validation Rules", "Processing Logic", "Deployment", "Live Monitor", "Reports"];
  const mappings = [
    { src: "ISA06", tgt: "sender_id", fn: "Direct Copy" },
    { src: "ISA08", tgt: "receiver_id", fn: "Direct Copy" },
    { src: "ST01", tgt: "transaction_type", fn: "Lookup & Convert" },
  ];
  const ediTree = [
    { seg: "ISA", desc: "(Interchange Control Header)", expanded: true, children: ["ISA06·Sender ID", "ISA08·Receiver ID"] },
    { seg: "GS", desc: "(Functional Group Header)", expanded: false, children: [] },
    { seg: "ST", desc: "(Transaction Set Header)", expanded: true, children: ["ST01·Transaction Set Identifier Code", "ST02·Transaction Set Control Number"] },
  ];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#090F1E", border: "1px solid rgba(16,185,129,0.25)", boxShadow: "0 0 60px rgba(16,185,129,0.08)" }}>
      {/* Header */}
      <div className="px-5 py-4" style={{ background: "rgba(8,14,26,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 mb-1">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <ArrowRight className="w-3 h-3 rotate-180" style={{ color: "#94A3B8" }} />
            <span className="font-mono" style={{ color: "#94A3B8", fontSize: "0.65rem" }}>Back to Projects</span>
          </button>
          <div style={{ color: "#F1F5F9", fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Healthcare Claims Processing
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)" }}>
            <PulseDot color="#10B981" size={6} />
            <span className="font-mono" style={{ color: "#10B981", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em" }}>Live</span>
          </div>
        </div>
        <div className="font-mono" style={{ color: "#475569", fontSize: "0.65rem" }}>
          837P Professional Claims v2.1 · HealthCare Partners Inc.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ background: "rgba(10,16,30,0.8)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {tabs.map((t, i) => (
          <div key={i} className="relative px-4 py-2.5 flex-shrink-0">
            <span className="font-mono" style={{ color: i === 0 ? "#10B981" : "#475569", fontSize: "0.68rem", fontWeight: i === 0 ? 700 : 400 }}>{t}</span>
            {i === 0 && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: "#10B981", boxShadow: "0 0 8px rgba(16,185,129,0.8)" }} />}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Action bar */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div style={{ color: "#F1F5F9", fontSize: "0.9rem", fontWeight: 700 }}>Mapping Logic Designer</div>
            <div className="font-mono" style={{ color: "#475569", fontSize: "0.62rem", marginTop: 2 }}>3 active mappings</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl font-mono"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94A3B8", fontSize: "0.68rem" }}>
              <FolderOpen className="w-3.5 h-3.5" /> Open Draft
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono"
              style={{ background: "#10B981", color: "#fff", fontSize: "0.68rem", fontWeight: 700, boxShadow: "0 0 20px rgba(16,185,129,0.35)" }}>
              <Save className="w-3.5 h-3.5" /> Save Draft
            </button>
          </div>
        </div>

        {/* 3-column layout */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr 280px" }}>
          {/* Source EDI */}
          <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ color: "#F1F5F9", fontSize: "0.72rem", fontWeight: 700, marginBottom: 12 }}>Source EDI Structure</div>
            {ediTree.map((node, i) => (
              <div key={i}>
                <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-white/[0.03]">
                  {node.expanded ? <ChevronDown className="w-3 h-3" style={{ color: "#475569" }} /> : <ChevronRight className="w-3 h-3" style={{ color: "#475569" }} />}
                  <span className="font-mono" style={{ color: "#10B981", fontSize: "0.65rem", fontWeight: 700 }}>
                    {node.expanded || !node.expanded ? "[+]" : "[+]"} {node.seg}
                  </span>
                  <span style={{ color: "#475569", fontSize: "0.62rem" }}>{node.desc}</span>
                </div>
                {node.expanded && node.children.map((child, j) => (
                  <div key={j} className="ml-6 py-1 px-3 rounded-lg cursor-pointer hover:bg-white/[0.03]">
                    <span className="font-mono" style={{ color: "#94A3B8", fontSize: "0.6rem" }}>[+] {child}</span>
                  </div>
                ))}
                {!node.expanded && <div className="ml-6 font-mono" style={{ color: "#334155", fontSize: "0.58rem" }}>...</div>}
              </div>
            ))}
          </div>

          {/* Active Mappings */}
          <div className="p-4 rounded-xl relative" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ color: "#F1F5F9", fontSize: "0.72rem", fontWeight: 700, marginBottom: 12 }}>Active Mappings ({mappings.length})</div>
            <div className="space-y-3">
              {mappings.map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  {/* Source arrow + box */}
                  <div className="flex-1 flex items-center gap-1.5">
                    <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, #10B981)` }} />
                    <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: "#10B981" }} />
                  </div>
                  <div className="px-3 py-2.5 rounded-xl flex-shrink-0" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.25)", minWidth: 120 }}>
                    <div className="font-mono" style={{ color: "#F1F5F9", fontSize: "0.65rem", fontWeight: 700, marginBottom: 2 }}>{m.tgt}</div>
                    <div className="font-mono" style={{ color: "#475569", fontSize: "0.55rem" }}>Transformation: {m.fn}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* AI Suggestions */}
            <div className="p-4 rounded-xl" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.25)", boxShadow: "0 0 20px rgba(16,185,129,0.05)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5" style={{ color: "#10B981" }} />
                <span style={{ color: "#10B981", fontSize: "0.68rem", fontWeight: 700 }}>AI Suggested Mappings</span>
              </div>
              {[
                { src: "ST02", tgt: "control_number", desc: "High confidence mapping based on field analysis." },
                { src: "GS01", tgt: "functional_group_id", desc: "Suggested based on standard EDI structures." },
              ].map((s, i) => (
                <div key={i} className="flex items-start justify-between gap-2 mb-2.5 last:mb-0 p-2.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div>
                    <div className="font-mono" style={{ color: "#F1F5F9", fontSize: "0.62rem", fontWeight: 700 }}>{s.src}→{s.tgt}</div>
                    <div style={{ color: "#475569", fontSize: "0.58rem", lineHeight: 1.4, marginTop: 2 }}>{s.desc}</div>
                  </div>
                  <button className="px-2.5 py-1.5 rounded-lg flex-shrink-0"
                    style={{ background: "#10B981", color: "#fff", fontSize: "0.58rem", fontWeight: 700 }}>
                    Accept
                  </button>
                </div>
              ))}
            </div>
            {/* Draft History */}
            <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ color: "#F1F5F9", fontSize: "0.68rem", fontWeight: 700, marginBottom: 10 }}>Draft History</div>
              {[
                { time: "Draft saved 10 minutes ago", user: "by John Doe (Auto-save)" },
                { time: "Draft saved 2 hours ago", user: "by Sarah Lee (Manual save)" },
              ].map((d, i) => (
                <div key={i} className="flex items-center gap-2.5 mb-2 last:mb-0 py-1.5">
                  <Clock className="w-3 h-3 flex-shrink-0" style={{ color: "#475569" }} />
                  <div>
                    <div style={{ color: "#94A3B8", fontSize: "0.6rem" }}>{d.time}</div>
                    <div style={{ color: "#475569", fontSize: "0.57rem" }}>{d.user}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Theme Showcase Card ───────────────────────────────────────────────────────
function ThemeShowcaseCard({ theme }: { theme: typeof THEMES[0] }) {
  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
      style={{ border: `1px solid ${theme.accent}25`, boxShadow: `0 0 30px ${theme.accent}08` }}>
      {/* Preview window */}
      <div className="p-4 relative overflow-hidden" style={{ background: theme.bg, minHeight: 140 }}>
        {/* Network dots preview */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.4 }}>
          {[[10,20],[30,60],[50,30],[70,70],[85,25],[20,80],[60,50],[90,65]].map(([x,y],i) => (
            <circle key={i} cx={`${x}%`} cy={`${y}%`} r="2" fill={theme.accent} fillOpacity="0.3" />
          ))}
          <line x1="10%" y1="20%" x2="30%" y2="60%" stroke={theme.accent} strokeOpacity="0.12" strokeWidth="1"/>
          <line x1="30%" y1="60%" x2="50%" y2="30%" stroke={theme.accent} strokeOpacity="0.12" strokeWidth="1"/>
          <line x1="50%" y1="30%" x2="70%" y2="70%" stroke={theme.accent} strokeOpacity="0.12" strokeWidth="1"/>
          <line x1="85%" y1="25%" x2="70%" y2="70%" stroke={theme.accent} strokeOpacity="0.12" strokeWidth="1"/>
        </svg>
        {/* Mini UI mockup */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: theme.accent }}>
              <Zap style={{ width: 10, height: 10, color: "#fff" }} />
            </div>
            <span className="font-mono" style={{ color: theme.text, fontSize: "0.6rem", fontWeight: 700 }}>Nexus Pipeline</span>
            <div className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: `${theme.accent}20`, border: `1px solid ${theme.accent}40` }}>
              <div className="w-1 h-1 rounded-full" style={{ background: theme.accent }} />
              <span className="font-mono" style={{ color: theme.accent, fontSize: "0.48rem", fontWeight: 700 }}>LIVE</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {["Projects", "Monitor", "Reports"].map((l, i) => (
              <div key={i} className="p-2 rounded-lg text-center" style={{ background: i === 0 ? `${theme.accent}18` : `${theme.surface}`, border: `1px solid ${i === 0 ? `${theme.accent}35` : theme.border}` }}>
                <div className="font-mono" style={{ color: i === 0 ? theme.accent : theme.sub, fontSize: "0.5rem", fontWeight: i === 0 ? 700 : 500 }}>{l}</div>
              </div>
            ))}
          </div>
          <div className="p-2 rounded-lg" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
            <div className="flex items-center gap-2">
              <div className="h-1 rounded-full flex-1" style={{ background: `${theme.accent}30` }}>
                <div className="h-1 rounded-full" style={{ width: "72%", background: theme.accent }} />
              </div>
              <span className="font-mono" style={{ color: theme.accent, fontSize: "0.48rem", fontWeight: 700 }}>72%</span>
            </div>
          </div>
        </div>
        {/* Color swatches */}
        <div className="absolute bottom-3 right-3 flex gap-1">
          {theme.preview.map((c, i) => (
            <div key={i} className="w-4 h-4 rounded-full border border-white/10" style={{ background: c }} />
          ))}
        </div>
      </div>
      {/* Info */}
      <div className="p-4" style={{ background: C.surface, borderTop: `1px solid ${theme.accent}15` }}>
        <div className="flex items-center gap-2 mb-2">
          <span style={{ color: C.text, fontSize: "0.82rem", fontWeight: 700 }}>{theme.name}</span>
          <Tag color={theme.tagColor}>{theme.tag}</Tag>
        </div>
        <p style={{ color: C.muted, fontSize: "0.72rem", lineHeight: 1.5 }}>{theme.desc}</p>
      </div>
    </div>
  );
}

// ─── Sidebar Mockup ───────────────────────────────────────────────────────────
function SidebarMockup({ active = "home" }: { active?: string }) {
  const nav = [
    { id: "home", icon: Home, label: "Home" },
    { id: "projects", icon: FolderKanban, label: "Projects" },
    { id: "monitoring", icon: Activity, label: "Monitoring" },
    { id: "reports", icon: FileText, label: "Reports" },
  ];
  return (
    <div className="rounded-xl overflow-hidden flex-shrink-0" style={{ width: 140, background: "#090F1E", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="p-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "#10B981" }}>
            <Zap style={{ width: 10, height: 10, color: "#fff" }} />
          </div>
          <div>
            <div style={{ color: "#F1F5F9", fontSize: "0.55rem", fontWeight: 700 }}>Nexus Pipeline</div>
            <div className="font-mono" style={{ color: "#10B981", fontSize: "0.45rem" }}>v4.0 · DATA ENGINE</div>
          </div>
        </div>
      </div>
      <div className="p-1.5 space-y-0.5">
        {nav.map(item => (
          <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
            style={{ background: active === item.id ? "rgba(16,185,129,0.12)" : "transparent", border: active === item.id ? "1px solid rgba(16,185,129,0.25)" : "1px solid transparent" }}>
            <item.icon style={{ width: 11, height: 11, color: active === item.id ? "#10B981" : "#475569" }} />
            <span className="font-mono" style={{ color: active === item.id ? "#10B981" : "#94A3B8", fontSize: "0.58rem", fontWeight: active === item.id ? 700 : 500 }}>{item.label}</span>
            {active === item.id && <div className="ml-auto w-1 h-1 rounded-full" style={{ background: "#10B981" }} />}
          </div>
        ))}
        <div className="my-1 mx-1" style={{ borderTop: "1px solid rgba(139,92,246,0.2)" }} />
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
          <Terminal style={{ width: 11, height: 11, color: "#8B5CF6" }} />
          <span className="font-mono" style={{ color: "#8B5CF6", fontSize: "0.58rem", fontWeight: 700 }}>Developer</span>
          <span className="ml-auto font-mono px-1 rounded" style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6", fontSize: "0.4rem", fontWeight: 800 }}>DEV</span>
        </div>
      </div>
      <div className="p-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
          <Settings style={{ width: 11, height: 11, color: "#475569" }} />
          <span className="font-mono" style={{ color: "#475569", fontSize: "0.58rem" }}>Settings</span>
        </div>
        <div className="p-2 rounded-lg mt-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-1 mb-1">
            <PulseDot color="#10B981" size={6} />
            <span className="font-mono" style={{ color: "#10B981", fontSize: "0.45rem", fontWeight: 700 }}>SYSTEM LIVE</span>
          </div>
          <div style={{ color: "#475569", fontSize: "0.45rem" }}>developer@mailid.com</div>
        </div>
      </div>
    </div>
  );
}

// ─── Home Mockup ──────────────────────────────────────────────────────────────
function HomeMockup() {
  return (
    <div className="flex gap-3" style={{ height: 280 }}>
      <SidebarMockup active="home" />
      <div className="flex-1 rounded-xl overflow-hidden p-5 flex flex-col items-center justify-center relative"
        style={{ background: "#090F1E", border: "1px solid rgba(255,255,255,0.06)" }}>
        <svg className="absolute inset-0 w-full h-full opacity-30" style={{ pointerEvents: "none" }}>
          {[[8,15],[35,50],[65,25],[88,70],[20,80],[50,90],[75,45]].map(([x,y],i) => (
            <circle key={i} cx={`${x}%`} cy={`${y}%`} r="2" fill="#10B981" fillOpacity="0.4" />
          ))}
          <line x1="8%" y1="15%" x2="35%" y2="50%" stroke="#10B981" strokeOpacity="0.12" strokeWidth="1"/>
          <line x1="35%" y1="50%" x2="65%" y2="25%" stroke="#10B981" strokeOpacity="0.12" strokeWidth="1"/>
          <line x1="65%" y1="25%" x2="88%" y2="70%" stroke="#10B981" strokeOpacity="0.12" strokeWidth="1"/>
        </svg>
        <div className="relative z-10 w-full flex flex-col items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
            style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)" }}>
            <PulseDot color="#10B981" size={5} />
            <span className="font-mono" style={{ color: "#10B981", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.1em" }}>
              IMPLEMENTATION PROJECT · DATA PROCESSING ENGINE
            </span>
          </div>
          <div className="text-center mb-4" style={{ color: "#F1F5F9", fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.1 }}>
            Enterprise <span style={{ color: "#10B981", textShadow: "0 0 20px rgba(16,185,129,0.4)" }}>Data Processing</span> Engine
          </div>
          <div className="grid grid-cols-3 gap-3 w-full mb-4">
            {[{ icon: FolderKanban, label: "Projects", color: "#10B981" }, { icon: Activity, label: "Live Monitoring", color: "#3B82F6" }, { icon: FileText, label: "Reports", color: "#8B5CF6" }].map((f, i) => (
              <div key={i} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${f.color}25` }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: `${f.color}18` }}>
                  <f.icon style={{ width: 14, height: 14, color: f.color }} />
                </div>
                <div style={{ color: "#F1F5F9", fontSize: "0.65rem", fontWeight: 700 }}>{f.label}</div>
                <div className="flex items-center gap-1 mt-1" style={{ color: f.color, fontSize: "0.55rem" }}>
                  <span>Open</span><ArrowRight style={{ width: 8, height: 8 }} />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 w-full">
            {[{ v: "15+", l: "EDI Types" }, { v: "7", l: "SNIP Rules" }, { v: "PDF·CSV", l: "Exports" }, { v: "S3·FSx", l: "Storage" }].map((s, i) => (
              <div key={i} className="p-2 rounded-lg text-center" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)" }}>
                <div className="font-mono" style={{ color: "#10B981", fontSize: "0.68rem", fontWeight: 700 }}>{s.v}</div>
                <div style={{ color: "#475569", fontSize: "0.5rem" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Monitoring Mockup ────────────────────────────────────────────────────────
function MonitoringMockup() {
  return (
    <div className="flex gap-3" style={{ height: 280 }}>
      <SidebarMockup active="monitoring" />
      <div className="flex-1 rounded-xl overflow-hidden p-4" style={{ background: "#090F1E", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div style={{ color: "#F1F5F9", fontSize: "1rem", fontWeight: 800 }}>Global Monitoring</div>
            <div style={{ color: "#475569", fontSize: "0.62rem" }}>Real-time platform operations</div>
          </div>
          <div className="px-3 py-2 rounded-xl" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)" }}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <PulseDot color="#10B981" size={5} />
              <span className="font-mono" style={{ color: "#10B981", fontSize: "0.5rem", fontWeight: 700 }}>ALL SYSTEMS OPERATIONAL</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[{ l: "Active Projects", v: "12", c: "#10B981", Icon: FolderKanban }, { l: "Files Today", v: "14,582", c: "#3B82F6", Icon: FileText }, { l: "Failed", v: "87", c: "#EF4444", Icon: AlertCircle }, { l: "Avg Time", v: "1.2s", c: "#8B5CF6", Icon: Clock }].map((m, i) => (
            <div key={i} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${m.c}20` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${m.c}18` }}>
                  <m.Icon style={{ width: 11, height: 11, color: m.c }} />
                </div>
                <PulseDot color={m.c} size={5} />
              </div>
              <div style={{ color: "#94A3B8", fontSize: "0.52rem", marginBottom: 2 }}>{m.l}</div>
              <div className="font-mono" style={{ color: m.c, fontSize: "1rem", fontWeight: 800 }}>{m.v}</div>
            </div>
          ))}
        </div>
        <div className="p-3 rounded-xl mb-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ color: "#F1F5F9", fontSize: "0.62rem", fontWeight: 700, marginBottom: 8 }}>Live Pipeline · Processing Heatmap</div>
          <div className="grid grid-cols-12 gap-1">
            {Array.from({ length: 24 }, (_, i) => {
              const op = 0.2 + Math.sin(i * 0.7) * 0.25 + 0.3;
              const col = op > 0.65 ? "#10B981" : op > 0.45 ? "#3B82F6" : "#334155";
              return <div key={i} className="aspect-square rounded" style={{ background: col, opacity: op, boxShadow: op > 0.65 ? `0 0 4px ${col}80` : "none" }} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, color, items }: { icon: any; title: string; color: string; items: { label: string; desc: string }[] }) {
  return (
    <GlowCard accent={color}>
      <div className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}35` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div style={{ color: C.text, fontSize: "0.95rem", fontWeight: 700 }}>{title}</div>
        </div>
        <div className="space-y-2.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: C.cardSubtle, border: `1px solid ${C.border}` }}>
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
              <div>
                <div style={{ color: C.text, fontSize: "0.8rem", fontWeight: 600 }}>{item.label}</div>
                <div style={{ color: C.muted, fontSize: "0.72rem", lineHeight: 1.5, marginTop: 2 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </GlowCard>
  );
}

// ─── Tech Stack Card ──────────────────────────────────────────────────────────
function TechStackCard({ category, color, icon: Icon, items }: { category: string; color: string; icon: any; items: { name: string; version: string; desc: string }[] }) {
  return (
    <GlowCard accent={color}>
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div className="font-mono uppercase" style={{ color, fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.08em" }}>{category}</div>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="p-3 rounded-xl" style={{ background: C.cardSubtle, border: `1px solid ${C.border}` }}>
              <div className="flex items-center justify-between mb-1">
                <div style={{ color: C.text, fontSize: "0.8rem", fontWeight: 700 }}>{item.name}</div>
                <Tag color={color}>{item.version}</Tag>
              </div>
              <div style={{ color: C.muted, fontSize: "0.72rem", lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </GlowCard>
  );
}

// ─── Color Swatch ─────────────────────────────────────────────────────────────
function ColorSwatch({ name, hex, token, desc }: { name: string; hex: string; token: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: C.cardSubtle, border: `1px solid ${C.border}` }}>
      <div className="w-12 h-12 rounded-xl flex-shrink-0" style={{ background: hex, boxShadow: `0 0 20px ${hex}40` }} />
      <div>
        <div style={{ color: C.text, fontSize: "0.8rem", fontWeight: 700 }}>{name}</div>
        <div className="font-mono" style={{ color: C.em, fontSize: "0.68rem" }}>{hex}</div>
        <div className="font-mono" style={{ color: C.muted, fontSize: "0.62rem" }}>{token}</div>
        <div style={{ color: C.muted, fontSize: "0.65rem", marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  );
}

// ─── FolderOpen icon (not in older lucide) ────────────────────────────────────
function FolderOpen(props: any) { return <FolderKanban {...props} />; }

// ─── Sections nav ─────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "home", label: "Home Screen", icon: Home },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "workspace", label: "Workspace", icon: GitBranch },
  { id: "monitoring", label: "Monitoring", icon: Activity },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "developer", label: "Developer Console", icon: Terminal },
  { id: "themes", label: "Themes", icon: Palette },
  { id: "design", label: "Design System", icon: Monitor },
  { id: "techstack", label: "Tech Stack", icon: Cpu },
  { id: "architecture", label: "Architecture", icon: Layout },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export function DocumentationPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`doc-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen flex relative" style={{ background: C.bg }}>
      <NetworkBg />

      {/* ── Doc Sidebar ── */}
      <div
        className="h-screen sticky top-0 flex flex-col py-5 border-r overflow-y-auto flex-shrink-0"
        style={{
          width: sidebarOpen ? 224 : 60, background: "rgba(8,14,26,0.95)",
          borderColor: C.border, backdropFilter: "blur(20px)",
          transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)", zIndex: 40,
        }}
      >
        {/* Logo */}
        <div className="px-3 mb-6 flex items-center gap-2 justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: C.emDim, border: `1px solid ${C.em}35`, boxShadow: `0 0 16px ${C.emGlow}` }}>
                <BookOpen className="w-4 h-4" style={{ color: C.em }} />
              </div>
              <div>
                <div style={{ color: C.text, fontSize: "0.72rem", fontWeight: 700 }}>Docs</div>
                <div className="font-mono" style={{ color: C.muted, fontSize: "0.52rem" }}>Nexus Pipeline v4.0</div>
              </div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(p => !p)}
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105"
            style={{ background: C.iconInactive, border: `1px solid ${C.border}` }}>
            {sidebarOpen
              ? <X className="w-3.5 h-3.5" style={{ color: C.muted }} />
              : <BookOpen className="w-3.5 h-3.5" style={{ color: C.em }} />}
          </button>
        </div>

        {/* Nav items */}
        <div className={`${sidebarOpen ? "px-3" : "px-2"} space-y-0.5 flex-1`}>
          {SECTIONS.map(sec => (
            <button key={sec.id} onClick={() => scrollTo(sec.id)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all text-left"
              style={{
                background: activeSection === sec.id ? C.emDim : "transparent",
                border: activeSection === sec.id ? `1px solid ${C.em}30` : "1px solid transparent",
                boxShadow: activeSection === sec.id ? `0 0 12px ${C.em}10` : "none",
              }}>
              <sec.icon className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: activeSection === sec.id ? C.em : C.muted }} />
              {sidebarOpen && (
                <span className="font-mono truncate"
                  style={{ color: activeSection === sec.id ? C.em : C.sub, fontSize: "0.72rem", fontWeight: activeSection === sec.id ? 700 : 500 }}>
                  {sec.label}
                </span>
              )}
              {sidebarOpen && activeSection === sec.id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: C.em }} />
              )}
            </button>
          ))}
        </div>

        {/* Status */}
        <div className="mx-3 mt-4 p-3 rounded-xl" style={{ background: C.cardSubtle, border: `1px solid ${C.border}` }}>
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-1.5 mb-1.5">
                <PulseDot color={C.em} size={6} />
                <span className="font-mono" style={{ color: C.em, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.06em" }}>SYSTEM LIVE</span>
              </div>
              <div style={{ color: C.muted, fontSize: "0.62rem" }}>developer@mailid.com</div>
            </>
          ) : (
            <div className="flex justify-center"><PulseDot color={C.em} size={6} /></div>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-auto relative z-10">
        <div className="max-w-5xl mx-auto px-8 py-10 space-y-24">

          {/* ══ OVERVIEW ══ */}
          <section id="doc-overview">
            {/* Hero banner */}
            <div className="rounded-3xl overflow-hidden mb-10" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(8,14,26,0.6) 50%, rgba(59,130,246,0.06) 100%)", border: `1px solid ${C.em}25`, boxShadow: `0 0 80px ${C.em}08` }}>
              <div className="p-10 relative">
                <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.15, pointerEvents: "none" }}>
                  {[[5,10],[20,40],[40,15],[60,50],[80,20],[95,65],[15,70],[55,80],[75,55],[90,30]].map(([x,y],i) => (
                    <circle key={i} cx={`${x}%`} cy={`${y}%`} r="2.5" fill="#10B981" />
                  ))}
                  <line x1="5%" y1="10%" x2="20%" y2="40%" stroke="#10B981" strokeWidth="1" />
                  <line x1="20%" y1="40%" x2="40%" y2="15%" stroke="#10B981" strokeWidth="1" />
                  <line x1="60%" y1="50%" x2="80%" y2="20%" stroke="#10B981" strokeWidth="1" />
                  <line x1="80%" y1="20%" x2="95%" y2="65%" stroke="#10B981" strokeWidth="1" />
                  <line x1="40%" y1="15%" x2="60%" y2="50%" stroke="#10B981" strokeWidth="1" />
                </svg>
                <div className="relative z-10 flex items-start gap-6">
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center flex-shrink-0"
                    style={{ background: C.emDim, border: `1px solid ${C.em}40`, boxShadow: `0 0 50px ${C.emGlow}` }}>
                    <Zap className="w-10 h-10" style={{ color: C.em }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 style={{ color: C.text, fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.04em" }}>
                        Nexus Pipeline <span style={{ color: C.em }}>v4.0</span>
                      </h1>
                      <Tag>ENTERPRISE</Tag>
                    </div>
                    <p style={{ color: C.sub, fontSize: "1rem", lineHeight: 1.7, maxWidth: 540 }}>
                      Enterprise Data Processing Engine — complete feature documentation for the Quantum Emerald design system and all core modules.
                    </p>
                    <div className="flex items-center gap-3 mt-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: `${C.em}12`, border: `1px solid ${C.em}30` }}>
                        <PulseDot color={C.em} size={5} />
                        <span className="font-mono" style={{ color: C.em, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em" }}>LIVE · DEMO MODE</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: C.infoDim, border: `1px solid ${C.info}30` }}>
                        <Globe className="w-3 h-3" style={{ color: C.info }} />
                        <span className="font-mono" style={{ color: C.info, fontSize: "0.65rem", fontWeight: 700 }}>React 18 · Tailwind v4</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: "Application Pages", value: "7", icon: Layout, color: C.em },
                { label: "Component Files", value: "4", icon: Package, color: C.info },
                { label: "Lines of Code", value: "5,000+", icon: Code2, color: C.purple },
                { label: "npm Dependencies", value: "40+", icon: Database, color: C.warn },
              ].map((s, i) => (
                <GlowCard key={i} accent={s.color}>
                  <div className="p-5 text-center">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: `${s.color}15` }}>
                      <s.icon className="w-5 h-5" style={{ color: s.color }} />
                    </div>
                    <div className="font-mono" style={{ color: s.color, fontSize: "1.5rem", fontWeight: 800 }}>{s.value}</div>
                    <div style={{ color: C.muted, fontSize: "0.72rem", marginTop: 4 }}>{s.label}</div>
                  </div>
                </GlowCard>
              ))}
            </div>

            {/* What + Capabilities */}
            <div className="grid grid-cols-2 gap-5 mb-8">
              <GlowCard>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="w-4 h-4" style={{ color: C.em }} />
                    <span style={{ color: C.text, fontSize: "0.95rem", fontWeight: 700 }}>What is Nexus Pipeline?</span>
                  </div>
                  <p style={{ color: C.sub, fontSize: "0.82rem", lineHeight: 1.8 }}>
                    Nexus Pipeline v4.0 is a premium enterprise-grade EDI (Electronic Data Interchange) data processing engine. It provides a complete end-to-end pipeline for creating, validating, mapping, and deploying EDI transaction sets across healthcare, finance, and supply-chain verticals. Supports HIPAA X12 standards including 837, 835, 270, 271, and more.
                  </p>
                </div>
              </GlowCard>
              <GlowCard accent={C.info}>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-4 h-4" style={{ color: C.info }} />
                    <span style={{ color: C.text, fontSize: "0.95rem", fontWeight: 700 }}>Key Capabilities</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      "15+ EDI transaction types (837, 835, 270, 271, 278...)",
                      "SNIP Level 1–7 X12 compliance validation",
                      "AI-assisted mapping suggestions",
                      "Real-time pipeline monitoring with heatmaps",
                      "Full EDI live text editor with syntax highlighting",
                      "Multi-source file loading (S3, FSx, Azure, SFTP, URL)",
                      "5 original copyright-free themes (dark + light)",
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: C.em }} />
                        <span style={{ color: C.sub, fontSize: "0.78rem" }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </GlowCard>
            </div>

            {/* Navigation map */}
            <GlowCard>
              <div className="p-6">
                <div style={{ color: C.text, fontSize: "0.95rem", fontWeight: 700, marginBottom: 20 }}>Application Navigation Map</div>
                <div className="flex items-center gap-3 flex-wrap">
                  {[
                    { label: "Home", icon: Home, color: C.em, sub: "Hero dashboard" },
                    { label: "Projects", icon: FolderKanban, color: C.em, sub: "CRUD + Workspace" },
                    { label: "Monitoring", icon: Activity, color: C.info, sub: "Live pipeline" },
                    { label: "Reports", icon: FileText, color: C.purple, sub: "Analytics" },
                    { label: "Developer", icon: Terminal, color: C.purple, sub: "EDI Editor" },
                    { label: "Settings", icon: Settings, color: C.muted, sub: "Config" },
                  ].map((page, i, arr) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
                          style={{ background: `${page.color}12`, border: `1.5px solid ${page.color}35`, boxShadow: `0 0 20px ${page.color}10` }}>
                          <page.icon className="w-6 h-6" style={{ color: page.color }} />
                        </div>
                        <div className="text-center">
                          <div style={{ color: C.text, fontSize: "0.7rem", fontWeight: 700 }}>{page.label}</div>
                          <div style={{ color: C.muted, fontSize: "0.6rem" }}>{page.sub}</div>
                        </div>
                      </div>
                      {i < arr.length - 1 && (
                        <ArrowRight className="w-4 h-4 flex-shrink-0 mb-5" style={{ color: C.border }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </GlowCard>
          </section>

          {/* ══ HOME SCREEN ══ */}
          <section id="doc-home">
            <SectionLabel>SCREEN 1 — HOME</SectionLabel>
            <h2 className="mb-2" style={{ color: C.text, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Home Screen</h2>
            <p className="mb-6" style={{ color: C.sub, fontSize: "0.875rem", lineHeight: 1.8 }}>
              The hero dashboard and application entry point — radial network backdrop, animated badge, feature navigation cards, and platform stats.
            </p>
            <GlowCard style={{ marginBottom: 20 }}>
              <div className="p-5">
                <div className="font-mono mb-4" style={{ color: C.muted, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em" }}>SCREEN PREVIEW</div>
                <HomeMockup />
              </div>
            </GlowCard>
            <FeatureCard icon={Home} title="Home Screen Features" color={C.em} items={[
              { label: "Project Identity Badge", desc: "Animated pulsing pill badge with the project name, live status indicator, and version tag. Configurable via APP_CONFIG." },
              { label: "Hero Headline", desc: "Large display heading at 3.5rem/800 weight with emerald glow text shadow on 'Data Processing Engine'." },
              { label: "Feature Navigation Cards", desc: "Three interactive cards for Projects, Monitoring, and Reports with hover scale animation and color-coded accents." },
              { label: "Network Particle Overlay", desc: "SVG-based node-graph background with radial emerald and sapphire gradients at 4% opacity — aerospace depth effect." },
              { label: "Platform Stats Row", desc: "Four stat chips: 15+ EDI Types, 7 SNIP Rules, PDF/CSV exports, and S3/FSx deployment targets." },
            ]} />
          </section>

          {/* ══ PROJECTS ══ */}
          <section id="doc-projects">
            <SectionLabel>SCREEN 2 — PROJECTS</SectionLabel>
            <h2 className="mb-2" style={{ color: C.text, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Projects Dashboard</h2>
            <p className="mb-6" style={{ color: C.sub, fontSize: "0.875rem", lineHeight: 1.8 }}>
              Full project lifecycle management — create, search, filter, and open EDI mapping projects. Status-coded cards with live pulse indicators.
            </p>
            <FeatureCard icon={FolderKanban} title="Projects Features" color={C.em} items={[
              { label: "Summary Stats Bar", desc: "4 stat cards: Total, Live (emerald), Ready (sapphire), Draft (muted) — each with color-coded icons." },
              { label: "Search & Filter", desc: "Real-time search with debounce. Clearable input with X button and search icon." },
              { label: "Project Cards Grid", desc: "3-column grid of project cards showing EDI type badge, partner name, status pill with pulse dot, and spec name." },
              { label: "2-Step Create Modal", desc: "Step 1: Select BA Specification from list. Step 2: Fill project name, partner name, EDI type. Progress bar indicator." },
              { label: "Status Lifecycle", desc: "Draft → Ready → Live → Paused. Each state has a distinct color: muted, sapphire, emerald, amber." },
            ]} />
          </section>

          {/* ══ WORKSPACE ══ */}
          <section id="doc-workspace">
            <SectionLabel>SCREEN 3 — PROJECT WORKSPACE</SectionLabel>
            <h2 className="mb-2" style={{ color: C.text, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Project Workspace</h2>
            <p className="mb-6" style={{ color: C.sub, fontSize: "0.875rem", lineHeight: 1.8 }}>
              The core engineering workspace with 6 tabs: Mapping Logic, Validation Rules, Processing Logic, Deployment, Live Monitor, and Reports.
            </p>
            <GlowCard style={{ marginBottom: 20 }}>
              <div className="p-5">
                <div className="font-mono mb-4" style={{ color: C.muted, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em" }}>WORKSPACE PREVIEW — MAPPING LOGIC TAB</div>
                <WorkspaceMockupFull />
              </div>
            </GlowCard>
            <div className="grid grid-cols-2 gap-5">
              <FeatureCard icon={GitBranch} title="Mapping Logic Designer" color={C.em} items={[
                { label: "Source EDI Tree", desc: "Expandable ISA/GS/ST segment tree with child element nodes. Click to expand/collapse." },
                { label: "AI Suggested Mappings", desc: "Sparkles-icon panel with confidence-scored mapping suggestions. One-click Accept to add to canvas." },
                { label: "Active Mappings Canvas", desc: "Directional flow layout showing source → transformation → target with emerald Link2 connectors." },
                { label: "Draft History", desc: "Timestamped auto-save and manual save records with user attribution." },
              ]} />
              <FeatureCard icon={ShieldCheck} title="Validation Rules Tab" color={C.info} items={[
                { label: "SNIP 1–7 Toggles", desc: "Individual enable/disable switches for each SNIP compliance level with description text." },
                { label: "Custom DSL Builder", desc: "Monospace textarea for writing custom validation expressions (e.g., CLM01 != NULL)." },
                { label: "Pattern Preview", desc: "Auto-generated JSON pattern preview showing the compiled validation ruleset." },
                { label: "Active Rule Counter", desc: "Live badge showing how many SNIP levels are currently enabled." },
              ]} />
            </div>
          </section>

          {/* ══ MONITORING ══ */}
          <section id="doc-monitoring">
            <SectionLabel>SCREEN 4 — MONITORING</SectionLabel>
            <h2 className="mb-2" style={{ color: C.text, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Global Monitoring Dashboard</h2>
            <p className="mb-6" style={{ color: C.sub, fontSize: "0.875rem", lineHeight: 1.8 }}>
              Real-time platform visibility with pipeline health, processing trends, error analytics, storage stats, activity feed, and processing heatmap.
            </p>
            <GlowCard style={{ marginBottom: 20 }}>
              <div className="p-5">
                <div className="font-mono mb-4" style={{ color: C.muted, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em" }}>MONITORING PREVIEW</div>
                <MonitoringMockup />
              </div>
            </GlowCard>
            <FeatureCard icon={Activity} title="Monitoring Features" color={C.info} items={[
              { label: "Live Pipeline Stages", desc: "4 stage cards (Validation → Translation → Delivery → Archival) with directional arrows and pulse indicators." },
              { label: "Processing Heatmap", desc: "24-cell hourly heatmap with emerald/sapphire/slate color coding and tooltip on hover showing file count." },
              { label: "Processing Trends Chart", desc: "Horizontal bar chart showing hourly file volumes with gradient fill bars." },
              { label: "Top Validation Errors", desc: "Error frequency ranking with 'View Affected Files' drill-down buttons." },
              { label: "Storage & Archival", desc: "S3 and FSx storage stats showing files archived and total storage consumed." },
            ]} />
          </section>

          {/* ══ REPORTS ══ */}
          <section id="doc-reports">
            <SectionLabel>SCREEN 5 — REPORTS</SectionLabel>
            <h2 className="mb-2" style={{ color: C.text, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Reports & Analytics</h2>
            <p className="mb-6" style={{ color: C.sub, fontSize: "0.875rem", lineHeight: 1.8 }}>
              Comprehensive validation analytics, full EDI error explorer, SNIP compliance audit, transaction-level drill-down, and custom export builder.
            </p>
            <FeatureCard icon={BarChart3} title="ValidationReport Component" color={C.purple} items={[
              { label: "File Selector Tabs", desc: "Horizontal scrollable file tabs with status color pills (passed=emerald, failed=red, warning=amber)." },
              { label: "Summary Tab", desc: "File metadata, SNIP 1–7 compliance grid, and top errors panel in a 3-column layout." },
              { label: "Error Explorer", desc: "Searchable/filterable error table with expandable rows showing AI explanation + remediation steps." },
              { label: "Segment Analysis", desc: "Segment result table with pass/fail/warning counts and first-occurrence line numbers." },
              { label: "Raw EDI Tab", desc: "Inline code editor with syntax highlighting and error line marking for the selected file." },
              { label: "Export Builder", desc: "PDF/CSV/JSON export with configurable field selector and S3 path preview." },
            ]} />
          </section>

          {/* ══ DEVELOPER ══ */}
          <section id="doc-developer">
            <SectionLabel>SCREEN 6 — DEVELOPER CONSOLE</SectionLabel>
            <h2 className="mb-2" style={{ color: C.text, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Developer Console</h2>
            <p className="mb-6" style={{ color: C.sub, fontSize: "0.875rem", lineHeight: 1.8 }}>
              Advanced tooling panel with 3 tabs: EDI Live Text Editor (unit testing), Schema Inspector, and Debug Logs. Locked behind a DEV mode badge.
            </p>
            <FeatureCard icon={Terminal} title="EDILiveEditor Component" color={C.purple} items={[
              { label: "Live Parse Engine", desc: "Real EDI parser runs on every keystroke (debounced 400ms) detecting ISA, GS, ST, CLM, NM1, DTP, REF, SV1, HL, EQ, DMG, TRN errors." },
              { label: "Syntax Highlighting", desc: "Structural segments (ISA, GS, ST, SE) in violet, data segments in emerald. Delimiters (*~) in slate. Toggle on/off." },
              { label: "Error Gutter", desc: "Red left-border and background on error lines, yellow for warnings. Error line numbers highlighted in red." },
              { label: "File Loader Panel", desc: "Load EDI from: Local File (drag/drop), AWS S3, Amazon FSx, Azure Blob, SFTP/FTP, HTTP/API." },
              { label: "Parse History", desc: "Rolling log of last 10 parse runs with timestamp, error count, warning count, and parse duration in ms." },
              { label: "3 Sample Files", desc: "837P With Errors, 837P Clean, 270 Eligibility With Errors, and Blank starter template." },
            ]} />
          </section>

          {/* ══ THEMES ══ */}
          <section id="doc-themes">
            <SectionLabel accent={C.purple}>DESIGN — THEMES</SectionLabel>
            <h2 className="mb-2" style={{ color: C.text, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Original Themes</h2>
            <p className="mb-8" style={{ color: C.sub, fontSize: "0.875rem", lineHeight: 1.8 }}>
              Five fully original, copyright-free themes built on the same CSS custom property system. All theme names, color combinations, and design tokens are original works — no third-party design system names or trademarks used.
            </p>
            <div className="grid grid-cols-3 gap-5 mb-8">
              {THEMES.slice(0, 3).map(theme => <ThemeShowcaseCard key={theme.id} theme={theme} />)}
            </div>
            <div className="grid grid-cols-2 gap-5 mb-8">
              {THEMES.slice(3).map(theme => <ThemeShowcaseCard key={theme.id} theme={theme} />)}
            </div>
            <GlowCard>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Code2 className="w-5 h-5" style={{ color: C.em }} />
                  <span style={{ color: C.text, fontSize: "0.95rem", fontWeight: 700 }}>Theme Architecture</span>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <div className="font-mono mb-3" style={{ color: C.em, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em" }}>HOW THEMES WORK</div>
                    <div className="space-y-2">
                      {[
                        { key: "CSS Custom Properties", val: "All theme colors are CSS variables on :root" },
                        { key: "ThemeProvider", val: "React context sets vars via JS on toggle" },
                        { key: "THEME_VARS object", val: "Maps each theme to its CSS variable values" },
                        { key: "C token object", val: "Reads vars at render time — auto-reactive" },
                        { key: "localStorage", val: "Persists user theme preference across sessions" },
                      ].map((r, i) => (
                        <div key={i} className="p-2.5 rounded-lg" style={{ background: C.cardSubtle, border: `1px solid ${C.border}` }}>
                          <div style={{ color: C.text, fontSize: "0.72rem", fontWeight: 700 }}>{r.key}</div>
                          <div style={{ color: C.muted, fontSize: "0.65rem", marginTop: 1 }}>{r.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono mb-3" style={{ color: C.em, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em" }}>CSS VARIABLE MAP</div>
                    <div className="p-4 rounded-xl font-mono" style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${C.em}20` }}>
                      {[
                        { v: "--c-bg", desc: "Page background" },
                        { v: "--c-surface", desc: "Card / panel surface" },
                        { v: "--c-sidebar", desc: "Navigation sidebar" },
                        { v: "--c-border", desc: "Subtle border" },
                        { v: "--c-border-med", desc: "Medium border" },
                        { v: "--c-card-subtle", desc: "Nested card fill" },
                        { v: "--c-subtle", desc: "Ghost element fill" },
                        { v: "--c-text", desc: "Primary text" },
                        { v: "--c-sub", desc: "Secondary text" },
                        { v: "--c-muted", desc: "Muted / hint text" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-1 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                          <span style={{ color: C.em, fontSize: "0.62rem" }}>{item.v}</span>
                          <span style={{ color: C.muted, fontSize: "0.58rem" }}>{item.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </GlowCard>
          </section>

          {/* ══ DESIGN SYSTEM ══ */}
          <section id="doc-design">
            <SectionLabel>DESIGN — QUANTUM EMERALD</SectionLabel>
            <h2 className="mb-2" style={{ color: C.text, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Design System</h2>
            <p className="mb-8" style={{ color: C.sub, fontSize: "0.875rem", lineHeight: 1.8 }}>
              The Quantum Emerald design system — palette, typography, spacing, and component tokens for the default dark theme.
            </p>

            {/* Colors */}
            <GlowCard style={{ marginBottom: 20 }}>
              <div className="p-6">
                <div style={{ color: C.text, fontSize: "0.95rem", fontWeight: 700, marginBottom: 20 }}>Color Palette</div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { name: "Neon Emerald", hex: "#10B981", token: "C.em", desc: "Primary accent — active states, CTAs, live indicators" },
                    { name: "Sapphire Blue", hex: "#3B82F6", token: "C.info", desc: "Informational states, secondary accents" },
                    { name: "Stellar Violet", hex: "#8B5CF6", token: "C.purple", desc: "Developer tools, special features, DEV badge" },
                    { name: "Caution Amber", hex: "#F59E0B", token: "C.warn", desc: "Warnings, paused states, degraded health" },
                    { name: "Alert Rose", hex: "#EF4444", token: "C.err", desc: "Errors, failures, critical validation violations" },
                    { name: "Navy Void", hex: "#080E1A", token: "C.bg (dark)", desc: "Page background in Quantum Emerald dark theme" },
                  ].map((s, i) => <ColorSwatch key={i} {...s} />)}
                </div>
                {/* Theme-sensitive tokens */}
                <div style={{ color: C.text, fontSize: "0.85rem", fontWeight: 700, marginBottom: 12 }}>Theme-Sensitive Tokens</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { n: "C.bg", d: "Page background" },
                    { n: "C.surface", d: "Glass card fill" },
                    { n: "C.sidebar", d: "Navigation bg" },
                    { n: "C.text", d: "Primary text" },
                    { n: "C.sub", d: "Secondary text" },
                    { n: "C.muted", d: "Hint/placeholder" },
                    { n: "C.border", d: "Subtle divider" },
                    { n: "C.borderMed", d: "Medium divider" },
                    { n: "C.cardSubtle", d: "Nested card" },
                  ].map((t, i) => (
                    <div key={i} className="p-3 rounded-xl" style={{ background: C.cardSubtle, border: `1px solid ${C.border}` }}>
                      <div className="font-mono" style={{ color: C.em, fontSize: "0.68rem", fontWeight: 700 }}>{t.n}</div>
                      <div style={{ color: C.muted, fontSize: "0.62rem", marginTop: 2 }}>{t.d}</div>
                    </div>
                  ))}
                </div>
              </div>
            </GlowCard>

            {/* Typography */}
            <GlowCard style={{ marginBottom: 20 }}>
              <div className="p-6">
                <div style={{ color: C.text, fontSize: "0.95rem", fontWeight: 700, marginBottom: 20 }}>Typography Scale</div>
                <div className="space-y-4">
                  {[
                    { label: "Display / Hero", size: "3.5rem", weight: "800", ls: "-0.04em", sample: "Enterprise Data Engine", mono: false },
                    { label: "Page Title", size: "2.25rem", weight: "800", ls: "-0.03em", sample: "Projects Dashboard", mono: false },
                    { label: "Section Header", size: "1.25rem", weight: "700", ls: "-0.02em", sample: "Mapping Logic Designer", mono: false },
                    { label: "Card Title", size: "1rem", weight: "700", ls: "-0.01em", sample: "Healthcare Claims Processing", mono: false },
                    { label: "Body Text", size: "0.875rem", weight: "400", ls: "0", sample: "End-to-end data pipeline for EDI mapping", mono: false },
                    { label: "Mono Label", size: "0.72rem", weight: "700", ls: "0.1em", sample: "SYSTEM LIVE", mono: true },
                    { label: "Mono Caption", size: "0.65rem", weight: "500", ls: "0.06em", sample: "837P Professional Claims v2.1", mono: true },
                  ].map((t, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: C.cardSubtle, border: `1px solid ${C.border}` }}>
                      <div className="w-28 flex-shrink-0">
                        <div style={{ color: C.muted, fontSize: "0.65rem" }}>{t.label}</div>
                        <div className="font-mono" style={{ color: C.em, fontSize: "0.6rem" }}>{t.size} / {t.weight}</div>
                      </div>
                      <div className={t.mono ? "font-mono" : ""} style={{ color: C.text, fontSize: t.size === "3.5rem" ? "1.1rem" : t.size, fontWeight: parseInt(t.weight), letterSpacing: t.ls, lineHeight: 1.2 }}>
                        {t.sample}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlowCard>

            {/* Component tokens */}
            <GlowCard>
              <div className="p-6">
                <div style={{ color: C.text, fontSize: "0.95rem", fontWeight: 700, marginBottom: 20 }}>Component Patterns</div>
                <div className="grid grid-cols-3 gap-4">
                  {/* Buttons */}
                  <div>
                    <div className="font-mono mb-3" style={{ color: C.muted, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em" }}>BUTTONS</div>
                    <div className="space-y-2">
                      <button className="w-full py-2.5 rounded-xl transition-all hover:scale-105"
                        style={{ background: C.em, color: "#fff", fontSize: "0.8rem", fontWeight: 700, boxShadow: `0 0 20px ${C.emGlow}` }}>
                        Primary Action
                      </button>
                      <button className="w-full py-2.5 rounded-xl transition-all"
                        style={{ background: C.emDim, border: `1px solid ${C.em}35`, color: C.em, fontSize: "0.8rem", fontWeight: 700 }}>
                        Secondary Action
                      </button>
                      <button className="w-full py-2.5 rounded-xl transition-all"
                        style={{ background: C.subtle, border: `1px solid ${C.border}`, color: C.sub, fontSize: "0.8rem", fontWeight: 600 }}>
                        Ghost Action
                      </button>
                    </div>
                  </div>
                  {/* Badges */}
                  <div>
                    <div className="font-mono mb-3" style={{ color: C.muted, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em" }}>STATUS BADGES</div>
                    <div className="space-y-2">
                      {[
                        { label: "LIVE", color: C.em }, { label: "READY", color: C.info },
                        { label: "DRAFT", color: C.muted }, { label: "PAUSED", color: C.warn },
                        { label: "FAILED", color: C.err }, { label: "DEV MODE", color: C.purple },
                      ].map((b, i) => (
                        <div key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg mr-2 mb-2"
                          style={{ background: `${b.color}12`, border: `1px solid ${b.color}30`, color: b.color, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em" }}>
                          {(b.label === "LIVE") && <PulseDot color={b.color} size={5} />}
                          {b.label}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Cards */}
                  <div>
                    <div className="font-mono mb-3" style={{ color: C.muted, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em" }}>CARD VARIANTS</div>
                    <div className="space-y-2">
                      {[
                        { label: "Standard Card", bg: C.surface, border: C.border },
                        { label: "Glow Card (hover)", bg: C.surface, border: `${C.em}40` },
                        { label: "Subtle Card", bg: C.cardSubtle, border: C.border },
                        { label: "Alert Card", bg: C.errDim, border: `${C.err}25` },
                      ].map((c, i) => (
                        <div key={i} className="p-2.5 rounded-xl"
                          style={{ background: c.bg, border: `1px solid ${c.border}`, backdropFilter: "blur(12px)" }}>
                          <span style={{ color: C.sub, fontSize: "0.65rem" }}>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </GlowCard>
          </section>

          {/* ══ TECH STACK ══ */}
          <section id="doc-techstack">
            <SectionLabel accent={C.info}>ENGINEERING — TECH STACK</SectionLabel>
            <h2 className="mb-2" style={{ color: C.text, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Technology Stack</h2>
            <p className="mb-8" style={{ color: C.sub, fontSize: "0.875rem", lineHeight: 1.8 }}>
              All dependencies, build tooling, and runtime libraries powering Nexus Pipeline v4.0.
            </p>
            <div className="grid grid-cols-2 gap-5">
              <TechStackCard category="Core Runtime" color={C.info} icon={Globe} items={[
                { name: "React 18", version: "18.3.1", desc: "Concurrent rendering, Suspense, useTransition for smooth UX" },
                { name: "TypeScript", version: "5.x", desc: "Full static typing across all components and interfaces" },
                { name: "Vite", version: "6.3.5", desc: "Lightning-fast HMR dev server and production bundler" },
              ]} />
              <TechStackCard category="Styling" color={C.em} icon={Palette} items={[
                { name: "Tailwind CSS", version: "v4.1.12", desc: "Utility-first CSS with @tailwindcss/vite plugin" },
                { name: "CSS Custom Props", version: "native", desc: "Theme variable system via :root vars + JS injection" },
                { name: "tw-animate-css", version: "1.3.8", desc: "Additional animation utilities for pulse, spin, bounce" },
              ]} />
              <TechStackCard category="Data & Auth" color={C.warn} icon={Database} items={[
                { name: "Firebase", version: "12.10.0", desc: "Auth (custom token + anonymous), Firestore. ENABLE_REAL_FIREBASE flag." },
                { name: "React Router", version: "7.13.0", desc: "Data mode router with createBrowserRouter. Route-level loading." },
                { name: "React Hook Form", version: "7.55.0", desc: "Performant form management with schema validation" },
              ]} />
              <TechStackCard category="UI Components" color={C.purple} icon={Package} items={[
                { name: "Lucide React", version: "0.487.0", desc: "500+ pixel-perfect icons. Consistent 4px grid sizing." },
                { name: "Radix UI", version: "various", desc: "Accessible unstyled primitives: Dialog, Popover, Select, etc." },
                { name: "Recharts", version: "2.15.2", desc: "Composable SVG chart library for analytics views" },
              ]} />
            </div>
          </section>

          {/* ══ ARCHITECTURE ══ */}
          <section id="doc-architecture">
            <SectionLabel accent={C.purple}>ENGINEERING — ARCHITECTURE</SectionLabel>
            <h2 className="mb-2" style={{ color: C.text, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Architecture</h2>
            <p className="mb-8" style={{ color: C.sub, fontSize: "0.875rem", lineHeight: 1.8 }}>
              Single-file React architecture with three split-out component files. State managed at the App root. Firebase integrated behind an ENABLE_REAL_FIREBASE feature flag.
            </p>
            <div className="grid grid-cols-2 gap-5 mb-5">
              <GlowCard accent={C.em}>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: C.emDim, border: `1px solid ${C.em}30` }}>
                      <Layout className="w-4 h-4" style={{ color: C.em }} />
                    </div>
                    <span style={{ color: C.text, fontSize: "0.9rem", fontWeight: 700 }}>File Structure</span>
                  </div>
                  <div className="p-4 rounded-xl font-mono" style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${C.em}15` }}>
                    {[
                      { file: "src/app/App.tsx", desc: "Root — 2,071 lines", depth: 0, color: C.em },
                      { file: "components/FileProcessingTable.tsx", desc: "Processing UI", depth: 1, color: C.info },
                      { file: "components/ValidationReport.tsx", desc: "Report engine", depth: 1, color: C.info },
                      { file: "components/EDILiveEditor.tsx", desc: "EDI parser + editor", depth: 1, color: C.info },
                      { file: "components/DocumentationPage.tsx", desc: "This page", depth: 1, color: C.purple },
                      { file: "styles/fonts.css", desc: "CSS vars defaults", depth: 0, color: C.muted },
                      { file: "styles/theme.css", desc: "Tailwind theme", depth: 0, color: C.muted },
                    ].map((f, i) => (
                      <div key={i} className="flex items-center gap-2 py-1.5 border-b last:border-0" style={{ paddingLeft: f.depth * 16, borderColor: "rgba(255,255,255,0.04)" }}>
                        {f.depth > 0 && <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: C.border }} />}
                        <span style={{ color: f.color, fontSize: "0.62rem", fontWeight: f.depth === 0 ? 700 : 500 }}>{f.file}</span>
                        <span className="ml-auto" style={{ color: C.muted, fontSize: "0.55rem" }}>{f.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </GlowCard>
              <GlowCard accent={C.purple}>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: C.purpleDim, border: `1px solid ${C.purple}30` }}>
                      <Server className="w-4 h-4" style={{ color: C.purple }} />
                    </div>
                    <span style={{ color: C.text, fontSize: "0.9rem", fontWeight: 700 }}>State Management</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { layer: "ThemeProvider", desc: "React Context wraps entire app. Injects CSS vars on toggle. Persists to localStorage.", color: C.em },
                      { layer: "App Root State", desc: "currentPage, selectedProject, authLoading, user — lifted to App() with useState hooks.", color: C.info },
                      { layer: "Page Local State", desc: "Projects list, filter, tab state, modal visibility — each page manages its own state.", color: C.purple },
                      { layer: "Mock Firebase", desc: "ENABLE_REAL_FIREBASE=false → setTimeout mock auth. Set to true + add config to enable real auth.", color: C.warn },
                      { layer: "Mock Data", desc: "All projects, EDI files, errors, pipelines are static arrays. Connect Firestore to replace.", color: C.muted },
                    ].map((s, i) => (
                      <div key={i} className="p-3 rounded-xl" style={{ background: C.cardSubtle, border: `1px solid ${C.border}` }}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                          <span style={{ color: C.text, fontSize: "0.75rem", fontWeight: 700 }}>{s.layer}</span>
                        </div>
                        <div style={{ color: C.muted, fontSize: "0.68rem", lineHeight: 1.5 }}>{s.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </GlowCard>
            </div>

            {/* Quick start */}
            <GlowCard accent={C.em}>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <Zap className="w-5 h-5" style={{ color: C.em }} />
                  <span style={{ color: C.text, fontSize: "0.95rem", fontWeight: 700 }}>Quick Start Guide</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { step: "01", title: "Enable Firebase", desc: "Set ENABLE_REAL_FIREBASE = true in App.tsx line 27. Fill in your Firebase config object with real API keys.", color: C.em },
                    { step: "02", title: "Connect Data", desc: "Replace the mock arrays (projects, files, errors) with Firestore onSnapshot listeners in each dashboard component.", color: C.info },
                    { step: "03", title: "Deploy", desc: "Run pnpm build. Deploy to Vercel, Netlify, or AWS Amplify. Set VITE_ENV vars for environment-specific Firebase config.", color: C.purple },
                  ].map((s, i) => (
                    <div key={i} className="p-4 rounded-2xl" style={{ background: `${s.color}06`, border: `1px solid ${s.color}25` }}>
                      <div className="font-mono mb-3" style={{ color: s.color, fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>{s.step}</div>
                      <div style={{ color: C.text, fontSize: "0.82rem", fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
                      <div style={{ color: C.muted, fontSize: "0.72rem", lineHeight: 1.6 }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </GlowCard>
          </section>

          {/* Footer */}
          <div className="pb-16 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full" style={{ background: C.emDim, border: `1px solid ${C.em}30` }}>
              <Zap className="w-4 h-4" style={{ color: C.em }} />
              <span className="font-mono" style={{ color: C.em, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em" }}>
                NEXUS PIPELINE v4.0 — ENTERPRISE DATA PROCESSING ENGINE
              </span>
            </div>
            <p className="mt-4" style={{ color: C.muted, fontSize: "0.72rem" }}>
              All themes, components, and design tokens are original works. No third-party design system trademarks used.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
