
import React, { useState, useEffect, useMemo } from 'react';
import { Expense, Route, User, UserRole } from '../types';

interface ExpensesProps {
  expenses: Expense[];
  routes: Route[];
  user: User;
  onAdd: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

const ExpensesView: React.FC<ExpensesProps> = ({ expenses, routes, user, onAdd, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);
  
  // Lógica de permisos: Filtrar rutas
  const allowedRoutes = useMemo(() => {
    if (user.role === UserRole.ADMIN) return routes;
    return routes.filter(r => user.routeIds.includes(r.id));
  }, [routes, user]);

  // Estado para la imagen del formulario
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    value: '',
    routeId: allowedRoutes[0]?.id || '',
    type: 'Operational',
    concept: ''
  });

  // Resetear el estado de confirmación si se hace click fuera
  useEffect(() => {
    const handleClickOutside = () => setConfirmDeleteId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamaño (opcional, ej: < 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg("La imagen es demasiado pesada. Máximo 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.name || !formData.value) {
        setErrorMsg("Todos los campos de texto son obligatorios.");
        return;
    }

    if (!formData.routeId) {
        setErrorMsg("Debe seleccionar una ruta válida.");
        return;
    }

    if (!proofImage) {
        setErrorMsg("⚠️ SEGURIDAD: Es OBLIGATORIO adjuntar foto del recibo o comprobante.");
        return;
    }

    const localDate = new Date().toISOString().split('T')[0];

    const newExpense: Expense = {
      id: 'e' + Date.now(),
      businessId: user.businessId,
      date: localDate,
      routeId: formData.routeId,
      value: parseFloat(formData.value),
      name: formData.name,
      type: formData.type as any,
      concept: formData.concept,
      proofImage: proofImage
    };
    onAdd(newExpense);
    setShowForm(false);
    setFormData({ name: '', value: '', routeId: allowedRoutes[0]?.id || '', type: 'Operational', concept: '' });
    setProofImage(null);
  };

  const handleToggleConfirm = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Evitar que el listener global resetee el ID inmediatamente
    if (confirmDeleteId === id) {
      onDelete(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2rem] border shadow-sm gap-4">
        <div className="text-center md:text-left">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Gestión de Gastos</h2>
          <p className="text-slate-500 font-medium text-sm">Registro detallado de salidas y egresos operativos</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className={`w-full md:w-auto px-8 py-3.5 rounded-2xl font-black transition shadow-xl flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest text-xs ${
            showForm ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {showForm ? 'Cancelar Registro' : 'Nuevo Egreso'}
        </button>
      </header>

      {showForm && (
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl animate-slideDown border-t-[8px] border-emerald-500">
          <form onSubmit={handleAdd} className="space-y-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest text-sm">Información del Gasto</h3>
            </div>

            {errorMsg && (
                <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-black uppercase tracking-wide border border-rose-100 flex items-center gap-2 animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    {errorMsg}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre / Título</label>
                <input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ej: Gasolina Moto 1"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-50 outline-none transition font-bold text-slate-700 shadow-inner" 
                  
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Valor en Divisa</label>
                <div className="relative">
                   <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                   <input 
                    type="number" 
                    value={formData.value} 
                    onChange={e => setFormData({...formData, value: e.target.value})} 
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-6 py-4 focus:ring-4 focus:ring-indigo-50 outline-none transition font-black text-slate-800 shadow-inner" 
                    
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ruta Asociada</label>
                <select 
                  value={formData.routeId} 
                  onChange={e => setFormData({...formData, routeId: e.target.value})} 
                  className={`w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-50 outline-none transition font-bold text-slate-700 appearance-none cursor-pointer shadow-inner ${allowedRoutes.length === 1 ? 'opacity-80 cursor-not-allowed' : ''}`}
                  disabled={allowedRoutes.length === 1}
                >
                  {allowedRoutes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Categoría del Gasto</label>
                <select 
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-50 outline-none transition font-bold text-slate-700 appearance-none cursor-pointer shadow-inner"
                >
                  <option value="Operational">Operacional / Ruta</option>
                  <option value="Personal">Personal / Retiro</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Concepto / Detalle</label>
                <input 
                  value={formData.concept} 
                  onChange={e => setFormData({...formData, concept: e.target.value})} 
                  placeholder="Detalle breve del motivo del egreso"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-indigo-50 outline-none transition font-bold text-slate-700 shadow-inner" 
                  
                />
              </div>
            </div>

            {/* SECCIÓN DE EVIDENCIA FOTOGRÁFICA */}
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                    Evidencia Comprobante (Obligatorio)
                    <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded text-[8px]">Requerido</span>
                </label>
                
                <div className={`relative group border-2 border-dashed rounded-3xl p-6 transition-all text-center ${proofImage ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-indigo-400'}`}>
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    
                    {proofImage ? (
                        <div className="relative h-48 w-full flex items-center justify-center">
                            <img src={proofImage} alt="Preview" className="h-full object-contain rounded-xl shadow-sm" />
                            <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="text-white font-black uppercase text-xs tracking-widest">Cambiar Imagen</span>
                            </div>
                        </div>
                    ) : (
                        <div className="py-8 flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center text-indigo-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-700 uppercase tracking-tight">Tomar Foto o Subir de Galería</p>
                                <p className="text-xs text-slate-400 mt-1">Soporta JPG, PNG, WEBP (Max 5MB)</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-[2rem] shadow-xl transition transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest">
              Guardar Gasto
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <th className="px-6 md:px-8 py-5">Fecha</th>
                <th className="px-6 md:px-8 py-5">Identificación</th>
                <th className="px-6 md:px-8 py-5">Zona / Ruta</th>
                <th className="px-6 md:px-8 py-5 text-right">Valor Neto</th>
                <th className="px-6 md:px-8 py-5 text-center">Evidencia</th>
                <th className="px-6 md:px-8 py-5 text-center">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {expenses.length > 0 ? expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 md:px-8 py-5">
                    <p className="text-xs font-black text-slate-400 uppercase">{new Date(exp.date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</p>
                    <p className="text-[10px] font-medium text-slate-300">{new Date(exp.date + 'T00:00:00').getFullYear()}</p>
                  </td>
                  <td className="px-6 md:px-8 py-5">
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{exp.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{exp.concept}</p>
                  </td>
                  <td className="px-6 md:px-8 py-5">
                    <div className="inline-flex">
                      <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-tight md:tracking-widest border border-indigo-100 whitespace-nowrap">
                        {routes.find(r => r.id === exp.routeId)?.name || 'Sin Ruta'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 md:px-8 py-5 text-right">
                    <p className="text-lg md:text-xl font-black text-rose-600">-${exp.value.toLocaleString()}</p>
                  </td>
                  <td className="px-6 md:px-8 py-5 text-center">
                    {exp.proofImage ? (
                        <button 
                            onClick={() => setViewImage(exp.proofImage || null)}
                            className="bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 p-2 rounded-xl transition-colors inline-flex items-center gap-1 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                            <span className="text-[9px] font-black uppercase hidden group-hover:inline">Ver</span>
                        </button>
                    ) : (
                        <span className="text-[9px] text-slate-300 font-bold uppercase">Sin Foto</span>
                    )}
                  </td>
                  <td className="px-6 md:px-8 py-5 text-center">
                    <button 
                      onClick={(e) => handleToggleConfirm(e, exp.id)}
                      className={`min-w-[44px] h-11 flex items-center justify-center rounded-xl transition-all duration-300 shadow-sm border ${
                        confirmDeleteId === exp.id 
                        ? 'bg-rose-600 border-rose-700 text-white px-4 scale-105' 
                        : 'bg-rose-50 border-rose-100 text-rose-500 hover:bg-rose-100'
                      }`}
                    >
                      {confirmDeleteId === exp.id ? (
                        <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">¿ELIMINAR?</span>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <p className="text-slate-400 font-black italic uppercase tracking-widest text-xs">No hay egresos registrados hoy</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para ver imagen */}
      {viewImage && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/95 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn" onClick={() => setViewImage(null)}>
            <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center">
                <img src={viewImage} alt="Comprobante Gasto" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border-4 border-slate-800" />
                <button onClick={() => setViewImage(null)} className="mt-6 bg-white text-slate-900 px-8 py-3 rounded-full font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-transform text-xs">
                    Cerrar Vista
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesView;
