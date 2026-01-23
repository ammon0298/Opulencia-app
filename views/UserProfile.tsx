import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole } from '../types';
import { COUNTRY_DATA } from '../constants';
import { verifyPassword, hashPassword } from '../utils/security';

interface UserProfileProps {
  user: User;
  users: User[];
  onUpdate: (updatedUser: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, users, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: '',
    dni: '',
    phoneCode: '+57',
    phoneNumber: '',
    address: '',
    username: '', // Email
    businessName: '',
    country: 'Colombia',
    city: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [activeTab, setActiveTab] = useState<'general' | 'security'>('general');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const countriesByContinent = useMemo(() => {
    const groups: { [key: string]: typeof COUNTRY_DATA } = {};
    COUNTRY_DATA.forEach(c => {
      if (!groups[c.continent]) groups[c.continent] = [];
      groups[c.continent].push(c);
    });
    return groups;
  }, []);

  useEffect(() => {
    let pCode = '+57';
    let pNum = user.phone;
    
    if (user.phone.includes(' ')) {
        const parts = user.phone.split(' ');
        if (parts.length > 1 && parts[0].startsWith('+')) {
            pCode = parts[0];
            pNum = parts.slice(1).join(' ');
        }
    }

    setFormData(prev => ({
      ...prev,
      name: user.name,
      dni: user.dni,
      phoneCode: pCode,
      phoneNumber: pNum,
      address: user.address,
      username: user.username,
      businessName: user.businessName || '',
      country: user.country || 'Colombia',
      city: user.city || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));
  }, [user]);

  const isAdmin = user.role === UserRole.ADMIN;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    let updatedUser: User = { ...user };
    const fullPhone = `${formData.phoneCode} ${formData.phoneNumber}`;

    if (activeTab === 'general') {
        updatedUser = {
            ...updatedUser,
            phone: fullPhone,
            address: formData.address,
            country: formData.country,
            city: formData.city,
            ...(isAdmin && {
                businessName: formData.businessName,
            })
        };
        
        onUpdate(updatedUser);
        setNotification({ type: 'success', message: 'Datos personales actualizados correctamente.' });
    } 
    else if (activeTab === 'security') {
        if (formData.username !== user.username) {
            const emailExists = users.some(u => u.username === formData.username && u.id !== user.id);
            if (emailExists) {
                setNotification({ type: 'error', message: 'Error: El nuevo correo electrónico ya está registrado.' });
                return;
            }
        }

        if (!formData.currentPassword) {
            setNotification({ type: 'error', message: 'Seguridad: Debe ingresar su contraseña actual.' });
            return;
        }

        const isCurrentPasswordValid = verifyPassword(formData.currentPassword, user.password || '');
        if (!isCurrentPasswordValid) {
            setNotification({ type: 'error', message: 'Error: La contraseña actual ingresada es incorrecta.' });
            return;
        }

        let finalPassword = user.password; 

        if (formData.newPassword || formData.confirmPassword) {
            if (formData.newPassword !== formData.confirmPassword) {
                setNotification({ type: 'error', message: 'Error: La nueva contraseña y la confirmación no coinciden.' });
                return;
            }
            if (formData.newPassword.length < 6) {
                setNotification({ type: 'error', message: 'Error: La nueva contraseña debe tener al menos 6 caracteres.' });
                return;
            }
            finalPassword = hashPassword(formData.newPassword);
        }

        updatedUser = {
            ...updatedUser,
            username: formData.username,
            password: finalPassword
        };

        onUpdate(updatedUser);
        
        setFormData(prev => ({
            ...prev,
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        }));

        setNotification({ type: 'success', message: 'Credenciales de seguridad actualizadas con éxito.' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-20">
      <header>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Mi Perfil</h2>
        <p className="text-slate-500 font-medium">Administra tu información personal y credenciales de acceso.</p>
      </header>

      {notification && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-slideDown ${notification.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             {notification.type === 'error' ? 
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /> : 
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
             }
           </svg>
           <p className="text-xs font-black uppercase tracking-widest">{notification.message}</p>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Sidebar Tabs (Sin Cambios) */}
        <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-6 md:p-8 flex flex-row md:flex-col gap-2 overflow-x-auto">
           <button 
             type="button"
             onClick={() => { setActiveTab('general'); setNotification(null); }}
             className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all whitespace-nowrap ${activeTab === 'general' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-600'}`}
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
             <span className="font-black text-xs uppercase tracking-widest">Datos Generales</span>
           </button>
           <button 
             type="button"
             onClick={() => { setActiveTab('security'); setNotification(null); }}
             className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all whitespace-nowrap ${activeTab === 'security' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-600'}`}
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
             <span className="font-black text-xs uppercase tracking-widest">Seguridad</span>
           </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 md:p-12 bg-white">
           <form onSubmit={handleSubmit} className="space-y-8 w-full">
              {activeTab === 'general' && (
                <div className="space-y-8 animate-fadeIn">
                   <div>
                      <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                        Información Personal
                        <span className="bg-slate-100 text-slate-500 text-[9px] px-2 py-1 rounded-md uppercase tracking-wider">{isAdmin ? 'Administrador' : 'Cobrador'}</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <Input label="Nombre Completo" value={formData.name} onChange={v => setFormData({...formData, name: v})} required disabled />
                         <Input label="Identificación (DNI)" value={formData.dni} onChange={v => setFormData({...formData, dni: v})} required disabled />
                         
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Teléfono Móvil</label>
                            <div className="flex gap-3">
                                <div className="relative w-32 md:w-40 shrink-0">
                                    <select 
                                        value={formData.phoneCode}
                                        onChange={(e) => setFormData({...formData, phoneCode: e.target.value})}
                                        className="w-full bg-white border border-slate-200 rounded-2xl pl-4 pr-8 py-4 appearance-none font-bold text-slate-800 text-base focus:ring-4 focus:ring-indigo-50 outline-none transition cursor-pointer shadow-inner truncate"
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
                                    className="flex-1 w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 focus:ring-4 focus:ring-indigo-50 outline-none transition font-bold text-slate-800 text-base shadow-inner min-w-0"
                                    required 
                                />
                            </div>
                         </div>

                         <Input label="Dirección Residencia" value={formData.address} onChange={v => setFormData({...formData, address: v})} required />
                      </div>
                   </div>

                   <div className="pt-6 border-t border-slate-100">
                        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                           Ubicación y Operación
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {isAdmin && (
                               <div className="md:col-span-2">
                                  <Input label="Razón Social / Negocio" value={formData.businessName} onChange={v => setFormData({...formData, businessName: v})} required />
                               </div>
                           )}
                           
                           <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">País</label>
                                <div className="relative">
                                    <select 
                                        value={formData.country}
                                        onChange={(e) => setFormData({...formData, country: e.target.value})}
                                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 appearance-none font-bold text-slate-800 text-sm focus:ring-4 focus:ring-indigo-50 outline-none transition cursor-pointer shadow-inner"
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

                           <Input label="Ciudad Principal" value={formData.city} onChange={v => setFormData({...formData, city: v})} required />
                        </div>
                   </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-8 animate-fadeIn">
                   <div>
                      <h3 className="text-xl font-black text-slate-800 mb-6">Credenciales de Acceso</h3>
                      <div className="space-y-6">
                         <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 text-amber-700 mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <p className="text-xs font-bold leading-relaxed">
                               Para actualizar su correo electrónico o contraseña, es obligatorio verificar su identidad ingresando su contraseña actual.
                            </p>
                         </div>

                         <Input label="Correo Electrónico (Usuario)" value={formData.username} onChange={v => setFormData({...formData, username: v})} type="email" required />
                         
                         <div className="py-4 border-t border-slate-100">
                            <h4 className="text-sm font-black text-slate-700 mb-4">Cambio de Contraseña</h4>
                            
                            <div className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                    <Input 
                                        label="Contraseña Actual (Obligatorio)" 
                                        value={formData.currentPassword} 
                                        onChange={v => setFormData({...formData, currentPassword: v})} 
                                        type="password" 
                                        placeholder="Ingrese su clave actual para confirmar cambios"
                                        required 
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input 
                                        label="Nueva Contraseña" 
                                        value={formData.newPassword} 
                                        onChange={v => setFormData({...formData, newPassword: v})} 
                                        type="password" 
                                        placeholder="Min. 6 caracteres"
                                    />
                                    <Input 
                                        label="Confirmar Nueva Contraseña" 
                                        value={formData.confirmPassword} 
                                        onChange={v => setFormData({...formData, confirmPassword: v})} 
                                        type="password" 
                                        placeholder="Repita la nueva clave"
                                    />
                                </div>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              <div className="pt-2">
                 <button type="submit" className="bg-slate-900 hover:bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all transform active:scale-95">
                    {activeTab === 'general' ? 'Guardar Datos Personales' : 'Actualizar Credenciales'}
                 </button>
              </div>
           </form>
        </div>
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, type = 'text', placeholder, required, className, disabled }: any) => (
  <div className={`space-y-1.5 ${className}`}>
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-50 outline-none transition font-bold text-slate-800 text-sm shadow-inner ${disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
      required={required}
    />
  </div>
);

export default UserProfile;