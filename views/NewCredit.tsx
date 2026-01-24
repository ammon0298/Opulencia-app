
import React, { useState, useEffect, useMemo } from 'react';
import { Client, Credit, Route, User, Expense, Payment, RouteTransaction } from '../types';
import { addBusinessDays } from '../constants';

interface NewCreditProps {
  clients: Client[];
  user: User;
  allCredits: Credit[];
  allExpenses: Expense[];
  allPayments: Payment[];
  allTransactions: RouteTransaction[];
  routes: Route[];
  onSave: (client: Client, credit: Credit) => void;
}

const NewCredit: React.FC<NewCreditProps> = ({ clients, user, allCredits, allExpenses, allPayments, allTransactions, routes, onSave }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    firstPaymentDate: new Date().toISOString().split('T')[0],
    capital: 0,
    interestRate: 20,
    installments: 30,
    frequency: 'Daily'
  });

  const [calc, setCalc] = useState<{
    total: number;
    interestAmount: number;
    installmentValue: number;
    endDate: string;
    termDays: number;
  } | null>(null);

  const blockInvalidChar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
  };

  const routeFinancials = useMemo(() => {
    if (!selectedClient) return null;
    const routeId = selectedClient.routeId;
    const route = routes.find(r => r.id === routeId);
    
    let balance = 0;
    allTransactions.forEach(t => {
        if (t.routeId === routeId) {
            if (t.type === 'INITIAL_BASE' || t.type === 'INJECTION') balance += t.amount;
            if (t.type === 'WITHDRAWAL') balance -= t.amount;
        }
    });

    allPayments.forEach(p => {
        const credit = allCredits.find(c => c.id === p.creditId);
        const client = credit ? clients.find(cl => cl.id === credit.clientId) : null;
        if (client && client.routeId === routeId) balance += p.amount;
    });

    allExpenses.forEach(e => {
        if (e.routeId === routeId) balance -= e.value;
    });

    allCredits.forEach(cr => {
        const client = clients.find(cl => cl.id === cr.clientId);
        if (client && client.routeId === routeId) balance -= cr.capital;
    });

    return { balance, routeName: route?.name || 'Ruta Desconocida' };
  }, [selectedClient, allTransactions, allPayments, allExpenses, allCredits, clients, routes]);

  const handleSearch = () => {
    setNotification(null);
    const term = searchTerm.toLowerCase().trim();
    if (!term) return;
    const matches = clients.filter(c => c.dni.includes(term) || c.name.toLowerCase().includes(term) || c.alias.toLowerCase().includes(term));
    setSearchResults(matches);
    if (matches.length === 1) setSelectedClient(matches[0]);
    else if (matches.length === 0) setNotification({ type: 'error', message: 'Sin resultados.' });
  };

  const handleGenerate = () => {
    setNotification(null);
    if (!selectedClient || formData.capital <= 0 || formData.installments <= 0) {
      setNotification({ type: 'error', message: 'Revise los valores del crédito.' });
      return;
    }

    if (routeFinancials && formData.capital > routeFinancials.balance) {
        setNotification({ type: 'error', message: `Saldo insuficiente: solo $${routeFinancials.balance.toLocaleString()} disponibles.` });
        return;
    }

    const interestAmount = formData.capital * (formData.interestRate / 100);
    const total = formData.capital + interestAmount;
    const installmentValue = total / formData.installments;
    
    let endDateObj: Date;
    let termDays = 0;

    if (formData.frequency === 'Daily') {
       // Usamos firstPaymentDate como base para contar los días de cuota
       // Restamos 1 porque la primera cuota ya está en firstPaymentDate
       endDateObj = addBusinessDays(formData.firstPaymentDate, formData.installments - 1);
       const start = new Date(formData.startDate + 'T00:00:00');
       termDays = Math.ceil((endDateObj.getTime() - start.getTime()) / (1000 * 3600 * 24));
    } else {
       let daysMultiplier = 7;
       if (formData.frequency === 'Monthly') daysMultiplier = 30;
       termDays = formData.installments * daysMultiplier;
       endDateObj = new Date(formData.firstPaymentDate + 'T00:00:00');
       endDateObj.setDate(endDateObj.getDate() + (formData.installments - 1) * daysMultiplier);
    }

    setCalc({
      total,
      interestAmount,
      installmentValue: Math.round(installmentValue),
      termDays: Math.max(1, termDays),
      endDate: endDateObj.toISOString().split('T')[0].replace(/-/g, '/')
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calc || !selectedClient) return;

    const newCredit: Credit = {
      id: 'CR-' + Date.now().toString().slice(-6),
      businessId: user.businessId,
      clientId: selectedClient.id,
      capital: formData.capital,
      totalToPay: calc.total,
      installmentValue: calc.installmentValue,
      totalInstallments: formData.installments,
      paidInstallments: 0,
      totalPaid: 0,
      frequency: formData.frequency as any,
      startDate: formData.startDate,
      firstPaymentDate: formData.firstPaymentDate, // Se guarda explícitamente
      isOverdue: false,
      status: 'Active'
    };

    onSave(selectedClient, newCredit);
    setNotification({ type: 'success', message: 'Crédito registrado con éxito.' });
    setCalc(null);
    setSelectedClient(null);
    setSearchTerm('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-20">
      <header>
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Nuevo Crédito</h2>
        <p className="text-slate-500">Gestión de préstamos con calendario dinámico</p>
      </header>

      {notification && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-fadeIn ${notification.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
           <p className="text-xs font-black uppercase tracking-widest">{notification.message}</p>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-1 w-full">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">DNI o Nombre</label>
            <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setNotification(null); }} placeholder="Buscar cliente..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-bold text-slate-700 shadow-inner" />
          </div>
          <button onClick={handleSearch} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black hover:bg-indigo-600 transition shadow-lg active:scale-95 uppercase tracking-widest text-xs h-[58px]">Verificar</button>
        </div>

        {selectedClient && (
          <div className="mt-8 p-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] animate-slideDown shadow-inner">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black">{selectedClient.name.charAt(0)}</div>
                    <div>
                        <p className="text-[9px] font-black text-indigo-600 uppercase">Cliente Seleccionado</p>
                        <h4 className="text-xl font-black text-slate-800">{selectedClient.name}</h4>
                    </div>
                </div>
                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${routeFinancials && formData.capital > routeFinancials.balance ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    Caja: ${routeFinancials?.balance.toLocaleString()}
                </div>
             </div>
          </div>
        )}
      </div>

      {selectedClient && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 animate-fadeIn">
          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Monto Capital</label>
                <input type="number" onKeyDown={blockInvalidChar} value={formData.capital || ''} onChange={e => setFormData({...formData, capital: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border-2 rounded-2xl px-5 py-5 font-black text-slate-800 text-2xl shadow-inner border-slate-100" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Interés (%)</label>
                <input type="number" onKeyDown={blockInvalidChar} value={formData.interestRate} onChange={e => setFormData({...formData, interestRate: parseFloat(e.target.value) || 0})} className="w-full bg-indigo-50 border-2 border-indigo-100 rounded-2xl px-5 py-5 font-black text-indigo-700 text-2xl shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cuotas</label>
                <input type="number" value={formData.installments} onChange={e => setFormData({...formData, installments: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-5 font-black text-slate-800 text-2xl shadow-inner" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Frecuencia</label>
                <select value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-black text-slate-700 shadow-inner">
                  <option value="Daily">DIARIO (L-S)</option>
                  <option value="Weekly">SEMANAL</option>
                  <option value="Monthly">MENSUAL</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha Entrega</label>
                <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-black text-slate-700 shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Inicio de Cobro (1ra Cuota)</label>
                <input type="date" value={formData.firstPaymentDate} onChange={e => setFormData({...formData, firstPaymentDate: e.target.value})} className="w-full bg-indigo-50 border-2 border-indigo-200 rounded-2xl px-6 py-5 font-black text-indigo-800 shadow-inner" />
              </div>
            </div>

            <div className="text-center pt-6">
              <button type="button" onClick={handleGenerate} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-16 py-6 rounded-[2rem] shadow-2xl transition transform active:scale-95 uppercase tracking-widest text-sm">Calcular Proyección</button>
            </div>

            {calc && (
              <div className="mt-14 p-10 bg-slate-900 text-white rounded-[3rem] shadow-2xl space-y-10 animate-slideDown border-4 border-indigo-500/20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div className="text-center"><p className="text-[9px] font-black uppercase text-white/40 mb-2">Total Cobro</p><p className="text-3xl font-black text-emerald-400">${calc.total.toLocaleString()}</p></div>
                  <div className="text-center"><p className="text-[9px] font-black uppercase text-white/40 mb-2">Vlr. Cuota</p><p className="text-3xl font-black text-amber-400">${calc.installmentValue.toLocaleString()}</p></div>
                  <div className="text-center"><p className="text-[9px] font-black uppercase text-white/40 mb-2">Hábiles</p><p className="text-3xl font-black">{formData.installments}</p></div>
                  <div className="text-center"><p className="text-[9px] font-black uppercase text-white/40 mb-2">Cierre Est.</p><p className="text-2xl font-black text-white">{calc.endDate}</p></div>
                </div>
                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black py-6 rounded-[2rem] shadow-xl uppercase tracking-widest text-sm">Confirmar y Registrar Crédito</button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export default NewCredit;
