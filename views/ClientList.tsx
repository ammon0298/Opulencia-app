
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

  // LÓGICA DE SEMÁFORO ACTUALIZADA (Basada en Hitos de Cuota)
  const getCreditStatusInfo = (credit: Credit) => {
    if (credit.status === 'Lost') {
        return { isFinished: false, pendingCount: 0, status: 'perdidos', isCurrentlyOverdue: false, isLost: true };
    }

    // 1. Calcular cuántas cuotas ENTERAS ha pagado el cliente con su dinero acumulado
    // Se usa un pequeño epsilon (0.1) para tolerar decimales flotantes
    const paidFullInstallments = Math.floor((credit.totalPaid + 0.1) / credit.installmentValue);
    
    const isFinished = paidFullInstallments >= credit.totalInstallments || credit.status === 'Completed';
    
    if (isFinished) {
         return { isFinished: true, pendingCount: 0, status: 'pagados', isCurrentlyOverdue: false, isLost: false };
    }

    // 2. Determinar la FECHA DE VENCIMIENTO de la SIGUIENTE cuota (la que toca pagar ahora)
    // Si pagó 0, la siguiente es la #1 (índice 0). Si pagó 1, la siguiente es la #2 (índice 1).
    const baseDateStr = credit.firstPaymentDate || credit.startDate;
    let nextInstallmentDueDate: Date;

    if (credit.frequency === 'Daily') {
        // addBusinessDays suma días hábiles saltando domingos
        // Si firstPaymentDate es Lunes y pagó 0 cuotas, add(0) devuelve Lunes.
        // Si pagó 1 cuota, add(1) devuelve Martes.
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

    // 3. Comparar HOY vs LA FECHA DE LA SIGUIENTE CUOTA
    const todayDate = new Date(TODAY_STR + 'T00:00:00');
    
    // Normalizar horas para comparación pura de fecha
    nextInstallmentDueDate.setHours(0,0,0,0);
    todayDate.setHours(0,0,0,0);

    // ES MORA SOLAMENTE SI: HOY es ESTRICTAMENTE MAYOR que la fecha de vencimiento.
    // Ejemplo: Si vencía ayer (20) y hoy es (21) -> Mora.
    // Si vence hoy (21) y hoy es (21) -> Pendiente (Azul).
    // Si vence mañana (22) y hoy es (21) -> Al día (Azul).
    const isCurrentlyOverdue = todayDate > nextInstallmentDueDate;

    const pendingCount = credit.totalInstallments - paidFullInstallments;
    
    let status: FilterType = 'todos';
    if (isCurrentlyOverdue) status = 'mora';
    else if (pendingCount === 1) status = 'falta1';
    else if (pendingCount > 0 && pendingCount <= 3) status = 'falta3';

    return { isFinished, pendingCount, status, isCurrentlyOverdue, isLost: false };
  };

  const creditItems = useMemo(() => {
    return credits
      .map(credit => {
        const client = clients.find(c => c.id === credit.clientId);
        if (!client) return null;
        
        const info = getCreditStatusInfo(credit);
        
        const route = routes.find(r => r.id === client.routeId);
        const routeName = route ? route.name : 'Sin Ruta';
        const routeCollectors = users.filter(u => u.role === UserRole.COLLECTOR && u.routeIds.includes(client.routeId));
        const collectorName = routeCollectors.length > 0 ? routeCollectors[0].name : 'Sin asignar';
        
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


  const openPaymentModal = (client: Client, credit: Credit) => {
    if (credit.status === 'Lost') return;
    if (credit.totalPaid >= credit.totalToPay) return;
    setPaymentModal({ isOpen: true, client, credit });
    setPaymentAmount(0); 
  };

  const handleConfirmPayment = () => {
    if (paymentModal.credit && paymentAmount >= 0) {
      onPayment(paymentModal.credit.id, paymentAmount);
      setPaymentModal({ isOpen: false });
    }
  };

  const handleQuickPayment = (creditId: string, amount: number) => {
    onPayment(creditId, amount);
  };

  const getCardStyle = (isFinished: boolean, status: FilterType) => {
    if (status === 'perdidos') return 'bg-rose-50 border-rose-300 shadow-md opacity-80';
    if (isFinished) return 'bg-emerald-100/90 border-emerald-500 shadow-md shadow-emerald-100/50';
    if (status === 'mora') return 'bg-purple-100 border-purple-500 shadow-md shadow-purple-100/50';
    if (status === 'falta1') return 'bg-rose-100 border-rose-500 shadow-md shadow-rose-100/50';
    if (status === 'falta3') return 'bg-amber-100 border-amber-500 shadow-md shadow-amber-100/50';
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
          <div className="relative">
            <input 
              type="text" 
              placeholder={t('search')} 
              className="pl-12 pr-12 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full md:w-80 shadow-sm focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900 outline-none font-bold text-slate-700 dark:text-slate-200 transition-all"
              value={searchTerm}
              onChange={handleSearchInput}
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 absolute left-4 top-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </header>

        <div className="flex flex-wrap gap-3 mb-8">
          <FilterBadge color="bg-indigo-500" label={t('active_credits')} active={activeFilter === 'todos'} onClick={() => setActiveFilter('todos')} />
          <FilterBadge color="bg-purple-600" label={t('mora_credits')} active={activeFilter === 'mora'} onClick={() => setActiveFilter('mora')} />
          <FilterBadge color="bg-rose-600" label={t('missing_1')} active={activeFilter === 'falta1'} onClick={() => setActiveFilter('falta1')} />
          <FilterBadge color="bg-amber-500" label={t('missing_3')} active={activeFilter === 'falta3'} onClick={() => setActiveFilter('falta3')} />
        </div>

        {activeFilter !== 'pagados' && activeFilter !== 'perdidos' && (
            <section className="space-y-4">
            <div className="flex items-center gap-3 px-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t('pending_portfolio')}</h3>
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
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
                    t={t}
                />
                ))}
                {activeCreditItems.length === 0 && <div className="py-10 text-center text-slate-400 italic text-sm">No hay créditos activos para este filtro.</div>}
            </div>
            </section>
        )}

        {(activeFilter === 'todos' || activeFilter === 'pagados') && completedCreditItems.length > 0 && (
          <section className="space-y-4 mt-10">
            <div className="flex items-center gap-3 px-2">
              <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em]">{t('settled_credits')}</h3>
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
                  t={t}
                />
              ))}
            </div>
          </section>
        )}

        {(activeFilter === 'todos' || activeFilter === 'perdidos') && lostCreditItems.length > 0 && (
          <section className="space-y-4 mt-10">
            <div className="flex items-center gap-3 px-2">
              <h3 className="text-xs font-black text-rose-600 uppercase tracking-[0.2em]">{t('lost_credits')}</h3>
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
                  t={t}
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

  // CÁLCULO DE DEUDA DE MORA (Sincronizado con lógica de Hitos de Cuota)
  let amountStrictlyExpected = 0;
  const todayDate = new Date(TODAY_STR + 'T00:00:00');
  const baseDateStr = credit.firstPaymentDate || credit.startDate;
  const baseDate = new Date(baseDateStr + 'T00:00:00');
  
  let expectedInstallments = 0;

  if (baseDate > todayDate) {
      // Si la fecha de inicio es futura, no se espera nada
      expectedInstallments = 0;
  } else if (credit.frequency === 'Daily') {
     // Cuántos días hábiles han pasado hasta AYER (fecha de corte de mora)
     // Si hoy es Martes (1 día después de Lunes), countBusinessDays(Lunes, Martes) = 1.
     // Eso significa que debió pagar 1 cuota ayer.
     expectedInstallments = countBusinessDays(baseDateStr, TODAY_STR);
  } else {
     const diffDays = Math.floor((todayDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
     let cycleDays = 30;
     if (credit.frequency === 'Weekly') cycleDays = 7;
     
     // Cuántos ciclos COMPLETOS han pasado hasta hoy
     expectedInstallments = Math.floor(diffDays / cycleDays);
  }
  
  // Limitar esperado al total de cuotas del crédito
  const cappedExpectedInstallments = Math.min(credit.totalInstallments, expectedInstallments);
  amountStrictlyExpected = cappedExpectedInstallments * credit.installmentValue;
  
  // Mora es la diferencia entre lo que se debió acumular hasta AYER y lo que se ha pagado realmente
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
                        <div className="flex flex-col items-center justify-center p-2 bg-slate-50/50 dark:bg-slate-800/50 border border-transparent rounded-xl opacity-50 cursor-default">
                            <span className="text-[8px] font-black uppercase text-slate-300">AL DÍA</span>
                            <span className="text-sm font-black text-slate-300">--</span>
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
  const saldoTotal = Math.max(0, credit.totalToPay - credit.totalPaid);

  return (
    <div className="fixed inset-0 w-full h-full bg-slate-900/90 flex items-center justify-center p-4 z-[9999] backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm shadow-2xl border border-white dark:border-slate-700 animate-slideUp flex flex-col overflow-hidden">
        <header className="bg-slate-900 dark:bg-slate-800 p-6 text-center relative shrink-0">
          <button onClick={onClose} className="absolute right-5 top-5 text-slate-500 hover:text-white transition">
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
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] pl-12 pr-6 py-6 font-black text-slate-800 dark:text-white text-4xl outline-none focus:border-indigo-500 focus:ring-8 focus:ring-indigo-50 dark:focus:ring-indigo-900 transition-all shadow-inner text-center"
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
              {t('register_payment')}
            </button>
            <button onClick={onClose} className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-400 font-black py-4 rounded-2xl transition uppercase tracking-widest text-[9px] border border-slate-200 dark:border-slate-700">{t('cancel')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientList;
