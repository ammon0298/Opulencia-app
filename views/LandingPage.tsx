
import React, { useEffect, useRef, useState } from 'react';
import { useGlobal } from '../contexts/GlobalContext';
import { Language } from '../utils/i18n';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onRegister }) => {
  const { t, language, setLanguage, theme, toggleTheme } = useGlobal();

  return (
    <div className="min-h-screen bg-slate-950 font-inter selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* Navbar de Alta Dirección */}
      <nav className="fixed w-full z-[100] bg-white/80 dark:bg-slate-950/80 backdrop-blur-3xl border-b border-slate-200 dark:border-white/5 py-4 md:py-6 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-4 group cursor-pointer shrink-0">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-black shadow-2xl shadow-indigo-500/20 group-hover:rotate-12 transition-all">O</div>
            <span className="text-lg md:text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Opulencia</span>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            
            {/* Theme Toggle */}
            <button 
                onClick={toggleTheme} 
                className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors"
                title="Cambiar Tema"
            >
                {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Language Selector */}
            <div className="relative group">
                <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 rounded-lg py-2 pl-3 pr-8 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                    <option value="es" className="text-slate-900">🇪🇸 ESP</option>
                    <option value="en" className="text-slate-900">🇺🇸 ENG</option>
                    <option value="pt" className="text-slate-900">🇧🇷 POR</option>
                    <option value="fr" className="text-slate-900">🇫🇷 FRA</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-white/50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </div>
            </div>

            <button onClick={onRegister} className="text-[10px] font-black text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors uppercase tracking-[0.3em] hidden md:block">
                {t('landing_cta_license')}
            </button>
            <MagneticButton onClick={onLogin} className="bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-5 py-2.5 md:px-10 md:py-4 rounded-xl md:rounded-2xl text-[10px] font-black hover:bg-indigo-600 dark:hover:bg-indigo-600 hover:text-white dark:hover:text-white transition-all shadow-2xl active:scale-95 uppercase tracking-[0.2em] border-b-2 md:border-b-4 border-slate-700 dark:border-slate-200 hover:border-indigo-900 whitespace-nowrap">
              {t('landing_cta_login')}
            </MagneticButton>
          </div>
        </div>
      </nav>

      {/* Hero: Ingeniería de Capital */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 md:px-8 pt-32 pb-20 bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
        <div className="absolute inset-0 z-0">
            <ParallaxImage 
                src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop"
                // Ajuste de intensidad: Más visible (60% día, 50% noche)
                className="opacity-60 dark:opacity-50 grayscale"
                alt="Hero Background"
            />
        </div>
        {/* Overlay REFORZADO para el Hero (especialmente modo claro) */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/80 to-white dark:from-slate-950/30 dark:via-slate-950/70 dark:to-slate-950 z-0"></div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10 flex flex-col justify-center h-full">
          <div className="inline-flex items-center gap-3 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-8 py-3 rounded-full mb-12 backdrop-blur-xl shadow-lg mx-auto transform hover:scale-105 transition-transform duration-500 ring-1 ring-white/20">
             <div className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-ping"></div>
             <span className="text-indigo-600 dark:text-indigo-400 text-[10px] md:text-xs font-black uppercase tracking-[0.4em]">{t('landing_subtitle')}</span>
          </div>
          <h1 className="text-6xl sm:text-8xl md:text-[10rem] font-black text-slate-900 dark:text-white leading-[0.85] tracking-tighter mb-12 drop-shadow-2xl">
            {t('landing_hero_title_1')} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 dark:from-indigo-400 dark:via-emerald-400 dark:to-indigo-500 animate-gradient-x bg-[length:200%_auto]">{t('landing_hero_title_2')}</span>
          </h1>
          <p className="text-xl md:text-3xl text-slate-600 dark:text-slate-200 max-w-5xl mx-auto font-medium mb-20 leading-relaxed opacity-90 px-4 drop-shadow-lg">
            {t('landing_hero_desc')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 px-4">
            <MagneticButton onClick={onRegister} className="w-full sm:w-auto bg-indigo-600 text-white px-12 py-6 md:px-20 md:py-8 rounded-[2.5rem] font-black text-xl shadow-[0_20px_50px_rgba(79,70,229,0.3)] hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(79,70,229,0.5)] transition-all active:scale-95 border-b-[8px] border-indigo-800 uppercase tracking-widest">
              {t('landing_cta_license')}
            </MagneticButton>
          </div>
        </div>
      </section>

      {/* --- HERO SECUNDARIO: MANIFIESTO OPULENCIA (ACTUALIZADO CON TEXTURA DE BILLETES) --- */}
      <section className="relative py-32 md:py-44 overflow-hidden flex items-center justify-center transition-colors duration-500">
         {/* 1. Fondo Parallax con Imagen de Dinero/Símbolos */}
         <div className="absolute inset-0 z-0 bg-white dark:bg-slate-950">
            <ParallaxImage 
                src="https://images.unsplash.com/photo-1580519542036-c47de6196ba5?q=80&w=2071&auto=format&fit=crop" 
                className="opacity-50 dark:opacity-20 grayscale-[30%]" 
                alt="Money Pattern"
            />
         </div>

         {/* 2. Overlay ajustado: Opacidad AUMENTADA en el centro para máxima legibilidad */}
         <div className="absolute inset-0 z-10 bg-gradient-to-b from-white/60 via-white/70 to-white/75 dark:from-slate-950/40 dark:via-slate-950/50 dark:to-slate-950/40"></div>

         {/* 3. Transiciones Suaves (Fade In/Out) para unir con secciones adyacentes */}
         <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white via-white/80 to-transparent dark:from-slate-950 dark:via-slate-950/80 dark:to-transparent z-10 pointer-events-none" />
         <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-slate-950 dark:via-slate-950/80 dark:to-transparent z-10 pointer-events-none" />

         {/* 4. Elementos decorativos de fondo (sobre el background, bajo el texto) */}
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-30 dark:opacity-20 pointer-events-none z-10">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500 rounded-full blur-[120px] animate-pulse delay-1000"></div>
         </div>

         {/* 5. Contenido de Texto */}
         <div className="relative z-20 max-w-6xl mx-auto px-6 text-center">
            {/* Pregunta inicial */}
            <h2 className="text-sm md:text-base font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.4em] mb-12 animate-fadeIn">
               {t('landing_manifesto_pretitle')}
            </h2>

            {/* Manifiesto Tipográfico */}
            <div className="text-4xl sm:text-5xl md:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-16 drop-shadow-sm">
               {t('landing_manifesto_text_1')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">{t('landing_manifesto_highlight')}</span>,
               <br />
               {t('landing_manifesto_text_2')} <br className="hidden lg:block" />
               <span className="relative inline-block">
                  <span className="relative z-10">{t('landing_manifesto_text_3')}</span>
                  <div className="absolute bottom-1 left-0 w-full h-3 md:h-5 bg-indigo-500/30 dark:bg-indigo-500/50 -rotate-1 z-0 rounded-full"></div>
               </span>.
            </div>

            {/* Propuesta de Valor */}
            <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-300 max-w-4xl mx-auto font-medium leading-relaxed mb-16 drop-shadow-sm">
               {t('landing_manifesto_prop')} <span className="text-slate-800 dark:text-white font-black underline decoration-emerald-400 decoration-2 underline-offset-4">{t('landing_manifesto_prop_highlight')}</span>.
            </p>

            {/* Slogan Final (Badge) */}
            <div className="inline-flex items-center gap-4 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm px-8 py-5 md:px-12 md:py-6 rounded-full border border-slate-200 dark:border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-default">
               <div className="w-3 h-3 md:w-4 md:h-4 bg-indigo-600 rounded-full animate-ping"></div>
               <span className="text-xs md:text-sm font-black text-slate-800 dark:text-white uppercase tracking-[0.3em]">
                  {t('landing_manifesto_slogan')}
               </span>
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
          icon: <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
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
          // Removed Score Crediticio item as requested
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
        imageUrl="https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=2026&auto=format&fit=crop"
        liquidationPreview
        t={t}
      />

      {/* 08: Inteligencia Artificial */}
      <ModuleSection 
        index="08" 
        tag={t('landing_mod8_tag')} 
        title={t('landing_mod8_title')} 
        desc={t('landing_mod8_desc')}
        imageUrl="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2070&auto=format&fit=crop"
        reverse
        aiFeature
        items={[
          { t: t('landing_mod8_item1_t'), d: t('landing_mod8_item1_d') },
          { t: t('landing_mod8_item2_t'), d: t('landing_mod8_item2_d') }
        ]}
      />

      {/* Sección de Planes */}
      <section className="py-32 md:py-40 bg-slate-50 dark:bg-white px-6 md:px-8 relative overflow-hidden transition-colors duration-500">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24 md:mb-32">
            <span className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.5em] mb-4 block">{t('landing_pricing_struct')}</span>
            <h2 className="text-4xl md:text-8xl font-black text-slate-900 dark:text-slate-950 tracking-tighter leading-none">{t('landing_pricing_title')}</h2>
            <p className="text-slate-500 font-medium text-lg md:text-xl mt-8 max-w-2xl mx-auto px-4">{t('landing_pricing_desc')}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* TARJETA 1: PLAN OPU ASCENSO */}
            <PricingCard 
              title={t('landing_plan1_title')}
              subtitle={t('landing_plan1_subtitle')}
              price="12.50"
              desc={t('landing_plan1_desc')}
              features={[
                t('landing_plan1_f1'),
                t('landing_plan1_f2'),
                t('landing_plan1_f3'),
                t('landing_plan1_f4')
              ]}
              footerNote={t('landing_plan1_footer')}
              onSelect={onRegister}
              t={t}
            />

            {/* TARJETA 2: PLAN OPU DOMINIO */}
            <PricingCard 
              title={t('landing_plan2_title')}
              subtitle={t('landing_plan2_subtitle')}
              price="25.00"
              desc={t('landing_plan2_desc')}
              features={[
                t('landing_plan2_f1'),
                t('landing_plan2_f2'),
                t('landing_plan2_f3'),
                t('landing_plan2_f4'),
                t('landing_plan2_f5')
              ]}
              footerNote={t('landing_plan2_footer')}
              popular 
              onSelect={onRegister}
              t={t} 
            />

            {/* TARJETA 3: LEGADO OPULENTE (PROMOCIONAL) */}
            <PromoCard 
              title={t('landing_plan3_title')}
              subtitle={t('landing_plan3_subtitle')}
              limit={t('landing_plan3_limit')}
              features={[
                t('landing_plan3_f1'),
                t('landing_plan3_f2'),
                t('landing_plan3_f3')
              ]}
              footerNote={t('landing_plan3_footer')}
              cta={t('landing_plan3_cta')}
              onSelect={onRegister}
            />
          </div>
        </div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-100 dark:bg-indigo-50 blur-[120px] rounded-full -mr-48 -mb-48 opacity-50"></div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-950 py-16 px-6 md:px-8 border-t border-slate-100 dark:border-white/5 relative overflow-hidden transition-colors duration-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 md:gap-0">
            <div className="flex flex-col items-center md:items-start gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-slate-950 text-xl font-black shadow-lg">O</div>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">OPULENCIA</h4>
                </div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{t('landing_footer_desc')}</p>
            </div>

            <div className="flex gap-6">
               <SocialIcon path="M12.52 2h2.02c.15 1.24.76 2.43 1.73 3.34.97.9 2.2 1.4 3.53 1.45v2.06c-1.23.04-2.43-.28-3.46-.92v6.94a5.77 5.77 0 1 1-5.77-5.77c.32 0 .64.03.95.1v2.16a3.71 3.71 0 1 0 2.82 3.59V2z" />
               <SocialIcon path="M12 2.163c3.204 0 3.584.012 4.85.072 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 border-t border-slate-100 dark:border-white/5 pt-8 text-center">
             <p className="text-slate-400 dark:text-slate-600 font-black text-[10px] uppercase tracking-[0.2em]">OPULENCIA SOFTWARE GROUP INC. © 2026</p>
        </div>
      </footer>
    </div>
  );
};

// --- COMPONENTES AUXILIARES ---

const MagneticButton = ({ children, className, onClick }: any) => {
    const btnRef = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
        const x = e.clientX - (rect.left + rect.width / 2);
        const y = e.clientY - (rect.top + rect.height / 2);
        // Movimiento sutil limitado
        setPosition({ x: x * 0.15, y: y * 0.15 });
    };

    const handleMouseLeave = () => {
        setPosition({ x: 0, y: 0 });
    };

    return (
        <button 
            ref={btnRef}
            onClick={onClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
            className={`transition-transform duration-100 ease-linear ${className}`}
        >
            {children}
        </button>
    );
};

const ParallaxImage = ({ src, className, intensity = 20, alt = "" }: { src: string, className?: string, intensity?: number, alt?: string }) => {
    const [offset, setOffset] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    
    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const start = viewportHeight;
            const end = -rect.height;
            
            if (rect.top < start + 100 && rect.bottom > -100) {
                const progress = (start - rect.top) / (start - end);
                const moveRange = 20; 
                const startPos = -5;
                const currentPos = startPos - (progress * moveRange);
                setOffset(currentPos);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden bg-white dark:bg-slate-900 transition-colors duration-500">
            <img 
                ref={imgRef}
                src={src}
                alt={alt}
                className={`absolute left-0 w-full object-cover transition-transform duration-100 ease-linear will-change-transform ${className}`}
                style={{ height: '140%', top: '0%', transform: `translateY(${offset}%)` }}
            />
        </div>
    );
};

const ModuleSection = ({ index, tag, title, desc, imageUrl, reverse, items, featuredCard, gridItems, smallItems, expenseBadges, ctaButton, liquidationPreview, aiFeature, t }: any) => {
  const hasVisualWidget = featuredCard || gridItems || expenseBadges || liquidationPreview || aiFeature;
  const hasListItems = items && items.length > 0;
  const hasSmallItems = smallItems && smallItems.length > 0;
  const moveItemsToVisual = !hasVisualWidget && (hasListItems || hasSmallItems);
  
  // Identificar si es el módulo 1 para aplicar overlay extra fuerte
  const isHeavyOverlay = index === "01";

  const renderVisualSide = () => {
    if (featuredCard) return (
       <div className="p-10 md:p-14 bg-white/60 dark:bg-white/10 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[3rem] flex flex-col gap-8 shadow-2xl relative group overflow-hidden max-w-lg mx-auto hover:scale-[1.02] transition-transform duration-500">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="w-24 h-24 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center shrink-0 shadow-2xl z-10 rotate-3 group-hover:rotate-0 transition-transform duration-500">
              {featuredCard.icon}
          </div>
          <div className="z-10">
              <h4 className="text-slate-900 dark:text-white font-black text-4xl md:text-5xl leading-tight mb-4">{featuredCard.title}</h4>
              <p className="text-slate-600 dark:text-indigo-200 text-lg md:text-xl font-medium leading-relaxed border-t border-slate-200 dark:border-white/10 pt-6">"{featuredCard.desc}"</p>
          </div>
       </div>
    );

    // MÓDULO 2 REDISEÑADO: Grid Compacto Horizontal
    if (gridItems) return (
       <div className="grid grid-cols-2 gap-3 w-full max-w-3xl mx-auto">
          {gridItems.map((gi: any, i: number) => (
          <div key={i} className="p-5 bg-white/70 dark:bg-black/60 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group flex flex-col justify-between shadow-lg hover:-translate-y-1">
              <div className="flex justify-between items-start mb-3">
                 <div className={`w-2 h-2 ${gi.c} rounded-full shadow-[0_0_10px_currentColor]`}></div>
                 <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 dark:text-white text-[9px] font-mono">ID-{i+1}</div>
              </div>
              <div>
                  <h4 className="text-slate-800 dark:text-white font-black text-[10px] uppercase tracking-widest mb-1">{gi.t}</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-[9px] font-medium leading-tight group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{gi.d}</p>
              </div>
          </div>
          ))}
       </div>
    );

    if (expenseBadges) return (
       <div className="flex flex-col gap-6 justify-center max-w-md mx-auto">
          {expenseBadges.map((eb: string, i: number) => (
          <div key={i} className={`p-8 rounded-[3rem] border backdrop-blur-xl flex items-center gap-6 shadow-2xl transition-transform hover:scale-105 ${i % 2 === 0 ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 self-start' : 'bg-slate-100/80 dark:bg-slate-900/60 border-slate-200 dark:border-white/10 self-end'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg ${i % 2 === 0 ? 'bg-rose-600' : 'bg-slate-700'}`}>$</div>
              <p className={`font-black uppercase text-sm md:text-lg tracking-widest ${i % 2 === 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>{eb}</p>
          </div>
          ))}
       </div>
    );

    if (liquidationPreview) return (
       <div className="bg-white/60 dark:bg-white/10 backdrop-blur-xl p-8 md:p-12 rounded-[3rem] shadow-2xl text-slate-900 w-full max-w-xl mx-auto border border-slate-200 dark:border-white/20 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none group-hover:opacity-50 transition-opacity"></div>
          <div className="flex flex-row justify-between items-center border-b border-slate-200 dark:border-white/10 pb-8 mb-8">
              <p className="font-black uppercase text-xs tracking-[0.4em] text-slate-400 dark:text-white/50">{t ? t('landing_mod7_prev_box') : 'ARQUEO'}</p>
              <div className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-100 dark:border-indigo-500/50 text-indigo-600 dark:text-indigo-300 font-mono text-[10px] font-black tracking-widest">LIVE DATA</div>
          </div>
          <div className="space-y-4">
              <LiquidationRow label={t ? t('landing_mod7_prev1_l') : 'Ingresos'} value="+$1,250.00" color="text-emerald-600 dark:text-emerald-400" />
              <LiquidationRow label={t ? t('landing_mod7_prev2_l') : 'Gastos'} value="-$60.00" color="text-rose-600 dark:text-rose-400" />
              <LiquidationRow label={t ? t('landing_mod7_prev3_l') : 'Préstamos'} value="-$400.00" color="text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-10 pt-10 border-t-2 border-slate-200 dark:border-white/10 flex justify-between items-end">
              <div>
                  <p className="text-xs font-black text-slate-400 dark:text-white/50 uppercase tracking-[0.3em] mb-2">{t ? t('landing_mod7_prev_total') : 'TOTAL'}</p>
                  <p className="text-7xl font-black text-slate-800 dark:text-white tracking-tighter font-mono leading-none drop-shadow-sm">$790.00</p>
              </div>
          </div>
       </div>
    );

    if (aiFeature) return (
       <div className="relative w-full max-w-md mx-auto aspect-video rounded-[2.5rem] overflow-hidden bg-white/80 dark:bg-black/80 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-2xl flex items-center justify-center group hover:shadow-indigo-500/20 transition-shadow">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 dark:opacity-40"></div>
          <div className="absolute inset-0 bg-indigo-100/30 dark:bg-indigo-600/10 mix-blend-overlay group-hover:bg-indigo-200/40 dark:group-hover:bg-indigo-600/20 transition-colors duration-700"></div>
          <div className="relative z-10">
              <div className="w-32 h-32 bg-indigo-500/20 dark:bg-indigo-500/30 rounded-full blur-[40px] animate-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
              <svg className="h-20 w-20 text-indigo-600 dark:text-white drop-shadow-[0_0_25px_rgba(99,102,241,0.5)] group-hover:scale-110 transition-transform duration-700 ease-out" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
          </div>
          <div className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-black dark:via-black/80 dark:to-transparent text-center">
              <p className="text-indigo-600 dark:text-indigo-400 font-mono text-[10px] uppercase tracking-[0.3em] animate-pulse">Gemini 3.0 Processing...</p>
          </div>
       </div>
    );
    
    if (moveItemsToVisual) {
       const list = items || smallItems;
       return (
          <div className="grid grid-cols-1 gap-4 w-full max-w-lg mx-auto">
             {list.map((it:any, i:number) => (
                <div key={i} className="bg-white/60 dark:bg-white/10 backdrop-blur-md border border-slate-200 dark:border-white/10 p-8 rounded-[2rem] hover:bg-white/80 dark:hover:bg-white/20 transition-all hover:-translate-y-1 shadow-lg group cursor-default">
                   <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">{it.t}</h4>
                   <p className="text-sm font-medium text-slate-500 dark:text-slate-300 leading-relaxed">{it.d}</p>
                </div>
             ))}
          </div>
       );
    }
    
    return null;
  };

  const visualContent = renderVisualSide();

  return (
    <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden py-24 transition-colors duration-500">
       <div className="absolute inset-0 z-0 bg-white dark:bg-slate-950">
         <ParallaxImage 
            src={imageUrl} 
            // Ajuste importante: Aumentar opacidad base para que se vea el fondo
            className="opacity-60 dark:opacity-50 brightness-100 dark:brightness-90" 
            alt={title}
         />
       </div>
       
       {/* OVERLAY OPTIMIZADO: Degradado fuerte solo en el lado del texto, transparente en el lado de la imagen visual */}
       <div className={`absolute inset-0 z-10 bg-gradient-to-br 
          ${reverse 
            ? (isHeavyOverlay ? 'from-white/50 via-white/90 to-white' : 'from-white/30 via-white/70 to-white/95') 
            : (isHeavyOverlay ? 'from-white via-white/90 to-white/50' : 'from-white/95 via-white/70 to-white/30')
          } 
          dark:from-slate-950 dark:via-slate-900/80 dark:to-slate-950/30`}>
       </div>

       {/* --- NUEVO: Transiciones Suaves (Fade In/Out) --- */}
       <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white via-white/80 to-transparent dark:from-slate-950 dark:via-slate-950/80 dark:to-transparent z-10 pointer-events-none" />
       <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-slate-950 dark:via-slate-950/80 dark:to-transparent z-10 pointer-events-none" />

       <div className={`relative z-20 container mx-auto px-6 md:px-12 flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-16 lg:gap-24`}>
          
          <div className={`flex-1 space-y-8 text-center ${reverse ? 'lg:text-right' : 'lg:text-left'}`}>
             <div className={`inline-flex flex-col ${reverse ? 'items-end' : 'items-start'}`}>
                <span className="inline-block py-1.5 px-4 rounded-full bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-100 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 text-[10px] font-black tracking-[0.3em] uppercase mb-4 backdrop-blur-md shadow-sm">
                    MÓDULO {index} • {tag}
                </span>
                <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white leading-[0.9] tracking-tight drop-shadow-sm">
                    {title}
                </h2>
             </div>
             
             <p className={`text-xl text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-2xl drop-shadow-sm ${reverse ? 'ml-auto' : 'mr-auto'}`}>
                {desc}
             </p>

             {!moveItemsToVisual && items && items.length > 0 && (
                <ul className={`space-y-4 inline-block text-left bg-white/60 dark:bg-black/20 p-6 rounded-3xl border border-slate-200 dark:border-white/5 backdrop-blur-sm ${reverse ? 'text-right' : 'text-left'}`}>
                   {items.map((it: any, i: number) => (
                      <li key={i} className={`flex items-start gap-4 ${reverse ? 'flex-row-reverse' : ''}`}>
                         <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold mt-1 shrink-0 shadow-lg">✓</div>
                         <div>
                            <strong className="block text-slate-800 dark:text-white text-base font-bold">{it.t}</strong>
                            <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">{it.d}</span>
                         </div>
                      </li>
                   ))}
                </ul>
             )}

             {ctaButton && (
                <div className="pt-6">
                   <MagneticButton onClick={ctaButton.action} className="bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-indigo-600 dark:hover:bg-indigo-500 dark:hover:text-white px-10 py-5 rounded-full font-black uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95 border-b-4 border-slate-700 dark:border-slate-300 hover:border-indigo-800">
                      {ctaButton.label}
                   </MagneticButton>
                </div>
             )}
          </div>

          <div className="flex-1 w-full flex justify-center lg:justify-end perspective-1000">
             {visualContent}
          </div>

       </div>
    </section>
  )
}

const PricingCard = ({ title, subtitle, price, desc, features, popular, onSelect, t, footerNote }: any) => (
  <div className={`bg-white dark:bg-slate-900 p-10 md:p-14 rounded-[3rem] border-4 flex flex-col transition-all duration-300 group relative overflow-hidden transform hover:-translate-y-2 hover:rotate-x-2 perspective-1000 ${popular ? 'border-indigo-600 scale-100 md:scale-105 shadow-2xl z-10' : 'border-slate-100 dark:border-slate-800 shadow-xl hover:shadow-2xl'}`}>
    {popular && <div className="absolute top-0 right-0 bg-indigo-600 text-white px-8 py-2 rounded-bl-3xl text-[9px] font-black uppercase tracking-[0.3em] shadow-lg">Más Vendido</div>}
    
    <div className="mb-6">
        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h3>
        {subtitle && <p className="text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest mt-1">{subtitle}</p>}
    </div>

    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-10 leading-relaxed border-l-4 border-slate-200 dark:border-slate-700 pl-4">{desc}</p>
    
    <div className="flex flex-wrap items-baseline gap-2 mb-10">
      <span className="text-2xl font-black text-slate-400">USD</span>
      <span className="text-6xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter">${price}</span>
      <span className="text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest whitespace-nowrap">{t('landing_pricing_month')}</span>
    </div>

    <ul className="space-y-5 mb-12 flex-1">
      {features.map((f: string, i: number) => (
        <li key={i} className="flex items-center gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
          <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
             <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          </div>
          {f}
        </li>
      ))}
    </ul>

    <div className="mt-auto space-y-6">
        <MagneticButton onClick={onSelect} className={`w-full py-6 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.3em] transition-all active:scale-95 shadow-2xl border-b-8 ${popular ? 'bg-indigo-600 text-white border-indigo-900 group-hover:bg-indigo-700' : 'bg-slate-900 dark:bg-slate-800 text-white border-slate-700 dark:border-slate-950 group-hover:bg-slate-800 dark:group-hover:bg-slate-700'}`}>
        {t('landing_pricing_select')} {title}
        </MagneticButton>
        
        {footerNote && <p className="text-[10px] text-slate-400 text-center font-medium px-4">{footerNote}</p>}
    </div>
  </div>
);

// Nueva Tarjeta Promocional estilo "Black Card"
const PromoCard = ({ title, subtitle, limit, features, footerNote, onSelect, cta }: any) => (
  <div className="bg-slate-900 dark:bg-black p-10 md:p-14 rounded-[3rem] border-4 border-amber-500/50 dark:border-amber-700/50 flex flex-col transition-all duration-300 group relative overflow-hidden transform hover:-translate-y-3 hover:shadow-[0_20px_60px_rgba(245,158,11,0.2)] z-20">
    {/* Fondo efecto oro */}
    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent pointer-events-none"></div>
    <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>

    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-600 to-yellow-500 text-white py-2 text-center shadow-lg">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] animate-pulse">🔥 LANZAMIENTO</p>
    </div>
    
    <div className="mb-8 mt-6 text-center">
        <div className="inline-block p-3 rounded-2xl bg-amber-500/20 text-amber-400 mb-4 border border-amber-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.496 2.132a1 1 0 00-.992 0l-7 4A1 1 0 003 8v7a1 1 0 100 2h14a1 1 0 100-2V8a1 1 0 00.496-1.868l-7-4zM6 9a1 1 0 00-1 1v3a1 1 0 102 0v-3a1 1 0 00-1-1zm3 1a1 1 0 012 0v3a1 1 0 11-2 0v-3zm5-1a1 1 0 00-1 1v3a1 1 0 102 0v-3a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
        </div>
        <h3 className="text-3xl font-black text-white tracking-tight leading-none mb-2">{title}</h3>
        <p className="text-amber-400 font-bold text-xs uppercase tracking-widest">{subtitle}</p>
    </div>

    <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/10 text-center mb-8 backdrop-blur-sm">
        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">{limit}</p>
    </div>

    <ul className="space-y-6 mb-12 flex-1 relative z-10">
      {features.map((f: string, i: number) => (
        <li key={i} className="flex items-start gap-4 text-xs font-bold text-slate-300">
          <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
             <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          </div>
          <span className="leading-relaxed">{f}</span>
        </li>
      ))}
    </ul>

    <div className="mt-auto space-y-6 relative z-10">
        <MagneticButton onClick={onSelect} className="w-full py-6 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.3em] transition-all active:scale-95 shadow-[0_10px_40px_rgba(245,158,11,0.3)] border-b-8 bg-gradient-to-r from-amber-600 to-yellow-500 text-white border-amber-800 hover:brightness-110">
           {cta}
        </MagneticButton>
        {footerNote && <p className="text-[10px] text-slate-500 text-center font-bold px-4">{footerNote}</p>}
    </div>
  </div>
);

const SocialIcon = ({ path }: { path: string }) => (
  <a href="#" className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-all shadow-sm hover:shadow-indigo-500/30 group">
    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d={path} /></svg>
  </a>
);

const LiquidationRow = ({ label, value, color }: { label: string, value: string, color: string }) => (
  <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-3 mb-3 last:border-0 last:mb-0">
    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</p>
    <p className={`text-sm font-black ${color}`}>{value}</p>
  </div>
);

export default LandingPage;
