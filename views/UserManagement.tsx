import React, { useState, useMemo } from 'react';
import { User, UserRole, Route, AccountStatus } from '../types';
import { COUNTRY_DATA } from '../constants';
import { hashPassword } from '../utils/security';
import { supabase } from '../lib/supabase';

interface UserManagementProps {
  users: User[];
  routes: Route[];
  currentUser: User;
  onSave: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, routes, currentUser, onSave }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
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

  const countriesByContinent = useMemo(() => {
    const groups: { [key: string]: typeof COUNTRY_DATA } = {};
    COUNTRY_DATA.forEach(c => {
      if (!groups[c.continent]) groups[c.continent] = [];
      groups[c.continent].push(c);
    });
    return groups;
  }, []);

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    // Validación de inactivación: Si tiene rutas asignadas no se puede inactivar
    if (formData.status === 'Inactive' && formData.routeIds.length > 0) {
        setNotification({ 
            type: 'error', 
            message: 'No puede inactivar un cobrador que tiene rutas asignadas. Primero desvincule las rutas.' 
        });
        return;
    }
    
    try {
        const fullPhone = `${formData.phoneCode} ${formData.phoneNumber.trim()}`;
        
        const payload: any = {
            business_id: currentUser.businessId,
            username: formData.username.trim().toLowerCase(),
            name: formData.name.trim(),
            dni: formData.dni.trim(),
            phone: fullPhone,
            address: formData.address.trim(),
            country: formData.country,
            city: formData.city.trim(),
            role: 'COLLECTOR',
            route_ids: formData.routeIds,
            status: formData.status
        };

        // Solo actualizar contraseña si el admin escribió algo
        if (formData.password.trim()) {
            payload.password_hash = hashPassword(formData.password.trim());
        } else if (!editingId) {
            setNotification({ type: 'error', message: 'La contraseña es obligatoria para nuevos registros.' });
            return;
        }

        let res;
        if (editingId) {
            res = await supabase.from('users').update(payload).eq('id', editingId);
        } else {
            res = await supabase.from('users').insert(payload);
        }

        if (res.error) throw res.error;

        onSave();
        setShowForm(false);
        setEditingId(null);
        resetFormData();
        setNotification({ type: 'success', message: `Cobrador ${editingId ? 'actualizado' : 'registrado'} con éxito.` });
    } catch (err: any) {
        setNotification({ type: 'error', message: `Error en base de datos: ${err.message}` });
    }
  };

  const resetFormData = () => {
    setFormData({ 
        name: '', username: '', dni: '', phoneCode: '+57', phoneNumber: '', 
        address: '', country: 'Colombia', city: '', password: '', 
        routeIds: [], status: 'Active' 
    });
  };

  const handleStartEdit = (u: User) => {
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
        password: '', // Se deja vacío para no cambiarla a menos que se escriba
        routeIds: u.routeIds,
        status: u.status
    });
    setShowForm(true);
    setNotification(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const collectors = users.filter(u => u.role === UserRole.COLLECTOR);

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2rem] border shadow-sm gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Personal de Campo</h2>
          <p className="text-slate-500 font-medium">Gestión integral de colaboradores, ubicaciones y accesos.</p>
        </div>
        <button 
          onClick={() => { 
            if(showForm) { setShowForm(false); setEditingId(null); }
            else { resetFormData(); setEditingId(null); setShowForm(true); }
            setNotification(null); 
          }} 
          className={`px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all ${showForm ? 'bg-slate-200 text-slate-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
        >
          {showForm ? 'Cerrar Formulario' : 'Vincular Nuevo Cobrador'}
        </button>
      </header>

      {notification && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-slideDown ${notification.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           <p className="text-xs font-black uppercase tracking-widest">{notification.message}</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAddOrUpdate} className="bg-white p-10 rounded-[2.5rem] border shadow-2xl space-y-10 border-t-[12px] border-indigo-600 animate-slideDown max-w-6xl mx-auto">
           
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Columna 1: Identidad y Acceso */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] border-b pb-2">1. Identidad de Usuario</h4>
                <Input label="Nombre Completo" value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
                <Input label="Identificación (DNI)" value={formData.dni} onChange={v => setFormData({...formData, dni: v})} required />
                <Input label="Email / Usuario Acceso" value={formData.username} onChange={v => setFormData({...formData, username: v})} type="email" required />
                
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                     {editingId ? 'Nueva Contraseña (Sobrescribir)' : 'Contraseña de Acceso'}
                   </label>
                   <input 
                     type="password" 
                     value={formData.password} 
                     onChange={e => setFormData({...formData, password: e.target.value})} 
                     placeholder={editingId ? "Dejar vacío para no cambiar" : "*******"}
                     className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-bold text-slate-800 shadow-inner"
                     required={!editingId}
                   />
                </div>
              </div>

              {/* Columna 2: Ubicación y Contacto */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] border-b pb-2">2. Localización y Contacto</h4>
                
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Teléfono Móvil</label>
                    <div className="flex gap-3">
                        <select 
                            value={formData.phoneCode}
                            onChange={(e) => setFormData({...formData, phoneCode: e.target.value})}
                            className="w-24 bg-slate-50 border-2 border-slate-100 rounded-2xl pl-2 pr-2 py-4 appearance-none font-bold text-slate-800 text-xs focus:ring-4 focus:ring-indigo-50 outline-none transition cursor-pointer shadow-inner"
                        >
                            {COUNTRY_DATA.map(c => (
                                <option key={c.code} value={c.dial_code}>{c.flag} {c.dial_code}</option>
                            ))}
                        </select>
                        <input 
                            value={formData.phoneNumber} 
                            onChange={e => setFormData({...formData, phoneNumber: e.target.value})} 
                            placeholder="3101234567"
                            className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-bold text-slate-800 text-sm shadow-inner"
                            required 
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">País de Operación Actual</label>
                    <div className="relative">
                        <select 
                            value={formData.country}
                            onChange={(e) => setFormData({...formData, country: e.target.value})}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 appearance-none font-bold text-slate-800 text-sm focus:ring-4 focus:ring-indigo-50 outline-none transition cursor-pointer shadow-inner"
                            required
                        >
                            {Object.entries(countriesByContinent).map(([continent, countries]) => (
                                <optgroup key={continent} label={continent} className="font-bold text-indigo-900">
                                    {countries.map(c => (
                                        <option key={c.code} value={c.name}>{c.name}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                </div>

                <Input label="Ciudad Principal" value={formData.city} onChange={v => setFormData({...formData, city: v})} required />
                <Input label="Dirección Residencia" value={formData.address} onChange={v => setFormData({...formData, address: v})} required />
              </div>

              {/* Columna 3: Operativa y Estado */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] border-b pb-2">3. Configuración Operativa</h4>
                
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Estado de la Cuenta</label>
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl border gap-1 shadow-inner">
                        <button 
                            type="button" 
                            onClick={() => setFormData({...formData, status: 'Active'})}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.status === 'Active' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/50'}`}
                        >
                            Activo
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setFormData({...formData, status: 'Inactive'})}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.status === 'Inactive' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/50'}`}
                        >
                            Inactivo
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Rutas Asignadas (Multiselección)</label>
                    <div className="flex flex-wrap gap-2 bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner max-h-[160px] overflow-y-auto">
                        {routes.length > 0 ? routes.map(r => (
                        <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                                const exists = formData.routeIds.includes(r.id);
                                setFormData({...formData, routeIds: exists ? formData.routeIds.filter(id => id !== r.id) : [...formData.routeIds, r.id]});
                            }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.routeIds.includes(r.id) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-400'}`}
                        >
                            {r.name}
                        </button>
                        )) : <p className="text-[10px] text-slate-400 italic">No hay rutas creadas.</p>}
                    </div>
                </div>
              </div>
           </div>

           <div className="pt-6 border-t flex flex-col md:flex-row gap-4">
               <button type="submit" className="flex-1 bg-slate-900 hover:bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl active:scale-95 transition-all">
                 {editingId ? 'Confirmar Actualización de Perfil' : 'Vincular Colaborador al Sistema'}
               </button>
               <button type="button" onClick={() => {setShowForm(false); setEditingId(null);}} className="md:w-48 bg-slate-100 text-slate-400 py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs">
                   Cancelar
               </button>
           </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {collectors.map(c => (
          <div key={c.id} className={`bg-white p-8 rounded-[2.5rem] border shadow-sm hover:shadow-md transition-all group relative ${c.status === 'Inactive' ? 'opacity-60 grayscale' : ''}`}>
            <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl transition-colors ${c.status === 'Active' ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {c.name.charAt(0)}
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {c.status === 'Active' ? 'Activo' : 'Inactivo'}
                    </span>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{c.country || 'Sin país'}</p>
                </div>
            </div>
            <h3 className="font-black text-slate-800 text-xl truncate">{c.name}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mb-2">{c.username}</p>
            
            <div className="flex items-center gap-2 text-slate-500 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                <span className="text-[10px] font-bold truncate">{c.city || 'Ubicación no registrada'}</span>
            </div>

            <div className="mt-auto pt-6 border-t border-slate-50 flex justify-between items-center">
                <div className="flex -space-x-2">
                    {/* CORRECCIÓN 4: Mostrar NOMBRE de la ruta en lugar del ID */}
                    {c.routeIds.length > 0 ? c.routeIds.map(rid => {
                        const routeName = routes.find(r => r.id === rid)?.name || 'Desconocida';
                        return (
                            <div key={rid} className="px-2 py-1 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[8px] font-black text-indigo-600 uppercase" title={routeName}>
                                {routeName.length > 10 ? routeName.slice(0, 10) + '...' : routeName}
                            </div>
                        );
                    }) : <span className="text-[8px] font-black text-slate-300 uppercase">Sin rutas</span>}
                </div>
                <button 
                  onClick={() => handleStartEdit(c)}
                  className="bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 p-2 rounded-xl transition-colors shadow-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, type = 'text', required, placeholder, disabled }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      placeholder={placeholder}
      className={`w-full border-2 border-slate-100 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-bold text-slate-800 shadow-inner ${disabled ? 'bg-slate-200 cursor-not-allowed opacity-50' : 'bg-slate-50'}`}
      required={required}
      disabled={disabled}
    />
  </div>
);

export default UserManagement;