
import React, { useState, useEffect, useCallback } from 'react';
import { ViewState, Event, Product } from './types.ts';
import Header from './components/Header.tsx';
import AdminAccess from './components/AdminAccess.tsx';
import EventList from './components/EventList.tsx';
import EventDetail from './components/EventDetail.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import { api } from './services/api.ts';
import { checkConnection } from './lib/supabase.ts';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('home');
  const [events, setEvents] = useState<Event[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [homeBanner, setHomeBanner] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#f97316');
  const [buttonColor, setButtonColor] = useState('#ea580c');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('esqf_is_admin') === 'true');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [toast, setToast] = useState<{message: string, type: 'error' | 'success'} | null>(null);

  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const { connected } = await checkConnection();
      if (!connected && !isSilent) {
        showToast('Falha na conexão com o banco.', 'error');
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
      if (pColor) setPrimaryColor(pColor);
      if (bColor) setButtonColor(bColor);
      if (bgColor) setBackgroundColor(bgColor);

      if (selectedEvent) {
        const updatedDetail = await api.fetchEventDetails(selectedEvent.id).catch(() => null);
        if (updatedDetail) setSelectedEvent(updatedDetail);
      }
    } catch (error) {
      console.error("Erro no carregamento do App:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedEvent, showToast]);

  useEffect(() => {
    loadData();
    const unsubscribe = api.subscribeToChanges(() => loadData(true));
    return () => { unsubscribe(); };
  }, [loadData]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAdminLogin = (code: string) => {
    if (code === '3590') {
      setIsAdmin(true);
      setView('admin-dashboard');
      showToast('Bem-vindo, Admin!', 'success');
      localStorage.setItem('esqf_is_admin', 'true');
      return true;
    }
    return false;
  };

  useEffect(() => {
    const styleId = 'dynamic-theme';
    let styleElement = document.getElementById(styleId);
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    styleElement.innerHTML = `
      :root { --primary-color: ${primaryColor}; --button-color: ${buttonColor}; --bg-color: ${backgroundColor}; }
      body { background-color: var(--bg-color) !important; } .bg-orange-500 { background-color: var(--primary-color) !important; }
      .bg-orange-600 { background-color: var(--button-color) !important; } .text-orange-500 { color: var(--primary-color) !important; }
      .border-orange-500 { border-color: var(--primary-color) !important; }
    `;
  }, [primaryColor, buttonColor, backgroundColor]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}

      {view === 'home' && homeBanner && !isLoading && (
        <div className="w-[90%] sm:w-[75%] mx-auto mt-6 relative overflow-hidden shadow-2xl rounded-[2rem] sm:rounded-[2.5rem] aspect-[16/6] sm:aspect-[16/5] bg-zinc-900 border border-white/5">
          <img src={homeBanner} alt="Banner" className="w-full h-full object-cover" />
        </div>
      )}

      <Header onLogoClick={() => { setView('home'); setSelectedEvent(null); }} />
      
      <div className="container mx-auto px-4 max-w-5xl flex-grow">
        <div className="mt-4 flex justify-end">
          <AdminAccess onLogin={handleAdminLogin} isAdmin={isAdmin} onGoToAdmin={() => setView('admin-dashboard')} onLogout={() => { setIsAdmin(false); setView('home'); localStorage.removeItem('esqf_is_admin'); }} />
        </div>

        {isLoading ? (
          <div className="flex h-96 items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <main className="mt-4 pb-12">
            {view === 'home' && <EventList events={events} products={products} currentTime={currentTime} onSelectEvent={async (id) => { const fullEvent = await api.fetchEventDetails(id).catch(() => null); if (fullEvent) { setSelectedEvent(fullEvent); setView('event-detail'); window.scrollTo(0, 0); } }} />}
            {view === 'event-detail' && selectedEvent && <EventDetail event={selectedEvent} currentTime={currentTime} onBack={() => { setView('home'); setSelectedEvent(null); }} onRegister={async (id, n, e) => { await api.register(id, n, e); showToast('Inscrição confirmada!', 'success'); loadData(true); }} />}
            {view === 'admin-dashboard' && isAdmin && (
              <AdminPanel 
                events={events} products={products} bannerUrl={homeBanner} primaryColor={primaryColor} buttonColor={buttonColor} backgroundColor={backgroundColor}
                onUpdateColors={async (p, b, bg) => { await api.updateSetting('primary_color', p); await api.updateSetting('button_color', b); await api.updateSetting('bg_color', bg); setPrimaryColor(p); setButtonColor(b); setBackgroundColor(bg); showToast('Cores salvas!', 'success'); }}
                onUpdateBanner={async (url) => { await api.updateSetting('home_banner', url); setHomeBanner(url); showToast('Banner atualizado!', 'success'); }}
                onCreateEvent={async (e) => { await api.createEvent(e); loadData(true); showToast('Evento salvo!', 'success'); }}
                onDeleteEvent={async (id) => { await api.deleteEvent(id); loadData(true); showToast('Evento excluído.'); }}
                onUpsertProduct={async (p) => { await api.upsertProduct(p); loadData(true); showToast('Produto salvo!', 'success'); }}
                onDeleteProduct={async (id) => { await api.deleteProduct(id); loadData(true); showToast('Produto removido.'); }}
                onBack={() => setView('home')}
              />
            )}
          </main>
        )}
      </div>

      <footer className="py-12 text-center border-t border-white/5 bg-zinc-950/50 mt-12">
        <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.4em] mb-1">EUSOQUEROFOTOGRAFAR</p>
        <p className="text-zinc-700 text-[8px] font-bold uppercase tracking-widest">© 2025 • PROJETO VAGAS ESQF</p>
      </footer>
    </div>
  );
};

export default App;
