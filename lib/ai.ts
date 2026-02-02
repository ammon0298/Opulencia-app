import { GoogleGenAI } from "@google/genai";
import { Client, Credit, Payment } from "../types";

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

// Analyze specific client behavior
export const analyzeClientBehavior = async (client: Client, credits: Credit[], payments: Payment[]) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Preparar resumen de datos para el prompt
    const clientCredits = credits.filter(c => c.clientId === client.id);
    const creditHistory = clientCredits.map(c => {
        const creditPayments = payments.filter(p => p.creditId === c.id);
        const totalPaid = creditPayments.reduce((sum, p) => sum + p.amount, 0);
        const pending = c.totalToPay - totalPaid;
        // Calcular promedio de días entre pagos (simple)
        const paymentDates = creditPayments.map(p => new Date(p.date).getTime()).sort();
        let avgGapDays = 0;
        if (paymentDates.length > 1) {
            let totalGap = 0;
            for(let i = 1; i < paymentDates.length; i++) totalGap += (paymentDates[i] - paymentDates[i-1]);
            avgGapDays = (totalGap / (paymentDates.length - 1)) / (1000 * 60 * 60 * 24);
        }

        return `
          - Crédito ID: ${c.id} (${c.status})
          - Fecha Inicio: ${c.startDate}
          - Frecuencia: ${c.frequency}
          - Total Pactado: $${c.totalToPay}
          - Total Pagado: $${totalPaid}
          - Saldo Pendiente: $${pending}
          - En Mora Actualmente: ${c.isOverdue ? 'SÍ' : 'NO'}
          - Número de Pagos Realizados: ${creditPayments.length}
          - Promedio días entre pagos: ${avgGapDays.toFixed(1)} días
        `;
    }).join('\n');

    const prompt = `Analiza el perfil crediticio del siguiente cliente en un sistema de préstamos.
    
    CLIENTE: ${client.name} (Alias: ${client.alias})
    
    HISTORIAL DE CRÉDITOS:
    ${creditHistory || "No tiene créditos registrados actualmente."}

    OBJETIVO: Generar un reporte de riesgo y confianza.

    FORMATO DE RESPUESTA REQUERIDO (Usa Markdown):

    1. 🛡️ SCORE CREDITICIO: [CALCULAR UN NÚMERO DEL 0 al 100]%
       (Criterios: 100% es perfecto/puntual. Baja puntos por mora actual, pagos irregulares o saldo pendiente alto. Si no tiene historial, asigna un score base de confianza conservador ej: 50-60%).
    
    2. 📜 RESUMEN DE COMPORTAMIENTO:
       Un párrafo detallando sus hábitos de pago, si suele retrasarse, si paga completo o parcial.

    3. 💳 ANÁLISIS CRÉDITO A CRÉDITO (Si tiene):
       Lista cada crédito activo con un semáforo (🟢 🟡 🔴) y una "Acción Recomendada" específica para ese crédito (ej: "Ofrecer refinanciación", "Exigir pago inmediato", "Felicitar por puntualidad").

    4. 💡 VEREDICTO FINAL Y CONSEJOS:
       ¿Es seguro prestarle más? ¿Qué monto máximo sugerirías? Tips para gestionar a este cliente específico.

    TONO: Analista de riesgos, objetivo y estratégico.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "Eres un experto analista de riesgo crediticio para microfinanzas."
      }
    });

    return response.text;

  } catch (error) {
    console.error("AI Client Analytics Error:", error);
    return "⚠️ No se pudo generar el análisis del cliente. Verifique su conexión.";
  }
};