import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface DiaryEntry {
  id?: number;
  content: string;
  summary: string;
  learning: string;
  created_at?: string;
}

export interface UserPreferences {
  [key: string]: string;
}

export const diaryService = {
  async getEntries(): Promise<DiaryEntry[]> {
    const res = await fetch("/api/entries");
    return res.json();
  },

  async saveEntry(entry: DiaryEntry): Promise<{ id: number }> {
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    return res.json();
  },

  async getPreferences(): Promise<UserPreferences> {
    const res = await fetch("/api/preferences");
    return res.json();
  },

  async savePreference(key: string, value: string): Promise<void> {
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  },

  async generateDiary(content: string, preferences: UserPreferences, history: DiaryEntry[]) {
    const model = "gemini-3-flash-preview";
    
    const prefString = Object.entries(preferences)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const historyString = history
      .slice(0, 3)
      .map(h => `Past Entry: ${h.summary}\nLearning: ${h.learning}`)
      .join("\n\n");

    const systemInstruction = `You are a helpful student diary assistant. 
Your goal is to help the user write their daily work summary and learning outcomes.
Style: Student-like, simple English, relatable, slightly informal but organized.
Tone: Encouraging and reflective.

User Preferences:
${prefString}

Context from past entries:
${historyString}

When the user provides their day's content, generate a JSON object with:
1. "summary": A concise summary of what they did today in a student style.
2. "learning": What they learned from these activities.
3. "chatResponse": A friendly message to the user acknowledging their day and maybe asking a follow-up or giving a small piece of advice.

If the user is just chatting or providing personal details/preferences, update your understanding and respond naturally in the "chatResponse" field, leaving "summary" and "learning" empty or as appropriate.

Always return JSON.`;

    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: content }] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            learning: { type: Type.STRING },
            chatResponse: { type: Type.STRING },
            updatedPreferences: { 
              type: Type.OBJECT,
              description: "Any new preferences or personal details learned from this interaction",
              properties: {
                key: { type: Type.STRING },
                value: { type: Type.STRING }
              }
            }
          },
          required: ["chatResponse"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  }
};
