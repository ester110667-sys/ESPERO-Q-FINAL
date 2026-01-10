import React from 'react';
import { Event, EventStatus } from '../types';

interface EventCardProps {
  event: Event;
  currentTime: number;
  onSelect: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, currentTime, onSelect }) => {
  const isAfterOpen = currentTime >= event.openAt;
  const isFinished = currentTime > event.closedAt;
  const vacanciesLeft = Math.max(0, event.totalVacancies - (event.registrantCount || 0));
  const isFull = vacanciesLeft <= 0;

  let status = EventStatus.CLOSED;
  let statusClasses = 'bg-zinc-800 text-zinc-400 border-zinc-700';
  let buttonClasses = 'bg-zinc-900 text-zinc-700 border-zinc-800 cursor-not-allowed opacity-50';

  if (isFinished) {
    status = EventStatus.FINISHED;
    statusClasses = 'bg-zinc-900 text-zinc-500 border-zinc-800';
    buttonClasses = 'bg-zinc-900 text-zinc-600 border-zinc-800';
  } else if (isAfterOpen) {
    if (isFull) {
      status = EventStatus.FULL;
      statusClasses = 'bg-red-500/10 text-red-500 border-red-500/20';
      buttonClasses = 'bg-zinc-900 text-zinc-500 border-zinc-800';
    } else {
      status = EventStatus.OPEN;
      statusClasses = 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      buttonClasses = 'bg-orange-600 hover:bg-orange-500 text-white border-orange-600';
    }
  }

  const f = (ts: number) => {
    if (!ts) return '--/--';
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
  };

  return (
    <div className={`flex flex-col bg-zinc-950 border border-zinc-900 rounded-[2rem] overflow-hidden transition-all duration-300 hover:border-zinc-700 group ${isFinished ? 'opacity-60' : ''}`}>
      <div className="relative aspect-video overflow-hidden bg-zinc-900">
        <img 
          src={event.imageUrl} 
          alt={event.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent opacity-60" />
        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border backdrop-blur-sm ${statusClasses}`}>
          {status}
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-black uppercase tracking-tight mb-4 group-hover:text-orange-500 transition-colors">{event.name}</h3>
        
        <div className="grid grid-cols-2 gap-2 mb-6 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
          <div className="bg-zinc-900/50 p-2 rounded-lg">
            <span className="block text-[7px] text-zinc-600 mb-1">Início</span>
            {f(event.openAt)}
          </div>
          <div className="bg-zinc-900/50 p-2 rounded-lg">
            <span className="block text-[7px] text-zinc-600 mb-1">Fim</span>
            {f(event.closedAt)}
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-zinc-900/50 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[7px] font-black text-zinc-600 uppercase">Vagas Livres</span>
            <span className={`text-lg font-black ${isFull ? 'text-red-500' : 'text-white'}`}>{vacanciesLeft}</span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            disabled={isFinished || (!isAfterOpen && status !== EventStatus.OPEN)}
            className={`px-6 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest border transition-all active:scale-95 ${buttonClasses}`}
          >
            {isFinished ? 'Encerrado' : (isFull ? 'Esgotado' : (isAfterOpen ? 'Garantir Vaga' : 'Em breve'))}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventCard;