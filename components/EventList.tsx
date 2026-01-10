
import React, { useState } from 'react';
import { Event } from '../types';
import EventCard from './EventCard';

interface EventListProps {
  events: Event[];
  currentTime: number;
  onSelectEvent: (id: string) => void;
}

const EventList: React.FC<EventListProps> = ({ events, currentTime, onSelectEvent }) => {
  const [activeTab, setActiveTab] = useState<'ativos' | 'passados'>('ativos');

  const activeEvents = events.filter(e => currentTime <= e.closedAt).sort((a, b) => a.openAt - b.openAt);
  const pastEvents = events.filter(e => currentTime > e.closedAt).sort((a, b) => b.closedAt - a.closedAt);

  const displayEvents = activeTab === 'ativos' ? activeEvents : pastEvents;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">
          Explore <span className="text-orange-500">Oportunidades</span>
        </h2>
        
        <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-zinc-900">
          <button 
            onClick={() => setActiveTab('ativos')}
            className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'ativos' ? 'bg-orange-600 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
          >
            Ativos ({activeEvents.length})
          </button>
          <button 
            onClick={() => setActiveTab('passados')}
            className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'passados' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
          >
            Encerrados ({pastEvents.length})
          </button>
        </div>
      </div>

      {displayEvents.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-zinc-900 rounded-[3rem]">
          <h3 className="text-zinc-700 font-black uppercase tracking-[0.3em] text-[11px]">Nenhum evento nesta categoria</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {displayEvents.map((event) => (
            <EventCard 
              key={event.id} 
              event={event} 
              currentTime={currentTime}
              onSelect={() => onSelectEvent(event.id)} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default EventList;
