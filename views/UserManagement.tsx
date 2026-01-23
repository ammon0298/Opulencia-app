import React, { useState, useMemo } from 'react';
import { User, UserRole, Route, AccountStatus } from '../types';
import { COUNTRY_DATA } from '../constants';
import { hashPassword } from '../utils/security';

interface UserManagementProps {
  users: User[];
  routes: Route[];
  currentUser: User;
  onSave: React.Dispatch<React.SetStateAction<User[]>>;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, routes, currentUser, onSave }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  const countriesByContinent = useMemo(() => {
    const groups: { [key: string]: typeof COUNTRY_DATA } = {};
    COUNTRY_DATA.forEach(c => {
      if (!groups[c.continent]) groups[c.continent] = [];
      groups[c.continent].push(c);
    });
    return groups;
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    dni: '',
    phoneCode: '+57',
    phoneNumber: '',
    address: '',
    country: 'Colombia',
    city: '',
    password: '',
    routeIds: [] as string[],
    status: 'Active' as AccountStatus
  });

  const collectors = users.filter(u => u.role === UserRole.COLLECTOR);

  const toggleRoute = (id: string) => {
    if (formData.status === 'Inactive') return;

    setFormData(prev => ({
      ...prev,
      routeIds: prev.routeIds.includes(id) 
        ? prev.routeIds.filter(rid => rid !== id) 
        : [...prev.routeIds, id]
    }));
  };

  const handleEdit = (u: User) => {
    setNotification(null);
    setEditingId(u.id);
    
    let pCode = '+57';
    let pNum = u.phone;
    
    if (u.phone.includes(' ')) {
        const parts = u.phone.split(' ');
        if (parts.length > 1 && parts[0].startsWith('+')) {
            pCode = parts[0];
            pNum = parts.slice(1).join(' ');
        }
    }

    setFormData({
      name: u.name,
      username: u.username,
      dni: u.dni,
      phoneCode: pCode,
      phoneNumber: pNum,
      address: u.address,
      country: u.country || 'Colombia',
      city: u.city || '',
      password: '',
      routeIds: u.routeIds,
      status: u.status
    });
    setShowForm(true);
  };

  const handleStatusChange = (newStatus: AccountStatus) => {
    setNotification(null);
    if (newStatus === 'Inactive' && formData.routeIds.length > 0) {
      setNotification({ 
        type: 'error', 
        message: '⚠️ ACCIÓN BLOQUEADA: No se puede inactivar un cobrador con rutas asignadas. Desmarque las rutas primero.' 
      });
      return;
    }
    setFormData({...formData, status: newStatus});
  };

  const handleAddOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!editingId && !formData.password) {
        setNotification({ type: 'error', message: 'Para crear un nuevo cobrador, debe asignar una contraseña inicial.' });
        return;
    }

    if (formData.password && formData.password.length < 6) {
        setNotification({ type: 'error', message: 'La contraseña debe tener al menos 6 caracteres.' });
        return;
    }

    const fullPhone = `${formData.phoneCode} ${formData.phoneNumber}`;

    if (editingId) {
      onSave(prev => prev.map(u => u.id === editingId ? {
        ...u,
        username: formData.username,
        phone: fullPhone,
        address: formData.address,
        country: formData.country,
        city: formData.city,
        routeIds: formData.routeIds,
        status: formData.status,
        ...(formData.password ? { password: hashPassword(formData.password) } : {})
      } : u));
      if (formData.password) {
          // Success message logic here or just close form
      }
    } else {
      const newUser: User = {
        id: 'u' + Date.now(),
        businessId: currentUser.businessId,
        role: UserRole.COLLECTOR,
        ...formData,
        phone: fullPhone,
        password: hashPassword(formData.password)
      };
      onSave([...users, newUser]);
    }

    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', username: '', dni: '', phoneCode: '+57', phoneNumber: '', address: '', country: 'Colombia', city: '', password: '', routeIds: [], status: 'Active' });
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2rem] border shadow-sm gap-4">
        <div className="text-center md:text-left">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Gestión de Cobradores</h2>
          <p className="text-slate-500 font-medium">Administra perfiles de trabajo y seguridad operativa</p>
        </div>
        <button 
          onClick={() => {
            setShowForm(!showForm);
            setNotification(null);
            setEditingId(null);
            setFormData({ name: '', username: '', dni: '', phoneCode: '+57', phoneNumber: '', address: '', country: 'Colombia', city: '', password: '', routeIds: [], status: 'Active' });
          }}
          className="w-full md:w-auto bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black transition hover:bg-indigo-700 shadow-xl flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest text-xs"
        >
          {showForm ? 'Cerrar Formulario' : 'Nuevo Cobrador'}
        </button>
      </header>

      {showForm && (
        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border shadow-2xl animate-slideDown max-w-6xl mx-auto border-t-[8px] border-indigo-600">
          
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

          <form onSubmit={handleAddOrUpdate} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Completo (Inalterable)</label>
                <input 
                  value={formData.name} 
                  disabled={!!editingId}
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ej: Pedro Martínez"
                  className={`w-full border rounded-2xl p-4 font-black transition shadow-inner ${editingId ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-slate-50 border-slate-200 focus:ring-4 focus:ring-indigo-100 text-slate-800'}`}
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cédula / DNI (Inalterable)</label>
                <input 
                  value={formData.dni} 
                  disabled={!!editingId}
                  onChange={e => setFormData({...formData, dni: e.target.value})} 
                  placeholder="DNI único"
                  className={`w-full border rounded-2xl p-4 font-black transition shadow-inner ${editingId ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-slate-50 border-slate-200 focus:ring-4 focus:ring-indigo-100 text-slate-800'}`}
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Usuario Sistema (Email)</label>
                <input 
                  value={formData.username} 
                  onChange={e => setFormData({...formData, username: e.target.value})} 
                  placeholder="Alias acceso"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-black text-slate-800"
                  required 
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Teléfono Móvil</label>
                <div className="flex gap-3">
                    <div className="relative w-32 md:w-40 shrink-0">
                        <select 
                            value={formData.phoneCode}
                            onChange={(e) => setFormData({...formData, phoneCode: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-8 py-4 appearance-none font-bold text-slate-800 text-base focus:ring-4 focus:ring-indigo-100 outline-none transition cursor-pointer shadow-sm truncate"
                        >
                            {COUNTRY_DATA.map(c => (
                                <option key={c.code} value={c.dial_code}>
                                    {c.flag} {c.dial_code}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </div>
                    </div>
                    <input 
                        value={formData.phoneNumber} 
                        onChange={e => setFormData({...formData, phoneNumber: e.target.value})} 
                        placeholder="300 123 4567"
                        className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-black text-slate-800 text-base shadow-inner min-w-0"
                        required 
                    />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">País de Residencia</label>
                <div className="relative">
                    <select 
                        value={formData.country}
                        onChange={(e) => setFormData({...formData, country: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 appearance-none font-bold text-slate-800 text-sm focus:ring-4 focus:ring-indigo-100 outline-none transition cursor-pointer shadow-inner"
                        required
                    >
                        <option value="">Seleccione...</option>
                        {Object.entries(countriesByContinent).map(([continent, countries]) => (
                            <optgroup key={continent} label={continent} className="font-bold text-indigo-900">
                                {/* Fix: Cast countries to proper type to avoid 'unknown' error */}
                                {(countries as typeof COUNTRY_DATA).map(c => (
                                    <option key={c.code} value={c.name}>{c.name}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ciudad / Municipio</label>
                <input 
                  value={formData.city} 
                  onChange={e => setFormData({...formData, city: e.target.value})} 
                  placeholder="Ciudad principal"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-black text-slate-800"
                  required 
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Dirección de Residencia</label>
                <input 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  placeholder="Dirección física completa"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-black text-slate-800"
                  required 
                />
              </div>
            </div>

            <div className="p-6 md:p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
               <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 px-2 gap-6">
                  
                  <div className="flex-1 w-full lg:w-auto bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                     <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-2">Gestión de Acceso / Contraseña</label>
                     <div className="relative">
                        <input 
                            type="password" 
                            value={formData.password} 
                            onChange={e => setFormData({...formData, password: e.target.value})} 
                            placeholder={editingId ? "Dejar vacío para mantener la actual" : "Asignar contraseña nueva"}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-200 outline-none transition font-bold text-slate-800 text-sm"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 000-2z" clipRule="evenodd" /></svg>
                        </div>
                     </div>
                     {editingId && (
                        <p className="text-[9px] text-slate-400 mt-2 font-medium">
                           <span className="font-bold text-indigo-500">Nota:</span> Si el cobrador olvidó su clave, escriba una nueva aquí para sobrescribirla (se encriptará automáticamente).
                        </p>
                     )}
                  </div>

                  <div className="flex flex-col w-full sm:w-auto">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado Perfil</label>
                    <div className="flex w-full sm:w-auto bg-white p-1.5 rounded-2xl border border-slate-200 gap-1 shadow-inner h-[52px]">
                        <button 
                        type="button"
                        onClick={() => handleStatusChange('Active')}
                        className={`flex-1 sm:flex-none px-4 md:px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.status === 'Active' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                        Activo
                        </button>
                        <button 
                        type="button"
                        onClick={() => handleStatusChange('Inactive')}
                        className={`flex-1 sm:flex-none px-4 md:px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            formData.status === 'Inactive' 
                            ? 'bg-rose-600 text-white shadow-lg' 
                            : (formData.routeIds.length > 0 ? 'text-rose-300 cursor-not-allowed opacity-50' : 'text-slate-400 hover:bg-slate-50')
                        }`}
                        >
                        Inactivo
                        </button>
                    </div>
                  </div>
               </div>
               
               <div className={`space-y-4 px-2 transition-all duration-300 ${formData.status === 'Inactive' ? 'opacity-40 grayscale pointer-events-none select-none' : 'opacity-100'}`}>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asignación de Rutas Operativas</label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {routes.map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => toggleRoute(r.id)}
                          className={`flex items-center gap-2 p-4 rounded-xl border transition-all text-left shadow-sm ${
                            formData.routeIds.includes(r.id) 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-[10px] font-black uppercase tracking-tight truncate">{r.name}</span>
                        </button>
                      ))}
                  </div>
               </div>
            </div>

            <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 px-6 rounded-3xl shadow-xl transition transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-xs md:text-sm">
              {editingId ? 'Actualizar Perfil y Credenciales' : 'Guardar Nuevo Cobrador'}
            </button>
          </form>
        </div>
      )}

      {/* Grid de Cobradores (Sin cambios) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {collectors.map(collector => (
          <div key={collector.id} className={`bg-white p-10 rounded-[2.5rem] border shadow-sm transition-all group relative flex flex-col min-h-[380px] ${collector.status === 'Inactive' ? 'opacity-60 grayscale bg-slate-50' : 'hover:shadow-md'}`}>
            <div className="flex justify-between items-start mb-6">
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white font-black text-2xl uppercase shadow-lg ${collector.status === 'Active' ? 'bg-emerald-600' : 'bg-slate-400'}`}>
                {collector.name.charAt(0)}
              </div>
              <div className="flex flex-col items-end gap-2">
                 <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${collector.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                   {collector.status === 'Active' ? 'En Servicio' : 'Inactivo'}
                 </span>
                 <button 
                  onClick={() => handleEdit(collector)}
                  className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition shadow-sm border border-transparent hover:border-indigo-100"
                >
                  <IconEdit />
                </button>
              </div>
            </div>
            <div className="flex-1 space-y-4">
               <div>
                  <h3 className="font-black text-slate-800 text-xl leading-tight">{collector.name}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DNI: {collector.dni}</p>
               </div>
               <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-600 flex items-center gap-2">
                    <IconPhone /> {collector.phone}
                  </p>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    <IconMap /> {collector.address}
                  </p>
                  <p className="text-xs text-indigo-500 font-bold uppercase tracking-tight">
                    {collector.city}, {collector.country}
                  </p>
               </div>
            </div>
            <div className="space-y-3 pt-6 border-t border-slate-50 mt-6">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zonas Activas ({collector.routeIds.length})</p>
               <div className="flex flex-wrap gap-1.5">
                 {collector.routeIds.length > 0 ? collector.routeIds.map(rid => {
                   const route = routes.find(r => r.id === rid);
                   return (
                     <span key={rid} className="bg-indigo-50 text-indigo-700 text-[9px] font-black px-2.5 py-1 rounded-lg border border-indigo-100 uppercase">
                       {route?.name || '---'}
                     </span>
                   );
                 }) : <span className="text-[10px] italic text-slate-300 font-bold uppercase tracking-tighter">Sin rutas asignadas</span>}
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const IconEdit = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>;
const IconPhone = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>;
const IconMap = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>;

export default UserManagement;