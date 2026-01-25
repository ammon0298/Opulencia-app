import React, { useState } from 'react';
import { User, UserRole, Route } from '../types';
import { useGlobal } from '../contexts/GlobalContext';
import { Language } from '../utils/i18n';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  navigateTo: (view: string) => void;
  currentView: string;
  routes: Route[];
  selectedRouteId: string;
  onRouteSelect: (id: string) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, navigateTo, currentView, routes, selectedRouteId, onRouteSelect, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme, toggleTheme, language, setLanguage, t } = useGlobal();

  const isAdmin = user.role === UserRole.ADMIN;
  const showSelector = isAdmin || (user.role === UserRole.COLLECTOR && user.routeIds.length > 1);
  const availableRoutes = isAdmin ? routes : routes.filter(r => user.routeIds.includes(r.id));
  const currentRouteName = routes.find(r => r.id === selectedRouteId)?.name || 'Todas las Rutas';

  const NavItem = ({ view, label, icon }: { view: string, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => { navigateTo(view); setIsSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        currentView === view 
        ? 'bg-indigo-600 text-white shadow-md' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 font-inter text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-4 py-3 flex flex-col gap-3 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between">
            <h1 className="font-black text-xl text-indigo-600 tracking-tight">Opulencia</h1>
            <div className="flex items-center gap-2">
                <button onClick={toggleTheme} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                </button>
            </div>
        </div>
        
        {/* Mobile Route Selector */}
        {showSelector && (
            <div className="relative">
                <select 
                    value={selectedRouteId}
                    onChange={(e) => onRouteSelect(e.target.value)}
                    className="w-full bg-indigo-50 dark:bg-indigo-900/20 border-none rounded-xl text-xs font-black text-indigo-700 dark:text-indigo-400 py-2.5 px-4 appearance-none focus:ring-2 focus:ring-indigo-100"
                >
                    {isAdmin && <option value="all">Todas las Rutas</option>}
                    {availableRoutes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <div className="absolute right-3 top-2.5 pointer-events-none text-indigo-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </div>
            </div>
        )}
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r dark:border-slate-800 transform transition-transform duration-300 md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-6">
          <div className="mb-10 hidden md:block">
            <h1 className="text-2xl font-black text-indigo-600 flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs">O</div>
              Opulencia
            </h1>
            <div className="mt-2 text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800 inline-block shadow-sm">
              {isAdmin ? currentRouteName : (user.routeIds.length > 1 ? currentRouteName : routes.find(r => r.id === user.routeIds[0])?.name || 'Mi Ruta')}
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-4">Menu Principal</p>
            <NavItem view={isAdmin ? 'admin_dashboard' : 'collector_dashboard'} label={t('dashboard')} icon={<IconHome />} />
            <NavItem view="credits" label={t('credits')} icon={<IconCash />} />
            <NavItem view="new_credit" label="Nuevo Crédito" icon={<IconPlus />} />
            
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6 mb-3 px-4">Gestión</p>
            <NavItem view="client_management" label={t('clients')} icon={<IconUsers />} />
            <NavItem view="routing" label={t('routing')} icon={<IconRoute />} />
            <NavItem view="expenses" label={t('expenses')} icon={<IconReceipt />} />
            <NavItem view="liquidation" label={t('liquidation')} icon={<IconChart />} />
            
            {isAdmin && (
              <>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6 mb-3 px-4">{t('config')}</p>
                <NavItem view="routes_mgmt" label="Rutas" icon={<IconMap />} />
                <NavItem view="users" label="Cobradores" icon={<IconShield />} />
              </>
            )}
          </nav>

          <div className="mt-auto pt-6 border-t dark:border-slate-800 space-y-4">
            
            {/* Controles de Configuración */}
            <div className="flex items-center gap-2 px-2">
                <button 
                    onClick={toggleTheme} 
                    className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                    <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
                    <span className="text-[10px] uppercase">{theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
                </button>
                <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black uppercase text-center outline-none border-none cursor-pointer appearance-none"
                >
                    <option value="es">🇪🇸 ESP</option>
                    <option value="en">🇺🇸 ENG</option>
                    <option value="pt">🇧🇷 POR</option>
                    <option value="fr">🇫🇷 FRA</option>
                </select>
            </div>

            {/* User Profile Trigger */}
            <div 
              onClick={() => { navigateTo('profile'); setIsSidebarOpen(false); }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold uppercase group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">{user.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role === UserRole.ADMIN ? 'Administrador' : 'Cobrador'}</p>
              </div>
            </div>

            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all font-medium text-sm"
            >
              <IconLogout />
              {t('logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-10 relative">
        <div className="max-w-6xl mx-auto">
          {/* Desktop Filter */}
          <div className="hidden md:flex justify-end mb-8">
            {showSelector ? (
               <div className="bg-white dark:bg-slate-900 px-6 py-2 rounded-2xl shadow-sm border dark:border-slate-800 flex items-center gap-4 animate-fadeIn">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Filtrar Ruta</span>
                  <div className="relative">
                    <select 
                      value={selectedRouteId}
                      onChange={(e) => onRouteSelect(e.target.value)}
                      className="bg-indigo-50 dark:bg-indigo-900/30 border-none rounded-xl text-sm font-black text-indigo-700 dark:text-indigo-400 py-2 pl-4 pr-10 appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-100 transition-all shadow-inner min-w-[200px]"
                    >
                      {isAdmin && <option value="all">Todas las Rutas</option>}
                      {availableRoutes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <div className="absolute right-3 top-2.5 pointer-events-none text-indigo-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                  </div>
               </div>
            ) : (
               <div className="bg-emerald-50 dark:bg-emerald-900/20 px-6 py-3 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-3 shadow-sm animate-fadeIn">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                    Ruta Activa: {routes.find(r => r.id === user.routeIds[0])?.name || 'Mi Ruta'}
                  </span>
               </div>
            )}
          </div>
          {children}
        </div>
      </main>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
};

const IconHome = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const IconUsers = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const IconPlus = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconCash = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconRoute = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>;
const IconMap = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IconShield = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
const IconReceipt = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>;
const IconChart = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>;
const IconLogout = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;

export default Layout;