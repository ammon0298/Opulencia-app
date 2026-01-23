
import React, { useState, useEffect, useMemo } from 'react';
import { Client, Route, Credit, AccountStatus, User, UserRole } from '../types';

interface EditClientProps {
  client?: Client;
  allClients: Client[]; // Needed for reordering logic
  routes: Route[];
  credit?: Credit;
  currentUser: User | null;
  onSave: (updatedClients: Client[]) => void;
  onCancel: () => void;
}

const EditClient: React.FC<EditClientProps> = ({ client, allClients, routes, credit, currentUser, onSave, onCancel }) => {
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [formData, setFormData] = useState({
    dni: '',
    name: '',
    alias: '',
    address: '',
    phone: '',
    routeId: '',
    order: 0,
    status: 'Active' as AccountStatus,
    targetOrderPosition: 'current' // 'current', 'last', or specific index
  });

  useEffect(() => {
    if (client) {
      setFormData({
        dni: client.dni,
        name: client.name,
        alias: client.alias,
        address: client.address,
        phone: client.phone,
        routeId: client.routeId,
        order: client.order,
        status: client.status || 'Active',
        targetOrderPosition: 'current'
      });
    }
  }, [client]);

  // Determine potential target clients for ordering
  const activeRouteClients = useMemo(() => {
    if (!formData.routeId) return [];
    
    // Filter active clients in the TARGET route
    let list = allClients.filter(c => c.routeId === formData.routeId && c.status === 'Active');
    
    // If we are staying in the same route, exclude self from the list to avoid "Before Self" confusion
    if (client && formData.routeId === client.routeId) {
        list = list.filter(c => c.id !== client.id);
    }
    
    return list.sort((a, b) => a.order - b.order);
  }, [allClients, formData.routeId, client]);

  if (!client) return null;

  const currentBalance = credit ? credit.totalToPay - credit.totalPaid : 0;
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const handleStatusChange = (newStatus: AccountStatus) => {
    setNotification(null);
    if (newStatus === 'Inactive' && currentBalance > 0) {
      setNotification({
        type: 'error', 
        message: `⚠️ ACCIÓN BLOQUEADA: No se puede inactivar a ${client.name} porque tiene un saldo pendiente de $${currentBalance.toLocaleString()}.`
      });
      return;
    }
    setFormData({...formData, status: newStatus});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates: Client[] = [];
    let finalOrder = formData.order;
    const isRouteChanging = formData.routeId !== client.routeId;
    const isOrderChanging = formData.targetOrderPosition !== 'current';

    // Scenario 1: Just changing basic details, no order/route change
    if (!isRouteChanging && !isOrderChanging) {
        updates.push({ ...client, ...formData });
        onSave(updates);
        return;
    }

    // Scenario 2: Changing Order (Same Route) OR Changing Route (New Order logic)
    
    // Step A: Calculate new order in Target Route
    if (isRouteChanging || isOrderChanging) {
        if (formData.targetOrderPosition === 'last' || formData.targetOrderPosition === 'current') {
             // If changing route and selected 'last' (or default), append to end
             finalOrder = activeRouteClients.length + 1;
        } else {
             // Inserting in specific position
             const targetIndex = parseInt(formData.targetOrderPosition);
             finalOrder = targetIndex + 1;
             
             // Shift others down
             activeRouteClients.filter(c => c.order >= finalOrder).forEach(c => {
                 updates.push({ ...c, order: c.order + 1 });
             });
        }
    }

    // Step B: If Route Changed, Close gap in Old Route
    if (isRouteChanging) {
        const oldRouteClients = allClients
            .filter(c => c.routeId === client.routeId && c.status === 'Active' && c.id !== client.id)
            .sort((a,b) => a.order - b.order);
        
        // Re-normalize orders in old route to fill the gap
        oldRouteClients.forEach((c, idx) => {
            if (c.order !== idx + 1) {
                updates.push({ ...c, order: idx + 1 });
            }
        });
    }

    // Step C: Update Self
    updates.push({
        ...client,
        ...formData,
        order: finalOrder
    });

    onSave(updates);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-20">
      <header className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Editar Perfil de Cliente</h2>
          <p className="text-slate-500 font-medium">Gestión de ubicación y estado operativo</p>
        </div>
      </header>

      {notification && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-slideDown ${notification.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            {notification.type === 'error' ? 
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /> :
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            }
          </svg>
          <p className="text-sm font-black uppercase tracking-widest">{notification.message}</p>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8 md:space-y-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 p-6 rounded-[2rem] border border-slate-100 gap-6">
             <div className="w-full sm:w-auto">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado de Cuenta</p>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  Saldo Actual: <span className={currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>${currentBalance.toLocaleString()}</span>
                </p>
             </div>
             
             {/* Lógica de permisos para Activación/Inactivación */}
             {isAdmin ? (
               <div className="flex w-full sm:w-auto bg-white p-1.5 rounded-2xl border border-slate-200 gap-1 shadow-inner">
                  <button 
                    type="button"
                    onClick={() => handleStatusChange('Active')}
                    className={`flex-1 sm:flex-none px-4 md:px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.status === 'Active' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                  >
                    Activo
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleStatusChange('Inactive')}
                    className={`flex-1 sm:flex-none px-4 md:px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      formData.status === 'Inactive' 
                        ? 'bg-rose-600 text-white shadow-lg' 
                        : (currentBalance > 0 ? 'text-rose-300 cursor-not-allowed opacity-50' : 'text-slate-400 hover:bg-slate-50')
                    }`}
                  >
                    Inactivo
                  </button>
               </div>
             ) : (
               <div className="px-6 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${formData.status === 'Active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                     {formData.status === 'Active' ? 'CLIENTE ACTIVO' : 'CLIENTE INACTIVO'}
                  </span>
               </div>
             )}
          </div>

          <section className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cédula / Identificación (Inalterable)</label>
                <input value={formData.dni} disabled className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-6 py-4 outline-none font-bold text-slate-400 cursor-not-allowed shadow-inner" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Completo (Inalterable)</label>
                <input value={formData.name} disabled className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-6 py-4 outline-none font-bold text-slate-400 cursor-not-allowed shadow-inner" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Alias / Apodo Operativo</label>
                <input type="text" value={formData.alias} onChange={e => setFormData({...formData, alias: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-emerald-50 font-bold text-slate-700 transition" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Teléfono Móvil</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-emerald-50 font-bold text-slate-700 transition" required />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ruta Asignada</label>
                <select 
                  value={formData.routeId} 
                  onChange={e => setFormData({...formData, routeId: e.target.value, targetOrderPosition: 'last'})} // Reset pos on route change
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-emerald-50 font-bold text-slate-700 transition appearance-none cursor-pointer"
                  required
                >
                  {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              {formData.status === 'Active' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Reubicar Orden en Ruta</label>
                    <div className="relative">
                        <select 
                        value={formData.targetOrderPosition}
                        onChange={e => setFormData({...formData, targetOrderPosition: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-emerald-50 font-bold text-slate-700 transition appearance-none cursor-pointer"
                        >
                        <option value="current" className="font-black text-indigo-700">-- MANTENER POSICIÓN ACTUAL --</option>
                        <option value="last" className="font-bold">MOVER AL FINAL DE LA RUTA</option>
                        {activeRouteClients.map((c, idx) => (
                            <option key={c.id} value={idx}>
                                Posición {idx + 1} - Antes de: {c.name}
                            </option>
                        ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </div>
                    </div>
                  </div>
              )}

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Dirección Exacta de Cobro</label>
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-emerald-50 font-bold text-slate-700 transition" required />
              </div>
            </div>
          </section>

          <div className="pt-6 md:pt-10 flex flex-col md:flex-row gap-4">
            <button type="submit" className="w-full md:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-5 rounded-3xl shadow-xl transition transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest">Actualizar Perfil</button>
            <button type="button" onClick={onCancel} className="w-full md:flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black px-8 py-5 rounded-3xl transition active:scale-95 uppercase tracking-widest">Descartar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditClient;
