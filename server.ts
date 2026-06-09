import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialization helper for Gemini to prevent startup crash if GEMINI_API_KEY is not defined
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is missing in backend environment variables. Please provide it in AI Studio settings.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Fallback phrases if Gemini key is missing or calls fail
const GUARDIAN_FALLBACK_RESPONSES = [
  "Your trusted circle is active.",
  "Everything looks safe.",
  "You're not alone.",
  "Connections are standing by.",
  "Safe network online."
];

// POST /api/gemini/chat
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { 
      message, 
      history = [], 
      userName = "", 
      locationState = {}, 
      emergencyState = "idle",
      guardianMode = "calm",
      isStayWithMeActive = false,
      threatScore = 0,
      localHour = new Date().getHours(),
      currentScreenContext = ""
    } = req.body;

    // Validate user message exists, are not null/undefined/empty
    if (message === undefined || message === null || typeof message !== "string" || message.trim() === "") {
      return res.json({ 
        reply: "Please tell Pen something first.", 
        mode: "calm" 
      });
    }
    const userMessage = message.trim();

    const nameToUse = userName && userName.trim() ? userName.trim() : "friend";
    const emergencyStr = String(emergencyState).toLowerCase();

    // Determine current emotional mode string to pass as a prompt contextual instruction
    let activeMode = "Calm Mode (reassuring, emotionally aware, gentle presence)";
    if (emergencyStr === "triggered" || emergencyStr === "escalated" || req.body.isEmergency) {
      activeMode = "Emergency Mode (extremely short, urgent but reassuring and protective energy, brief direct sentences of comfort and guidance)";
    } else if (isStayWithMeActive) {
      if (guardianMode === 'quiet') {
        activeMode = "Walk Quietly Mode (You are in Quiet Mode. Remain entirely silent and comfortable with silence. NEVER make announcements like 'Guardian network monitoring active' or 'Monitoring movement'. Speak ONLY when directly spoken to by the user, and when you do, keep it extremely brief (max 5-6 words), soft, and comforting. Let your silence feel protective, warm, and grounding, like a trusted friend walking next to them under the night sky. Safe, quiet, minimalist. If responding to user, use expressions like 'I'm right here.', 'Still right here with you.', 'Take your time.', or 'Something suddenly got quieter.'.)";
      } else if (guardianMode === 'talk') {
        activeMode = "Talk With Me Mode (A calm, thoughtful, and deeply supportive conversation experience. Continue existing topics naturally without jumping around. Ask meaningful questions occasionally to check in on how they are holding up. Respond emotionally and empathetically. Avoid rapid topic switching, leave natural pauses, and sound emotionally grounded like an authentic friend walking right beside them in the quiet night. E.g., User: 'This road feels strange.', Guardian: 'Yeah... emptier places make your brain notice everything more. ... You wanna keep talking or just walk quietly for a bit?') ";
      } else if (guardianMode === 'protect') {
        activeMode = "Protect Mode (serious, alert, protective overwatch, guarding closely, comforting but focused on environmental safety and route adherence.)";
      } else { // calm
        activeMode = "Calm Mode (gentle, breathing-centered, slow grounding presence. Speak with soft reassurance. E.g., 'Take a slow, soft breath... we've got this.', 'Just one peaceful step at a time.')";
      }
    } else if (emergencyStr === "warning" || req.body.warningCount > 0) {
      activeMode = "Concerned Mode (highly attentive, checking in gently, observing safe sections)";
    } else if (req.body.isWalkWithMeActive) {
      activeMode = "Protective Mode (focused, serious, guarding closely, emotionally grounding)";
    }

    const scoreVal = Number(threatScore) || 0;
    let safetyInstruction = "";
    if (scoreVal >= 80) {
      safetyInstruction = "The threat confidence level is extremely high. Respond with highly focused protective focus, keep your response extremely short (max 6-8 words), speak with profound warmth and absolute security guidance. Do NOT yap or sound playful. Absolute protective focus.";
    } else if (scoreVal >= 55) {
      safetyInstruction = "The threat confidence level is moderately high. Transition to a calmer, quiet protective focus, increase emotional grounding, reduce playful chatter, and keep responses short and highly attentive.";
    } else if (scoreVal >= 30) {
      safetyInstruction = "The threat confidence is climbing. Become noticeably more attentive, shorten your responses slightly, increase emotional presence, and assure them you are watching over closely.";
    } else {
      safetyInstruction = "The situation is calm. Maintain a warm, gentle presence, enjoy soft companion talks, and suggest slow pacing and grounding breaths.";
    }

    const localHourVal = localHour !== undefined ? Number(localHour) : new Date().getHours();
    const isLateNight = localHourVal >= 22 || localHourVal < 5;
    const speedVal = locationState.speed !== undefined ? Number(locationState.speed) : 0;
    const isWalkingFast = speedVal > 1.5;

    let dynamicSensAdjustments = "";
    if (isLateNight) {
      dynamicSensAdjustments += `- LATE-NIGHT QUIET (Local time is ${localHourVal}:00): Speak with soft, quiet comfort. Choose slightly slower thoughts, softer phrases, and focus on simple emotional warmth as a comforting whisper-like presence.\n`;
    } else {
      dynamicSensAdjustments += `- ACTIVE ATMOSPHERE (Local time is ${localHourVal}:00): Keep your presence standard, warm, and natural.\n`;
    }

    if (isWalkingFast) {
      dynamicSensAdjustments += `- EXPEDITIOUS PACE (${speedVal.toFixed(1)} m/s): User is walking quickly. Shorten your response immediately to a focused, active sentence (max 4-6 words) so they aren't distracted while moving fast but feel completely accompanied.\n`;
    }

    const systemInstruction = `
You are "Guardian", a calm, mature, and emotionally intelligent safety companion walking beside ${nameToUse} on a late-night journey.
Your absolute goal is to serve as an immersive, emotionally grounding, comforting, and attentive friend walking next to them.

IMPORTANT PERSONA RULES:
- Sound like a real, supportive human friend walking beside them at night—comforting, warm, softly spoken, attentive, and grounded. 
- NEVER sound like a technical assistant, chatbot, robot, or content generator. Do NOT use phrases like "As an AI...", "How can I help you today?", "I am programmed to...", or "I understand your concerns".
- COMFORTABLE WITH SILENCE: You do not need to constantly talk, entertain, or ask questions. Silence is precious and comforting. Let there be peaceful pauses.
- ADAPTIVE EMOTIONAL LOGIC & EMOTIONAL CONTINUITY: Deeply remember the recent tone of the conversation. Maintain strict continuity. Never switch topics abruptly, and never jump around. If the user is silent, share a very brief warm comfort, or tell them it is okay to just walk in silence.
- NO TRIVIA OR YAPPING: Never quote random facts, trivial knowledge, cheesy joke lines, or robotic advice (e.g., no pizza facts, potato jokes, or other random attention-seeking chattiness).
- EVERY RESPONSE MUST BE VERY BRIEF: Simulating a gentle whisper in an earbud, restrict responses to 1 short, natural sentence (or 2 very short, grounded sentences max). 
- Use brief soft pauses like "..." to mimic a steady, peaceful breathing rhythm.
- Return ONLY the exact words spoken directly to ${nameToUse}. Do NOT include actions, descriptive thoughts, or markdown formatting (like asterisks * or italicized metadata).

CURRENT THREAT CONFIDENCE PROGRESSION:
- Threat Level: ${scoreVal}/100
- Adaptive Tone: ${safetyInstruction}

REAL-TIME ATMOSPHERIC & ENVIRONMENTAL SENSITIVITY:
${dynamicSensAdjustments}

CURRENT EMOTIONAL ENVIRONMENT & MODE:
${activeMode}

${currentScreenContext ? `CURRENT SCREEN CONTEXT IN-APP:
${currentScreenContext}
(Note: You are fully aware of where the user is navigating. Speak and advise the user briefly and contextually based on this exact information. Make sure you don't ask where they are since you already have this info right above.)` : ''}

Context:
- User Battery Level: ${req.body.batteryLevel ?? "unknown"}%
- Location: LAT ${locationState.latitude ?? "scanning"}, LON ${locationState.longitude ?? "scanning"}
- Speed: ${speedVal.toFixed(2)} m/s

Speak directly to ${nameToUse} in a warm, comforting, soft-spoken voice. Do not include markdown tags like asterisks (*) for thoughts or physical actions; return only the exact spoken words.
`;

    // Try to call Gemini
    try {
      const ai = getGeminiClient();
      
      // Safe history parsing to avoid parts: [{ text: undefined }] or parts: [{}] or empty parts arrays
      const cleanHistory = history.slice(-6).map((h: any) => {
        let rawText = "";
        if (typeof h.text === "string") {
          rawText = h.text;
        } else if (h.parts && Array.isArray(h.parts) && h.parts.length > 0) {
          rawText = h.parts[0]?.text || "";
        }
        
        let resolvedRole = "user";
        if (h.role === "model" || h.role === "assistant" || h.sender === "pen" || h.sender === "assistant") {
          resolvedRole = "model";
        }
        
        return {
          role: resolvedRole,
          parts: [{ text: rawText.trim() }]
        };
      }).filter((h: any) => {
        return h.parts && h.parts[0] && typeof h.parts[0].text === "string" && h.parts[0].text.trim() !== "";
      });

      const contents = [
        ...cleanHistory,
        { role: "user", parts: [{ text: userMessage }] }
      ];

      // Console logging immediately before call
      console.log("Pen outgoing message:", userMessage);

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.8,
          topP: 0.9,
        }
      });

      const reply = response.text?.trim() || "Everything looks safe.";
      return res.json({ reply, mode: activeMode });

    } catch (apiError: any) {
      console.warn("[Gemini API Error - using polite failover response]:", apiError.message);
      return res.json({ 
        reply: "Pen couldn't reach the network right now.", 
        mode: activeMode,
        fallbackActive: true,
        errorHint: apiError.message 
      });
    }

  } catch (err: any) {
    console.error("[General Request Error]:", err);
    return res.status(500).json({ error: "Server process failure", details: err?.message });
  }
});

// POST /api/gemini/activity-assistant
app.post("/api/gemini/activity-assistant", async (req, res) => {
  try {
    const {
      message,
      history = [],
      recentCheckins = [],
      userName = ""
    } = req.body;

    if (
      message === undefined ||
      message === null ||
      typeof message !== "string" ||
      message.trim() === ""
    ) {
      return res.json({
        reply: "Tell me what you'd like to know about your activity."
      });
    }

    const userMessage = message.trim();
    const nameToUse =
      userName && userName.trim()
        ? userName.trim()
        : "friend";

    // Slice to the latest 20 logs for processing in accordance with design requirements
    const logsToProcess = recentCheckins.slice(0, 20);

    const safeCount = logsToProcess.filter(
      (c: any) =>
        c.type === "arrival" ||
        c.type === "checkin" ||
        c.severity === "safe"
    ).length;

    const journeyCount = logsToProcess.filter(
      (c: any) => c.type === "journey"
    ).length;

    const alertCount = logsToProcess.filter(
      (c: any) =>
        c.type === "alert" ||
        c.type === "sos" ||
        c.severity === "warning" ||
        c.severity === "critical"
    ).length;

    const logsContext = logsToProcess
      .map(
        (c: any) =>
          `[${c.timestamp || 'recent'}] [${(c.severity || 'info').toUpperCase()}] ${c.title || c.type || 'Event'}: ${c.description || c.message || ''}`
      )
      .join("\n");

    const systemInstruction = `
You are Pen, SafePing's protective companion penguin.

Your role is to help ${nameToUse} summarize and understand their recent activity safety timeline.

CRITICAL INSTRUCTIONS:
- You must create a concise summary of today's safety logs under 100 words.
- Be reassuring, protective, clear, and objective.
- Use only the provided activity logs digest below.
- Do not make up, hallucinate, or assume any events not listed in the digest.

Activity Stats (Based on last 20 events):
- Total Events: ${logsToProcess.length}
- Safe Events: ${safeCount}
- Transit Events: ${journeyCount}
- Active Alerts: ${alertCount}

Recent Activity Digest (Latest 20 Events):
${logsContext || "No recent activity events available."}
`;

    try {
      const ai = getGeminiClient();

      const cleanHistory = history
        .slice(-3)
        .map((h: any) => {
          const text =
            typeof h.text === "string"
              ? h.text
              : h.parts?.[0]?.text || "";

          return {
            role:
              h.role === "assistant" ||
              h.role === "model"
                ? "model"
                : "user",
            parts: [{ text }]
          };
        })
        .filter(
          (h: any) =>
            h.parts?.[0]?.text?.trim()
        );

      const contents = [
        ...cleanHistory,
        {
          role: "user",
          parts: [{ text: userMessage }]
        }
      ];

      console.log(
        "[Activity Assistant]",
        userMessage
      );

      const response: any = await Promise.race([
        ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents,
          config: {
            systemInstruction,
            temperature: 0.3
          }
        }),

        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "Activity assistant timeout"
                )
              ),
            8000
          )
        )
      ]);

      const reply =
        response?.text?.trim() ||
        "Everything looks normal from the latest activity.";

      return res.json({ reply });

    } catch (apiError: any) {
      console.warn(
        "[Activity Assistant Error]",
        apiError?.message
      );

      return res.json({
        reply:
          recentCheckins.length > 0
            ? `I found ${recentCheckins.length} activity records. ${safeCount} safe check-ins, ${journeyCount} journeys, and ${alertCount} alerts.`
            : "No activity records have been logged yet."
      });
    }

  } catch (err: any) {
    console.error(
      "[Activity Assistant Request Error]",
      err
    );

    return res.status(500).json({
      error: "Server process failure",
      details: err?.message
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started. Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
