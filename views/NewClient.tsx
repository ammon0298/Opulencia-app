
import React, { useState, useMemo } from 'react';
import { Client, Route, User } from '../types';

interface NewClientProps {
  routes: Route[];
  clients: Client[];
  currentUser: User;
  onSave: (newClientsList: Client[]) => void;
  onCancel: () => void;
}

const NewClient: React.FC<NewClientProps> = ({ routes, clients, currentUser, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    dni: '',
    name: '',
    alias: '',
    address: '',
    phone: '',
    routeId: routes[0]?.id || '',
    insertPosition: 'last' // 'last' or specific index
  });
  
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Get active clients for the selected route, sorted by order
  const activeRouteClients = useMemo(() => {
    return clients
        .filter(c => c.routeId === formData.routeId && c.status === 'Active')
        .sort((a, b) => a.order - b.order);
  }, [clients, formData.routeId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    // Validación básica
    if (clients.some(c => c.dni === formData.dni)) {
      setNotification({ type: 'error', message: 'Ya existe un cliente registrado con este DNI.' });
      return;
    }

    // Determine new order based on selection
    let newOrder = activeRouteClients.length + 1;
    const clientsToUpdate: Client[] = [];

    if (formData.insertPosition !== 'last') {
        const targetIndex = parseInt(formData.insertPosition);
        if (!isNaN(targetIndex)) {
            // New client takes this order
            newOrder = targetIndex + 1; // 0-based index from map to 1-based order
            
            // Shift existing clients
            // Filter clients that have order >= newOrder
            const shiftingClients = activeRouteClients.filter(c => c.order >= newOrder);
            shiftingClients.forEach(c => {
                clientsToUpdate.push({ ...c, order: c.order + 1 });
            });
        }
    }

    const newClient: Client = {
      id: 'c' + Date.now(),
      businessId: currentUser.businessId,
      ...formData,
      order: newOrder,
      status: 'Active'
    };

    clientsToUpdate.push(newClient);

    onSave(clientsToUpdate);
    setNotification({ type: 'success', message: 'Cliente registrado y ruta reordenada exitosamente' });
    // Retrasar el cierre para mostrar el mensaje de éxito brevemente
    setTimeout(onCancel, 1500);
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
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Registro de Cliente</h2>
          <p className="text-slate-500 font-medium">Ingrese los datos básicos para iniciar la gestión</p>
        </div>
      </header>

      {notification && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-slideDown ${notification.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            {notification.type === 'error' ? 
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /> :
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            }
          </svg>
          <p className="text-sm font-black uppercase tracking-widest">{notification.message}</p>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-10 space-y-10">
          
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" /></svg>
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest text-sm">Información Personal</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Número de Identificación (DNI)</label>
                <input 
                  type="text" 
                  value={formData.dni} 
                  onChange={e => setFormData({...formData, dni: e.target.value})}
                  placeholder="Ej: 102030"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-bold text-slate-700"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej: Juan Pérez"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-bold text-slate-700"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Alias o Referencia</label>
                <input 
                  type="text" 
                  value={formData.alias} 
                  onChange={e => setFormData({...formData, alias: e.target.value})}
                  placeholder="Ej: El de la tienda"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-bold text-slate-700"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Teléfono Móvil</label>
                <input 
                  type="text" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  placeholder="Ej: 3001234567"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-bold text-slate-700"
                  required
                />
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-black">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest text-sm">Logística de Cobro</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Dirección Exacta</label>
                <input 
                  type="text" 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  placeholder="Ej: Carrera 10 #20-30 Barrio Centro"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-bold text-slate-700"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ruta de Asignación</label>
                <select 
                  value={formData.routeId}
                  onChange={e => setFormData({...formData, routeId: e.target.value, insertPosition: 'last'})} // Reset position on route change
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-bold text-slate-700 cursor-pointer appearance-none"
                  required
                >
                  {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Posición de Visita</label>
                <div className="relative">
                    <select 
                    value={formData.insertPosition}
                    onChange={e => setFormData({...formData, insertPosition: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-bold text-slate-700 cursor-pointer appearance-none"
                    >
                    <option value="last" className="font-black">AL FINAL (Orden: {activeRouteClients.length + 1})</option>
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
                <p className="text-[9px] text-slate-400 px-2 mt-1">Seleccione "Antes de..." para insertar en la ruta. Los demás clientes se desplazarán automáticamente.</p>
              </div>
            </div>
          </section>

          <div className="pt-10 flex flex-col md:flex-row gap-4">
            <button 
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-5 rounded-3xl shadow-xl transition transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest"
            >
              Registrar Ahora
            </button>
            <button 
              type="button"
              onClick={onCancel}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black px-8 py-5 rounded-3xl transition transform active:scale-95 uppercase tracking-widest text-xs"
            >
              Cancelar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewClient;
