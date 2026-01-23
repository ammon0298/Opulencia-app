
import React, { useState, useMemo, useEffect } from 'react';
import { User, Client, Credit, Route, Expense, Payment, RouteTransaction, UserRole } from './types';
import { MOCK_USERS, MOCK_CLIENTS, MOCK_CREDITS, MOCK_EXPENSES, MOCK_PAYMENTS, MOCK_ROUTES, MOCK_TRANSACTIONS } from './constants';
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

export const App: React.FC = () => {
  // Data State
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [credits, setCredits] = useState<Credit[]>(MOCK_CREDITS);
  const [expenses, setExpenses] = useState<Expense[]>(MOCK_EXPENSES);
  const [payments, setPayments] = useState<Payment[]>(MOCK_PAYMENTS);
  const [routes, setRoutes] = useState<Route[]>(MOCK_ROUTES);
  const [transactions, setTransactions] = useState<RouteTransaction[]>(MOCK_TRANSACTIONS);

  // UI & Global State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('landing');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('all');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Selection & Filter State
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedCreditId, setSelectedCreditId] = useState<string | null>(null);
  const [creditsFilter, setCreditsFilter] = useState<string>(''); 

  // Simulación de carga inicial de sesión (Supabase Check)
  useEffect(() => {
    setTimeout(() => {
        setIsInitializing(false);
    }, 1200);
  }, []);

  const handleLogin = (u: string, p: string) => {
    setAuthError(null);
    const user = users.find(usr => usr.username === u && usr.password === p); 
    if (user) {
       setCurrentUser(user);
       setSelectedRouteId(user.role === UserRole.ADMIN ? 'all' : (user.routeIds[0] || 'all'));
       setCurrentView(user.role === UserRole.ADMIN ? 'admin_dashboard' : 'collector_dashboard');
    } else {
       setAuthError('El usuario o la contraseña ingresados son incorrectos.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('landing');
    setCreditsFilter('');
    setAuthError(null);
  };

  const handleNavigation = (viewName: string) => {
    if (viewName === 'credits') setCreditsFilter(''); 
    setCurrentView(viewName);
  };

  // Filtrado reactivo de datos según ruta y permisos
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

  const handleSaveClientBulk = (updatedClients: Client[]) => {
     setClients(prev => {
        const newMap = new Map(prev.map(c => [c.id, c]));
        updatedClients.forEach(c => newMap.set(c.id, c));
        return Array.from(newMap.values());
     });
  };

  const renderContent = () => {
     if (!currentUser) return null;

     switch(currentView) {
        case 'admin_dashboard':
           return <AdminDashboard 
              navigate={handleNavigation} 
              user={currentUser} 
              routes={routes} 
              stats={{ clients: filteredData.clients, credits: filteredData.credits, expenses: filteredData.expenses }} 
              selectedRouteId={selectedRouteId}
           />;
        case 'collector_dashboard':
           return <CollectorDashboard 
              navigate={handleNavigation} 
              user={currentUser} 
              routes={routes} 
              stats={{ clients: filteredData.clients, credits: filteredData.credits, expenses: filteredData.expenses }} 
           />;
        case 'credits':
           return <ClientList 
              clients={filteredData.clients} credits={filteredData.credits} users={users} user={currentUser} routes={routes}
              initialSearchTerm={creditsFilter} onSearchChange={setCreditsFilter} 
              onPayment={(cId, amt) => {
                 const pay: Payment = { id: `p_${Date.now()}`, businessId: currentUser.businessId, creditId: cId, date: new Date().toISOString().split('T')[0], amount: amt };
                 setPayments(prev => [...prev, pay]);
                 setCredits(prev => prev.map(cr => cr.id === cId ? { ...cr, totalPaid: cr.totalPaid + amt, paidInstallments: cr.paidInstallments + 1 } : cr)); 
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
              onSave={(cl, cr) => { setCredits(prev => [...prev, cr]); setCurrentView('credits'); }}
           />;
        case 'expenses':
           return <ExpensesView 
              expenses={filteredData.expenses} routes={routes} user={currentUser}
              onAdd={e => setExpenses(prev => [...prev, e])} onDelete={id => setExpenses(prev => prev.filter(e => e.id !== id))}
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
              routes={routes} users={users} user={currentUser} transactions={transactions} onSave={setRoutes} onAddTransaction={t => setTransactions(prev => [...prev, t])}
           />;
        case 'profile':
           return <UserProfile 
              user={currentUser} users={users} 
              onUpdate={u => { setUsers(prev => prev.map(user => user.id === u.id ? u : user)); setCurrentUser(u); }}
           />;
        case 'credit_details':
           const crDetails = credits.find(c => c.id === selectedCreditId);
           const clDetails = crDetails ? clients.find(c => c.id === crDetails.clientId) : undefined;
           return <ClientDetails 
              client={clDetails} credit={crDetails} payments={payments.filter(p => p.creditId === selectedCreditId)} onBack={() => setCurrentView('credits')}
              onMarkAsLost={(cid) => { setCredits(prev => prev.map(c => c.id === cid ? { ...c, status: 'Lost' } : c)); setCurrentView('credits'); }}
           />;
        case 'credit_visits':
           const crVisits = credits.find(c => c.id === selectedCreditId);
           const clVisits = crVisits ? clients.find(c => c.id === crVisits.clientId) : undefined;
           return <CreditVisits 
              client={clVisits} credit={crVisits} payments={payments.filter(p => p.creditId === selectedCreditId)} onBack={() => setCurrentView('credits')}
              onUpdatePayment={(pid, amt) => {
                 setPayments(prev => prev.map(p => p.id === pid ? { ...p, amount: amt } : p));
                 setCredits(prev => prev.map(c => {
                    if (c.id === selectedCreditId) {
                        const allP = payments.filter(p => p.creditId === c.id);
                        const newTotal = allP.reduce((sum, p) => p.id === pid ? sum + amt : sum + p.amount, 0);
                        return { ...c, totalPaid: newTotal };
                    }
                    return c;
                 }));
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
                <div className="flex flex-col items-center gap-2">
                    <p className="text-white font-black uppercase tracking-[0.4em] text-[10px]">Cifrando Conexión</p>
                    <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 animate-loading-bar"></div>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes loading-bar {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-loading-bar { animation: loading-bar 1.5s infinite linear; }
            `}</style>
        </div>
    );
  }

  if (!currentUser) {
     if (currentView === 'auth' || currentView === 'register') {
        return <AuthView 
          mode={currentView === 'register' ? 'register' : 'login'} 
          error={authError}
          onLogin={handleLogin} 
          onRegister={(data) => {
              setAuthError(null);
              const newUser: User = { id: `u_${Date.now()}`, role: UserRole.ADMIN, ...data, routeIds: [], status: 'Active' };
              setUsers([...users, newUser]);
              setCurrentUser(newUser);
              setCurrentView('admin_dashboard');
          }}
          onBack={() => { setAuthError(null); setCurrentView('landing'); }}
          onSwitchMode={(m) => { setAuthError(null); setCurrentView(m); }}
          onRecoverInitiate={async () => true}
          onRecoverVerify={() => true}
          onRecoverReset={() => {}}
        />;
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
