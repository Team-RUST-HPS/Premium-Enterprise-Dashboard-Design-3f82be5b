import { useState, useEffect, createContext, useContext, useLayoutEffect } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import {
  Home, FolderKanban, GitBranch, ShieldCheck, Settings as SettingsIcon,
  Rocket, Activity, FileText, Plus, Search, CheckCircle2, AlertCircle,
  Clock, Play, Pause, Trash2, Edit3, ArrowRight, Sparkles, Save,
  FolderOpen, Download, Upload, Zap, Database, FileCode2, Eye, X,
  ChevronRight, ChevronDown, Link2, Code2, BarChart3, FileDown, Send,
  Cog, Bell, Shield, Server, ToggleRight, RefreshCw, Terminal, Layers,
  TrendingUp, Package, AlertTriangle, Info, Sun, Moon,
} from "lucide-react";
import { FileProcessingTable } from "./components/FileProcessingTable";
import { ValidationReport } from "./components/ValidationReport";
import { EDILiveEditor } from "./components/EDILiveEditor";

// ─── App Config (configurable) ───────────────────────────────────────────────
const APP_CONFIG = {
  projectName: "Implementation Project Name",
  userEmail: "developer@mailid.com",
  appSubtitle: "Enterprise Data Processing Engine",
  version: "v4.0",
};

// ─── Firebase Config ────────────────────────────────────────────────────────
const ENABLE_REAL_FIREBASE = false;
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id",
};
let app: any = null, auth: any = null, db: any = null;
if (ENABLE_REAL_FIREBASE) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

// ─── Theme variable maps ──────────────────────────────────────────────────────
const THEME_VARS = {
  dark: {
    "--c-bg": "#080E1A",
    "--c-surface": "rgba(15,23,42,0.7)",
    "--c-surface-hover": "rgba(15,23,42,0.9)",
    "--c-sidebar": "rgba(8,14,26,0.95)",
    "--c-card-subtle": "rgba(255,255,255,0.03)",
    "--c-icon-inactive": "rgba(255,255,255,0.04)",
    "--c-subtle": "rgba(255,255,255,0.05)",
    "--c-border": "rgba(255,255,255,0.07)",
    "--c-border-med": "rgba(255,255,255,0.12)",
    "--c-text": "#F1F5F9",
    "--c-sub": "#94A3B8",
    "--c-muted": "#475569",
  },
  light: {
    "--c-bg": "#FFFFFF",
    "--c-surface": "rgba(248,250,252,0.95)",
    "--c-surface-hover": "rgba(241,245,249,1)",
    "--c-sidebar": "rgba(255,255,255,0.98)",
    "--c-card-subtle": "rgba(0,0,0,0.03)",
    "--c-icon-inactive": "rgba(0,0,0,0.04)",
    "--c-subtle": "rgba(0,0,0,0.05)",
    "--c-border": "rgba(0,0,0,0.08)",
    "--c-border-med": "rgba(0,0,0,0.14)",
    "--c-text": "#0F172A",
    "--c-sub": "#475569",
    "--c-muted": "#94A3B8",
  },
} as const;

// ─── Theme context ────────────────────────────────────────────────────────────
const ThemeCtx = createContext<{ isDark: boolean; toggleTheme: () => void }>({ isDark: true, toggleTheme: () => {} });
const useTheme = () => useContext(ThemeCtx);

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try { return localStorage.getItem("npe-theme") !== "light"; } catch { return true; }
  });
  useLayoutEffect(() => {
    const vars = isDark ? THEME_VARS.dark : THEME_VARS.light;
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    try { localStorage.setItem("npe-theme", isDark ? "dark" : "light"); } catch {}
  }, [isDark]);
  return (
    <ThemeCtx.Provider value={{ isDark, toggleTheme: () => setIsDark(d => !d) }}>
      {children}
    </ThemeCtx.Provider>
  );
}

// ─── Design tokens (CSS-var backed — theme-sensitive ones switch automatically) ─
const C = {
  bg: "var(--c-bg)",
  surface: "var(--c-surface)",
  surfaceHover: "var(--c-surface-hover)",
  sidebar: "var(--c-sidebar)",
  cardSubtle: "var(--c-card-subtle)",
  iconInactive: "var(--c-icon-inactive)",
  subtle: "var(--c-subtle)",
  border: "var(--c-border)",
  borderMed: "var(--c-border-med)",
  em: "#10B981",
  emDim: "rgba(16,185,129,0.15)",
  emGlow: "rgba(16,185,129,0.35)",
  text: "var(--c-text)",
  sub: "var(--c-sub)",
  muted: "var(--c-muted)",
  err: "#EF4444",
  warn: "#F59E0B",
  info: "#3B82F6",
  purple: "#8B5CF6",
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface Project {
  id: string; name: string; ediType: string; partnerName: string;
  status: "draft" | "ready" | "live" | "paused"; lastUpdated: string; specName: string;
}
interface BASpec { id: string; name: string; version: string; createdDate: string; ediType: string; }
interface MappingRule { id: string; source: string; target: string; transformation?: string; }
interface EDINode { id: string; name: string; children?: EDINode[]; expanded?: boolean; }
interface ProcessingMetrics { filesReceived: number; filesProcessed: number; filesFailed: number; errorsDetected: number; }
interface ErrorLog { id: string; batchId: string; fileName: string; errorType: string; errorDescription: string; timestamp: string; }

// ─── Reusable primitives ─────────────────────────────────────────────────────
function Card({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: C.surface, border: `1px solid ${C.border}`, backdropFilter: "blur(12px)", ...style }}
    >
      {children}
    </div>
  );
}

function EmBadge({ label, size = "sm" }: { label: string; size?: "xs" | "sm" }) {
  return (
    <span
      className="font-mono uppercase tracking-widest"
      style={{
        background: C.emDim, border: `1px solid ${C.em}40`, color: C.em,
        fontSize: size === "xs" ? "0.6rem" : "0.68rem", fontWeight: 700,
        padding: size === "xs" ? "2px 8px" : "3px 10px", borderRadius: 6,
      }}
    >
      {label}
    </span>
  );
}

// ─── App Root ────────────────────────────────────────────────────────────────
export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectTab, setProjectTab] = useState("mapping");

  useEffect(() => {
    const init = async () => {
      if (ENABLE_REAL_FIREBASE && auth) {
        try {
          const tok = (window as any).__initial_auth_token;
          tok ? await signInWithCustomToken(auth, tok) : await signInAnonymously(auth);
        } catch (e) { console.error(e); }
        const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false); });
        return () => unsub();
      } else {
        setTimeout(() => {
          setUser({ uid: "demo-user", email: APP_CONFIG.userEmail, displayName: "Demo Developer" });
          setAuthLoading(false);
        }, 900);
      }
    };
    init();
  }, []);

  const handleProjectSelect = (p: Project) => { setSelectedProject(p); setCurrentPage("workspace"); setProjectTab("mapping"); };
  const handleBackToProjects = () => { setSelectedProject(null); setCurrentPage("projects"); };

  if (authLoading) return <LoadingScreen />;

  return (
    <ThemeProvider>
      <div className="min-h-screen flex" style={{ background: C.bg, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        {/* Subtle grid overlay */}
        <div className="fixed inset-0 pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, rgba(16,185,129,0.04) 0%, transparent 60%),
            radial-gradient(circle at 80% 80%, rgba(59,130,246,0.03) 0%, transparent 60%)`,
        }} />
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="flex-1 min-h-screen overflow-auto relative">
          {currentPage === "home" && <HomePage onNavigate={setCurrentPage} />}
          {currentPage === "projects" && <ProjectsDashboard onProjectSelect={handleProjectSelect} />}
          {currentPage === "workspace" && selectedProject && (
            <ProjectWorkspace project={selectedProject} activeTab={projectTab} onTabChange={setProjectTab} onBack={handleBackToProjects} />
          )}
          {currentPage === "monitoring" && <MonitoringDashboard />}
          {currentPage === "reports" && <ReportsViewer />}
          {currentPage === "developer" && <DeveloperPage />}
          {currentPage === "settings" && <SettingsPage />}
        </main>
      </div>
    </ThemeProvider>
  );
}

// ─── Loading Screen ──────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 animate-spin" style={{ borderColor: `${C.em}20`, borderTopColor: C.em, animationDuration: "1.5s" }} />
          {/* Inner glow */}
          <div className="absolute inset-3 rounded-full flex items-center justify-center" style={{ background: C.emDim, boxShadow: `0 0 40px ${C.emGlow}` }}>
            <Zap className="w-8 h-8" style={{ color: C.em }} />
          </div>
        </div>
        <div className="mb-2" style={{ color: C.text, fontSize: "1.125rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
          {APP_CONFIG.projectName}
        </div>
        <p className="font-mono" style={{ color: C.muted, fontSize: "0.75rem", letterSpacing: "0.1em" }}>
          INITIALIZING DATA PROCESSING ENGINE...
        </p>
        <div className="mt-6 flex gap-1 justify-center">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.em, animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ currentPage, onNavigate }: { currentPage: string; onNavigate: (p: string) => void }) {
  const top = [
    { id: "home", icon: Home, label: "Home" },
    { id: "projects", icon: FolderKanban, label: "Projects" },
    { id: "monitoring", icon: Activity, label: "Monitoring" },
    { id: "reports", icon: FileText, label: "Reports" },
    { id: "developer", icon: Terminal, label: "Developer", dev: true },
  ];
  const bottom = [
    { id: "settings", icon: SettingsIcon, label: "Settings" },
  ];

  const NavBtn = ({ item }: { item: typeof top[0] }) => {
    const active = currentPage === item.id;
    const isDev = (item as any).dev === true;
    const accent = isDev ? C.purple : C.em;
    return (
      <button
        onClick={() => onNavigate(item.id)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group"
        style={{
          background: active ? (isDev ? "rgba(139,92,246,0.12)" : C.emDim) : "transparent",
          border: active ? `1px solid ${accent}40` : "1px solid transparent",
          boxShadow: active ? `0 0 20px ${accent}18` : "none",
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
          style={{ background: active ? `${accent}25` : C.iconInactive }}
        >
          <item.icon className="w-4 h-4 transition-all" style={{ color: active ? accent : C.muted }} />
        </div>
        <span
          className="font-mono transition-all"
          style={{ color: active ? accent : C.sub, fontSize: "0.8rem", fontWeight: active ? 700 : 500, letterSpacing: "0.01em" }}
        >
          {item.label}
        </span>
        {isDev && (
          <span
            className="font-mono ml-auto px-1.5 py-0.5 rounded"
            style={{ background: "rgba(139,92,246,0.15)", color: C.purple, fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.06em", border: "1px solid rgba(139,92,246,0.3)" }}
          >
            DEV
          </span>
        )}
        {!isDev && active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: C.em }} />}
      </button>
    );
  };

  return (
    <nav
      className="h-screen sticky top-0 flex flex-col py-5 border-r"
      style={{ width: "230px", background: C.sidebar, borderColor: C.border, backdropFilter: "blur(20px)", zIndex: 50 }}
    >
      {/* Logo */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: C.emDim, border: `1px solid ${C.em}30` }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: C.em, boxShadow: `0 0 16px ${C.emGlow}` }}>
            <Zap className="w-4 h-4" style={{ color: "#fff" }} />
          </div>
          <div>
            <div style={{ color: C.text, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{APP_CONFIG.projectName}</div>
            <div className="font-mono" style={{ color: C.em, fontSize: "0.57rem", letterSpacing: "0.06em" }}>{APP_CONFIG.version} · DATA ENGINE</div>
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="px-4 mb-2">
        <span className="font-mono" style={{ color: C.muted, fontSize: "0.6rem", letterSpacing: "0.12em", fontWeight: 700 }}>NAVIGATION</span>
      </div>

      {/* Top nav */}
      <div className="px-3 flex-1 flex flex-col">
        <div className="space-y-1">
          {top.filter(i => !(i as any).dev).map(item => <NavBtn key={item.id} item={item} />)}
        </div>
        {/* Dev-only separator */}
        <div className="mt-4 mb-2 mx-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px" style={{ background: "rgba(139,92,246,0.2)" }} />
            <span className="font-mono" style={{ color: "rgba(139,92,246,0.6)", fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.1em" }}>DEV TOOLS</span>
            <div className="flex-1 h-px" style={{ background: "rgba(139,92,246,0.2)" }} />
          </div>
        </div>
        <div className="space-y-1">
          {top.filter(i => (i as any).dev).map(item => <NavBtn key={item.id} item={item} />)}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 my-3" style={{ borderTop: `1px solid ${C.border}` }} />

      {/* Bottom nav */}
      <div className="px-3 space-y-1">
        {bottom.map(item => <NavBtn key={item.id} item={item} />)}
      </div>

      {/* Theme toggle */}
      <div className="mx-4 mb-2" style={{ borderTop: `1px solid ${C.border}` }} />
      <ThemeToggle />

      {/* User / status */}
      <div className="mx-4 mt-3 p-3 rounded-xl" style={{ background: C.cardSubtle, border: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.em }} />
          <span className="font-mono" style={{ color: C.em, fontSize: "0.67rem", fontWeight: 700, letterSpacing: "0.06em" }}>SYSTEM LIVE</span>
        </div>
        <div style={{ color: C.muted, fontSize: "0.67rem" }}>{APP_CONFIG.userEmail}</div>
      </div>
    </nav>
  );
}

// ─── Theme Toggle (sidebar widget) ───────────────────────────────────────────
function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <div className="mx-4 mt-1 mb-1">
      <button
        onClick={toggleTheme}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group"
        style={{
          background: C.cardSubtle,
          border: `1px solid ${C.border}`,
        }}
        title={isDark ? "Switch to Light theme" : "Switch to Dark theme"}
      >
        {/* Track */}
        <div
          className="relative flex-shrink-0 transition-all duration-300"
          style={{
            width: 36, height: 20,
            borderRadius: 10,
            background: isDark ? "rgba(16,185,129,0.18)" : "rgba(16,185,129,0.22)",
            border: `1px solid ${C.em}50`,
          }}
        >
          {/* Thumb */}
          <div
            className="absolute top-0.5 transition-all duration-300 flex items-center justify-center rounded-full"
            style={{
              width: 16, height: 16,
              left: isDark ? 2 : 18,
              background: C.em,
              boxShadow: `0 0 8px ${C.emGlow}`,
            }}
          >
            {isDark
              ? <Moon style={{ width: 9, height: 9, color: "#fff" }} />
              : <Sun  style={{ width: 9, height: 9, color: "#fff" }} />
            }
          </div>
        </div>
        {/* Label */}
        <div className="flex flex-col items-start">
          <span className="font-mono" style={{ color: C.sub, fontSize: "0.72rem", fontWeight: 600, lineHeight: 1.2 }}>
            {isDark ? "Dark Mode" : "Light Mode"}
          </span>
          <span className="font-mono" style={{ color: C.muted, fontSize: "0.58rem", letterSpacing: "0.05em", lineHeight: 1 }}>
            {isDark ? "QUANTUM EMERALD" : "WHITE CANVAS"}
          </span>
        </div>
        {/* Right icon */}
        <div className="ml-auto">
          {isDark
            ? <Moon className="w-3.5 h-3.5" style={{ color: C.muted }} />
            : <Sun  className="w-3.5 h-3.5" style={{ color: C.em }} />
          }
        </div>
      </button>
    </div>
  );
}

// ─── Home Page ───────────────────────────────────────────────────────────────
function HomePage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const features = [
    { icon: FolderKanban, title: "Projects", desc: "Create and manage EDI mapping projects with full lifecycle tracking", action: "projects", color: C.em },
    { icon: Activity, title: "Live Monitoring", desc: "Real-time processing visibility with pipeline health metrics", action: "monitoring", color: C.info },
    { icon: FileText, title: "Reports", desc: "Comprehensive validation analytics, error heatmaps, and exports", action: "reports", color: C.purple },
  ];
  const stats = [
    { label: "EDI Types Supported", value: "15+" },
    { label: "SNIP Validation Rules", value: "7" },
    { label: "Export Formats", value: "PDF · CSV · JSON" },
    { label: "Deployment Targets", value: "S3 · FSx · Local" },
  ];

  return (
    <div className="min-h-screen p-8 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-4xl w-full">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: C.emDim, border: `1px solid ${C.em}40` }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.em }} />
              <span className="font-mono" style={{ color: C.em, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em" }}>
                {APP_CONFIG.projectName.toUpperCase()} · DATA PROCESSING ENGINE
              </span>
            </div>
          </div>

          {/* Headline */}
          <h1
            className="text-center mb-4"
            style={{ color: C.text, fontSize: "3.5rem", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.1 }}
          >
            Enterprise{" "}
            <span style={{ color: C.em, textShadow: `0 0 40px ${C.emGlow}` }}>Data Processing Engine</span>
          </h1>
          <p className="text-center mb-10 max-w-2xl mx-auto" style={{ color: C.sub, fontSize: "1.1rem", lineHeight: 1.7 }}>
            End-to-end data pipeline for creating, validating, and deploying EDI mapping projects with aerospace-grade precision
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-5 mb-10">
            {features.map((f, i) => (
              <button
                key={i}
                onClick={() => onNavigate(f.action)}
                className="p-6 rounded-2xl text-left transition-all hover:scale-[1.03] group"
                style={{ background: C.surface, border: `1px solid ${C.border}`, backdropFilter: "blur(12px)" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all group-hover:scale-110" style={{ background: `${f.color}18`, border: `1px solid ${f.color}35` }}>
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <div className="mb-2" style={{ color: C.text, fontSize: "1rem", fontWeight: 700 }}>{f.title}</div>
                <p style={{ color: C.muted, fontSize: "0.82rem", lineHeight: 1.6 }}>{f.desc}</p>
                <div className="mt-4 flex items-center gap-2" style={{ color: f.color, fontSize: "0.78rem", fontWeight: 600 }}>
                  <span>Open</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <div key={i} className="p-4 rounded-xl text-center" style={{ background: C.cardSubtle, border: `1px solid ${C.border}` }}>
                <div className="font-mono mb-1" style={{ color: C.em, fontSize: "0.9rem", fontWeight: 700 }}>{s.value}</div>
                <div style={{ color: C.muted, fontSize: "0.7rem" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Projects Dashboard ───────────────────────────────────────────────────────
function ProjectsDashboard({ onProjectSelect }: { onProjectSelect: (p: Project) => void }) {
  const [projects, setProjects] = useState<Project[]>([
    { id: "1", name: "Healthcare Claims Processing", ediType: "837", partnerName: "HealthCare Partners Inc.", status: "live", lastUpdated: "2026-03-16", specName: "837P Professional Claims v2.1" },
    { id: "2", name: "Payment Remittance System", ediType: "835", partnerName: "MedSupply Corp", status: "ready", lastUpdated: "2026-03-15", specName: "835 Payment Advice v1.5" },
    { id: "3", name: "Eligibility Verification", ediType: "270", partnerName: "Regional Medical Group", status: "draft", lastUpdated: "2026-03-14", specName: "270/271 Eligibility v1.0" },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const summaryStats = [
    { label: "Total", value: projects.length, color: C.sub },
    { label: "Live", value: projects.filter(p => p.status === "live").length, color: C.em },
    { label: "Ready", value: projects.filter(p => p.status === "ready").length, color: C.info },
    { label: "Draft", value: projects.filter(p => p.status === "draft").length, color: C.muted },
  ];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FolderKanban className="w-6 h-6" style={{ color: C.em }} />
              <span className="font-mono" style={{ color: C.muted, fontSize: "0.75rem", letterSpacing: "0.1em" }}>{APP_CONFIG.projectName.toUpperCase()} / PROJECTS</span>
            </div>
            <h1 style={{ color: C.text, fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Projects</h1>
            <p className="mt-1" style={{ color: C.muted, fontSize: "0.875rem" }}>Manage your EDI mapping pipeline projects</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2.5 px-5 py-3 rounded-xl transition-all hover:scale-105"
            style={{ background: C.em, color: "#fff", fontWeight: 700, fontSize: "0.875rem", boxShadow: `0 0 25px ${C.emGlow}` }}
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {summaryStats.map((s, i) => (
            <Card key={i} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18` }}>
                <span className="font-mono" style={{ color: s.color, fontSize: "1rem", fontWeight: 800 }}>{s.value}</span>
              </div>
              <span style={{ color: C.sub, fontSize: "0.82rem" }}>{s.label} Projects</span>
            </Card>
          ))}
        </div>

        {/* Search */}
        <Card className="flex items-center gap-3 px-4 py-3 mb-6">
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: C.muted }} />
          <input
            type="text" placeholder="Search projects..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none font-mono"
            style={{ color: C.text, fontSize: "0.875rem" }}
          />
          {search && <button onClick={() => setSearch("")}><X className="w-4 h-4" style={{ color: C.muted }} /></button>}
        </Card>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-5">
          {filtered.map(p => <ProjectCard key={p.id} project={p} onSelect={() => onProjectSelect(p)} />)}
        </div>
      </div>
      {showModal && <CreateProjectModal onClose={() => setShowModal(false)} onCreate={p => { onProjectSelect(p); setShowModal(false); }} />}
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onSelect }: { project: Project; onSelect: () => void }) {
  const statusCfg = {
    draft: { color: C.muted, label: "Draft", Icon: Edit3 },
    ready: { color: C.info, label: "Ready", Icon: CheckCircle2 },
    live: { color: C.em, label: "Live", Icon: Play },
    paused: { color: C.warn, label: "Paused", Icon: Pause },
  }[project.status];

  return (
    <Card
      className="p-5 cursor-pointer transition-all hover:scale-[1.02] group"
      style={{ border: `1px solid ${C.border}` }}
    >
      <div className="flex items-start justify-between mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${statusCfg.color}18`, border: `1px solid ${statusCfg.color}35` }}>
          <FileCode2 className="w-5 h-5" style={{ color: statusCfg.color }} />
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: `${statusCfg.color}12`, border: `1px solid ${statusCfg.color}30` }}>
          {project.status === "live" && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: statusCfg.color }} />}
          <span className="font-mono uppercase" style={{ color: statusCfg.color, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em" }}>{statusCfg.label}</span>
        </div>
      </div>

      <div style={{ color: C.text, fontSize: "1rem", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 6 }}>{project.name}</div>
      <div className="space-y-2 mb-5">
        <div className="flex items-center gap-2">
          <EmBadge label={project.ediType} size="xs" />
          <span style={{ color: C.sub, fontSize: "0.78rem" }}>{project.partnerName}</span>
        </div>
        <div style={{ color: C.muted, fontSize: "0.72rem" }} className="font-mono">{project.specName}</div>
        <div style={{ color: C.muted, fontSize: "0.68rem" }} className="font-mono">Updated {project.lastUpdated}</div>
      </div>

      <div className="pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
        <button
          onClick={onSelect}
          className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:gap-3"
          style={{ background: C.emDim, border: `1px solid ${C.em}35`, color: C.em, fontWeight: 700, fontSize: "0.82rem" }}
        >
          Open Project
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </Card>
  );
}

// ─── Create Project Modal ─────────────────────────────────────────────────────
function CreateProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Project) => void }) {
  const [step, setStep] = useState(1);
  const [selectedSpec, setSelectedSpec] = useState<BASpec | null>(null);
  const [data, setData] = useState({ name: "", partnerName: "", ediType: "" });

  const specs: BASpec[] = [
    { id: "1", name: "837P Professional Claims", version: "v2.1", createdDate: "2026-03-10", ediType: "837" },
    { id: "2", name: "835 Payment Advice", version: "v1.5", createdDate: "2026-03-08", ediType: "835" },
    { id: "3", name: "270/271 Eligibility", version: "v1.0", createdDate: "2026-03-05", ediType: "270" },
  ];

  const handleCreate = () => {
    onCreate({ id: Date.now().toString(), name: data.name, ediType: data.ediType, partnerName: data.partnerName, status: "draft", lastUpdated: new Date().toISOString().split("T")[0], specName: selectedSpec?.name || "" });
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-8 z-50" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <Card className="max-w-2xl w-full" style={{ border: `1px solid ${C.em}30` }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div>
            <div style={{ color: C.text, fontSize: "1.125rem", fontWeight: 700 }}>Create New Project</div>
            <div className="font-mono mt-0.5" style={{ color: C.muted, fontSize: "0.72rem" }}>Step {step} of 2</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10">
            <X className="w-4 h-4" style={{ color: C.muted }} />
          </button>
        </div>
        <div className="p-6">
          {/* Step indicators */}
          <div className="flex gap-2 mb-6">
            {[1, 2].map(s => (
              <div key={s} className="flex-1 h-1 rounded-full transition-all" style={{ background: s <= step ? C.em : "rgba(255,255,255,0.1)" }} />
            ))}
          </div>

          {step === 1 && (
            <>
              <div className="mb-5" style={{ color: C.text, fontSize: "0.95rem", fontWeight: 700 }}>Select BA Specification</div>
              <div className="space-y-2.5 mb-6">
                {specs.map(spec => (
                  <button
                    key={spec.id}
                    onClick={() => setSelectedSpec(spec)}
                    className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
                    style={{
                      background: selectedSpec?.id === spec.id ? C.emDim : C.cardSubtle,
                      border: `1px solid ${selectedSpec?.id === spec.id ? C.em : C.border}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div style={{ color: C.text, fontSize: "0.875rem", fontWeight: 600 }}>{spec.name}</div>
                        <div className="font-mono mt-1" style={{ color: C.muted, fontSize: "0.72rem" }}>{spec.version} · {spec.createdDate}</div>
                      </div>
                      <EmBadge label={spec.ediType} size="xs" />
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(2)} disabled={!selectedSpec}
                className="w-full py-3 rounded-xl transition-all hover:scale-[1.02]"
                style={{ background: selectedSpec ? C.em : C.subtle, color: selectedSpec ? "#fff" : C.muted, fontWeight: 700 }}
              >
                Continue
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-5" style={{ color: C.text, fontSize: "0.95rem", fontWeight: 700 }}>Project Details</div>
              <div className="space-y-4 mb-6">
                {[
                  { label: "Project Name", key: "name", placeholder: "e.g., Healthcare Claims Processing" },
                  { label: "Partner Name", key: "partnerName", placeholder: "e.g., HealthCare Partners Inc." },
                  { label: "EDI Type", key: "ediType", placeholder: "e.g., 837" },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block font-mono mb-1.5" style={{ color: C.muted, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em" }}>
                      {field.label.toUpperCase()}
                    </label>
                    <input
                      type="text"
                      value={data[field.key as keyof typeof data]}
                      onChange={e => setData({ ...data, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-2.5 rounded-xl outline-none font-mono"
                      style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${C.borderMed}`, color: C.text, fontSize: "0.875rem" }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl transition-all" style={{ background: C.subtle, color: C.sub, fontWeight: 600, border: `1px solid ${C.border}` }}>
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!data.name || !data.partnerName || !data.ediType}
                  className="flex-1 py-3 rounded-xl transition-all hover:scale-[1.02]"
                  style={{
                    background: (data.name && data.partnerName && data.ediType) ? C.em : C.subtle,
                    color: (data.name && data.partnerName && data.ediType) ? "#fff" : C.muted,
                    fontWeight: 700,
                  }}
                >
                  Create Project
                </button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

// ─── Project Workspace ────────────────────────────────────────────────────────
function ProjectWorkspace({ project, activeTab, onTabChange, onBack }: {
  project: Project; activeTab: string; onTabChange: (t: string) => void; onBack: () => void;
}) {
  const tabs = [
    { id: "mapping", label: "Mapping Logic", icon: GitBranch },
    { id: "validation", label: "Validation Rules", icon: ShieldCheck },
    { id: "processing", label: "Processing Logic", icon: Cog },
    { id: "deployment", label: "Deployment", icon: Rocket },
    { id: "monitoring", label: "Live Monitor", icon: Activity },
    { id: "reports", label: "Reports", icon: BarChart3 },
  ];

  const statusCfg = { draft: C.muted, ready: C.info, live: C.em, paused: C.warn }[project.status];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-8 py-5" style={{ borderBottom: `1px solid ${C.border}`, background: C.sidebar, backdropFilter: "blur(20px)" }}>
        <button
          onClick={onBack}
          className="flex items-center gap-2 mb-4 transition-all hover:gap-3"
          style={{ color: C.muted, fontSize: "0.78rem" }}
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          <span className="font-mono">Back to Projects</span>
        </button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 style={{ color: C.text, fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em" }}>{project.name}</h1>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: `${statusCfg}15`, border: `1px solid ${statusCfg}35` }}>
                {project.status === "live" && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: statusCfg }} />}
                <span className="font-mono uppercase" style={{ color: statusCfg, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em" }}>{project.status}</span>
              </div>
            </div>
            <div className="font-mono" style={{ color: C.muted, fontSize: "0.75rem" }}>
              {project.specName} <span style={{ color: C.border }}>·</span> {project.partnerName}
            </div>
          </div>
          <EmBadge label={`EDI ${project.ediType}`} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div className="px-8 flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex items-center gap-2 px-4 py-4 relative transition-all whitespace-nowrap flex-shrink-0"
              style={{ color: activeTab === tab.id ? C.em : C.muted }}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="font-mono" style={{ fontSize: "0.78rem", fontWeight: activeTab === tab.id ? 700 : 500 }}>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: C.em }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === "mapping" && <MappingLogicTab />}
        {activeTab === "validation" && <ValidationRulesTab />}
        {activeTab === "processing" && <ProcessingLogicTab />}
        {activeTab === "deployment" && <DeploymentTab />}
        {activeTab === "monitoring" && <LiveMonitoringTab />}
        {activeTab === "reports" && <ProjectReportsTab projectName={project.name} />}
      </div>
    </div>
  );
}

// ─── Mapping Logic Tab ────────────────────────────────────────────────────────
function MappingLogicTab() {
  const [ediTree, setEdiTree] = useState<EDINode[]>([
    { id: "isa", name: "ISA — Interchange Control Header", expanded: true, children: [{ id: "isa06", name: "ISA06 · Sender ID" }, { id: "isa08", name: "ISA08 · Receiver ID" }] },
    { id: "gs", name: "GS — Functional Group Header", expanded: false, children: [{ id: "gs01", name: "GS01 · Functional ID" }] },
    { id: "st", name: "ST — Transaction Set Header", expanded: true, children: [{ id: "st01", name: "ST01 · Transaction Set ID" }, { id: "st02", name: "ST02 · Control Number" }] },
  ]);
  const [mappings, setMappings] = useState<MappingRule[]>([
    { id: "1", source: "ISA06", target: "sender_id", transformation: "trim()" },
    { id: "2", source: "ISA08", target: "receiver_id", transformation: "trim()" },
    { id: "3", source: "ST01", target: "transaction_type", transformation: "mapTransactionCode()" },
  ]);
  const [aiSuggestions] = useState<MappingRule[]>([
    { id: "ai1", source: "ST02", target: "control_number", transformation: "toString()" },
    { id: "ai2", source: "GS01", target: "functional_group_id" },
  ]);
  const [drafts] = useState([
    { id: "1", name: "Draft — 2026-03-16 14:30", ts: "2026-03-16 14:30:00" },
    { id: "2", name: "Draft — 2026-03-15 10:15", ts: "2026-03-15 10:15:00" },
  ]);
  const [saved, setSaved] = useState(false);

  const toggle = (id: string) => setEdiTree(prev => prev.map(n => n.id === id ? { ...n, expanded: !n.expanded } : n));
  const accept = (s: MappingRule) => setMappings(prev => [...prev, { ...s, id: Date.now().toString() }]);
  const remove = (id: string) => setMappings(prev => prev.filter(m => m.id !== id));

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Action bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 style={{ color: C.text, fontSize: "1.25rem", fontWeight: 700 }}>Mapping Logic Designer</h2>
            <p className="font-mono mt-0.5" style={{ color: C.muted, fontSize: "0.72rem" }}>{mappings.length} active mappings</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:scale-105" style={{ background: C.subtle, border: `1px solid ${C.border}`, color: C.sub, fontSize: "0.8rem", fontWeight: 600 }}>
              <FolderOpen className="w-4 h-4" /> Open Draft
            </button>
            <button
              onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:scale-105"
              style={{ background: saved ? "rgba(16,185,129,0.2)" : C.em, color: "#fff", fontSize: "0.8rem", fontWeight: 700, boxShadow: saved ? "none" : `0 0 20px ${C.emGlow}` }}
            >
              {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Saved!" : "Save Draft"}
            </button>
          </div>
        </div>

        {/* AI panel */}
        <Card className="p-5 mb-6" style={{ background: "rgba(16,185,129,0.04)", border: `1px solid ${C.em}30` }}>
          <div className="flex items-center gap-2.5 mb-4">
            <Sparkles className="w-4.5 h-4.5" style={{ color: C.em, width: 18, height: 18 }} />
            <span style={{ color: C.em, fontSize: "0.875rem", fontWeight: 700 }}>AI Suggested Mappings</span>
            <EmBadge label="2 new" size="xs" />
          </div>
          <div className="space-y-2">
            {aiSuggestions.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: C.iconInactive, border: `1px solid ${C.border}` }}>
                <div className="flex items-center gap-3">
                  <span className="font-mono" style={{ color: C.text, fontSize: "0.82rem" }}>{s.source}</span>
                  <ArrowRight className="w-3.5 h-3.5" style={{ color: C.muted }} />
                  <span className="font-mono" style={{ color: C.em, fontSize: "0.82rem" }}>{s.target}</span>
                  {s.transformation && <span className="font-mono px-2 py-0.5 rounded" style={{ background: `${C.em}15`, color: "#34D399", fontSize: "0.72rem" }}>{s.transformation}</span>}
                </div>
                <button onClick={() => accept(s)} className="px-3 py-1.5 rounded-lg transition-all hover:scale-105" style={{ background: C.em, color: "#fff", fontSize: "0.75rem", fontWeight: 700 }}>
                  Accept
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Main canvas */}
        <div className="grid grid-cols-2 gap-5">
          {/* Source tree */}
          <Card className="p-5">
            <h3 className="mb-4" style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>Source EDI Structure</h3>
            <div className="space-y-1.5">
              {ediTree.map(node => (
                <div key={node.id}>
                  <button onClick={() => toggle(node.id)} className="w-full flex items-center gap-2 p-2.5 rounded-lg transition-all hover:bg-white/[0.04] text-left">
                    {node.expanded ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.muted }} /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.muted }} />}
                    <span className="font-mono" style={{ color: C.em, fontSize: "0.8rem", fontWeight: 600 }}>{node.name}</span>
                  </button>
                  {node.expanded && node.children && (
                    <div className="ml-5 space-y-0.5 mt-0.5">
                      {node.children.map(c => (
                        <div key={c.id} className="p-2.5 rounded-lg cursor-pointer transition-all hover:bg-white/[0.04]">
                          <span className="font-mono" style={{ color: C.sub, fontSize: "0.78rem" }}>{c.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Mapping canvas */}
          <Card className="p-5">
            <h3 className="mb-4" style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>Active Mappings ({mappings.length})</h3>
            <div className="space-y-2.5">
              {mappings.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: `${C.em}06`, border: `1px solid ${C.em}25` }}>
                  <div className="flex items-center gap-3 flex-1">
                    <span className="font-mono" style={{ color: C.text, fontSize: "0.8rem" }}>{m.source}</span>
                    <Link2 className="w-3.5 h-3.5" style={{ color: C.em }} />
                    <span className="font-mono" style={{ color: C.em, fontSize: "0.8rem" }}>{m.target}</span>
                    {m.transformation && <span className="font-mono px-2 py-0.5 rounded" style={{ background: "rgba(52,211,153,0.15)", color: "#34D399", fontSize: "0.7rem" }}>{m.transformation}</span>}
                  </div>
                  <button onClick={() => remove(m.id)} className="p-1.5 rounded-lg transition-all hover:bg-white/10">
                    <Trash2 className="w-3.5 h-3.5" style={{ color: C.muted }} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Draft history */}
        <Card className="mt-5 p-5">
          <h3 className="mb-4" style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>Draft History</h3>
          <div className="grid grid-cols-4 gap-3">
            {drafts.map(d => (
              <button key={d.id} className="p-4 rounded-xl text-left transition-all hover:scale-[1.02]" style={{ background: C.iconInactive, border: `1px solid ${C.border}` }}>
                <FolderOpen className="w-4 h-4 mb-2" style={{ color: C.muted }} />
                <div style={{ color: C.text, fontSize: "0.78rem", fontWeight: 600 }}>{d.name}</div>
                <div className="font-mono mt-1" style={{ color: C.muted, fontSize: "0.68rem" }}>{d.ts}</div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Validation Rules Tab ─────────────────────────────────────────────────────
function ValidationRulesTab() {
  const [snips, setSnips] = useState({ snip1: true, snip2: true, snip3: false, snip4: true, snip5: false, snip6: false, snip7: true });
  const [rules, setRules] = useState(`CLM01 != NULL\nST02.length == 4\nISA06.trim().length > 0`);

  const snipDesc: Record<string, string> = {
    snip1: "Transaction Set Header/Trailer integrity",
    snip2: "Situational segment requirements",
    snip3: "Segment count balancing rules",
    snip4: "Situational segment-level requirements",
    snip5: "External code value validation",
    snip6: "Secondary balancing checks",
    snip7: "Product-specific constraint enforcement",
  };

  const preview = `{
  "validationRules": {
    "CLM01": { "type": "notNull", "errorMessage": "CLM01 cannot be null" },
    "ST02":  { "type": "exactLength", "value": 4 },
    "ISA06": { "type": "minLength", "value": 1, "transform": "trim" }
  }
}`;

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 style={{ color: C.text, fontSize: "1.25rem", fontWeight: 700 }}>Validation Rules Configuration</h2>
            <p className="font-mono mt-0.5" style={{ color: C.muted, fontSize: "0.72rem" }}>SNIP 1–7 compliance + custom rule builder</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `${C.em}12`, border: `1px solid ${C.em}30` }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: C.em }} />
            <span className="font-mono" style={{ color: C.em, fontSize: "0.7rem", fontWeight: 700 }}>{Object.values(snips).filter(Boolean).length} rules active</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* SNIP toggles */}
          <Card className="p-5">
            <h3 className="mb-1" style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>SNIP Validation Levels</h3>
            <p className="mb-5 font-mono" style={{ color: C.muted, fontSize: "0.7rem" }}>X12 Implementation Acknowledgement Rules</p>
            <div className="space-y-3">
              {Object.entries(snips).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between p-3.5 rounded-xl transition-all" style={{ background: val ? `${C.em}06` : "rgba(255,255,255,0.02)", border: `1px solid ${val ? `${C.em}30` : C.border}` }}>
                  <div className="flex-1 min-w-0 mr-4">
                    <span className="font-mono uppercase" style={{ color: val ? C.text : C.muted, fontSize: "0.8rem", fontWeight: 700 }}>{key.toUpperCase()}</span>
                    <p style={{ color: C.muted, fontSize: "0.7rem", marginTop: 2 }}>{snipDesc[key]}</p>
                  </div>
                  <button
                    onClick={() => setSnips(p => ({ ...p, [key]: !val }))}
                    className="relative w-11 h-6 rounded-full flex-shrink-0 transition-all"
                    style={{ background: val ? C.em : "rgba(255,255,255,0.1)" }}
                  >
                    <div className="absolute w-4.5 h-4.5 bg-white rounded-full top-0.5 transition-all shadow-sm" style={{ width: 18, height: 18, left: val ? 22 : 3 }} />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Custom builder */}
          <div className="space-y-5">
            <Card className="p-5">
              <h3 className="mb-1" style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>Custom Rule Builder</h3>
              <p className="mb-4 font-mono" style={{ color: C.muted, fontSize: "0.7rem" }}>Write validation expressions in DSL</p>
              <textarea
                value={rules}
                onChange={e => setRules(e.target.value)}
                className="w-full p-4 rounded-xl font-mono outline-none resize-none mb-4"
                style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${C.em}20`, color: C.em, fontSize: "0.8rem", minHeight: 140, lineHeight: 1.7 }}
              />
              <button className="w-full py-2.5 rounded-xl transition-all hover:scale-[1.01]" style={{ background: C.em, color: "#fff", fontWeight: 700, fontSize: "0.8rem" }}>
                Convert to Backend Pattern
              </button>
            </Card>

            <Card className="p-5" style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${C.em}20` }}>
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="w-4 h-4" style={{ color: C.em }} />
                <span className="font-mono" style={{ color: C.em, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em" }}>GENERATED PATTERN PREVIEW</span>
              </div>
              <pre className="font-mono overflow-auto" style={{ color: "#34D399", fontSize: "0.75rem", lineHeight: 1.7 }}>{preview}</pre>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Processing Logic Tab ──────────────────────────────────────────────────────
function ProcessingLogicTab() {
  const [fileSplit, setFileSplit] = useState("isa");
  const [recSplit, setRecSplit] = useState("transaction");

  const fileSplits = [
    { id: "isa", label: "ISA Split", desc: "Split at Interchange Control Header level" },
    { id: "gs", label: "GS Split", desc: "Split at Functional Group level" },
    { id: "st", label: "ST Split", desc: "Split at Transaction Set level" },
  ];
  const recSplits = [
    { id: "transaction", label: "Transaction Grouping", desc: "Group by transaction set boundaries" },
    { id: "claim", label: "Claim Grouping", desc: "Group by individual claim records" },
    { id: "batch", label: "Batch Grouping", desc: "Group by full batch processing unit" },
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 style={{ color: C.text, fontSize: "1.25rem", fontWeight: 700 }}>Processing Logic Configuration</h2>
          <p className="font-mono mt-0.5" style={{ color: C.muted, fontSize: "0.72rem" }}>Define file-level and record-level processing strategy</p>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {[
            { title: "File Level Processing", desc: "How to split incoming EDI files", opts: fileSplits, current: fileSplit, set: setFileSplit },
            { title: "Record Level Processing", desc: "How to group transaction records", opts: recSplits, current: recSplit, set: setRecSplit },
          ].map(panel => (
            <Card key={panel.title} className="p-5">
              <h3 className="mb-1" style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>{panel.title}</h3>
              <p className="mb-4 font-mono" style={{ color: C.muted, fontSize: "0.7rem" }}>{panel.desc}</p>
              <div className="space-y-2.5">
                {panel.opts.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => panel.set(opt.id)}
                    className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
                    style={{ background: panel.current === opt.id ? C.emDim : "rgba(255,255,255,0.02)", border: `1px solid ${panel.current === opt.id ? C.em : C.border}` }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-mono" style={{ color: panel.current === opt.id ? C.em : C.text, fontSize: "0.82rem", fontWeight: 700 }}>{opt.label}</div>
                        <div style={{ color: C.muted, fontSize: "0.72rem", marginTop: 3 }}>{opt.desc}</div>
                      </div>
                      {panel.current === opt.id && <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: C.em }} />}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-5 p-5" style={{ background: "rgba(0,0,0,0.35)", border: `1px solid ${C.em}20` }}>
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4" style={{ color: C.em }} />
            <span className="font-mono" style={{ color: C.em, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em" }}>GENERATED TARGET SCHEMA</span>
          </div>
          <pre className="font-mono overflow-auto" style={{ color: "#34D399", fontSize: "0.78rem", lineHeight: 1.7 }}>
{`{
  "schemaVersion": "1.0",
  "fileLevelSplit": "${fileSplit}",
  "recordLevelSplit": "${recSplit}",
  "outputStructure": {
    "format": "JSON",
    "envelope": {
      "metadata": { "processingTimestamp": "ISO8601", "batchId": "string", "sourceFile": "string" },
      "payload": { "transactions": [] }
    }
  }
}`}
          </pre>
        </Card>
      </div>
    </div>
  );
}

// ─── Deployment Tab ────────────────────────────────────────────────────────────
function DeploymentTab() {
  const [stage, setStage] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);

  const handleDeploy = () => {
    const stages = ["preparing", "building", "deploying", "live"];
    let i = 0;
    const iv = setInterval(() => {
      if (i < stages.length) { setStage(stages[i]); i++; }
      else clearInterval(iv);
    }, 2000);
  };

  const stageLabels: Record<string, string> = { preparing: "Preparing Service Container", building: "Building Mapping Engine", deploying: "Deploying to Production", live: "Service Live & Routing" };

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 style={{ color: C.text, fontSize: "1.25rem", fontWeight: 700 }}>Deployment Center</h2>
          <p className="font-mono mt-1" style={{ color: C.muted, fontSize: "0.72rem" }}>Push your pipeline configuration to the production runtime</p>
        </div>

        {!stage && (
          <div className="space-y-5">
            <Card className="p-8 text-center" style={{ background: validated ? `${C.em}06` : C.surface, border: `1px solid ${validated ? `${C.em}35` : C.border}` }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: validated ? `${C.em}20` : C.subtle, border: `1px solid ${validated ? C.em : C.border}` }}>
                {validated ? <CheckCircle2 className="w-8 h-8" style={{ color: C.em }} /> : <ShieldCheck className="w-8 h-8" style={{ color: C.muted }} />}
              </div>
              <div style={{ color: C.text, fontSize: "1rem", fontWeight: 700, marginBottom: 8 }}>{validated ? "Validation Passed" : "Pre-Deployment Validation"}</div>
              <p style={{ color: C.muted, fontSize: "0.82rem", marginBottom: validated ? 0 : 24 }}>{validated ? "All configurations are valid and ready for deployment." : "Validate mapping logic, SNIP rules, and schema configuration before deploying."}</p>
              {!validated && (
                <button onClick={() => setValidated(true)} className="px-8 py-3 rounded-xl transition-all hover:scale-105" style={{ background: C.em, color: "#fff", fontWeight: 700, boxShadow: `0 0 25px ${C.emGlow}` }}>
                  Run Validation Suite
                </button>
              )}
            </Card>

            {validated && (
              <Card className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: `${C.em}15`, border: `1px solid ${C.em}35` }}>
                  <Rocket className="w-8 h-8" style={{ color: C.em }} />
                </div>
                <div style={{ color: C.text, fontSize: "1rem", fontWeight: 700, marginBottom: 8 }}>Push to Production</div>
                <p style={{ color: C.muted, fontSize: "0.82rem", marginBottom: 24 }}>Deploy the pipeline to the live processing environment.</p>
                <button onClick={handleDeploy} className="px-8 py-3 rounded-xl transition-all hover:scale-105" style={{ background: C.em, color: "#fff", fontWeight: 700, boxShadow: `0 0 30px ${C.emGlow}` }}>
                  Deploy Now
                </button>
              </Card>
            )}
          </div>
        )}

        {stage && (
          <div className="space-y-3">
            {["preparing", "building", "deploying", "live"].map((s, i) => {
              const idx = ["preparing", "building", "deploying", "live"].indexOf(stage);
              const done = i < idx;
              const active = i === idx;
              return (
                <Card key={s} className="p-5" style={{ background: done ? `${C.em}08` : active ? `${C.em}04` : C.surface, border: `1px solid ${done || active ? `${C.em}35` : C.border}`, boxShadow: active ? `0 0 25px ${C.em}18` : "none" }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: (done || active) ? `${C.em}20` : C.iconInactive, border: `1px solid ${(done || active) ? C.em : C.border}` }}>
                      {done ? <CheckCircle2 className="w-5 h-5" style={{ color: C.em }} /> : active ? <div className="w-4 h-4 rounded-full animate-pulse" style={{ background: C.em }} /> : <Clock className="w-5 h-5" style={{ color: C.muted }} />}
                    </div>
                    <div>
                      <div className="font-mono uppercase" style={{ color: (done || active) ? C.em : C.muted, fontSize: "0.82rem", fontWeight: 700 }}>{stageLabels[s]}</div>
                      {active && <div className="font-mono mt-0.5" style={{ color: C.muted, fontSize: "0.7rem" }}>In progress...</div>}
                      {done && <div className="font-mono mt-0.5" style={{ color: `${C.em}80`, fontSize: "0.7rem" }}>Completed</div>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Live Monitoring Tab ───────────────────────────────────────────────────────
function LiveMonitoringTab() {
  const metrics: ProcessingMetrics = { filesReceived: 1284, filesProcessed: 1245, filesFailed: 32, errorsDetected: 7 };
  const logs: ErrorLog[] = [
    { id: "1", batchId: "B-1056", fileName: "EDI_837_20260316_098.x12", errorType: "Validation Error", errorDescription: "CLM01 field is null", timestamp: "2026-03-16 15:32:18" },
    { id: "2", batchId: "B-1057", fileName: "EDI_837_20260316_099.x12", errorType: "Parse Error", errorDescription: "Invalid ST segment structure", timestamp: "2026-03-16 15:33:45" },
  ];

  const mCfg = [
    { label: "Files Received", value: metrics.filesReceived, color: C.em },
    { label: "Files Processed", value: metrics.filesProcessed, color: C.info },
    { label: "Files Failed", value: metrics.filesFailed, color: C.err },
    { label: "Errors Detected", value: metrics.errorsDetected, color: C.warn },
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="mb-6" style={{ color: C.text, fontSize: "1.25rem", fontWeight: 700 }}>Live Processing Monitor</h2>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {mCfg.map((m, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p style={{ color: C.sub, fontSize: "0.78rem" }}>{m.label}</p>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: m.color }} />
              </div>
              <p className="font-mono" style={{ color: m.color, fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.02em" }}>{m.value.toLocaleString()}</p>
            </Card>
          ))}
        </div>

        {/* Pipeline stages */}
        <Card className="p-6 mb-5">
          <h3 className="mb-5" style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>Pipeline Stages</h3>
          <div className="flex items-center justify-between gap-4">
            {[
              { label: "Validation", files: 1245, color: C.em },
              { label: "Translation", files: 1240, color: C.info },
              { label: "Delivery", files: 1238, color: C.purple },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-4 flex-1">
                <div className="flex-1 p-5 rounded-xl" style={{ background: `${s.color}10`, border: `1px solid ${s.color}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: s.color }} />
                    <span className="font-mono" style={{ color: C.text, fontSize: "0.82rem", fontWeight: 700 }}>{s.label}</span>
                  </div>
                  <p className="font-mono" style={{ color: s.color, fontSize: "1.5rem", fontWeight: 800 }}>{s.files.toLocaleString()}</p>
                </div>
                {i < 2 && <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: C.em }} />}
              </div>
            ))}
          </div>
        </Card>

        {/* Error logs */}
        <Card className="overflow-hidden">
          <div className="p-5" style={{ borderBottom: `1px solid ${C.border}` }}>
            <h3 style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>Error Inspection Panel</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${C.border}` }}>
                {["BATCH ID", "FILE NAME", "ERROR TYPE", "DESCRIPTION", "TIMESTAMP"].map(h => (
                  <th key={h} className="text-left py-3 px-5 font-mono" style={{ color: C.muted, fontSize: "0.67rem", fontWeight: 700, letterSpacing: "0.08em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(e => (
                <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td className="py-4 px-5"><span className="font-mono" style={{ color: C.em, fontSize: "0.82rem" }}>{e.batchId}</span></td>
                  <td className="py-4 px-5"><span className="font-mono" style={{ color: C.text, fontSize: "0.82rem" }}>{e.fileName}</span></td>
                  <td className="py-4 px-5"><span className="px-2.5 py-1 rounded-lg font-mono" style={{ background: `${C.err}12`, color: C.err, fontSize: "0.7rem", fontWeight: 700 }}>{e.errorType}</span></td>
                  <td className="py-4 px-5"><span style={{ color: C.sub, fontSize: "0.82rem" }}>{e.errorDescription}</span></td>
                  <td className="py-4 px-5"><span className="font-mono" style={{ color: C.muted, fontSize: "0.72rem" }}>{e.timestamp}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

// ─── Project Reports Tab ───────────────────────────────────────────────────────
function ProjectReportsTab({ projectName }: { projectName: string }) {
  const [showReport, setShowReport] = useState(false);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 style={{ color: C.text, fontSize: "1.25rem", fontWeight: 700 }}>Project Reports</h2>
            <p className="font-mono mt-0.5" style={{ color: C.muted, fontSize: "0.72rem" }}>{projectName}</p>
          </div>
          {showReport && (
            <button onClick={() => setShowReport(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:scale-105" style={{ background: C.subtle, border: `1px solid ${C.border}`, color: C.sub, fontSize: "0.8rem", fontWeight: 600 }}>
              <ArrowRight className="w-4 h-4 rotate-180" /> Back to Reports
            </button>
          )}
        </div>

        {!showReport ? (
          <>
            <div className="grid grid-cols-2 gap-5 mb-5">
              <button
                onClick={() => setShowReport(true)}
                className="p-7 rounded-2xl text-left transition-all hover:scale-[1.02] group"
                style={{ background: C.surface, border: `1px solid ${C.em}30` }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform" style={{ background: `${C.em}18`, border: `1px solid ${C.em}35` }}>
                  <ShieldCheck className="w-6 h-6" style={{ color: C.em }} />
                </div>
                <div style={{ color: C.text, fontSize: "1rem", fontWeight: 700, marginBottom: 6 }}>Data Validation Report</div>
                <p style={{ color: C.muted, fontSize: "0.82rem", lineHeight: 1.6 }}>
                  File-level validation results, error explorer with EDI hierarchy, SNIP violations, heatmaps, BA-friendly summaries, and custom export builder.
                </p>
                <div className="mt-4 flex items-center gap-2" style={{ color: C.em, fontSize: "0.78rem", fontWeight: 600 }}>
                  <span>Open Report</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </button>

              <button
                className="p-7 rounded-2xl text-left transition-all hover:scale-[1.02] group"
                style={{ background: C.surface, border: `1px solid ${C.info}30` }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform" style={{ background: `${C.info}18`, border: `1px solid ${C.info}35` }}>
                  <BarChart3 className="w-6 h-6" style={{ color: C.info }} />
                </div>
                <div style={{ color: C.text, fontSize: "1rem", fontWeight: 700, marginBottom: 6 }}>Processing Analytics</div>
                <p style={{ color: C.muted, fontSize: "0.82rem", lineHeight: 1.6 }}>
                  Throughput charts, processing time distributions, success/failure trends, and file volume analytics for this project.
                </p>
                <div className="mt-4 flex items-center gap-2" style={{ color: C.info, fontSize: "0.78rem", fontWeight: 600 }}>
                  <span>View Analytics</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            </div>

            {/* Quick export */}
            <Card className="p-5">
              <h3 className="mb-4" style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>Quick Export</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Download PDF", color: C.err, icon: FileDown },
                  { label: "Download CSV", color: C.em, icon: Download },
                  { label: "Download JSON", color: C.info, icon: Code2 },
                ].map((e, i) => (
                  <button key={i} className="flex items-center gap-3 p-4 rounded-xl transition-all hover:scale-[1.02]" style={{ background: `${e.color}08`, border: `1px solid ${e.color}25` }}>
                    <e.icon className="w-5 h-5" style={{ color: e.color }} />
                    <span style={{ color: C.text, fontSize: "0.82rem", fontWeight: 600 }}>{e.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg" style={{ background: "rgba(0,0,0,0.3)" }}>
                <p className="font-mono" style={{ color: "#34D399", fontSize: "0.72rem" }}>s3://data-processing-engine/reports/healthcare-claims/report_2026-03-16.pdf</p>
              </div>
            </Card>
          </>
        ) : (
          <ValidationReport projectName={projectName} />
        )}
      </div>
    </div>
  );
}

// ─── Global Monitoring Dashboard ───────────────────────────────────────────────
function MonitoringDashboard() {
  const [tab, setTab] = useState<"overview" | "files">("overview");
  const metrics = { activeProjects: 12, filesToday: 14582, failures: 87, avgProcessingTime: "1.2s", activePipelines: 8, validationErrors: 134 };
  const pipelines = [
    { id: "v", label: "Validation", files: 245, speed: "120/min", success: 98.5, status: "healthy" },
    { id: "t", label: "Translation", files: 198, speed: "110/min", success: 99.1, status: "healthy" },
    { id: "d", label: "Delivery", files: 152, speed: "95/min", success: 97.8, status: "warning" },
    { id: "a", label: "Archival", files: 134, speed: "88/min", success: 99.9, status: "healthy" },
  ];
  const projects = [
    { id: "1", name: "HealthClaims_837", ediType: "837", filesPerMin: 120, successRate: 99.8 },
    { id: "2", name: "Payment_835", ediType: "835", filesPerMin: 95, successRate: 98.5 },
    { id: "3", name: "Eligibility_270", ediType: "270", filesPerMin: 78, successRate: 99.2 },
  ];
  const errors = [
    { error: "CLM01 Missing", count: 134 },
    { error: "ISA08 Invalid Format", count: 78 },
    { error: "ST Segment Parse Error", count: 32 },
  ];
  const activity = [
    { time: "10:08 AM", event: "Files archived to S3", type: "archive" },
    { time: "10:06 AM", event: "Validation failed for 3 files", type: "error" },
    { time: "10:05 AM", event: "Batch #348 received — 89 files", type: "info" },
    { time: "10:02 AM", event: "Project Claims_837 deployed", type: "deploy" },
  ];
  const storage = [
    { type: "S3", filesArchived: 12348, storageUsed: "1.2 TB" },
    { type: "FSx", filesArchived: 8412, storageUsed: "0.8 TB" },
  ];
  const trends = [
    { hour: "08:00", files: 850 }, { hour: "09:00", files: 1200 },
    { hour: "10:00", files: 980 }, { hour: "11:00", files: 1450 },
    { hour: "12:00", files: 720 }, { hour: "13:00", files: 1100 },
  ];

  const statusColor = (s: string) => s === "healthy" ? C.em : s === "warning" ? C.warn : C.err;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5" style={{ color: C.em }} />
              <span className="font-mono" style={{ color: C.muted, fontSize: "0.72rem", letterSpacing: "0.1em" }}>{APP_CONFIG.projectName.toUpperCase()} / MONITORING</span>
            </div>
            <h1 style={{ color: C.text, fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Global Monitoring</h1>
            <p className="mt-1" style={{ color: C.muted, fontSize: "0.875rem" }}>Real-time platform operations dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-3 rounded-xl" style={{ background: `${C.em}10`, border: `1px solid ${C.em}35` }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.em }} />
                <span className="font-mono" style={{ color: C.em, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em" }}>ALL SYSTEMS OPERATIONAL</span>
              </div>
              <div className="flex gap-4">
                <span className="font-mono" style={{ color: C.sub, fontSize: "0.72rem" }}>Latency: <span style={{ color: C.em }}>120ms</span></span>
                <span className="font-mono" style={{ color: C.sub, fontSize: "0.72rem" }}>Queues: <span style={{ color: C.em }}>Normal</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex gap-2 mb-8">
          {[{ id: "overview" as const, label: "Overview" }, { id: "files" as const, label: "File Processing Details" }].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-6 py-3 rounded-xl font-mono transition-all"
              style={{
                background: tab === t.id ? C.emDim : C.iconInactive,
                border: `1px solid ${tab === t.id ? `${C.em}50` : C.border}`,
                color: tab === t.id ? C.em : C.sub,
                fontSize: "0.82rem", fontWeight: 700,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <>
            {/* Top metrics */}
            <div className="grid grid-cols-4 gap-5 mb-6">
              {[
                { label: "Active Projects", value: metrics.activeProjects, Icon: FolderKanban, color: C.em },
                { label: "Files Processed Today", value: metrics.filesToday.toLocaleString(), Icon: FileText, color: C.info },
                { label: "Files Failed", value: metrics.failures, Icon: AlertCircle, color: C.err },
                { label: "Avg Processing Time", value: metrics.avgProcessingTime, Icon: Clock, color: C.purple },
              ].map((m, i) => (
                <Card key={i} className="p-5 transition-all hover:scale-[1.02]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${m.color}18` }}>
                      <m.Icon className="w-4.5 h-4.5" style={{ color: m.color, width: 18, height: 18 }} />
                    </div>
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: m.color }} />
                  </div>
                  <p style={{ color: C.sub, fontSize: "0.78rem", marginBottom: 4 }}>{m.label}</p>
                  <p className="font-mono" style={{ color: m.color, fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>{m.value}</p>
                </Card>
              ))}
            </div>

            {/* Live pipeline */}
            <Card className="p-6 mb-6">
              <h3 className="mb-6" style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>Live Pipeline Activity</h3>
              <div className="flex items-center justify-between gap-5">
                {pipelines.map((s, i) => {
                  const sc = statusColor(s.status);
                  return (
                    <div key={s.id} className="flex items-center gap-5 flex-1">
                      <div className="flex-1 p-5 rounded-xl" style={{ background: `${sc}08`, border: `2px solid ${sc}`, boxShadow: `0 0 20px ${sc}18` }}>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: sc }} />
                          <span className="font-mono" style={{ color: C.text, fontSize: "0.82rem", fontWeight: 700 }}>{s.label}</span>
                        </div>
                        <div className="space-y-2">
                          {[
                            { label: "Files", value: s.files.toString(), valColor: sc },
                            { label: "Speed", value: s.speed, valColor: C.text },
                            { label: "Success", value: `${s.success}%`, valColor: sc },
                          ].map(row => (
                            <div key={row.label} className="flex items-center justify-between">
                              <span style={{ color: C.muted, fontSize: "0.72rem" }}>{row.label}</span>
                              <span className="font-mono" style={{ color: row.valColor, fontSize: "0.82rem", fontWeight: 700 }}>{row.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {i < pipelines.length - 1 && <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: C.em }} />}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Mid row */}
            <div className="grid grid-cols-2 gap-5 mb-5">
              {/* Active projects */}
              <Card className="p-5">
                <h3 className="mb-4" style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>Active Projects</h3>
                <div className="space-y-3">
                  {projects.map(p => (
                    <div key={p.id} className="p-4 rounded-xl" style={{ background: `${C.em}06`, border: `1px solid ${C.em}25` }}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-mono" style={{ color: C.text, fontSize: "0.82rem", fontWeight: 700 }}>{p.name}</div>
                          <EmBadge label={p.ediType} size="xs" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.em }} />
                          <span className="font-mono" style={{ color: C.em, fontSize: "0.7rem" }}>Processing</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div style={{ color: C.muted, fontSize: "0.68rem" }}>Files/min</div>
                          <div className="font-mono" style={{ color: C.em, fontSize: "1.125rem", fontWeight: 700 }}>{p.filesPerMin}</div>
                        </div>
                        <div>
                          <div style={{ color: C.muted, fontSize: "0.68rem" }}>Success Rate</div>
                          <div className="font-mono" style={{ color: C.em, fontSize: "1.125rem", fontWeight: 700 }}>{p.successRate}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Trends */}
              <Card className="p-5">
                <h3 className="mb-4" style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>Processing Trends</h3>
                <div className="space-y-3">
                  {trends.map((d, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="font-mono w-14 flex-shrink-0" style={{ color: C.muted, fontSize: "0.75rem" }}>{d.hour}</span>
                      <div className="flex-1 h-7 rounded-lg overflow-hidden" style={{ background: C.iconInactive }}>
                        <div className="h-full rounded-lg flex items-center px-3 transition-all" style={{ width: `${(d.files / 1500) * 100}%`, background: `linear-gradient(90deg, ${C.em}40, ${C.em})` }}>
                          <span className="font-mono" style={{ color: "#fff", fontSize: "0.68rem", fontWeight: 700 }}>{d.files}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-3 gap-5 mb-5">
              {/* Errors */}
              <Card className="p-5" style={{ border: `1px solid ${C.err}25` }}>
                <h3 className="mb-4" style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>Top Validation Errors</h3>
                <div className="space-y-3">
                  {errors.map((e, i) => (
                    <div key={i} className="p-3.5 rounded-xl" style={{ background: `${C.err}06`, border: `1px solid ${C.err}20` }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono" style={{ color: C.text, fontSize: "0.8rem" }}>{e.error}</span>
                        <span className="font-mono px-2.5 py-0.5 rounded-lg" style={{ background: `${C.err}15`, color: C.err, fontSize: "0.72rem", fontWeight: 700 }}>{e.count}</span>
                      </div>
                      <button className="text-xs px-3 py-1.5 rounded-lg transition-all" style={{ background: `${C.err}10`, color: C.err, border: `1px solid ${C.err}25`, fontSize: "0.7rem", fontWeight: 600 }}>
                        View Affected Files
                      </button>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Activity */}
              <Card className="p-5">
                <h3 className="mb-4" style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>Recent Activity</h3>
                <div className="space-y-3.5">
                  {activity.map((a, i) => {
                    const cfg = { archive: { color: C.em, Icon: Database }, error: { color: C.err, Icon: AlertCircle }, info: { color: C.info, Icon: FileText }, deploy: { color: C.purple, Icon: Rocket } }[a.type]!;
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}>
                          <cfg.Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                        </div>
                        <div className="flex-1">
                          <div style={{ color: C.text, fontSize: "0.8rem" }}>{a.event}</div>
                          <div className="font-mono mt-0.5" style={{ color: C.muted, fontSize: "0.68rem" }}>{a.time}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Storage */}
              <Card className="p-5">
                <h3 className="mb-4" style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>Storage & Archival</h3>
                <div className="space-y-3">
                  {storage.map((s, i) => (
                    <div key={i} className="p-4 rounded-xl" style={{ background: `${C.em}06`, border: `1px solid ${C.em}25` }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Database className="w-4 h-4" style={{ color: C.em }} />
                        <span className="font-mono" style={{ color: C.em, fontSize: "0.82rem", fontWeight: 700 }}>{s.type} Storage</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div style={{ color: C.muted, fontSize: "0.68rem" }}>Files Archived</div>
                          <div className="font-mono" style={{ color: C.text, fontSize: "1rem", fontWeight: 700 }}>{s.filesArchived.toLocaleString()}</div>
                        </div>
                        <div>
                          <div style={{ color: C.muted, fontSize: "0.68rem" }}>Storage Used</div>
                          <div className="font-mono" style={{ color: C.em, fontSize: "1rem", fontWeight: 700 }}>{s.storageUsed}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Heatmap & Quick actions */}
            <div className="grid grid-cols-2 gap-5">
              <Card className="p-5">
                <h3 className="mb-4" style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>Processing Heatmap (Today)</h3>
                <div className="grid grid-cols-12 gap-1.5">
                  {Array.from({ length: 24 }, (_, i) => {
                    const intens = Math.random();
                    const col = intens > 0.7 ? C.em : intens > 0.4 ? C.info : C.muted;
                    return (
                      <div key={i} className="aspect-square rounded-md cursor-pointer group relative transition-all hover:scale-110" style={{ background: col, opacity: 0.3 + intens * 0.7 }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10" style={{ background: C.bg, border: `1px solid ${C.em}`, fontSize: "0.6rem", color: C.em }}>
                          {i}:00 — {Math.floor(intens * 1000)} files
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span style={{ color: C.muted, fontSize: "0.68rem" }}>Low activity</span>
                  <div className="flex gap-1.5">
                    {[0.3, 0.5, 0.7, 0.9].map((op, i) => <div key={i} className="w-5 h-5 rounded" style={{ background: C.em, opacity: op }} />)}
                  </div>
                  <span style={{ color: C.muted, fontSize: "0.68rem" }}>High activity</span>
                </div>
              </Card>

              <Card className="p-5" style={{ border: `1px solid ${C.em}25` }}>
                <h3 className="mb-4" style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "New Project", icon: Plus, color: C.em },
                    { label: "Upload Test File", icon: Upload, color: C.info },
                    { label: "Open Mapping Editor", icon: GitBranch, color: C.purple },
                    { label: "Generate Report", icon: FileDown, color: C.warn },
                  ].map((a, i) => (
                    <button key={i} className="p-4 rounded-xl transition-all hover:scale-105 group text-left" style={{ background: `${a.color}10`, border: `1px solid ${a.color}30` }}>
                      <a.icon className="w-5 h-5 mb-3 group-hover:scale-110 transition-transform" style={{ color: a.color }} />
                      <span className="block font-mono" style={{ color: a.color, fontSize: "0.75rem", fontWeight: 700 }}>{a.label}</span>
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}

        {tab === "files" && (
          <FileProcessingTable />
        )}
      </div>
    </div>
  );
}

// ─── Reports Viewer ────────────────────────────────────────────────────────────
function ReportsViewer() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "report">("list");

  const projectList = [
    { name: "Healthcare Claims Processing", ediType: "837", lastReport: "2026-03-16", files: 6, failed: 2 },
    { name: "Payment Remittance System", ediType: "835", lastReport: "2026-03-15", files: 4, failed: 0 },
    { name: "Eligibility Verification", ediType: "270", lastReport: "2026-03-14", files: 3, failed: 1 },
  ];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5" style={{ color: C.em }} />
              <span className="font-mono" style={{ color: C.muted, fontSize: "0.72rem", letterSpacing: "0.1em" }}>{APP_CONFIG.projectName.toUpperCase()} / REPORTS</span>
            </div>
            <h1 style={{ color: C.text, fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Reports & Analytics</h1>
            <p className="mt-1" style={{ color: C.muted, fontSize: "0.875rem" }}>Validation reports, error analytics, and custom exports</p>
          </div>
          {view === "report" && (
            <button
              onClick={() => { setView("list"); setSelectedProject(null); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all"
              style={{ background: C.subtle, border: `1px solid ${C.border}`, color: C.sub, fontSize: "0.8rem", fontWeight: 600 }}
            >
              <ArrowRight className="w-4 h-4 rotate-180" /> All Reports
            </button>
          )}
        </div>

        {view === "list" ? (
          <>
            {/* Project report list */}
            <div className="grid grid-cols-3 gap-5 mb-8">
              {projectList.map((p, i) => (
                <Card key={i} className="p-5 cursor-pointer transition-all hover:scale-[1.02] group" style={{ border: `1px solid ${C.border}` }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${C.em}18`, border: `1px solid ${C.em}30` }}>
                      <FileText className="w-5 h-5" style={{ color: C.em }} />
                    </div>
                    <EmBadge label={p.ediType} size="xs" />
                  </div>
                  <div style={{ color: C.text, fontSize: "0.95rem", fontWeight: 700, marginBottom: 6 }}>{p.name}</div>
                  <div className="space-y-1.5 mb-5">
                    <div className="flex justify-between">
                      <span style={{ color: C.muted, fontSize: "0.72rem" }}>Last Report</span>
                      <span className="font-mono" style={{ color: C.sub, fontSize: "0.72rem" }}>{p.lastReport}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: C.muted, fontSize: "0.72rem" }}>Files Processed</span>
                      <span className="font-mono" style={{ color: C.sub, fontSize: "0.72rem" }}>{p.files}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: C.muted, fontSize: "0.72rem" }}>Failed Files</span>
                      <span className="font-mono" style={{ color: p.failed > 0 ? C.err : C.em, fontSize: "0.72rem", fontWeight: 700 }}>{p.failed}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedProject(p.name); setView("report"); }}
                    className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:gap-3"
                    style={{ background: C.emDim, border: `1px solid ${C.em}35`, color: C.em, fontWeight: 700, fontSize: "0.78rem" }}
                  >
                    View Validation Report
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Card>
              ))}
            </div>

            {/* Report types grid */}
            <div className="mb-5">
              <div className="mb-4" style={{ color: C.text, fontSize: "0.875rem", fontWeight: 700 }}>Report Types</div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Data Validation Report", desc: "File-level pass/fail, error explorer, SNIP violations", icon: ShieldCheck, color: C.em },
                  { label: "Processing Analytics", desc: "Throughput, latency, and volume trends", icon: BarChart3, color: C.info },
                  { label: "Error Intelligence", desc: "Top errors, heatmaps, root cause analysis", icon: AlertCircle, color: C.err },
                  { label: "ACK & Compliance", desc: "997/999 acknowledgement history", icon: CheckCircle2, color: C.purple },
                ].map((r, i) => (
                  <Card key={i} className="p-4 transition-all hover:scale-[1.02] cursor-pointer">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${r.color}18` }}>
                      <r.icon className="w-4 h-4" style={{ color: r.color }} />
                    </div>
                    <div style={{ color: C.text, fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>{r.label}</div>
                    <p style={{ color: C.muted, fontSize: "0.72rem", lineHeight: 1.5 }}>{r.desc}</p>
                  </Card>
                ))}
              </div>
            </div>
          </>
        ) : (
          <ValidationReport projectName={selectedProject || ""} />
        )}
      </div>
    </div>
  );
}

// ─── Developer Page ───────────────────────────────────────────────────────────
function DeveloperPage() {
  const [devTab, setDevTab] = useState<"unit-testing" | "schema" | "logs">("unit-testing");

  const DEV_TABS = [
    { id: "unit-testing" as const, label: "Unit Testing · EDI Live Editor", icon: Terminal },
    { id: "schema" as const, label: "Schema Inspector", icon: Code2 },
    { id: "logs" as const, label: "Debug Logs", icon: FileCode2 },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-8 py-5 flex-shrink-0" style={{ borderBottom: `1px solid ${C.border}`, background: C.sidebar }}>
        <div className="flex items-center gap-3 mb-2">
          <Terminal className="w-5 h-5" style={{ color: C.purple }} />
          <span className="font-mono" style={{ color: C.muted, fontSize: "0.72rem", letterSpacing: "0.1em" }}>{APP_CONFIG.projectName.toUpperCase()} / DEVELOPER</span>
          <span className="font-mono px-2 py-0.5 rounded" style={{ background: "rgba(139,92,246,0.15)", color: C.purple, fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.08em", border: "1px solid rgba(139,92,246,0.35)" }}>
            DEV MODE
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ color: C.text, fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Developer Console</h1>
            <p className="mt-1 font-mono" style={{ color: C.muted, fontSize: "0.78rem" }}>
              Advanced tooling — Unit Testing · Schema Inspector · Debug Logs
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.3)" }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.purple }} />
            <span className="font-mono" style={{ color: C.purple, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em" }}>DEV ENV · NOT FOR PRODUCTION</span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex-shrink-0" style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div className="flex gap-1 px-6 overflow-x-auto">
          {DEV_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setDevTab(t.id)}
              className="flex items-center gap-2 px-5 py-3.5 relative transition-all whitespace-nowrap flex-shrink-0"
              style={{ color: devTab === t.id ? C.purple : C.muted }}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span className="font-mono" style={{ fontSize: "0.78rem", fontWeight: devTab === t.id ? 700 : 500 }}>{t.label}</span>
              {devTab === t.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: C.purple }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {devTab === "unit-testing" && <EDILiveEditor />}
        {devTab === "schema" && (
          <div className="p-8">
            <div className="max-w-4xl mx-auto">
              <div className="p-8 rounded-2xl text-center" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}>
                <Code2 className="w-12 h-12 mx-auto mb-4" style={{ color: C.muted }} />
                <div style={{ color: C.text, fontSize: "1rem", fontWeight: 700 }}>Schema Inspector</div>
                <p className="mt-2" style={{ color: C.muted, fontSize: "0.82rem" }}>Browse X12 segment schemas, element definitions, and code sets</p>
                <span className="inline-block mt-4 px-3 py-1.5 rounded-lg font-mono" style={{ background: "rgba(139,92,246,0.1)", color: C.purple, fontSize: "0.72rem", border: "1px solid rgba(139,92,246,0.3)" }}>
                  Coming Soon
                </span>
              </div>
            </div>
          </div>
        )}
        {devTab === "logs" && (
          <div className="p-8">
            <div className="max-w-4xl mx-auto">
              <div className="p-5 rounded-2xl" style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${C.em}15` }}>
                <div className="flex items-center gap-2 mb-4">
                  <Terminal className="w-4 h-4" style={{ color: C.em }} />
                  <span className="font-mono" style={{ color: C.em, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em" }}>DEBUG LOG STREAM</span>
                  <div className="w-2 h-2 rounded-full animate-pulse ml-2" style={{ background: C.em }} />
                </div>
                {[
                  { level: "INFO", msg: "Data Processing Engine v4.0 initialized — EDI Engine ready", ts: "10:15:01.234" },
                  { level: "INFO", msg: "Firebase mock mode active (ENABLE_REAL_FIREBASE=false)", ts: "10:15:01.238" },
                  { level: "INFO", msg: "EDI Live Editor module loaded — Parser v4.0 ready", ts: "10:15:01.245" },
                  { level: "DEBUG", msg: "Validation rule set loaded: ISA, GS, ST, CLM, NM1, DTP, REF, SV1, HL, EQ, DMG, TRN", ts: "10:15:01.251" },
                  { level: "WARN", msg: "No real Firebase project configured — running in offline mock mode", ts: "10:15:01.260" },
                  { level: "INFO", msg: `User session started: developer@mailid.com (demo)`, ts: "10:15:01.901" },
                  { level: "DEBUG", msg: "EDILiveEditor: auto-parse debounce set to 400ms", ts: "10:15:02.100" },
                  { level: "INFO", msg: "Sample file loaded: 837P — With Errors (23 lines, 16 segments)", ts: "10:15:02.105" },
                  { level: "DEBUG", msg: "Parse run #1 — 14 segments, 7 errors, 3 warnings, 1.82ms", ts: "10:15:02.500" },
                ].map((log, i) => (
                  <div key={i} className="flex items-start gap-3 py-1 font-mono" style={{ borderBottom: `1px solid ${C.iconInactive}` }}>
                    <span style={{ color: C.muted, fontSize: "0.65rem", flexShrink: 0, minWidth: 80 }}>{log.ts}</span>
                    <span style={{ color: log.level === "ERROR" ? C.err : log.level === "WARN" ? C.warn : log.level === "DEBUG" ? C.purple : C.em, fontSize: "0.65rem", fontWeight: 700, flexShrink: 0, minWidth: 48 }}>{log.level}</span>
                    <span style={{ color: C.sub, fontSize: "0.65rem" }}>{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────
function SettingsPage() {
  const [firebaseEnabled, setFirebaseEnabled] = useState(ENABLE_REAL_FIREBASE);
  const [notifications, setNotifications] = useState({ errors: true, deployments: true, batches: false, reports: true });
  const [defaultStorage, setDefaultStorage] = useState("s3");
  const [defaultSplit, setDefaultSplit] = useState("isa");
  const [apiKey, setApiKey] = useState("nxp_live_••••••••••••••••••••");

  const Section = ({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) => (
    <div className="mb-8">
      <div className="mb-5">
        <div style={{ color: C.text, fontSize: "1rem", fontWeight: 700 }}>{title}</div>
        {sub && <div className="font-mono mt-0.5" style={{ color: C.muted, fontSize: "0.72rem" }}>{sub}</div>}
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="w-5 h-5" style={{ color: C.em }} />
            <span className="font-mono" style={{ color: C.muted, fontSize: "0.72rem", letterSpacing: "0.1em" }}>{APP_CONFIG.projectName.toUpperCase()} / SETTINGS</span>
          </div>
          <h1 style={{ color: C.text, fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Settings</h1>
          <p className="mt-1" style={{ color: C.muted, fontSize: "0.875rem" }}>Platform configuration and preferences</p>
        </div>

        {/* Platform */}
        <Section title="Platform" sub="Core platform configuration">
          <Card className="overflow-hidden">
            {[
              {
                label: "Firebase Integration",
                sub: "Connect to live Firebase backend (auth + Firestore)",
                control: (
                  <button
                    onClick={() => setFirebaseEnabled(!firebaseEnabled)}
                    className="relative w-12 h-6 rounded-full transition-all"
                    style={{ background: firebaseEnabled ? C.em : "rgba(255,255,255,0.1)" }}
                  >
                    <div className="absolute w-4.5 h-4.5 bg-white rounded-full top-0.5 transition-all shadow" style={{ width: 18, height: 18, left: firebaseEnabled ? 22 : 3 }} />
                  </button>
                ),
              },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ color: C.text, fontSize: "0.875rem", fontWeight: 600 }}>{row.label}</div>
                  <div style={{ color: C.muted, fontSize: "0.78rem", marginTop: 2 }}>{row.sub}</div>
                </div>
                {row.control}
              </div>
            ))}
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div style={{ color: C.text, fontSize: "0.875rem", fontWeight: 600 }}>Environment</div>
                  <div style={{ color: C.muted, fontSize: "0.78rem", marginTop: 2 }}>Current deployment environment</div>
                </div>
                <EmBadge label="SERVERLESS · DEMO" size="xs" />
              </div>
            </div>
          </Card>
        </Section>

        {/* Processing defaults */}
        <Section title="Processing Defaults" sub="Default values applied to new projects">
          <Card className="p-5 space-y-4">
            <div>
              <label className="block font-mono mb-2" style={{ color: C.muted, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em" }}>DEFAULT FILE-LEVEL SPLIT</label>
              <div className="grid grid-cols-3 gap-2">
                {["isa", "gs", "st"].map(v => (
                  <button key={v} onClick={() => setDefaultSplit(v)} className="py-2.5 rounded-xl font-mono transition-all" style={{ background: defaultSplit === v ? C.emDim : C.iconInactive, border: `1px solid ${defaultSplit === v ? C.em : C.border}`, color: defaultSplit === v ? C.em : C.muted, fontSize: "0.78rem", fontWeight: 700 }}>
                    {v.toUpperCase()} Split
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block font-mono mb-2" style={{ color: C.muted, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em" }}>DEFAULT STORAGE DESTINATION</label>
              <div className="grid grid-cols-3 gap-2">
                {["s3", "fsx", "local"].map(v => (
                  <button key={v} onClick={() => setDefaultStorage(v)} className="py-2.5 rounded-xl font-mono transition-all" style={{ background: defaultStorage === v ? C.emDim : C.iconInactive, border: `1px solid ${defaultStorage === v ? C.em : C.border}`, color: defaultStorage === v ? C.em : C.muted, fontSize: "0.78rem", fontWeight: 700 }}>
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" sub="Configure alert preferences">
          <Card className="overflow-hidden">
            {[
              { key: "errors" as const, label: "Processing Errors", desc: "Alert when files fail validation or translation" },
              { key: "deployments" as const, label: "Deployment Events", desc: "Notify on pipeline deployment status changes" },
              { key: "batches" as const, label: "Batch Received", desc: "Notify when new file batches arrive" },
              { key: "reports" as const, label: "Report Ready", desc: "Alert when validation reports are generated" },
            ].map((n, i, arr) => (
              <div key={n.key} className="flex items-center justify-between p-5" style={{ borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div>
                  <div style={{ color: C.text, fontSize: "0.875rem", fontWeight: 600 }}>{n.label}</div>
                  <div style={{ color: C.muted, fontSize: "0.78rem", marginTop: 2 }}>{n.desc}</div>
                </div>
                <button
                  onClick={() => setNotifications(p => ({ ...p, [n.key]: !p[n.key] }))}
                  className="relative w-12 h-6 rounded-full transition-all"
                  style={{ background: notifications[n.key] ? C.em : "rgba(255,255,255,0.1)" }}
                >
                  <div className="absolute bg-white rounded-full top-0.5 transition-all shadow" style={{ width: 18, height: 18, left: notifications[n.key] ? 22 : 3 }} />
                </button>
              </div>
            ))}
          </Card>
        </Section>

        {/* API */}
        <Section title="API Access" sub="Manage API keys for pipeline integration">
          <Card className="p-5">
            <label className="block font-mono mb-2" style={{ color: C.muted, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em" }}>API KEY</label>
            <div className="flex gap-2">
              <input
                type="text" value={apiKey} readOnly
                className="flex-1 px-4 py-2.5 rounded-xl font-mono outline-none"
                style={{ background: "rgba(0,0,0,0.35)", border: `1px solid ${C.border}`, color: C.sub, fontSize: "0.82rem" }}
              />
              <button className="px-4 py-2.5 rounded-xl transition-all hover:scale-105" style={{ background: C.emDim, border: `1px solid ${C.em}35`, color: C.em, fontSize: "0.8rem", fontWeight: 700 }}>
                Reveal
              </button>
              <button className="px-4 py-2.5 rounded-xl transition-all hover:scale-105" style={{ background: C.subtle, border: `1px solid ${C.border}`, color: C.sub, fontSize: "0.8rem", fontWeight: 600 }}>
                Regenerate
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2 p-3 rounded-lg" style={{ background: `${C.warn}08`, border: `1px solid ${C.warn}25` }}>
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.warn }} />
              <span style={{ color: C.warn, fontSize: "0.72rem" }}>Replace <code style={{ fontFamily: "monospace" }}>YOUR_API_KEY_HERE</code> in Firebase config to enable live backend.</span>
            </div>
          </Card>
        </Section>

        {/* About */}
        <Section title="About" sub="Platform version and build information">
          <Card className="p-5">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Version", value: "v4.0.0 — Data Processing Engine" },
                { label: "Build", value: "2026-03-16 · Serverless" },
                { label: "Runtime", value: "React 18 · Tailwind CSS v4" },
                { label: "Auth", value: ENABLE_REAL_FIREBASE ? "Firebase Auth" : "Mock (Demo Mode)" },
              ].map((row, i) => (
                <div key={i}>
                  <div className="font-mono mb-1" style={{ color: C.muted, fontSize: "0.68rem", letterSpacing: "0.08em" }}>{row.label.toUpperCase()}</div>
                  <div className="font-mono" style={{ color: C.em, fontSize: "0.82rem", fontWeight: 700 }}>{row.value}</div>
                </div>
              ))}
            </div>
          </Card>
        </Section>
      </div>
    </div>
  );
}
