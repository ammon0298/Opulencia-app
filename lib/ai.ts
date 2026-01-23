
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeRouteFinances = async (stats: any) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Realiza un análisis de riesgo para una operación de microcréditos con estos datos:
      - Capital invertido actual: ${stats.totalInvested}
      - Capital perdido (castigado): ${stats.totalLostCapital}
      - Rentabilidad: ${stats.profitRate}%
      - Gastos: ${stats.totalExpenses}
      Dame un resumen ejecutivo de 3 puntos sobre la salud de la cartera y una recomendación táctica. Responde en español.`,
      config: {
        systemInstruction: "Eres un analista de riesgos senior con 20 años de experiencia en banca de consumo."
      }
    });
    return response.text;
  } catch (error) {
    console.error("AI Analytics Error:", error);
    return "El analista de IA no está disponible en este momento. Revise su conexión o API KEY.";
  }
};
