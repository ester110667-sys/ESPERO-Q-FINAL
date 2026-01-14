
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Event, Registrant, EventStatus } from './types';
import { api } from './services/api';
import { checkConnection } from './lib/supabase';

interface AdminPanelProps {
  bannerUrl?: string | null;
  primaryColor: string;
  buttonColor: string;
  backgroundColor: string;
  onCreateEvent: (event: any) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onUpdateBanner: (newBanner: string | null) => Promise<void>;
  onUpdateColors: (p: string, b: string, bg: string) => Promise<void>;
  onBack: () => void;
}

type TabType = 'events' | 'designer';

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  bannerUrl, primaryColor, buttonColor, backgroundColor,
  onCreateEvent, onDeleteEvent, onUpdateBanner, onUpdateColors,
  onBack 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('events');
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingIA, setIsGeneratingIA] = useState(false);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const [adminEvents, setAdminEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const [eForm, setEForm] = useState({ id: '', name: '', desc: '', img: '', vagas: 50, openD: '', openT: '', closeD: '', closeT: '' });
  const [isSaving, setIsSaving] = useState(false);
  
  const [dPrimary, setDPrimary] = useState(primaryColor);
  const [dButton, setDButton] = useState(buttonColor);
  const [dBg, setDBg] = useState(backgroundColor);

  const fileInputEvent = useRef<HTMLInputElement>(null);
  const fileInputBanner = useRef<HTMLInputElement>(null);

  const loadAdminData = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const fullEvents = await api.fetchAdminEvents();
      setAdminEvents(fullEvents);
    } catch(e) {
      console.error("Failed to load admin events", e);
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    const verify = async () => {
      const { connected } = await checkConnection();
      setDbStatus(connected ? 'online' : 'offline');
    };
    verify();
    loadAdminData();
  }, [loadAdminData]);

  const validateForm = () => {
    const now = new Date();
    const openDate = new Date(`${eForm.openD}T${eForm.openT}`);
    const closeDate = new Date(`${eForm.closeD}T${eForm.closeT}`);

    if (!eForm.name || !eForm.desc || !eForm.img) return "Preencha título, descrição e imagem da capa.";
    if (!eForm.openD || !eForm.openT) return "Data e hora de abertura são obrigatórios.";
    if (!eForm.closeD || !eForm.closeT) return "Data e hora de fechamento são obrigatórios.";
    if (eForm.vagas <= 0) return "A quantidade de vagas deve ser maior que zero.";
    
    // Regra: Abertura deve ser futura para NOVOS eventos
    if (!eForm.id && openDate < now) return "A data de abertura não pode ser no passado.";
    
    // Regra: Fechamento após Abertura
    if (closeDate <= openDate) return "A data de fechamento deve ser posterior à data de abertura.";

    return null;
  };

  const handleFileUpload = async (file: File, bucket: 'eventos') => {
    setIsUploading(true);
    try {
      const url = await api.uploadFile(file, bucket);
      return url;
    } catch (err: any) {
      alert(err.message); 
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleAIDescription = async () => {
    if (!eForm.name) return alert('Dê um título ao evento primeiro.');
    setIsGeneratingIA(true);
    try {
      const desc = await api.generateAIDescription(eForm.name);
      setEForm(prev => ({ ...prev, desc }));
    } catch (err) {
      alert('Erro ao conectar com IA.');
    } finally {
      setIsGeneratingIA(false);
    }
  };

  const handleRemoveEvent = async (id: string) => {
    if (!window.confirm('CUIDADO: Isso removerá o evento e TODOS os inscritos permanentemente. Continuar?')) return;
    setIsDeletingId(id);
    try {
      await onDeleteEvent(id);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeletingId(null);
    }
  };

  const getAdminEventStatus = (ev: Event) => {
    const now = Date.now();
    if (ev.closedAt < ev.openAt) return { label: 'ERRO DATA', color: 'bg-red-500' };
    if (now < ev.openAt) return { label: 'AGUARDANDO', color: 'bg-blue-600' };
    if (ev.registrantCount >= ev.totalVacancies) return { label: 'ESGOTADO', color: 'bg-orange-600' };
    if (now > ev.closedAt) return { label: 'ENCERRADO', color: 'bg-zinc-700' };
    return { label: 'ATIVO', color: 'bg-green-600' };
  };

  const copyRegistrantsList = (ev: Event) => {
    const header = `Evento: ${ev.name}\nFuso Horário: Brasília (BRT)\n\n`;
    const list = ev.registrants.length > 0 
      ? ev.registrants.map((reg, idx) => `${idx + 1}. ${reg.email}`).join('\n')
      : 'Nenhum inscrito até o momento.';
    navigator.clipboard.writeText(header + list).then(() => alert('Lista copiada com sucesso!'));
  };

  const editEvent = (ev: Event) => {
    const o = new Date(ev.openAt);
    const c = new Date(ev.closedAt);
    setEForm({
      id: ev.id, name: ev.name, desc: ev.description, img: ev.imageUrl, vagas: ev.totalVacancies,
      openD: o.toISOString().split('T')[0], openT: o.toTimeString().slice(0, 5),
      closeD: c.toISOString().split('T')[0], closeT: c.toTimeString().slice(0, 5)
    });
    setFormError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForms = () => {
    setEForm({ id: '', name: '', desc: '', img: '', vagas: 50, openD: '', openT: '', closeD: '', closeT: '' });
    setFormError(null);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-40">
      <div className="flex flex-col sm:flex-row justify-between items-center border-b border-zinc-900 pb-8 gap-6">
        <div className="flex flex-col items-center sm:items-start">
          <h1 className="text-3xl font-black uppercase tracking-tighter">Admin <span className="text-orange-500">Dashboard</span></h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${dbStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">{dbStatus} - AMÉRICA/SAO_PAULO</span>
          </div>
        </div>
        <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-zinc-900 shadow-2xl">
          {(['events', 'designer'] as TabType[]).map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); resetForms(); }} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-orange-600 text-white' : 'text-zinc-600'}`}>
              {tab === 'events' ? 'Gerenciar Eventos' : 'Aparência'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'events' && (
        <div className="space-y-12">
          <section className="bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black uppercase">{eForm.id ? 'Modificar' : 'Novo'} <span className="text-orange-500">Evento</span></h2>
              {eForm.id && <button onClick={resetForms} className="text-[9px] font-black uppercase text-zinc-500 hover:text-white transition-colors">Cancelar</button>}
            </div>
            
            {formError && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-500 rounded-xl text-[10px] font-black uppercase text-red-400 animate-in zoom-in-95">
                ERRO: {formError}
              </div>
            )}

            <form onSubmit={async e => {
              e.preventDefault();
              const error = validateForm();
              if (error) {
                setFormError(error);
                return;
              }
              
              setIsSaving(true);
              setFormError(null);
              try {
                const open = new Date(`${eForm.openD}T${eForm.openT}`).toISOString();
                const close = new Date(`${eForm.closeD}T${eForm.closeT}`).toISOString();
                
                await onCreateEvent({ 
                  ...eForm, 
                  totalVacancies: Number(eForm.vagas), 
                  openAt: open, 
                  closedAt: close, 
                  imageUrl: eForm.img 
                });
                resetForms();
                await loadAdminData();
              } catch (err: any) { alert(err.message); } finally { setIsSaving(false); }
            }} className="grid gap-6">
              <div onClick={() => !isUploading && fileInputEvent.current?.click()} className="aspect-video bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-3xl flex items-center justify-center cursor-pointer relative overflow-hidden transition-all hover:border-orange-500/50">
                {eForm.img ? <img src={eForm.img} className="absolute inset-0 w-full h-full object-cover opacity-50" /> : <div className="flex flex-col items-center gap-2"><span className="text-zinc-700 font-black">CAPA DO EVENTO</span><span className="text-[8px] text-zinc-800 font-bold uppercase tracking-widest">Selecione uma imagem</span></div>}
                {isUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center font-black text-[10px] animate-pulse">PROCESSANDO...</div>}
                <input type="file" ref={fileInputEvent} className="hidden" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if(f) { const url = await handleFileUpload(f, 'eventos'); if(url) setEForm(prev => ({...prev, img: url})); } }} />
              </div>
              <input value={eForm.name} onChange={e => setEForm({...eForm, name: e.target.value})} placeholder="Título do Evento *" className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl font-bold outline-none focus:border-orange-500 transition-colors" />
              <div className="relative group">
                <textarea value={eForm.desc} onChange={e => setEForm({...eForm, desc: e.target.value})} placeholder="Descrição detalhada... *" className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl h-32 outline-none focus:border-orange-500 transition-colors" />
                <button type="button" onClick={handleAIDescription} disabled={isGeneratingIA} className="absolute right-3 bottom-3 bg-zinc-800 hover:bg-orange-600 p-2 rounded-lg text-white transition-all disabled:opacity-50" title="Gerar com IA">
                  {isGeneratingIA ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '🪄'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase text-zinc-500 ml-2">Abertura de Inscrições *</label>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={eForm.openD} onChange={e => setEForm({...eForm, openD: e.target.value})} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-xs" />
                        <input type="time" value={eForm.openT} onChange={e => setEForm({...eForm, openT: e.target.value})} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-xs" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase text-zinc-500 ml-2">Limite Máximo de Vagas *</label>
                    <input type="number" min="1" value={eForm.vagas} onChange={e => setEForm({...eForm, vagas: Number(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-xs font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase text-zinc-500 ml-2">Fechamento Automático *</label>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={eForm.closeD} onChange={e => setEForm({...eForm, closeD: e.target.value})} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-xs" />
                        <input type="time" value={eForm.closeT} onChange={e => setEForm({...eForm, closeT: e.target.value})} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-xs" />
                    </div>
                </div>
                <button type="submit" disabled={isSaving} className="self-end bg-orange-600 hover:bg-orange-500 p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-xl shadow-orange-900/40">
                    {isSaving ? 'SALVANDO...' : eForm.id ? 'ATUALIZAR EVENTO' : 'LANÇAR NOVO EVENTO'}
                </button>
              </div>
              <p className="text-[7px] text-zinc-700 text-center uppercase tracking-widest font-bold">Respeitando o Fuso América/São_Paulo</p>
            </form>
          </section>
          
          <div className="grid gap-12">
            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-700 ml-4">Lista de Eventos Registrados</h3>
            {isLoadingEvents ? (
                <div className="text-center text-zinc-500 text-[10px] font-black uppercase tracking-widest animate-pulse">Sincronizando Banco...</div>
            ) : adminEvents.map(ev => {
              const st = getAdminEventStatus(ev);
              return (
              <div key={ev.id} className="space-y-4 group">
                <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 transition-all group-hover:border-zinc-700 shadow-xl">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative">
                      <img src={ev.imageUrl} className="w-14 h-14 rounded-2xl object-cover border border-zinc-800 shadow-lg" />
                      <span className={`absolute -top-2 -left-2 px-2 py-0.5 rounded-md text-[6px] font-black text-white ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    <div>
                        <p className="text-[11px] font-black uppercase text-white leading-tight">{ev.name}</p>
                        <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                            {ev.registrantCount} / {ev.totalVacancies} INSCRITOS
                        </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-center">
                    <button onClick={() => copyRegistrantsList(ev)} className="flex-1 sm:flex-none px-5 py-2.5 bg-orange-600/10 hover:bg-orange-600 text-orange-500 hover:text-white rounded-xl text-[9px] font-black uppercase border border-orange-500/20 transition-all active:scale-95">Copiar Lista</button>
                    <button onClick={() => editEvent(ev)} className="flex-1 sm:flex-none px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-[9px] font-black uppercase transition-all">Editar</button>
                    <button onClick={() => handleRemoveEvent(ev.id)} disabled={isDeletingId === ev.id} className="flex-1 sm:flex-none px-5 py-2.5 bg-red-900/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-[9px] font-black uppercase border border-red-900/20 transition-all">
                        {isDeletingId === ev.id ? '...' : 'Remover'}
                    </button>
                  </div>
                </div>
                <div className="mx-2 sm:mx-8 bg-zinc-900/20 border border-zinc-800/40 rounded-[2.5rem] overflow-hidden">
                  <div className="bg-zinc-900/40 px-8 py-4 border-b border-zinc-800/50 flex justify-between items-center">
                    <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                        <span className="w-1 h-3 bg-orange-500 rounded-full"></span>
                        Controle de Inscritos
                    </h4>
                  </div>
                  <div className="p-6 sm:p-8 space-y-3 max-h-[300px] overflow-y-auto hide-scrollbar">
                    {ev.registrants.length === 0 ? (
                        <div className="py-10 text-center text-[10px] text-zinc-700 font-bold uppercase tracking-widest">Nenhuma inscrição realizada.</div>
                    ) : ev.registrants.map((reg, idx) => (
                      <div key={reg.id} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-zinc-800/20 hover:border-zinc-700/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-zinc-700 w-4">{idx + 1}.</span>
                            <span className="text-[9px] font-mono text-zinc-400">{reg.email}</span>
                        </div>
                        <span className="text-[7px] text-zinc-700 font-bold">
                            {new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(reg.timestamp))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {activeTab === 'designer' && (
        <div className="space-y-12">
          <section className="bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-10 shadow-2xl">
            <h2 className="text-xl font-black uppercase mb-8">Banner <span className="text-orange-500">Master</span></h2>
            <div onClick={() => !isUploading && fileInputBanner.current?.click()} className="aspect-[16/5] bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-3xl flex items-center justify-center cursor-pointer relative overflow-hidden mb-6 transition-all hover:border-orange-500/50">
              {bannerUrl ? <img src={bannerUrl} className="absolute inset-0 w-full h-full object-cover" /> : <span className="text-zinc-700 font-black uppercase text-[10px] tracking-widest">Enviar Banner Principal</span>}
              {isUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center font-black animate-pulse uppercase text-[10px]">Atualizando...</div>}
              <input type="file" ref={fileInputBanner} className="hidden" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if(f) { const url = await handleFileUpload(f, 'eventos'); if(url) onUpdateBanner(url); } }} />
            </div>
          </section>
          <section className="bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-10 shadow-2xl">
            <h2 className="text-xl font-black uppercase mb-8">Cores do <span className="text-orange-500">Sistema</span></h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                {[{ label: 'Acentos', val: dPrimary, set: setDPrimary }, { label: 'Botões', val: dButton, set: setDButton }, { label: 'Fundo', val: dBg, set: setDBg }].map((c, i) => (
                    <div key={i} className="space-y-3 p-4 bg-black rounded-2xl border border-zinc-900">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block text-center">{c.label}</label>
                        <input type="color" value={c.val} onChange={e => c.set(e.target.value)} className="w-full h-12 bg-transparent cursor-pointer rounded-lg overflow-hidden border-none" />
                        <span className="text-[10px] font-mono text-zinc-700 block text-center uppercase">{c.val}</span>
                    </div>
                ))}
            </div>
            <button onClick={() => onUpdateColors(dPrimary, dButton, dBg)} className="w-full mt-10 bg-orange-600 hover:bg-orange-500 p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95">SALVAR IDENTIDADE VISUAL</button>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
