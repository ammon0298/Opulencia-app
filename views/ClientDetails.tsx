
import React, { useMemo, useState } from 'react';
import { Client, Credit, Payment } from '../types';
import { TODAY_STR, addBusinessDays } from '../constants';

interface ClientDetailsProps {
  client?: Client;
  credit?: Credit;
  payments: Payment[];
  onBack: () => void;
  onMarkAsLost: (creditId: string) => void;
}

const ClientDetails: React.FC<ClientDetailsProps> = ({ client, credit, payments, onBack, onMarkAsLost }) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  if (!client || !credit) return null;

  // CORRECCIÓN 3: Recalcular Total Pagado basado en pagos reales (para actualización inmediata)
  const realTotalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  
  const currentBalance = Math.max(0, credit.totalToPay - realTotalPaid);
  const instVal = Math.max(1, credit.installmentValue);
  const pendingInstallments = Math.max(0, credit.totalInstallments - credit.paidInstallments);
  
  const todayStr = TODAY_STR; 
  const todayDateObj = new Date(todayStr + 'T00:00:00');

  const capitalRatio = credit.capital / credit.totalToPay;
  const interestRatio = (credit.totalToPay - credit.capital) / credit.totalToPay;
  const capitalLoss = currentBalance * capitalRatio;

  const freqMap: Record<string, string> = {
    'Daily': 'DIARIO',
    'Weekly': 'SEMANAL',
    'Monthly': 'MENSUAL'
  };
  const freqLabel = freqMap[credit.frequency] || credit.frequency;

  const history = useMemo(() => {
    const sortedPayments = [...payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const totalPaymentsAmount = sortedPayments.reduce((sum, p) => sum + p.amount, 0);

    return Array.from({ length: credit.totalInstallments }, (_, i) => {
      let scheduledDateObj: Date;
      // Usar firstPaymentDate como ancla para la primera cuota (índice 0)
      const baseAnchor = credit.firstPaymentDate || credit.startDate;
      
      if (credit.frequency === 'Daily') {
        scheduledDateObj = i === 0 ? new Date(baseAnchor + 'T00:00:00') : addBusinessDays(baseAnchor, i);
      } else if (credit.frequency === 'Weekly') {
        scheduledDateObj = new Date(baseAnchor + 'T00:00:00');
        scheduledDateObj.setDate(scheduledDateObj.getDate() + (i * 7));
      } else {
        scheduledDateObj = new Date(baseAnchor + 'T00:00:00');
        scheduledDateObj.setMonth(scheduledDateObj.getMonth() + i);
      }
      
      const scheduledDateStr = scheduledDateObj.toISOString().split('T')[0];
      const startRange = i * instVal;
      const endRange = (i + 1) * instVal;
      const intersectionEnd = Math.min(totalPaymentsAmount, endRange);
      const intersectionStart = Math.max(0, startRange);
      const amountCoveredInThisRow = Math.max(0, intersectionEnd - intersectionStart);
      const isFullyPaid = amountCoveredInThisRow >= (instVal - 0.01);
      const isPartiallyPaid = !isFullyPaid && amountCoveredInThisRow > 0;

      let effectivePaymentDateStr: string | null = null;
      let runningSum = 0;
      if (isFullyPaid) {
        for (const p of sortedPayments) {
           runningSum += p.amount;
           if (runningSum >= endRange - 0.01) {
              effectivePaymentDateStr = p.date.split('T')[0];
              break; 
           }
        }
      }

      const isPastDue = scheduledDateStr < todayStr;
      let moraStatus: 'NONE' | 'VIGENTE' | 'RECUPERADO' | 'PUNTUAL' = 'NONE';
      let daysDelayed = 0;

      if (isFullyPaid) {
          if (effectivePaymentDateStr && effectivePaymentDateStr > scheduledDateStr) {
             moraStatus = 'RECUPERADO';
             const payDate = new Date(effectivePaymentDateStr + 'T00:00:00');
             const diffTime = Math.abs(payDate.getTime() - scheduledDateObj.getTime());
             daysDelayed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          } else {
             moraStatus = 'PUNTUAL';
          }
      } else if (isPastDue) {
          moraStatus = 'VIGENTE';
          const diffTime = Math.abs(todayDateObj.getTime() - scheduledDateObj.getTime());
          daysDelayed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        num: i + 1,
        date: scheduledDateStr,
        realPaymentDate: effectivePaymentDateStr || (isPartiallyPaid ? 'Parcial' : '//'),
        amountCovered: amountCoveredInThisRow,
        status: isFullyPaid ? 'P' : (isPartiallyPaid ? 'A' : 'N'),
        moraStatus,
        daysDelayed,
        isTodayRow: scheduledDateStr === todayStr
      };
    });
  }, [credit, payments, instVal, todayStr, todayDateObj]);

  return (
    <>
      <div className="space-y-8 animate-fadeIn pb-24 px-2 md:px-4 max-w-full overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm hover:shadow-md active:scale-90 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div className="min-w-0">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none truncate">Resumen de Cuenta</h2>
              <div className="flex items-center gap-2 mt-2">
                 <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter shrink-0 text-white ${credit.status === 'Lost' ? 'bg-rose-600' : 'bg-indigo-600'}`}>
                   ID: {credit.id.toUpperCase()} {credit.status === 'Lost' && '(CASTIGADO)'}
                 </span>
                 <p className="text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-widest truncate">{client.name} - <span className="text-indigo-400 dark:text-indigo-300">{client.alias}</span></p>
              </div>
            </div>
          </div>
          <div className={`px-6 py-3 rounded-full border flex items-center gap-3 shadow-sm self-start md:self-center ${credit.status === 'Lost' ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900'}`}>
             <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${credit.status === 'Lost' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
             <span className={`text-[10px] font-black uppercase tracking-widest ${credit.status === 'Lost' ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
               {credit.status === 'Lost' ? 'CARTERA CASTIGADA' : 'AUDITORÍA FINANCIERA ACTIVA'}
             </span>
          </div>
        </header>

        <div className={`rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden border shadow-2xl ${credit.status === 'Lost' ? 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-900' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
          <div className="py-10 md:py-12 text-center relative">
            
            {/* TARJETA DE FRECUENCIA DE PAGO (SOLICITADA) */}
            <div className="absolute top-4 right-4 md:top-8 md:right-12">
                <div className={`px-5 py-2.5 rounded-2xl border shadow-sm backdrop-blur-md flex flex-col items-center justify-center ${credit.status === 'Lost' ? 'bg-white/50 border-rose-200' : 'bg-slate-50/80 dark:bg-slate-800/80 border-slate-100 dark:border-slate-700'}`}>
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] mb-0.5">MODALIDAD</span>
                    <span className={`text-xs md:text-sm font-black uppercase tracking-widest ${credit.status === 'Lost' ? 'text-rose-600' : 'text-indigo-600 dark:text-indigo-400'}`}>
                        {freqLabel}
                    </span>
                </div>
            </div>

            <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.5em] text-indigo-400 mb-2">CAPITAL TOTAL RECAUDADO</p>
            {/* CORRECCIÓN 3: Reducción de tamaño de fuente para evitar desbordamiento */}
            <p className="text-5xl md:text-7xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter leading-none">${realTotalPaid.toLocaleString()}</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <InfoBox label="CAPITAL INICIAL" value={`$${credit.capital.toLocaleString()}`} label2="CUOTAS TOTALES" value2={credit.totalInstallments} highlight="dark:text-white" highlight2="dark:text-white" />
            <InfoBox label="INTERÉS PACTADO" value={`$${(credit.totalToPay - credit.capital).toLocaleString()}`} highlight="text-indigo-400" label2="VALOR CUOTA" value2={`$${credit.installmentValue.toLocaleString()}`} highlight2="dark:text-white" />
            <InfoBox label="ENTREGA CAPITAL" value={credit.startDate.replace(/-/g, '/')} label2="SALDO PENDIENTE" value2={`$${currentBalance.toLocaleString()}`} highlight="dark:text-white" highlight2="text-emerald-500" />
            <InfoBox label="COBRO INICIA" value={credit.firstPaymentDate?.replace(/-/g, '/') || '--'} label2="POR COBRAR" value2={pendingInstallments} highlight="dark:text-white" highlight2="text-rose-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden animate-fadeIn w-full">
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse min-w-[900px]">
              <thead className="bg-slate-900 dark:bg-black text-white">
                <tr className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] md:tracking-[0.25em]">
                  <th className="px-6 py-6 text-left">Fecha Pactada</th>
                  <th className="px-6 py-6 text-center">Fecha Real Pago</th>
                  <th className="px-6 py-6 text-center">Cuota #</th>
                  <th className="px-6 py-6 text-center">Estado Pago</th>
                  <th className="px-6 py-6 text-center">Abonado</th>
                  <th className="px-6 py-6 text-center text-rose-300">¿Registró Mora?</th>
                  <th className="px-6 py-6 text-center">Días Retraso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800 font-mono text-[10px] md:text-[11px]">
                {history.map((row, idx) => (
                  <tr key={idx} className={`${row.isTodayRow ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50'} transition-colors`}>
                    <td className="px-6 py-5 text-slate-800 dark:text-slate-200 font-bold whitespace-nowrap">{row.date.replace(/-/g, '/')}</td>
                    <td className="px-6 py-5 text-center text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap">
                      {row.realPaymentDate !== '//' && row.realPaymentDate !== 'Parcial' 
                        ? row.realPaymentDate.replace(/-/g, '/') 
                        : <span className="text-slate-300 dark:text-slate-600">{row.realPaymentDate}</span>
                      }
                    </td>
                    <td className="px-6 py-5 text-center font-bold text-slate-400 dark:text-slate-500">#{row.num}</td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-sm ${
                        row.status === 'P' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : (row.status === 'A' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500')
                      }`}>
                        {row.status === 'P' ? 'PAGADA' : (row.status === 'A' ? 'PARCIAL' : 'PENDIENTE')}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center font-black text-slate-700 dark:text-slate-200">
                      ${Math.round(row.amountCovered).toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-center">
                      {row.moraStatus === 'VIGENTE' && (
                         <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-black tracking-tighter shadow-sm border border-rose-200 dark:border-rose-800">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></div> SÍ (VIGENTE)
                         </span>
                      )}
                      {row.moraStatus === 'RECUPERADO' && (
                         <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-black tracking-tighter shadow-sm border border-amber-200 dark:border-amber-800">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-600"></div> SÍ (RECUPERADO)
                         </span>
                      )}
                      {row.moraStatus === 'PUNTUAL' && (
                         <span className="text-emerald-500 font-bold opacity-60 tracking-widest">NO (PUNTUAL)</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                      {row.daysDelayed > 0 ? (
                         <span className={`font-black ${row.moraStatus === 'VIGENTE' ? 'text-rose-500' : 'text-amber-500'}`}>
                           {row.daysDelayed} días
                         </span>
                      ) : (
                         <span className="text-slate-200 dark:text-slate-700">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {credit.status === 'Active' && (
            <div className="mt-12 bg-rose-50 dark:bg-rose-900/10 border-2 border-rose-100 dark:border-rose-900 rounded-[2.5rem] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
                <div className="max-w-xl">
                    <h3 className="text-xl font-black text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-2 justify-center md:justify-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      ZONA DE RIESGO FINANCIERO
                    </h3>
                    <p className="text-rose-600/80 dark:text-rose-400/70 font-bold text-xs leading-relaxed">
                        Si el cliente no ha respondido a los cobros y considera que el dinero es irrecuperable, puede castigar esta cartera. Esta acción es definitiva y se registrará como pérdida contable.
                    </p>
                </div>
                <button 
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className="bg-rose-600 text-white font-black px-8 py-4 rounded-2xl shadow-lg hover:bg-rose-700 transition active:scale-95 uppercase tracking-widest text-xs border-b-4 border-rose-800 whitespace-nowrap"
                >
                    DECLARAR INCOBRABLE
                </button>
            </div>
        )}
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 w-full h-full flex items-center justify-center p-4 z-[999999] animate-fadeIn overflow-hidden">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl" onClick={() => setShowConfirmModal(false)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-[0_0_100px_rgba(225,29,72,0.3)] border border-white dark:border-slate-800 animate-slideUp overflow-hidden relative z-10">
             <header className="bg-rose-600 p-8 text-center relative shrink-0">
               <button onClick={() => setShowConfirmModal(false)} className="absolute right-6 top-6 text-rose-300 hover:text-white transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
               <h3 className="text-2xl font-black text-white tracking-tight">Confirmar Alerta de Pérdida</h3>
               <p className="text-rose-100 font-bold uppercase tracking-widest text-[10px] mt-1">{client.name}</p>
             </header>

             <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                   <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed">
                     ¿Está seguro en declarar incobrable este crédito? <br/>
                     <span className="text-rose-600 dark:text-rose-500 font-black">Esta acción es irreversible</span>.
                   </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                   <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pérdida en Capital</span>
                      <span className="text-lg font-black text-rose-600 dark:text-rose-400">-${Math.round(capitalLoss).toLocaleString()}</span>
                   </div>
                   <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl border-2 border-rose-200 dark:border-rose-800 flex justify-between items-center">
                      <span className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">Total Castigado</span>
                      <span className="text-xl font-black text-rose-700 dark:text-rose-400">${currentBalance.toLocaleString()}</span>
                   </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                   <button onClick={() => onMarkAsLost(credit.id)} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-5 rounded-[2rem] shadow-xl transition transform active:scale-95 uppercase tracking-[0.2em] text-xs border-b-4 border-rose-900">Sí, Confirmar Pérdida</button>
                   <button onClick={() => setShowConfirmModal(false)} className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-300 font-black py-4 rounded-2xl transition uppercase tracking-widest text-[9px] border border-slate-200 dark:border-slate-700">No, Cancelar Proceso</button>
                </div>
             </div>
          </div>
        </div>
      )}
    </>
  );
};

const InfoBox = ({ label, value, highlight = 'text-slate-800', label2, value2, highlight2 = 'text-slate-800' }: any) => (
  <div className="p-6 md:p-12 flex flex-col gap-6 md:gap-12 text-center transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
    <div className="space-y-1 md:space-y-2">
      <p className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] md:tracking-[0.25em]">{label}</p>
      {/* CORRECCIÓN 3: Reducción de tamaños en InfoBox */}
      <p className={`text-2xl md:text-3xl font-black ${highlight} tracking-tighter leading-none`}>{value}</p>
    </div>
    <div className="space-y-1 md:space-y-2">
      <p className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.1em] md:tracking-[0.25em]">{label2}</p>
      <p className={`text-2xl md:text-3xl font-black ${highlight2} tracking-tighter leading-none`}>{value2}</p>
    </div>
  </div>
);

export default ClientDetails;
