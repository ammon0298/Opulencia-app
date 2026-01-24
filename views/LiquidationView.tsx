import React, { useState, useMemo, useEffect } from 'react';
import { Credit, Expense, Payment, Client, Route, RouteTransaction } from '../types';
import { TODAY_STR } from '../constants';

interface LiquidationProps {
  selectedRouteId: string;
  credits: Credit[];
  expenses: Expense[];
  payments: Payment[];
  clients: Client[];
  routes: Route[];
  transactions: RouteTransaction[];
}

const LiquidationView: React.FC<LiquidationProps> = ({ selectedRouteId, credits, expenses, payments, clients, routes, transactions }) => {
  const [dateRange, setDateRange] = useState({ start: TODAY_STR, end: TODAY_STR });

  // 1. Calcular la fecha mínima permitida basada en la creación de la ruta
  const effectiveMinDate = useMemo(() => {
    let minT = '2025-01-01';
    let found = false;

    // Buscar la transacción de tipo INITIAL_BASE de la ruta seleccionada
    const routeTransactions = transactions.filter(t => 
      selectedRouteId === 'all' || t.routeId === selectedRouteId
    );

    if (routeTransactions.length > 0) {
        // Ordenar ascendente para encontrar la primera
        routeTransactions.sort((a,b) => a.date.localeCompare(b.date));
        minT = routeTransactions[0].date;
        found = true;
    } 
    
    // Si no hay transacciones, buscar el primer crédito
    if (!found) {
        const routeCredits = credits.filter(c => {
            const cl = clients.find(cl => cl.id === c.clientId);
            return cl && (selectedRouteId === 'all' || cl.routeId === selectedRouteId);
        });
        if (routeCredits.length > 0) {
            routeCredits.sort((a,b) => a.startDate.localeCompare(b.startDate));
            minT = routeCredits[0].startDate;
        }
    }

    return minT;
  }, [selectedRouteId, transactions, credits, clients]);

  // Efecto para ajustar el rango si cambia la ruta y la fecha actual es menor al mínimo
  useEffect(() => {
    if (dateRange.start < effectiveMinDate) {
        setDateRange(prev => ({ ...prev, start: effectiveMinDate }));
    }
  }, [effectiveMinDate, dateRange.start]);

  const filterByRoute = (itemRouteId: string) => selectedRouteId === 'all' || itemRouteId === selectedRouteId;
  const filterByDateRange = (dateStr: string) => {
    const d = dateStr.split('T')[0];
    return d >= dateRange.start && d <= dateRange.end;
  };
  const filterBeforeStart = (dateStr: string) => {
    const d = dateStr.split('T')[0];
    return d < dateRange.start;
  };

  // 1. Datos DENTRO del rango
  const rangePayments = useMemo(() => 
    payments.filter(p => {
      const credit = credits.find(c => c.id === p.creditId);
      const client = credit ? clients.find(c => c.id === credit.clientId) : null;
      return client && filterByRoute(client.routeId) && filterByDateRange(p.date);
    }), 
  [payments, credits, clients, selectedRouteId, dateRange]);

  const rangeExpenses = useMemo(() => 
    expenses.filter(e => filterByRoute(e.routeId) && filterByDateRange(e.date)), 
  [expenses, selectedRouteId, dateRange]);

  const rangeCredits = useMemo(() => 
    credits.filter(cr => {
      const client = clients.find(c => c.id === cr.clientId);
      return client && filterByRoute(client.routeId) && filterByDateRange(cr.startDate);
    }), 
  [credits, clients, selectedRouteId, dateRange]);

  const rangeTransactions = useMemo(() => 
    transactions.filter(t => filterByRoute(t.routeId) && filterByDateRange(t.date) && t.type !== 'INITIAL_BASE'), 
  [transactions, selectedRouteId, dateRange]);

  // 2. Cálculo Base Histórica Dinámica
  const calculatedStartBase = useMemo(() => {
    let base = 0;
    
    // Sumar TODO lo anterior a la fecha de inicio seleccionada
    transactions.forEach(t => {
      // Si la transacción es la INITIAL_BASE, se suma si su fecha es <= start (incluso si es el mismo día, es la base)
      // Pero si es INJECTION/WITHDRAWAL, solo si es estrictamente anterior
      if (filterByRoute(t.routeId)) {
          const isInitialAndValid = t.type === 'INITIAL_BASE' && t.date <= dateRange.start;
          const isOtherAndPrior = t.type !== 'INITIAL_BASE' && t.date < dateRange.start;

          if (isInitialAndValid || isOtherAndPrior) {
             if (t.type === 'INITIAL_BASE' || t.type === 'INJECTION') base += t.amount;
             if (t.type === 'WITHDRAWAL') base -= t.amount;
          }
      }
    });

    payments.forEach(p => {
        const credit = credits.find(c => c.id === p.creditId);
        const client = credit ? clients.find(c => c.id === credit.clientId) : null;
        if (client && filterByRoute(client.routeId) && filterBeforeStart(p.date)) base += p.amount;
    });

    expenses.forEach(e => {
        if (filterByRoute(e.routeId) && filterBeforeStart(e.date)) base -= e.value;
    });

    credits.forEach(cr => {
        const client = clients.find(c => c.id === cr.clientId);
        if (client && filterByRoute(client.routeId) && filterBeforeStart(cr.startDate)) base -= cr.capital;
    });

    return base;
  }, [transactions, payments, expenses, credits, clients, selectedRouteId, dateRange.start]);

  const totalCollected = rangePayments.reduce((acc, p) => acc + p.amount, 0);
  const totalExpensesValue = rangeExpenses.reduce((acc, curr) => acc + curr.value, 0);
  const totalNewLoans = rangeCredits.reduce((acc, cr) => acc + cr.capital, 0);
  const totalInjections = rangeTransactions.filter(t => t.type === 'INJECTION').reduce((acc, t) => acc + t.amount, 0);
  const totalWithdrawals = rangeTransactions.filter(t => t.type === 'WITHDRAWAL').reduce((acc, t) => acc + t.amount, 0);

  const realDelivery = (calculatedStartBase + totalCollected + totalInjections) - (totalExpensesValue + totalNewLoans + totalWithdrawals);

  const currentRouteName = selectedRouteId === 'all' 
    ? 'Todas las Rutas' 
    : routes.find(r => r.id === selectedRouteId)?.name || 'Ruta Seleccionada';

  return (
    <div className="space-y-12 animate-fadeIn pb-20">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Cierre de Caja</h2>
          <div className="flex items-center gap-2 mt-1">
             <p className="text-slate-500 font-medium italic">Historial operativo: </p>
             <span className="bg-indigo-50 text-indigo-700 px-3 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100">
               {currentRouteName}
             </span>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
          <div className="flex items-center gap-2 w-full md:w-auto">
             <div className="w-full">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Desde</label>
                <input 
                  type="date" 
                  min={effectiveMinDate} // Bloqueo de fechas anteriores
                  max={TODAY_STR} 
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                />
             </div>
             <div className="pt-5 text-slate-300"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg></div>
             <div className="w-full">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Hasta</label>
                <input 
                  type="date" min={dateRange.start} max={TODAY_STR} value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                />
             </div>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Concepto Contable</th>
              <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Calculado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            <Row label="FONDO ACUMULADO (AL INICIO DEL PERIODO)" value={calculatedStartBase} highlight="text-indigo-600" />
            <Row label="TOTAL RECAUDOS (ENTRADAS)" value={totalCollected} highlight="text-emerald-600" />
            <Row label="INYECCIONES DE CAPITAL (ENTRADAS)" value={totalInjections} highlight="text-emerald-600" />
            <Row label="TOTAL GASTOS OPERATIVOS (SALIDAS)" value={-totalExpensesValue} highlight="text-rose-600" isDeductible />
            <Row label="CAPITAL COLOCADO / PRÉSTAMOS (SALIDAS)" value={-totalNewLoans} highlight="text-rose-600" isDeductible />
            <Row label="RETIROS DE GANANCIAS (SALIDAS)" value={-totalWithdrawals} highlight="text-rose-600" isDeductible />
            
            <tr className="bg-slate-900 text-white">
              <td className="px-8 py-10">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2">Resultado Matemático</p>
                <p className="text-2xl font-black">EFECTIVO TOTAL EN CAJA (AL CIERRE)</p>
              </td>
              <td className="px-8 py-10 text-right">
                <p className={`text-4xl md:text-5xl font-black ${realDelivery >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${realDelivery.toLocaleString()}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="space-y-6">
           <div className="flex items-center gap-3 px-4">
              <div className="w-2 h-6 bg-rose-500 rounded-full"></div>
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.25em]">Salidas: Gastos & Retiros</h3>
           </div>
           <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                 <thead className="bg-slate-100 text-slate-500">
                    <tr>
                       <th className="px-6 py-4 uppercase font-black tracking-widest">Concepto</th>
                       <th className="px-6 py-4 uppercase font-black tracking-widest text-right">Valor</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {rangeExpenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                           <p className="font-bold text-slate-700">{exp.name}</p>
                           <p className="text-[9px] text-slate-400 uppercase">{exp.date}</p>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-rose-600">-${exp.value.toLocaleString()}</td>
                      </tr>
                    ))}
                    {rangeTransactions.filter(t => t.type === 'WITHDRAWAL').map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50 bg-rose-50/30">
                        <td className="px-6 py-4">
                           <p className="font-bold text-rose-800">{tx.description}</p>
                           <p className="text-[9px] text-rose-400 uppercase">{tx.date}</p>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-rose-600">-${tx.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </section>

        <section className="space-y-6">
           <div className="flex items-center gap-3 px-4">
              <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.25em]">Entradas: Recaudos & Inyecciones</h3>
           </div>
           <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                 <thead className="bg-slate-100 text-slate-500">
                    <tr>
                       <th className="px-6 py-4 uppercase font-black tracking-widest">Origen</th>
                       <th className="px-6 py-4 uppercase font-black tracking-widest text-right">Valor</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {rangePayments.map(pay => {
                        const cr = credits.find(c => c.id === pay.creditId);
                        const cl = cr ? clients.find(c => c.id === cr.clientId) : null;
                        return (
                            <tr key={pay.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4">
                                <p className="font-bold text-slate-700">{cl?.name || 'Cliente'}</p>
                                <p className="text-[9px] text-slate-400 uppercase">{pay.date} • CR#{pay.creditId.slice(-4)}</p>
                                </td>
                                <td className="px-6 py-4 text-right font-black text-emerald-600">+${pay.amount.toLocaleString()}</td>
                            </tr>
                        )
                    })}
                    {rangeTransactions.filter(t => t.type === 'INJECTION').map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50 bg-emerald-50/30">
                        <td className="px-6 py-4">
                           <p className="font-bold text-emerald-800">{tx.description}</p>
                           <p className="text-[9px] text-emerald-500 uppercase">{tx.date}</p>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-emerald-600">+${tx.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </section>
      </div>

      <section className="space-y-6">
           <div className="flex items-center gap-3 px-4">
              <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.25em]">Nuevos Préstamos</h3>
           </div>
           <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                 <thead className="bg-slate-900 text-white">
                    <tr>
                       <th className="px-8 py-5 uppercase font-black tracking-widest">Cliente</th>
                       <th className="px-8 py-5 uppercase font-black tracking-widest text-right">Capital</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {rangeCredits.map(cr => {
                      const client = clients.find(c => c.id === cr.clientId);
                      return (
                        <tr key={cr.id} className="hover:bg-slate-50">
                          <td className="px-8 py-5">
                             <p className="font-black text-slate-700 uppercase">{client?.name || '---'}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase">ID: #{cr.id.slice(-6)}</p>
                          </td>
                          <td className="px-8 py-5 text-right font-black text-rose-600 text-base">
                             -${cr.capital.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                 </tbody>
              </table>
           </div>
      </section>
    </div>
  );
};

const Row = ({ label, value, highlight = 'text-slate-800', isDeductible = false }: any) => (
  <tr className="hover:bg-slate-50/50 transition-colors">
    <td className="px-8 py-5 text-xs md:text-sm font-black text-slate-600 uppercase tracking-tight">{label}</td>
    <td className={`px-8 py-5 text-lg md:text-xl font-black text-right ${highlight}`}>
      {isDeductible ? `- $${Math.abs(value).toLocaleString()}` : `$${value.toLocaleString()}`}
    </td>
  </tr>
);

export default LiquidationView;