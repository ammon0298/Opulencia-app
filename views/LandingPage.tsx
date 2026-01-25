import React from 'react';
import { useGlobal } from '../contexts/GlobalContext';
import { Language } from '../utils/i18n';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onRegister }) => {
  const { t, language, setLanguage } = useGlobal();

  return (
    <div className="min-h-screen bg-slate-950 font-inter selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* Navbar de Alta Dirección - Mejorado para Mobile */}
      <nav className="fixed w-full z-[100] bg-slate-950/80 backdrop-blur-3xl border-b border-white/5 py-4 md:py-6">
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-4 group cursor-pointer shrink-0">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-black shadow-2xl shadow-indigo-500/20 group-hover:rotate-12 transition-all">O</div>
            <span className="text-lg md:text-2xl font-black text-white tracking-tighter uppercase">Opulencia</span>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            
            {/* Language Selector */}
            <div className="relative group">
                <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="bg-white/5 text-white border border-white/10 rounded-lg py-2 pl-3 pr-8 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                >
                    <option value="es" className="text-slate-900">🇪🇸 ESP</option>
                    <option value="en" className="text-slate-900">🇺🇸 ENG</option>
                    <option value="pt" className="text-slate-900">🇧🇷 POR</option>
                    <option value="fr" className="text-slate-900">🇫🇷 FRA</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </div>
            </div>

            <button onClick={onRegister} className="text-[10px] font-black text-slate-400 hover:text-white transition-colors uppercase tracking-[0.3em] hidden md:block">
                {t('landing_cta_license')}
            </button>
            <button 
              onClick={onLogin} 
              className="bg-white text-slate-950 px-5 py-2.5 md:px-10 md:py-4 rounded-xl md:rounded-2xl text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all shadow-2xl active:scale-95 uppercase tracking-[0.2em] border-b-2 md:border-b-4 border-slate-200 hover:border-indigo-900 whitespace-nowrap"
            >
              {t('landing_cta_login')}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero: Ingeniería de Capital */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 md:px-8 pt-32">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop" 
            className="w-full h-full object-cover opacity-20 grayscale scale-105"
            alt="Fondo Tecnológico"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/80 to-slate-950"></div>
        </div>
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-2 rounded-full mb-10 backdrop-blur-xl">
             <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping"></div>
             <span className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.4em]">{t('landing_subtitle')}</span>
          </div>
          <h1 className="text-5xl sm:text-7xl md:text-[9rem] font-black text-white leading-[0.8] tracking-tighter mb-10">
            {t('landing_hero_title_1')} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-emerald-400 to-indigo-500">{t('landing_hero_title_2')}</span>
          </h1>
          <p className="text-lg md:text-2xl text-slate-400 max-w-4xl mx-auto font-medium mb-16 leading-relaxed opacity-80 px-4">
            {t('landing_hero_desc')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 px-4">
            <button onClick={onRegister} className="w-full sm:w-auto bg-indigo-600 text-white px-10 py-6 md:px-16 md:py-8 rounded-[2rem] md:rounded-[2.5rem] font-black text-lg md:text-xl shadow-3xl shadow-indigo-500/40 hover:-translate-y-2 transition-all active:scale-95 border-b-[6px] md:border-b-[10px] border-indigo-900 uppercase tracking-widest">
              {t('landing_cta_license')}
            </button>
          </div>
        </div>
      </section>

      {/* 01: Analítica Predictiva */}
      <ModuleSection 
        index="01" 
        tag={t('landing_mod1_tag')} 
        title={t('landing_mod1_title')} 
        desc={t('landing_mod1_desc')}
        imageUrl="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop"
        items={[
          { t: t('landing_mod1_item1_t'), d: t('landing_mod1_item1_d') },
          { t: t('landing_mod1_item2_t'), d: t('landing_mod1_item2_d') }
        ]}
      />

      {/* 02: Gestión de Riesgo */}
      <ModuleSection 
        index="02" 
        tag={t('landing_mod2_tag')} 
        title={t('landing_mod2_title')} 
        desc={t('landing_mod2_desc')}
        imageUrl="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop"
        reverse
        gridItems={[
          { c: "bg-rose-500", t: t('landing_mod2_grid1_t'), d: t('landing_mod2_grid1_d') },
          { c: "bg-amber-500", t: t('landing_mod2_grid2_t'), d: t('landing_mod2_grid2_d') },
          { c: "bg-emerald-500", t: t('landing_mod2_grid3_t'), d: t('landing_mod2_grid3_d') },
          { c: "bg-indigo-500", t: t('landing_mod2_grid4_t'), d: t('landing_mod2_grid4_d') }
        ]}
      />

      {/* 03: Motor Predictivo */}
      <ModuleSection 
        index="03" 
        tag={t('landing_mod3_tag')} 
        title={t('landing_mod3_title')} 
        desc={t('landing_mod3_desc')}
        imageUrl="https://images.unsplash.com/photo-1512428559087-560fa5ceab42?q=80&w=2070&auto=format&fit=crop"
        featuredCard={{
          icon: <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
          title: t('landing_mod3_card_title'),
          desc: t('landing_mod3_card_desc')
        }}
      />

      {/* 04: Diccionario Maestro */}
      <ModuleSection 
        index="04" 
        tag={t('landing_mod4_tag')} 
        title={t('landing_mod4_title')} 
        desc={t('landing_mod4_desc')}
        imageUrl="https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=2070&auto=format&fit=crop"
        reverse
        smallItems={[
          { t: t('landing_mod4_item1_t'), d: t('landing_mod4_item1_d') },
          { t: t('landing_mod4_item2_t'), d: t('landing_mod4_item2_d') },
          { t: t('landing_mod4_item3_t'), d: t('landing_mod4_item3_d') },
          { t: t('landing_mod4_item4_t'), d: t('landing_mod4_item4_d') }
        ]}
      />

      {/* 05: Mitigación de Fugas */}
      <ModuleSection 
        index="05" 
        tag={t('landing_mod5_tag')} 
        title={t('landing_mod5_title')} 
        desc={t('landing_mod5_desc')}
        imageUrl="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=2070&auto=format&fit=crop"
        expenseBadges={[t('landing_mod5_badge1'), t('landing_mod5_badge2')]}
      />

      {/* 06: Supervisión Táctica */}
      <ModuleSection 
        index="06" 
        tag={t('landing_mod6_tag')} 
        title={t('landing_mod6_title')} 
        desc={t('landing_mod6_desc')}
        imageUrl="https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?q=80&w=2006&auto=format&fit=crop"
        reverse
        items={[
          { t: t('landing_mod6_item1_t'), d: t('landing_mod6_item1_d') },
          { t: t('landing_mod6_item2_t'), d: t('landing_mod6_item2_d') }
        ]}
      />

      {/* 07: Arqueo Digital */}
      <ModuleSection 
        index="07" 
        tag={t('landing_mod7_tag')} 
        title={t('landing_mod7_title')} 
        desc={t('landing_mod7_desc')}
        imageUrl="https://images.unsplash.com/photo-1559526324-4b87b5e36e41?q=80&w=2070&auto=format&fit=crop"
        ctaButton={{ label: t('landing_mod7_cta'), action: onRegister }}
        liquidationPreview
        t={t}
      />

      {/* Sección de Planes de Suscripción */}
      <section className="py-32 md:py-40 bg-white px-6 md:px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24 md:mb-32">
            <span className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.5em] mb-4 block">{t('landing_pricing_struct')}</span>
            <h2 className="text-4xl md:text-8xl font-black text-slate-950 tracking-tighter leading-none">{t('landing_pricing_title')}</h2>
            <p className="text-slate-500 font-medium text-lg md:text-xl mt-8 max-w-2xl mx-auto px-4">{t('landing_pricing_desc')}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <PricingCard 
              title={t('landing_pricing_std_title')}
              price="29" 
              desc={t('landing_pricing_std_desc')}
              features={['1 Razón Social', '1 Ejecutivo de Campo', 'Módulo de Egresos Básicos', 'Soporte vía Ticket']} 
              onSelect={onRegister}
              t={t}
            />
            <PricingCard 
              title={t('landing_pricing_ent_title')}
              price="69" 
              desc={t('landing_pricing_ent_desc')}
              features={['1 Razón Social', '5 Ejecutivos de Campo', 'Analítica Predictiva Avanzada', 'Auditoría de Ruta VIP']} 
              popular 
              onSelect={onRegister}
              t={t} 
            />
            <PricingCard 
              title={t('landing_pricing_gh_title')} 
              price="149" 
              desc={t('landing_pricing_gh_desc')}
              features={['Rutas Ilimitadas', 'Personal Ilimitado', 'API de Integración ERP', 'Account Manager Dedicado']}
              onSelect={onRegister}
              t={t} 
            />
          </div>
        </div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-50 blur-[120px] rounded-full -mr-48 -mb-48 opacity-50"></div>
      </section>

      {/* Footer Institucional Moderno */}
      <footer className="bg-slate-950 pt-24 pb-12 px-6 md:px-8 border-t border-white/5 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600 via-emerald-500 to-indigo-600 opacity-30"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8 mb-20">
            
            {/* Columna Marca */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-950 text-xl font-black shadow-lg">O</div>
                <h4 className="text-2xl font-black text-white tracking-tighter uppercase">OPULENCIA</h4>
              </div>
              <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-xs">
                {t('landing_footer_desc')}
              </p>
            </div>

            {/* Columna Producto */}
            <div className="space-y-6">
              <h5 className="text-white font-black text-[10px] uppercase tracking-[0.2em]">{t('landing_footer_prod')}</h5>
              <ul className="space-y-4">
                <li><button className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Analítica Financiera</button></li>
                <li><button className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Gestión de Rutas</button></li>
                <li><button className="text-slate-400 hover:text-white transition-colors text-sm font-medium">App Móvil (Staff)</button></li>
                <li><button className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Planes y Precios</button></li>
              </ul>
            </div>

            {/* Columna Compañía */}
            <div className="space-y-6">
              <h5 className="text-white font-black text-[10px] uppercase tracking-[0.2em]">{t('landing_footer_comp')}</h5>
              <ul className="space-y-4">
                <li><button className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Sobre Nosotros</button></li>
                <li><button className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Carreras</button></li>
                <li><button className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Prensa y Medios</button></li>
                <li><button className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Contacto Ventas</button></li>
              </ul>
            </div>

            {/* Columna Legal */}
            <div className="space-y-6">
              <h5 className="text-white font-black text-[10px] uppercase tracking-[0.2em]">{t('landing_footer_leg')}</h5>
              <ul className="space-y-4">
                <li><button className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Términos de Servicio</button></li>
                <li><button className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Política de Privacidad</button></li>
                <li><button className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Seguridad de Datos</button></li>
                <li><button className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Compliance Bancario</button></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
             <p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.2em]">OPULENCIA SOFTWARE GROUP INC. © 2026</p>
             <div className="flex gap-6">
                <SocialIcon path="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                <SocialIcon path="M12 2.163c3.204 0 3.584.012 4.85.072 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Componente de Sección de Módulo
const ModuleSection = ({ index, tag, title, desc, imageUrl, reverse, items, featuredCard, gridItems, smallItems, expenseBadges, ctaButton, liquidationPreview, t }: any) => (
  <section className={`relative py-32 md:py-48 ${reverse ? 'bg-slate-900' : 'bg-slate-950'} px-6 md:px-8 overflow-hidden`}>
    <div className={`max-w-7xl mx-auto flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-16 md:gap-24`}>
      <div className="lg:w-1/2 space-y-10 text-center lg:text-left">
        <div className="flex flex-col items-center lg:items-start">
          <span className="text-indigo-500 font-black text-[10px] uppercase tracking-[0.6em] mb-4">Módulo {index} - {tag}</span>
          <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter leading-[0.9]">{title}</h2>
        </div>
        <p className="text-slate-400 text-lg md:text-xl leading-relaxed opacity-80">{desc}</p>
        
        {items && (
          <ul className="space-y-8">
            {items.map((it: any, i: number) => (
              <li key={i} className="flex gap-6 group text-left">
                <div className="w-1.5 h-10 bg-indigo-600 rounded-full group-hover:scale-y-150 transition-transform shrink-0"></div>
                <div>
                  <h4 className="text-white font-black text-xl md:text-2xl mb-1">{it.t}</h4>
                  <p className="text-slate-500 text-sm font-medium">{it.d}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {featuredCard && (
          <div className="p-8 md:p-10 bg-indigo-600/10 border-l-8 border-indigo-500 rounded-3xl flex gap-8 items-center text-left">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shrink-0 shadow-2xl">
              {featuredCard.icon}
            </div>
            <div>
              <h4 className="text-white font-black text-xl md:text-2xl">{featuredCard.title}</h4>
              <p className="text-indigo-300/80 text-sm mt-2 font-medium italic">{featuredCard.desc}</p>
            </div>
          </div>
        )}

        {gridItems && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {gridItems.map((gi: any, i: number) => (
              <div key={i} className="p-8 bg-white/5 rounded-[2rem] border border-white/5 hover:bg-white/10 transition-all group">
                <div className={`w-3 h-3 ${gi.c} rounded-full mb-4 shadow-lg`}></div>
                <h4 className="text-white font-black text-[10px] uppercase tracking-widest">{gi.t}</h4>
                <p className="text-slate-500 text-[10px] mt-2 font-bold uppercase leading-tight opacity-60 group-hover:opacity-100 transition-opacity">{gi.d}</p>
              </div>
            ))}
          </div>
        )}

        {smallItems && (
          <ul className="grid grid-cols-2 gap-6 md:gap-10 text-left">
            {smallItems.map((si: any, i: number) => (
              <li key={i} className="space-y-2">
                <h4 className="text-white font-black text-[10px] uppercase tracking-[0.2em]">{si.t}</h4>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">{si.d}</p>
              </li>
            ))}
          </ul>
        )}

        {expenseBadges && (
          <div className="flex flex-wrap justify-center lg:justify-start gap-4">
            {expenseBadges.map((eb: string, i: number) => (
              <div key={i} className="bg-rose-500/10 border border-rose-500/30 px-8 py-4 md:px-10 md:py-6 rounded-[2rem] text-rose-500 font-black uppercase text-[10px] tracking-widest shadow-xl">
                {eb}
              </div>
            ))}
          </div>
        )}

        {ctaButton && (
          <button onClick={ctaButton.action} className="bg-white text-indigo-600 px-12 py-6 md:px-16 md:py-8 rounded-[2.5rem] font-black text-lg md:text-xl shadow-4xl hover:-translate-y-2 transition-transform uppercase tracking-widest">
            {ctaButton.label}
          </button>
        )}
      </div>

      <div className="lg:w-1/2 w-full flex justify-center">
        {liquidationPreview ? (
          <div className="bg-white p-6 md:p-16 rounded-[2.5rem] md:rounded-[4rem] shadow-5xl text-slate-900 w-full max-w-xl space-y-8 md:space-y-10 border-4 md:border-8 border-slate-50">
            <div className="flex flex-row justify-between items-center border-b-2 md:border-b-4 border-slate-50 pb-6 md:pb-8">
               <p className="font-black uppercase text-[8px] md:text-[10px] tracking-[0.2em] md:tracking-[0.4em] text-slate-400">{t('landing_mod7_prev_box')}</p>
               <p className="font-black text-indigo-600 uppercase text-[8px] md:text-[10px] tracking-widest font-mono">OPULENCIA 4.0</p>
            </div>
            <div className="space-y-3 md:space-y-6">
               <LiquidationRow label={t('landing_mod7_prev1_l')} value="+$1,250.00" color="text-emerald-600" />
               <LiquidationRow label={t('landing_mod7_prev2_l')} value="-$60.00" color="text-rose-600" />
               <LiquidationRow label={t('landing_mod7_prev3_l')} value="-$400.00" color="text-rose-600" />
            </div>
            <div className="pt-8 md:pt-10 border-t-4 md:border-t-8 border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-0">
               <div className="order-2 md:order-1 w-full md:w-auto">
                  <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-1 md:mb-2">{t('landing_mod7_prev_total')}</p>
                  <p className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-950 tracking-tighter font-mono leading-none">$790.00</p>
               </div>
               <div className="order-1 md:order-2 w-14 h-14 md:w-20 md:h-20 bg-emerald-500 rounded-2xl md:rounded-3xl flex items-center justify-center text-white shadow-2xl self-end md:self-auto shrink-0">
                  <svg className="h-8 w-8 md:h-12 md:w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
               </div>
            </div>
          </div>
        ) : (
          <div className="relative w-full aspect-square md:aspect-video rounded-[2.5rem] md:rounded-[4rem] overflow-hidden bg-slate-900 border-[8px] md:border-[12px] border-white/5 shadow-5xl group">
             <img 
               src={imageUrl} 
               className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-1000 group-hover:opacity-100" 
               alt={title}
             />
             <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
          </div>
        )}
      </div>
    </div>
  </section>
);

const LiquidationRow = ({ label, value, color }: any) => (
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-slate-50 p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100 gap-1 sm:gap-0 w-full transition-all hover:bg-slate-100">
     <p className="font-black text-slate-600 text-[9px] md:text-[11px] uppercase tracking-widest truncate mr-2">{label}</p>
     <p className={`font-black ${color} text-xl md:text-2xl font-mono shrink-0`}>{value}</p>
  </div>
);

const PricingCard = ({ title, price, desc, features, popular, onSelect, t }: any) => (
  <div className={`bg-white p-10 md:p-16 rounded-[3rem] md:rounded-[4rem] border-4 flex flex-col transition-all hover:shadow-4xl group relative overflow-hidden ${popular ? 'border-indigo-600 scale-100 md:scale-105 shadow-4xl z-10' : 'border-slate-50 shadow-xl'}`}>
    {popular && <div className="absolute top-0 right-0 bg-indigo-600 text-white px-8 py-2 rounded-bl-3xl text-[9px] font-black uppercase tracking-[0.3em] shadow-lg">Más Vendido</div>}
    <h3 className="text-3xl md:text-4xl font-black text-slate-950 mb-4">{title}</h3>
    <p className="text-slate-400 font-medium text-sm mb-10 leading-relaxed">{desc}</p>
    <div className="flex items-end gap-2 mb-12">
      <span className="text-6xl md:text-7xl font-black text-slate-950">${price}</span>
      <span className="text-slate-400 font-black mb-3 uppercase text-[10px] tracking-widest">{t('landing_pricing_month')}</span>
    </div>
    <ul className="space-y-6 mb-16 flex-1">
      {features.map((f: string, i: number) => (
        <li key={i} className="flex items-center gap-4 text-xs font-bold text-slate-700">
          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
             <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          </div>
          {f}
        </li>
      ))}
    </ul>
    <button onClick={onSelect} className={`w-full py-6 md:py-8 rounded-[2.5rem] font-black uppercase text-[10px] tracking-[0.3em] transition-all active:scale-95 shadow-2xl border-b-8 ${popular ? 'bg-indigo-600 text-white border-indigo-900 group-hover:bg-indigo-700' : 'bg-slate-950 text-white border-slate-700 group-hover:bg-slate-900'}`}>
      {t('landing_pricing_select')} {title}
    </button>
  </div>
);

const SocialIcon = ({ path }: { path: string }) => (
  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white hover:text-indigo-600 transition-all cursor-pointer">
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d={path} /></svg>
  </div>
);

export default LandingPage;