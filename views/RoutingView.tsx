import React, { useState, useMemo } from 'react';
import { Client, Credit, Payment } from '../types';
import { TODAY_STR, countBusinessDays } from '../constants';

interface RoutingProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  selectedRouteId: string;
  credits: Credit[];
  payments: Payment[];
  onGoToCredit: (creditId: string) => void;
}

const RoutingView: React.FC<RoutingProps> = ({ clients, selectedRouteId, credits, payments, onGoToCredit }) => {
  const [targetDate, setTargetDate] = useState(TODAY_STR); 
  const isAllSelected = selectedRouteId === 'all';
  const todayObj = new Date(TODAY_STR + 'T00:00:00');

  const getVisitDetailsForCredit = (credit: Credit, dateStr: string) => {
    // Si el crédito está perdido, no aparece en ruta
    if (credit.status === 'Lost') return { visit: false, reason: '', amount: 0, realAmount: 0, isPaid: false, isPartial: false };

    const checkDate = new Date(dateStr + 'T00:00:00');
    const startDate = new Date(credit.startDate + 'T00:00:00');
    
    // Si la fecha consultada es Domingo y el crédito es diario, no se cobra.
    if (credit.frequency === 'Daily' && checkDate.getDay() === 0) {
       return { visit: false, reason: 'Domingo - No Laboral', amount: 0, realAmount: 0, isPaid: false, isPartial: false };
    }

    // CORRECCIÓN: Permitir que aparezca si la fecha es IGUAL a la de inicio (hoy)
    // Antes era checkDate <= startDate, lo que bloqueaba el día actual
    if (checkDate < startDate) return { visit: false, reason: '', amount: 0, realAmount: 0, isPaid: false, isPartial: false };

    let isInstallmentDay = false;
    let installmentNum = 0;

    if (credit.frequency === 'Daily') {
      isInstallmentDay = true;
      // CORRECCIÓN: Sumar 1 porque countBusinessDays retorna la diferencia de días. 
      // El día de inicio debe ser la cuota #1.
      installmentNum = countBusinessDays(credit.startDate, dateStr) + 1;
    } else if (credit.frequency === 'Weekly') {
      const diffDays = Math.round((checkDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      isInstallmentDay = diffDays % 7 === 0;
      installmentNum = Math.floor(diffDays / 7) + 1; // Base 1
    } else if (credit.frequency === 'Monthly') {
      isInstallmentDay = checkDate.getDate() === startDate.getDate();
      const diffDays = Math.round((checkDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      installmentNum = Math.floor(diffDays / 30) + 1; // Base 1
    }

    // Si ya pasamos el total de cuotas y no debe nada, no mostrar
    if (installmentNum > credit.totalInstallments && !credit.isOverdue) {
        return { visit: false, reason: '', amount: 0, realAmount: 0, isPaid: false, isPartial: false };
    }

    const totalExpectedByDate = Math.min(credit.totalInstallments, installmentNum) * credit.installmentValue;
    const isPaidTotal = credit.totalPaid >= totalExpectedByDate;
    const paymentToday = payments.find(p => p.creditId === credit.id && p.date === dateStr);
    const amountPaidToday = paymentToday ? paymentToday.amount : 0;
    
    // Para ver si es parcial, miramos si lo pagado total cubre lo esperado hasta ayer
    const previousExpected = Math.max(0, totalExpectedByDate - credit.installmentValue);
    const isPartial = !isPaidTotal && (amountPaidToday > 0 || credit.totalPaid > previousExpected);

    const shouldShow = isInstallmentDay || (credit.isOverdue && !isPaidTotal && checkDate >= todayObj);

    if (!shouldShow) return { visit: false, reason: '', amount: 0, realAmount: 0, isPaid: false, isPartial: false };

    let reasonLabel = credit.frequency === 'Daily' ? 'Ciclo Diario' : (credit.frequency === 'Weekly' ? 'Ciclo Semanal' : 'Ciclo Mensual');
    let suggestedAmount = credit.installmentValue;

    if (credit.isOverdue && !isPaidTotal) {
      reasonLabel = 'Mora Pendiente';
      suggestedAmount = Math.max(0, totalExpectedByDate - credit.totalPaid);
    }

    const displayAmount = amountPaidToday > 0 ? amountPaidToday : suggestedAmount;

    return { 
        visit: true, 
        reason: reasonLabel, 
        amount: displayAmount,
        realAmount: amountPaidToday,
        isPaid: isPaidTotal,
        isPartial 
    };
  };

  const visitsForDate = useMemo(() => {
    if (isAllSelected) return [];
    const result: any[] = [];
    
    credits.forEach(credit => {
      const client = clients.find(c => c.id === credit.clientId);
      // Validamos que el cliente exista y esté Activo
      if (!client || client.status === 'Inactive') return;
      
      const details = getVisitDetailsForCredit(credit, targetDate);
      if (details.visit) {
        result.push({
          ...client,
          credit,
          ...details
        });
      }
    });

    // Sort strictly by client.order which is managed in ClientManagement
    return result.sort((a, b) => a.order - b.order);
  }, [clients, credits, payments, selectedRouteId, targetDate]);

  const stats = useMemo(() => {
    const healthyVisits = visitsForDate.filter(v => v.reason !== 'Mora Pendiente');
    const count = visitsForDate.length; 
    const paidCount = visitsForDate.filter(v => v.isPaid).length;
    const totalToCollectToday = healthyVisits.reduce((acc, curr) => acc + curr.amount, 0);
    const alreadyCollected = healthyVisits.filter(v => v.isPaid || v.realAmount > 0).reduce((acc, curr) => acc + curr.realAmount, 0);
    return { total: totalToCollectToday, collected: alreadyCollected, count, paidCount };
  }, [visitsForDate]);

  const quickFilter = (days: number) => {
    const d = new Date(TODAY_STR + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setTargetDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="bg-white p-6 md:p-8 rounded-[2rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="w-full md:flex-1 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Rutero Inteligente</h2>
          <p className="text-slate-500 font-medium text-sm">El orden de visita depende de la configuración de clientes</p>
        </div>

        {!isAllSelected && (
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
             <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1 w-full sm:w-auto">
                <button onClick={() => quickFilter(0)} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${targetDate === TODAY_STR ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Hoy</button>
                <button onClick={() => quickFilter(1)} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${targetDate === new Date(new Date(TODAY_STR + 'T00:00:00').getTime() + 86400000).toISOString().split('T')[0] ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Mañana</button>
             </div>
             <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full sm:w-auto bg-white border border-slate-200 rounded-2xl px-5 py-3 font-black text-slate-700 focus:ring-4 focus:ring-indigo-50 shadow-sm text-sm" />
          </div>
        )}
      </header>

      {!isAllSelected && (
        <div className="bg-slate-900 text-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl relative overflow-hidden animate-slideDown">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
             <div className="flex items-center gap-4 md:gap-6">
                <div className={`w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] flex items-center justify-center shadow-lg backdrop-blur-md ${stats.collected === stats.total && stats.total > 0 ? 'bg-emerald-500 text-white' : 'bg-white/10 text-emerald-400'}`}>
                   {stats.collected >= stats.total && stats.total > 0 ? (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-10 md:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                   ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-10 md:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   )}
                </div>
                <div>
                   <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Meta Pendiente (Sanos)</p>
                   <h3 className="text-2xl md:text-4xl font-black">${Math.max(0, stats.total - stats.collected).toLocaleString()} <span className="text-xs md:text-lg text-slate-500 font-bold">/ ${stats.total.toLocaleString()}</span></h3>
                </div>
             </div>
             <div className="flex flex-col justify-center">
                <div className="flex justify-between items-end mb-2">
                   <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Cumplimiento del día</p>
                   <p className="text-xs md:text-sm font-black text-emerald-400">{stats.total > 0 ? Math.min(100, Math.round((stats.collected / stats.total) * 100)) : 100}%</p>
                </div>
                <div className="h-2 md:h-3 w-full bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500 transition-all duration-1000" style={{width: `${stats.total > 0 ? Math.min(100, (stats.collected / stats.total) * 100) : 100}%`}}></div>
                </div>
             </div>
             <div className="flex items-center justify-between lg:justify-end gap-6 md:gap-10 lg:border-l lg:border-white/10 lg:pl-10">
                <div className="text-left lg:text-right">
                   <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Créditos por Cobrar</p>
                   <p className="text-xl md:text-2xl font-black text-white">{stats.paidCount} <span className="text-[10px] md:text-xs text-slate-500 uppercase">de {stats.count}</span></p>
                </div>
             </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-200 p-4 md:p-8 min-h-[400px]">
        {isAllSelected ? (
          <div className="flex flex-col items-center justify-center text-center py-20">
             <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-6 shadow-inner border border-amber-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
             <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">Seleccionar Ruta</h3>
             <p className="text-slate-400 max-w-xs text-sm font-medium">Por favor elija una zona para gestionar el rutero operativo.</p>
          </div>
        ) : (
          <div className="w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-2">
               <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 md:h-8 bg-indigo-600 rounded-full"></div>
                  <span className="text-indigo-600 font-black text-xl md:text-2xl uppercase tracking-tight">Hoja de Ruta</span>
               </div>
               <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex items-center justify-between md:justify-end gap-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">HOY:</p>
                  <span className="text-slate-700 font-black text-xs md:text-sm">{new Date(targetDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</span>
               </div>
            </div>

            <div className="space-y-4 max-w-5xl mx-auto w-full">
              {visitsForDate.length > 0 ? (
                visitsForDate.map((item, index) => (
                  <div key={item.credit.id} className={`flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 p-5 md:p-6 border rounded-[2rem] md:rounded-[2.5rem] transition-all relative overflow-hidden group ${item.isPaid ? 'bg-emerald-50 border-emerald-200' : (item.isPartial ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100')}`}>
                    <div className="absolute top-0 right-0">
                       {item.isPaid ? (
                          <div className="bg-emerald-500 text-white text-[8px] md:text-[9px] font-black px-4 md:px-6 py-1.5 md:py-2 rounded-bl-2xl md:rounded-bl-3xl uppercase tracking-widest">CUOTA PAGA</div>
                       ) : item.isPartial ? (
                          <div className="bg-orange-500 text-white text-[8px] md:text-[9px] font-black px-4 md:px-6 py-1.5 md:py-2 rounded-bl-2xl md:rounded-bl-3xl uppercase tracking-widest">ABONO</div>
                       ) : item.reason === 'Mora Pendiente' && (
                          <div className="bg-rose-500 text-white text-[8px] md:text-[9px] font-black px-4 md:px-6 py-1.5 md:py-2 rounded-bl-2xl md:rounded-bl-3xl uppercase tracking-widest">MORA</div>
                       )}
                    </div>
                    
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-[1.5rem] shrink-0 flex items-center justify-center font-black text-lg md:text-xl shadow-inner transition-all ${item.isPaid ? 'bg-emerald-500 text-white' : (item.isPartial ? 'bg-orange-100 text-orange-600' : (item.reason === 'Mora Pendiente' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'))}`}>
                          {item.isPaid ? <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : item.order}
                        </div>
                        <div className="flex-1 min-w-0 md:hidden">
                            <h4 className="font-black text-lg text-slate-800 truncate">{item.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{item.alias}</span>
                               <button 
                                onClick={() => onGoToCredit(item.credit.id)}
                                className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-sm"
                               >
                                #{item.credit.id.slice(-6).toUpperCase()}
                               </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 w-full">
                      <div className="hidden md:flex items-center gap-3 mb-1.5">
                        <h4 className="font-black text-xl lg:text-2xl truncate text-slate-800">{item.name}</h4>
                        <span className="px-2 py-0.5 rounded-lg text-[8px] lg:text-[9px] font-black border uppercase tracking-tighter bg-slate-50 border-slate-100 text-slate-400">{item.alias}</span>
                        <button 
                          onClick={() => onGoToCredit(item.credit.id)}
                          className="ml-2 bg-indigo-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-1.5 group/id"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-indigo-200 group-hover/id:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10.172 13.828a4 4 0 015.656 0l4-4a4 4 0 10-5.656-5.656l-1.102 1.101" /></svg>
                          #{item.credit.id.slice(-6).toUpperCase()}
                        </button>
                      </div>
                      <div className="space-y-1.5 md:space-y-0 md:flex md:flex-wrap md:items-center md:gap-4 lg:gap-6">
                         <div className="flex items-center gap-2 text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                            <p className="text-xs font-bold md:truncate md:max-w-[200px] lg:max-w-[300px] leading-tight">{item.address}</p>
                         </div>
                         <div className="pt-1 md:pt-0">
                           <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border shadow-sm ${item.isPaid ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                             {item.reason}
                           </span>
                         </div>
                      </div>
                    </div>

                    <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                       <div className="flex flex-col items-start md:items-end min-w-[100px] md:min-w-[140px]">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5 whitespace-nowrap">{item.realAmount > 0 ? 'Recibido' : 'Cuota Sugerida'}</p>
                          <p className={`text-xl md:text-3xl font-black ${item.isPaid ? 'text-emerald-700' : (item.isPartial ? 'text-orange-600' : (item.reason === 'Mora Pendiente' ? 'text-rose-600' : 'text-slate-800'))}`}>
                            ${item.amount.toLocaleString()}
                          </p>
                       </div>
                    </div>
                  </div>
                )
              )) : (
                <div className="py-24 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                   <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200 shadow-inner">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                   </div>
                   <h4 className="text-xl font-black text-slate-300 uppercase tracking-widest italic">
                     {new Date(targetDate + 'T00:00:00').getDay() === 0 ? 'Domingo - Día No Laboral' : 'Sin Cobros Pendientes'}
                   </h4>
                   <p className="text-xs text-slate-400 mt-2 font-medium">
                     {new Date(targetDate + 'T00:00:00').getDay() === 0 ? 'No se programan visitas de cobro los domingos.' : 'No se encontraron registros de cobro para esta fecha.'}
                   </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoutingView;