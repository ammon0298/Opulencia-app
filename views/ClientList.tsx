
import React, { useState, useMemo, useEffect } from 'react';
import { Client, Credit, User, UserRole, Route } from '../types';
import { TODAY_STR, countBusinessDays, addBusinessDays } from '../constants';
import { useGlobal } from '../contexts/GlobalContext';

interface ClientListProps {
  clients: Client[];
  credits: Credit[];
  users: User[];
  user: User;
  routes: Route[];
  onPayment: (creditId: string, amount: number) => Promise<void>; 
  onViewDetails: (creditId: string) => void;
  onViewVisits: (creditId: string) => void; 
  onEditClient: (clientId: string) => void;
  onNavigate: (view: string) => void; // Added navigation prop
  initialSearchTerm?: string;
  onSearchChange?: (term: string) => void; 
}

// Filtros específicos para la cartera activa
type ActiveFilterType = 'mora' | 'hoy' | 'aldia' | 'falta1' | 'falta3' | 'todos';
// Módulos principales
type ViewModule = 'active' | 'completed' | 'lost';

const ClientList: React.FC<ClientListProps> = ({ clients, credits, users, user, routes, onPayment, onViewDetails, onViewVisits, onEditClient, onNavigate, initialSearchTerm = '', onSearchChange }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [currentModule, setCurrentModule] = useState<ViewModule>('active');
  const [activeFilter, setActiveFilter] = useState<ActiveFilterType>('todos');
  
  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; client?: Client; credit?: Credit }>({ isOpen: false });
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const { t } = useGlobal();

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

  // LÓGICA DE SEMÁFORO ACTUALIZADA
  const getCreditStatusInfo = (credit: Credit) => {
    if (credit.status === 'Lost') {
        return { isFinished: false, pendingCount: 0, status: 'perdidos', isCurrentlyOverdue: false, isDueToday: false, isPaidUpToDate: false, isLost: true };
    }

    const paidFullInstallments = Math.floor((credit.totalPaid + 0.1) / credit.installmentValue);
    const isFinished = paidFullInstallments >= credit.totalInstallments || credit.status === 'Completed';
    
    if (isFinished) {
         return { isFinished: true, pendingCount: 0, status: 'pagados', isCurrentlyOverdue: false, isDueToday: false, isPaidUpToDate: true, isLost: false };
    }

    const baseDateStr = credit.firstPaymentDate || credit.startDate;
    let nextInstallmentDueDate: Date;

    if (credit.frequency === 'Daily') {
        nextInstallmentDueDate = addBusinessDays(baseDateStr, paidFullInstallments);
    } else {
        const base = new Date(baseDateStr + 'T00:00:00');
        nextInstallmentDueDate = new Date(base);
        if (credit.frequency === 'Weekly') {
            nextInstallmentDueDate.setDate(base.getDate() + (paidFullInstallments * 7));
        } else if (credit.frequency === 'Monthly') {
            nextInstallmentDueDate.setMonth(base.getMonth() + paidFullInstallments);
        }
    }

    const todayDate = new Date(TODAY_STR + 'T00:00:00');
    nextInstallmentDueDate.setHours(0,0,0,0);
    todayDate.setHours(0,0,0,0);

    const isCurrentlyOverdue = todayDate.getTime() > nextInstallmentDueDate.getTime();
    const isDueToday = todayDate.getTime() === nextInstallmentDueDate.getTime();
    const isPaidUpToDate = nextInstallmentDueDate.getTime() > todayDate.getTime();

    const pendingCount = credit.totalInstallments - paidFullInstallments;
    
    let status: ActiveFilterType = 'todos';
    
    if (isCurrentlyOverdue) status = 'mora';
    else if (isDueToday) status = 'hoy';
    else if (pendingCount === 1) status = 'falta1';
    else if (pendingCount > 0 && pendingCount <= 3) status = 'falta3';
    else if (isPaidUpToDate) status = 'aldia';
    
    return { isFinished, pendingCount, status, isCurrentlyOverdue, isDueToday, isPaidUpToDate, isLost: false };
  };

  // 1. Filtrado General y Mapeo de Datos
  const mappedCredits = useMemo(() => {
    return credits.map(credit => {
        const client = clients.find(c => c.id === credit.clientId);
        if (!client) return null;
        
        const info = getCreditStatusInfo(credit);
        const route = routes.find(r => r.id === client.routeId);
        const routeName = route ? route.name : 'Sin Ruta';
        const routeCollectors = users.filter(u => u.role === UserRole.COLLECTOR && u.routeIds.includes(client.routeId));
        const collectorName = routeCollectors.length > 0 ? routeCollectors[0].name : 'Sin asignar';
        
        // Filtro de Búsqueda
        const normalizedSearch = searchTerm.toLowerCase().trim();
        const matchesSearch = 
          client.name.toLowerCase().includes(normalizedSearch) || 
          client.alias.toLowerCase().includes(normalizedSearch) ||
          client.dni.includes(normalizedSearch) ||
          credit.id.toLowerCase().includes(normalizedSearch);

        if (!matchesSearch) return null;

        return { client, credit, collectorName, routeName, info };
    }).filter((item): item is NonNullable<typeof item> => !!item);
  }, [clients, credits, users, routes, searchTerm]);

  // 2. Separación por Módulos
  const activeCreditItems = useMemo(() => {
      return mappedCredits.filter(item => {
          if (item.info.isFinished || item.info.isLost) return false;
          // Aplicar sub-filtro solo si estamos en el módulo activo
          if (activeFilter === 'todos') return true;
          return item.info.status === activeFilter;
      });
  }, [mappedCredits, activeFilter]);

  const completedCreditItems = useMemo(() => {
      return mappedCredits.filter(item => item.info.isFinished && !item.info.isLost);
  }, [mappedCredits]);

  const lostCreditItems = useMemo(() => {
      return mappedCredits.filter(item => item.info.isLost);
  }, [mappedCredits]);


  const openPaymentModal = (client: Client, credit: Credit) => {
    if (credit.status === 'Lost') return;
    if (credit.totalPaid >= credit.totalToPay) return;
    setPaymentModal({ isOpen: true, client, credit });
    setPaymentAmount(0); 
  };

  const handleConfirmPayment = async () => {
    if (paymentModal.credit && paymentAmount >= 0) {
      await onPayment(paymentModal.credit.id, paymentAmount);
    }
  };

  const handleQuickPayment = (creditId: string, amount: number) => {
    onPayment(creditId, amount);
  };

  const getCardStyle = (isFinished: boolean, status: string) => {
    if (status === 'perdidos') 
        return 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700 shadow-md opacity-80';
    if (isFinished) 
        return 'bg-emerald-100/90 dark:bg-emerald-900/30 border-emerald-500 shadow-md shadow-emerald-100/50 dark:shadow-none';
    if (status === 'mora') 
        return 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 shadow-md shadow-purple-100/50 dark:shadow-none';
    if (status === 'hoy') 
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-md shadow-blue-100/50 dark:shadow-none'; 
    if (status === 'aldia') 
        return 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500/50 shadow-md shadow-emerald-100/50 dark:shadow-none';
    if (status === 'falta1') 
        return 'bg-rose-100 dark:bg-rose-900/20 border-rose-500 shadow-md shadow-rose-100/50 dark:shadow-none';
    if (status === 'falta3') 
        return 'bg-amber-100 dark:bg-amber-900/20 border-amber-500 shadow-md shadow-amber-100/50 dark:shadow-none';
    
    return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500';
  };

  return (
    <>
      <div className="space-y-6 animate-fadeIn pb-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{t('credit_mgmt')}</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">{t('client_list')}</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            {/* Botón Rápido a Enrutamiento */}
            <button 
                onClick={() => onNavigate('routing')}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                {t('routing')}
            </button>

            <div className="relative w-full md:w-80">
                <input 
                type="text" 
                placeholder={t('search')} 
                className="pl-12 pr-12 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full shadow-sm focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900 outline-none font-bold text-slate-700 dark:text-slate-200 transition-all"
                value={searchTerm}
                onChange={handleSearchInput}
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 absolute left-4 top-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
        </header>

        {/* NAVEGACIÓN POR MÓDULOS (TABS) */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto">
            <button 
                onClick={() => setCurrentModule('active')}
                className={`flex-1 min-w-[140px] py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${currentModule === 'active' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400 hover:bg-white/50 dark:hover:bg-white/5'}`}
            >
                Cartera Pendiente
                <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full text-[9px]">{activeCreditItems.length}</span>
            </button>
            <button 
                onClick={() => setCurrentModule('completed')}
                className={`flex-1 min-w-[140px] py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${currentModule === 'completed' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-400 hover:bg-white/50 dark:hover:bg-white/5'}`}
            >
                {t('settled_credits')}
                <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[9px]">{completedCreditItems.length}</span>
            </button>
            <button 
                onClick={() => setCurrentModule('lost')}
                className={`flex-1 min-w-[140px] py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${currentModule === 'lost' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-400 hover:bg-white/50 dark:hover:bg-white/5'}`}
            >
                Incobrables
                <span className="bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 px-2 py-0.5 rounded-full text-[9px]">{lostCreditItems.length}</span>
            </button>
        </div>

        {/* CONTENIDO DEL MÓDULO: ACTIVO */}
        {currentModule === 'active' && (
            <div className="animate-fadeIn">
                {/* Filtros específicos para activos */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <FilterBadge color="bg-indigo-500" label={t('active_credits')} active={activeFilter === 'todos'} onClick={() => setActiveFilter('todos')} />
                    <FilterBadge color="bg-blue-500" label="Cobro Hoy" active={activeFilter === 'hoy'} onClick={() => setActiveFilter('hoy')} />
                    <FilterBadge color="bg-emerald-500" label="Al Día" active={activeFilter === 'aldia'} onClick={() => setActiveFilter('aldia')} />
                    <FilterBadge color="bg-purple-600" label={t('mora_credits')} active={activeFilter === 'mora'} onClick={() => setActiveFilter('mora')} />
                    <FilterBadge color="bg-rose-600" label={t('missing_1')} active={activeFilter === 'falta1'} onClick={() => setActiveFilter('falta1')} />
                    <FilterBadge color="bg-amber-500" label={t('missing_3')} active={activeFilter === 'falta3'} onClick={() => setActiveFilter('falta3')} />
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {activeCreditItems.length > 0 ? activeCreditItems.map((item) => (
                        <CreditCard 
                            key={item.credit.id} 
                            {...item}
                            onOpenModal={openPaymentModal} 
                            onQuickPayment={handleQuickPayment}
                            onViewDetails={onViewDetails} 
                            onViewVisits={onViewVisits}
                            onEditClient={onEditClient}
                            cardStyle={getCardStyle(false, item.info.status)}
                            t={t}
                        />
                    )) : (
                        <div className="py-16 text-center bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                            <p className="text-slate-400 font-medium">No se encontraron créditos activos con este filtro.</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* CONTENIDO DEL MÓDULO: LIQUIDADOS */}
        {currentModule === 'completed' && (
            <div className="animate-fadeIn space-y-4">
                <div className="flex items-center gap-3 px-2 mb-4">
                    <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em]">Historial de Créditos Finalizados</h3>
                    <div className="flex-1 h-px bg-emerald-200 dark:bg-emerald-900/30"></div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    {completedCreditItems.length > 0 ? completedCreditItems.map((item) => (
                        <CreditCard 
                            key={item.credit.id} 
                            {...item}
                            onOpenModal={openPaymentModal} 
                            onQuickPayment={handleQuickPayment}
                            onViewDetails={onViewDetails} 
                            onViewVisits={onViewVisits}
                            onEditClient={onEditClient}
                            cardStyle={getCardStyle(true, 'pagados')}
                            t={t}
                        />
                    )) : (
                        <div className="py-16 text-center bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                            <p className="text-slate-400 font-medium">No hay créditos finalizados para mostrar.</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* CONTENIDO DEL MÓDULO: INCOBRABLES */}
        {currentModule === 'lost' && (
            <div className="animate-fadeIn space-y-4">
                <div className="flex items-center gap-3 px-2 mb-4">
                    <h3 className="text-xs font-black text-rose-600 uppercase tracking-[0.2em]">Cartera Castigada</h3>
                    <div className="flex-1 h-px bg-rose-200 dark:bg-rose-900/30"></div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    {lostCreditItems.length > 0 ? lostCreditItems.map((item) => (
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
                            t={t}
                        />
                    )) : (
                        <div className="py-16 text-center bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                            <p className="text-slate-400 font-medium">No hay créditos marcados como incobrables.</p>
                        </div>
                    )}
                </div>
            </div>
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
          t={t}
        />
      )}
    </>
  );
};

const FilterBadge = ({ color, label, active, onClick }: any) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all shadow-sm ${active ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'}`}>
    <div className={`w-2 h-2 rounded-full ${active ? 'bg-white' : color}`} />
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const CreditCard = ({ client, credit, collectorName, routeName, info, onOpenModal, onQuickPayment, onViewDetails, onViewVisits, onEditClient, cardStyle, isLost, t }: any) => {
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  const saldoTotal = Math.max(0, credit.totalToPay - credit.totalPaid);
  const abonoActual = credit.totalPaid % credit.installmentValue;
  const debeCuotaActual = Math.max(0, credit.installmentValue - abonoActual);

  // CÁLCULO DE DEUDA DE MORA
  let amountStrictlyExpected = 0;
  const todayDate = new Date(TODAY_STR + 'T00:00:00');
  const baseDateStr = credit.firstPaymentDate || credit.startDate;
  const baseDate = new Date(baseDateStr + 'T00:00:00');
  
  let expectedInstallments = 0;

  if (baseDate > todayDate) {
      expectedInstallments = 0;
  } else if (credit.frequency === 'Daily') {
     expectedInstallments = countBusinessDays(baseDateStr, TODAY_STR);
  } else {
     const diffDays = Math.floor((todayDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
     let cycleDays = 30;
     if (credit.frequency === 'Weekly') cycleDays = 7;
     expectedInstallments = Math.floor(diffDays / cycleDays);
  }
  
  const cappedExpectedInstallments = Math.min(credit.totalInstallments, expectedInstallments);
  amountStrictlyExpected = cappedExpectedInstallments * credit.installmentValue;
  
  const debeMora = Math.max(0, amountStrictlyExpected - credit.totalPaid);

  const handleAction = (amount: number, label: string) => {
    onQuickPayment(credit.id, amount);
    setSuccessFeedback(label);
    setTimeout(() => {
        setSuccessFeedback(null);
    }, 3000);
  };

  return (
    <div 
      onClick={() => onViewDetails(credit.id)}
      className={`${cardStyle} cursor-pointer p-5 border-2 rounded-[2.5rem] flex flex-col xl:flex-row xl:items-center justify-between gap-6 transition-all hover:translate-x-1 shadow-sm group relative`}
    >
      {/* Badge Estado Visual Superior Derecho */}
      <div className="absolute top-0 right-0">
         {info.isCurrentlyOverdue ? (
            <div className="bg-purple-600 text-white text-[8px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest">MORA</div>
         ) : info.isDueToday ? (
            <div className="bg-blue-600 text-white text-[8px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest">COBRO HOY</div>
         ) : info.isPaidUpToDate ? (
            <div className="bg-emerald-500 text-white text-[8px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest shadow-sm">AL DÍA</div>
         ) : (
            <div className="bg-slate-400 text-white text-[8px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest shadow-sm">PENDIENTE</div>
         )}
      </div>

      <div className="flex items-center gap-5 min-w-0 xl:w-1/3">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onEditClient(client.id);
          }} 
          className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all border border-slate-100 dark:border-slate-600 shrink-0 relative z-10"
        >
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
        </button>
        <div className="truncate">
          <div className="flex items-center gap-3 mb-1">
            <h4 className="font-black text-slate-900 dark:text-white text-lg md:text-xl truncate">{client.name}</h4>
            <span className="bg-white/80 dark:bg-slate-700 px-2.5 py-1 rounded-lg text-[9px] font-black text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600 uppercase tracking-tighter shadow-xs">{client.alias}</span>
            {isLost && <span className="bg-rose-600 text-white px-2 py-1 rounded text-[8px] font-black uppercase">{t('lost_credits')}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p className="text-[10px] font-bold text-slate-600/70 dark:text-slate-400 uppercase tracking-widest">DNI: <span className="text-slate-800 dark:text-slate-200">{client.dni}</span></p>
            <div className="w-1.5 h-1.5 bg-black/10 dark:bg-white/10 rounded-full"></div>
            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">ID: <span className="text-slate-700 dark:text-slate-300">#{credit.id.slice(-6).toUpperCase()}</span></p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 relative" onClick={e => e.stopPropagation()}>
         {!info.isFinished && !isLost ? (
            successFeedback ? (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800 animate-slideUp z-20 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg animate-bounce">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        </div>
                        <p className="text-emerald-700 dark:text-emerald-400 font-black uppercase text-[10px] tracking-widest">{successFeedback}</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 transition-opacity duration-300">
                    <button 
                        onClick={() => handleAction(0, 'Visita Registrada')}
                        className="flex flex-col items-center justify-center p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900 rounded-xl transition-all group/btn"
                    >
                        <span className="text-[8px] font-black uppercase text-slate-400 group-hover/btn:text-indigo-500 dark:group-hover/btn:text-indigo-300">NO PAGA</span>
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200 group-hover/btn:text-indigo-700 dark:group-hover/btn:text-indigo-300">$0</span>
                    </button>

                    <button 
                        onClick={() => handleAction(debeCuotaActual, 'Pago Recibido')}
                        className="flex flex-col items-center justify-center p-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-600 hover:border-indigo-600 rounded-xl transition-all group/btn"
                    >
                        <span className="text-[8px] font-black uppercase text-indigo-400 group-hover/btn:text-indigo-200">CUOTA</span>
                        <span className="text-sm font-black text-indigo-700 dark:text-indigo-300 group-hover/btn:text-white">${debeCuotaActual.toLocaleString()}</span>
                    </button>

                    {debeMora > 0 ? (
                        <button 
                            onClick={() => handleAction(debeMora, 'Mora Saldada')}
                            className="flex flex-col items-center justify-center p-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 hover:bg-rose-600 hover:border-rose-600 rounded-xl transition-all group/btn"
                        >
                            <span className="text-[8px] font-black uppercase text-rose-400 group-hover/btn:text-rose-200">MORA</span>
                            <span className="text-sm font-black text-rose-700 dark:text-rose-300 group-hover/btn:text-white">${debeMora.toLocaleString()}</span>
                        </button>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-2 bg-emerald-50/50 dark:bg-emerald-900/20 border border-transparent rounded-xl opacity-80 cursor-default">
                            <span className="text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400">AL DÍA</span>
                            <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">--</span>
                        </div>
                    )}

                    <button 
                        onClick={() => handleAction(saldoTotal, 'Crédito Finalizado')}
                        className="flex flex-col items-center justify-center p-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-600 hover:border-emerald-600 rounded-xl transition-all group/btn"
                    >
                        <span className="text-[8px] font-black uppercase text-emerald-500 group-hover/btn:text-emerald-200">SALDO TOTAL</span>
                        <span className="text-sm font-black text-emerald-700 dark:text-emerald-300 group-hover/btn:text-white">${saldoTotal.toLocaleString()}</span>
                    </button>
                </div>
            )
         ) : (
            <div className="h-full flex items-center justify-center bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {isLost ? 'CRÉDITO CASTIGADO - GESTIÓN BLOQUEADA' : 'CRÉDITO FINALIZADO - PAZ Y SALVO'}
                </span>
            </div>
         )}
      </div>

      <div className="flex gap-2 shrink-0 z-10 xl:w-auto w-full">
        {!info.isFinished && !isLost && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onOpenModal(client, credit);
            }} 
            className="flex-1 xl:flex-none bg-slate-900 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl text-xs font-black transition shadow-lg active:scale-95 uppercase tracking-widest"
          >
            {t('register_payment')}
          </button>
        )}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onViewVisits(credit.id);
          }} 
          className="flex-1 xl:flex-none bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 px-6 py-3 rounded-2xl text-xs font-black transition shadow-sm active:scale-95 uppercase tracking-widest"
        >
          {t('edit')}
        </button>
      </div>
    </div>
  );
};

const PaymentModal = ({ client, credit, amount, setAmount, onClose, onConfirm, t }: any) => {
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const saldoTotal = Math.max(0, credit.totalToPay - credit.totalPaid);

  const handleSubmit = async () => {
    if (amount < 0) return;
    setStatus('processing');
    try {
        await onConfirm(); 
        setStatus('success');
        setTimeout(() => {
            onClose();
        }, 2000);
    } catch (error) {
        console.error("Error payment:", error);
        setStatus('idle');
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-slate-900/90 flex items-center justify-center p-4 z-[9999] backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm shadow-2xl border border-white dark:border-slate-700 animate-slideUp flex flex-col overflow-hidden relative">
        
        {/* VISTA DE ÉXITO */}
        {status === 'success' && (
            <div className="absolute inset-0 bg-emerald-600 z-50 flex flex-col items-center justify-center text-white animate-fadeIn p-6 text-center">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl animate-bounce">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tight mb-2">¡Pago Exitoso!</h3>
                <p className="text-emerald-100 font-medium text-sm mb-4">El abono ha sido registrado en la base de datos.</p>
                <div className="bg-white/20 px-6 py-2 rounded-xl backdrop-blur-sm">
                    <p className="text-2xl font-black">${amount.toLocaleString()}</p>
                </div>
            </div>
        )}

        <header className="bg-slate-900 dark:bg-slate-800 p-6 text-center relative shrink-0">
          <button onClick={onClose} disabled={status === 'processing'} className="absolute right-5 top-5 text-slate-500 hover:text-white transition disabled:opacity-50">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 px-3 py-1 rounded-full mb-3 border border-indigo-500/30">
            <span className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em]">#{credit.id.slice(-6).toUpperCase()}</span>
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">{t('payment_modal')}</h3>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">{client.name}</p>
        </header>

        <div className="p-8 space-y-6">
          <div className="space-y-3">
             <div className="flex justify-between items-end px-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('value')}</label>
                <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase">Total: ${saldoTotal.toLocaleString()}</p>
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
                  disabled={status === 'processing'}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] pl-12 pr-6 py-6 font-black text-slate-800 dark:text-white text-4xl outline-none focus:border-indigo-500 focus:ring-8 focus:ring-indigo-50 dark:focus:ring-indigo-900 transition-all shadow-inner text-center disabled:opacity-50"
                  placeholder="0.00"
                />
             </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button 
              disabled={amount < 0 || status === 'processing'}
              onClick={handleSubmit} 
              className={`w-full font-black py-5 rounded-[2rem] shadow-2xl transition transform active:scale-95 uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2
                ${status === 'processing' ? 'bg-slate-400 cursor-wait text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white border-b-4 border-indigo-900'}
              `}
            >
              {status === 'processing' ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    GUARDANDO...
                  </>
              ) : t('register_payment')}
            </button>
            <button onClick={onClose} disabled={status === 'processing'} className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-400 font-black py-4 rounded-2xl transition uppercase tracking-widest text-[9px] border border-slate-200 dark:border-slate-700 disabled:opacity-50">{t('cancel')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientList;
