
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Client, Route, Credit, AccountStatus, User, UserRole } from '../types';
import { COUNTRY_DATA } from '../constants';

// Leaflet global
declare const L: any;

interface EditClientProps {
  client?: Client;
  allClients: Client[]; 
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
    phoneCode: '+57',
    phone: '',
    country: 'Colombia',
    city: '',
    routeId: '',
    order: 0,
    status: 'Active' as AccountStatus,
    targetOrderPosition: 'current',
    coordinates: { lat: 4.6097, lng: -74.0817 }
  });

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (client) {
      let pCode = '+57';
      let pNum = client.phone;
      if (client.phone && client.phone.includes(' ')) {
          const parts = client.phone.split(' ');
          if (parts.length > 1 && parts[0].startsWith('+')) {
              pCode = parts[0];
              pNum = parts.slice(1).join(' ');
          }
      }

      setFormData({
        dni: client.dni,
        name: client.name,
        alias: client.alias,
        address: client.address,
        phoneCode: client.phoneCode || pCode,
        phone: pNum,
        country: client.country || 'Colombia',
        city: client.city || '',
        routeId: client.routeId,
        order: client.order,
        status: client.status || 'Active',
        targetOrderPosition: 'current',
        coordinates: client.coordinates || { lat: 4.6097, lng: -74.0817 }
      });
    }
  }, [client]);

  // Inicializar Mapa
  useEffect(() => {
    if (!mapRef.current) return;
    
    if (!mapInstance.current) {
        mapInstance.current = L.map(mapRef.current).setView([formData.coordinates.lat, formData.coordinates.lng], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            maxZoom: 20
        }).addTo(mapInstance.current);

        markerRef.current = L.marker([formData.coordinates.lat, formData.coordinates.lng], { draggable: true })
            .addTo(mapInstance.current);

        markerRef.current.on('dragend', function(event: any) {
            const position = event.target.getLatLng();
            setFormData(prev => ({ ...prev, coordinates: { lat: position.lat, lng: position.lng } }));
        });

        mapInstance.current.on('click', function(e: any) {
            markerRef.current.setLatLng(e.latlng);
            setFormData(prev => ({ ...prev, coordinates: { lat: e.latlng.lat, lng: e.latlng.lng } }));
        });
    } else {
        mapInstance.current.setView([formData.coordinates.lat, formData.coordinates.lng]);
        if(markerRef.current) markerRef.current.setLatLng([formData.coordinates.lat, formData.coordinates.lng]);
    }

    setTimeout(() => mapInstance.current.invalidateSize(), 500);

  }, [formData.coordinates.lat, formData.coordinates.lng]); 

  // Geocodificación Automática al Editar (Incluyendo Dirección)
  useEffect(() => {
    const { address, city, country } = formData;
    if (!city || !country || city.length < 3) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
        try {
            const query = `${address ? address + ', ' : ''}${city}, ${country}`;
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const newLat = parseFloat(data[0].lat);
                const newLng = parseFloat(data[0].lon);
                
                // Actualizar sin causar re-render loop si es muy similar (opcional, por ahora directo)
                setFormData(prev => ({ ...prev, coordinates: { lat: newLat, lng: newLng } }));
                
                if (mapInstance.current && markerRef.current) {
                    mapInstance.current.setView([newLat, newLng], 16, { animate: true });
                    markerRef.current.setLatLng([newLat, newLng]);
                }
            }
        } catch (error) {
            console.error("Error geocodificando:", error);
        }
    }, 1500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [formData.address, formData.city, formData.country]);

  const activeRouteClients = useMemo(() => {
    if (!formData.routeId) return [];
    let list = allClients.filter(c => c.routeId === formData.routeId && c.status === 'Active');
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
        message: `⚠️ ACCIÓN BLOQUEADA: No se puede inactivar a ${client.name} porque tiene saldo pendiente.`
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

    if (!isRouteChanging && !isOrderChanging) {
        updates.push({ 
            ...client, 
            ...formData, 
            phone: `${formData.phoneCode} ${formData.phone}` 
        });
        onSave(updates);
        return;
    }

    if (isRouteChanging || isOrderChanging) {
        if (formData.targetOrderPosition === 'last' || formData.targetOrderPosition === 'current') {
             finalOrder = activeRouteClients.length + 1;
        } else {
             const targetIndex = parseInt(formData.targetOrderPosition);
             finalOrder = targetIndex + 1;
             activeRouteClients.filter(c => c.order >= finalOrder).forEach(c => {
                 updates.push({ ...c, order: c.order + 1 });
             });
        }
    }

    if (isRouteChanging) {
        const oldRouteClients = allClients
            .filter(c => c.routeId === client.routeId && c.status === 'Active' && c.id !== client.id)
            .sort((a,b) => a.order - b.order);
        
        oldRouteClients.forEach((c, idx) => {
            if (c.order !== idx + 1) {
                updates.push({ ...c, order: idx + 1 });
            }
        });
    }

    updates.push({
        ...client,
        ...formData,
        phone: `${formData.phoneCode} ${formData.phone}`,
        order: finalOrder
    });

    onSave(updates);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-20">
      <header className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-slate-600 dark:text-slate-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Editar Cliente</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Actualización de datos y ubicación</p>
        </div>
      </header>

      {notification && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-slideDown ${notification.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
          <p className="text-sm font-black uppercase tracking-widest">{notification.message}</p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-10 space-y-10">
          
          <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] gap-6">
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado Financiero</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-300 mt-1">Saldo: <span className={currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>${currentBalance.toLocaleString()}</span></p>
             </div>
             
             {isAdmin ? (
               <div className="flex bg-white dark:bg-slate-700 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-600 gap-1">
                  <button type="button" onClick={() => handleStatusChange('Active')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.status === 'Active' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>Activo</button>
                  <button type="button" onClick={() => handleStatusChange('Inactive')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.status === 'Inactive' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>Inactivo</button>
               </div>
             ) : (
               <div className="px-6 py-3 bg-white dark:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-600">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${formData.status === 'Active' ? 'text-emerald-600' : 'text-rose-600'}`}>{formData.status === 'Active' ? 'ACTIVO' : 'INACTIVO'}</span>
               </div>
             )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Identificación</label>
                <input value={formData.dni} disabled className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-400 cursor-not-allowed" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre</label>
                <input value={formData.name} disabled className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-400 cursor-not-allowed" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Alias</label>
                <input type="text" value={formData.alias} onChange={e => setFormData({...formData, alias: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-700 dark:text-white" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Móvil</label>
                <div className="flex gap-2">
                    <select value={formData.phoneCode} onChange={(e) => setFormData({...formData, phoneCode: e.target.value})} className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-2 py-4 font-bold text-slate-700 dark:text-white text-xs">{COUNTRY_DATA.map(c => <option key={c.code} value={c.dial_code}>{c.flag} {c.dial_code}</option>)}</select>
                    <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-700 dark:text-white" required />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">País</label>
                <select value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-700 dark:text-white">{COUNTRY_DATA.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}</select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ciudad</label>
                <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-700 dark:text-white" required />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Dirección Física</label>
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-700 dark:text-white" required />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ajustar Ubicación en Mapa</label>
                <div className="w-full h-64 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-inner relative z-0">
                    <div ref={mapRef} className="w-full h-full" />
                </div>
                <p className="text-[10px] text-slate-400 text-center">Coordenadas: {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ruta</label>
                <select value={formData.routeId} onChange={e => setFormData({...formData, routeId: e.target.value, targetOrderPosition: 'last'})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-700 dark:text-white" required>{routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
              </div>

              {formData.status === 'Active' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Orden de Visita</label>
                    <select value={formData.targetOrderPosition} onChange={e => setFormData({...formData, targetOrderPosition: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-700 dark:text-white">
                        <option value="current">MANTENER ACTUAL</option>
                        <option value="last">MOVER AL FINAL</option>
                        {activeRouteClients.map((c, idx) => <option key={c.id} value={idx}>Antes de: {c.name}</option>)}
                    </select>
                  </div>
              )}
          </div>

          <div className="pt-10 flex flex-col md:flex-row gap-4">
            <button type="submit" className="w-full md:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-5 rounded-3xl shadow-xl uppercase tracking-widest">Guardar Cambios</button>
            <button type="button" onClick={onCancel} className="w-full md:flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black px-8 py-5 rounded-3xl uppercase tracking-widest">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditClient;
