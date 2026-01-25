import React, { useState, useMemo, useEffect } from 'react';
import { Credit, Expense, Payment, Client, Route, RouteTransaction } from '../types';
import { TODAY_STR } from '../constants';
import { useGlobal } from '../contexts/GlobalContext';

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
  const { t } = useGlobal();

  const effectiveMinDate = useMemo(() => {
    let minT = '2025-01-01';
    let found = false;

    const routeTransactions = transactions.filter(t => 
      selectedRouteId === 'all' || t.routeId === selectedRouteId
    );

    if (routeTransactions.length > 0) {
        routeTransactions.sort((a,b) => a.date.localeCompare(b.date));
        minT = routeTransactions[0].date;
        found = true;
    } 
    
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

  const calculatedStartBase = useMemo(() => {
    let base = 0;
    
    transactions.forEach(t => {
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
          <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">{t('cash_closing')}</h2>
          <div className="flex items-center gap-2 mt-1">
             <p className="text-slate-500 dark:text-slate-400 font-medium italic">{t('history_op')}: </p>
             <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-3 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
               {currentRouteName}
             </span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-6">
          <div className="flex items-center gap-2 w-full md:w-auto">
             <div className="w-full">
                <input 
                  type="date" 
                  min={effectiveMinDate} 
                  max={TODAY_STR} 
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-white text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                />
             </div>
             <div className="pt-0 text-slate-300"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg></div>
             <div className="w-full">
                <input 
                  type="date" min={dateRange.start} max={TODAY_STR} value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-white text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                />
             </div>
          </div>
        </div>
      </header>

      {/* Tabla resumen responsive */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-fadeIn">
        <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[350px]">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <tr>
                <th className="px-4 md:px-8 py-4 md:py-6 text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('accounting_concept')}</th>
                <th className="px-4 md:px-8 py-4 md:py-6 text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">{t('value')}</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                <Row label={t('initial_base')} value={calculatedStartBase} highlight="text-indigo-600 dark:text-indigo-400" />
                <Row label={t('total_collected')} value={totalCollected} highlight="text-emerald-600 dark:text-emerald-400" />
                <Row label={t('capital_injections')} value={totalInjections} highlight="text-emerald-600 dark:text-emerald-400" />
                <Row label={t('operational_expenses')} value={-totalExpensesValue} highlight="text-rose-600 dark:text-rose-400" isDeductible />
                <Row label={t('new_loans')} value={-totalNewLoans} highlight="text-rose-600 dark:text-rose-400" isDeductible />
                <Row label={t('profit_withdrawals')} value={-totalWithdrawals} highlight="text-rose-600 dark:text-rose-400" isDeductible />
                
                <tr className="bg-slate-900 dark:bg-black text-white">
                <td className="px-4 md:px-8 py-6 md:py-10">
                    <p className="text-xl md:text-2xl font-black">{t('cash_on_hand').toUpperCase()}</p>
                </td>
                <td className="px-4 md:px-8 py-6 md:py-10 text-right">
                    <p className={`text-3xl md:text-5xl font-black ${realDelivery >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${realDelivery.toLocaleString()}
                    </p>
                </td>
                </tr>
            </tbody>
            </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="space-y-6">
           <div className="flex items-center gap-3 px-4">
              <div className="w-2 h-6 bg-rose-500 rounded-full"></div>
              <h3 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em]">{t('outputs')}</h3>
           </div>
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[300px]">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        <tr>
                        <th className="px-4 md:px-6 py-3 md:py-4 uppercase font-black tracking-widest">{t('expense_concept')}</th>
                        <th className="px-4 md:px-6 py-3 md:py-4 uppercase font-black tracking-widest text-right">{t('value')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {rangeExpenses.map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                            <td className="px-4 md:px-6 py-3 md:py-4 whitespace-normal">
                            <p className="font-bold text-slate-700 dark:text-slate-200">{exp.name}</p>
                            <p className="text-[9px] text-slate-400 uppercase">{exp.date}</p>
                            </td>
                            <td className="px-4 md:px-6 py-3 md:py-4 text-right font-black text-rose-600 dark:text-rose-400">-${exp.value.toLocaleString()}</td>
                        </tr>
                        ))}
                        {rangeTransactions.filter(t => t.type === 'WITHDRAWAL').map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 bg-rose-50/30 dark:bg-rose-900/10">
                            <td className="px-4 md:px-6 py-3 md:py-4 whitespace-normal">
                            <p className="font-bold text-rose-800 dark:text-rose-300">{tx.description}</p>
                            <p className="text-[9px] text-rose-400 uppercase">{tx.date}</p>
                            </td>
                            <td className="px-4 md:px-6 py-3 md:py-4 text-right font-black text-rose-600 dark:text-rose-400">-${tx.amount.toLocaleString()}</td>
                        </tr>
                        ))}
                    </tbody>
                  </table>
              </div>
           </div>
        </section>

        <section className="space-y-6">
           <div className="flex items-center gap-3 px-4">
              <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
              <h3 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em]">{t('inputs')}</h3>
           </div>
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[300px]">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        <tr>
                        <th className="px-4 md:px-6 py-3 md:py-4 uppercase font-black tracking-widest">{t('expense_concept')}</th>
                        <th className="px-4 md:px-6 py-3 md:py-4 uppercase font-black tracking-widest text-right">{t('value')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {rangePayments.map(pay => {
                            const cr = credits.find(c => c.id === pay.creditId);
                            const cl = cr ? clients.find(c => c.id === cr.clientId) : null;
                            return (
                                <tr key={pay.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                    <td className="px-4 md:px-6 py-3 md:py-4 whitespace-normal">
                                    <p className="font-bold text-slate-700 dark:text-slate-200">{cl?.name || 'Cliente'}</p>
                                    <p className="text-[9px] text-slate-400 uppercase">{pay.date.split('T')[0]} • CR#{pay.creditId.slice(-4)}</p>
                                    </td>
                                    <td className="px-4 md:px-6 py-3 md:py-4 text-right font-black text-emerald-600 dark:text-emerald-400">+${pay.amount.toLocaleString()}</td>
                                </tr>
                            )
                        })}
                        {rangeTransactions.filter(t => t.type === 'INJECTION').map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 bg-emerald-50/30 dark:bg-emerald-900/10">
                            <td className="px-4 md:px-6 py-3 md:py-4 whitespace-normal">
                            <p className="font-bold text-emerald-800 dark:text-emerald-300">{tx.description}</p>
                            <p className="text-[9px] text-emerald-500 uppercase">{tx.date}</p>
                            </td>
                            <td className="px-4 md:px-6 py-3 md:py-4 text-right font-black text-emerald-600 dark:text-emerald-400">+${tx.amount.toLocaleString()}</td>
                        </tr>
                        ))}
                    </tbody>
                  </table>
              </div>
           </div>
        </section>
      </div>

      <section className="space-y-6">
           <div className="flex items-center gap-3 px-4">
              <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
              <h3 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em]">{t('new_loans')}</h3>
           </div>
           {/* Tabla Nuevos Préstamos */}
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[300px]">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        <tr>
                        <th className="px-4 md:px-6 py-3 md:py-4 uppercase font-black tracking-widest">{t('clients')}</th>
                        <th className="px-4 md:px-6 py-3 md:py-4 uppercase font-black tracking-widest text-right">{t('loan_amount')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {rangeCredits.map(cr => {
                        const client = clients.find(c => c.id === cr.clientId);
                        return (
                            <tr key={cr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                            <td className="px-4 md:px-6 py-3 md:py-4 whitespace-normal">
                                <p className="font-bold text-slate-700 dark:text-slate-200 uppercase">{client?.name || '---'}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">{cr.startDate} • ID: #{cr.id.slice(-6)}</p>
                            </td>
                            <td className="px-4 md:px-6 py-3 md:py-4 text-right font-black text-rose-600 dark:text-rose-400 text-sm">
                                -${cr.capital.toLocaleString()}
                            </td>
                            </tr>
                        );
                        })}
                    </tbody>
                  </table>
              </div>
           </div>
      </section>
    </div>
  );
};

const Row = ({ label, value, highlight = 'text-slate-800 dark:text-white', isDeductible = false }: any) => (
  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
    <td className="px-4 md:px-8 py-3 md:py-5 text-[10px] md:text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight whitespace-normal">{label}</td>
    <td className={`px-4 md:px-8 py-3 md:py-5 text-base md:text-xl font-black text-right ${highlight}`}>
      {isDeductible ? `- $${Math.abs(value).toLocaleString()}` : `$${value.toLocaleString()}`}
    </td>
  </tr>
);

export default LiquidationView;