import React, { useState, useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { User, Route, Credit, Expense, Client, Payment } from '../types';
import { TODAY_STR, countBusinessDays } from '../constants';
import { useGlobal } from '../contexts/GlobalContext';
import AIAssistant from '../components/AIAssistant';

interface DashboardProps {
  navigate: (view: string) => void;
  user: User;
  routes: Route[];
  stats: {
    clients: Client[];
    credits: Credit[];
    expenses: Expense[];
    payments?: Payment[];
  };
}

const CollectorDashboard: React.FC<DashboardProps> = ({ navigate, user, routes, stats }) => {
  const { theme, t } = useGlobal();
  const todayDate = new Date(TODAY_STR + 'T00:00:00');
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const [selectedPeriod, setSelectedPeriod] = useState(() => TODAY_STR.substring(0, 4) + TODAY_STR.substring(5, 7));
  const selYear = parseInt(selectedPeriod.substring(0, 4));
  const selMonth = parseInt(selectedPeriod.substring(4, 6)) - 1;

  const availablePeriods = useMemo(() => {
    if (stats.credits.length === 0) {
       const y = parseInt(TODAY_STR.substring(0, 4));
       const m = parseInt(TODAY_STR.substring(5, 7));
       return [{ value: `${y}${String(m).padStart(2,'0')}`, label: `${months[m-1]} ${y}` }];
    }

    let minTs = Number.MAX_SAFE_INTEGER;
    let maxTs = 0;

    stats.credits.forEach(cr => {
       const start = new Date(cr.startDate + 'T00:00:00');
       if (start.getTime() < minTs) minTs = start.getTime();

       let end = new Date(start);
       if (cr.frequency === 'Monthly') {
          end.setMonth(end.getMonth() + cr.totalInstallments);
       } else if (cr.frequency === 'Weekly') {
          end.setDate(end.getDate() + (cr.totalInstallments * 7));
       } else {
          let added = 0;
          while (added < cr.totalInstallments) {
             end.setDate(end.getDate() + 1);
             if (end.getDay() !== 0) added++;
          }
       }
       if (end.getTime() > maxTs) maxTs = end.getTime();
    });

    const options = [];
    const current = new Date(minTs);
    current.setDate(1); 
    const limit = new Date(maxTs);
    limit.setDate(1);

    while (current <= limit) {
       const y = current.getFullYear();
       const m = current.getMonth();
       options.push({
          value: `${y}${String(m + 1).padStart(2, '0')}`,
          label: `${months[m]} ${y}`
       });
       current.setMonth(current.getMonth() + 1);
    }
    
    return options.sort((a, b) => b.value.localeCompare(a.value));
  }, [stats.credits]);

  // Lógica exacta de AdminDashboard para cálculo de cuotas
  const getInstallmentStatusForDate = (credit: Credit, targetDate: Date) => {
    const startDate = new Date(credit.startDate + 'T00:00:00');
    if (targetDate.getTime() < startDate.getTime()) return { isInstallmentDay: false, installmentNum: 0 };
    
    if (credit.frequency === 'Daily' && targetDate.getDay() === 0) return { isInstallmentDay: false, installmentNum: 0 };

    let isInstallmentDay = false;
    let installmentNum = 0;
    
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    const targetDateStr = `${y}-${m}-${d}`;

    if (credit.frequency === 'Daily') { 
        isInstallmentDay = true; 
        // FIX: +1 para contar el día actual como una cuota exigible en el cálculo ordinal
        installmentNum = countBusinessDays(credit.startDate, targetDateStr) + 1;
    }
    else if (credit.frequency === 'Weekly') { 
        const diffDays = Math.round((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        isInstallmentDay = diffDays % 7 === 0; 
        installmentNum = Math.floor(diffDays / 7) + 1; 
    }
    else if (credit.frequency === 'Monthly') { 
        isInstallmentDay = targetDate.getDate() === startDate.getDate(); 
        const diffDays = Math.round((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        installmentNum = Math.floor(diffDays / 30) + 1; 
    }
    return { isInstallmentDay, installmentNum };
  };

  const metrics = useMemo(() => {
    let overdueAmount = 0;           
    let totalInvested = 0;
    let totalInterestExpected = 0;
    let totalRecoveredCapital = 0;
    let totalRealizedProfit = 0;
    let totalPendingToCollect = 0;
    let totalLostCapital = 0;

    if (stats.payments && stats.payments.length > 0) {
        stats.credits.forEach(cr => {
            const creditPayments = stats.payments?.filter(p => p.creditId === cr.id).reduce((sum, p) => sum + p.amount, 0) || 0;
            const capitalRatio = cr.capital / cr.totalToPay;
            const profitRatio = (cr.totalToPay - cr.capital) / cr.totalToPay;
            
            totalRecoveredCapital += creditPayments * capitalRatio;
            totalRealizedProfit += creditPayments * profitRatio;
        });
    } else {
        stats.credits.forEach(cr => {
            const capitalRatio = cr.capital / cr.totalToPay;
            const profitRatio = (cr.totalToPay - cr.capital) / cr.totalToPay;
            totalRecoveredCapital += cr.totalPaid * capitalRatio;
            totalRealizedProfit += cr.totalPaid * profitRatio;
        });
    }

    stats.credits.forEach(cr => {
      const totalToPay = cr.totalToPay;
      const capital = cr.capital;
      const capitalRatio = capital / totalToPay;
      
      if (cr.status === 'Lost') {
        const creditPayments = stats.payments ? stats.payments.filter(p => p.creditId === cr.id).reduce((s,p)=>s+p.amount,0) : cr.totalPaid;
        const capitalRecoveredInPayments = creditPayments * capitalRatio;
        totalLostCapital += (capital - capitalRecoveredInPayments);
      } else {
        totalInvested += capital;
        totalInterestExpected += (totalToPay - capital);
        
        const creditPayments = stats.payments ? stats.payments.filter(p => p.creditId === cr.id).reduce((s,p)=>s+p.amount,0) : cr.totalPaid;
        totalPendingToCollect += (totalToPay - creditPayments);

        const { installmentNum } = getInstallmentStatusForDate(cr, todayDate);
        const shouldHavePaid = Math.min(cr.totalInstallments, installmentNum) * cr.installmentValue;
        const debt = Math.max(0, shouldHavePaid - creditPayments);
        if (cr.isOverdue || debt > 0) {
            const finalDebt = cr.totalToPay - creditPayments;
            overdueAmount += (installmentNum > cr.totalInstallments) ? finalDebt : Math.max(debt, cr.installmentValue);
        }
      }
    });

    return { 
      overdueAmount, totalInvested, totalInterestExpected,
      totalRecoveredCapital, totalRealizedProfit, totalPendingToCollect, totalLostCapital,
      recoveryRate: totalInvested > 0 ? (totalRecoveredCapital / totalInvested) * 100 : 0,
      profitRate: totalInterestExpected > 0 ? (totalRealizedProfit / totalInterestExpected) * 100 : 0
    };
  }, [stats]);

  // CÁLCULO DE GRÁFICA REAL VS META (Idéntico a Admin)
  const chartData = useMemo(() => {
    const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
    const data = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDayDate = new Date(selYear, selMonth, day);
      
      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(selMonth + 1).padStart(2, '0');
      const currentDayStr = `${selYear}-${monthStr}-${dayStr}`;
      
      let targetForDay = 0;
      let actualCollected = 0;

      // FILTRO CORREGIDO: Coincidir con la lógica del Enrutamiento (Active = Mostrar en Meta)
      stats.credits.forEach(cr => {
        if (cr.status === 'Lost' || cr.status === 'Completed') return;
        if (cr.totalPaid >= cr.totalToPay) return; 

        const { isInstallmentDay } = getInstallmentStatusForDate(cr, currentDayDate);
        
        if (isInstallmentDay) {
          targetForDay += cr.installmentValue;
        }
      });

      // Recaudo Real
      if (stats.payments) {
          actualCollected = stats.payments
            .filter(p => p.date.startsWith(currentDayStr))
            .reduce((sum, p) => sum + p.amount, 0);
      }

      data.push({ 
          day: dayStr, 
          collected: Math.round(actualCollected), 
          target: Math.round(targetForDay) 
      });
    }
    return data;
  }, [selectedPeriod, stats.credits, stats.payments]);

  const moraChartData = useMemo(() => {
    const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
    const data = [];
    const todayLimit = new Date(TODAY_STR + 'T00:00:00');

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(selYear, selMonth, day);
      
      // FIX: Si el día es futuro, no graficar (retornar null o break)
      if (currentDate > todayLimit) {
          data.push({ day: String(day).padStart(2, '0'), moraTotal: null });
          continue;
      }

      let totalMora = 0;
      
      stats.credits.filter(cr => cr.status !== 'Lost').forEach(cr => {
        const { installmentNum, isInstallmentDay } = getInstallmentStatusForDate(cr, currentDate);
        
        if (installmentNum > 0) {
            let shouldBePaid = Math.min(cr.totalInstallments, installmentNum) * cr.installmentValue;
            
            // FIX: Si es el día de pago, RESTAR la cuota de hoy para calcular "Mora Pura" (solo atrasos previos)
            if (isInstallmentDay) {
                shouldBePaid -= cr.installmentValue;
            }

            const currentDebt = Math.max(0, shouldBePaid - cr.totalPaid);
            
            if (currentDebt > 0) {
                totalMora += (installmentNum > cr.totalInstallments) ? (cr.totalToPay - cr.totalPaid) : currentDebt;
            }
        }
      });
      data.push({ day: String(day).padStart(2, '0'), moraTotal: Math.round(totalMora) });
    }
    return data;
  }, [selectedPeriod, stats.credits]);

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border shadow-sm border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">Gestión de Mi Ruta</span>
          <h2 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white tracking-tight mt-2">¡Hola, {user.name.split(' ')[0]}!</h2>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-3xl border border-slate-100 dark:border-slate-700 flex items-center">
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">{t('date')}:</span>
             <select 
               value={selectedPeriod} 
               onChange={(e) => setSelectedPeriod(e.target.value)} 
               className="bg-white dark:bg-slate-700 border-none rounded-2xl text-xs font-black uppercase text-indigo-600 dark:text-indigo-300 py-2.5 px-4 shadow-sm cursor-pointer focus:ring-0 outline-none"
             >
               {availablePeriods.map(opt => (
                 <option key={opt.value} value={opt.value}>{opt.label}</option>
               ))}
             </select>
        </div>
      </header>

      {/* AI Assistant Integration */}
      <div className="mb-8">
        <AIAssistant 
          metrics={metrics} 
          totalExpenses={stats.expenses.reduce((a, b) => a + b.value, 0)}
          clients={stats.clients}
          credits={stats.credits}
          payments={stats.payments} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartBlock title={t('compliance_goals')} data={chartData} type="compliance" theme={theme} />
        <ChartBlock title="Recaudo de Mora (Mi Ruta)" data={moraChartData} type="mora" theme={theme} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 bg-slate-900 dark:bg-black p-10 rounded-[3rem] shadow-2xl border border-slate-800">
           <h3 className="text-2xl font-black text-white mb-8">{t('quick_actions')}</h3>
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <QuickButton label={t('credits')} onClick={() => navigate('credits')} icon={<IconCash />} />
              <QuickButton label={t('new_credit')} onClick={() => navigate('new_credit')} icon={<IconLoan />} />
              <QuickButton label={t('expenses')} onClick={() => navigate('expenses')} icon={<IconReceipt />} />
              <QuickButton label={t('clients')} onClick={() => navigate('client_management')} icon={<IconUsers />} />
           </div>
        </div>
        <button onClick={() => navigate('liquidation')} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center items-center text-center gap-6 hover:border-indigo-600 dark:hover:border-indigo-500 transition-all group">
           <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><IconChart /></div>
           <h4 className="font-black text-2xl text-slate-800 dark:text-white tracking-tight">{t('close_box')}</h4>
        </button>
      </div>
    </div>
  );
};

// UI Components
const ChartBlock = ({ title, data, type, theme }: any) => {
  const isDark = theme === 'dark';
  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 h-96 shadow-sm">
       <h3 className="text-xl font-black text-slate-800 dark:text-white mb-8 flex items-center gap-3"><div className={`w-2 h-6 rounded-full ${type==='compliance'?'bg-blue-500':'bg-rose-500'}`}></div>{title}</h3>
       <ResponsiveContainer width="100%" height="70%">
          <ComposedChart data={data}>
             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
             <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#94a3b8', fontSize: 10, fontWeight: 800}} />
             <Tooltip 
               cursor={{fill: isDark ? '#1e293b' : '#f8fafc'}} 
               contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold', backgroundColor: isDark ? '#0f172a' : '#fff', color: isDark ? '#fff' : '#000'}}
               formatter={(value: any, name: string) => {
                 if (name === 'collected') return [`$${value}`, 'Recaudado'];
                 if (name === 'target') return [`$${value}`, 'Meta'];
                 if (name === 'moraTotal') return [`$${value}`, 'Total Mora'];
                 return [value, name];
               }}
             />
             {type === 'compliance' ? (
               <>
                 <Bar dataKey="collected" radius={[4, 4, 0, 0]} barSize={15}>
                   {data.map((entry: any, index: number) => (
                     <Cell key={`cell-${index}`} fill={entry.collected >= entry.target ? '#10b981' : '#f59e0b'} />
                   ))}
                 </Bar>
                 <Line type="monotone" dataKey="target" stroke="#3b82f6" strokeWidth={3} dot={false} />
               </>
             ) : (
               <Line type="stepAfter" dataKey="moraTotal" connectNulls={false} stroke="#f43f5e" strokeWidth={3} dot={false} />
             )}
          </ComposedChart>
       </ResponsiveContainer>
    </div>
  );
};

const QuickButton = ({ label, onClick, icon }: any) => (
  <button onClick={onClick} className="flex flex-col items-center gap-3 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5 group">
    <div className="text-indigo-400 group-hover:text-white transition-colors">{icon}</div>
    <span className="text-[10px] font-black text-white uppercase tracking-widest">{label}</span>
  </button>
);

const IconCash = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconLoan = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const IconReceipt = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>;
const IconUsers = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const IconChart = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /></svg>;

export default CollectorDashboard;