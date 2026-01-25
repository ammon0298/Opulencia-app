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
import { verifyPassword, generateOTP, hashPassword } from './utils/security';
import { sendLicenseRequestEmail, sendOTPEmail } from './utils/email';
import { GlobalProvider } from './contexts/GlobalContext';

// UUID helper
const isUuid = (v: string) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const newUuid = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

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
  return { normalizeId };
};

// ---- MAPPERS (Robustos & Completos) ----

const dbToUser = (u: any): User => ({
  id: u.id,
  businessId: u.business_id,
  username: u.username,
  password: u.password_hash, // Mapeo crítico para validación de contraseña
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
  currentLocation: u.lat && u.lng ? { 
      lat: u.lat, 
      lng: u.lng, 
      timestamp: u.last_location_at || new Date().toISOString() 
  } : undefined
});

const userToDb = (u: User) => ({
  id: u.id,
  business_id: u.businessId,
  username: u.username,
  name: u.name,
  dni: u.dni,
  phone: u.phone || null,
  address: u.address || null,
  role: u.role,
  route_ids: u.routeIds ?? [],
  status: u.status,
  // Campos extendidos para perfil
  business_name: u.businessName || null,
  country: u.country || null,
  city: u.city || null,
  lat: u.currentLocation?.lat || null,
  lng: u.currentLocation?.lng || null,
  last_location_at: u.currentLocation?.timestamp || null
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
  country: c.country ?? '',
  city: c.city ?? '',
  phoneCode: c.phone_code ?? '+57',
  order: c.visit_order ?? 0,
  status: c.status,
  coordinates: c.lat && c.lng ? { lat: c.lat, lng: c.lng } : undefined
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
  country: c.country || null,
  city: c.city || null,
  phone_code: c.phoneCode || null,
  visit_order: c.order ?? 0,
  status: c.status,
  // Campos Geo y Ubicación explícitos
  lat: c.coordinates?.lat || null,
  lng: c.coordinates?.lng || null
});

const dbToRoute = (r: any): Route => ({ id: r.id, businessId: r.business_id, name: r.name });
const routeToDb = (r: Route) => ({ id: r.id, business_id: r.businessId, name: r.name });

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
  isOverdue: false, 
  status: c.status 
});
const creditToDb = (c: Credit) => ({ business_id: c.businessId, client_id: c.clientId, capital: c.capital, total_to_pay: c.totalToPay, installment_value: c.installmentValue, total_installments: c.totalInstallments, paid_installments: c.paidInstallments ?? 0, total_paid: c.totalPaid ?? 0, frequency: c.frequency, start_date: c.startDate, first_payment_date: c.firstPaymentDate, status: c.status });

const dbToPayment = (p: any): Payment => ({ id: p.id, businessId: p.business_id, creditId: p.credit_id, date: p.payment_date, amount: Number(p.amount), note: p.note ?? '' });
const paymentToDb = (p: Payment) => ({ business_id: p.businessId, credit_id: p.creditId, amount: p.amount, payment_date: p.date, note: p.note || null });

const dbToExpense = (e: any): Expense => ({ id: e.id, businessId: e.business_id, date: e.expense_date ?? e.created_at?.slice(0, 10), routeId: e.route_id, value: Number(e.amount), name: e.name, type: e.category, concept: e.concept ?? '', proofImage: e.proof_image_url ?? '' });
const expenseToDb = (e: Expense) => ({ id: e.id, business_id: e.businessId, route_id: e.routeId, name: e.name, amount: e.value, category: e.type, concept: e.concept || null, proof_image_url: e.proofImage || null, expense_date: e.date });

// Fixed: business_id to businessId
const dbToTx = (t: any): RouteTransaction => ({ id: t.id, businessId: t.business_id, routeId: t.route_id, date: t.transaction_date, amount: Number(t.amount), type: t.type, description: t.description ?? '' });
const txToDb = (t: RouteTransaction) => ({ id: t.id, business_id: t.businessId, route_id: t.route_id, amount: t.amount, type: t.type, description: t.description || null, transaction_date: t.date });


const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [transactions, setTransactions] = useState<RouteTransaction[]>([]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('landing');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('all');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedCreditId, setSelectedCreditId] = useState<string | null>(null);
  const [creditsFilter, setCreditsFilter] = useState<string>('');

  // Estado temporal para recuperación de contraseña
  const [recoveryState, setRecoveryState] = useState<{email: string, code: string} | null>(null);

  const { normalizeId } = useTempIdMap();

  const loadBusinessData = async (businessId: string) => {
    try {
      const [
        { data: clientsData }, { data: creditsData }, { data: routesData },
        { data: expensesData }, { data: paymentsData }, { data: usersData }, { data: transData }
      ] = await Promise.all([
        supabase.from('clients').select('*').eq('business_id', businessId),
        supabase.from('credits').select('*').eq('business_id', businessId),
        supabase.from('routes').select('*').eq('business_id', businessId),
        supabase.from('expenses').select('*').eq('business_id', businessId),
        supabase.from('payments').select('*').eq('business_id', businessId),
        supabase.from('users').select('*').eq('business_id', businessId),
        supabase.from('route_transactions').select('*').eq('business_id', businessId)
      ]);

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
          if (!Array.isArray(user.routeIds)) user.routeIds = [];
          
          setCurrentUser(user);
          await loadBusinessData(user.businessId);
          if (user.role === UserRole.COLLECTOR && user.routeIds.length > 0) {
             setSelectedRouteId(user.routeIds[0]);
          }
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
    setAuthSuccess(null);
    setIsInitializing(true);
    const cleanUsername = u.trim().toLowerCase();

    try {
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (error) {
        setAuthError(`Error de conexión con el servidor.`);
        setIsInitializing(false);
        return;
      }

      if (!dbUser) {
        setAuthError('Usuario no encontrado.');
        setIsInitializing(false);
        return;
      }

      const isValid = verifyPassword(p, dbUser.password_hash);

      if (isValid) {
        const mappedUser = dbToUser(dbUser);
        setCurrentUser(mappedUser);
        localStorage.setItem('op_user', JSON.stringify(mappedUser));
        await loadBusinessData(mappedUser.businessId);
        
        if (mappedUser.role === UserRole.COLLECTOR && mappedUser.routeIds.length > 0) {
             setSelectedRouteId(mappedUser.routeIds[0]);
        }
        
        setCurrentView(mappedUser.role === UserRole.ADMIN ? 'admin_dashboard' : 'collector_dashboard');
      } else {
        setAuthError('Contraseña incorrecta.');
      }
    } catch (err) {
      setAuthError('Error de conexión inesperado.');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleRegisterInterest = async (data: any): Promise<boolean> => {
    setAuthError(null);
    const sent = await sendLicenseRequestEmail(data);
    if (sent) {
        setAuthSuccess("Solicitud enviada correctamente. Un asesor de Opulencia se pondrá en contacto al correo " + data.email);
        return true;
    } else {
        return false;
    }
  };

  // --- Lógica de Recuperación de Contraseña ---

  const handleRecoverInitiate = async (email: string): Promise<boolean> => {
    try {
        const cleanEmail = email.trim().toLowerCase();
        // Verificar si existe el usuario
        const { data: user, error } = await supabase.from('users').select('name').ilike('username', cleanEmail).maybeSingle();
        
        if (error || !user) {
            // Por seguridad, no decimos explícitamente si existe o no, pero aquí devolvemos false para la UI
            return false;
        }

        const otp = generateOTP();
        const sent = await sendOTPEmail(cleanEmail, user.name, otp);
        
        if (sent) {
            setRecoveryState({ email: cleanEmail, code: otp });
            return true;
        }
        return false;
    } catch (e) {
        console.error(e);
        return false;
    }
  };

  const handleRecoverVerify = (code: string): boolean => {
    if (!recoveryState) return false;
    return recoveryState.code === code;
  };

  const handleRecoverReset = async (newPass: string) => {
    if (!recoveryState) return;
    try {
        const hash = hashPassword(newPass);
        const { error } = await supabase
            .from('users')
            .update({ password_hash: hash })
            .ilike('username', recoveryState.email);

        if (!error) {
            setAuthSuccess("Contraseña restablecida correctamente. Inicie sesión.");
            setRecoveryState(null);
            setCurrentView('auth'); // Volver al login
        } else {
            setAuthError("Error al actualizar la contraseña. Intente de nuevo.");
        }
    } catch (e) {
        setAuthError("Error crítico del sistema.");
    }
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

  const handleSaveClientBulk = async (updatedClients: Client[]) => {
    if (!currentUser) return;
    const normalized = updatedClients.map((c) => ({ ...c, id: isUuid(c.id) ? c.id : normalizeId(c.id), businessId: currentUser.businessId }));
    setClients((prev) => {
      const newMap = new Map(prev.map((c) => [c.id, c]));
      normalized.forEach((c) => newMap.set(c.id, c));
      return Array.from(newMap.values());
    });
    const payload = normalized.map(clientToDb);
    await supabase.from('clients').upsert(payload, { onConflict: 'id' });
    await loadBusinessData(currentUser.businessId);
  };

  const handleUpdateProfile = async (u: User) => {
      const payload: any = userToDb(u);
      // Si la contraseña fue actualizada en UserProfile, vendrá como hash en u.password
      // Debemos mapearla al campo correcto de DB 'password_hash'
      if ((u as any).password && (u as any).password.startsWith('$2')) {
          payload.password_hash = (u as any).password;
      }
      
      const { error } = await supabase.from('users').update(payload).eq('id', u.id);
      if (!error) {
          // Actualizar estado local asegurando que el nuevo password se mantenga
          const updatedUser = { ...u };
          setCurrentUser(updatedUser);
          localStorage.setItem('op_user', JSON.stringify(updatedUser));
          await loadBusinessData(u.businessId);
      } else {
          console.error("Error updating profile:", error);
      }
  };

  const persistRoutesFromSetter = async (setter: any) => { if(currentUser) await loadBusinessData(currentUser.businessId); };
  const persistRouteTransaction = async (t: any) => { if(currentUser) await loadBusinessData(currentUser.businessId); };
  const persistUsersFromSetter = async (setter: any) => { if(currentUser) await loadBusinessData(currentUser.businessId); };

  // Manejo de Navegación: Limpia filtros al volver a la vista de créditos desde el menú
  const handleNavigation = (viewName: string) => {
    if (viewName === 'credits') {
        setCreditsFilter('');
    }
    setCurrentView(viewName);
  };

  if (isInitializing) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><p className="text-white font-black animate-pulse uppercase tracking-widest">Iniciando Servidores de Producción...</p></div>;

  if (!currentUser) {
    if (currentView === 'auth' || currentView === 'register') {
      return (
        <AuthView
          mode={currentView === 'register' ? 'register' : 'login'}
          error={authError}
          successMessage={authSuccess}
          onLogin={handleLogin}
          onRegister={handleRegisterInterest}
          onBack={() => { setAuthError(null); setAuthSuccess(null); setCurrentView('landing'); }}
          onSwitchMode={(m) => { setAuthError(null); setAuthSuccess(null); setCurrentView(m); }}
          onRecoverInitiate={handleRecoverInitiate}
          onRecoverVerify={handleRecoverVerify}
          onRecoverReset={handleRecoverReset}
          onClearError={() => { setAuthError(null); setAuthSuccess(null); }}
        />
      );
    }
    return <LandingPage onLogin={() => setCurrentView('auth')} onRegister={() => setCurrentView('register')} />;
  }

  return (
    <GlobalProvider>
        <Layout user={currentUser} onLogout={() => {localStorage.removeItem('op_user'); setCurrentUser(null); setCurrentView('landing');}} navigateTo={handleNavigation} currentView={currentView} routes={routes} selectedRouteId={selectedRouteId} onRouteSelect={setSelectedRouteId}>
            {currentView === 'admin_dashboard' && <AdminDashboard navigate={handleNavigation} user={currentUser} routes={routes} selectedRouteId={selectedRouteId} stats={{...filteredData, payments: filteredData.payments}} />}
            {currentView === 'collector_dashboard' && <CollectorDashboard navigate={handleNavigation} user={currentUser} routes={routes} stats={{...filteredData, payments: filteredData.payments}} />}
            {currentView === 'credits' && <ClientList clients={filteredData.clients} credits={filteredData.credits} users={users} user={currentUser} routes={routes} initialSearchTerm={creditsFilter} onSearchChange={setCreditsFilter} onPayment={async (cId, amt) => { await supabase.from('payments').insert(paymentToDb({ id: newUuid(), businessId: currentUser.businessId, creditId: cId, date: new Date().toISOString(), amount: amt })); await loadBusinessData(currentUser.businessId); setCreditsFilter(''); }} onViewDetails={(cId) => {setSelectedCreditId(cId); setCurrentView('credit_details')}} onViewVisits={(cId) => {setSelectedCreditId(cId); setCurrentView('credit_visits')}} onEditClient={(id) => {setSelectedClientId(id); setCurrentView('edit_client')}} />}
            {currentView === 'client_management' && <ClientManagement clients={filteredData.clients} allClients={clients} routes={routes} user={currentUser} selectedRouteId={selectedRouteId} credits={credits} payments={payments} onEditClient={(id) => {setSelectedClientId(id); setCurrentView('edit_client')}} onDeleteClient={()=>{}} onNewClient={() => setCurrentView('new_client')} onUpdateClients={handleSaveClientBulk} />}
            {currentView === 'edit_client' && <EditClient client={clients.find(c => c.id === selectedClientId)} allClients={clients} routes={routes} credit={credits.find(c => c.clientId === selectedClientId && c.status === 'Active')} currentUser={currentUser} onSave={(l) => {handleSaveClientBulk(l); setCurrentView('client_management')}} onCancel={() => setCurrentView('client_management')} />}
            {currentView === 'new_client' && <NewClient routes={routes} clients={clients} currentUser={currentUser} onSave={(l) => {handleSaveClientBulk(l); setCurrentView('client_management')}} onCancel={() => setCurrentView('client_management')} />}
            {currentView === 'new_credit' && <NewCredit clients={filteredData.clients} user={currentUser} allCredits={credits} allExpenses={expenses} allPayments={payments} allTransactions={transactions} routes={routes} onSave={async (_cl, cr) => { await supabase.from('credits').insert(creditToDb({...cr, businessId: currentUser.businessId})); await loadBusinessData(currentUser.businessId); setCurrentView('credits'); }} />}
            {currentView === 'expenses' && <ExpensesView expenses={filteredData.expenses} routes={routes} user={currentUser} onAdd={async (e) => { await supabase.from('expenses').insert(expenseToDb({...e, id: newUuid(), businessId: currentUser.businessId})); await loadBusinessData(currentUser.businessId); }} onDelete={async (id) => { await supabase.from('expenses').delete().eq('id', id); setExpenses(p => p.filter(x => x.id !== id)); }} />}
            {currentView === 'routing' && <RoutingView clients={filteredData.clients} setClients={setClients} selectedRouteId={selectedRouteId} credits={credits} payments={payments} onGoToCredit={(cid) => {setCreditsFilter(cid); setCurrentView('credits')}} />}
            {currentView === 'liquidation' && <LiquidationView selectedRouteId={selectedRouteId} credits={credits} expenses={expenses} payments={payments} clients={clients} routes={routes} transactions={transactions} />}
            {currentView === 'users' && <UserManagement users={users} routes={routes} currentUser={currentUser} onSave={persistUsersFromSetter as any} />}
            {currentView === 'routes_mgmt' && <RouteManagement routes={routes} users={users} user={currentUser} transactions={transactions} onSave={persistRoutesFromSetter as any} onAddTransaction={persistRouteTransaction} />}
            {currentView === 'profile' && <UserProfile user={currentUser} users={users} onUpdate={handleUpdateProfile} />}
            {currentView === 'credit_details' && <ClientDetails client={clients.find(c => c.id === credits.find(cr => cr.id === selectedCreditId)?.clientId)} credit={credits.find(cr => cr.id === selectedCreditId)} payments={payments.filter(p => p.creditId === selectedCreditId)} onBack={() => setCurrentView('credits')} onMarkAsLost={async (cid) => { await supabase.from('credits').update({ status: 'Lost' }).eq('id', cid); await loadBusinessData(currentUser.businessId); setCurrentView('credits'); }} />}
            {currentView === 'credit_visits' && <CreditVisits client={clients.find(c => c.id === credits.find(cr => cr.id === selectedCreditId)?.clientId)} credit={credits.find(cr => cr.id === selectedCreditId)} payments={payments.filter(p => p.creditId === selectedCreditId)} onBack={() => setCurrentView('credits')} onUpdatePayment={async (pid, amt) => { await supabase.from('payments').update({ amount: amt }).eq('id', pid); await loadBusinessData(currentUser.businessId); }} />}
        </Layout>
    </GlobalProvider>
  );
};

export default App;