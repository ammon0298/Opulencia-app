
import React, { useEffect, useRef, useState } from 'react';
import { Client, Credit, Payment } from '../types';
import { useGlobal } from '../contexts/GlobalContext';

// Declaración global para Leaflet
declare const L: any;

interface ClientMapProps {
  clients: Client[];
  credits: Credit[];
  payments: Payment[];
}

const ClientMap: React.FC<ClientMapProps> = ({ clients, credits, payments }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const { theme, t } = useGlobal();
  const [selectedClient, setSelectedClient] = useState<{client: Client, credit?: Credit, balance: number, paid: number} | null>(null);

  // Función para obtener datos financieros del cliente
  const getClientFinancials = (client: Client) => {
    const activeCredit = credits.find(c => c.clientId === client.id && c.status === 'Active');
    if (!activeCredit) return null;

    const paid = activeCredit.totalPaid; // Ya viene calculado o se calcula
    const balance = activeCredit.totalToPay - paid;
    
    // Determinar estado para el color
    let statusColor = '#6366f1'; // Indigo (Normal)
    if (activeCredit.isOverdue) statusColor = '#9333ea'; // Purple (Mora)
    else if (balance <= 0) statusColor = '#10b981'; // Green (Pagado)
    else if ((activeCredit.totalInstallments - activeCredit.paidInstallments) <= 3) statusColor = '#f59e0b'; // Amber (Faltan pocos)

    return { credit: activeCredit, paid, balance, color: statusColor };
  };

  // Función determinista para generar coordenadas falsas alrededor de un centro
  // (Solo para demostración si no hay coords reales)
  const getSimulatedCoords = (client: Client) => {
    if (client.coordinates) return client.coordinates;
    
    // Usar el ID para generar un offset determinista
    const hash = client.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const latOffset = (hash % 100 - 50) / 5000;
    const lngOffset = (hash % 100 - 50) / 5000;
    
    // Coordenadas base (Ej: Centro de una ciudad genérica)
    const baseLat = 4.6097; // Bogotá aprox
    const baseLng = -74.0817; 
    
    return { lat: baseLat + latOffset, lng: baseLng + lngOffset };
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Inicializar mapa si no existe
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([4.6097, -74.0817], 13);

      // Tile Layer (Cambia según tema)
      const tileUrl = theme === 'dark' 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      
      L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstance.current);
    } else {
        // Actualizar Tiles si cambia el tema
        mapInstance.current.eachLayer((layer: any) => {
            if (layer instanceof L.TileLayer) {
                const newUrl = theme === 'dark' 
                    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
                    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
                layer.setUrl(newUrl);
            }
        });
    }

    // Limpiar marcadores anteriores
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Agregar nuevos marcadores
    clients.forEach(client => {
      if (client.status !== 'Active') return;
      
      const financials = getClientFinancials(client);
      const coords = getSimulatedCoords(client);
      const color = financials ? financials.color : '#94a3b8'; // Gris si no tiene crédito activo

      // Crear icono personalizado HTML
      const customIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: customIcon })
        .addTo(mapInstance.current)
        .on('click', () => {
            setSelectedClient({
                client,
                credit: financials?.credit,
                balance: financials?.balance || 0,
                paid: financials?.paid || 0
            });
            mapInstance.current.setView([coords.lat, coords.lng], 15, { animate: true });
        });

      markersRef.current.push(marker);
    });

  }, [clients, credits, theme]);

  return (
    <div className="relative w-full h-[600px] rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
      <div ref={mapRef} className="w-full h-full z-0" />
      
      {/* Modal Flotante de Cliente */}
      {selectedClient && (
        <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-2xl z-[1000] border border-slate-100 dark:border-slate-700 animate-slideUp">
            <button onClick={() => setSelectedClient(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-xl text-slate-700 dark:text-slate-200">
                    {selectedClient.client.name.charAt(0)}
                </div>
                <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-lg leading-tight">{selectedClient.client.name}</h3>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{selectedClient.client.address}</p>
                </div>
            </div>

            {selectedClient.credit ? (
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('total_loan')}</p>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-200">${selectedClient.credit.totalToPay.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('paid')}</p>
                        <p className="text-sm font-black text-emerald-600">${selectedClient.paid.toLocaleString()}</p>
                    </div>
                    <div className="col-span-2 bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800">
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{t('balance')}</p>
                        <p className="text-xl font-black text-indigo-700 dark:text-indigo-400">${selectedClient.balance.toLocaleString()}</p>
                    </div>
                </div>
            ) : (
                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center">
                    <p className="text-xs font-bold text-slate-400">Sin crédito activo actualmente.</p>
                </div>
            )}

            <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedClient.client.address + ", Colombia")}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg transition active:scale-95 uppercase tracking-widest text-[10px]"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                {t('open_maps')}
            </a>
        </div>
      )}
    </div>
  );
};

export default ClientMap;
