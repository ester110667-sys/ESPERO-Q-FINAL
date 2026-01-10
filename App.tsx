
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
    setTimeout(() => setToast(null), 5000);
  }, []);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const { connected } = await checkConnection();
      if (!connected) {
        if (!isSilent) showToast('Falha na conexão com o banco de dados.', 'error');
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

      // Atualiza o evento selecionado se estiver em detalhes
      if (selectedEvent) {
        try {
          const updatedDetail = await api.fetchEventDetails(selectedEvent.id);
          setSelectedEvent(updatedDetail);
        } catch (e) {
          console.warn("Evento selecionado não encontrado durante recarregamento.");
        }
      }
    } catch (error: any) {
      console.error("App: Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedEvent?.id, showToast]);

  useEffect(() => {
    loadData();
    const unsubscribe = api.subscribeToChanges(() => loadData(true));
    return () => unsubscribe();
  }, [loadData]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAdminLogin = (code: string) => {
    if (code === '3590') {
      setIsAdmin(true);
      setView('admin-dashboard');
      showToast('Painel administrativo liberado.', 'success');
      localStorage.setItem('esqf_is_admin', 'true');
      return true;
    }
    return false;
  };

  // Injeção de Tema Dinâmico com Fallbacks de Segurança
  useEffect(() => {
    const styleId = 'dynamic-theme';
    let styleElement = document.getElementById(styleId);
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    const p = primaryColor || '#f97316';
    const b = buttonColor || '#ea580c';
    const bg = backgroundColor || '#000000';

    styleElement.innerHTML = `
      :root {
        --primary-color: ${p};
        --button-color: ${b};
        --bg-color: ${bg};
      }
      body { background-color: var(--bg-color) !important; }
      .bg-black { background-color: var(--bg-color) !important; }
      .text-orange-500 { color: var(--primary-color) !important; }
      .bg-orange-500 { background-color: var(--primary-color) !important; }
      .bg-orange-600 { background-color: var(--button-color) !important; }
      .border-orange-500 { border-color: var(--primary-color) !important; }
      .border-orange-600 { border-color: var(--button-color) !important; }
      .hover\\:bg-orange-500:hover { background-color: var(--primary-color) !important; opacity: 0.9; }
      .hover\\:text-orange-500:hover { color: var(--primary-color) !important; }
      .shadow-orange-900\\/20 { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); }
    `;
  }, [primaryColor, buttonColor, backgroundColor]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-500">
      {toast && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[300] px-6 py-4 rounded-2xl border shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 font-bold text-xs uppercase tracking-widest flex items-center gap-3 ${
          toast.type === 'success' ? 'bg-green-600 border-green-500 text-white' : 'bg-red-900 border-red-700 text-white'
        }`}>
          <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
          {toast.message}
        </div>
      )}

      {view === 'home' && homeBanner && !isLoading && (
        <div className="w-[75%] mx-auto mt-6 relative overflow-hidden shadow-2xl border border-zinc-900 rounded-[2.5rem] aspect-[16/5] animate-in fade-in duration-700 bg-zinc-900">
          <img 
            src={homeBanner} 
            alt="Banner Principal" 
            className="w-full h-full object-cover" 
            onError={(e) => e.currentTarget.style.display = 'none'}
          />
        </div>
      )}

      <Header onLogoClick={() => { setView('home'); setSelectedEvent(null); }} />
      
      <div className="container mx-auto px-4 max-w-5xl flex-grow">
        <div className="mt-6 flex justify-end">
          <AdminAccess 
            onLogin={handleAdminLogin} 
            isAdmin={isAdmin} 
            onGoToAdmin={() => setView('admin-dashboard')}
            onLogout={() => { setIsAdmin(false); setView('home'); localStorage.removeItem('esqf_is_admin'); }}
          />
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <main className="mt-6">
            {view === 'home' && (
              <EventList 
                events={events} 
                products={products}
                currentTime={currentTime}
                onSelectEvent={async (id) => {
                  try {
                    const fullEvent = await api.fetchEventDetails(id);
                    setSelectedEvent(fullEvent);
                    setView('event-detail');
                  } catch (e: any) {
                    showToast(e.message || "Erro ao carregar detalhes.", "error");
                  }
                }}
              />
            )}

            {view === 'event-detail' && selectedEvent && (
              <EventDetail 
                event={selectedEvent} 
                currentTime={currentTime}
                onBack={() => { setView('home'); setSelectedEvent(null); }}
                onRegister={async (id, n, e) => {
                  await api.register(id, n, e);
                  showToast('Inscrição confirmada!', 'success');
                }}
              />
            )}

            {view === 'admin-dashboard' && isAdmin && (
              <AdminPanel 
                events={events}
                products={products}
                bannerUrl={homeBanner}
                primaryColor={primaryColor}
                buttonColor={buttonColor}
                backgroundColor={backgroundColor}
                onUpdateColors={async (p, b, bg) => { 
                  await api.updateSetting('primary_color', p); 
                  await api.updateSetting('button_color', b);
                  await api.updateSetting('bg_color', bg);
                  setPrimaryColor(p); setButtonColor(b); setBackgroundColor(bg);
                  showToast('Cores atualizadas!', 'success');
                }}
                onUpdateBanner={async (b) => { await api.updateSetting('home_banner', b); loadData(true); }}
                onCreateEvent={async (e) => { await api.createEvent(e); loadData(true); }}
                onDeleteEvent={async (id) => { 
                  await api.deleteEvent(id); 
                  await loadData(true); 
                  showToast('Evento removido.', 'success');
                }}
                onUpsertProduct={async (p) => { await api.upsertProduct(p); loadData(true); showToast('Produto atualizado.', 'success'); }}
                onDeleteProduct={async (id) => { await api.deleteProduct(id); loadData(true); showToast('Produto removido.'); }}
                onBack={() => setView('home')}
              />
            )}
          </main>
        )}
      </div>

      <footer className="py-12 text-center border-t border-zinc-900 mt-20">
        <div className="container mx-auto px-4">
          <p className="text-orange-500 text-[11px] font-black uppercase tracking-[0.5em] mb-2">EUSOQUEROFOTOGRAFAR</p>
          <p className="text-zinc-800 text-[9px] font-bold uppercase tracking-widest">© VAGAS ESQF • 2025</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
