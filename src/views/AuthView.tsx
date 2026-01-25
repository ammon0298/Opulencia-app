
import React, { useState } from 'react';

interface AuthViewProps {
  mode: 'login' | 'register';
  error?: string | null; 
  successMessage?: string | null;
  onLogin: (u: string, p: string) => void;
  onRegister: (data: any) => void;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const cleanEmail = formData.email.trim();
    const cleanPass = formData.password.trim();

    if (mode === 'login') {
      onLogin(cleanEmail, cleanPass);
    } else {
      const fullData = {
        ...formData,
        email: cleanEmail,
        phone: `${formData.phoneCode} ${formData.phoneNumber.trim()}`
      };
      onRegister(fullData);
    }
    setTimeout(() => setIsLoading(false), 3000);
  };

  const startRecovery = () => {
    setValidationError(null);
    onClearError(); 
    setRecoveryStep('email');
    if (formData.email) setRecEmail(formData.email);
  };

  const handleRecSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    
    if (recoveryStep === 'email') {
        const email = recEmail.trim();
        if (!email || !email.includes('@')) {
            setValidationError('Ingrese un correo electrónico válido antes de continuar.');
            return;
        }
        setIsLoading(true);
        const exists = await onRecoverInitiate(email);
        setIsLoading(false);
        if (exists) {
            setRecoveryStep('code');
        }
        
    } else if (recoveryStep === 'code') {
        const code = recCode.trim();
        if (code.length < 6) {
            setValidationError('El código debe tener 6 dígitos.');
            return;
        }
        const isValid = onRecoverVerify(code);
        if (isValid) setRecoveryStep('reset');
        
    } else if (recoveryStep === 'reset') {
        if (recPass1.length < 6) {
            setValidationError('La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (recPass1 !== recPass2) {
            setValidationError('Las contraseñas no coinciden.');
            return;
        }
        setIsLoading(true);
        await onRecoverReset(recPass1.trim());
        setIsLoading(false);
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
        
        {/* Sidebar: Oculto en Mobile, Visible en Desktop */}
        <div className="hidden lg:flex lg:col-span-4 flex-col justify-between bg-indigo-600 p-8 md:p-12 text-white relative overflow-hidden">
          <div className="relative z-10">
             <button onClick={onBack} className="flex items-center gap-2 text-indigo-200 hover:text-white transition mb-8 lg:mb-12 group">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
               <span className="text-[10px] font-black uppercase tracking-widest">Regresar</span>
             </button>
             <h2 className="text-4xl md:text-5xl font-black leading-none tracking-tighter mb-4 md:mb-6">Únete a la Élite.</h2>
             <p className="text-indigo-100 font-medium text-base md:text-lg">Gestiona tu negocio con precisión quirúrgica.</p>
          </div>
          
          <div className="relative z-10 hidden md:block">
             <div className="flex -space-x-4">
                {[1,2,3,4].map(i => <div key={i} className="w-12 h-12 rounded-full border-4 border-indigo-600 bg-indigo-400 overflow-hidden shadow-lg"><img src={`https://i.pravatar.cc/150?u=${i}`} alt="user" /></div>)}
                <div className="w-12 h-12 rounded-full border-4 border-indigo-600 bg-white flex items-center justify-center text-indigo-600 font-black text-xs shadow-lg">+1k</div>
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest mt-4 text-indigo-200">Zonas activas globalmente</p>
          </div>
          
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mt-40 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none"></div>
        </div>

        {/* Content Area: Full width on mobile, 8 cols on desktop */}
        <div className="col-span-1 lg:col-span-8 p-8 md:p-12 lg:p-16 flex flex-col justify-center relative">
          
          {/* Mobile Back Button */}
          <div className="lg:hidden mb-8">
             <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition group">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
               <span className="text-[10px] font-black uppercase tracking-widest">Regresar</span>
             </button>
          </div>

          {recoveryStep !== 'none' ? (
             <div className="animate-slideDown w-full max-w-md mx-auto">
                <header className="mb-8 text-center">
                    <h3 className="text-2xl font-black text-slate-800">Recuperación de Cuenta</h3>
                    <p className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-widest">
                        {recoveryStep === 'email' ? 'Paso 1: Ingrese su correo' : recoveryStep === 'code' ? 'Paso 2: Verifique el código' : 'Paso 3: Nueva contraseña'}
                    </p>
                </header>
                <form onSubmit={handleRecSubmit} className="space-y-6">
                    {recoveryStep === 'email' && (
                        <Input label="Correo Electrónico Registrado" value={recEmail} onChange={setRecEmail} type="email" required placeholder="ejemplo@empresa.com" />
                    )}
                    {recoveryStep === 'code' && (
                        <Input label="Código de 6 dígitos" value={recCode} onChange={setRecCode} type="text" required placeholder="123456" />
                    )}
                    {recoveryStep === 'reset' && (
                        <>
                            <Input label="Nueva Contraseña" value={recPass1} onChange={setRecPass1} type="password" required />
                            <Input label="Confirmar Contraseña" value={recPass2} onChange={setRecPass2} type="password" required />
                        </>
                    )}
                    
                    {displayError && (
                        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold border border-rose-100 animate-shake">
                            {displayError}
                        </div>
                    )}

                    <div className="pt-2 space-y-3">
                        <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl transition uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                            {isLoading ? (
                                <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Procesando...</>
                            ) : recoveryStep === 'email' ? 'Enviar Código' : recoveryStep === 'code' ? 'Verificar' : 'Actualizar Clave'}
                        </button>
                        <button type="button" onClick={cancelRecovery} className="w-full text-slate-400 font-bold text-xs uppercase tracking-widest">Cancelar</button>
                    </div>
                </form>
             </div>
          ) : (
             <>
                <header className="mb-8 flex flex-col items-center lg:items-start text-center lg:text-left">
                    <h3 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">{mode === 'login' ? 'Bienvenido Staff' : 'Configuración de Razón Social'}</h3>
                    <p className="text-slate-400 font-medium text-sm md:text-base mt-2">{mode === 'login' ? 'Ingresa para gestionar tu ruta hoy.' : 'Complete el perfil corporativo para activar la licencia.'}</p>
                </header>

                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    {displayError && (
                        <div className="p-4 bg-rose-50 border-2 border-rose-200 text-rose-700 rounded-2xl flex items-center gap-4 animate-shake mb-6 shadow-md">
                            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest leading-none">Aviso del Sistema</p>
                                <p className="text-xs font-bold mt-1">{displayError}</p>
                            </div>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center gap-3 animate-pulse mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <p className="text-xs font-black uppercase tracking-widest">{successMessage}</p>
                        </div>
                    )}

                    {mode === 'register' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <Input label="Nombre Dueño / Representante" value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
                        <Input label="Identificación (DNI / NIT)" value={formData.dni} onChange={v => setFormData({...formData, dni: v})} required />
                        <div className="md:col-span-2">
                            <Input label="Razón Social / Nombre del Negocio" value={formData.businessName} onChange={v => setFormData({...formData, businessName: v})} required />
                        </div>
                    </div>
                    )}
                    
                    <div className={`${mode === 'login' ? 'md:max-w-xl mx-auto' : ''}`}>
                        <Input label="Usuario / Correo Electrónico" value={formData.email} onChange={v => setFormData({...formData, email: v})} required />
                        
                        <div className="space-y-1 mt-4">
                        <div className="flex justify-between px-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contraseña de Acceso</label>
                            {mode === 'login' && (
                                <button type="button" onClick={startRecovery} className="text-[8px] font-black text-indigo-600 uppercase tracking-widest hover:underline">
                                    ¿Olvidaste tu clave?
                                </button>
                            )}
                        </div>
                        <input 
                            type="password" 
                            value={formData.password} 
                            onChange={e => setFormData({...formData, password: e.target.value})} 
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 md:py-4 focus:ring-4 focus:ring-indigo-100 outline-none transition font-bold text-slate-800 text-lg shadow-inner"
                            required 
                        />
                        </div>
                    </div>

                    <div className={`pt-4 ${mode === 'login' ? 'md:max-w-xl mx-auto' : ''}`}>
                        <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 md:py-5 rounded-2xl shadow-xl transition transform active:scale-95 uppercase tracking-[0.2em] text-[10px] md:text-xs border-b-4 border-indigo-900">
                           {isLoading ? 'VERIFICANDO...' : (mode === 'login' ? 'INICIAR SESIÓN' : 'CONFIRMAR SUSCRIPCIÓN')}
                        </button>
                    </div>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-[11px] font-bold text-slate-400">
                    {mode === 'login' ? '¿Aún no tienes licencia activa?' : '¿Ya tienes una cuenta operativa?'}
                    <button 
                        type="button"
                        onClick={() => onSwitchMode(mode === 'login' ? 'register' : 'login')}
                        className="ml-2 text-indigo-600 hover:underline font-black uppercase tracking-tighter"
                    >
                        {mode === 'login' ? 'Adquirir aquí' : 'Iniciar sesión'}
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
