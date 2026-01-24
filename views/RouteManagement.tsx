
import React, { useState, useMemo } from 'react';
import { Route, User, UserRole, RouteTransaction } from '../types';
import { TODAY_STR } from '../constants';

interface RouteManagementProps {
  routes: Route[];
  users: User[];
  user: User;
  transactions: RouteTransaction[];
  onSave: React.Dispatch<React.SetStateAction<Route[]>>;
  onAddTransaction: (t: RouteTransaction) => void;
}

const RouteManagement: React.FC<RouteManagementProps> = ({ routes, users, user, transactions, onSave, onAddTransaction }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // States for Forms
  const [newRouteName, setNewRouteName] = useState('');
  const [initialBase, setInitialBase] = useState('');
  
  const [fundAction, setFundAction] = useState<'INJECTION' | 'WITHDRAWAL' | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundDescription, setFundDescription] = useState('');

  const getCollectorsForRoute = (routeId: string) => {
    return users.filter(u => u.role === UserRole.COLLECTOR && u.routeIds.includes(routeId));
  };

  const routeHistory = useMemo(() => {
    if (!editingRoute) return [];
    return transactions
      .filter(t => t.routeId === editingRoute.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [editingRoute, transactions]);

  const handleCreateRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRouteName.trim() || !initialBase) return;

    const newId = 'r' + Date.now();
    const newRoute: Route = {
      id: newId,
      businessId: user.businessId,
      name: newRouteName
    };

    onSave(prev => [...prev, newRoute]);

    const initialTx: RouteTransaction = {
      id: 'tx_init_' + Date.now(),
      businessId: user.businessId,
      routeId: newId,
      date: TODAY_STR,
      amount: parseFloat(initialBase),
      type: 'INITIAL_BASE',
      description: 'Fondo Base Inicial - Apertura Ruta'
    };
    onAddTransaction(initialTx);

    setNewRouteName('');
    setInitialBase('');
    setShowForm(false);
  };

  const handleUpdateRouteName = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoute && newRouteName.trim()) {
      onSave(prev => prev.map(r => r.id === editingRoute.id ? { ...r, name: newRouteName } : r));
      setEditingRoute(null);
      setNewRouteName('');
    }
  };

  const handleFundTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    if (!editingRoute || !fundAction || !fundAmount) return;

    const tx: RouteTransaction = {
      id: 'tx_' + Date.now(),
      businessId: user.businessId,
      routeId: editingRoute.id,
      date: TODAY_STR,
      amount: parseFloat(fundAmount),
      type: fundAction,
      description: fundDescription || (fundAction === 'INJECTION' ? 'Inyección de Capital' : 'Retiro de Ganancias')
    };

    onAddTransaction(tx);
    setNotification({ type: 'success', message: 'Transacción registrada exitosamente.' });
    setFundAction(null);
    setFundAmount('');
    setFundDescription('');
  };

  const openEdit = (route: Route) => {
    setNotification(null);
    setEditingRoute(route);
    setNewRouteName(route.name);
    setFundAction(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <header className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2rem] border shadow-sm gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Gestión de Rutas</h2>
          <p className="text-slate-500 font-medium">Control de zonas y auditoría de fondos de base.</p>
        </div>
        <button 
          onClick={() => {
            setShowForm(!showForm);
            setEditingRoute(null);
            setNewRouteName('');
            setInitialBase('');
            setNotification(null);
          }}
          className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black transition hover:bg-indigo-700 shadow-xl flex items-center gap-2 active:scale-95 uppercase tracking-widest text-xs"
        >
          {showForm ? 'Cerrar' : 'Nueva Ruta'}
        </button>
      </header>

      {/* Formulario Crear Nueva Ruta */}
      {showForm && !editingRoute && (
        <div className="bg-white p-10 rounded-[2rem] border shadow-xl animate-slideDown max-w-3xl mx-auto border-t-[8px] border-emerald-500">
           <h3 className="text-xl font-black text-slate-800 mb-6">Apertura de Zona</h3>
           <form onSubmit={handleCreateRoute} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre de la Ruta</label>
                <input 
                  type="text" 
                  value={newRouteName} 
                  onChange={e => setNewRouteName(e.target.value)} 
                  placeholder="Ej: Ruta Central"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-black text-slate-800"
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fondo Base Inicial (Caja)</label>
                <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                   <input 
                    type="number" 
                    value={initialBase} 
                    onChange={e => setInitialBase(e.target.value)} 
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-8 pr-4 py-4 focus:ring-4 focus:ring-emerald-100 outline-none transition font-black text-slate-800"
                    required 
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                 <button type="submit" className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl transition transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest">
                    Confirmar Creación
                 </button>
              </div>
           </form>
        </div>
      )}

      {/* Panel de Edición de Ruta Existente */}
      {editingRoute && (
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border shadow-2xl animate-slideDown max-w-4xl mx-auto relative border-t-[8px] border-indigo-600">
           <button onClick={() => setEditingRoute(null)} className="absolute right-6 top-6 text-slate-400 hover:text-slate-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
           
           <div className="mb-10">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Modo Edición</span>
              <h3 className="text-3xl font-black text-slate-800 mt-2">Administrar: {editingRoute.name}</h3>
           </div>

           {notification && (
            <div className={`p-4 mb-6 rounded-2xl border flex items-center gap-3 animate-fadeIn ${notification.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 {notification.type === 'error' ? 
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /> : 
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                 }
               </svg>
               <p className="text-xs font-black uppercase tracking-widest">{notification.message}</p>
            </div>
           )}

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                 <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest border-b pb-2">Información Básica</h4>
                 <form onSubmit={handleUpdateRouteName} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Renombrar Ruta</label>
                        <input 
                          type="text" 
                          value={newRouteName} 
                          onChange={e => setNewRouteName(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-black text-slate-800"
                          required 
                        />
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-md transition active:scale-95 uppercase tracking-widest text-[10px]">
                        Guardar Nombre
                    </button>
                 </form>
              </div>

              <div className="space-y-6">
                 <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest border-b pb-2">Control de Capital</h4>
                 {!fundAction ? (
                    <div className="grid grid-cols-2 gap-4">
                       <button onClick={() => setFundAction('INJECTION')} className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 p-6 rounded-2xl flex flex-col items-center gap-3 transition group">
                          <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></div>
                          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest text-center">Inyectar<br/>Fondo</span>
                       </button>
                       <button onClick={() => setFundAction('WITHDRAWAL')} className="bg-rose-50 hover:bg-rose-100 border border-rose-200 p-6 rounded-2xl flex flex-col items-center gap-3 transition group">
                          <div className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg></div>
                          <span className="text-[10px] font-black text-rose-800 uppercase tracking-widest text-center">Retirar<br/>Ganancias</span>
                       </button>
                    </div>
                 ) : (
                    <form onSubmit={handleFundTransaction} className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 animate-fadeIn">
                       <div className="flex justify-between items-center mb-2">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${fundAction === 'INJECTION' ? 'text-emerald-600' : 'text-rose-600'}`}>
                             {fundAction === 'INJECTION' ? 'Nueva Inyección' : 'Egreso de Ruta'}
                          </span>
                          <button type="button" onClick={() => setFundAction(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold underline">Cancelar</button>
                       </div>
                       <div className="space-y-1">
                          <input 
                            type="number" 
                            value={fundAmount} 
                            onChange={e => setFundAmount(e.target.value)} 
                            placeholder="Monto ($)"
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 outline-none font-black text-slate-800"
                            required 
                          />
                       </div>
                       <div className="space-y-1">
                          <input 
                            type="text" 
                            value={fundDescription} 
                            onChange={e => setFundDescription(e.target.value)} 
                            placeholder="Concepto (Opcional)"
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 outline-none font-bold text-slate-600 text-xs"
                          />
                       </div>
                       <button type="submit" className={`w-full text-white font-black py-3 rounded-xl shadow-md transition active:scale-95 uppercase tracking-widest text-[10px] ${fundAction === 'INJECTION' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                          Confirmar {fundAction === 'INJECTION' ? 'Ingreso' : 'Retiro'}
                       </button>
                    </form>
                 )}
              </div>
           </div>

           {/* Tabla de Historial de Transacciones (Sin Cambios) */}
           <div className="mt-12 pt-10 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                 </div>
                 <h4 className="text-sm font-black text-slate-600 uppercase tracking-widest">Registro Contable de la Ruta</h4>
              </div>
              
              <div className="bg-slate-50 rounded-[2rem] border border-slate-100 overflow-hidden">
                 <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-400">
                       <tr className="uppercase font-black tracking-widest text-[9px]">
                          <th className="px-6 py-4">Fecha</th>
                          <th className="px-6 py-4">Tipo Movimiento</th>
                          <th className="px-6 py-4">Detalle</th>
                          <th className="px-6 py-4 text-right">Monto</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {routeHistory.length > 0 ? routeHistory.map(tx => (
                          <tr key={tx.id} className="hover:bg-white transition-colors">
                             <td className="px-6 py-4 font-bold text-slate-600">{tx.date}</td>
                             <td className="px-6 py-4">
                                {tx.type === 'INITIAL_BASE' && <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider">Base Inicial</span>}
                                {tx.type === 'INJECTION' && <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider">Inyección</span>}
                                {tx.type === 'WITHDRAWAL' && <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider">Retiro</span>}
                             </td>
                             <td className="px-6 py-4 text-slate-500 font-medium italic">{tx.description}</td>
                             <td className={`px-6 py-4 text-right font-black text-sm ${tx.type === 'WITHDRAWAL' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {tx.type === 'WITHDRAWAL' ? '-' : '+'}${tx.amount.toLocaleString()}
                             </td>
                          </tr>
                       )) : (
                          <tr>
                             <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest">Sin movimientos registrados</td>
                          </tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {/* Grid de Rutas (Sin Cambios) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {routes.map(route => {
          const collectors = getCollectorsForRoute(route.id);
          return (
            <div key={route.id} className="bg-white p-8 rounded-[2.5rem] border shadow-sm hover:shadow-md transition group relative overflow-hidden flex flex-col min-h-[280px]">
              <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => openEdit(route)} 
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-indigo-600 rounded-xl transition font-black text-[10px] uppercase tracking-widest shadow-md active:scale-95"
                  >
                    <IconEdit />
                    Gestionar
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-black text-slate-800 text-2xl mb-1">{route.name}</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Identificador: {route.id.slice(-6).toUpperCase()}</p>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Equipo en Zona ({collectors.length})</p>
                <div className="flex flex-wrap gap-2">
                  {collectors.length > 0 ? collectors.map(c => (
                    <span key={c.id} className="bg-indigo-50 text-indigo-700 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-tight border border-indigo-100">
                      {c.name}
                    </span>
                  )) : (
                    <span className="text-[10px] italic text-slate-300 font-bold uppercase tracking-tighter">Zona disponible para asignación</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {routes.length === 0 && (
          <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             </div>
             <p className="text-slate-400 font-black italic">No hay rutas registradas.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const IconEdit = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>;

export default RouteManagement;
