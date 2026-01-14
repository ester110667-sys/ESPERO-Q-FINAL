
import React, { useState } from 'react';
import { Event } from '../types.ts';
import EventCard from '../EventCard.tsx';

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
    <div className="space-y-16 animate-in fade-in duration-500">
      <div className="space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <h2 className="text-3xl font-black tracking-tighter uppercase">Eventos <span className="text-orange-500">Disponíveis</span></h2>
          <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-zinc-900">
            <button onClick={() => setActiveTab('ativos')} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'ativos' ? 'bg-orange-600 text-white' : 'text-zinc-600'}`}>Ativos</button>
            <button onClick={() => setActiveTab('passados')} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'passados' ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}>Passados</button>
          </div>
        </div>

        {displayEvents.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-zinc-900 rounded-[3rem] text-zinc-800 font-black uppercase tracking-widest text-[10px]">Nenhum evento aqui.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {displayEvents.map((event) => (
              <EventCard key={event.id} event={event} currentTime={currentTime} onSelect={() => onSelectEvent(event.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventList;
