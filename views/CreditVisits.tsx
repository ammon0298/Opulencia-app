
import React, { useMemo, useState } from 'react';
import { Client, Credit, Payment } from '../types';
import { TODAY_STR } from '../constants';

interface CreditVisitsProps {
  client?: Client;
  credit?: Credit;
  payments: Payment[];
  onBack: () => void;
  onUpdatePayment: (paymentId: string, newAmount: number) => void;
}

const CreditVisits: React.FC<CreditVisitsProps> = ({ client, credit, payments, onBack, onUpdatePayment }) => {
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [newAmount, setNewAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!client || !credit) return null;

  const visits = useMemo(() => {
    return [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments]);

  const totalCollected = visits.reduce((acc, curr) => acc + curr.amount, 0);
  const visitCount = visits.length;

  const isEditable = (dateStr: string) => {
    // CORRECCIÓN 2: Asegurar comparación solo de FECHA (YYYY-MM-DD), ignorando horas
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    return cleanDate === TODAY_STR;
  };

  const handleEditClick = (payment: Payment) => {
    setEditingPayment(payment);
    setNewAmount(payment.amount.toString());
    setError(null);
  };

  const handleSaveEdit = () => {
    if (editingPayment) {
      const parsedAmount = parseFloat(newAmount);
      if (!isNaN(parsedAmount) && parsedAmount >= 0) {
        onUpdatePayment(editingPayment.id, parsedAmount);
        setEditingPayment(null);
        setNewAmount('');
        setError(null);
      } else {
        setError("Por favor ingrese un monto válido.");
      }
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24 px-2 md:px-4 max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 rounded-full text-slate-400 hover:text-indigo-600 transition-all shadow-sm hover:shadow-md active:scale-90 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Bitácora de Visitas</h2>
            <p className="text-slate-500 font-medium text-sm mt-1">Historial operativo de recaudación en campo</p>
          </div>
        </div>
        
        <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</p>
                <p className="text-sm font-black text-slate-800">{client.name}</p>
             </div>
             <div className="w-px h-8 bg-slate-100"></div>
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Crédito</p>
                <p className="text-sm font-black text-indigo-600">#{credit.id.slice(-6).toUpperCase()}</p>
             </div>
        </div>
      </header>

      {/* Resumen Rápido */}
      <div className="grid grid-cols-2 gap-4">
          <div className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-lg shadow-indigo-200">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Total Recaudado Real</p>
             <p className="text-3xl font-black">${totalCollected.toLocaleString()}</p>
          </div>
          <div className="bg-white text-slate-800 p-6 rounded-[2rem] border border-slate-100 shadow-sm">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Visitas Efectivas</p>
             <p className="text-3xl font-black">{visitCount}</p>
          </div>
      </div>

      {/* Tabla de Visitas */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha Visita (Real)</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Abonado (Recibido)</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visits.length > 0 ? (
                visits.map((visit) => {
                  const editable = isEditable(visit.date);
                  // CORRECCIÓN 2: Mostrar solo fecha
                  const dateDisplay = visit.date.includes('T') ? visit.date.split('T')[0] : visit.date;
                  
                  return (
                    <tr key={visit.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                           </div>
                           <div>
                              <p className="font-black text-slate-700 text-sm">{dateDisplay}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Registro en Campo</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                         {visit.amount > 0 ? (
                           <span className="font-black text-xl text-emerald-600 tracking-tight">
                             +${visit.amount.toLocaleString()}
                           </span>
                         ) : (
                           <span className="font-black text-xl text-slate-300 tracking-tight">
                             $0
                           </span>
                         )}
                      </td>
                      <td className="px-8 py-5 text-center">
                        {editable ? (
                          <button 
                            onClick={() => handleEditClick(visit)}
                            className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95 mx-auto border border-indigo-100"
                            title="Editar Abono (Disponible Hoy)"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-300 mx-auto cursor-not-allowed opacity-50" title="Cierre Diario Ejecutado (Bloqueado)">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className="px-8 py-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 text-slate-300 mb-4">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No se han registrado visitas aún</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingPayment && (
        <div className="fixed inset-0 w-full h-full bg-slate-900/80 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl border border-white animate-slideUp">
             <header className="bg-indigo-600 p-6 text-center rounded-t-[2rem]">
               <h3 className="text-xl font-black text-white">Corregir Recaudo</h3>
               <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mt-1">Fecha: {editingPayment.date.split('T')[0]}</p>
             </header>
             <div className="p-8 space-y-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Valor Recibido Real</label>
                   <div className="relative mt-2">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">$</span>
                      <input 
                        type="number" 
                        autoFocus
                        value={newAmount}
                        onChange={(e) => { setNewAmount(e.target.value); setError(null); }}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-10 pr-4 py-4 font-black text-slate-800 text-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all text-center"
                      />
                   </div>
                   {error && (
                      <p className="text-[10px] font-bold text-rose-500 mt-2 text-center animate-pulse">{error}</p>
                   )}
                </div>
                <div className="flex gap-3">
                   <button 
                     onClick={() => setEditingPayment(null)} 
                     className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 font-black py-4 rounded-xl transition uppercase tracking-widest text-[10px]"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={handleSaveEdit} 
                     className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl transition shadow-lg active:scale-95 uppercase tracking-widest text-[10px]"
                   >
                     Guardar Cambio
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditVisits;
