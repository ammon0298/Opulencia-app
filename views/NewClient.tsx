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

  // Sincronizar coordenadas externas con el mapa
  useEffect(() => {
    if (mapInstance.current && markerRef.current) {
        const { lat, lng } = formData.coordinates;
        const currentCenter = mapInstance.current.getCenter();
        const dist = Math.sqrt(Math.pow(currentCenter.lat - lat, 2) + Math.pow(currentCenter.lng - lng, 2));
        
        if (dist > 0.0001) {
            mapInstance.current.setView([lat, lng], 16, { animate: true });
            markerRef.current.setLatLng([lat, lng]);
        }
    }
  }, [formData.coordinates]);

  // AUTO-GEOCODING: Solo para Ciudad/País
  useEffect(() => {
    const { city, country } = formData;
    if (!city || !country || city.length < 3) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
        try {
            const cleanCity = city.split('-')[0].trim();
            const query = `${cleanCity}, ${country}`;
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const newLat = parseFloat(data[0].lat);
                const newLng = parseFloat(data[0].lon);
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

  // BUSCADOR MANUAL DE DIRECCIÓN EXACTA CON NORMALIZACIÓN MULTI-PAÍS
  const handleAddressSearch = async () => {
    if (!formData.address || !formData.city) {
        setNotification({ type: 'error', message: 'Ingrese dirección y ciudad para buscar.' });
        return;
    }
    
    setIsSearchingAddr(true);
    
    try {
        let cleanAddress = formData.address.toLowerCase();
        // Limpieza común
        cleanAddress = cleanAddress.replace(/#/g, '').replace(/\bno\.\s/g, '').replace(/\bnum\.\s/g, '');
        
        const country = formData.country.toLowerCase();

        // 1. GRUPO PORTUGUÉS (Brasil)
        if (country.includes('brasil') || country.includes('brazil')) {
             cleanAddress = cleanAddress
                .replace(/\b(r\.|r)\s/g, 'rua ')
                .replace(/\b(av\.|av)\s/g, 'avenida ')
                .replace(/\b(al\.|al)\s/g, 'alameda ')
                .replace(/\b(rod\.|rod)\s/g, 'rodovia ')
                .replace(/\b(st\.|st)\s/g, 'setor ')
                .replace(/\b(jd\.|jd)\s/g, 'jardim ')
                .replace(/\b(pq\.|pq)\s/g, 'parque ')
                .replace(/\b(res\.|res)\s/g, 'residencial ')
                .replace(/\b(est\.|est)\s/g, 'estrada ')
                .replace(/\b(qd\.|qd)\s/g, 'quadra ')
                .replace(/\b(lt\.|lt)\s/g, 'lote ')
                .replace(/\b(bl\.|bl)\s/g, 'bloco ')
                .replace(/\b(ap\.|ap|apto)\s/g, 'apartamento ');
        }
        
        // 2. GRUPO ESPAÑOL (Latinoamérica + España)
        else if (['colombia', 'argentina', 'perú', 'peru', 'chile', 'ecuador', 'venezuela', 'méxico', 'mexico', 'panamá', 'panama', 'costa rica', 'república dominicana', 'republica dominicana', 'españa', 'spain'].some(c => country.includes(c))) {
            
            // Abreviaturas Generales
            cleanAddress = cleanAddress
                .replace(/\b(cll\.|cll|cl\.|cl|c\.|c)\s/g, 'calle ')
                .replace(/\b(cra\.|cra|kr\.|kr|cr\.|cr|kra\.|kra)\s/g, 'carrera ')
                .replace(/\b(av\.|av|avda\.|avda)\s/g, 'avenida ')
                .replace(/\b(dg\.|dg|diag\.|diag)\s/g, 'diagonal ')
                .replace(/\b(tv\.|tv|tr\.|tr|transv\.|transv)\s/g, 'transversal ')
                .replace(/\b(pje\.|pje)\s/g, 'pasaje ')
                .replace(/\b(ap\.|ap|apto\.|apto)\s/g, 'apartamento ')
                .replace(/\b(urb\.|urb)\s/g, 'urbanización ');

            // México
            if (country.includes('mexico') || country.includes('méxico')) {
                cleanAddress = cleanAddress
                    .replace(/\b(col\.|col)\s/g, 'colonia ')
                    .replace(/\b(calz\.|calz)\s/g, 'calzada ')
                    .replace(/\b(blvd\.|blvd)\s/g, 'bulevar ')
                    .replace(/\b(priv\.|priv)\s/g, 'privada ');
            }
            // Perú
            if (country.includes('peru') || country.includes('perú')) {
                cleanAddress = cleanAddress
                    .replace(/\b(jr\.|jr)\s/g, 'jirón ')
                    .replace(/\b(mz\.|mz)\s/g, 'manzana ')
                    .replace(/\b(lt\.|lt)\s/g, 'lote ')
                    .replace(/\b(int\.|int)\s/g, 'interior ');
            }
            // Chile
            if (country.includes('chile')) {
                cleanAddress = cleanAddress
                    .replace(/\b(pobl\.|pobl)\s/g, 'población ')
                    .replace(/\b(v\.|v)\s/g, 'villa ');
            }
            // Argentina
            if (country.includes('argentina')) {
                 cleanAddress = cleanAddress
                    .replace(/\b(b°|b\.|b)\s/g, 'barrio ');
            }
            // España
             if (country.includes('españa') || country.includes('spain')) {
                 cleanAddress = cleanAddress
                    .replace(/\b(pza\.|pza)\s/g, 'plaza ')
                    .replace(/\b(pigo\.|pigo)\s/g, 'polígono ')
                    .replace(/\b(c\/)\s/g, 'calle ');
            }
        }

        // 3. GRUPO ANGLOPARLANTE (USA, UK, India)
        else if (['estados unidos', 'usa', 'united states', 'reino unido', 'uk', 'united kingdom', 'india'].some(c => country.includes(c))) {
             cleanAddress = cleanAddress
                .replace(/\b(st\.|st)\s/g, 'street ')
                .replace(/\b(ave\.|ave)\s/g, 'avenue ')
                .replace(/\b(rd\.|rd)\s/g, 'road ')
                .replace(/\b(blvd\.|blvd)\s/g, 'boulevard ')
                .replace(/\b(dr\.|dr)\s/g, 'drive ')
                .replace(/\b(ln\.|ln)\s/g, 'lane ')
                .replace(/\b(apt\.|apt)\s/g, 'apartment ')
                .replace(/\b(ste\.|ste)\s/g, 'suite ');
        }

        // 4. FRANCIA
        else if (country.includes('francia') || country.includes('france')) {
             cleanAddress = cleanAddress
                .replace(/\b(r\.|r)\s/g, 'rue ')
                .replace(/\b(av\.|av)\s/g, 'avenue ')
                .replace(/\b(bd\.|bd)\s/g, 'boulevard ')
                .replace(/\b(imp\.|imp)\s/g, 'impasse ')
                .replace(/\b(pl\.|pl)\s/g, 'place ');
        }

        // 5. ALEMANIA
        else if (country.includes('alemania') || country.includes('germany')) {
             cleanAddress = cleanAddress
                .replace(/\b(str\.|str)\s/g, 'straße ')
                .replace(/\b(pl\.|pl)\s/g, 'platz ');
        }

        // 6. ITALIA
        else if (country.includes('italia') || country.includes('italy')) {
             cleanAddress = cleanAddress
                .replace(/\b(v\.|v)\s/g, 'via ')
                .replace(/\b(c\.so|cso)\s/g, 'corso ')
                .replace(/\b(p\.za|pza)\s/g, 'piazza ')
                .replace(/\b(v\.le|vle)\s/g, 'viale ');
        }

        // Limpieza de Códigos Postales (genérica para evitar conflictos)
        cleanAddress = cleanAddress.replace(/\b[0-9]{5}(-?[0-9]{3,4})?\b/g, ''); 

        // Limpiar ciudad (ej: "Goiânia - GO" -> "Goiânia")
        const cleanCity = formData.city.split('-')[0].trim();
        const cleanState = formData.city.includes('-') ? formData.city.split('-')[1].trim() : '';

        // Query principal estructurada
        let query = `${cleanAddress}, ${cleanCity}, ${formData.country}`;
        if (cleanState) query += `, ${cleanState}`;
        
        let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`);
        let data = await response.json();

        // FALLBACK: Si falla, intentar una búsqueda más laxa (Solo Calle + Ciudad)
        if (!data || data.length === 0) {
            // Quitar detalles de barrio o números complejos, buscar solo la vía principal
            const simpleStreet = cleanAddress.split(',')[0].split('-')[0].trim(); 
            const fallbackQuery = `${simpleStreet}, ${cleanCity}, ${formData.country}`;
            console.log("Intentando fallback:", fallbackQuery);
            response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackQuery)}&limit=1`);
            data = await response.json();
        }

        if (data && data.length > 0) {
            const newLat = parseFloat(data[0].lat);
            const newLng = parseFloat(data[0].lon);
            setFormData(prev => ({ ...prev, coordinates: { lat: newLat, lng: newLng } }));
            setNotification({ type: 'success', message: 'Dirección encontrada. Ajuste el pin si es necesario.' });
        } else {
            setNotification({ type: 'error', message: 'Ubicación aproximada no encontrada. Mueva el pin manualmente.' });
        }
    } catch (e) {
        console.error(e);
        setNotification({ type: 'error', message: 'Error de conexión con el servicio de mapas.' });
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
        {/* FIX: Reduced padding on mobile (p-6) to prevent overflow */}
        <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-10">
          
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
                    {/* FIX: added min-w-0 to allow shrinking in flex container */}
                    <input 
                        type="text" 
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-700 dark:text-white"
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
                        placeholder="Ej: Aparecida de Goiânia - GO"
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
                            placeholder="Ej: R. Maringá - Vila Brasilia"
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