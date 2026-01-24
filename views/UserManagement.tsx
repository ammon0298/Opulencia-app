
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
    name: '', username: '', dni: '', phone: '', address: '',
    country: 'Colombia', city: '', password: '', routeIds: [] as string[],
    status: 'Active' as AccountStatus
  });

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const payload: any = {
            business_id: currentUser.businessId,
            username: formData.username.toLowerCase(),
            name: formData.name,
            dni: formData.dni,
            phone: formData.phone,
            address: formData.address,
            country: formData.country,
            city: formData.city,
            role: 'COLLECTOR',
            route_ids: formData.routeIds,
            status: formData.status
        };

        if (formData.password) payload.password_hash = hashPassword(formData.password);

        if (editingId) {
            await supabase.from('users').update(payload).eq('id', editingId);
        } else {
            await supabase.from('users').insert(payload);
        }

        onSave();
        setShowForm(false);
        setEditingId(null);
        setNotification({ type: 'success', message: 'Usuario guardado.' });
    } catch (err) {
        setNotification({ type: 'error', message: 'Error al guardar.' });
    }
  };

  const collectors = users.filter(u => u.role === UserRole.COLLECTOR);

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2rem] border shadow-sm gap-4">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Cobradores</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs">
          {showForm ? 'Cerrar' : 'Nuevo Cobrador'}
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleAddOrUpdate} className="bg-white p-10 rounded-[2.5rem] border shadow-2xl space-y-6">
           <input placeholder="Nombre" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-4 rounded-xl" required />
           <input placeholder="Email" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full border p-4 rounded-xl" required />
           <input placeholder="DNI" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} className="w-full border p-4 rounded-xl" required />
           <input type="password" placeholder="Contraseña" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border p-4 rounded-xl" />
           <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest">Guardar Cobrador</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {collectors.map(c => (
          <div key={c.id} className="bg-white p-8 rounded-[2rem] border shadow-sm">
            <h3 className="font-black text-slate-800 text-xl">{c.name}</h3>
            <p className="text-xs text-slate-400">{c.username}</p>
            <span className={`mt-4 inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{c.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserManagement;
