import React, { useEffect, useRef, useState } from 'react';
import { User, Route, Client } from '../types';
import { useGlobal } from '../contexts/GlobalContext';

// Declaración global para Leaflet
declare const L: any;

interface CollectorMapProps {
  users: User[];
  routes: Route[];
  clients: Client[];
  selectedRouteId: string;
}

const CollectorMap: React.FC<CollectorMapProps> = ({ users, routes, clients, selectedRouteId }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const { theme, t } = useGlobal();
  const [selectedCollector, setSelectedCollector] = useState<User | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // FILTRO GLOBAL DE RUTA: Aplicar tanto a cobradores como a clientes
  const activeRouteId = selectedRouteId === 'all' ? null : selectedRouteId;

  // Filtrar cobradores activos, con ubicación y que pertenezcan a la ruta seleccionada (si aplica)
  const activeCollectors = users.filter(u => 
    u.role === 'COLLECTOR' && 
    u.status === 'Active' &&
    u.currentLocation && 
    u.currentLocation.lat !== null && 
    u.currentLocation.lng !== null &&
    (!activeRouteId || u.routeIds.includes(activeRouteId))
  );

  // Filtrar clientes con ubicación y que pertenezcan a la ruta seleccionada (si aplica)
  const mappedClients = clients.filter(c => 
    c.status === 'Active' &&
    c.coordinates && 
    c.coordinates.lat !== undefined &&
    c.coordinates.lng !== undefined &&
    (!activeRouteId || c.routeId === activeRouteId)
  );

  // Función auxiliar para calcular tiempo transcurrido
  const getTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Sin datos';
    const reportDate = new Date(dateStr);
    const diff = Date.now() - reportDate.getTime();
    
    // Si la fecha es muy antigua (año incorrecto o similar), mostrar solo fecha
    if (diff < 0) return 'Fecha futura (?)';

    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Ahora mismo';
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} horas`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} días`;
  };

  const formatDateTime = (dateStr: string) => {
      if (!dateStr) return '--';
      return new Date(dateStr).toLocaleString('es-ES', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true
      });
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Inicializar mapa si no existe
    if (!mapInstance.current) {
        // Capa de Calles (Dinámica)
        const tileUrl = theme === 'dark' 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      
        const streetLayer = L.tileLayer(tileUrl, {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        });

        // Capa de Satélite
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri',
            maxZoom: 19
        });

        mapInstance.current = L.map(mapRef.current, {
            center: [4.6097, -74.0817],
            zoom: 13,
            layers: [streetLayer] // Default
        });

        // Control de Capas
        const baseMaps = {
            "Mapa Callejero": streetLayer,
            "Satélite": satelliteLayer
        };
        L.control.layers(baseMaps).addTo(mapInstance.current);

    } else {
        // Actualizar capa callejera al cambiar tema
        mapInstance.current.eachLayer((layer: any) => {
            if (layer instanceof L.TileLayer && !layer._url.includes('arcgisonline')) {
                const newUrl = theme === 'dark' 
                    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
                    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
                layer.setUrl(newUrl);
            }
        });
    }

    // Resize Observer para corrección visual al cargar/redimensionar
    const resizeObserver = new ResizeObserver(() => {
        if (mapInstance.current) {
            mapInstance.current.invalidateSize();
        }
    });
    resizeObserver.observe(mapRef.current);

    // Limpiar marcadores anteriores
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const points: any[] = [];

    // --- 1. RENDERIZAR CLIENTES (Puntos Verdes Fijos) ---
    mappedClients.forEach(client => {
        if (!client.coordinates) return;
        const { lat, lng } = client.coordinates;
        points.push([lat, lng]);

        // Icono simple para cliente (Punto verde)
        const clientIcon = L.divIcon({
            className: 'client-dot',
            html: `<div style="background-color: #10b981; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });

        const marker = L.marker([lat, lng], { icon: clientIcon })
            .addTo(mapInstance.current)
            .bindTooltip(client.name, { direction: 'top', offset: [0, -10], opacity: 0.8 }) // Tooltip con nombre al pasar mouse
            .on('click', () => {
                setSelectedClient(client);
                setSelectedCollector(null); // Deseleccionar cobrador si se selecciona cliente
                mapInstance.current.setView([lat, lng], 18, { animate: true });
            });
        
        markersRef.current.push(marker);
    });

    // --- 2. RENDERIZAR COBRADORES (Avatar Pulsante) ---
    activeCollectors.forEach(collector => {
      if (!collector.currentLocation) return;

      const { lat, lng, timestamp } = collector.currentLocation;
      points.push([lat, lng]);

      // Icono personalizado para cobrador (Avatar)
      const customIcon = L.divIcon({
        className: 'collector-pin',
        html: `
          <div class="relative">
            <div class="w-12 h-12 bg-indigo-600 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-white font-black text-sm relative z-10 overflow-hidden">
               ${collector.name.charAt(0)}
            </div>
            <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white"></div>
            <div class="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-20 -z-10 scale-150"></div>
          </div>
        `,
        iconSize: [48, 48], // Aumentado para mejor tacto
        iconAnchor: [24, 56]
      });

      const marker = L.marker([lat, lng], { icon: customIcon, zIndexOffset: 1000 }) // Cobradores siempre encima
        .addTo(mapInstance.current)
        .on('click', () => {
            setSelectedCollector({
                ...collector,
                currentLocation: { lat, lng, timestamp: timestamp || new Date().toISOString() }
            });
            setSelectedClient(null); // Deseleccionar cliente
            mapInstance.current.setView([lat, lng], 16, { animate: true });
        });

      markersRef.current.push(marker);
    });

    // AUTO FIT: Ajustar vista para incluir todo
    if (points.length > 0) {
        const bounds = L.latLngBounds(points);
        mapInstance.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
    }

    return () => resizeObserver.disconnect();

  }, [users, clients, selectedRouteId, theme]);

  return (
    <div className="relative w-full h-[600px] rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
      <div ref={mapRef} className="w-full h-full z-0" />
      
      {/* Leyenda Flotante (Z-Index ajustado a z-20 para no tapar el menú z-50) */}
      <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl shadow-lg z-[400] border border-slate-100 dark:border-slate-700">
         <div className="flex flex-col gap-2">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Cobradores ({activeCollectors.length})</p>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full border border-white shadow-sm"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Clientes ({mappedClients.length})</p>
             </div>
         </div>
      </div>

      {/* Modal Detalle Cobrador */}
      {selectedCollector && (
        <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-80 bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-2xl z-[1000] border border-slate-100 dark:border-slate-700 animate-slideUp">
            <button onClick={() => setSelectedCollector(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center font-black text-xl text-indigo-600 dark:text-indigo-400">
                    {selectedCollector.name.charAt(0)}
                </div>
                <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-lg leading-tight truncate max-w-[150px]">{selectedCollector.name}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cobrador</p>
                </div>
            </div>

            <div className="space-y-3 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Último Reporte</span>
                    <div className="flex flex-col mt-1">
                        <span className="text-xs font-bold text-emerald-600">
                            {getTimeAgo(selectedCollector.currentLocation?.timestamp || '')}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            {formatDateTime(selectedCollector.currentLocation?.timestamp || '')}
                        </span>
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Rutas Asignadas</span>
                    <div className="flex flex-wrap gap-1">
                        {selectedCollector.routeIds.map(rid => {
                            const rName = routes.find(r => r.id === rid)?.name || rid;
                            return (
                                <span key={rid} className="px-2 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[9px] font-bold text-slate-600 dark:text-slate-300">
                                    {rName}
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>

            <a 
                href={`https://www.google.com/maps/search/?api=1&query=${selectedCollector.currentLocation?.lat},${selectedCollector.currentLocation?.lng}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl shadow-lg transition active:scale-95 uppercase tracking-widest text-[10px]"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                Ver en Google Maps
            </a>
        </div>
      )}

      {/* Modal Detalle Cliente */}
      {selectedClient && (
        <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-80 bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-2xl z-[1000] border border-slate-100 dark:border-slate-700 animate-slideUp">
            <button onClick={() => setSelectedClient(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center font-black text-xl text-emerald-600 dark:text-emerald-400">
                    {selectedClient.name.charAt(0)}
                </div>
                <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-lg leading-tight truncate max-w-[150px]">{selectedClient.name}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{selectedClient.alias || 'Cliente'}</p>
                </div>
            </div>

            <div className="space-y-3 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Ubicación Registrada</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 line-clamp-2">
                        {selectedClient.address}
                    </p>
                </div>
            </div>

            <a 
                href={`https://www.google.com/maps/search/?api=1&query=${selectedClient.coordinates?.lat},${selectedClient.coordinates?.lng}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl shadow-lg transition active:scale-95 uppercase tracking-widest text-[10px]"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                Ver en Google Maps
            </a>
        </div>
      )}
    </div>
  );
};

export default CollectorMap;