import React, { useState } from "react";
import { Sparkles, Loader2, Plus, CornerDownRight, Trash2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Task, TaskPriority, TaskEnergy } from "../types";

interface BrainDumpProps {
  onImportTasks: (tasks: Omit<Task, "id" | "status" | "createdAt" | "isMission">[]) => void;
}

export default function BrainDump({ onImportTasks }: BrainDumpProps) {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState<
    { title: string; duration: number; priority: TaskPriority; energy: TaskEnergy; selected: boolean }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  // Suggested quick prompts for young people to easily try
  const suggestPrompts = [
    "Meeting dosen jam 2, revisi bab 4 laporan malem ini, beli kopi susu sachet sama catetan presentasi",
    "Gym sore 45 menit, telpon mamah, dump ide artikel medium, bayar kosan minggu depan",
    "Coding project dayflow 2 jam, nonton youtube dota, beresin kamar yang berantakan bgt",
  ];

  // Client-side fallback task parses in case API key/backend is missing or fails
  const localParserFallback = (text: string) => {
    const lines = text.split(/[,\n.]+/);
    return lines
      .map((line) => {
        let clean = line.trim();
        if (!clean) return null;

        // Strip bullet points or numbers
        clean = clean.replace(/^[\s*\-•\d+.)]+/, "").trim();
        if (!clean) return null;

        // Determine duration
        let duration = 30;
        const durationMatch = clean.match(/(\d+)\s*(menit|min|m|hour|jam|h)/i);
        if (durationMatch) {
          const val = parseInt(durationMatch[1], 10);
          const unit = durationMatch[2].toLowerCase();
          if (unit.startsWith("h") || unit.startsWith("j")) {
            duration = val * 60;
          } else {
            duration = val;
          }
        }

        // Determine priority
        let priority: TaskPriority = "important";
        if (clean.toLowerCase().includes(" urgent") || clean.toLowerCase().includes("penting banget") || clean.toLowerCase().includes("deadline")) {
          priority = "urgent";
        } else if (clean.toLowerCase().includes("gampang") || clean.toLowerCase().includes("optional") || clean.toLowerCase().includes("santai")) {
          priority = "optional";
        }

        // Determine energy
        let energy: TaskEnergy = "normal";
        if (clean.toLowerCase().includes("coding") || clean.toLowerCase().includes("revisi") || clean.toLowerCase().includes("gym") || duration > 60) {
          energy = "high";
        } else if (clean.toLowerCase().includes("kopi") || clean.toLowerCase().includes("telpon") || clean.toLowerCase().includes("santai")) {
          energy = "low";
        }

        return {
          title: clean.substring(0, 80),
          duration,
          priority,
          energy,
          selected: true,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  };

  const handleOrganize = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/brain-dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        throw new Error("Gagal mengambil data dari Google Gemini API");
      }

      const data = await response.json();
      if (data.tasks && Array.isArray(data.tasks)) {
        setExtractedTasks(
          data.tasks.map((t: any) => ({
            title: t.title || "Tugas Tanpa Nama",
            duration: Number(t.duration) || 30,
            priority: (t.priority === "urgent" || t.priority === "important" || t.priority === "optional") ? t.priority : "important",
            energy: (t.energy === "low" || t.energy === "normal" || t.energy === "high") ? t.energy : "normal",
            selected: true,
          }))
        );
      } else {
        throw new Error("Format respons tidak sesuai");
      }
    } catch (err: any) {
      console.warn("Using local parser backup:", err.message);
      // Beautiful message about using the smart local structure helper
      const fallbackResults = localParserFallback(inputText);
      if (fallbackResults.length > 0) {
        setExtractedTasks(fallbackResults);
        setError("Note: Memakai local smart processor sebagai backup (Gemini API belum terkonfigurasi/error).");
      } else {
        setError("Ups! Tuliskan teks dump yang lebih jelas ya.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelect = (index: number) => {
    setExtractedTasks((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, selected: !t.selected } : t))
    );
  };

  const handleFieldChange = (index: number, key: keyof typeof extractedTasks[0], value: any) => {
    setExtractedTasks((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, [key]: value } : t))
    );
  };

  const handleDeleteExtracted = (index: number) => {
    setExtractedTasks((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleImport = () => {
    const selected = extractedTasks.filter((t) => t.selected);
    if (selected.length === 0) return;

    onImportTasks(
      selected.map((t) => ({
        title: t.title,
        duration: t.duration,
        priority: t.priority,
        energy: t.energy,
      }))
    );

    // reset
    setInputText("");
    setExtractedTasks([]);
    setError(null);
  };

  return (
    <div id="brain-dump-panel" className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-brand-50 rounded-2xl text-brand-500">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-display text-neutral-800">Brain Dump Organizer</h2>
          <p className="text-xs text-neutral-500">
            Tulis semua unek-unek / daftar acak di kepalamu. Biarkan AI merapikannya jadi tugas terstruktur!
          </p>
        </div>
      </div>

      {/* Input area */}
      <div className="space-y-4">
        <textarea
          id="brain-dump-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Contoh: Belajar UTBK jam 9 malem, beli roti bakar rasa keju deket perempatan, besok harus kumpul magang jam 8 pagi, trus sorenya lari santai aja..."
          rows={5}
          className="w-full rounded-2xl border border-neutral-200 p-4 text-sm focus:outline-none focus:border-brand-500 bg-neutral-50/50 resize-y placeholder:text-neutral-400 text-neutral-800"
        />

        {/* Suggest buttons */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-neutral-400 font-medium">Coba klik ide dump ini:</span>
          {suggestPrompts.map((prompt, idx) => (
            <button
              id={`suggest-prompt-${idx}`}
              key={idx}
              onClick={() => setInputText(prompt)}
              className="text-[11px] bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors py-1.5 px-3 rounded-full cursor-pointer max-w-xs truncate text-left"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Organize CTA */}
        <div className="flex justify-end pt-2">
          <button
            id="organize-brain-dump-btn"
            onClick={handleOrganize}
            disabled={isLoading || !inputText.trim()}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-medium py-2.5 px-6 rounded-xl text-sm transition-all shadow-sm shadow-brand-100 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Merapikan dengan AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Organize Dump
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div id="brain-dump-error" className="mt-4 p-3.5 bg-amber-50 rounded-2xl text-xs text-amber-700 border border-amber-100 leading-relaxed">
          {error}
        </div>
      )}

      {/* Structured results list */}
      <AnimatePresence>
        {extractedTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="mt-6 border-t border-dashed border-neutral-100 pt-6"
            id="brain-dump-results"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-neutral-800 flex items-center gap-1.5">
                <CornerDownRight className="w-4 h-4 text-brand-500" />
                Hasil Ekstraksi Tugas
              </h3>
              <p className="text-[11px] text-neutral-400">Pilih tugas yang ingin kamu masukkan ke planner harian</p>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {extractedTasks.map((t, index) => (
                <div
                  key={index}
                  className={`flex flex-col md:flex-row items-start md:items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                    t.selected
                      ? "bg-brand-50/20 border-brand-100 shadow-sm"
                      : "bg-white border-neutral-150 opacity-60 hover:opacity-80"
                  }`}
                  id={`extracted-task-${index}`}
                >
                  {/* Select Checkbox */}
                  <button
                    id={`toggle-select-extracted-${index}`}
                    onClick={() => handleToggleSelect(index)}
                    className="flex-shrink-0 cursor-pointer"
                  >
                    <CheckCircle2
                      className={`w-5 h-5 ${
                        t.selected ? "text-brand-500 fill-brand-500/10" : "text-neutral-300"
                      }`}
                    />
                  </button>

                  {/* Task title editable input */}
                  <input
                    id={`edit-extracted-title-${index}`}
                    type="text"
                    value={t.title}
                    onChange={(e) => handleFieldChange(index, "title", e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none focus:border-b focus:border-neutral-300 font-medium text-neutral-800 placeholder:text-neutral-300"
                  />

                  {/* Options panel */}
                  <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
                    {/* Duration input */}
                    <div className="flex items-center gap-1 text-[11px] bg-neutral-100 text-neutral-700 py-1 px-2 rounded-lg">
                      <input
                        id={`edit-extracted-duration-${index}`}
                        type="number"
                        value={t.duration}
                        onChange={(e) => handleFieldChange(index, "duration", Math.max(1, Number(e.target.value)))}
                        className="w-8 text-center bg-transparent focus:outline-none font-bold"
                      />
                      <span>menit</span>
                    </div>

                    {/* Priority select */}
                    <select
                      id={`edit-extracted-priority-${index}`}
                      value={t.priority}
                      onChange={(e) => handleFieldChange(index, "priority", e.target.value)}
                      className="text-[11px] bg-neutral-100 text-neutral-700 py-1 px-1.5 rounded-lg focus:outline-none font-medium cursor-pointer"
                    >
                      <option value="urgent">Urgent</option>
                      <option value="important">Important</option>
                      <option value="optional">Optional</option>
                    </select>

                    {/* Energy select */}
                    <select
                      id={`edit-extracted-energy-${index}`}
                      value={t.energy}
                      onChange={(e) => handleFieldChange(index, "energy", e.target.value)}
                      className="text-[11px] bg-neutral-100 text-neutral-700 py-1 px-1.5 rounded-lg focus:outline-none font-medium cursor-pointer"
                    >
                      <option value="low">Low Energy</option>
                      <option value="normal">Normal</option>
                      <option value="high">High Energy</option>
                    </select>

                    {/* Delete single */}
                    <button
                      id={`delete-extracted-${index}`}
                      onClick={() => handleDeleteExtracted(index)}
                      className="p-1 text-neutral-400 hover:text-coral-500 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Import Button */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                id="cancel-dump-btn"
                onClick={() => setExtractedTasks([])}
                className="text-neutral-500 hover:bg-neutral-100 font-medium py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Clear
              </button>
              <button
                id="import-dump-btn"
                onClick={handleImport}
                className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-medium py-2 px-5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Masukkan ke Planner ({extractedTasks.filter((t) => t.selected).length})
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
