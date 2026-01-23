
import React, { useState, useMemo, useEffect } from 'react';
import { User, Client, Credit, Route, Expense, Payment, RouteTransaction, UserRole } from './types';
import { TODAY_STR } from './constants';
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

export const App: React.FC = () => {
  // Data State (Real from DB)
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

  const loadBusinessData = async (businessId: string) => {
    try {
        const [
            { data: clientsData },
            { data: creditsData },
            { data: routesData },
            { data: expensesData },
            { data: paymentsData },
            { data: usersData },
            { data: transData }
        ] = await Promise.all([
            supabase.from('clients').select('*').eq('business_id', businessId),
            supabase.from('credits').select('*').eq('business_id', businessId),
            supabase.from('routes').select('*').eq('business_id', businessId),
            supabase.from('expenses').select('*').eq('business_id', businessId),
            supabase.from('payments').select('*').eq('business_id', businessId),
            supabase.from('users').select('*').eq('business_id', businessId),
            supabase.from('route_transactions').select('*').eq('business_id', businessId)
        ]);

        if (clientsData) setClients(clientsData as any);
        if (creditsData) setCredits(creditsData as any);
        if (routesData) setRoutes(routesData as any);
        if (expensesData) setExpenses(expensesData as any);
        if (paymentsData) setPayments(paymentsData as any);
        if (usersData) setUsers(usersData as any);
        if (transData) setTransactions(transData as any);
    } catch (err) {
        console.error("Error cargando datos:", err);
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

    // Normalización de entrada
    const cleanUsername = u.trim().toLowerCase();
    
    try {
        // Usamos ilike para búsqueda insensible a mayúsculas
        const { data: dbUser, error } = await supabase
            .from('users')
            .select('*')
            .ilike('username', cleanUsername)
            .maybeSingle();

        if (error) {
            console.error("Supabase Auth Error:", error);
            setAuthError(`Error de servidor: ${error.message}`);
            setIsInitializing(false);
            return;
        }

        if (!dbUser) {
            setAuthError('El usuario no existe en la base de datos.');
            setIsInitializing(false);
            return;
        }

        if (dbUser.status !== 'Active') {
            setAuthError('Esta cuenta se encuentra inactiva. Contacte a soporte.');
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
            setAuthError('Contraseña incorrecta. Verifique sus datos.');
        }
    } catch (err) {
        console.error("Login catch error:", err);
        setAuthError('Error crítico de conexión.');
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
      clients: clients.filter(c => routeFilter(c.routeId)).sort((a,b) => a.order - b.order),
      credits: credits.filter(cr => {
        const c = clients.find(cl => cl.id === cr.clientId);
        return c && routeFilter(c.routeId);
      }),
      expenses: expenses.filter(e => routeFilter(e.routeId)),
      payments: payments.filter(p => {
         const cr = credits.find(c => c.id === p.creditId);
         const c = cr ? clients.find(cl => cl.id === cr.clientId) : null;
         return c && routeFilter(c.routeId);
      })
    };
  }, [clients, credits, expenses, payments, selectedRouteId]);

  const handleSaveClientBulk = async (updatedClients: Client[]) => {
      setClients(prev => {
        const newMap = new Map(prev.map(c => [c.id, c]));
        updatedClients.forEach(c => newMap.set(c.id, c));
        return Array.from(newMap.values());
      });
      await supabase.from('clients').upsert(updatedClients);
  };

  const renderContent = () => {
     if (!currentUser) return null;

     switch(currentView) {
        case 'admin_dashboard':
           return <AdminDashboard 
              navigate={handleNavigation} user={currentUser} routes={routes} selectedRouteId={selectedRouteId}
              stats={{ clients: filteredData.clients, credits: filteredData.credits, expenses: filteredData.expenses }} 
           />;
        case 'collector_dashboard':
           return <CollectorDashboard 
              navigate={handleNavigation} user={currentUser} routes={routes}
              stats={{ clients: filteredData.clients, credits: filteredData.credits, expenses: filteredData.expenses }} 
           />;
        case 'credits':
           return <ClientList 
              clients={filteredData.clients} credits={filteredData.credits} users={users} user={currentUser} routes={routes}
              initialSearchTerm={creditsFilter} onSearchChange={setCreditsFilter} 
              onPayment={async (cId, amt) => {
                 const pay = { business_id: currentUser.businessId, credit_id: cId, amount: amt, payment_date: new Date().toISOString() };
                 await supabase.from('payments').insert(pay);
                 await loadBusinessData(currentUser.businessId);
              }}
              onViewDetails={(cId) => { setSelectedCreditId(cId); setCurrentView('credit_details'); }}
              onViewVisits={(cId) => { setSelectedCreditId(cId); setCurrentView('credit_visits'); }}
              onEditClient={(clientId) => { setSelectedClientId(clientId); setCurrentView('edit_client'); }}
           />;
        case 'client_management':
            return <ClientManagement 
                clients={filteredData.clients} allClients={clients} routes={routes} user={currentUser} selectedRouteId={selectedRouteId} 
                onEditClient={(id) => { setSelectedClientId(id); setCurrentView('edit_client'); }} 
                onDeleteClient={() => {}} onNewClient={() => setCurrentView('new_client')} onUpdateClients={handleSaveClientBulk}
            />;
        case 'edit_client':
            const clientToEdit = clients.find(c => c.id === selectedClientId);
            const activeCredit = credits.find(c => c.clientId === selectedClientId && c.status === 'Active');
            return <EditClient 
              client={clientToEdit} allClients={clients} routes={routes} credit={activeCredit} currentUser={currentUser}
              onSave={(updatedList) => { handleSaveClientBulk(updatedList); setCurrentView('client_management'); }}
              onCancel={() => setCurrentView('client_management')}
            />;
        case 'new_client':
            return <NewClient 
               routes={routes} clients={clients} currentUser={currentUser}
               onSave={(newClients) => { handleSaveClientBulk(newClients); setCurrentView('client_management'); }}
               onCancel={() => setCurrentView('client_management')}
            />;
        case 'new_credit':
           return <NewCredit 
              clients={filteredData.clients} user={currentUser} allCredits={credits} allExpenses={expenses} allPayments={payments} allTransactions={transactions} routes={routes}
              onSave={async (cl, cr) => { 
                  await supabase.from('credits').insert(cr);
                  await loadBusinessData(currentUser.businessId);
                  setCurrentView('credits'); 
              }}
           />;
        case 'expenses':
           return <ExpensesView 
              expenses={filteredData.expenses} routes={routes} user={currentUser}
              onAdd={async (e) => {
                  await supabase.from('expenses').insert(e);
                  await loadBusinessData(currentUser.businessId);
              }} 
              onDelete={async (id) => {
                  await supabase.from('expenses').delete().eq('id', id);
                  setExpenses(prev => prev.filter(e => e.id !== id));
              }}
           />;
        case 'routing':
           return <RoutingView 
              clients={filteredData.clients} setClients={setClients} selectedRouteId={selectedRouteId} credits={credits} payments={payments}
              onGoToCredit={(cid) => { setCreditsFilter(cid); setCurrentView('credits'); }}
           />;
        case 'liquidation':
           return <LiquidationView 
              selectedRouteId={selectedRouteId} credits={credits} expenses={expenses} payments={payments} clients={clients} routes={routes} transactions={transactions}
           />;
        case 'users':
           return <UserManagement users={users} routes={routes} currentUser={currentUser} onSave={setUsers} />;
        case 'routes_mgmt':
           return <RouteManagement 
              routes={routes} users={users} user={currentUser} transactions={transactions} onSave={setRoutes} 
              onAddTransaction={async (t) => {
                  await supabase.from('route_transactions').insert(t);
                  await loadBusinessData(currentUser.businessId);
              }}
           />;
        case 'profile':
           return <UserProfile user={currentUser} users={users} onUpdate={u => { setCurrentUser(u); }} />;
        case 'credit_details':
           const crDetails = credits.find(c => c.id === selectedCreditId);
           const clDetails = crDetails ? clients.find(c => c.id === crDetails.clientId) : undefined;
           return <ClientDetails 
              client={clDetails} credit={crDetails} payments={payments.filter(p => p.creditId === selectedCreditId)} onBack={() => setCurrentView('credits')}
              onMarkAsLost={async (cid) => { 
                  await supabase.from('credits').update({ status: 'Lost' }).eq('id', cid);
                  await loadBusinessData(currentUser.businessId);
                  setCurrentView('credits'); 
              }}
           />;
        case 'credit_visits':
           const crVisits = credits.find(c => c.id === selectedCreditId);
           const clVisits = crVisits ? clients.find(c => c.id === crVisits.clientId) : undefined;
           return <CreditVisits 
              client={clVisits} credit={crVisits} payments={payments.filter(p => p.creditId === selectedCreditId)} onBack={() => setCurrentView('credits')}
              onUpdatePayment={async (pid, amt) => {
                 await supabase.from('payments').update({ amount: amt }).eq('id', pid);
                 await loadBusinessData(currentUser.businessId);
              }}
           />;
        default:
           return <AdminDashboard navigate={handleNavigation} user={currentUser} routes={routes} stats={{clients: filteredData.clients, credits: filteredData.credits, expenses: filteredData.expenses}} selectedRouteId={selectedRouteId} />;
     }
  };

  if (isInitializing) {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-6">
                <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white text-2xl font-black animate-bounce shadow-2xl">O</div>
                <p className="text-white font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Autenticando Acceso Élite...</p>
            </div>
        </div>
    );
  }

  if (!currentUser) {
     if (currentView === 'auth' || currentView === 'register') {
        return <AuthView 
          mode={currentView === 'register' ? 'register' : 'login'} error={authError}
          onLogin={handleLogin} onRegister={() => {}} onBack={() => { setAuthError(null); setCurrentView('landing'); }}
          onSwitchMode={(m) => { setAuthError(null); setCurrentView(m); }}
          onRecoverInitiate={async () => true} onRecoverVerify={() => true} onRecoverReset={() => {}}
        />;
     }
     return <LandingPage onLogin={() => setCurrentView('auth')} onRegister={() => setCurrentView('register')} />;
  }

  return (
    <Layout 
       user={currentUser} onLogout={handleLogout} navigateTo={handleNavigation} currentView={currentView}
       routes={routes} selectedRouteId={selectedRouteId} onRouteSelect={setSelectedRouteId}
    >
       {renderContent()}
    </Layout>
  );
};
