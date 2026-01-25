
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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

  // Cierra el dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // CORRECCIÓN 3: Búsqueda Interactiva Avanzada
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setNotification(null);
    if (!term.trim()) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
    }

    const lowerTerm = term.toLowerCase();
    const matches = clients.filter(c => 
        c.dni.includes(lowerTerm) || 
        c.name.toLowerCase().includes(lowerTerm) || 
        c.alias.toLowerCase().includes(lowerTerm) ||
        (c.address && c.address.toLowerCase().includes(lowerTerm))
    ).slice(0, 5); // Limitar a 5 resultados para UI limpia

    setSearchResults(matches);
    setShowDropdown(true);
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setSearchTerm(client.name);
    setShowDropdown(false);
    setCalc(null); // Resetear cálculo si cambia cliente
  };

  const handleGenerate = () => {
    setNotification(null);
    if (!selectedClient || formData.capital <= 0 || formData.installments <= 0) {
      setNotification({ type: 'error', message: 'Por favor complete todos los campos financieros.' });
      return;
    }

    // CORRECCIÓN 4: Validación de Caja mejorada visualmente
    if (routeFinancials && formData.capital > routeFinancials.balance) {
        setNotification({ type: 'error', message: `⚠️ FONDO INSUFICIENTE: La ruta ${routeFinancials.routeName} solo tiene $${routeFinancials.balance.toLocaleString()} disponibles.` });
        return;
    }

    const interestAmount = formData.capital * (formData.interestRate / 100);
    const total = formData.capital + interestAmount;
    const installmentValue = total / formData.installments;
    
    let endDateObj: Date;
    let termDays = 0;

    if (formData.frequency === 'Daily') {
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
      firstPaymentDate: formData.firstPaymentDate,
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
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-24">
      <header className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
            <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">Gestión de Activos</span>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight mt-2">Nueva Colocación</h2>
        </div>
      </header>

      {notification && (
        <div className={`p-5 rounded-2xl border-2 flex items-start gap-4 animate-slideDown shadow-lg ${notification.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
           <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${notification.type === 'error' ? 'bg-rose-200' : 'bg-emerald-200'}`}>
             {notification.type === 'error' ? '!' : '✓'}
           </div>
           <div>
             <p className="font-black uppercase tracking-widest text-xs mb-1">{notification.type === 'error' ? 'Alerta de Sistema' : 'Operación Exitosa'}</p>
             <p className="text-sm font-medium">{notification.message}</p>
           </div>
        </div>
      )}

      {/* CORRECCIÓN 4: Diseño Mejorado y Alertas */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
        
        <div className="p-8 md:p-10 space-y-10">
            {/* Buscador */}
            <div className="space-y-4 relative" ref={searchRef}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Buscar Cliente (Predictivo)</label>
                <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-indigo-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={handleSearchInput} 
                        onFocus={() => { if(searchTerm) setShowDropdown(true); }}
                        placeholder="Escriba nombre, cédula o alias..." 
                        className="w-full bg-slate-50/50 border-2 border-slate-200 rounded-[2rem] pl-16 pr-6 py-5 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-lg shadow-inner placeholder:text-slate-300" 
                    />
                    
                    {/* Dropdown de Sugerencias */}
                    {showDropdown && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-fadeIn">
                            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coincidencias encontradas</p>
                            </div>
                            {searchResults.map(c => (
                                <button 
                                    key={c.id} 
                                    onClick={() => handleSelectClient(c)}
                                    className="w-full text-left px-6 py-4 hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex items-center justify-between group transition-colors"
                                >
                                    <div>
                                        <p className="font-bold text-slate-800 group-hover:text-indigo-700">{c.name}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{c.alias} • <span className="font-mono">{c.dni}</span></p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase group-hover:bg-white group-hover:text-indigo-500">Seleccionar</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {selectedClient && (
                <div className="animate-slideDown">
                    {/* Alerta de Caja */}
                    {routeFinancials && (
                        <div className={`mb-8 p-6 rounded-3xl border-2 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm ${routeFinancials.balance < 500 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${routeFinancials.balance < 500 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${routeFinancials.balance < 500 ? 'text-amber-700' : 'text-emerald-700'}`}>Disponibilidad en Caja</p>
                                    <p className={`text-2xl font-black ${routeFinancials.balance < 500 ? 'text-amber-800' : 'text-emerald-800'}`}>${routeFinancials.balance.toLocaleString()}</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Ruta: {routeFinancials.routeName}</p>
                                </div>
                            </div>
                            {routeFinancials.balance < formData.capital && (
                                <span className="bg-white text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-rose-100 shadow-sm animate-pulse">
                                    ⚠️ Fondos Insuficientes
                                </span>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Monto a Prestar</label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">$</span>
                                    <input type="number" onKeyDown={blockInvalidChar} value={formData.capital || ''} onChange={e => setFormData({...formData, capital: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border-2 rounded-2xl pl-10 pr-5 py-5 font-black text-slate-800 text-2xl shadow-inner border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all outline-none" placeholder="0" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Interés (%)</label>
                                <div className="relative">
                                    <input type="number" onKeyDown={blockInvalidChar} value={formData.interestRate} onChange={e => setFormData({...formData, interestRate: parseFloat(e.target.value) || 0})} className="w-full bg-indigo-50 border-2 border-indigo-100 rounded-2xl px-5 py-5 font-black text-indigo-700 text-2xl shadow-inner focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none" />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-indigo-300 text-lg">%</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Número de Cuotas</label>
                                <input type="number" value={formData.installments} onChange={e => setFormData({...formData, installments: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-5 font-black text-slate-800 text-2xl shadow-inner focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all outline-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Frecuencia de Pago</label>
                                <select value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-black text-slate-700 shadow-inner focus:border-indigo-500 outline-none h-[72px]">
                                    <option value="Daily">DIARIO (Lunes a Sábado)</option>
                                    <option value="Weekly">SEMANAL</option>
                                    <option value="Monthly">MENSUAL</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha Entrega Dinero</label>
                                <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-black text-slate-700 shadow-inner focus:border-indigo-500 outline-none h-[72px]" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Inicio de Cobros</label>
                                <input type="date" value={formData.firstPaymentDate} onChange={e => setFormData({...formData, firstPaymentDate: e.target.value})} className="w-full bg-indigo-50 border-2 border-indigo-200 rounded-2xl px-6 py-5 font-black text-indigo-800 shadow-inner focus:border-indigo-500 outline-none h-[72px]" />
                            </div>
                        </div>

                        <div className="text-center pt-6">
                            <button type="button" onClick={handleGenerate} className="w-full md:w-auto bg-slate-900 hover:bg-indigo-600 text-white font-black px-16 py-5 rounded-3xl shadow-2xl transition transform active:scale-95 uppercase tracking-widest text-xs border-b-4 border-slate-950 hover:border-indigo-900">
                                Calcular Proyección
                            </button>
                        </div>

                        {calc && (
                            <div className="mt-14 p-8 md:p-10 bg-slate-900 text-white rounded-[3rem] shadow-2xl space-y-10 animate-slideDown border-4 border-indigo-500/20">
                                {/* CORRECCIÓN RESPONSIVE: Grid ajustada para evitar desbordamiento */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                                    <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <p className="text-[9px] font-black uppercase text-slate-400 mb-2 tracking-widest">Total a Pagar</p>
                                        <p className="text-2xl md:text-3xl font-black text-emerald-400 truncate">${calc.total.toLocaleString()}</p>
                                    </div>
                                    <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <p className="text-[9px] font-black uppercase text-slate-400 mb-2 tracking-widest">Valor Cuota</p>
                                        <p className="text-2xl md:text-3xl font-black text-amber-400 truncate">${calc.installmentValue.toLocaleString()}</p>
                                    </div>
                                    <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <p className="text-[9px] font-black uppercase text-slate-400 mb-2 tracking-widest">Días Estimados</p>
                                        <p className="text-2xl md:text-3xl font-black truncate">{calc.termDays} días</p>
                                    </div>
                                    <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <p className="text-[9px] font-black uppercase text-slate-400 mb-2 tracking-widest">Fecha Fin</p>
                                        <p className="text-xl md:text-2xl font-black text-white truncate">{calc.endDate}</p>
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black py-5 rounded-[2rem] shadow-xl uppercase tracking-widest text-sm border-b-4 border-emerald-700 active:translate-y-1 active:border-b-0 transition-all">
                                    Confirmar y Crear Crédito
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default NewCredit;
