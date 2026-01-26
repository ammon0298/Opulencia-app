import { GoogleGenAI } from "@google/genai";

// Analyze route finances using Gemini AI
export const analyzeRouteFinances = async (stats: any) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analiza los siguientes datos financieros de una operación de cobro "gota a gota" o microcrédito y genera un reporte estratégico conciso.
      
      DATOS OPERATIVOS:
      - Capital Total en la Calle (Riesgo): $${stats.totalInvested}
      - Capital Ya Recuperado: $${stats.totalRecoveredCapital}
      - Capital Declarado Perdido (Castigado): $${stats.totalLostCapital}
      - Ganancia/Utilidad Realizada: $${stats.totalRealizedProfit}
      - Porcentaje de Recuperación Global: ${stats.recoveryRate}%
      - Cartera en Mora (Vencida): $${stats.overdueAmount}
      - Gastos Operativos Totales: $${stats.totalExpenses}

      FORMATO DE RESPUESTA REQUERIDO (Usa Markdown para negritas y listas):
      
      1. 📊 RESUMEN EJECUTIVO: Breve diagnóstico de la salud financiera (1 párrafo).
      2. ⚠️ ANÁLISIS DE RIESGOS: Identifica 2 puntos críticos basados en la mora y el capital perdido.
      3. 💡 ACCIONES TÁCTICAS: 3 recomendaciones concretas y numéricas para mejorar la rentabilidad o recuperación esta semana.

      TONO: Consultor financiero experto, directo, sin saludos innecesarios.`,
      config: {
        systemInstruction: "Eres un estratega financiero especializado en microfinanzas de alto riesgo y optimización de flujo de caja."
      }
    });
    
    return response.text;
  } catch (error) {
    console.error("AI Analytics Error:", error);
    return "⚠️ El servicio de Inteligencia Artificial no está disponible momentáneamente. Por favor intente más tarde.";
  }
};