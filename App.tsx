
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Client, Credit, Route, Expense, Payment, RouteTransaction, UserRole, Subscription } from './types';
import Layout from './components/Layout';
import LandingPage from './views/LandingPage';
import AuthView from './views/AuthView';
import AdminDashboard from './views/AdminDashboard';
import CollectorDashboard from './views/CollectorDashboard';
import ClientManagement from './views/ClientManagement';
import NewCredit from './views/NewCredit';
import ExpensesView from './views/ExpensesView';
import RoutingView from './views/RoutingView';
import LiquidationView from './views/LiquidationView';
import UserManagement from './views/UserManagement';
import RouteManagement from './views/RouteManagement';
import ClientDetails from './views/ClientDetails';
import CreditVisits from './views/CreditVisits';
import EditClient from './views/EditClient';
import NewClient from './views/NewClient';
import UserProfile from './views/UserProfile';
import ClientList from './views/ClientList';
import { supabase } from './lib/supabase';
import { verifyPassword, hashPassword, generateOTP } from './utils/security';
import { GlobalProvider } from './contexts/GlobalContext';
import { sendLicenseRequestEmail, sendOTPEmail } from './utils/email';
import { TODAY_STR, getCurrentLocalTimestamp } from './constants';

// UUID v4 check (suficiente para nuestro caso)
const isUuid = (v: string) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

// Genera UUID (browser)
const newUuid = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

// Mapea IDs “temporales” (c123, r123, tx_123) a UUID reales
const useTempIdMap = () => {
  const mapRef = useRef<Map<string, string>>(new Map());

  const normalizeId = (id: string) => {
    if (!id) return newUuid();
    if (isUuid(id)) return id;
    const m = mapRef.current.get(id);
    if (m) return m;
    const gen = newUuid();
    mapRef.current.set(id, gen);
    return gen;
  };

  const normalizeMaybeRouteId = (routeId: string) => normalizeId(routeId);

  return { mapRef, normalizeId, normalizeMaybeRouteId };
};

// ---- DB -> App ----
const dbToRoute = (r: any): Route => ({
  id: r.id,
  businessId: r.business_id,
  name: r.name
});

const dbToClient = (c: any): Client => ({
  id: c.id,
  businessId: c.business_id,
  routeId: c.route_id,
  dni: c.dni,
  name: c.name,
  alias: c.alias ?? '',
  address: c.address ?? '',
  phone: c.phone ?? '',
  order: c.visit_order ?? 0,
  status: c.status,
  coordinates: c.lat && c.lng ? { lat: c.lat, lng: c.lng } : undefined,
  city: c.city ?? '',
  country: c.country ?? '',
  phoneCode: c.phone_code ?? ''
});

const dbToCredit = (c: any): Credit => ({
  id: c.id,
  businessId: c.business_id,
  clientId: c.client_id,
  capital: Number(c.capital),
  totalToPay: Number(c.total_to_pay),
  installmentValue: Number(c.installment_value),
  totalInstallments: c.total_installments,
  paidInstallments: c.paid_installments ?? 0,
  totalPaid: Number(c.total_paid ?? 0),
  frequency: c.frequency,
  startDate: c.start_date,
  firstPaymentDate: c.first_payment_date || c.start_date,
  isOverdue: false, // Se recalcula en frontend
  status: c.status
});

const dbToPayment = (p: any): Payment => ({
  id: p.id,
  businessId: p.business_id,
  creditId: p.credit_id,
  date: p.payment_date,
  amount: Number(p.amount),
  note: p.note ?? ''
});

const dbToExpense = (e: any): Expense => ({
  id: e.id,
  businessId: e.business_id,
  date: e.expense_date ?? e.created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  routeId: e.route_id,
  value: Number(e.amount),
  name: e.name,
  type: e.category,
  concept: e.concept ?? '',
  proofImage: e.proof_image_url ?? ''
});

const dbToTx = (t: any): RouteTransaction => ({
  id: t.id,
  businessId: t.business_id,
  routeId: t.route_id,
  date: t.transaction_date ?? t.created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  amount: Number(t.amount),
  type: t.type,
  description: t.description ?? ''
});

const dbToUser = (u: any): User => ({
  id: u.id,
  businessId: u.business_id,
  username: u.username,
  name: u.name,
  dni: u.dni,
  phone: u.phone ?? '',
  address: u.address ?? '',
  role: u.role as UserRole,
  routeIds: u.route_ids ?? [],
  status: u.status,
  businessName: u.business_name ?? '',
  country: u.country ?? '',
  city: u.city ?? '',
  currentLocation: (u.lat !== null && u.lat !== undefined && u.lng !== null && u.lng !== undefined) ? { 
      lat: Number(u.lat), 
      lng: Number(u.lng), 
      timestamp: u.last_location_at
  } : undefined
});

const dbToSubscription = (s: any): Subscription => ({
  id: s.id,
  businessId: s.business_id,
  planName: s.plan_name,
  maxRoutes: s.max_routes,
  maxCollectors: s.max_collectors,
  startDate: s.start_date,
  endDate: s.end_date
});

// ---- App -> DB ----
const routeToDb = (r: Route) => ({
  id: r.id,
  business_id: r.businessId,
  name: r.name
});

const clientToDb = (c: Client) => ({
  id: c.id,
  business_id: c.businessId,
  route_id: c.routeId,
  dni: c.dni,
  name: c.name,
  alias: c.alias || null,
  address: c.address || null,
  phone: c.phone || null,
  visit_order: c.order ?? 0,
  status: c.status,
  lat: c.coordinates?.lat || null,
  lng: c.coordinates?.lng || null,
  city: c.city || null,
  country: c.country || null,
  phone_code: c.phoneCode || null
});

const creditToDb = (c: Credit) => ({
  business_id: c.businessId,
  client_id: c.clientId,
  capital: c.capital,
  total_to_pay: c.totalToPay,
  installment_value: c.installmentValue,
  total_installments: c.totalInstallments,
  // Fix: use paidInstallments property correctly
  paid_installments: c.paidInstallments ?? 0,
  total_paid: c.totalPaid ?? 0,
  frequency: c.frequency,
  start_date: c.startDate,
  first_payment_date: c.firstPaymentDate,
  status: c.status
});

const paymentToDb = (p: Payment) => ({
  business_id: p.businessId,
  credit_id: p.creditId,
  amount: p.amount,
  payment_date: p.date,
  note: p.note || null
});

const expenseToDb = (e: Expense) => ({
  id: e.id,
  business_id: e.businessId,
  route_id: e.routeId,
  name: e.name,
  amount: e.value,
  category: e.type,
  concept: e.concept || null,
  proof_image_url: e.proofImage || null,
  expense_date: e.date
});

const txToDb = (t: RouteTransaction) => ({
  id: t.id,
  business_id: t.businessId,
  route_id: t.routeId,
  amount: t.amount,
  type: t.type,
  description: t.description || null,
  transaction_date: t.date
});

const AppContent: React.FC = () => {
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [transactions, setTransactions] = useState<RouteTransaction[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  // UI State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('landing');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('all');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Recovery State
  const [recoveryData, setRecoveryData] = useState<{email: string, otp: string} | null>(null);

  // Selection State
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedCreditId, setSelectedCreditId] = useState<string | null>(null);
  const [creditsFilter, setCreditsFilter] = useState<string>('');

  const { normalizeId } = useTempIdMap();

  const loadBusinessData = async (businessId: string) => {
    try {
      const [
        { data: clientsData, error: cErr },
        { data: creditsData, error: crErr },
        { data: routesData, error: rErr },
        { data: expensesData, error: eErr },
        { data: paymentsData, error: pErr },
        { data: usersData, error: uErr },
        { data: transData, error: tErr },
        { data: subData, error: sErr }
      ] = await Promise.all([
        supabase.from('clients').select('*').eq('business_id', businessId),
        supabase.from('credits').select('*').eq('business_id', businessId),
        supabase.from('routes').select('*').eq('business_id', businessId),
        supabase.from('expenses').select('*').eq('business_id', businessId),
        supabase.from('payments').select('*').eq('business_id', businessId),
        supabase.from('users').select('*').eq('business_id', businessId),
        supabase.from('route_transactions').select('*').eq('business_id', businessId),
        supabase.from('business_subscriptions').select('*').eq('business_id', businessId).maybeSingle()
      ]);

      if (cErr || crErr || rErr || eErr || pErr || uErr || tErr || sErr) {
        console.error('Load errors:', { cErr, crErr, rErr, eErr, pErr, uErr, tErr, sErr });
      }

      if (clientsData) setClients(clientsData.map(dbToClient));
      if (routesData) setRoutes(routesData.map(dbToRoute));
      if (expensesData) setExpenses(expensesData.map(dbToExpense));
      if (usersData) setUsers(usersData.map(dbToUser));
      if (transData) setTransactions(transData.map(dbToTx));
      if (subData) setSubscription(dbToSubscription(subData));

      // CORRECCIÓN CRÍTICA: Calcular totalPaid real sumando los pagos
      // Esto soluciona el bug de créditos que aparecen en mora a pesar de tener pagos,
      // ya que la columna total_paid en la tabla credits podría no estar sincronizada.
      const mappedPayments = paymentsData ? paymentsData.map(dbToPayment) : [];
      setPayments(mappedPayments);

      if (creditsData) {
          const mappedCredits = creditsData.map(c => {
              const appCredit = dbToCredit(c);
              const realTotalPaid = mappedPayments
                  .filter(p => p.creditId === appCredit.id)
                  .reduce((sum, p) => sum + p.amount, 0);
              
              // Usar el valor calculado para garantizar consistencia en la UI
              return { ...appCredit, totalPaid: realTotalPaid };
          });
          setCredits(mappedCredits);
      }

      // VALIDACIÓN DE SUSCRIPCIÓN ACTIVA AL CARGAR
      if (subData) {
          const endDate = new Date(subData.end_date);
          const now = new Date(TODAY_STR); // Comparar con fecha local
          if (now > endDate) {
              return 'EXPIRED';
          }
      } else {
          console.warn("No active subscription record found.");
      }

      return 'OK';

    } catch (err) {
      console.error('Error cargando datos:', err);
      return 'ERROR';
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const savedUser = localStorage.getItem('op_user');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          
          const status = await loadBusinessData(user.businessId);
          
          if (status === 'EXPIRED') {
              setAuthError('SU LICENCIA HA VENCIDO. Contacte a soporte para renovar.');
              localStorage.removeItem('op_user');
              setCurrentUser(null);
              setCurrentView('auth');
          } else {
              setCurrentUser(user);
              if (user.role === UserRole.COLLECTOR && user.routeIds.length > 0) {
                 setSelectedRouteId(user.routeIds[0]);
              } else {
                 setSelectedRouteId('all');
              }
              setCurrentView(user.role === 'ADMIN' ? 'admin_dashboard' : 'collector_dashboard');
          }
        } catch (e) {
          localStorage.removeItem('op_user');
        }
      }
      setIsInitializing(false);
    };
    checkSession();
  }, []);

  // SISTEMA DE RASTREO GPS AUTOMÁTICO (Heartbeat)
  useEffect(() => {
    let gpsInterval: any;

    const trackLocation = async () => {
        if (!currentUser || currentUser.role !== UserRole.COLLECTOR || !navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            const now = new Date().toISOString();

            try {
                await supabase.from('users').update({
                    lat: latitude,
                    lng: longitude,
                    last_location_at: now
                }).eq('id', currentUser.id);
            } catch (err) {
                console.error("Error enviando GPS:", err);
            }
        }, (error) => {
            console.warn("GPS no disponible:", error.message);
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    };

    if (currentUser && currentUser.role === UserRole.COLLECTOR) {
        trackLocation();
        gpsInterval = setInterval(trackLocation, 300000);
    }

    return () => {
        if (gpsInterval) clearInterval(gpsInterval);
    };
  }, [currentUser]);

  const handleLogin = async (u: string, p: string) => {
    setAuthError(null);
    setIsInitializing(true);
    const cleanUsername = u.trim().toLowerCase();

    try {
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (error) {
        setAuthError(`Error de servidor: ${error.message}.`);
        setIsInitializing(false);
        return;
      }

      if (!dbUser) {
        setAuthError('El usuario no existe.');
        setIsInitializing(false);
        return;
      }

      const isValid = verifyPassword(p, dbUser.password_hash);

      if (isValid) {
        const status = await loadBusinessData(dbUser.business_id);
        
        if (status === 'EXPIRED') {
            setAuthError('LICENCIA VENCIDA. El acceso al sistema está restringido hasta renovar su plan.');
            setIsInitializing(false);
            return;
        }

        const mappedUser = dbToUser(dbUser);
        setCurrentUser(mappedUser);
        localStorage.setItem('op_user', JSON.stringify(mappedUser));
        
        if (mappedUser.role === UserRole.COLLECTOR && mappedUser.routeIds.length > 0) {
            setSelectedRouteId(mappedUser.routeIds[0]);
        } else {
            setSelectedRouteId('all');
        }

        setCurrentView(mappedUser.role === UserRole.ADMIN ? 'admin_dashboard' : 'collector_dashboard');
      } else {
        setAuthError('Contraseña incorrecta.');
      }
    } catch (err: any) {
      setAuthError(`Error de conexión: ${err.message}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleRegister = async (data: any) => {
    try {
        // Modo "Solicitud de Licencia":
        // Solo se envía el correo al administrador del sistema. 
        // NO se crea el usuario automáticamente en la base de datos.
        const emailSent = await sendLicenseRequestEmail(data);
        
        if (!emailSent) {
            throw new Error("No se pudo enviar el correo de solicitud. Por favor verifique su conexión.");
        }

        return true;
    } catch (e: any) {
        console.error("License Request Error:", e);
        setAuthError(`Error al enviar solicitud: ${e.message || 'Intente nuevamente'}`);
        return false;
    }
  }

  const handleRecoverInitiate = async (email: string): Promise<boolean> => {
    try {
        const cleanEmail = email.trim().toLowerCase();
        const { data: user, error } = await supabase
            .from('users')
            .select('name')
            .ilike('username', cleanEmail)
            .maybeSingle();

        if (error) {
            console.error("Error buscando usuario:", error);
            return false;
        }

        if (!user) return false;

        const otp = generateOTP();
        const emailSent = await sendOTPEmail(cleanEmail, user.name, otp);

        if (emailSent) {
            setRecoveryData({ email: cleanEmail, otp });
            return true;
        }
        return false;
    } catch (err) {
        console.error("Critical recovery error:", err);
        return false;
    }
  };

  const handleRecoverVerify = (code: string): boolean => {
    if (!recoveryData) return false;
    return recoveryData.otp === code;
  };

  const handleRecoverReset = async (newPass: string) => {
    if (!recoveryData) return;
    try {
        const newHash = hashPassword(newPass);
        const { error } = await supabase
            .from('users')
            .update({ password_hash: newHash })
            .ilike('username', recoveryData.email);
        
        if (error) throw error;
        
        setNotification({ type: 'success', message: 'Contraseña restablecida con éxito. Inicie sesión.' });
        setRecoveryData(null);
        setCurrentView('auth');
    } catch (err: any) {
        console.error("Reset error:", err);
        setAuthError("Error actualizando la contraseña.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('op_user');
    setCurrentUser(null);
    setCurrentView('landing');
  };

  const handleNavigation = (viewName: string) => {
    if (viewName === 'credits') setCreditsFilter('');
    setCurrentView(viewName);
  };

  const filteredData = useMemo(() => {
    const allowedRouteIds = currentUser?.role === UserRole.ADMIN 
        ? routes.map(r => r.id) 
        : (currentUser?.routeIds || []);

    const routeFilter = (itemId: string) => {
        const isAllowed = allowedRouteIds.includes(itemId);
        const isSelected = selectedRouteId === 'all' ? true : itemId === selectedRouteId;
        return isAllowed && isSelected;
    };

    return {
      clients: clients
        .filter((c) => routeFilter(c.routeId))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      credits: credits.filter((cr) => {
        const c = clients.find((cl) => cl.id === cr.clientId);
        return c && routeFilter(c.routeId);
      }),
      expenses: expenses.filter((e) => routeFilter(e.routeId)),
      payments: payments.filter((p) => {
        const cr = credits.find((c) => c.id === p.creditId);
        const c = cr ? clients.find((cl) => cl.id === cr.clientId) : null;
        return !!(c && routeFilter(c.routeId));
      })
    };
  }, [clients, credits, expenses, payments, selectedRouteId, currentUser, routes]);

  const visibleRoutes = useMemo(() => {
      if (!currentUser) return [];
      if (currentUser.role === UserRole.ADMIN) return routes;
      return routes.filter(r => currentUser.routeIds.includes(r.id));
  }, [routes, currentUser]);

  const handleSaveClientBulk = async (updatedClients: Client[]) => {
    if (!currentUser) return;
    const normalized = updatedClients.map((c) => {
      const fixedId = isUuid(c.id) ? c.id : normalizeId(c.id);
      const fixedRoute = isUuid(c.routeId) ? c.routeId : normalizeId(c.routeId);
      return { ...c, id: fixedId, routeId: fixedRoute, businessId: currentUser.businessId };
    });

    setClients((prev) => {
      const newMap = new Map(prev.map((c) => [c.id, c]));
      normalized.forEach((c) => newMap.set(c.id, c));
      return Array.from(newMap.values());
    });

    const payload = normalized.map(clientToDb);
    const { error } = await supabase.from('clients').upsert(payload, { onConflict: 'id' });
    if (error) {
        console.error("Save Error:", error);
        await loadBusinessData(currentUser.businessId);
    }
  };

  const handleRefreshData = async () => {
    if (currentUser) {
        await loadBusinessData(currentUser.businessId);
    }
  };

  const persistRouteTransaction = async (t: RouteTransaction) => {
    if (!currentUser) return;
    const fixed: RouteTransaction = {
      ...t,
      id: isUuid(t.id) ? t.id : normalizeId(t.id),
      routeId: isUuid(t.routeId) ? t.routeId : normalizeId(t.routeId),
      businessId: currentUser.businessId
    };
    await supabase.from('route_transactions').insert(txToDb(fixed));
    await loadBusinessData(currentUser.businessId);
  };

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  useEffect(() => {
      if (notification) {
          const timer = setTimeout(() => setNotification(null), 4000);
          return () => clearTimeout(timer);
      }
  }, [notification]);

  const renderContent = () => {
    if (!currentUser) return null;

    switch (currentView) {
      case 'admin_dashboard':
        return <AdminDashboard navigate={handleNavigation} user={currentUser} routes={visibleRoutes} selectedRouteId={selectedRouteId} stats={{ clients: filteredData.clients, credits: filteredData.credits, expenses: filteredData.expenses, payments: filteredData.payments }} subscription={subscription} />;
      case 'collector_dashboard':
        return <CollectorDashboard navigate={handleNavigation} user={currentUser} routes={visibleRoutes} stats={{ clients: filteredData.clients, credits: filteredData.credits, expenses: filteredData.expenses, payments: filteredData.payments }} />;
      case 'credits':
        // FIX: Use getCurrentLocalTimestamp() for payment date to respect device local time instead of UTC
        return <ClientList clients={filteredData.clients} credits={filteredData.credits} users={users} user={currentUser} routes={visibleRoutes} initialSearchTerm={creditsFilter} onSearchChange={setCreditsFilter} onPayment={async (cId, amt) => { const pay: Payment = { id: newUuid(), businessId: currentUser.businessId, creditId: cId, date: getCurrentLocalTimestamp(), amount: amt }; await supabase.from('payments').insert(paymentToDb(pay)); await loadBusinessData(currentUser.businessId); }} onViewDetails={(cId) => { setSelectedCreditId(cId); setCurrentView('credit_details'); }} onViewVisits={(cId) => { setSelectedCreditId(cId); setCurrentView('credit_visits'); }} onEditClient={(clientId) => { setSelectedClientId(clientId); setCurrentView('edit_client'); }} />;
      case 'client_management':
        return (
          <ClientManagement 
            clients={filteredData.clients} 
            allClients={clients} 
            routes={visibleRoutes} 
            user={currentUser} 
            credits={filteredData.credits} 
            payments={filteredData.payments}
            selectedRouteId={selectedRouteId} 
            onEditClient={(id) => { setSelectedClientId(id); setCurrentView('edit_client'); }} 
            onDeleteClient={() => {}} 
            onNewClient={() => setCurrentView('new_client')} 
            onUpdateClients={handleSaveClientBulk} 
          />
        );
      case 'edit_client': {
        const clientToEdit = clients.find((c) => c.id === selectedClientId);
        const activeCredit = credits.find((c) => c.clientId === selectedClientId && c.status === 'Active');
        return <EditClient client={clientToEdit} allClients={clients} routes={visibleRoutes} credit={activeCredit} currentUser={currentUser} onSave={(updatedList) => { handleSaveClientBulk(updatedList); setCurrentView('client_management'); }} onCancel={() => setCurrentView('client_management')} />;
      }
      case 'new_client':
        return <NewClient routes={visibleRoutes} clients={clients} currentUser={currentUser} onSave={(newClients) => { handleSaveClientBulk(newClients); setCurrentView('client_management'); }} onCancel={() => setCurrentView('client_management')} />;
      case 'new_credit':
        return <NewCredit clients={filteredData.clients} user={currentUser} allCredits={credits} allExpenses={expenses} allPayments={payments} allTransactions={transactions} routes={visibleRoutes} onSave={async (_cl, cr) => { const payload = creditToDb({ ...cr, businessId: currentUser.businessId }); await supabase.from('credits').insert(payload); await loadBusinessData(currentUser.businessId); setCurrentView('credits'); }} />;
      case 'expenses':
        return <ExpensesView expenses={filteredData.expenses} routes={visibleRoutes} user={currentUser} onAdd={async (e) => { const fixed: Expense = { ...e, id: isUuid(e.id) ? e.id : normalizeId(e.id), routeId: isUuid(e.routeId) ? e.routeId : normalizeId(e.routeId), businessId: currentUser.businessId }; await supabase.from('expenses').insert(expenseToDb(fixed)); await loadBusinessData(currentUser.businessId); }} onDelete={async (id) => { await supabase.from('expenses').delete().eq('id', id); setExpenses((prev) => prev.filter((e) => e.id !== id)); }} />;
      case 'routing':
        return <RoutingView clients={filteredData.clients} setClients={setClients} selectedRouteId={selectedRouteId} credits={credits} payments={payments} onGoToCredit={(cid) => { setCreditsFilter(cid); setCurrentView('credits'); }} />;
      case 'liquidation':
        return <LiquidationView selectedRouteId={selectedRouteId} credits={credits} expenses={expenses} payments={payments} clients={clients} routes={visibleRoutes} transactions={transactions} />;
      case 'users':
        return <UserManagement users={users} routes={routes} currentUser={currentUser} onSave={handleRefreshData} subscription={subscription} />;
      case 'routes_mgmt':
        return <RouteManagement routes={routes} users={users} user={currentUser} transactions={transactions} onSave={handleRefreshData} onAddTransaction={persistRouteTransaction} subscription={subscription} />;
      case 'profile':
        return <UserProfile user={currentUser} users={users} onUpdate={(u) => setCurrentUser(u)} />;
      case 'credit_details': {
        const crDetails = credits.find((c) => c.id === selectedCreditId);
        const clDetails = crDetails ? clients.find((c) => c.id === crDetails.clientId) : undefined;
        return <ClientDetails client={clDetails} credit={crDetails} payments={payments.filter((p) => p.creditId === selectedCreditId)} onBack={() => setCurrentView('credits')} onMarkAsLost={async (cid) => { await supabase.from('credits').update({ status: 'Lost' }).eq('id', cid); await loadBusinessData(currentUser.businessId); setCurrentView('credits'); }} />;
      }
      case 'credit_visits': {
        const crVisits = credits.find((c) => c.id === selectedCreditId);
        const clVisits = crVisits ? clients.find((c) => c.id === crVisits.clientId) : undefined;
        return <CreditVisits client={clVisits} credit={crVisits} payments={payments.filter((p) => p.creditId === selectedCreditId)} onBack={() => setCurrentView('credits')} onUpdatePayment={async (pid, amt) => { await supabase.from('payments').update({ amount: amt }).eq('id', pid); await loadBusinessData(currentUser.businessId); }} />;
      }
      default:
        return <AdminDashboard navigate={handleNavigation} user={currentUser} routes={visibleRoutes} selectedRouteId={selectedRouteId} stats={{ clients: filteredData.clients, credits: filteredData.credits, expenses: filteredData.expenses, payments: filteredData.payments }} subscription={subscription} />;
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white text-2xl font-black animate-bounce shadow-2xl">$</div>
          <p className="text-white font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Iniciando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    if (currentView === 'auth' || currentView === 'register') {
      return <AuthView 
        mode={currentView === 'register' ? 'register' : 'login'} 
        error={authError} 
        successMessage={notification?.type === 'success' ? notification.message : null}
        onLogin={handleLogin} 
        onRegister={handleRegister} 
        onBack={() => { setAuthError(null); setCurrentView('landing'); }} 
        onSwitchMode={(m) => { setAuthError(null); setCurrentView(m); }} 
        onRecoverInitiate={handleRecoverInitiate}
        onRecoverVerify={handleRecoverVerify}
        onRecoverReset={handleRecoverReset}
        onClearError={() => setAuthError(null)} 
      />;
    }
    return <LandingPage onLogin={() => setCurrentView('auth')} onRegister={() => setCurrentView('register')} />;
  }

  return (
    <Layout user={currentUser} onLogout={handleLogout} navigateTo={handleNavigation} currentView={currentView} routes={routes} selectedRouteId={selectedRouteId} onRouteSelect={setSelectedRouteId}>
      {renderContent()}
    </Layout>
  );
};

// Wrap the entire app in GlobalProvider to ensure context availability for LandingPage
const App: React.FC = () => {
  return (
    <GlobalProvider>
      <AppContent />
    </GlobalProvider>
  );
};

export default App;
