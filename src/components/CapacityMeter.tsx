import React from "react";
import { Battery, BatteryLow, BatteryCharging, AlertTriangle, Zap } from "lucide-react";
import { EnergyMode, Task } from "../types";

interface CapacityMeterProps {
  energyMode: EnergyMode;
  tasks: Task[];
}

export default function CapacityMeter({ energyMode, tasks }: CapacityMeterProps) {
  // Low: 1 point, Normal: 2 points, High: 3 points
  const activeTasks = tasks.filter((t) => t.status === "pending");
  const totalLoad = activeTasks.reduce((acc, t) => {
    let weight = 2; // default normal
    if (t.energy === "low") weight = 1;
    if (t.energy === "high") weight = 3;
    return acc + weight;
  }, 0);

  // Set limits based on energy mode
  let maxCapacity = 10;
  if (energyMode === "low") maxCapacity = 5;
  if (energyMode === "high") maxCapacity = 15;

  const percentage = Math.min(100, Math.round((totalLoad / maxCapacity) * 100));

  let statusColor = "bg-brand-500";
  let statusBg = "bg-brand-100/50";
  let textColor = "text-brand-600";
  let levelMessage = "Tenangan hari ini, workload pas!";

  if (percentage > 100) {
    statusColor = "bg-coral-500 animate-pulse";
    statusBg = "bg-coral-100";
    textColor = "text-coral-500";
    levelMessage = "Overload! Kurangi tugas atau skip yang optional.";
  } else if (percentage >= 80) {
    statusColor = "bg-amber-500";
    statusBg = "bg-amber-100";
    textColor = "text-amber-600";
    levelMessage = "Hampir penuh! Jaga fokusmu.";
  } else if (percentage > 0) {
    statusColor = "bg-emerald-500";
    statusBg = "bg-emerald-50";
    textColor = "text-emerald-600";
    levelMessage = "Sangat realistis untuk dijalani.";
  } else {
    levelMessage = "Belum ada rencana aktif harian.";
  }

  // Energy Mode info badge
  const getEnergyMeta = () => {
    switch (energyMode) {
      case "low":
        return {
          label: "Low Energy Day",
          desc: "Fokus ke hal kecil & santai. Max 5 load points.",
          icon: <BatteryLow className="w-5 h-5 text-amber-500" />,
          colorClass: "bg-amber-50 text-amber-700 border-amber-100",
        };
      case "high":
        return {
          label: "High Energy Day",
          desc: "Hajar tugas-tugas berat! Max 15 load points.",
          icon: <BatteryCharging className="w-5 h-5 text-emerald-500 animate-pulse" />,
          colorClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
        };
      default:
        return {
          label: "Normal Day",
          desc: "Keseimbangan produktivitas harian. Max 10 load points.",
          icon: <Battery className="w-5 h-5 text-sky-500" />,
          colorClass: "bg-sky-50 text-sky-700 border-sky-100",
        };
    }
  };

  const meta = getEnergyMeta();

  return (
    <div id="capacity-meter-widget" className="bg-white rounded-3xl p-5 border border-neutral-100 shadow-sm">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-sm font-semibold text-neutral-800 flex items-center gap-1.5 font-display">
          <Zap className="w-4 h-4 text-brand-500" />
          Kapasitas Hari Ini
        </h3>
        <span className="text-xs font-bold text-neutral-500">
          Load: {totalLoad} / {maxCapacity} pts
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-neutral-100 h-3 rounded-full overflow-hidden mb-3">
        <div
          id="capacity-progress-bar"
          className={`h-full transition-all duration-500 rounded-full ${statusColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Warning Alert or Message */}
      <div className={`p-3 rounded-2xl border flex items-start gap-2.5 transition-colors ${meta.colorClass}`}>
        <div className="flex-shrink-0 mt-0.5">{percentage > 100 ? <AlertTriangle className="w-5 h-5 text-coral-500 animate-bounce" /> : meta.icon}</div>
        <div>
          <div className="text-xs font-bold leading-none mb-1 flex items-center gap-1">
            <span>{percentage > 100 ? "⚠️ Overload Capacity" : meta.label}</span>
            <span className="text-[10px] opacity-75 font-normal">({percentage}%)</span>
          </div>
          <p className="text-[11px] leading-snug opacity-90">{percentage > 100 ? "Task kamu terlalu banyak untuk energi hari ini. Pindahkan sebagian ke nanti ya!" : levelMessage}</p>
        </div>
      </div>

      <div className="mt-2.5 text-center">
        <span className="text-[10px] text-neutral-400 italic">
          {meta.desc}
        </span>
      </div>
    </div>
  );
}
