
import React, { useState, useEffect, useMemo } from 'react';
import { Client, Credit, Route, User, Expense, Payment, RouteTransaction } from '../types';
import { addBusinessDays } from '../constants';

interface NewCreditProps {
  clients: Client[];
  user: User;
  // New props for financial validation
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

  // --- Helper: Block Invalid Keys ---
  const blockInvalidChar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault();
    }
  };

  // --- LOGIC: Calculate Route Balance ---
  const routeFinancials = useMemo(() => {
    if (!selectedClient) return null;

    const routeId = selectedClient.routeId;
    const route = routes.find(r => r.id === routeId);
    
    // 1. Base Inicial + Inyecciones - Retiros (De la ruta específica)
    let balance = 0;
    allTransactions.forEach(t => {
        if (t.routeId === routeId) {
            if (t.type === 'INITIAL_BASE' || t.type === 'INJECTION') balance += t.amount;
            if (t.type === 'WITHDRAWAL') balance -= t.amount;
        }
    });

    // 2. (+) Recaudos (Entradas) de clientes de esa ruta
    allPayments.forEach(p => {
        const credit = allCredits.find(c => c.id === p.creditId);
        // Verificar historial: el cliente del crédito debe pertenecer a la ruta en cuestión
        // NOTA: Si el cliente cambió de ruta, el dinero histórico se queda en la ruta donde se pagó (simplificación)
        // Para consistencia estricta, chequeamos la ruta actual del cliente asociado al pago.
        const client = credit ? clients.find(cl => cl.id === credit.clientId) : null;
        if (client && client.routeId === routeId) {
            balance += p.amount;
        }
    });

    // 3. (-) Gastos (Salidas) de esa ruta
    allExpenses.forEach(e => {
        if (e.routeId === routeId) {
            balance -= e.value;
        }
    });

    // 4. (-) Nuevos Préstamos (Salidas de Capital) de esa ruta
    allCredits.forEach(cr => {
        const client = clients.find(cl => cl.id === cr.clientId);
        if (client && client.routeId === routeId) {
            balance -= cr.capital;
        }
    });

    return {
        balance,
        routeName: route?.name || 'Ruta Desconocida'
    };
  }, [selectedClient, allTransactions, allPayments, allExpenses, allCredits, clients, routes]);

  useEffect(() => {
    if (formData.frequency === 'Daily') {
       setFormData(prev => ({ ...prev, firstPaymentDate: prev.startDate }));
    } else {
        const start = new Date(formData.startDate + 'T00:00:00');
        const firstPayment = new Date(start);
        if (formData.frequency === 'Weekly') firstPayment.setDate(start.getDate() + 7);
        if (formData.frequency === 'Monthly') firstPayment.setMonth(start.getMonth() + 1);
        
        setFormData(prev => ({ ...prev, firstPaymentDate: firstPayment.toISOString().split('T')[0] }));
    }
  }, [formData.startDate, formData.frequency]);

  const handleSearch = () => {
    setNotification(null);
    const term = searchTerm.toLowerCase().trim();
    if (!term) return;

    const matches = clients.filter(c => 
      c.dni.includes(term) || 
      c.name.toLowerCase().includes(term) || 
      c.alias.toLowerCase().includes(term)
    );

    setSearchResults(matches);
    
    if (matches.length === 1) {
      setSelectedClient(matches[0]);
    } else if (matches.length === 0) {
      setSelectedClient(null);
      setNotification({ type: 'error', message: 'No se encontró ningún cliente con ese criterio.' });
    } else {
      setSelectedClient(null);
    }
  };

  const handleGenerate = () => {
    setNotification(null);
    if (!selectedClient) {
      setNotification({ type: 'error', message: 'Error: Debe seleccionar un cliente antes de generar el crédito.' });
      return;
    }
    
    if (formData.capital <= 0 || formData.installments <= 0) {
      setNotification({ type: 'error', message: 'Por favor ingrese valores mayores a 0 para capital y cantidad de cuotas.' });
      return;
    }

    // --- VALIDACIÓN DE FONDOS ---
    if (routeFinancials && formData.capital > routeFinancials.balance) {
        setNotification({ 
            type: 'error', 
            message: `FONDOS INSUFICIENTES: La ruta ${routeFinancials.routeName} solo tiene $${routeFinancials.balance.toLocaleString()} disponibles. No puede prestar $${formData.capital.toLocaleString()}.` 
        });
        return;
    }

    const interestAmount = formData.capital * (formData.interestRate / 100);
    const total = formData.capital + interestAmount;
    const installmentValue = total / formData.installments;
    
    let endDateObj: Date;
    let termDays = 0;

    if (formData.frequency === 'Daily') {
       endDateObj = addBusinessDays(formData.firstPaymentDate, formData.installments);
       const start = new Date(formData.startDate + 'T00:00:00');
       termDays = Math.ceil((endDateObj.getTime() - start.getTime()) / (1000 * 3600 * 24));
    } else {
       let daysMultiplier = 1;
       if (formData.frequency === 'Weekly') daysMultiplier = 7;
       if (formData.frequency === 'Monthly') daysMultiplier = 30;
       
       termDays = formData.installments * daysMultiplier;
       endDateObj = new Date(formData.firstPaymentDate + 'T00:00:00');
       endDateObj.setDate(endDateObj.getDate() + (termDays - daysMultiplier));
    }

    setCalc({
      total,
      interestAmount,
      installmentValue: Math.round(installmentValue),
      termDays: termDays,
      endDate: endDateObj.toISOString().split('T')[0].replace(/-/g, '/')
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calc || !selectedClient) return;

    // Re-validar al guardar por seguridad
    if (routeFinancials && formData.capital > routeFinancials.balance) {
        setNotification({ type: 'error', message: 'Error Crítico: Fondos insuficientes para procesar la transacción.' });
        return;
    }

    const newCredit: Credit = {
      id: 'CR-' + Date.now().toString().slice(-6) + '-' + selectedClient.dni.slice(-2),
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
      isOverdue: false,
      status: 'Active'
    };

    onSave(selectedClient, newCredit);
    setNotification({ type: 'success', message: 'Nueva obligación financiera registrada con éxito' });
    setCalc(null);
    setSelectedClient(null);
    setSearchTerm('');
    setFormData({ ...formData, capital: 0 });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-20">
      <header>
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Nuevo Crédito</h2>
        <p className="text-slate-500">Gestión de préstamos con calendario Lunes-Sábado</p>
      </header>

      {notification && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-fadeIn ${notification.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             {notification.type === 'error' ? 
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /> : 
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
             }
           </svg>
           <p className="text-xs font-black uppercase tracking-widest">{notification.message}</p>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
        {/* ... Search Form Logic ... */}
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-1 w-full">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">DNI, Nombre o Alias del Cliente</label>
            <div className="relative">
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setNotification(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Ej: 12345 o Carlos Gomez..."
                className={`w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-bold text-slate-700`}
              />
              {searchTerm && (
                <button 
                  onClick={() => { setSearchTerm(''); setSelectedClient(null); setSearchResults([]); setNotification(null); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                </button>
              )}
            </div>
          </div>
          <button 
            type="button"
            onClick={handleSearch}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-600 transition shadow-lg active:scale-95 flex items-center gap-2 uppercase tracking-widest text-xs h-[58px]"
          >
            Verificar
          </button>
        </div>

        {searchResults.length > 1 && !selectedClient && (
          <div className="mt-6 space-y-2 max-h-56 overflow-y-auto p-4 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner animate-slideDown">
            {searchResults.map(c => (
              <button 
                key={c.id} 
                onClick={() => { setSelectedClient(c); setNotification(null); }}
                className="w-full text-left p-4 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-slate-200 flex justify-between items-center group shadow-sm hover:shadow-md"
              >
                <div>
                  <p className="font-black text-slate-800 uppercase text-sm group-hover:text-indigo-600 transition-colors">{c.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Alias: <span className="text-indigo-400">{c.alias}</span> • DNI: {c.dni}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedClient && routeFinancials && (
          <div className="mt-8 p-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] animate-slideDown flex flex-col gap-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg border-2 border-white">
                    {selectedClient.name.charAt(0)}
                </div>
                <div>
                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em]">Cliente Seleccionado</p>
                    <h4 className="text-2xl font-black text-slate-800 leading-none mt-1">{selectedClient.name}</h4>
                </div>
                </div>
                <div className="flex flex-col items-end">
                <button 
                    onClick={() => { setSelectedClient(null); setSearchResults([]); setSearchTerm(''); }}
                    className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 hover:text-rose-500 transition-colors underline underline-offset-4"
                >
                    Cambiar Cliente
                </button>
                </div>
            </div>
            
            {/* Widget de Tesorería */}
            <div className={`p-4 rounded-2xl border flex flex-col md:flex-row justify-between items-center gap-4 transition-colors ${formData.capital > routeFinancials.balance ? 'bg-rose-100 border-rose-200' : 'bg-emerald-100 border-emerald-200'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl text-white ${formData.capital > routeFinancials.balance ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${formData.capital > routeFinancials.balance ? 'text-rose-700' : 'text-emerald-700'}`}>Tesorería: {routeFinancials.routeName}</p>
                        <p className={`text-xl font-black ${formData.capital > routeFinancials.balance ? 'text-rose-800' : 'text-emerald-800'}`}>
                            ${routeFinancials.balance.toLocaleString()} <span className="text-[10px] opacity-70">DISPONIBLE</span>
                        </p>
                    </div>
                </div>
                {formData.capital > routeFinancials.balance && (
                    <div className="bg-white/50 px-4 py-2 rounded-xl text-rose-700 text-[10px] font-black uppercase tracking-widest border border-rose-200">
                        🚫 FONDOS INSUFICIENTES
                    </div>
                )}
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
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">$</span>
                  <input 
                    type="number" 
                    min="0"
                    onKeyDown={blockInvalidChar}
                    value={formData.capital || ''} 
                    onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (isNaN(val)) {
                            setFormData({...formData, capital: 0});
                        } else if (val >= 0) {
                            setFormData({...formData, capital: val});
                        }
                    }}
                    className={`w-full bg-slate-50 border-2 rounded-2xl pl-10 pr-5 py-5 focus:ring-4 outline-none transition-all font-black text-slate-800 text-2xl shadow-inner ${routeFinancials && formData.capital > routeFinancials.balance ? 'border-rose-300 focus:ring-rose-100 text-rose-600' : 'border-slate-100 focus:ring-emerald-100'}`}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Interés (%)</label>
                <div className="relative">
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-indigo-600 font-black text-xl">%</span>
                  <input 
                    type="number" 
                    min="0"
                    onKeyDown={blockInvalidChar}
                    value={formData.interestRate} 
                    onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (isNaN(val)) {
                            setFormData({...formData, interestRate: 0});
                        } else if (val >= 0) {
                            setFormData({...formData, interestRate: val});
                        }
                    }}
                    className="w-full bg-indigo-50 border-2 border-indigo-100 rounded-2xl px-5 py-5 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-black text-indigo-700 text-2xl shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cuotas</label>
                <input 
                  type="number" 
                  min="1"
                  onKeyDown={blockInvalidChar}
                  value={formData.installments} 
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    if (isNaN(val)) {
                        setFormData({...formData, installments: 0});
                    } else if (val >= 0) {
                        setFormData({...formData, installments: val});
                    }
                  }}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-5 focus:ring-4 focus:ring-emerald-100 outline-none transition-all font-black text-slate-800 text-2xl shadow-inner"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ciclo de Cobro</label>
                <select 
                  value={formData.frequency}
                  onChange={e => setFormData({...formData, frequency: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 focus:ring-4 focus:ring-emerald-100 outline-none transition-all font-black text-slate-700 appearance-none cursor-pointer shadow-inner"
                >
                  <option value="Daily">DIARIO (Lunes-Sábado)</option>
                  <option value="Weekly">SEMANAL</option>
                  <option value="Monthly">MENSUAL</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha Préstamo</label>
                <input 
                  type="date" 
                  value={formData.startDate} 
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 focus:ring-4 focus:ring-emerald-100 outline-none transition-all font-black text-slate-700 shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Primer Pago (Est.)</label>
                <input 
                  type="date" 
                  value={formData.firstPaymentDate} 
                  onChange={e => setFormData({...formData, firstPaymentDate: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 focus:ring-4 focus:ring-emerald-100 outline-none transition-all font-black text-slate-700 shadow-inner cursor-pointer"
                />
              </div>
            </div>

            <div className="text-center pt-6">
              <button 
                type="button"
                onClick={handleGenerate}
                disabled={routeFinancials && formData.capital > routeFinancials.balance}
                className="inline-flex items-center gap-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-16 py-6 rounded-[2rem] shadow-2xl transition transform hover:-translate-y-1 active:scale-95 uppercase tracking-[0.2em] text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                Calcular Obligación
              </button>
            </div>

            {calc && (
              <div className="mt-14 p-10 bg-slate-900 text-white rounded-[3rem] shadow-2xl space-y-12 animate-slideDown relative overflow-hidden border-4 border-indigo-500/20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-10 relative z-10">
                  <div className="text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 text-white/40">Inversión</p>
                    <p className="text-3xl font-black text-white">${formData.capital.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 text-white/40">Utilidad Bruta</p>
                    <p className="text-3xl font-black text-indigo-400">${calc.interestAmount.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 text-white/40">Total Cobro</p>
                    <p className="text-3xl font-black text-emerald-400">${calc.total.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 text-white/40">Valor Cuota</p>
                    <p className="text-4xl font-black text-amber-400">${calc.installmentValue.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-10 pt-12 border-t border-white/10 relative z-10">
                  <div className="flex items-center gap-12">
                    <div className="text-left">
                      <span className="text-[10px] font-black uppercase text-white/40 tracking-widest block mb-1">Duración Real</span>
                      <span className="text-2xl font-black">{calc.termDays} días (L-S)</span>
                    </div>
                    <div className="w-px h-12 bg-white/10"></div>
                    <div className="text-left">
                      <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest block mb-1">Cierre Proyectado</span>
                      <span className="text-2xl font-black text-white">{calc.endDate}</span>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black px-20 py-6 rounded-[2rem] shadow-xl transition transform hover:-translate-y-1 active:scale-95 uppercase tracking-[0.2em] text-sm"
                  >
                    Registrar Crédito
                  </button>
                </div>
                
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full -ml-24 -mb-24 blur-3xl"></div>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export default NewCredit;
