
import React, { useState, useMemo, useEffect } from 'react';
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
import { verifyPassword, hashPassword, generateOTP } from './utils/security';
import { sendOTPEmail } from './utils/email';

export const App: React.FC = () => {
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
  
  // Recovery State
  const [tempOTP, setTempOTP] = useState<string | null>(null);
  const [recoveryEmail, setRecoveryEmail] = useState<string | null>(null);
  
  // Selection State
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedCreditId, setSelectedCreditId] = useState<string | null>(null);
  const [creditsFilter, setCreditsFilter] = useState<string>(''); 

  const loadBusinessData = async (businessId: string) => {
    try {
        const [
            { data: cData }, { data: crData }, { data: rData },
            { data: eData }, { data: pData }, { data: uData }, { data: tData }
        ] = await Promise.all([
            supabase.from('clients').select('*').eq('business_id', businessId),
            supabase.from('credits').select('*').eq('business_id', businessId),
            supabase.from('routes').select('*').eq('business_id', businessId),
            supabase.from('expenses').select('*').eq('business_id', businessId),
            supabase.from('payments').select('*').eq('business_id', businessId),
            supabase.from('users').select('*').eq('business_id', businessId),
            supabase.from('route_transactions').select('*').eq('business_id', businessId)
        ]);

        if (cData) setClients(cData.map(c => ({
            id: c.id, businessId: c.business_id, routeId: c.route_id, dni: c.dni,
            name: c.name, alias: c.alias, address: c.address, phone: c.phone,
            order: c.visit_order, status: c.status
        })));
        
        if (crData) setCredits(crData.map(cr => ({
            id: cr.id, businessId: cr.business_id, clientId: cr.client_id, capital: cr.capital,
            // Fix: Changed property name from 'installment_value' to 'installmentValue' to match Credit interface
            totalToPay: cr.total_to_pay, installmentValue: cr.installment_value,
            totalInstallments: cr.total_installments, paidInstallments: cr.paid_installments,
            totalPaid: cr.total_paid, frequency: cr.frequency, startDate: cr.start_date,
            status: cr.status, isOverdue: false 
        })));

        if (rData) setRoutes(rData.map(r => ({ id: r.id, businessId: r.business_id, name: r.name })));
        
        if (eData) setExpenses(eData.map(e => ({
            id: e.id, businessId: e.business_id, routeId: e.route_id, value: e.amount,
            name: e.name, type: e.category, concept: e.concept, date: e.expense_date, proofImage: e.proof_image_url
        })));

        if (pData) setPayments(pData.map(p => ({
            id: p.id, businessId: p.business_id, creditId: p.credit_id, amount: p.amount, date: p.payment_date, note: p.note
        })));

        if (uData) setUsers(uData.map(u => ({
            id: u.id, businessId: u.business_id, username: u.username, name: u.name,
            dni: u.dni, phone: u.phone, address: u.address, role: u.role,
            routeIds: u.route_ids || [], status: u.status
        })));

        if (tData) setTransactions(tData.map(t => ({
            id: t.id, businessId: t.business_id, routeId: t.route_id, amount: t.amount,
            type: t.type, description: t.description, date: t.transaction_date
        })));

    } catch (err) {
        console.error("Error cargando datos de Supabase:", err);
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
    try {
        const { data: dbUser, error } = await supabase.from('users').select('*').ilike('username', u.trim()).maybeSingle();
        if (error || !dbUser) {
            setAuthError('Usuario no encontrado.');
            setIsInitializing(false);
            return;
        }
        if (verifyPassword(p, dbUser.password_hash)) {
            const mappedUser: User = {
                id: dbUser.id, businessId: dbUser.business_id, username: dbUser.username,
                name: dbUser.name, dni: dbUser.dni, phone: dbUser.phone || '',
                address: dbUser.address || '', role: dbUser.role as UserRole,
                routeIds: dbUser.route_ids || [], status: dbUser.status as any
            };
            setCurrentUser(mappedUser);
            localStorage.setItem('op_user', JSON.stringify(mappedUser));
            await loadBusinessData(mappedUser.businessId);
            setCurrentView(mappedUser.role === 'ADMIN' ? 'admin_dashboard' : 'collector_dashboard');
        } else {
            setAuthError('Contraseña incorrecta.');
        }
    } catch (e) {
        setAuthError('Error de conexión.');
    } finally {
        setIsInitializing(false);
    }
  };

  const handleRegister = async (data: any) => {
    setIsInitializing(true);
    try {
        const { data: bData, error: bErr } = await supabase.from('businesses').insert({
            name: data.businessName, country: data.country, city: data.city
        }).select().single();
        
        if (bErr) throw bErr;

        const { error: uErr } = await supabase.from('users').insert({
            business_id: bData.id, username: data.email.toLowerCase(),
            password_hash: hashPassword(data.password), name: data.name,
            dni: data.dni, phone: data.phone, address: data.address,
            role: 'ADMIN', status: 'Active'
        });

        if (uErr) throw uErr;
        
        await handleLogin(data.email, data.password);
    } catch (e: any) {
        setAuthError(`Error en registro: ${e.message}`);
        setIsInitializing(false);
    }
  };

  // HANDLERS PARA RECUPERACIÓN DE CONTRASEÑA
  const handleRecoverInitiate = async (email: string): Promise<boolean> => {
    try {
        const { data: user, error } = await supabase.from('users').select('name').ilike('username', email.trim()).maybeSingle();
        if (error || !user) {
            setAuthError('No existe ningún usuario registrado con este correo.');
            return false;
        }

        const otp = generateOTP();
        const success = await sendOTPEmail(email, user.name, otp);
        
        if (success) {
            setTempOTP(otp);
            setRecoveryEmail(email.trim());
            setAuthError(null);
            return true;
        } else {
            setAuthError('Hubo un error al enviar el correo. Inténtelo más tarde.');
            return false;
        }
    } catch (err) {
        setAuthError('Error de comunicación con el servidor.');
        return false;
    }
  };

  const handleRecoverVerify = (code: string): boolean => {
    if (code === tempOTP) {
        setAuthError(null);
        return true;
    }
    setAuthError('El código de seguridad es incorrecto.');
    return false;
  };

  const handleRecoverReset = async (newPass: string) => {
     if (!recoveryEmail) return;
     try {
         const { error } = await supabase.from('users')
            .update({ password_hash: hashPassword(newPass) })
            .ilike('username', recoveryEmail);
         
         if (error) throw error;
         
         setAuthError(null);
         setTempOTP(null);
         setRecoveryEmail(null);
         alert('Contraseña actualizada con éxito. Inicie sesión.');
         setCurrentView('auth');
     } catch (err) {
         setAuthError('Error al actualizar la contraseña en la base de datos.');
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
      clients: clients.filter(c => routeFilter(c.routeId)),
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
      const toUpsert = updatedClients.map(c => ({
          id: c.id.startsWith('c') && c.id.length > 10 ? undefined : c.id, 
          business_id: currentUser?.businessId,
          route_id: c.routeId,
          dni: c.dni,
          name: c.name,
          alias: c.alias,
          address: c.address,
          phone: c.phone,
          visit_order: c.order,
          status: c.status
      }));
      await supabase.from('clients').upsert(toUpsert);
      if (currentUser) await loadBusinessData(currentUser.businessId);
  };

  const renderContent = () => {
     if (!currentUser) return null;
     switch(currentView) {
        case 'admin_dashboard':
           return <AdminDashboard navigate={handleNavigation} user={currentUser} routes={routes} selectedRouteId={selectedRouteId} stats={{ clients: filteredData.clients, credits: filteredData.credits, expenses: filteredData.expenses }} />;
        case 'collector_dashboard':
           return <CollectorDashboard navigate={handleNavigation} user={currentUser} routes={routes} stats={{ clients: filteredData.clients, credits: filteredData.credits, expenses: filteredData.expenses }} />;
        case 'credits':
           return <ClientList clients={filteredData.clients} credits={filteredData.credits} users={users} user={currentUser} routes={routes} initialSearchTerm={creditsFilter} onSearchChange={setCreditsFilter} 
              onPayment={async (cId, amt) => {
                 await supabase.from('payments').insert({ business_id: currentUser.businessId, credit_id: cId, amount: amt });
                 const target = credits.find(c => c.id === cId);
                 if (target) {
                     await supabase.from('credits').update({ 
                         total_paid: target.totalPaid + amt,
                         paid_installments: target.paidInstallments + 1 
                     }).eq('id', cId);
                 }
                 await loadBusinessData(currentUser.businessId);
              }}
              onViewDetails={(cId) => { setSelectedCreditId(cId); setCurrentView('credit_details'); }}
              onViewVisits={(cId) => { setSelectedCreditId(cId); setCurrentView('credit_visits'); }}
              onEditClient={(clientId) => { setSelectedClientId(clientId); setCurrentView('edit_client'); }}
           />;
        case 'client_management':
            return <ClientManagement clients={filteredData.clients} allClients={clients} routes={routes} user={currentUser} selectedRouteId={selectedRouteId} onEditClient={(id) => { setSelectedClientId(id); setCurrentView('edit_client'); }} onDeleteClient={() => {}} onNewClient={() => setCurrentView('new_client')} onUpdateClients={handleSaveClientBulk} />;
        case 'edit_client':
            const clientToEdit = clients.find(c => c.id === selectedClientId);
            const activeCredit = credits.find(c => c.clientId === selectedClientId && c.status === 'Active');
            return <EditClient client={clientToEdit} allClients={clients} routes={routes} credit={activeCredit} currentUser={currentUser} onSave={(updatedList) => { handleSaveClientBulk(updatedList); setCurrentView('client_management'); }} onCancel={() => setCurrentView('client_management')} />;
        case 'new_client':
            return <NewClient routes={routes} clients={clients} currentUser={currentUser} onSave={(newList) => { handleSaveClientBulk(newList); setCurrentView('client_management'); }} onCancel={() => setCurrentView('client_management')} />;
        case 'new_credit':
           return <NewCredit clients={filteredData.clients} user={currentUser} allCredits={credits} allExpenses={expenses} allPayments={payments} allTransactions={transactions} routes={routes}
              onSave={async (cl, cr) => { 
                  await supabase.from('credits').insert({
                      business_id: currentUser.businessId, client_id: cl.id, capital: cr.capital,
                      // Fix: Changed 'cr.installment_value' to 'cr.installmentValue' as cr is of type Credit which uses camelCase
                      total_to_pay: cr.totalToPay, installment_value: cr.installmentValue,
                      total_installments: cr.totalInstallments, frequency: cr.frequency,
                      start_date: cr.startDate, status: 'Active'
                  });
                  await loadBusinessData(currentUser.businessId);
                  setCurrentView('credits'); 
              }}
           />;
        case 'expenses':
           return <ExpensesView expenses={filteredData.expenses} routes={routes} user={currentUser}
              onAdd={async (e) => {
                  await supabase.from('expenses').insert({
                      business_id: currentUser.businessId, route_id: e.routeId, name: e.name,
                      amount: e.value, category: e.type, concept: e.concept, 
                      proof_image_url: e.proofImage, expense_date: e.date
                  });
                  await loadBusinessData(currentUser.businessId);
              }} 
              onDelete={async (id) => { await supabase.from('expenses').delete().eq('id', id); await loadBusinessData(currentUser.businessId); }}
           />;
        case 'routing':
           return <RoutingView clients={filteredData.clients} setClients={setClients} selectedRouteId={selectedRouteId} credits={credits} payments={payments} onGoToCredit={(cid) => { setCreditsFilter(cid); setCurrentView('credits'); }} />;
        case 'liquidation':
           return <LiquidationView selectedRouteId={selectedRouteId} credits={credits} expenses={expenses} payments={payments} clients={clients} routes={routes} transactions={transactions} />;
        case 'users':
           return <UserManagement users={users} routes={routes} currentUser={currentUser} onSave={async () => {
               await loadBusinessData(currentUser.businessId);
           }} />;
        case 'routes_mgmt':
           return <RouteManagement routes={routes} users={users} user={currentUser} transactions={transactions} onSave={() => {}} 
              onAddTransaction={async (t) => {
                  await supabase.from('route_transactions').insert({
                      business_id: currentUser.businessId, route_id: t.routeId, amount: t.amount,
                      type: t.type, description: t.description, transaction_date: t.date
                  });
                  await loadBusinessData(currentUser.businessId);
              }}
           />;
        case 'profile':
           return <UserProfile user={currentUser} users={users} onUpdate={async (u) => { 
               await supabase.from('users').update({
                   name: u.name, phone: u.phone, address: u.address, 
                   country: u.country, city: u.city, username: u.username
               }).eq('id', u.id);
               setCurrentUser(u); 
            }} />;
        case 'credit_details':
           const crDetails = credits.find(c => c.id === selectedCreditId);
           const clDetails = crDetails ? clients.find(c => c.id === crDetails.clientId) : undefined;
           return <ClientDetails client={clDetails} credit={crDetails} payments={payments.filter(p => p.creditId === selectedCreditId)} onBack={() => setCurrentView('credits')}
              onMarkAsLost={async (cid) => { 
                  await supabase.from('credits').update({ status: 'Lost' }).eq('id', cid);
                  await loadBusinessData(currentUser.businessId);
                  setCurrentView('credits'); 
              }}
           />;
        case 'credit_visits':
           const crVisits = credits.find(c => c.id === selectedCreditId);
           const clVisits = crVisits ? clients.find(c => c.id === crVisits.clientId) : undefined;
           return <CreditVisits client={clVisits} credit={crVisits} payments={payments.filter(p => p.creditId === selectedCreditId)} onBack={() => setCurrentView('credits')}
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
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-black animate-pulse">CARGANDO INFRAESTRUCTURA...</div>;
  }

  if (!currentUser) {
     if (currentView === 'auth' || currentView === 'register') {
        return <AuthView 
            mode={currentView === 'register' ? 'register' : 'login'} 
            error={authError} 
            onLogin={handleLogin} 
            onRegister={handleRegister} 
            onBack={() => { setAuthError(null); setCurrentView('landing'); }} 
            onSwitchMode={(m) => { setAuthError(null); setCurrentView(m); }} 
            onRecoverInitiate={handleRecoverInitiate} 
            onRecoverVerify={handleRecoverVerify} 
            onRecoverReset={handleRecoverReset} 
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
