import React, { useState, useMemo } from 'react';
import { COUNTRY_DATA } from '../constants';

interface AuthViewProps {
  mode: 'login' | 'register';
  error?: string | null; 
  successMessage?: string | null;
  onLogin: (u: string, p: string) => void;
  onRegister: (data: any) => Promise<boolean>;
  onBack: () => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
  onRecoverInitiate: (email: string) => Promise<boolean>;
  onRecoverVerify: (code: string) => boolean;
  onRecoverReset: (newPass: string) => void;
  onClearError: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ mode, error, successMessage, onLogin, onRegister, onBack, onSwitchMode, onRecoverInitiate, onRecoverVerify, onRecoverReset, onClearError }) => {
  const [recoveryStep, setRecoveryStep] = useState<'none' | 'email' | 'code' | 'reset'>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  
  const [recEmail, setRecEmail] = useState('');
  const [recCode, setRecCode] = useState('');
  const [recPass1, setRecPass1] = useState('');
  const [recPass2, setRecPass2] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    dni: '',
    phoneCode: '+57',
    phoneNumber: '',
    address: '',
    country: 'Colombia',
    city: '',
    businessName: ''
  });

  const countriesByContinent = useMemo(() => {
    const groups: { [key: string]: typeof COUNTRY_DATA } = {};
    COUNTRY_DATA.forEach(c => {
      if (!groups[c.continent]) groups[c.continent] = [];
      groups[c.continent].push(c);
    });
    return groups;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setValidationError(null);
    onClearError();

    try {
        if (mode === 'login') {
            if (!formData.email || !formData.password) {
                setValidationError('Por favor ingrese usuario y contraseña.');
                setIsLoading(false);
                return;
            }
            onLogin(formData.email, formData.password);
            setIsLoading(false); 
        } else {
            const fullData = {
                ...formData,
                phone: `${formData.phoneCode} ${formData.phoneNumber}`
            };
            const success = await onRegister(fullData);
            setIsLoading(false);
            if (!success) {
                setValidationError("Hubo un problema enviando la solicitud. Intente nuevamente.");
            } else {
                setRequestSent(true);
            }
        }
    } catch (err) {
        setIsLoading(false);
        setValidationError("Ocurrió un error inesperado.");
    }
  };

  const handleRecSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    onClearError();
    
    if (recoveryStep === 'email') {
        if (!recEmail.trim()) {
            setValidationError("Ingrese su correo electrónico.");
            return;
        }
        setIsLoading(true);
        // La validación de existencia se hace dentro de onRecoverInitiate en App.tsx
        const success = await onRecoverInitiate(recEmail);
        setIsLoading(false);
        if (success) {
            setRecoveryStep('code');
        } else {
            // MENSAJE DE ALERTA ESPECÍFICO SOLICITADO
            setValidationError("El correo ingresado no existe o no está registrado en el sistema.");
        }
        
    } else if (recoveryStep === 'code') {
        const success = onRecoverVerify(recCode);
        if (success) setRecoveryStep('reset');
        else setValidationError("Código incorrecto o expirado.");
        
    } else if (recoveryStep === 'reset') {
        if (recPass1.length < 6) {
            setValidationError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (recPass1 !== recPass2) {
            setValidationError('Las contraseñas no coinciden.');
            return;
        }
        onRecoverReset(recPass1);
        setRecoveryStep('none');
    }
  };

  const cancelRecovery = () => {
    setRecoveryStep('none');
    setRecEmail('');
    setRecCode('');
    setRecPass1('');
    setRecPass2('');
    setValidationError(null);
    onClearError();
  };

  const displayError = error || validationError;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-6 selection:bg-indigo-500 selection:text-white font-inter">
      <div className={`w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-fadeIn relative min-h-[600px] transition-all duration-500 ease-in-out ${mode === 'login' ? 'max-w-5xl' : 'max-w-[1600px]'}`}>
        
        <div className="col-span-1 lg:col-span-4 flex flex-col justify-between bg-indigo-600 p-8 md:p-12 text-white relative overflow-hidden">
          <div className="relative z-10">
             <button onClick={onBack} className="flex items-center gap-2 text-indigo-200 hover:text-white transition mb-8 lg:mb-12 group">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
               <span className="text-[10px] font-black uppercase tracking-widest">Regresar</span>
             </button>
             <h2 className="text-4xl md:text-5xl font-black leading-none tracking-tighter mb-4 md:mb-6">
                {mode === 'login' ? 'Acceso Staff.' : 'Únete a la Élite.'}
             </h2>
             <p className="text-indigo-100 font-medium text-base md:text-lg">
                {mode === 'login' ? 'Plataforma de gestión financiera de alto rendimiento.' : 'Solicita tu licencia y transforma tu operación hoy mismo.'}
             </p>
          </div>
          
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mt-40 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none"></div>
        </div>

        <div className="col-span-1 lg:col-span-8 p-8 md:p-12 lg:p-16 flex flex-col justify-center relative">
          
          {requestSent ? (
             <div className="animate-slideDown w-full max-w-md mx-auto text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-4">¡Solicitud Recibida!</h3>
                <p className="text-slate-500 font-medium text-lg mb-8 leading-relaxed">
                    Hemos recibido su información correctamente. Un asesor comercial se pondrá en contacto con usted en breve para activar su licencia corporativa.
                </p>
                <button 
                    onClick={onBack} 
                    className="bg-slate-900 hover:bg-slate-800 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95"
                >
                    Volver al Inicio
                </button>
             </div>
          ) : recoveryStep !== 'none' ? (
             <div className="animate-slideDown w-full max-w-md mx-auto">
                <header className="mb-8 text-center">
                    <h3 className="text-2xl font-black text-slate-800">Recuperación de Cuenta</h3>
                    <p className="text-slate-400 font-medium text-sm mt-2">
                        {recoveryStep === 'email' && 'Paso 1: Identificación'}
                        {recoveryStep === 'code' && 'Paso 2: Verificación'}
                        {recoveryStep === 'reset' && 'Paso 3: Nueva Clave'}
                    </p>
                </header>

                <form onSubmit={handleRecSubmit} className="space-y-6">
                    {recoveryStep === 'email' && (
                        <Input label="Correo Electrónico Registrado" value={recEmail} onChange={setRecEmail} type="email" required placeholder="ejemplo@empresa.com" />
                    )}
                    {recoveryStep === 'code' && (
                        <Input label="Código de Seguridad (6 dígitos)" value={recCode} onChange={setRecCode} required placeholder="123456" className="text-center font-mono text-2xl tracking-widest" />
                    )}
                    {recoveryStep === 'reset' && (
                        <div className="space-y-4">
                            <Input label="Nueva Contraseña" value={recPass1} onChange={setRecPass1} type="password" required />
                            <Input label="Confirmar Contraseña" value={recPass2} onChange={setRecPass2} type="password" required />
                        </div>
                    )}

                    {displayError && (
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-xs font-bold animate-shake">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            {displayError}
                        </div>
                    )}

                    <div className="pt-2 space-y-3">
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl transition active:scale-95 uppercase tracking-[0.2em] text-xs ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
                        >
                            {isLoading ? 'PROCESANDO...' : (recoveryStep === 'email' ? 'ENVIAR CÓDIGO' : (recoveryStep === 'code' ? 'VERIFICAR' : 'CAMBIAR CLAVE'))}
                        </button>
                        <button type="button" onClick={cancelRecovery} className="w-full text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest">
                            Cancelar Operación
                        </button>
                    </div>
                </form>
             </div>
          ) : (
             <>
                <header className="mb-8 flex flex-col items-center lg:items-start text-center lg:text-left">
                    <h3 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
                        {mode === 'login' ? 'Bienvenido Staff' : 'Solicitud de Licencia'}
                    </h3>
                    <p className="text-slate-400 font-medium text-sm md:text-base mt-2">
                        {mode === 'login' ? 'Ingresa tus credenciales para acceder al panel.' : 'Complete el perfil corporativo. Un asesor activará su cuenta.'}
                    </p>
                </header>

                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    {displayError && (
                        <div className="p-4 bg-rose-50 border-2 border-rose-200 text-rose-700 rounded-2xl flex items-center gap-4 animate-shake mb-6 shadow-md">
                            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest leading-none">Aviso</p>
                                <p className="text-xs font-bold mt-1">{displayError}</p>
                            </div>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-4 bg-emerald-50 border-2 border-emerald-100 text-emerald-700 rounded-2xl flex items-center gap-4 animate-pulse mb-6 shadow-md">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest leading-none">Éxito</p>
                                <p className="text-xs font-bold mt-1">{successMessage}</p>
                            </div>
                        </div>
                    )}

                    {mode === 'register' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 animate-fadeIn">
                        <Input label="Nombre Representante" value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
                        <Input label="Identificación (DNI / NIT)" value={formData.dni} onChange={v => setFormData({...formData, dni: v})} required />
                        <div className="md:col-span-2">
                            <Input label="Nombre del Negocio / Razón Social" value={formData.businessName} onChange={v => setFormData({...formData, businessName: v})} required />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Teléfono Móvil</label>
                            <div className="flex gap-2">
                                <select 
                                    value={formData.phoneCode}
                                    onChange={(e) => setFormData({...formData, phoneCode: e.target.value})}
                                    className="w-32 bg-slate-50 border-2 border-slate-100 rounded-2xl px-3 py-3 md:py-4 appearance-none font-bold text-slate-700 text-sm focus:ring-4 focus:ring-indigo-100 outline-none transition cursor-pointer"
                                >
                                    {COUNTRY_DATA.map(c => <option key={c.code} value={c.dial_code}>{c.flag} {c.dial_code}</option>)}
                                </select>
                                <input 
                                    type="tel"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                                    className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 md:py-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-bold text-slate-800 text-sm shadow-inner"
                                    required
                                    placeholder="300 123 4567"
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">País</label>
                            <select 
                                value={formData.country}
                                onChange={(e) => setFormData({...formData, country: e.target.value})}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 md:py-4 appearance-none font-bold text-slate-800 text-sm focus:ring-4 focus:ring-indigo-100 outline-none transition cursor-pointer shadow-inner"
                                required
                            >
                                <option value="">Seleccione...</option>
                                {Object.entries(countriesByContinent).map(([continent, countries]) => (
                                    <optgroup key={continent} label={continent} className="font-bold text-indigo-900">
                                        {(countries as typeof COUNTRY_DATA).map(c => (
                                            <option key={c.code} value={c.name}>{c.name}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        <Input label="Ciudad" value={formData.city} onChange={v => setFormData({...formData, city: v})} required />
                        <div className="md:col-span-2">
                            <Input label="Dirección Física" value={formData.address} onChange={v => setFormData({...formData, address: v})} required />
                        </div>
                    </div>
                    )}
                    
                    <div className={`${mode === 'login' ? 'md:max-w-xl mx-auto' : 'md:col-span-2'}`}>
                        <Input label="Correo Electrónico (Admin)" value={formData.email} onChange={v => setFormData({...formData, email: v})} required type="email" placeholder="admin@empresa.com" />
                        
                        {mode === 'login' && (
                            <div className="space-y-1 mt-4 animate-fadeIn">
                                <div className="flex justify-between px-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contraseña</label>
                                    <button 
                                        type="button" 
                                        onClick={() => setRecoveryStep('email')}
                                        className="text-[8px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                    >
                                        ¿Olvidaste tu clave?
                                    </button>
                                </div>
                                <input 
                                    type="password" 
                                    value={formData.password} 
                                    onChange={e => setFormData({...formData, password: e.target.value})} 
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 md:py-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-bold text-slate-800 text-lg shadow-inner"
                                    required 
                                />
                            </div>
                        )}
                    </div>

                    <div className={`pt-4 ${mode === 'login' ? 'md:max-w-xl mx-auto' : ''}`}>
                        <button 
                            type="submit" 
                            disabled={isLoading} 
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 md:py-5 rounded-2xl shadow-xl transition transform active:scale-95 uppercase tracking-[0.2em] text-[10px] md:text-xs border-b-4 border-indigo-900"
                        >
                           {isLoading ? 'PROCESANDO...' : (mode === 'login' ? 'INICIAR SESIÓN' : 'ENVIAR SOLICITUD')}
                        </button>
                    </div>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-[11px] font-bold text-slate-400">
                    {mode === 'login' ? '¿Aún no tienes licencia?' : '¿Ya tienes cuenta activa?'}
                    <button 
                        type="button"
                        onClick={() => { onClearError(); onSwitchMode(mode === 'login' ? 'register' : 'login'); }}
                        className="ml-2 text-indigo-600 hover:underline font-black uppercase tracking-tighter"
                    >
                        {mode === 'login' ? 'Solicitar Licencia' : 'Iniciar sesión'}
                    </button>
                    </p>
                </div>
             </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        .animate-shake {
            animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
};

const Input = ({ label, value, onChange, type = 'text', className = '', required, placeholder }: any) => (
  <div className={`space-y-1 ${className}`}>
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      placeholder={placeholder}
      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 md:py-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-bold text-slate-800 text-sm shadow-inner"
      required={required}
    />
  </div>
);

export default AuthView;