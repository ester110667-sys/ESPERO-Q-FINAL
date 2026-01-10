
import React, { useState, useEffect } from 'react';
import { ViewState, Event } from './types';
import { getEvents, saveEvents } from './utils/storage';
import Header from './components/Header';
import AdminAccess from './components/AdminAccess';
import EventList from './components/EventList';
import EventDetail from './components/EventDetail';
import AdminPanel from './components/AdminPanel';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('home');
  const [events, setEvents] = useState<Event[]>([]);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('esqf_is_admin') === 'true');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    setEvents(getEvents());
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('esqf_is_admin', String(isAdmin));
  }, [isAdmin]);

  const handleAdminLogin = (code: string) => {
    if (code === '3590') {
      setIsAdmin(true);
      setView('admin-dashboard');
      return true;
    }
    return false;
  };

  const handleCreateEvent = (newEvent: Event) => {
    const updated = [...events, newEvent];
    setEvents(updated);
    saveEvents(updated);
  };

  const handleDeleteEvent = (id: string) => {
    const updated = events.filter(e => e.id !== id);
    setEvents(updated);
    saveEvents(updated);
    if (selectedEventId === id) {
      setView('home');
      setSelectedEventId(null);
    }
  };

  const handleRegister = (eventId: string, name: string, email: string) => {
    const updatedEvents = events.map(event => {
      if (event.id === eventId) {
        return {
          ...event,
          registrants: [
            ...event.registrants,
            { id: crypto.randomUUID(), name, email, timestamp: Date.now() }
          ]
        };
      }
      return event;
    });
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
  };

  useEffect(() => {
    if (view === 'admin-dashboard' && !isAdmin) {
      setView('home');
    }
  }, [view, isAdmin]);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const navigateToHome = () => {
    setView('home');
    setSelectedEventId(null);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-500">
      <Header onLogoClick={navigateToHome} />
      
      <div className="container mx-auto px-4 mt-4 flex justify-end">
        <AdminAccess 
          onLogin={handleAdminLogin} 
          isAdmin={isAdmin} 
          onGoToAdmin={() => setView('admin-dashboard')}
          onLogout={() => { setIsAdmin(false); navigateToHome(); }}
        />
      </div>

      <div className="container mx-auto px-4 py-4 max-w-5xl flex-grow">
        <main className="mt-2">
          {view === 'home' && (
            <EventList 
              events={events} 
              currentTime={currentTime}
              onSelectEvent={(id) => {
                setSelectedEventId(id);
                setView('event-detail');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
            />
          )}

          {view === 'event-detail' && selectedEvent && (
            <EventDetail 
              event={selectedEvent} 
              currentTime={currentTime}
              onBack={navigateToHome}
              onRegister={handleRegister}
            />
          )}

          {view === 'admin-dashboard' && isAdmin && (
            <AdminPanel 
              events={events}
              onCreateEvent={handleCreateEvent}
              onDeleteEvent={handleDeleteEvent}
              onBack={navigateToHome}
            />
          )}
        </main>
      </div>

      <footer className="py-12 text-center border-t border-zinc-900 mt-20">
        <div className="container mx-auto px-4">
          <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Vagas ESQF</p>
          <p className="text-zinc-800 text-[9px] font-bold uppercase tracking-widest">Plataforma de Gestão para Fotógrafos</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
