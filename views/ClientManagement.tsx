
import React, { useState } from 'react';
import { Client, Route, User, Credit, Payment } from '../types';
import { useGlobal } from '../contexts/GlobalContext';
import ClientMap from './ClientMap';

interface ClientManagementProps {
  clients: Client[];
  allClients: Client[]; 
  routes: Route[];
  user: User;
  credits?: Credit[]; 
  payments?: Payment[]; 
  selectedRouteId: string;
  onEditClient: (clientId: string) => void;
  onDeleteClient: (clientId: string) => void;
  onNewClient: () => void;
  onUpdateClients: (clients: Client[]) => void;
}

const ClientManagement: React.FC<ClientManagementProps> = ({ clients, allClients, routes, user, credits = [], payments = [], selectedRouteId, onEditClient, onDeleteClient, onNewClient, onUpdateClients }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const { t } = useGlobal();

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.dni.includes(searchTerm)
  );

  const isGlobalView = selectedRouteId === 'all';

  const moveClient = (client: Client, direction: 'up' | 'down') => {
    if (isGlobalView) return;

    const routeClients = allClients.filter(c => c.routeId === client.routeId && c.status === 'Active').sort((a,b) => a.order - b.order);
    const currentIndex = routeClients.findIndex(c => c.id === client.id);
    
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (targetIndex >= 0 && targetIndex < routeClients.length) {
        const otherClient = routeClients[targetIndex];
        const newClientOrder = otherClient.order;
        const newOtherOrder = client.order;
        const updatedSelf = { ...client, order: newClientOrder };
        const updatedOther = { ...otherClient, order: newOtherOrder };
        onUpdateClients([updatedSelf, updatedOther]);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="w-full md:w-auto text-center md:text-left">
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{t('clients')}</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Administración del orden de ruta y geolocalización</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto flex-wrap justify-center md:justify-end">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full sm:w-auto">
             <button onClick={() => setViewMode('list')} className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                {t('view_list')}
             </button>
             <button onClick={() => setViewMode('map')} className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'map' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                {t('view_map')}
             </button>
          </div>
          {viewMode === 'list' && (
            <input 
              type="text" 
              placeholder={t('search')}
              className="pl-6 pr-6 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full sm:w-64 shadow-sm focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900 outline-none font-bold text-slate-700 dark:text-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          )}
          <button onClick={onNewClient} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-3.5 rounded-2xl shadow-xl transition active:scale-95 flex items-center justify-center gap-2">
            +
          </button>
        </div>
      </header>

      {viewMode === 'map' ? (
        <ClientMap clients={filteredClients} credits={credits} payments={payments} />
      ) : (
        <>
            {isGlobalView && !searchTerm && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-4 rounded-2xl flex items-center gap-3 text-amber-700 dark:text-amber-400 animate-fadeIn">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-xs font-bold">
                        Visualización global. Para <span className="font-black underline">cambiar el orden de visita</span>, seleccione una ruta específica.
                    </p>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                    <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        <th className="px-8 py-5">Orden</th>
                        <th className="px-8 py-5">Ruta / Zona</th>
                        <th className="px-8 py-5">Identidad</th>
                        <th className="px-8 py-5">Estado</th>
                        <th className="px-8 py-5">Contacto</th>
                        <th className="px-8 py-5 text-center">Gestión</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {filteredClients.map((client, idx) => {
                        const routeName = routes.find(r => r.id === client.routeId)?.name || 'Sin Asignar';
                        
                        return (
                        <tr key={client.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${client.status === 'Inactive' ? 'bg-slate-50/50 dark:bg-slate-900/50 grayscale opacity-60' : ''}`}>
                        <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border ${client.status === 'Active' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                                    {client.status === 'Active' ? client.order : '-'}
                                </span>
                                {client.status === 'Active' && !isGlobalView && !searchTerm && (
                                    <div className="flex flex-col gap-1">
                                        <button onClick={() => moveClient(client, 'up')} className="w-6 h-6 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg></button>
                                        <button onClick={() => moveClient(client, 'down')} className="w-6 h-6 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg></button>
                                    </div>
                                )}
                            </div>
                        </td>
                        <td className="px-8 py-5">
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                {routeName}
                            </span>
                        </td>
                        <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm ${client.status === 'Active' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                                {client.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-black text-slate-800 dark:text-slate-200">{client.name}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{client.dni}</p>
                            </div>
                            </div>
                        </td>
                        <td className="px-8 py-5">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${client.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                            {t(client.status === 'Active' ? 'status_active' : 'status_inactive' as any)}
                            </span>
                        </td>
                        <td className="px-8 py-5">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{client.phone}</p>
                            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">{client.address}</p>
                        </td>
                        <td className="px-8 py-5">
                            <div className="flex items-center justify-center">
                            <button 
                                onClick={() => onEditClient(client.id)} 
                                className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 transition-all shadow-sm uppercase tracking-widest"
                            >
                                EDITAR
                            </button>
                            </div>
                        </td>
                        </tr>
                    )})}
                    </tbody>
                </table>
                </div>
            </div>
        </>
      )}
    </div>
  );
};

export default ClientManagement;
