import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

// Initialize Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json());

  // API endpoint for Brain Dump structuring
  app.post("/api/brain-dump", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string" || text.trim() === "") {
        res.status(400).json({ error: "Text is required" });
        return;
      }

      const prompt = `Please analyze this user's brain dump text and extract tasks. Structurize them cleanly.
Each task MUST contain:
1. "title": A concise action-oriented task name (in Indonesian/English as written).
2. "duration": Estimated duration in minutes (integer, default is 30 if not mentioned).
3. "priority": Either "urgent", "important", or "optional" based on tone and context.
4. "energy": Estimated energy level required ("low", "normal", or "high"). For example, administrative things or chilling is "low", complex work/writing/studying is "high".

User's brainstorm text:
"${text}"`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a friendly, productivity-focused assistant for young people ('Kawula Muda'). Extract tasks from disorganized brain dump text, guessing details logically when absent. Keep descriptions clean, young, and active.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: "Simplified, action-oriented title of the task.",
                },
                duration: {
                  type: Type.INTEGER,
                  description: "Estimated duration in minutes (e.g., 30, 45, 60, 90, 120).",
                },
                priority: {
                  type: Type.STRING,
                  description: "Must be one of: 'urgent', 'important', 'optional'.",
                },
                energy: {
                  type: Type.STRING,
                  description: "The energy level required: 'low', 'normal', 'high'.",
                },
              },
              required: ["title", "duration", "priority", "energy"],
            },
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response from Gemini API");
      }

      const tasks = JSON.parse(responseText.trim());
      res.json({ tasks });
    } catch (error: any) {
      console.error("Error in brain dump endpoint:", error);
      res.status(500).json({
        error: "Failed to process brain dump",
        details: error.message || error,
      });
    }
  });

  // API endpoint for generating custom productive nudge / affirmation based on state
  app.post("/api/nudge", async (req, res) => {
    try {
      const { energyMode, finishedCount, pendingCount, overCapacity } = req.body;

      const prompt = `Generate a very short, friendly, empathetic, youthful nudge (Indonesian language, 1 sentence max) for today's condition:
- Today's Energy mode declared by user: ${energyMode}
- Tasks completed: ${finishedCount}
- Tasks pending: ${pendingCount}
- Is user over-capacity for their energy state? ${overCapacity ? "Yes, too many heavy tasks" : "No, workload is fine"}

Provide a direct quote, no greetings like "Halo Nadia" or anything, just a direct positive nudge or gentle advice for Dayflow app. Feel Indonesian 'anak muda', warm, helpful, completely natural (santai tapi supportive, no cringy slang).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are Dayflow's friendly supportive AI companion. Generate single-sentence gentle nudges in natural Indonesian that are empathetic, brief, and authentic.",
        },
      });

      res.json({ nudge: response.text?.trim().replace(/"/g, "") });
    } catch (error: any) {
      console.error("Error generating nudge:", error);
      res.status(500).json({ error: "Failed to generate nudge" });
    }
  });

  // Serve static assets/Vite setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
