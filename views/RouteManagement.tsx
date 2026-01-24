
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

    // Persistencia Directa en Supabase
    const { data: routeData, error: rErr } = await supabase.from('routes').insert({
        business_id: user.businessId,
        name: newRouteName
    }).select().single();

    if (rErr) {
        setNotification({ type: 'error', message: 'Error creando ruta.' });
        return;
    }

    await supabase.from('route_transactions').insert({
        business_id: user.businessId,
        route_id: routeData.id,
        amount: parseFloat(initialBase),
        type: 'INITIAL_BASE',
        description: 'Fondo Base Inicial - Apertura Ruta',
        transaction_date: TODAY_STR
    });

    onSave(); // Trigger reload en App.tsx
    setNewRouteName('');
    setInitialBase('');
    setShowForm(false);
    setNotification({ type: 'success', message: 'Ruta creada exitosamente.' });
  };

  const handleUpdateRouteName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoute && newRouteName.trim()) {
      await supabase.from('routes').update({ name: newRouteName }).eq('id', editingRoute.id);
      onSave();
      setEditingRoute(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <header className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2rem] border shadow-sm gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Gestión de Rutas</h2>
          <p className="text-slate-500 font-medium">Control de zonas y auditoría de fondos de base.</p>
        </div>
        <button 
          onClick={() => { setShowForm(!showForm); setEditingRoute(null); setNotification(null); }}
          className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black transition hover:bg-indigo-700 shadow-xl flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest text-xs"
        >
          {showForm ? 'Cerrar' : 'Nueva Ruta'}
        </button>
      </header>

      {showForm && !editingRoute && (
        <div className="bg-white p-10 rounded-[2rem] border shadow-xl animate-slideDown max-w-3xl mx-auto border-t-[8px] border-emerald-500">
           <h3 className="text-xl font-black text-slate-800 mb-6">Apertura de Zona</h3>
           <form onSubmit={handleCreateRoute} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre de la Ruta</label>
                <input type="text" value={newRouteName} onChange={e => setNewRouteName(e.target.value)} placeholder="Ej: Ruta Central" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-black text-slate-800" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fondo Base Inicial (Caja)</label>
                <input type="number" value={initialBase} onChange={e => setInitialBase(e.target.value)} placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-4 py-4 focus:ring-4 focus:ring-emerald-100 outline-none transition font-black text-slate-800" required />
              </div>
              <button type="submit" className="md:col-span-2 bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest">Confirmar Creación</button>
           </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {routes.map(route => (
          <div key={route.id} className="bg-white p-8 rounded-[2.5rem] border shadow-sm hover:shadow-md transition flex flex-col min-h-[200px]">
            <h3 className="font-black text-slate-800 text-2xl mb-1">{route.name}</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">ID: {route.id.slice(-6)}</p>
            <div className="mt-auto pt-6 flex gap-2">
                <button onClick={() => { setEditingRoute(route); setNewRouteName(route.name); }} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Gestionar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RouteManagement;
