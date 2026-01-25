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
    routeId: allowedRoutes.length > 0 ? allowedRoutes[0].id : '', 
    insertPosition: 'last',
    coordinates: { lat: 4.6097, lng: -74.0817 } // Default Bogotá
  });
  
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearchingAddr, setIsSearchingAddr] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inicializar Mapa
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
        .bindPopup("Ubicación del Cliente")
        .openPopup();

    // Evento: Al mover el pin manualmente
    markerRef.current.on('dragend', function(event: any) {
        const position = event.target.getLatLng();
        setFormData(prev => ({ ...prev, coordinates: { lat: position.lat, lng: position.lng } }));
    });

    // Evento: Al hacer click en el mapa
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

  // Sincronizar coordenadas externas con el mapa (Solo si cambian drásticamente o por GPS)
  useEffect(() => {
    if (mapInstance.current && markerRef.current) {
        const { lat, lng } = formData.coordinates;
        // Solo mover la vista si la distancia es significativa para evitar saltos pequeños al arrastrar
        const currentCenter = mapInstance.current.getCenter();
        const dist = Math.sqrt(Math.pow(currentCenter.lat - lat, 2) + Math.pow(currentCenter.lng - lng, 2));
        
        if (dist > 0.0001) {
            mapInstance.current.setView([lat, lng], 16, { animate: true });
            markerRef.current.setLatLng([lat, lng]);
        }
    }
  }, [formData.coordinates]);

  // AUTO-GEOCODING: Solo para Ciudad/País (Macro ubicación)
  // NO escuchamos 'address' aquí para evitar sobrescribir el pin cuando el usuario escribe la calle.
  useEffect(() => {
    const { city, country } = formData;
    if (!city || !country || city.length < 3) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
        try {
            // Búsqueda general solo por ciudad para centrar el mapa inicialmente
            const query = `${city}, ${country}`;
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const newLat = parseFloat(data[0].lat);
                const newLng = parseFloat(data[0].lon);
                // Solo actualizamos si no hay una dirección específica escrita, para no perder el foco
                if (!formData.address) {
                    setFormData(prev => ({ ...prev, coordinates: { lat: newLat, lng: newLng } }));
                }
            }
        } catch (error) {
            console.error("Error geocodificando ciudad:", error);
        }
    }, 1500);

    return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [formData.city, formData.country]);

  // BUSCADOR MANUAL DE DIRECCIÓN EXACTA
  const handleAddressSearch = async () => {
    if (!formData.address || !formData.city) {
        setNotification({ type: 'error', message: 'Ingrese dirección y ciudad para buscar.' });
        return;
    }
    
    setIsSearchingAddr(true);
    try {
        // Limpieza de dirección para formato OSM estándar
        let cleanAddress = formData.address
            .toLowerCase()
            .replace(/\b(no|num|numero|casa)\b\.?/g, '#') 
            .replace(/\b(cll|cl)\b\.?/g, 'calle') 
            .replace(/\b(cr|cra|kcra)\b\.?/g, 'carrera') 
            .replace(/\b(av)\b\.?/g, 'avenida'); 

        const query = `${cleanAddress}, ${formData.city}, ${formData.country}`;
        
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`);
        const data = await response.json();

        if (data && data.length > 0) {
            const newLat = parseFloat(data[0].lat);
            const newLng = parseFloat(data[0].lon);
            setFormData(prev => ({ ...prev, coordinates: { lat: newLat, lng: newLng } }));
            setNotification({ type: 'success', message: 'Dirección encontrada en el mapa.' });
        } else {
            setNotification({ type: 'error', message: 'No se encontró exacto. Intente mover el pin manualmente.' });
        }
    } catch (e) {
        setNotification({ type: 'error', message: 'Error de conexión con el mapa.' });
    } finally {
        setIsSearchingAddr(false);
    }
  };

  const handleGetCurrentLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
        setNotification({ type: 'error', message: 'Geolocalización no soportada.' });
        setIsLocating(false);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            setFormData(prev => ({
                ...prev,
                coordinates: {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                }
            }));
            setNotification({ type: 'success', message: 'Ubicación GPS aplicada.' });
            setIsLocating(false);
        },
        (error) => {
            console.error(error);
            setNotification({ type: 'error', message: 'Active el GPS del dispositivo.' });
            setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const activeRouteClients = useMemo(() => {
    return clients
        .filter(c => c.routeId === formData.routeId && c.status === 'Active')
        .sort((a, b) => a.order - b.order);
  }, [clients, formData.routeId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (clients.some(c => c.dni === formData.dni)) {
      setNotification({ type: 'error', message: 'DNI ya registrado.' });
      return;
    }

    if (!formData.routeId) {
        setNotification({ type: 'error', message: 'Asigne una ruta.' });
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
    setNotification({ type: 'success', message: 'Cliente registrado.' });
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
          <p className="text-slate-500 dark:text-slate-400 font-medium">Ubicación manual o por dirección</p>
        </div>
      </header>

      {notification && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-slideDown ${notification.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
          <p className="text-sm font-black uppercase tracking-widest">{notification.message}</p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-10 space-y-10">
          
          <section className="space-y-6">
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest text-sm border-b dark:border-slate-800 pb-2">1. Datos Básicos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">DNI / Cédula</label>
                <input 
                  type="text" 
                  value={formData.dni} 
                  onChange={e => setFormData({...formData, dni: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-700 dark:text-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-700 dark:text-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Celular</label>
                <div className="flex gap-2">
                    <select 
                        value={formData.phoneCode}
                        onChange={(e) => setFormData({...formData, phoneCode: e.target.value})}
                        className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-2 py-4 font-bold text-slate-700 dark:text-white text-xs"
                    >
                        {COUNTRY_DATA.map(c => <option key={c.code} value={c.dial_code}>{c.flag} {c.dial_code}</option>)}
                    </select>
                    <input 
                        type="text" 
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-700 dark:text-white"
                        required
                    />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Alias</label>
                <input 
                  type="text" 
                  value={formData.alias} 
                  onChange={e => setFormData({...formData, alias: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-700 dark:text-white"
                  required
                />
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest text-sm border-b dark:border-slate-800 pb-2">2. Geolocalización (Importante)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* CAMPO PAIS REINTRODUCIDO */}
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">País</label>
                    <select 
                        value={formData.country}
                        onChange={(e) => setFormData({...formData, country: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-700 dark:text-white"
                    >
                        {COUNTRY_DATA.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ciudad</label>
                    <input 
                        type="text" 
                        value={formData.city} 
                        onChange={e => setFormData({...formData, city: e.target.value})}
                        placeholder="Ej: Manizales"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-700 dark:text-white"
                        required
                    />
                </div>
                <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Dirección Escrita</label>
                    {/* FIX: Use flex-col on mobile, flex-row on sm screens to prevent overflow */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input 
                            type="text" 
                            value={formData.address} 
                            onChange={e => setFormData({...formData, address: e.target.value})}
                            placeholder="Ej: Cll 49 no 8a-02 San Cayetano"
                            className="w-full sm:flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-700 dark:text-white"
                            required
                        />
                        <button 
                            type="button"
                            onClick={handleAddressSearch}
                            disabled={isSearchingAddr}
                            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 sm:py-0 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50 whitespace-nowrap"
                        >
                            {isSearchingAddr ? '...' : '🔍 Buscar en Mapa'}
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-400 pl-2">Use el botón "Buscar" para mover el pin, o arrástrelo manualmente.</p>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ubicación del Pin (Arrastre para ajustar)</label>
                    <button 
                        type="button" 
                        onClick={handleGetCurrentLocation}
                        disabled={isLocating}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                        {isLocating ? 'Obteniendo GPS...' : '📍 Usar Mi GPS'}
                    </button>
                </div>
                <div className="w-full h-72 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-inner relative z-0">
                    <div ref={mapRef} className="w-full h-full" />
                </div>
                <p className="text-[10px] text-slate-400 text-center font-mono">
                    Lat: {formData.coordinates.lat.toFixed(5)} | Lng: {formData.coordinates.lng.toFixed(5)}
                </p>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest text-sm border-b dark:border-slate-800 pb-2">3. Ruta</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Seleccionar Ruta</label>
                <select 
                  value={formData.routeId}
                  onChange={e => setFormData({...formData, routeId: e.target.value, insertPosition: 'last'})}
                  className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-700 dark:text-white`}
                  required
                >
                  {allowedRoutes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Orden de Visita</label>
                <select 
                    value={formData.insertPosition}
                    onChange={e => setFormData({...formData, insertPosition: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-700 dark:text-white"
                >
                    <option value="last">AL FINAL (Turno {activeRouteClients.length + 1})</option>
                    {activeRouteClients.map((c, idx) => (
                        <option key={c.id} value={idx}>Antes de: {c.name}</option>
                    ))}
                </select>
              </div>
            </div>
          </section>

          <div className="pt-10 flex flex-col md:flex-row gap-4">
            <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-5 rounded-3xl shadow-xl uppercase tracking-widest transition transform active:scale-95">
              Guardar Cliente
            </button>
            <button type="button" onClick={onCancel} className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black px-8 py-5 rounded-3xl uppercase tracking-widest text-xs">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewClient;