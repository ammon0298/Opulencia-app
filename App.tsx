import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Client, Credit, Route, Expense, Payment, RouteTransaction, UserRole } from './types';
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
import { verifyPassword } from './utils/security';

/**
 * =========================================================
 * Helpers: IDs, mappers App <-> DB (camelCase <-> snake_case)
 * =========================================================
 */

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
  status: c.status
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
  isOverdue: false,
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
  status: u.status
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
  status: c.status
});

const creditToDb = (c: Credit) => ({
  // OJO: credits.id en tu UI no es UUID (CR-...), así que lo dejamos a la BD
  business_id: c.businessId,
  client_id: c.clientId,
  capital: c.capital,
  total_to_pay: c.totalToPay,
  installment_value: c.installmentValue,
  total_installments: c.totalInstallments,
  paid_installments: c.paidInstallments ?? 0,
  total_paid: c.totalPaid ?? 0,
  frequency: c.frequency,
  start_date: c.startDate,
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

const userToDb = (u: User) => ({
  id: u.id,
  business_id: u.businessId,
  username: u.username,
  // password_hash se gestiona aparte cuando se crea/actualiza password
  name: u.name,
  dni: u.dni,
  phone: u.phone || null,
  address: u.address || null,
  role: u.role,
  route_ids: u.routeIds ?? [],
  status: u.status
});

const App: React.FC = () => {
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [transactions, setTransactions] = useState<RouteTransaction[]>([]);

  // UI State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('landing');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('all');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

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
        { data: transData, error: tErr }
      ] = await Promise.all([
        supabase.from('clients').select('*').eq('business_id', businessId),
        supabase.from('credits').select('*').eq('business_id', businessId),
        supabase.from('routes').select('*').eq('business_id', businessId),
        supabase.from('expenses').select('*').eq('business_id', businessId),
        supabase.from('payments').select('*').eq('business_id', businessId),
        supabase.from('users').select('*').eq('business_id', businessId),
        supabase.from('route_transactions').select('*').eq('business_id', businessId)
      ]);

      // Log técnico (no rompe UX)
      if (cErr || crErr || rErr || eErr || pErr || uErr || tErr) {
        console.error('Load errors:', { cErr, crErr, rErr, eErr, pErr, uErr, tErr });
      }

      if (clientsData) setClients(clientsData.map(dbToClient));
      if (creditsData) setCredits(creditsData.map(dbToCredit));
      if (routesData) setRoutes(routesData.map(dbToRoute));
      if (expensesData) setExpenses(expensesData.map(dbToExpense));
      if (paymentsData) setPayments(paymentsData.map(dbToPayment));
      if (usersData) setUsers(usersData.map(dbToUser));
      if (transData) setTransactions(transData.map(dbToTx));
    } catch (err) {
      console.error('Error cargando datos:', err);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const savedUser = localStorage.getItem('op_user');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          await loadBusinessData(user.businessId);
          setCurrentView(user.role === 'ADMIN' ? 'admin_dashboard' : 'collector_dashboard');
        } catch (e) {
          localStorage.removeItem('op_user');
        }
      }
      setIsInitializing(false);
    };
    checkSession();
  }, []);

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
        console.error('Supabase technical error:', error);
        setAuthError(
          `Error de servidor: ${error.message}. Verifique la configuración de red y CORS en Supabase.`
        );
        setIsInitializing(false);
        return;
      }

      if (!dbUser) {
        setAuthError('El usuario no existe. Verifique su correo o regístrese.');
        setIsInitializing(false);
        return;
      }

      const isValid = verifyPassword(p, dbUser.password_hash);

      if (isValid) {
        const mappedUser: User = {
          id: dbUser.id,
          businessId: dbUser.business_id,
          username: dbUser.username,
          name: dbUser.name,
          dni: dbUser.dni,
          phone: dbUser.phone || '',
          address: dbUser.address || '',
          role: dbUser.role as UserRole,
          routeIds: dbUser.route_ids || [],
          status: dbUser.status as any
        };

        setCurrentUser(mappedUser);
        localStorage.setItem('op_user', JSON.stringify(mappedUser));
        await loadBusinessData(mappedUser.businessId);
        setCurrentView(mappedUser.role === UserRole.ADMIN ? 'admin_dashboard' : 'collector_dashboard');
      } else {
        setAuthError('Contraseña incorrecta.');
      }
    } catch (err: any) {
      console.error('Login crash:', err);
      setAuthError(
        `Error de conexión: No se pudo contactar con Supabase. Esto suele ser un problema de la URL o permisos de CORS.`
      );
    } finally {
      setIsInitializing(false);
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
    const routeFilter = (id: string) => selectedRouteId === 'all' || id === selectedRouteId;
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
  }, [clients, credits, expenses, payments, selectedRouteId]);

  /**
   * ============
   * Persistencia
   * ============
   */

  // Guarda/actualiza clientes (y reordenamientos)
  const handleSaveClientBulk = async (updatedClients: Client[]) => {
    if (!currentUser) return;

    // Normaliza IDs y routeId (por si la ruta era temporal)
    const normalized = updatedClients.map((c) => {
      const fixedId = isUuid(c.id) ? c.id : normalizeId(c.id);
      const fixedRoute = isUuid(c.routeId) ? c.routeId : normalizeId(c.routeId);
      return { ...c, id: fixedId, routeId: fixedRoute, businessId: currentUser.businessId };
    });

    // UI inmediata
    setClients((prev) => {
      const newMap = new Map(prev.map((c) => [c.id, c]));
      normalized.forEach((c) => newMap.set(c.id, c));
      return Array.from(newMap.values());
    });

    // Persistencia en DB con snake_case
    const payload = normalized.map(clientToDb);
    const { error } = await supabase.from('clients').upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Error upsert clients:', error);
      // Refresca para no quedar “fantasma”
      await loadBusinessData(currentUser.businessId);
    }
  };

  // Persistencia de rutas (RouteManagement hoy solo hace setState)
  const persistRoutesFromSetter = async (
    setter: React.SetStateAction<Route[]>
  ) => {
    if (!currentUser) return;

    let nextRoutes: Route[] = [];
    setRoutes((prev) => {
      nextRoutes = typeof setter === 'function' ? (setter as any)(prev) : setter;
      // normaliza ids
      nextRoutes = nextRoutes.map((r) => ({
        ...r,
        id: isUuid(r.id) ? r.id : normalizeId(r.id),
        businessId: currentUser.businessId
      }));
      return nextRoutes;
    });

    // Persistir (upsert)
    const payload = nextRoutes.map(routeToDb);
    const { error } = await supabase.from('routes').upsert(payload, { onConflict: 'id' });
    if (error) console.error('Error upsert routes:', error);

    await loadBusinessData(currentUser.businessId);
  };

  // Persistencia de transacciones de ruta
  const persistRouteTransaction = async (t: RouteTransaction) => {
    if (!currentUser) return;

    const fixed: RouteTransaction = {
      ...t,
      id: isUuid(t.id) ? t.id : normalizeId(t.id),
      routeId: isUuid(t.routeId) ? t.routeId : normalizeId(t.routeId),
      businessId: currentUser.businessId
    };

    const { error } = await supabase.from('route_transactions').insert(txToDb(fixed));
    if (error) console.error('Error insert route_transactions:', error);

    await loadBusinessData(currentUser.businessId);
  };

  // Persistencia de usuarios/cobradores (UserManagement hoy solo hace setState)
  const persistUsersFromSetter = async (
    setter: React.SetStateAction<User[]>
  ) => {
    if (!currentUser) return;

    let nextUsers: User[] = [];
    setUsers((prev) => {
      nextUsers = typeof setter === 'function' ? (setter as any)(prev) : setter;
      nextUsers = nextUsers.map((u) => ({
        ...u,
        id: isUuid(u.id) ? u.id : normalizeId(u.id),
        businessId: currentUser.businessId
      }));
      return nextUsers;
    });

    // IMPORTANTE: tu UserManagement guarda el hash en u.password (NO en password_hash)
    // Aquí lo transformamos correctamente
    const payload = nextUsers.map((u) => {
      const base = userToDb(u);
      // si viene password (hash), lo mandamos como password_hash
      const withPass = (u as any).password ? { ...base, password_hash: (u as any).password } : base;
      return withPass;
    });

    const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
    if (error) console.error('Error upsert users:', error);

    await loadBusinessData(currentUser.businessId);
  };

  const renderContent = () => {
    if (!currentUser) return null;

    switch (currentView) {
      case 'admin_dashboard':
        return (
          <AdminDashboard
            navigate={handleNavigation}
            user={currentUser}
            routes={routes}
            selectedRouteId={selectedRouteId}
            stats={{ clients: filteredData.clients, credits: filteredData.credits, expenses: filteredData.expenses }}
          />
        );

      case 'collector_dashboard':
        return (
          <CollectorDashboard
            navigate={handleNavigation}
            user={currentUser}
            routes={routes}
            stats={{ clients: filteredData.clients, credits: filteredData.credits, expenses: filteredData.expenses }}
          />
        );

      case 'credits':
        return (
          <ClientList
            clients={filteredData.clients}
            credits={filteredData.credits}
            users={users}
            user={currentUser}
            routes={routes}
            initialSearchTerm={creditsFilter}
            onSearchChange={setCreditsFilter}
            onPayment={async (cId, amt) => {
              // cId ya es UUID (viene de credits list)
              const pay: Payment = {
                id: newUuid(), // local
                businessId: currentUser.businessId,
                creditId: cId,
                date: new Date().toISOString(),
                amount: amt
              };
              const { error } = await supabase.from('payments').insert(paymentToDb(pay));
              if (error) console.error('Error insert payment:', error);
              await loadBusinessData(currentUser.businessId);
            }}
            onViewDetails={(cId) => {
              setSelectedCreditId(cId);
              setCurrentView('credit_details');
            }}
            onViewVisits={(cId) => {
              setSelectedCreditId(cId);
              setCurrentView('credit_visits');
            }}
            onEditClient={(clientId) => {
              setSelectedClientId(clientId);
              setCurrentView('edit_client');
            }}
          />
        );

      case 'client_management':
        return (
          <ClientManagement
            clients={filteredData.clients}
            allClients={clients}
            routes={routes}
            user={currentUser}
            selectedRouteId={selectedRouteId}
            onEditClient={(id) => {
              setSelectedClientId(id);
              setCurrentView('edit_client');
            }}
            onDeleteClient={() => {}}
            onNewClient={() => setCurrentView('new_client')}
            onUpdateClients={handleSaveClientBulk}
          />
        );

      case 'edit_client': {
        const clientToEdit = clients.find((c) => c.id === selectedClientId);
        const activeCredit = credits.find((c) => c.clientId === selectedClientId && c.status === 'Active');
        return (
          <EditClient
            client={clientToEdit}
            allClients={clients}
            routes={routes}
            credit={activeCredit}
            currentUser={currentUser}
            onSave={(updatedList) => {
              handleSaveClientBulk(updatedList);
              setCurrentView('client_management');
            }}
            onCancel={() => setCurrentView('client_management')}
          />
        );
      }

      case 'new_client':
        return (
          <NewClient
            routes={routes}
            clients={clients}
            currentUser={currentUser}
            onSave={(newClients) => {
              handleSaveClientBulk(newClients);
              setCurrentView('client_management');
            }}
            onCancel={() => setCurrentView('client_management')}
          />
        );

      case 'new_credit':
        return (
          <NewCredit
            clients={filteredData.clients}
            user={currentUser}
            allCredits={credits}
            allExpenses={expenses}
            allPayments={payments}
            allTransactions={transactions}
            routes={routes}
            onSave={async (_cl, cr) => {
              // cr.id NO es UUID en tu UI, entonces NO lo enviamos; DB genera UUID
              const payload = creditToDb({ ...cr, businessId: currentUser.businessId });
              const { error } = await supabase.from('credits').insert(payload);
              if (error) console.error('Error insert credit:', error);
              await loadBusinessData(currentUser.businessId);
              setCurrentView('credits');
            }}
          />
        );

      case 'expenses':
        return (
          <ExpensesView
            expenses={filteredData.expenses}
            routes={routes}
            user={currentUser}
            onAdd={async (e) => {
              // Normaliza IDs
              const fixed: Expense = {
                ...e,
                id: isUuid(e.id) ? e.id : normalizeId(e.id),
                routeId: isUuid(e.routeId) ? e.routeId : normalizeId(e.routeId),
                businessId: currentUser.businessId
              };
              const { error } = await supabase.from('expenses').insert(expenseToDb(fixed));
              if (error) console.error('Error insert expense:', error);
              await loadBusinessData(currentUser.businessId);
            }}
            onDelete={async (id) => {
              // id es UUID (ya normalizado)
              const { error } = await supabase.from('expenses').delete().eq('id', id);
              if (error) console.error('Error delete expense:', error);
              setExpenses((prev) => prev.filter((e) => e.id !== id));
            }}
          />
        );

      case 'routing':
        return (
          <RoutingView
            clients={filteredData.clients}
            setClients={setClients}
            selectedRouteId={selectedRouteId}
            credits={credits}
            payments={payments}
            onGoToCredit={(cid) => {
              setCreditsFilter(cid);
              setCurrentView('credits');
            }}
          />
        );

      case 'liquidation':
        return (
          <LiquidationView
            selectedRouteId={selectedRouteId}
            credits={credits}
            expenses={expenses}
            payments={payments}
            clients={clients}
            routes={routes}
            transactions={transactions}
          />
        );

      case 'users':
        return <UserManagement users={users} routes={routes} currentUser={currentUser} onSave={persistUsersFromSetter as any} />;

      case 'routes_mgmt':
        return (
          <RouteManagement
            routes={routes}
            users={users}
            user={currentUser}
            transactions={transactions}
            onSave={persistRoutesFromSetter as any}
            onAddTransaction={persistRouteTransaction}
          />
        );

      case 'profile':
        return <UserProfile user={currentUser} users={users} onUpdate={(u) => setCurrentUser(u)} />;

      case 'credit_details': {
        const crDetails = credits.find((c) => c.id === selectedCreditId);
        const clDetails = crDetails ? clients.find((c) => c.id === crDetails.clientId) : undefined;
        return (
          <ClientDetails
            client={clDetails}
            credit={crDetails}
            payments={payments.filter((p) => p.creditId === selectedCreditId)}
            onBack={() => setCurrentView('credits')}
            onMarkAsLost={async (cid) => {
              const { error } = await supabase.from('credits').update({ status: 'Lost' }).eq('id', cid);
              if (error) console.error('Error mark lost:', error);
              await loadBusinessData(currentUser.businessId);
              setCurrentView('credits');
            }}
          />
        );
      }

      case 'credit_visits': {
        const crVisits = credits.find((c) => c.id === selectedCreditId);
        const clVisits = crVisits ? clients.find((c) => c.id === crVisits.clientId) : undefined;
        return (
          <CreditVisits
            client={clVisits}
            credit={crVisits}
            payments={payments.filter((p) => p.creditId === selectedCreditId)}
            onBack={() => setCurrentView('credits')}
            onUpdatePayment={async (pid, amt) => {
              // pid es UUID
              const { error } = await supabase.from('payments').update({ amount: amt }).eq('id', pid);
              if (error) console.error('Error update payment:', error);
              await loadBusinessData(currentUser.businessId);
            }}
          />
        );
      }

      default:
        return (
          <AdminDashboard
            navigate={handleNavigation}
            user={currentUser}
            routes={routes}
            stats={{ clients: filteredData.clients, credits: filteredData.credits, expenses: filteredData.expenses }}
            selectedRouteId={selectedRouteId}
          />
        );
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white text-2xl font-black animate-bounce shadow-2xl">
            O
          </div>
          <p className="text-white font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">
            Iniciando Servidores de Producción...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    if (currentView === 'auth' || currentView === 'register') {
      return (
        <AuthView
          mode={currentView === 'register' ? 'register' : 'login'}
          error={authError}
          onLogin={handleLogin}
          onRegister={() => {}}
          onBack={() => {
            setAuthError(null);
            setCurrentView('landing');
          }}
          onSwitchMode={(m) => {
            setAuthError(null);
            setCurrentView(m);
          }}
          onRecoverInitiate={async () => true}
          onRecoverVerify={() => true}
          onRecoverReset={() => {}}
          onClearError={() => setAuthError(null)}
        />
      );
    }
    return <LandingPage onLogin={() => setCurrentView('auth')} onRegister={() => setCurrentView('register')} />;
  }

  return (
    <Layout
      user={currentUser}
      onLogout={handleLogout}
      navigateTo={handleNavigation}
      currentView={currentView}
      routes={routes}
      selectedRouteId={selectedRouteId}
      onRouteSelect={setSelectedRouteId}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;