
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Client, Route, User, UserRole } from '../types';
import { COUNTRY_DATA } from '../constants';

// Leaflet global
declare const L: any;

interface NewClientProps {
  routes: Route[];
  clients: Client[];
  currentUser: User;
  onSave: (newClientsList: Client[]) => void;
  onCancel: () => void;
}

const NewClient: React.FC<NewClientProps> = ({ routes, clients, currentUser, onSave, onCancel }) => {
  
  // Lógica de permisos: Filtrar rutas permitidas para el usuario actual
  const allowedRoutes = useMemo(() => {
    if (currentUser.role === UserRole.ADMIN) return routes;
    return routes.filter(r => currentUser.routeIds.includes(r.id));
  }, [routes, currentUser]);

  const [formData, setFormData] = useState({
    dni: '',
    name: '',
    alias: '',
    address: '',
    phoneCode: '+57',
    phone: '',
    country: 'Colombia',
    city: '',
    routeId: allowedRoutes.length > 0 ? allowedRoutes[0].id : '', // Pre-seleccionar la primera permitida
    insertPosition: 'last',
    coordinates: { lat: 4.6097, lng: -74.0817 } // Default Bogotá
  });
  
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inicializar Mapa para Picking
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current).setView([formData.coordinates.lat, formData.coordinates.lng], 13);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 20
    }).addTo(mapInstance.current);

    markerRef.current = L.marker([formData.coordinates.lat, formData.coordinates.lng], { draggable: true })
        .addTo(mapInstance.current)
        .bindPopup("Arrastra este pin a la ubicación exacta")
        .openPopup();

    markerRef.current.on('dragend', function(event: any) {
        const position = event.target.getLatLng();
        setFormData(prev => ({ ...prev, coordinates: { lat: position.lat, lng: position.lng } }));
    });

    mapInstance.current.on('click', function(e: any) {
        markerRef.current.setLatLng(e.latlng);
        setFormData(prev => ({ ...prev, coordinates: { lat: e.latlng.lat, lng: e.latlng.lng } }));
    });

    const resizeObserver = new ResizeObserver(() => {
        if (mapInstance.current) {
            mapInstance.current.invalidateSize();
        }
    });
    resizeObserver.observe(mapRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Lógica de Geocodificación Automática (Incluyendo Dirección)
  useEffect(() => {
    const { address, city, country } = formData;
    
    // Solo buscar si hay datos suficientes (Ciudad y País mínimos)
    if (!city || !country || city.length < 3) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
        try {
            // Construir query más precisa: "Calle 123, Ciudad, Pais"
            const query = `${address ? address + ', ' : ''}${city}, ${country}`;
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const newLat = parseFloat(data[0].lat);
                const newLng = parseFloat(data[0].lon);
                
                // Actualizar estado y mapa
                setFormData(prev => ({ ...prev, coordinates: { lat: newLat, lng: newLng } }));
                
                if (mapInstance.current && markerRef.current) {
                    mapInstance.current.setView([newLat, newLng], 16, { animate: true });
                    markerRef.current.setLatLng([newLat, newLng]);
                }
            }
        } catch (error) {
            console.error("Error geocodificando dirección:", error);
        }
    }, 1500); // Debounce de 1.5s

    return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [formData.address, formData.city, formData.country]); // Escuchar cambios en ADDRESS

  const activeRouteClients = useMemo(() => {
    return clients
        .filter(c => c.routeId === formData.routeId && c.status === 'Active')
        .sort((a, b) => a.order - b.order);
  }, [clients, formData.routeId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (clients.some(c => c.dni === formData.dni)) {
      setNotification({ type: 'error', message: 'Ya existe un cliente registrado con este DNI.' });
      return;
    }

    if (!formData.routeId) {
        setNotification({ type: 'error', message: 'Debe asignar una ruta válida.' });
        return;
    }

    let newOrder = activeRouteClients.length + 1;
    const clientsToUpdate: Client[] = [];

    if (formData.insertPosition !== 'last') {
        const targetIndex = parseInt(formData.insertPosition);
        if (!isNaN(targetIndex)) {
            newOrder = targetIndex + 1; 
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
      phone: `${formData.phoneCode} ${formData.phone}`,
      phoneCode: formData.phoneCode,
      order: newOrder,
      status: 'Active'
    };

    clientsToUpdate.push(newClient);

    onSave(clientsToUpdate);
    setNotification({ type: 'success', message: 'Cliente registrado y ruta reordenada exitosamente' });
    setTimeout(onCancel, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-20">
      <header className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-slate-600 dark:text-slate-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Registro de Cliente</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Complete la información de ubicación precisa</p>
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

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-10 space-y-10">
          
          <section className="space-y-6">
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest text-sm border-b dark:border-slate-800 pb-2">1. Identidad y Contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Número de Identificación (DNI)</label>
                <input 
                  type="text" 
                  value={formData.dni} 
                  onChange={e => setFormData({...formData, dni: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none transition font-bold text-slate-700 dark:text-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none transition font-bold text-slate-700 dark:text-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Teléfono Móvil</label>
                <div className="flex gap-2">
                    <select 
                        value={formData.phoneCode}
                        onChange={(e) => setFormData({...formData, phoneCode: e.target.value})}
                        className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-2 py-4 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none transition font-bold text-slate-700 dark:text-white text-xs"
                    >
                        {COUNTRY_DATA.map(c => <option key={c.code} value={c.dial_code}>{c.flag} {c.dial_code}</option>)}
                    </select>
                    <input 
                        type="text" 
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none transition font-bold text-slate-700 dark:text-white"
                        required
                    />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Alias / Apodo</label>
                <input 
                  type="text" 
                  value={formData.alias} 
                  onChange={e => setFormData({...formData, alias: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none transition font-bold text-slate-700 dark:text-white"
                  required
                />
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest text-sm border-b dark:border-slate-800 pb-2">2. Ubicación Geográfica</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">País</label>
                    <select 
                        value={formData.country}
                        onChange={(e) => setFormData({...formData, country: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none transition font-bold text-slate-700 dark:text-white"
                    >
                        {COUNTRY_DATA.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ciudad / Municipio</label>
                    <input 
                        type="text" 
                        value={formData.city} 
                        onChange={e => setFormData({...formData, city: e.target.value})}
                        placeholder="Ej: Manizales"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none transition font-bold text-slate-700 dark:text-white"
                        required
                    />
                </div>
                <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Dirección Escrita</label>
                    <input 
                        type="text" 
                        value={formData.address} 
                        onChange={e => setFormData({...formData, address: e.target.value})}
                        placeholder="Ej: Carrera 23 # 45-10"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none transition font-bold text-slate-700 dark:text-white"
                        required
                    />
                </div>
            </div>

            {/* MAPA PICKER */}
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ajuste Fino de Ubicación (El pin se mueve automáticamente)</label>
                <div className="w-full h-64 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-inner relative z-0">
                    <div ref={mapRef} className="w-full h-full" />
                </div>
                <p className="text-[10px] text-slate-400 text-center">Lat: {formData.coordinates.lat.toFixed(6)}, Lng: {formData.coordinates.lng.toFixed(6)}</p>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest text-sm border-b dark:border-slate-800 pb-2">3. Asignación de Ruta</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ruta</label>
                <select 
                  value={formData.routeId}
                  onChange={e => setFormData({...formData, routeId: e.target.value, insertPosition: 'last'})}
                  className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none transition font-bold text-slate-700 dark:text-white ${allowedRoutes.length === 1 ? 'cursor-not-allowed opacity-80' : ''}`}
                  required
                  disabled={allowedRoutes.length === 1}
                >
                  {allowedRoutes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Posición en Ruta</label>
                <select 
                    value={formData.insertPosition}
                    onChange={e => setFormData({...formData, insertPosition: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900 outline-none transition font-bold text-slate-700 dark:text-white"
                >
                    <option value="last">AL FINAL (Orden: {activeRouteClients.length + 1})</option>
                    {activeRouteClients.map((c, idx) => (
                        <option key={c.id} value={idx}>Antes de: {c.name}</option>
                    ))}
                </select>
              </div>
            </div>
          </section>

          <div className="pt-10 flex flex-col md:flex-row gap-4">
            <button 
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-5 rounded-3xl shadow-xl transition transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest"
            >
              Confirmar Registro
            </button>
            <button 
              type="button"
              onClick={onCancel}
              className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black px-8 py-5 rounded-3xl transition transform active:scale-95 uppercase tracking-widest text-xs"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewClient;
