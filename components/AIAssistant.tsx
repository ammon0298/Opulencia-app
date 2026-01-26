import React, { useState } from 'react';
import { analyzeRouteFinances } from '../lib/ai';

interface AIAssistantProps {
  metrics: {
    totalInvested: number;
    totalRecoveredCapital: number;
    totalLostCapital: number;
    totalRealizedProfit: number;
    recoveryRate: number;
    overdueAmount: number;
  };
  totalExpenses: number;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ metrics, totalExpenses }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConsult = async () => {
    setLoading(true);
    const stats = {
      totalInvested: Math.round(metrics.totalInvested).toLocaleString(),
      totalRecoveredCapital: Math.round(metrics.totalRecoveredCapital).toLocaleString(),
      totalLostCapital: Math.round(metrics.totalLostCapital).toLocaleString(),
      totalRealizedProfit: Math.round(metrics.totalRealizedProfit).toLocaleString(),
      recoveryRate: metrics.recoveryRate.toFixed(1),
      overdueAmount: Math.round(metrics.overdueAmount).toLocaleString(),
      totalExpenses: totalExpenses.toLocaleString()
    };

    const result = await analyzeRouteFinances(stats);
    setAnalysis(result || "No se pudo generar el análisis.");
    setLoading(false);
  };

  // Simple Markdown parser for basic formatting
  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Headers
      if (line.includes('RESUMEN EJECUTIVO') || line.includes('ANÁLISIS DE RIESGOS') || line.includes('ACCIONES TÁCTICAS')) {
        return <h4 key={i} className="text-indigo-600 dark:text-indigo-400 font-black text-sm uppercase tracking-widest mt-4 mb-2">{line.replace(/\*\*/g, '').replace(/#/g, '')}</h4>;
      }
      // Bold items
      const parts = line.split('**');
      return (
        <p key={i} className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-1">
          {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-slate-800 dark:text-white font-bold">{part}</strong> : part)}
        </p>
      );
    });
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2.5rem] p-1 shadow-2xl relative overflow-hidden group">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-indigo-500/30 transition-all duration-1000"></div>
      
      <div className="bg-white dark:bg-slate-950/90 backdrop-blur-xl rounded-[2.3rem] p-6 md:p-8 h-full flex flex-col relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              {loading ? (
                <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              )}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Asistente Financiero IA</h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Powered by Gemini 3.0</p>
            </div>
          </div>
          
          {!analysis && !loading && (
            <button 
              onClick={handleConsult}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/30 transition-all active:scale-95 animate-pulse"
            >
              Analizar Cartera
            </button>
          )}
        </div>

        <div className="flex-1 min-h-[120px]">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4 py-8">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-150"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-300"></div>
              </div>
              <p className="text-xs font-bold text-slate-400 animate-pulse">Procesando métricas de riesgo...</p>
            </div>
          ) : analysis ? (
            <div className="animate-fadeIn space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {renderContent(analysis)}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <button 
                  onClick={handleConsult} 
                  className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                >
                  Actualizar Análisis
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
              <p className="text-xs font-medium text-slate-400 max-w-xs">
                Solicita un diagnóstico instantáneo sobre la salud de tu cartera, fugas de capital y oportunidades de cobro.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;