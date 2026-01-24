
import React, { useState } from 'react';
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
    name: '', username: '', dni: '', phone: '', address: '',
    country: 'Colombia', city: '', password: '', routeIds: [] as string[],
    status: 'Active' as AccountStatus
  });

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    
    try {
        const payload: any = {
            business_id: currentUser.businessId,
            username: formData.username.trim().toLowerCase(),
            name: formData.name.trim(),
            dni: formData.dni.trim(),
            phone: formData.phone.trim(),
            address: formData.address.trim(),
            country: formData.country,
            city: formData.city.trim(),
            role: 'COLLECTOR',
            route_ids: formData.routeIds,
            status: formData.status
        };

        if (formData.password) {
            payload.password_hash = hashPassword(formData.password);
        } else if (!editingId) {
            setNotification({ type: 'error', message: 'La contraseña es obligatoria para nuevos usuarios.' });
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
        setFormData({ name: '', username: '', dni: '', phone: '', address: '', country: 'Colombia', city: '', password: '', routeIds: [], status: 'Active' });
        setNotification({ type: 'success', message: 'Cobrador registrado correctamente en el sistema.' });
    } catch (err: any) {
        setNotification({ type: 'error', message: `Error al guardar: ${err.message}` });
    }
  };

  const collectors = users.filter(u => u.role === UserRole.COLLECTOR);

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2rem] border shadow-sm gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Personal de Campo</h2>
          <p className="text-slate-500 font-medium">Gestión de cobradores y accesos de seguridad.</p>
        </div>
        <button 
          onClick={() => { setShowForm(!showForm); setEditingId(null); setNotification(null); }} 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
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
        <form onSubmit={handleAddOrUpdate} className="bg-white p-10 rounded-[2.5rem] border shadow-2xl space-y-8 border-t-[8px] border-indigo-600 animate-slideDown">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Nombre Completo" value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
              <Input label="Identificación (DNI)" value={formData.dni} onChange={v => setFormData({...formData, dni: v})} required />
              <Input label="Email / Usuario Acceso" value={formData.username} onChange={v => setFormData({...formData, username: v})} type="email" required />
              <Input label="Contraseña (Mín. 6)" value={formData.password} onChange={v => setFormData({...formData, password: v})} type="password" required={!editingId} />
              <Input label="Teléfono" value={formData.phone} onChange={v => setFormData({...formData, phone: v})} required />
              <Input label="Ciudad" value={formData.city} onChange={v => setFormData({...formData, city: v})} required />
           </div>
           
           <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Rutas Asignadas (Multiselección)</label>
              <div className="flex flex-wrap gap-2 bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                {routes.map(r => (
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
                ))}
              </div>
           </div>

           <button type="submit" className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl active:scale-95 transition-all">
             {editingId ? 'Actualizar Información' : 'Registrar Cobrador Oficial'}
           </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {collectors.map(c => (
          <div key={c.id} className="bg-white p-8 rounded-[2.5rem] border shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {c.name.charAt(0)}
                </div>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{c.status}</span>
            </div>
            <h3 className="font-black text-slate-800 text-xl truncate">{c.name}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{c.username}</p>
            <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center">
                <div className="flex -space-x-2">
                    {c.routeIds.map(rid => (
                        <div key={rid} className="w-8 h-8 rounded-lg bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-500" title={routes.find(r => r.id === rid)?.name}>R</div>
                    ))}
                </div>
                <button 
                  onClick={() => {
                    setEditingId(c.id);
                    setFormData({
                        name: c.name, username: c.username, dni: c.dni, phone: c.phone, address: c.address,
                        country: c.country || 'Colombia', city: c.city || '', password: '', routeIds: c.routeIds, status: c.status
                    });
                    setShowForm(true);
                    setNotification(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 p-2 rounded-xl transition-colors"
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

const Input = ({ label, value, onChange, type = 'text', required }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-bold text-slate-800 shadow-inner"
      required={required}
    />
  </div>
);

export default UserManagement;
