export type EnergyMode = "low" | "normal" | "high";
export type TaskPriority = "urgent" | "important" | "optional";
export type TaskEnergy = "low" | "normal" | "high";
export type TaskStatus = "pending" | "completed";

export interface Task {
  id: string;
  title: string;
  duration: number; // in minutes
  priority: TaskPriority;
  energy: TaskEnergy;
  status: TaskStatus;
  isMission: boolean; // Today Mission (Focus Target)
  createdAt: string;
}

export interface DaySummary {
  date: string;
  energyMode: EnergyMode;
  totalTasks: number;
  completedTasks: number;
  uncompletedTasks: number;
  totalMinutesSpent: number;
  starsEarned: boolean; // Win Counter flag
  logNotes?: string;
}

export interface UserStats {
  winCounter: number;
  lastWinDate: string | null; // Keep track of dates user hit their mission
  streak: number;
}
