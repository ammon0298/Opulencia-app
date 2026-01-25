import React, { useState, useMemo } from 'react';
import { Route, User, UserRole, RouteTransaction } from '../types';
import { TODAY_STR } from '../constants';
import { supabase } from '../lib/supabase';

interface RouteManagementProps {
  routes: Route[];
  users: User[];
  user: User;
  transactions: RouteTransaction[];
  onSave: () => void;
  onAddTransaction: (t: any) => void;
}

const RouteManagement: React.FC<RouteManagementProps> = ({ routes, users, user, transactions, onSave, onAddTransaction }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  const [newRouteName, setNewRouteName] = useState('');
  const [initialBase, setInitialBase] = useState('');
  
  const [fundAction, setFundAction] = useState<'INJECTION' | 'WITHDRAWAL' | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundDescription, setFundDescription] = useState('');

  const routeHistory = useMemo(() => {
    if (!editingRoute) return [];
    return transactions
      .filter(t => t.routeId === editingRoute.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [editingRoute, transactions]);

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRouteName.trim() || !initialBase) return;

    try {
        const { data: routeData, error: rErr } = await supabase.from('routes').insert({
            business_id: user.businessId,
            name: newRouteName.trim()
        }).select().single();

        if (rErr) throw rErr;

        const { error: tErr } = await supabase.from('route_transactions').insert({
            business_id: user.businessId,
            route_id: routeData.id,
            amount: parseFloat(initialBase),
            type: 'INITIAL_BASE',
            description: `Apertura de ruta: ${newRouteName.trim()}`,
            transaction_date: TODAY_STR
        });

        if (tErr) throw tErr;

        onSave();
        setNewRouteName('');
        setInitialBase('');
        setShowForm(false);
        setNotification({ type: 'success', message: 'Ruta y Capital de Base creados exitosamente.' });
    } catch (err: any) {
        console.error("Error creating route:", err);
        setNotification({ type: 'error', message: `Error crítico: ${err.message}` });
    }
  };

  const handleManageFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute || !fundAction || !fundAmount) return;

    try {
        const { error } = await supabase.from('route_transactions').insert({
            business_id: user.businessId,
            route_id: editingRoute.id,
            amount: parseFloat(fundAmount),
            type: fundAction,
            description: fundDescription || (fundAction === 'INJECTION' ? 'Ajuste / Inyección' : 'Retiro Operativo'),
            transaction_date: TODAY_STR
        });

        if (error) throw error;

        onSave();
        setFundAction(null);
        setFundAmount('');
        setFundDescription('');
        setNotification({ type: 'success', message: 'Movimiento de fondos registrado.' });
    } catch (err: any) {
        setNotification({ type: 'error', message: err.message });
    }
  };

  // CORRECCIÓN 7: Implementación de renombrado de ruta
  const handleUpdateRouteName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoute && newRouteName.trim() && newRouteName.trim() !== editingRoute.name) {
      try {
          const { error } = await supabase.from('routes').update({ name: newRouteName.trim() }).eq('id', editingRoute.id);
          if (error) throw error;
          
          onSave();
          setNotification({ type: 'success', message: 'Nombre de ruta actualizado.' });
          // Actualizar el estado local para reflejar el cambio en la UI inmediatamente
          setEditingRoute({ ...editingRoute, name: newRouteName.trim() });
      } catch (err: any) {
          setNotification({ type: 'error', message: `Error al renombrar: ${err.message}` });
      }
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <header className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Gestión de Rutas</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Control de zonas y auditoría de fondos de base.</p>
        </div>
        <button 
          onClick={() => { setShowForm(!showForm); setEditingRoute(null); setNotification(null); }}
          className={`px-8 py-3.5 rounded-2xl font-black transition shadow-xl flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest text-xs ${showForm ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
        >
          {showForm ? 'Cerrar' : 'Nueva Ruta'}
        </button>
      </header>

      {notification && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-slideDown ${notification.type === 'error' ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400'}`}>
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           <p className="text-xs font-black uppercase tracking-widest">{notification.message}</p>
        </div>
      )}

      {showForm && !editingRoute && (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl animate-slideDown max-w-3xl mx-auto border-t-[8px] border-emerald-500">
           <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6">Apertura de Zona</h3>
           <form onSubmit={handleCreateRoute} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre de la Ruta</label>
                <input type="text" value={newRouteName} onChange={e => setNewRouteName(e.target.value)} placeholder="Ej: Ruta Central" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none transition font-black text-slate-800 dark:text-white shadow-inner" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fondo Base Inicial (Caja)</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">$</span>
                    <input type="number" value={initialBase} onChange={e => setInitialBase(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-8 pr-4 py-4 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900 outline-none transition font-black text-slate-800 dark:text-white shadow-inner" required />
                </div>
              </div>
              <button type="submit" className="md:col-span-2 bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-sm hover:bg-emerald-700 transition-all">Confirmar Creación de Zona</button>
           </form>
        </div>
      )}

      {editingRoute && (
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl animate-slideDown border-t-[8px] border-indigo-600 max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white">Gestionar: {editingRoute.name}</h3>
                  <button onClick={() => setEditingRoute(null)} className="text-slate-400 hover:text-rose-500 font-black uppercase text-[10px] tracking-widest">Cerrar Detalle</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-8">
                      {/* Formulario de Renombrado */}
                      <form onSubmit={handleUpdateRouteName} className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
                          <h4 className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em] mb-4">Configuración de Ruta</h4>
                          <div className="space-y-2 mb-4">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre</label>
                              <input 
                                type="text" 
                                value={newRouteName} 
                                onChange={e => setNewRouteName(e.target.value)} 
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-2xl px-4 py-3 font-black text-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none" 
                              />
                          </div>
                          <button type="submit" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-black py-3 rounded-xl uppercase tracking-widest text-[10px] shadow-sm active:scale-95 transition-colors">
                              Actualizar Nombre
                          </button>
                      </form>

                      {/* Formulario de Fondos */}
                      <form onSubmit={handleManageFunds} className="space-y-6">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Movimientos de Capital</h4>
                          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-2 border border-slate-200 dark:border-slate-700">
                              <button type="button" onClick={() => setFundAction('INJECTION')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${fundAction === 'INJECTION' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 dark:text-slate-500 hover:text-emerald-500'}`}>Inyección (+)</button>
                              <button type="button" onClick={() => setFundAction('WITHDRAWAL')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${fundAction === 'WITHDRAWAL' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 dark:text-slate-500 hover:text-rose-500'}`}>Retiro (-)</button>
                          </div>
                          <Input label="Monto" value={fundAmount} onChange={setFundAmount} type="number" required />
                          <Input label="Nota / Justificación" value={fundDescription} onChange={setFundDescription} placeholder="Opcional" />
                          <button type="submit" disabled={!fundAction} className="w-full bg-slate-900 dark:bg-indigo-600 hover:dark:bg-indigo-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 disabled:opacity-50">Registrar Operación</button>
                      </form>
                  </div>

                  <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Historial Financiero</h4>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 h-[400px] overflow-y-auto space-y-3 shadow-inner border border-slate-100 dark:border-slate-700">
                          {routeHistory.length > 0 ? routeHistory.map(tx => (
                              <div key={tx.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center shadow-sm">
                                  <div>
                                      <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{tx.description}</p>
                                      <p className="text-[8px] font-bold text-slate-400 uppercase">{tx.date}</p>
                                  </div>
                                  <p className={`font-black text-sm ${tx.type === 'WITHDRAWAL' ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                                      {tx.type === 'WITHDRAWAL' ? '-' : '+'}${tx.amount.toLocaleString()}
                                  </p>
                              </div>
                          )) : <p className="text-center py-20 text-[10px] font-black uppercase text-slate-300 dark:text-slate-600">Sin historial</p>}
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {routes.map(route => (
          <div key={route.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col min-h-[220px] group">
            <h3 className="font-black text-slate-800 dark:text-white text-2xl mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{route.name}</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">ID UNICO: {route.id.slice(-8).toUpperCase()}</p>
            <div className="mt-auto pt-6 flex gap-2">
                <button 
                    onClick={() => { setEditingRoute(route); setNewRouteName(route.name); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                    className="flex-1 bg-slate-900 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
                >
                    Gestionar Fondos
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, type = 'text', required, placeholder }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      placeholder={placeholder}
      className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none transition font-bold text-slate-800 dark:text-white shadow-inner"
      required={required}
    />
  </div>
);

export default RouteManagement;