import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Zap,
  Target,
  BarChart2,
  Settings as SettingsIcon,
  BrainCircuit,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Check,
  Trash2,
  Hourglass,
  TrendingUp,
  Smile,
  Sparkles,
  CheckCircle2,
  X,
  AlertTriangle,
  Lightbulb,
  Clock,
  Flame,
  Moon,
  Battery,
  BatteryLow,
  BatteryCharging,
  Info
} from "lucide-react";
import { Task, EnergyMode, TaskPriority, TaskEnergy, TaskStatus, DaySummary, UserStats } from "./types";
import BrainDump from "./components/BrainDump";
import CapacityMeter from "./components/CapacityMeter";

// Local storage keys
const STORAGE_TASKS_KEY = "dayflow_tasks_v1";
const STORAGE_STATS_KEY = "dayflow_stats_v1";
const STORAGE_ENERGY_KEY = "dayflow_energy_v1";

// Initial realistic tasks for Nadia's profile
const INITIAL_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Finalize Portfolio Design & Layout",
    duration: 150,
    priority: "urgent",
    energy: "high",
    status: "pending",
    isMission: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "task-2",
    title: "Client Zoom Meeting (Negotiate Freelance Rate)",
    duration: 45,
    priority: "important",
    energy: "normal",
    status: "pending",
    isMission: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "task-3",
    title: "Beli Kopi Susu Sachet & Camilan Lembur",
    duration: 15,
    priority: "optional",
    energy: "low",
    status: "completed",
    isMission: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "task-4",
    title: "Revisi desain Landing Page feedback client",
    duration: 90,
    priority: "urgent",
    energy: "high",
    status: "pending",
    isMission: false,
    createdAt: new Date().toISOString(),
  }
];

export default function App() {
  // Page routing state
  const [activeTab, setActiveTab] = useState<"today" | "plan" | "focus" | "review">("today");

  // App core state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [energyMode, setEnergyMode] = useState<EnergyMode>("normal");
  const [userStats, setUserStats] = useState<UserStats>({
    winCounter: 7,
    lastWinDate: null,
    streak: 3
  });

  // Today Mission (Big highlight task state)
  const [focusingTaskId, setFocusingTaskId] = useState<string | null>(null);

  // Quick Add state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState(30);
  const [newPriority, setNewPriority] = useState<TaskPriority>("important");
  const [newEnergy, setNewEnergy] = useState<TaskEnergy>("normal");
  const [newIsMission, setNewIsMission] = useState(false);

  // Focus Timer active run stats
  const [timerTaskId, setTimerTaskId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [initialTime, setInitialTime] = useState(0); // in seconds
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Review states
  const [reviewNote, setReviewNote] = useState("");
  const [aiNudge, setAiNudge] = useState<string>("");
  const [isLoadingNudge, setIsLoadingNudge] = useState(false);
  const [isReviewSubmitted, setIsReviewSubmitted] = useState(false);

  // User details
  const userName = "Nadia";

  // Load from local storage
  useEffect(() => {
    const savedTasks = localStorage.getItem(STORAGE_TASKS_KEY);
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch (e) {
        setTasks(INITIAL_TASKS);
      }
    } else {
      setTasks(INITIAL_TASKS);
    }

    const savedStats = localStorage.getItem(STORAGE_STATS_KEY);
    if (savedStats) {
      try {
        setUserStats(JSON.parse(savedStats));
      } catch (e) {
        // use default init
      }
    }

    const savedEnergy = localStorage.getItem(STORAGE_ENERGY_KEY);
    if (savedEnergy && (savedEnergy === "low" || savedEnergy === "normal" || savedEnergy === "high")) {
      setEnergyMode(savedEnergy as EnergyMode);
    }
  }, []);

  // Save changes
  const saveTasks = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(updatedTasks));
  };

  const saveStats = (updatedStats: UserStats) => {
    setUserStats(updatedStats);
    localStorage.setItem(STORAGE_STATS_KEY, JSON.stringify(updatedStats));
  };

  const saveEnergy = (updatedEnergy: EnergyMode) => {
    setEnergyMode(updatedEnergy);
    localStorage.setItem(STORAGE_ENERGY_KEY, updatedEnergy);
  };

  // Sound generator helper for focus session completion (Synthesizer block in instructions!)
  const playSucceedBeeptone = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Warm synth chord
      const notes = [261.63, 329.63, 392.00, 523.25]; // C major chord
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2 + idx * 0.1);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 1.5);
      });
    } catch (e) {
      console.warn("Audio Context is blocked or not supported on this browser frame.");
    }
  };

  // Dynamic Gentle Nudge trigger on custom state
  const fetchSmartNudge = async (energy: EnergyMode, activeTasksList: Task[]) => {
    setIsLoadingNudge(true);
    const finishedCount = activeTasksList.filter(t => t.status === "completed").length;
    const pendingCount = activeTasksList.filter(t => t.status === "pending").length;

    // Check overload status
    const loadPoints = activeTasksList.filter(t => t.status === "pending").reduce((acc, t) => {
      let weight = 2;
      if (t.energy === "low") weight = 1;
      if (t.energy === "high") weight = 3;
      return acc + weight;
    }, 0);
    const limit = energy === "low" ? 5 : (energy === "high" ? 15 : 10);
    const overCapacity = loadPoints > limit;

    try {
      const res = await fetch("/api/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          energyMode: energy,
          finishedCount,
          pendingCount,
          overCapacity,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiNudge(data.nudge || "Pilihan tepat untuk melangkah perlahan hari ini.");
      } else {
        throw new Error();
      }
    } catch {
      // Friendly fallback Indonesian young accent
      if (overCapacity) {
        setAiNudge("Kerjaanmu agak over hari ini. Ga apa-apa buat tunda tugas santai atau kurang urgent demi kesehatan mentalmu!");
      } else if (finishedCount > 0) {
        setAiNudge("Wih, sudah ada yang selesai! Kamu hebat. Yuk lanjut cicil pelan-pelan tugas berikutnya!");
      } else {
        setAiNudge("Mulai aja hari ini dari hal yang paling ringan dulu, ga perlu terburu-buru kok.");
      }
    } finally {
      setIsLoadingNudge(false);
    }
  };

  // Trigger nudge whenever energy mode or task numbers change
  useEffect(() => {
    if (tasks.length > 0) {
      const timeout = setTimeout(() => {
        fetchSmartNudge(energyMode, tasks);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [energyMode, tasks.length]);

  // Handle active countdown timers
  useEffect(() => {
    if (isPlaying && timerTaskId) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Task Completed!
            setIsPlaying(false);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            playSucceedBeeptone();
            handleTaskSetCompleted(timerTaskId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isPlaying, timerTaskId]);

  const handleStartTimer = (task: Task) => {
    setTimerTaskId(task.id);
    setInitialTime(task.duration * 60);
    setTimeLeft(task.duration * 60);
    setIsPlaying(true);
    setActiveTab("focus"); // Go directly to focus layout Tab
  };

  const handleTaskSetCompleted = (id: string) => {
    const originalTask = tasks.find(t => t.id === id);
    const updated = tasks.map((t) => {
      if (t.id === id) {
        return { ...t, status: "completed" as TaskStatus };
      }
      return t;
    });

    saveTasks(updated);

    // If completed was a "Today's Mission", update the Win Counter and Streak
    if (originalTask && originalTask.isMission) {
      const todayStr = new Date().toLocaleDateString();
      if (userStats.lastWinDate !== todayStr) {
        const freshStats: UserStats = {
          winCounter: userStats.winCounter + 1,
          lastWinDate: todayStr,
          streak: userStats.streak + 1
        };
        saveStats(freshStats);
      }
    }
  };

  const handleToggleTaskStatus = (id: string) => {
    const target = tasks.find(t => t.id === id);
    if (!target) return;

    if (target.status === "pending") {
      handleTaskSetCompleted(id);
    } else {
      const updated = tasks.map((t) => {
        if (t.id === id) {
          return { ...t, status: "pending" as TaskStatus };
        }
        return t;
      });
      saveTasks(updated);
    }
  };

  const handleSetMission = (id: string) => {
    // Only one mission can exist at a time
    const updated = tasks.map((t) => ({
      ...t,
      isMission: t.id === id,
    }));
    saveTasks(updated);
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    saveTasks(updated);
    if (timerTaskId === id) {
      setIsPlaying(false);
      setTimerTaskId(null);
    }
  };

  const handleImportTasksFromDump = (newExtracted: Omit<Task, "id" | "status" | "createdAt" | "isMission">[]) => {
    // Generate valid UUIDs/timestamps
    const parsed: Task[] = newExtracted.map((t, idx) => ({
      id: `task-dump-${Date.now()}-${idx}`,
      title: t.title,
      duration: t.duration,
      priority: t.priority,
      energy: t.energy,
      status: "pending",
      isMission: false,
      createdAt: new Date().toISOString(),
    }));

    // If there is currently no Today Mission, recommend making the first one the Today's Mission focus
    const hasMission = tasks.some(t => t.isMission && t.status === "pending");
    if (!hasMission && parsed.length > 0) {
      parsed[0].isMission = true;
    }

    const merged = [...tasks, ...parsed];
    saveTasks(merged);
    setActiveTab("today"); // redirect to main planner viewport
  };

  const handleAddTaskDirectly = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: Task = {
      id: `task-add-${Date.now()}`,
      title: newTitle.trim(),
      duration: Number(newDuration) || 30,
      priority: newPriority,
      energy: newEnergy,
      status: "pending",
      isMission: newIsMission,
      createdAt: new Date().toISOString(),
    };

    let updated = [...tasks];
    if (newIsMission) {
      // Clear other missions
      updated = updated.map((t) => ({ ...t, isMission: false }));
    }

    updated.push(newTask);
    saveTasks(updated);

    // Reset inputs
    setNewTitle("");
    setNewDuration(30);
    setNewPriority("important");
    setNewEnergy("normal");
    setNewIsMission(false);
    setIsQuickAddOpen(false);
  };

  // Sorted list recommendation Engine based on current Energy Mode
  // Low energy: prefers low energy tasks, then normal, skips or moves heavy tasks to optional or can skip
  // Normal mode: balanced list
  // High energy: lists high energy items as top priority
  const getCategorizedTasks = () => {
    const todayMission = tasks.find((t) => t.isMission);
    const otherTasks = tasks.filter((t) => !t.isMission);

    // Let's divide other tasks based on realistic energy relevance
    // Must do: High priority tasks (urgent), or tasks matching current energy level
    // Nice to do: Normal or optional tasks
    // Can skip: Tasks with energy requirements that exceed present energy mode
    const mustDo: Task[] = [];
    const niceToDo: Task[] = [];
    const canSkip: Task[] = [];

    otherTasks.forEach((t) => {
      // filter out of energy match
      const exceedsEnergy =
        (energyMode === "low" && (t.energy === "high" || t.energy === "normal")) ||
        (energyMode === "normal" && t.energy === "high");

      if (exceedsEnergy) {
        canSkip.push(t);
      } else if (t.priority === "urgent" || t.priority === "important") {
        mustDo.push(t);
      } else {
        niceToDo.push(t);
      }
    });

    return { todayMission, mustDo, niceToDo, canSkip };
  };

  const { todayMission, mustDo, niceToDo, canSkip } = getCategorizedTasks();

  // Focus Timer controls
  const togglePlay = () => setIsPlaying(!isPlaying);
  const resetTimer = () => {
    setIsPlaying(false);
    setTimeLeft(initialTime);
  };
  const completeTimerTask = () => {
    if (timerTaskId) {
      handleTaskSetCompleted(timerTaskId);
      setIsPlaying(false);
    }
  };

  const getActiveTimerTask = () => {
    return tasks.find(t => t.id === timerTaskId);
  };

  const activeTimerTask = getActiveTimerTask();

  // Format countdown string
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [
      h > 0 ? String(h).padStart(2, "0") : null,
      String(m).padStart(2, "0"),
      String(s).padStart(2, "0"),
    ].filter(Boolean).join(":");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased font-sans text-slate-800">
      
      {/* Sidebar Navigation */}
      <nav id="sidebar" className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col p-6 flex-shrink-0">
        {/* Brand Banner */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black shadow-md shadow-indigo-100">
            ⚡
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-slate-900 font-display">Dayflow</span>
            <p className="text-[10px] text-indigo-600 font-medium tracking-wide">ENERGY PLANNER</p>
          </div>
        </div>

        {/* Navigation Actions Menu */}
        <div className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 mb-6 md:mb-10">
          <button
            id="nav-today-tab"
            onClick={() => setActiveTab("today")}
            className={`flex items-center gap-2.5 py-2.5 px-4 rounded-xl font-semibold text-xs md:text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "today"
                ? "bg-indigo-50 text-indigo-700 font-bold"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <span className="text-base">🗓️</span> Today Plan
          </button>

          <button
            id="nav-plan-tab"
            onClick={() => setActiveTab("plan")}
            className={`flex items-center gap-2.5 py-2.5 px-4 rounded-xl font-semibold text-xs md:text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "plan"
                ? "bg-indigo-50 text-indigo-700 font-bold"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <span className="text-base">🧠</span> Brain Dump
          </button>

          <button
            id="nav-focus-tab"
            onClick={() => setActiveTab("focus")}
            className={`flex items-center gap-2.5 py-2.5 px-4 rounded-xl font-semibold text-xs md:text-sm transition-all whitespace-nowrap relative cursor-pointer ${
              activeTab === "focus"
                ? "bg-indigo-50 text-indigo-700 font-bold"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <span className="text-base">🎯</span> Focus Timer
            {isPlaying && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-coral-500 animate-ping" />
            )}
          </button>

          <button
            id="nav-review-tab"
            onClick={() => setActiveTab("review")}
            className={`flex items-center gap-2.5 py-2.5 px-4 rounded-xl font-semibold text-xs md:text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "review"
                ? "bg-indigo-50 text-indigo-700 font-bold"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <span className="text-base">📊</span> Night Review
          </button>
        </div>

        {/* Sidebar Nudge (Floating micro indicator widget in style guide) */}
        <div className="mt-auto hidden md:block p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs">💡</span>
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Gentle Reminder</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed italic">
            "{aiNudge || "Tentukan fokus harianmu agar harimu mengalir santun."}"
          </p>
        </div>
      </nav>

      {/* Main Panel Content Area */}
      <main id="main-content" className="flex-1 p-5 md:p-8 flex flex-col overflow-y-auto max-w-5xl">
        
        {/* Main Header Banner */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-black font-display text-slate-900 tracking-tight">
              Good day, Nadia!
            </h1>
            <p className="text-slate-500 text-xs md:text-sm">
              Plan your day by energy, not pressure. Let's conquer it gracefully.
            </p>
          </div>
          
          <button
            id="quick-add-trigger-btn"
            onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
            className="flex items-center gap-2 bg-indigo-600 text-white text-xs md:text-sm px-5 py-3 rounded-2xl font-bold hover:bg-indigo-700 hover:scale-[1.02] shadow-lg shadow-indigo-100 transition-all cursor-pointer whitespace-nowrap"
          >
            {isQuickAddOpen ? <X className="w-4 h-4" /> : <Plus className="w-4.5 h-4.5" />}
            Quick Add Task
          </button>
        </header>

        {/* Quick Add Popup Portal Panel */}
        {isQuickAddOpen && (
          <div className="mb-6 bg-white rounded-3xl p-5 border border-slate-200 shadow-md">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" /> Tambah Task Baru
            </h3>
            <form onSubmit={handleAddTaskDirectly}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nama Tugas</label>
                  <input
                    id="new-task-title-input"
                    type="text"
                    required
                    placeholder="Contoh: Meeting evaluasi projek..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full text-xs md:text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Durasi Kerja (Menit)</label>
                  <input
                    id="new-task-duration-input"
                    type="number"
                    min="5"
                    required
                    value={newDuration}
                    onChange={(e) => setNewDuration(Math.max(1, Number(e.target.value)))}
                    className="w-full text-xs md:text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Prioritas</label>
                  <select
                    id="new-task-priority-select"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-800 cursor-pointer"
                  >
                    <option value="urgent">Urgent (Mendasak)</option>
                    <option value="important">Important (Penting)</option>
                    <option value="optional">Optional (Santai)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Konsumsi Energi</label>
                  <select
                    id="new-task-energy-select"
                    value={newEnergy}
                    onChange={(e) => setNewEnergy(e.target.value as TaskEnergy)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-800 cursor-pointer"
                  >
                    <option value="low">Low Energy (Chilling)</option>
                    <option value="normal">Normal (Kapasitas Biasa)</option>
                    <option value="high">High Energy (Fokus Tinggi)</option>
                  </select>
                </div>
                <div className="flex items-center sm:pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      id="new-task-mission-checkbox"
                      type="checkbox"
                      checked={newIsMission}
                      onChange={(e) => setNewIsMission(e.target.checked)}
                      className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                    />
                    Tandai Utama (Today Mission)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  id="cancel-add-task-btn"
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:underline cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="submit-add-task-btn"
                  type="submit"
                  className="px-5 py-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Simpan Tugas
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Viewport Render Layout Selection */}
        {activeTab === "today" && (
          <div className="space-y-8 animate-fade-in" id="today-view">
            
            {/* Energy Selector Section */}
            <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
                <div>
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Your Energy Mode Today
                  </h2>
                  <p className="text-xs text-slate-500">Sesuaikan kapasitas kerja hari ini dengan energimu saat ini.</p>
                </div>
                
                {/* Visual feedback of streak */}
                <div className="self-start sm:self-auto flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-3 py-1 font-bold text-xs">
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Streak: {userStats.streak} Hari</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  id="energy-low-btn"
                  onClick={() => saveEnergy("low")}
                  className={`py-4 px-3 md:px-6 rounded-2xl border transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    energyMode === "low"
                      ? "bg-blue-50 border-blue-500 ring-2 ring-blue-100 font-bold"
                      : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-2xl">🔋</span>
                  <span className={`text-[11px] md:text-xs uppercase tracking-wider ${energyMode === "low" ? "text-blue-800" : "text-slate-500"}`}>Low</span>
                </button>

                <button
                  id="energy-normal-btn"
                  onClick={() => saveEnergy("normal")}
                  className={`py-4 px-3 md:px-6 rounded-2xl border transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    energyMode === "normal"
                      ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-100 font-bold"
                      : "bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-2xl">⚡</span>
                  <span className={`text-[11px] md:text-xs uppercase tracking-wider ${energyMode === "normal" ? "text-emerald-800" : "text-slate-500"}`}>Normal</span>
                </button>

                <button
                  id="energy-high-btn"
                  onClick={() => saveEnergy("high")}
                  className={`py-4 px-3 md:px-6 rounded-2xl border transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    energyMode === "high"
                      ? "bg-purple-50 border-purple-500 ring-2 ring-purple-100 font-bold"
                      : "bg-white border-slate-200 hover:border-purple-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-2xl">🔥</span>
                  <span className={`text-[11px] md:text-xs uppercase tracking-wider ${energyMode === "high" ? "text-purple-800" : "text-slate-500"}`}>High</span>
                </button>
              </div>
            </section>

            {/* Today's Mission Frame */}
            {todayMission ? (
              <section className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl p-6 md:p-8 shadow-xl shadow-indigo-100 relative overflow-hidden" id="today-mission-highlight">
                <div className="absolute right-0 bottom-0 opacity-5 -mr-16 -mb-16">
                  <Target className="w-80 h-80" />
                </div>
                
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div>
                    <span className="text-[10px] bg-white/20 text-white px-2.5 py-1 rounded-full font-extrabold uppercase tracking-widest">
                       🎯 Today's Primary Focus
                    </span>
                    <h3 className="text-2xl md:text-3xl font-black mt-2 font-display leading-tight">{todayMission.title}</h3>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      <span className="flex items-center gap-1.5 text-xs bg-white/15 px-3 py-1.5 rounded-xl font-semibold backdrop-blur-sm">
                        ⏱️ {todayMission.duration} menit
                      </span>
                      <span className="flex items-center gap-1.5 text-xs bg-white/15 px-3 py-1.5 rounded-xl font-semibold backdrop-blur-sm uppercase">
                        {todayMission.priority === "urgent" ? "🚨 Urgent" : "⭐ Important"}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs bg-white/15 px-3 py-1.5 rounded-xl font-semibold backdrop-blur-sm">
                        ⚡ {todayMission.energy} energy level
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-auto">
                    <button
                      id={`complete-mission-btn-${todayMission.id}`}
                      onClick={() => handleToggleTaskStatus(todayMission.id)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        todayMission.status === "completed"
                          ? "bg-emerald-500 text-white hover:bg-emerald-600"
                          : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                      }`}
                      title={todayMission.status === "completed" ? "Tandai Belum Selesai" : "Tandai Selesai"}
                    >
                      <Check className="w-5 h-5 font-bold" />
                    </button>

                    <button
                      id={`start-mission-timer-${todayMission.id}`}
                      onClick={() => handleStartTimer(todayMission)}
                      disabled={todayMission.status === "completed"}
                      className="w-14 h-14 bg-white hover:bg-slate-100 text-indigo-600 rounded-full flex items-center justify-center text-lg font-black shadow-lg shadow-indigo-900/10 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                      title="Mulai Fokus"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              </section>
            ) : (
                <div id="no-mission-state" className="bg-dashed bg-white border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center">
                  <Target className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-700">Belum ada Misi Utama Hari Ini</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Pilih salah satu tugas krusial dari daftar di bawah dan jadikan ia Misi hari ini untuk melatih kedisiplinan berharga Nadia.
                  </p>
                </div>
            )}

            {/* Structured Tasks Recommendation Deck */}
            <section className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Rekomendasi Rencana Tugas (Tersusun otomatis)
                </h2>
                <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-bold">
                  Beban Energi: {energyMode} Mode
                </span>
              </div>

              {/* Must Do Deck */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-indigo-500 rounded-full" />
                  <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Must Do (Prioritas Segera)</h3>
                  <span className="text-[10px] text-neutral-400 font-bold">({mustDo.length})</span>
                </div>

                {mustDo.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-white p-4 rounded-2xl border border-slate-100">
                    Tidak ada tugas menuntut prioritas tinggi. Nikmati keseimbangannya!
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {mustDo.map((task) => (
                      <div
                        id={`task-row-${task.id}`}
                        key={task.id}
                        className={`p-4 md:p-5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-sm hover:shadow-md transition-all ${
                          task.status === "completed" ? "opacity-60 bg-slate-50/50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            id={`toggle-status-${task.id}`}
                            onClick={() => handleToggleTaskStatus(task.id)}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                              task.status === "completed"
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "border-slate-300 hover:border-indigo-500"
                            }`}
                          >
                            {task.status === "completed" && <Check className="w-3 h-3" />}
                          </button>
                          <div>
                            <p className={`text-xs md:text-sm font-bold text-slate-800 ${task.status === "completed" ? "line-through text-slate-400" : ""}`}>
                              {task.title}
                            </p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>⏱️ {task.duration} menit</span>
                              <span>•</span>
                              <span className="uppercase text-[9px] font-bold text-slate-400">{task.energy} energy</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                            task.priority === "urgent" ? "bg-red-50 text-red-600 border border-red-100" : "bg-indigo-50 text-indigo-700"
                          }`}>
                            {task.priority}
                          </span>
                          
                          <button
                            id={`set-mission-${task.id}`}
                            onClick={() => handleSetMission(task.id)}
                            className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors hidden sm:block cursor-pointer"
                          >
                            Set Principal
                          </button>

                          <button
                            id={`start-timer-${task.id}`}
                            onClick={() => handleStartTimer(task)}
                            disabled={task.status === "completed"}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-30 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`delete-task-${task.id}`}
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nice to Do Deck */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-emerald-500 rounded-full" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Nice to Do (Jika Ada Waktu)</h3>
                  <span className="text-[10px] text-neutral-400 font-bold">({niceToDo.length})</span>
                </div>

                {niceToDo.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-white p-4 rounded-2xl border border-slate-100">
                    Tidak ada tugas santai. Semua tugas difokuskan untuk prioritas utama!
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {niceToDo.map((task) => (
                      <div
                        id={`task-row-${task.id}`}
                        key={task.id}
                        className={`p-4 md:p-5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-sm hover:shadow-md transition-all ${
                          task.status === "completed" ? "opacity-60 bg-slate-50/50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            id={`toggle-status-${task.id}`}
                            onClick={() => handleToggleTaskStatus(task.id)}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                              task.status === "completed"
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "border-slate-300 hover:border-indigo-500"
                            }`}
                          >
                            {task.status === "completed" && <Check className="w-3 h-3" />}
                          </button>
                          <div>
                            <p className={`text-xs md:text-sm font-bold text-slate-800 ${task.status === "completed" ? "line-through text-slate-400" : ""}`}>
                              {task.title}
                            </p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>⏱️ {task.duration} menit</span>
                              <span>•</span>
                              <span className="uppercase text-[9px] font-bold text-slate-400">{task.energy} energy</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase bg-slate-100 text-slate-600">
                            {task.priority}
                          </span>
                          
                          <button
                            id={`set-mission-${task.id}`}
                            onClick={() => handleSetMission(task.id)}
                            className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors hidden sm:block cursor-pointer"
                          >
                            Set Principal
                          </button>

                          <button
                            id={`start-timer-${task.id}`}
                            onClick={() => handleStartTimer(task)}
                            disabled={task.status === "completed"}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-30 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`delete-task-${task.id}`}
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Can Skip/Move to Later Deck based on Energy Cap */}
              {canSkip.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 rounded-2xl p-3 border border-amber-150">
                    <BatteryLow className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black uppercase flex items-center gap-1">
                        <span>Can Skip / Pindahkan Ke Besok</span>
                        <span className="text-[10px] lowercase font-normal italic">({canSkip.length} tugas memerlukan energi lebih tinggi)</span>
                      </h4>
                      <p className="text-[10px] text-amber-700 leading-snug">
                        Tugas-tugas berikut membutuhkan energi besar (Normal/High Energy) yang melebihi mode energi low-mu hari ini. Silakan skip demi kenyamanan mentalmu!
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {canSkip.map((task) => (
                      <div
                        id={`task-row-${task.id}`}
                        key={task.id}
                        className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-sm opacity-55 hover:opacity-85 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            id={`toggle-status-${task.id}`}
                            onClick={() => handleToggleTaskStatus(task.id)}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                              task.status === "completed"
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "border-slate-300 hover:border-indigo-500"
                            }`}
                          >
                            {task.status === "completed" && <Check className="w-3 h-3" />}
                          </button>
                          <div>
                            <p className="text-xs md:text-sm font-bold text-slate-700">
                              {task.title}
                            </p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>⏱️ {task.duration} menit</span>
                              <span>•</span>
                              <span className="uppercase text-[9px] font-black text-amber-600">🔋 Memerlukan {task.energy} energy</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            id={`delete-task-${task.id}`}
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "plan" && (
          <div className="space-y-6 animate-fade-in" id="plan-view">
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-3xl p-6 border border-indigo-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-indigo-950 font-display">Otak Penuh? Tuangkan Di Sini</h2>
                <p className="text-xs text-indigo-800 max-w-lg mt-1">
                  Gunakan Brain Dump untuk mengeluarkan segala tumpukan ide kotor atau tugas tak beraturan di pikiranmu. Kami mendeteksi durasi, kepentingan, dan asupan energi secara instan.
                </p>
              </div>
              <span className="text-3xl">☕</span>
            </div>

            {/* Render subcomponents gracefully */}
            <BrainDump onImportTasks={handleImportTasksFromDump} />
          </div>
        )}

        {activeTab === "focus" && (
          <div className="max-w-xl mx-auto w-full space-y-6 animate-fade-in" id="focus-view">
            
            {/* Countdown Focus Frame */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-lg">
              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full">
                🎯 Deep Focus Space
              </span>

              {activeTimerTask ? (
                <div className="mt-6 space-y-6">
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 font-display">
                      {activeTimerTask.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-2">
                      <span className="uppercase text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {activeTimerTask.priority}
                      </span>
                      <span>•</span>
                      <span>Target: {activeTimerTask.duration} menit</span>
                    </p>
                  </div>

                  {/* Giant Dial Visual Widget */}
                  <div className="relative w-48 h-48 mx-auto flex items-center justify-center rounded-full border-4 border-indigo-120 bg-slate-50 shadow-inner">
                    <div className="text-center">
                      <span id="countdown-text" className="text-3xl md:text-4xl font-extrabold text-indigo-600 block tracking-tight font-mono">
                        {formatTime(timeLeft)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">
                        {isPlaying ? "Focusing..." : "Paused"}
                      </span>
                    </div>

                    {/* Ping wave */}
                    {isPlaying && (
                      <div className="absolute inset-0 rounded-full border-4 border-indigo-400 animate-pulse opacity-40 scale-105" />
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex justify-center items-center gap-4 pt-2">
                    <button
                      id="reset-timer-btn"
                      onClick={resetTimer}
                      className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-transform hover:rotate-[-45deg] cursor-pointer"
                      title="Ulangi"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>

                    <button
                      id="toggle-timer-play-btn"
                      onClick={togglePlay}
                      className="w-16 h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center text-lg shadow-lg active:scale-95 transition-all cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
                    </button>

                    <button
                      id="complete-timer-task-btn"
                      onClick={completeTimerTask}
                      className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-full transition-all cursor-pointer"
                      title="Selesaikan Tugas Sekarang"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 px-4" id="empty-focus-timer">
                  <Hourglass className="w-16 h-16 text-slate-300 mx-auto animate-bounce mb-4" />
                  <h3 className="font-bold text-slate-800 text-lg">Tidak Ada Sesi Aktif</h3>
                  <p className="text-xs text-slate-550 mt-1.5 max-w-sm mx-auto">
                    Kembali ke menu <strong>Today Plan</strong> dan klik tombol <strong>play</strong> (▶) di samping tugas untuk meluncurkan ruang hampa distraksi di sini.
                  </p>
                </div>
              )}
            </div>

            {/* Little tips section */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/50 flex gap-3">
              <span className="text-lg shrink-0">🎧</span>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Tips Fokus Maksimal</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Pasang earphone, dengarkan musik instrumental yang ramah, taruh handphone menjauh, dan selesaikan misi utama harian dengan konsistensi penuh demi ketenangan esok hari.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "review" && (
          <div className="space-y-6 animate-fade-in" id="review-view">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold font-display text-slate-900 mb-1 flex items-center gap-2">
                <span>🌙 Night Review & Refleksi harian</span>
              </h2>
              <p className="text-xs text-slate-500 mb-6">Tandai kedewasaan produktif hari ini dengan mengulas apa yang berhasil dicapai.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                
                {/* Visual statistics */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                    <BarChart2 className="w-3.5 h-3.5 text-indigo-500" />
                    Statistik Hasil Hari Ini
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Selesai</span>
                      <span className="text-2xl font-black text-emerald-600 block">
                        {tasks.filter(t => t.status === "completed").length} Tasks
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending</span>
                      <span className="text-2xl font-black text-amber-500 block">
                        {tasks.filter(t => t.status === "pending").length} Tasks
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 bg-white p-3 rounded-xl border border-slate-100 flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Beban kerja diselesaikan:</span>
                    <span className="font-bold text-indigo-600">
                      {tasks.filter(t => t.status === "completed").reduce((acc, t) => acc + t.duration, 0)} Menit Kerja
                    </span>
                  </div>
                </div>

                {/* AI Companion feedback block */}
                <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100/50 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-500 animate-spin-slow" />
                      We Have a Message for You
                    </h4>
                    {isLoadingNudge ? (
                      <p className="text-xs text-slate-500 italic animate-pulse">Meramu tulisan penyegar jiwa...</p>
                    ) : (
                      <p className="text-xs text-slate-700 leading-relaxed italic">
                        "{aiNudge || "Belum ada rekomendasi aktif untuk harimu saat ini."}"
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-indigo-100/40 flex justify-end">
                    <button
                      id="refresh-nudge-btn"
                      onClick={() => fetchSmartNudge(energyMode, tasks)}
                      className="text-[10px] text-indigo-700 font-bold hover:underline cursor-pointer"
                    >
                      🔄 Mintalah Nudge Lainnya
                    </button>
                  </div>
                </div>

              </div>

              {/* Day evaluation text space */}
              <div className="space-y-3">
                <label className="block text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                  Evaluasi Diri & Catatan Kecil Malam Hari
                </label>
                <textarea
                  id="review-eval-textarea"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Contoh: Hari ini sangat produktif meskipun di awal sempat mager. Projek dayflow bisa rampung!"
                  rows={4}
                  className="w-full text-xs md:text-sm rounded-xl border border-slate-200 p-3.5 text-slate-850 focus:outline-none focus:border-indigo-500 bg-slate-50/40"
                />

                <div className="flex justify-end pt-2">
                  <button
                    id="submit-review-btn"
                    onClick={() => {
                      setIsReviewSubmitted(true);
                      setReviewNote("");
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Submit Night Review
                  </button>
                </div>
              </div>

              {isReviewSubmitted && (
                <div id="review-success-badge" className="mt-4 p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 text-xs">
                  ✨ <strong>Review Terkirim!</strong> Bagus sekali Nadia, kamu telah mencatat sejarah hari ini. Besok adalah hari baru dengan energi baru. Selamat istirahat!
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Right Sidebar Widgets Panel */}
      <aside id="right-aside" className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-slate-200 p-6 flex flex-col gap-6 flex-shrink-0">
        
        {/* Real-time capacity widget */}
        <CapacityMeter energyMode={energyMode} tasks={tasks} />

        {/* Win counter widget (streak/success counts) */}
        <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-100">
          <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest mb-1">
            Success Streak
          </p>
          <div className="flex items-baseline gap-1.5">
            <span id="win-counter-value" className="text-3xl font-black text-emerald-800 font-display">
              {userStats.winCounter} Hari
            </span>
            <span className="text-xs text-emerald-600 font-semibold">Tercapai</span>
          </div>
          <p className="text-[11px] text-emerald-700 mt-2 leading-relaxed">
            Menyelesaikan tugas utama (Today Mission) harian adalah kunci utama terbebas dari stres Nadia! Terus konsisten ya!
          </p>
        </div>

        {/* Quick Time Allocation widgets list */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3.5">
            Beban Waktu Hari Ini
          </h3>
          
          <div className="space-y-2.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-semibold">Tugas Utama (Mission)</span>
              <span className="text-slate-800 font-extrabold">
                {tasks.filter(t => t.isMission).reduce((acc, t) => acc + t.duration, 0)} Menit
              </span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-semibold">Tugas Tambahan Terencana</span>
              <span className="text-slate-800 font-extrabold">
                {tasks.filter(t => !t.isMission).reduce((acc, t) => acc + t.duration, 0)} Menit
              </span>
            </div>

            <div className="flex justify-between text-xs border-t border-slate-200/60 pt-2 font-bold text-indigo-700">
              <span>Total Alokasi Rencana</span>
              <span>{tasks.reduce((acc, t) => acc + t.duration, 0)} Menit</span>
            </div>
          </div>
        </div>

        {/* Action instruction alert block */}
        <div className="mt-auto hidden md:flex items-start gap-2 p-3 bg-indigo-50/40 rounded-xl text-[10px] text-indigo-800 border border-indigo-100/50 leading-relaxed">
          <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <span>Dayflow mengalirkan tugas prioritas sesuai kebutuhan energimu secara realistis agar terbebas dari kejenuhan.</span>
        </div>
      </aside>

      {/* Floating Plus button for Mobile only */}
      <button
        id="mobile-floating-add-btn"
        onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer"
        title="Quick Add Task"
      >
        <Plus className="w-6 h-6" />
      </button>

    </div>
  );
}
