import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import { ViewState, Event, Product } from './types.ts';
import Header from './components/Header.tsx';
import AdminAccess from './components/AdminAccess.tsx';
import EventList from './components/EventList.tsx';
import EventDetail from './components/EventDetail.tsx';
import { api } from './services/api.ts';
import { checkConnection } from './lib/supabase.ts';

const AdminPanel = lazy(() => import('./components/AdminPanel.tsx'));

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('home');
  const [events, setEvents] = useState<Event[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [homeBanner, setHomeBanner] = useState<string | null>(null);
  const [colors, setColors] = useState({ primary: '#f97316', button: '#ea580c', bg: '#000000' });
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('esqf_is_admin') === 'true');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [toast, setToast] = useState<{message: string, type: 'error' | 'success'} | null>(null);
  
  const scrollPositions = useRef<Record<string, number>>({});

  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const { connected } = await checkConnection();
      if (!connected && !isSilent) {
        showToast('Sem conexão com o banco.', 'error');
        return;
      }
      
      const [eventsData, bannerData, productsData, pColor, bColor, bgColor] = await Promise.all([
        api.fetchEvents(),
        api.getSetting('home_banner'),
        api.fetchProducts(),
        api.getSetting('primary_color'),
        api.getSetting('button_color'),
        api.getSetting('bg_color')
      ]);

      setEvents(eventsData);
      setHomeBanner(bannerData);
      setProducts(productsData);
      setColors({
        primary: pColor || '#f97316',
        button: bColor || '#ea580c',
        bg: bgColor || '#000000'
      });
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Sincronizar estado com a URL (histórico do navegador)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state;
      if (state?.view) {
        setView(state.view);
        setSelectedEvent(state.event || null);
        
        // Restaurar scroll
        setTimeout(() => {
          const pos = scrollPositions.current[state.view] || 0;
          window.scrollTo({ top: pos, behavior: 'instant' });
        }, 50);
      } else {
        setView('home');
        setSelectedEvent(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (newView: ViewState, event: Event | null = null) => {
    // Salvar posição atual antes de mudar
    scrollPositions.current[view] = window.scrollY;
    
    setView(newView);
    setSelectedEvent(event);
    
    const url = newView === 'home' ? '/' : `/${newView}/${event?.id || ''}`;
    window.history.pushState({ view: newView, event }, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    loadData();
    const unsub = api.subscribeToChanges(() => loadData(true));
    return () => unsub();
  }, [loadData]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', colors.primary);
    root.style.setProperty('--button-color', colors.button);
    root.style.setProperty('--bg-color', colors.bg);
    
    const styleId = 'dynamic-theme';
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.innerHTML = `
      .text-primary { color: ${colors.primary} !important; }
      .bg-primary { background-color: ${colors.primary} !important; }
      .bg-button { background-color: ${colors.button} !important; }
      .border-primary { border-color: ${colors.primary} !important; }
    `;
  }, [colors]);

  const handleAdminLogin = async (code: string) => {
    if (code === '3590') {
      setIsAdmin(true);
      navigateTo('admin-dashboard');
      localStorage.setItem('esqf_is_admin', 'true');
      showToast('Acesso concedido', 'success');
      return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col selection:bg-orange-500/30">
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 font-bold text-[10px] uppercase tracking-widest ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}

      <Header onLogoClick={() => navigateTo('home')} />

      {view === 'home' && homeBanner && (
        <div className="w-[90%] sm:w-[75%] mx-auto mt-6 relative overflow-hidden rounded-[2rem] aspect-[16/5] bg-zinc-900 border border-white/5 shadow-2xl">
          <img src={homeBanner} alt="Banner" className="w-full h-full object-cover" fetchPriority="high" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}
      
      <div className="container mx-auto px-4 max-w-5xl flex-grow">
        <div className="mt-4 flex justify-end">
          <AdminAccess onLogin={handleAdminLogin} isAdmin={isAdmin} onGoToAdmin={() => navigateTo('admin-dashboard')} onLogout={() => { setIsAdmin(false); navigateTo('home'); localStorage.removeItem('esqf_is_admin'); }} />
        </div>

        <main className="mt-6 pb-20">
          {isLoading && view === 'home' && events.length === 0 ? (
            <div className="flex h-64 items-center justify-center"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            <Suspense fallback={<div className="flex h-64 items-center justify-center"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>}>
              {view === 'home' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <EventList 
                    events={events} 
                    products={products} 
                    currentTime={currentTime} 
                    onSelectEvent={(id) => { 
                      const e = events.find(x => x.id === id);
                      if (e) navigateTo('event-detail', e);
                    }} 
                  />
                </div>
              )}
              
              {view === 'event-detail' && selectedEvent && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <EventDetail 
                    event={selectedEvent} 
                    currentTime={currentTime} 
                    onBack={() => navigateTo('home')} 
                    onRegister={async (id, n, e) => { 
                      await api.register(id, n, e);
                      showToast('Vaga garantida!', 'success');
                      loadData(true);
                    }} 
                  />
                </div>
              )}
              
              {view === 'admin-dashboard' && isAdmin && (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                  <AdminPanel 
                    events={events} products={products} bannerUrl={homeBanner} primaryColor={colors.primary} buttonColor={colors.button} backgroundColor={colors.bg}
                    onUpdateColors={async (p, b, bg) => { 
                      await Promise.all([api.updateSetting('primary_color', p), api.updateSetting('button_color', b), api.updateSetting('bg_color', bg)]);
                      setColors({ primary: p, button: b, bg });
                      showToast('Cores atualizadas', 'success');
                    }}
                    onUpdateBanner={async (url) => { await api.updateSetting('home_banner', url); setHomeBanner(url); showToast('Banner salvo', 'success'); }}
                    onCreateEvent={async (e) => { await api.createEvent(e); loadData(true); showToast('Evento salvo', 'success'); }}
                    onDeleteEvent={async (id) => { await api.deleteEvent(id); loadData(true); showToast('Evento excluído'); }}
                    onUpsertProduct={async (p) => { await api.upsertProduct(p); loadData(true); showToast('Produto salvo', 'success'); }}
                    onDeleteProduct={async (id) => { await api.deleteProduct(id); loadData(true); showToast('Produto excluído'); }}
                    onBack={() => navigateTo('home')}
                  />
                </div>
              )}
            </Suspense>
          )}
        </main>
      </div>

      <footer className="py-12 text-center border-t border-white/5 opacity-50 bg-zinc-950/30">
        <p className="text-orange-500 text-[9px] font-black uppercase tracking-[0.4em]">EUSOQUEROFOTOGRAFAR</p>
        <p className="text-zinc-700 text-[7px] mt-2 uppercase tracking-widest">© 2025 • PROJETO VAGAS ESQF</p>
      </footer>
    </div>
  );
};

export default App;