import { GoogleGenAI } from "@google/genai";
import { PingStats } from '../types';

let genAI: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const analyzeNetworkQuality = async (stats: PingStats, serverName: string): Promise<string> => {
  if (!genAI) {
    return "مفتاح API غير متوفر. يرجى التحقق من الإعدادات.";
  }

  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      Act as a network engineer. Analyze the following ping statistics for a connection to server "${serverName}".
      Provide a concise summary in Arabic (اللغة العربية) about the connection quality suitable for:
      1. Online Gaming
      2. Video Streaming
      3. Web Browsing

      Stats:
      - Average Ping: ${stats.avg} ms
      - Jitter: ${stats.jitter} ms
      - Packet Loss: ${stats.packetLoss.toFixed(1)}%
      - Min/Max: ${stats.min}/${stats.max} ms

      Keep the response short (under 100 words), helpful, and direct. Use emojis.
    `;

    const response = await genAI.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "لم يتمكن الذكاء الاصطناعي من تحليل البيانات.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "حدث خطأ أثناء محاولة تحليل الشبكة.";
  }
};
