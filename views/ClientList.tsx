
import React, { useState, useMemo, useEffect } from 'react';
import { Client, Credit, User, UserRole, Route } from '../types';
import { TODAY_STR, countBusinessDays } from '../constants';

interface ClientListProps {
  clients: Client[];
  credits: Credit[];
  users: User[];
  user: User;
  routes: Route[];
  onPayment: (creditId: string, amount: number) => void;
  onViewDetails: (creditId: string) => void;
  onViewVisits: (creditId: string) => void; 
  onEditClient: (clientId: string) => void;
  initialSearchTerm?: string;
  onSearchChange?: (term: string) => void; 
}

type FilterType = 'mora' | 'falta1' | 'falta3' | 'pagados' | 'todos' | 'perdidos';

const ClientList: React.FC<ClientListProps> = ({ clients, credits, users, user, routes, onPayment, onViewDetails, onViewVisits, onEditClient, initialSearchTerm = '', onSearchChange }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [activeFilter, setActiveFilter] = useState<FilterType>('todos');
  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; client?: Client; credit?: Credit }>({ isOpen: false });
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (onSearchChange) {
        onSearchChange(val);
    }
  };

  const getCreditStatusInfo = (credit: Credit) => {
    if (credit.status === 'Lost') {
        return { isFinished: false, pendingCount: 0, status: 'perdidos', isCurrentlyOverdue: false, isLost: true };
    }

    const isFinished = credit.totalPaid >= credit.totalToPay || credit.status === 'Completed';
    
    let strictPastDueInstallments = 0;
    const todayDate = new Date(TODAY_STR + 'T00:00:00');
    const startDate = new Date(credit.startDate + 'T00:00:00');

    if (credit.frequency === 'Daily') {
       const daysUpToToday = countBusinessDays(credit.startDate, TODAY_STR);
       const isTodayBusinessDay = todayDate.getDay() !== 0; 
       strictPastDueInstallments = Math.max(0, daysUpToToday - (isTodayBusinessDay ? 1 : 0));
    } else {
       const diffTime = todayDate.getTime() - startDate.getTime();
       const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
       let cycleDays = 30;
       if (credit.frequency === 'Weekly') cycleDays = 7;
       
       const inclusive = Math.floor(diffDays / cycleDays);
       const remainder = diffDays % cycleDays;
       strictPastDueInstallments = remainder === 0 ? Math.max(0, inclusive - 1) : inclusive;
    }
    
    const amountStrictlyExpected = Math.min(credit.totalInstallments, strictPastDueInstallments) * credit.installmentValue;
    const isCurrentlyOverdue = !isFinished && credit.totalPaid < amountStrictlyExpected;
    const pendingCount = credit.totalInstallments - credit.paidInstallments;
    
    let status: FilterType = 'todos';
    if (isFinished) status = 'pagados';
    else if (isCurrentlyOverdue) status = 'mora';
    else if (pendingCount === 1) status = 'falta1';
    else if (pendingCount > 0 && pendingCount <= 3) status = 'falta3';

    return { isFinished, pendingCount, status, isCurrentlyOverdue, isLost: false };
  };

  const creditItems = useMemo(() => {
    return credits
      .map(credit => {
        const client = clients.find(c => c.id === credit.clientId);
        if (!client) return null;
        const route = routes.find(r => r.id === client.routeId);
        const routeName = route ? route.name : 'Sin Ruta';
        const routeCollectors = users.filter(u => u.role === UserRole.COLLECTOR && u.routeIds.includes(client.routeId));
        const collectorName = routeCollectors.length > 0 ? routeCollectors[0].name : 'Sin asignar';
        const info = getCreditStatusInfo(credit);
        return { client, credit, collectorName, routeName, info };
      })
      .filter((item): item is any => {
        if (!item) return false;
        const normalizedSearch = searchTerm.toLowerCase().trim();
        const matchesSearch = 
          item.client.name.toLowerCase().includes(normalizedSearch) || 
          item.client.alias.toLowerCase().includes(normalizedSearch) ||
          item.client.dni.includes(normalizedSearch) ||
          item.credit.id.toLowerCase().includes(normalizedSearch);
        if (!matchesSearch) return false;
        if (activeFilter === 'todos') {
            if (searchTerm) return true;
            return !item.info.isLost && !item.info.isFinished;
        }
        return item.info.status === activeFilter;
      });
  }, [clients, credits, users, routes, searchTerm, activeFilter]);

  const activeCreditItems = creditItems.filter(item => !item.info.isFinished && !item.info.isLost);
  const completedCreditItems = credits.map(credit => {
        const client = clients.find(c => c.id === credit.clientId);
        if (!client) return null;
        const info = getCreditStatusInfo(credit);
        if (!info.isFinished) return null;
        const route = routes.find(r => r.id === client.routeId);
        const routeName = route ? route.name : 'Sin Ruta';
        const routeCollectors = users.filter(u => u.role === UserRole.COLLECTOR && u.routeIds.includes(client.routeId));
        const collectorName = routeCollectors.length > 0 ? routeCollectors[0].name : 'Sin asignar';
        
        const normalizedSearch = searchTerm.toLowerCase().trim();
        const matchesSearch = 
          client.name.toLowerCase().includes(normalizedSearch) || 
          client.alias.toLowerCase().includes(normalizedSearch) ||
          client.dni.includes(normalizedSearch);
        
        if (!matchesSearch) return null;
        return { client, credit, collectorName, routeName, info };
  }).filter((item): item is any => !!item);

  const lostCreditItems = credits.map(credit => {
        const client = clients.find(c => c.id === credit.clientId);
        if (!client) return null;
        const info = getCreditStatusInfo(credit);
        if (!info.isLost) return null;
        const route = routes.find(r => r.id === client.routeId);
        const routeName = route ? route.name : 'Sin Ruta';
        const routeCollectors = users.filter(u => u.role === UserRole.COLLECTOR && u.routeIds.includes(client.routeId));
        const collectorName = routeCollectors.length > 0 ? routeCollectors[0].name : 'Sin asignar';

        const normalizedSearch = searchTerm.toLowerCase().trim();
        const matchesSearch = 
          client.name.toLowerCase().includes(normalizedSearch) || 
          client.alias.toLowerCase().includes(normalizedSearch) ||
          client.dni.includes(normalizedSearch);
        
        if (!matchesSearch) return null;
        return { client, credit, collectorName, routeName, info };
  }).filter((item): item is any => !!item);


  // Abre modal para abono manual
  const openPaymentModal = (client: Client, credit: Credit) => {
    if (credit.status === 'Lost') return;
    if (credit.totalPaid >= credit.totalToPay) return;
    setPaymentModal({ isOpen: true, client, credit });
    setPaymentAmount(0); // Empezar en 0 para que el usuario escriba
  };

  const handleConfirmPayment = () => {
    if (paymentModal.credit && paymentAmount >= 0) {
      onPayment(paymentModal.credit.id, paymentAmount);
      setPaymentModal({ isOpen: false });
    }
  };

  // Pago rápido directo desde la tarjeta
  const handleQuickPayment = (creditId: string, amount: number) => {
    onPayment(creditId, amount);
  };

  const getCardStyle = (isFinished: boolean, status: FilterType) => {
    if (status === 'perdidos') return 'bg-rose-50 border-rose-300 shadow-md opacity-80';
    if (isFinished) return 'bg-emerald-100/90 border-emerald-500 shadow-md shadow-emerald-100/50';
    if (status === 'mora') return 'bg-purple-100 border-purple-500 shadow-md shadow-purple-100/50';
    if (status === 'falta1') return 'bg-rose-100 border-rose-500 shadow-md shadow-rose-100/50';
    if (status === 'falta3') return 'bg-amber-100 border-amber-500 shadow-md shadow-amber-100/50';
    return 'bg-white border-slate-200 hover:border-indigo-300';
  };

  return (
    <>
      <div className="space-y-6 animate-fadeIn pb-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Gestión de Créditos</h2>
            <p className="text-slate-500 font-medium">Historial completo por obligación financiera</p>
          </div>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar por nombre, DNI o ID..." 
              className="pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl w-full md:w-80 shadow-sm focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-slate-700 transition-all"
              value={searchTerm}
              onChange={handleSearchInput}
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 absolute left-4 top-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </header>

        <div className="flex flex-wrap gap-3 mb-8">
          <FilterBadge color="bg-indigo-500" label="Activos" active={activeFilter === 'todos'} onClick={() => setActiveFilter('todos')} />
          <FilterBadge color="bg-purple-600" label="En Mora" active={activeFilter === 'mora'} onClick={() => setActiveFilter('mora')} />
          <FilterBadge color="bg-rose-600" label="Falta 1 Cuota" active={activeFilter === 'falta1'} onClick={() => setActiveFilter('falta1')} />
          <FilterBadge color="bg-amber-500" label="Faltan <= 3 Cuotas" active={activeFilter === 'falta3'} onClick={() => setActiveFilter('falta3')} />
        </div>

        {/* SECCIÓN CRÉDITOS ACTIVOS */}
        {activeFilter !== 'pagados' && activeFilter !== 'perdidos' && (
            <section className="space-y-4">
            <div className="flex items-center gap-3 px-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Obligaciones Pendientes</h3>
                <div className="flex-1 h-px bg-slate-100"></div>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {activeCreditItems.map((item) => (
                <CreditCard 
                    key={item.credit.id} 
                    {...item}
                    onOpenModal={openPaymentModal} 
                    onQuickPayment={handleQuickPayment}
                    onViewDetails={onViewDetails} 
                    onViewVisits={onViewVisits}
                    onEditClient={onEditClient}
                    cardStyle={getCardStyle(false, item.info.status)}
                />
                ))}
                {activeCreditItems.length === 0 && <div className="py-10 text-center text-slate-400 italic text-sm">No hay créditos activos para este filtro.</div>}
            </div>
            </section>
        )}

        {/* SECCIÓN CRÉDITOS LIQUIDADOS */}
        {(activeFilter === 'todos' || activeFilter === 'pagados') && completedCreditItems.length > 0 && (
          <section className="space-y-4 mt-10">
            <div className="flex items-center gap-3 px-2">
              <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em]">Créditos Liquidados</h3>
              <div className="flex-1 h-px bg-emerald-200"></div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {completedCreditItems.map((item) => (
                <CreditCard 
                  key={item.credit.id} 
                  {...item}
                  onOpenModal={openPaymentModal} 
                  onQuickPayment={handleQuickPayment}
                  onViewDetails={onViewDetails} 
                  onViewVisits={onViewVisits}
                  onEditClient={onEditClient}
                  cardStyle={getCardStyle(true, 'pagados')}
                />
              ))}
            </div>
          </section>
        )}

        {/* SECCIÓN CRÉDITOS PERDIDOS */}
        {(activeFilter === 'todos' || activeFilter === 'perdidos') && lostCreditItems.length > 0 && (
          <section className="space-y-4 mt-10">
            <div className="flex items-center gap-3 px-2">
              <h3 className="text-xs font-black text-rose-600 uppercase tracking-[0.2em]">Créditos Perdidos (Incobrables)</h3>
              <div className="flex-1 h-px bg-rose-200"></div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {lostCreditItems.map((item) => (
                <CreditCard 
                  key={item.credit.id} 
                  {...item}
                  onOpenModal={() => {}} 
                  onQuickPayment={() => {}}
                  onViewDetails={onViewDetails} 
                  onViewVisits={onViewVisits}
                  onEditClient={onEditClient}
                  cardStyle={getCardStyle(false, 'perdidos')}
                  isLost
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {paymentModal.isOpen && paymentModal.client && paymentModal.credit && (
        <PaymentModal 
          client={paymentModal.client} 
          credit={paymentModal.credit} 
          amount={paymentAmount} 
          setAmount={setPaymentAmount}
          onClose={() => setPaymentModal({ isOpen: false })}
          onConfirm={handleConfirmPayment}
        />
      )}
    </>
  );
};

const FilterBadge = ({ color, label, active, onClick }: any) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all shadow-sm ${active ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
    <div className={`w-2 h-2 rounded-full ${active ? 'bg-white' : color}`} />
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const CreditCard = ({ client, credit, collectorName, routeName, info, onOpenModal, onQuickPayment, onViewDetails, onViewVisits, onEditClient, cardStyle, isLost }: any) => {
  // Estado local para feedback visual de éxito
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Cálculos para los botones rápidos
  const saldoTotal = Math.max(0, credit.totalToPay - credit.totalPaid);
  const abonoActual = credit.totalPaid % credit.installmentValue;
  const debeCuotaActual = Math.max(0, credit.installmentValue - abonoActual);

  // Cálculo de mora local para el botón
  let expectedInstallments = 0;
  if (credit.frequency === 'Daily') {
     expectedInstallments = countBusinessDays(credit.startDate, TODAY_STR);
     const todayDate = new Date(TODAY_STR + 'T00:00:00');
     const isTodayBusinessDay = todayDate.getDay() !== 0; 
     expectedInstallments = Math.max(0, expectedInstallments - (isTodayBusinessDay ? 1 : 0));
  } else {
     const today = new Date(TODAY_STR + 'T00:00:00');
     const startDate = new Date(credit.startDate + 'T00:00:00');
     const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
     let cycleDays = 30;
     if (credit.frequency === 'Weekly') cycleDays = 7;
     const inclusive = Math.floor(diffDays / cycleDays);
     const remainder = diffDays % cycleDays;
     expectedInstallments = remainder === 0 ? Math.max(0, inclusive - 1) : inclusive;
  }
  
  const amountExpected = Math.min(credit.totalInstallments, expectedInstallments) * credit.installmentValue;
  const debeMora = Math.max(0, amountExpected - credit.totalPaid);

  const handleAction = (amount: number, label: string) => {
    onQuickPayment(credit.id, amount);
    setSuccessFeedback(label);
    // Remover feedback después de 3s (antes 1.5s)
    setTimeout(() => {
        setSuccessFeedback(null);
    }, 3000);
  };

  return (
    <div 
      onClick={() => onViewDetails(credit.id)}
      className={`${cardStyle} cursor-pointer p-5 border-2 rounded-[2.5rem] flex flex-col xl:flex-row xl:items-center justify-between gap-6 transition-all hover:translate-x-1 shadow-sm group relative`}
    >
      {/* Sección Información Cliente */}
      <div className="flex items-center gap-5 min-w-0 xl:w-1/3">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onEditClient(client.id);
          }} 
          className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all border border-slate-100 shrink-0 relative z-10"
        >
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
        </button>
        <div className="truncate">
          <div className="flex items-center gap-3 mb-1">
            <h4 className="font-black text-slate-900 text-lg md:text-xl truncate">{client.name}</h4>
            <span className="bg-white/80 px-2.5 py-1 rounded-lg text-[9px] font-black text-slate-500 border border-slate-200 uppercase tracking-tighter shadow-xs">{client.alias}</span>
            {isLost && <span className="bg-rose-600 text-white px-2 py-1 rounded text-[8px] font-black uppercase">PERDIDO</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p className="text-[10px] font-bold text-slate-600/70 uppercase tracking-widest">DNI: <span className="text-slate-800">{client.dni}</span></p>
            <div className="w-1.5 h-1.5 bg-black/10 rounded-full"></div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">ID: <span className="text-slate-700">#{credit.id.slice(-6).toUpperCase()}</span></p>
          </div>
        </div>
      </div>

      {/* Sección Botones Rápidos / Feedback */}
      <div className="flex-1 min-w-0 relative" onClick={e => e.stopPropagation()}>
         {!info.isFinished && !isLost ? (
            successFeedback ? (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-50 rounded-2xl border border-emerald-100 animate-slideUp z-20 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg animate-bounce">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        </div>
                        <p className="text-emerald-700 font-black uppercase text-[10px] tracking-widest">{successFeedback}</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 transition-opacity duration-300">
                    <button 
                        onClick={() => handleAction(0, 'Visita Registrada')}
                        className="flex flex-col items-center justify-center p-2 bg-slate-50 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl transition-all group/btn"
                    >
                        <span className="text-[8px] font-black uppercase text-slate-400 group-hover/btn:text-indigo-500">NO PAGA</span>
                        <span className="text-sm font-black text-slate-700 group-hover/btn:text-indigo-700">$0</span>
                    </button>

                    <button 
                        onClick={() => handleAction(debeCuotaActual, 'Pago Recibido')}
                        className="flex flex-col items-center justify-center p-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-600 hover:border-indigo-600 rounded-xl transition-all group/btn"
                    >
                        <span className="text-[8px] font-black uppercase text-indigo-400 group-hover/btn:text-indigo-200">CUOTA</span>
                        <span className="text-sm font-black text-indigo-700 group-hover/btn:text-white">${debeCuotaActual.toLocaleString()}</span>
                    </button>

                    {debeMora > 0 ? (
                        <button 
                            onClick={() => handleAction(debeMora, 'Mora Saldada')}
                            className="flex flex-col items-center justify-center p-2 bg-rose-50 border border-rose-100 hover:bg-rose-600 hover:border-rose-600 rounded-xl transition-all group/btn"
                        >
                            <span className="text-[8px] font-black uppercase text-rose-400 group-hover/btn:text-rose-200">MORA</span>
                            <span className="text-sm font-black text-rose-700 group-hover/btn:text-white">${debeMora.toLocaleString()}</span>
                        </button>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-2 bg-slate-50/50 border border-transparent rounded-xl opacity-50 cursor-default">
                            <span className="text-[8px] font-black uppercase text-slate-300">AL DÍA</span>
                            <span className="text-sm font-black text-slate-300">--</span>
                        </div>
                    )}

                    <button 
                        onClick={() => handleAction(saldoTotal, 'Crédito Finalizado')}
                        className="flex flex-col items-center justify-center p-2 bg-emerald-50 border border-emerald-100 hover:bg-emerald-600 hover:border-emerald-600 rounded-xl transition-all group/btn"
                    >
                        <span className="text-[8px] font-black uppercase text-emerald-500 group-hover/btn:text-emerald-200">SALDO TOTAL</span>
                        <span className="text-sm font-black text-emerald-700 group-hover/btn:text-white">${saldoTotal.toLocaleString()}</span>
                    </button>
                </div>
            )
         ) : (
            <div className="h-full flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {isLost ? 'CRÉDITO CASTIGADO - GESTIÓN BLOQUEADA' : 'CRÉDITO FINALIZADO - PAZ Y SALVO'}
                </span>
            </div>
         )}
      </div>

      {/* Botones de Gestión */}
      <div className="flex gap-2 shrink-0 z-10 xl:w-auto w-full">
        {!info.isFinished && !isLost && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onOpenModal(client, credit);
            }} 
            className="flex-1 xl:flex-none bg-slate-900 hover:bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-black transition shadow-lg active:scale-95 uppercase tracking-widest"
          >
            Abonar
          </button>
        )}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onViewVisits(credit.id);
          }} 
          className="flex-1 xl:flex-none bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-3 rounded-2xl text-xs font-black transition shadow-sm active:scale-95 uppercase tracking-widest"
        >
          Detalle
        </button>
      </div>
    </div>
  );
};

const PaymentModal = ({ client, credit, amount, setAmount, onClose, onConfirm }: any) => {
  const saldoTotal = Math.max(0, credit.totalToPay - credit.totalPaid);

  return (
    <div className="fixed inset-0 w-full h-full bg-slate-900/90 flex items-center justify-center p-4 z-[9999] backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl border border-white animate-slideUp flex flex-col overflow-hidden">
        <header className="bg-slate-900 p-6 text-center relative shrink-0">
          <button onClick={onClose} className="absolute right-5 top-5 text-slate-500 hover:text-white transition">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 px-3 py-1 rounded-full mb-3 border border-indigo-500/30">
            <span className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em]">Crédito #{credit.id.slice(-6).toUpperCase()}</span>
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">Abono Manual</h3>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">{client.name}</p>
        </header>

        <div className="p-8 space-y-6">
          <div className="space-y-3">
             <div className="flex justify-between items-end px-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Valor a Ingresar</label>
                <p className="text-[10px] font-black text-indigo-600 uppercase">Debe: ${saldoTotal.toLocaleString()}</p>
             </div>
             <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 group-focus-within:text-indigo-500 transition-colors">$</div>
                <input 
                  type="number" 
                  min="0"
                  max={saldoTotal}
                  autoFocus 
                  value={amount || ''}
                  onChange={(e) => setAmount(Math.max(0, Math.min(saldoTotal, parseFloat(e.target.value) || 0)))}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] pl-12 pr-6 py-6 font-black text-slate-800 text-4xl outline-none focus:border-indigo-500 focus:ring-8 focus:ring-indigo-50 transition-all shadow-inner text-center"
                  placeholder="0.00"
                />
             </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button 
              disabled={amount < 0}
              onClick={onConfirm} 
              className="w-full font-black py-5 rounded-[2rem] shadow-2xl transition transform active:scale-95 uppercase tracking-[0.2em] text-xs bg-indigo-600 hover:bg-indigo-700 text-white border-b-4 border-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Registrar Abono
            </button>
            <button onClick={onClose} className="w-full bg-white hover:bg-slate-50 text-slate-400 font-black py-4 rounded-2xl transition uppercase tracking-widest text-[9px] border border-slate-200">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientList;
