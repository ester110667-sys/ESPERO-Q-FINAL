
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Event, Product, Registrant } from '../types';
import { api } from '../services/api';
import { checkConnection } from '../lib/supabase';

interface AdminPanelProps {
  products: Product[];
  bannerUrl?: string | null;
  primaryColor: string;
  buttonColor: string;
  backgroundColor: string;
  onCreateEvent: (event: any) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onUpdateBanner: (newBanner: string | null) => Promise<void>;
  onUpdateColors: (p: string, b: string, bg: string) => Promise<void>;
  onUpsertProduct: (product: any) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onBack: () => void;
}

type TabType = 'events' | 'products' | 'designer';

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  products, bannerUrl, primaryColor, buttonColor, backgroundColor,
  onCreateEvent, onDeleteEvent, onUpdateBanner, onUpdateColors,
  onUpsertProduct, onDeleteProduct, onBack 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('events');
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingIA, setIsGeneratingIA] = useState(false);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const [adminEvents, setAdminEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  const [eForm, setEForm] = useState({ id: '', name: '', desc: '', img: '', vagas: 10, openD: '', openT: '', closeD: '', closeT: '' });
  const [pForm, setPForm] = useState({ id: '', name: '', link: '', images: [] as string[], isActive: true });
  const [isSaving, setIsSaving] = useState(false);
  
  const [dPrimary, setDPrimary] = useState(primaryColor);
  const [dButton, setDButton] = useState(buttonColor);
  const [dBg, setDBg] = useState(backgroundColor);

  const fileInputEvent = useRef<HTMLInputElement>(null);
  const fileInputProduct = useRef<HTMLInputElement>(null);
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

  const handleFileUpload = async (file: File, bucket: 'eventos' | 'produtos') => {
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
    if (!window.confirm('Deseja realmente excluir este evento?')) return;
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

  const copyRegistrantsList = (ev: Event) => {
    const list = ev.registrants.map((reg, idx) => `${idx + 1}. ${reg.email}`).join('\n');
    navigator.clipboard.writeText(`Lista: ${ev.name}\n\n${list || 'Nenhum inscrito.'}`)
      .then(() => alert('Lista de e-mails copiada!'));
  };

  const editEvent = (ev: Event) => {
    const o = new Date(ev.openAt);
    const c = new Date(ev.closedAt);
    setEForm({
      id: ev.id, name: ev.name, desc: ev.description, img: ev.imageUrl, vagas: ev.totalVacancies,
      openD: o.toISOString().split('T')[0], openT: o.toTimeString().slice(0, 5),
      closeD: c.toISOString().split('T')[0], closeT: c.toTimeString().slice(0, 5)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForms = () => {
    setEForm({ id: '', name: '', desc: '', img: '', vagas: 10, openD: '', openT: '', closeD: '', closeT: '' });
    setPForm({ id: '', name: '', link: '', images: [], isActive: true });
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-40">
      <div className="flex flex-col sm:flex-row justify-between items-center border-b border-zinc-900 pb-8 gap-6">
        <div className="flex flex-col items-center sm:items-start">
          <h1 className="text-3xl font-black uppercase tracking-tighter">Admin <span className="text-orange-500">Dashboard</span></h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${dbStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">{dbStatus}</span>
          </div>
        </div>
        <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-zinc-900">
          {(['events', 'products', 'designer'] as TabType[]).map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); resetForms(); }} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-orange-600 text-white' : 'text-zinc-600'}`}>
              {tab === 'events' ? 'Eventos' : tab === 'products' ? 'Produtos' : 'Designer'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'events' && (
        <div className="space-y-12">
          <section className="bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black uppercase">{eForm.id ? 'Editar' : 'Novo'} <span className="text-orange-500">Evento</span></h2>
              {eForm.id && <button onClick={resetForms} className="text-[9px] font-black uppercase text-zinc-500 hover:text-white">Cancelar</button>}
            </div>
            <form onSubmit={async e => {
              e.preventDefault();
              setIsSaving(true);
              try {
                const open = new Date(`${eForm.openD}T${eForm.openT}`).toISOString();
                const close = new Date(`${eForm.closeD}T${eForm.closeT}`).toISOString();
                await onCreateEvent({ ...eForm, totalVacancies: Number(eForm.vagas), openAt: open, closedAt: close });
                resetForms();
                await loadAdminData();
              } catch (err: any) { alert(err.message); } finally { setIsSaving(false); }
            }} className="grid gap-6">
              <div onClick={() => !isUploading && fileInputEvent.current?.click()} className="aspect-video bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-3xl flex items-center justify-center cursor-pointer relative overflow-hidden transition-all hover:border-orange-500/50">
                {eForm.img ? <img src={eForm.img} className="absolute inset-0 w-full h-full object-cover opacity-50" /> : <span className="text-zinc-700 font-black text-[10px]">CAPA DO EVENTO</span>}
                <input type="file" ref={fileInputEvent} className="hidden" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if(f) { const url = await handleFileUpload(f, 'eventos'); if(url) setEForm(p => ({...p, img: url})); } }} />
              </div>
              <input value={eForm.name} onChange={e => setEForm({...eForm, name: e.target.value})} placeholder="Título" className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl font-bold" />
              <textarea value={eForm.desc} onChange={e => setEForm({...eForm, desc: e.target.value})} placeholder="Descrição" className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl h-24" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-zinc-500 uppercase">Abertura</label>
                  <div className="flex gap-2"><input type="date" value={eForm.openD} onChange={e => setEForm({...eForm, openD: e.target.value})} className="bg-zinc-900 p-3 rounded-lg text-xs flex-1" /><input type="time" value={eForm.openT} onChange={e => setEForm({...eForm, openT: e.target.value})} className="bg-zinc-900 p-3 rounded-lg text-xs flex-1" /></div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-zinc-500 uppercase">Vagas</label>
                  <input type="number" value={eForm.vagas} onChange={e => setEForm({...eForm, vagas: Number(e.target.value)})} className="w-full bg-zinc-900 p-3 rounded-lg text-xs" />
                </div>
              </div>
              <button type="submit" disabled={isSaving} className="bg-orange-600 p-4 rounded-xl font-black uppercase text-[10px]">{isSaving ? 'Salvando...' : 'Confirmar Evento'}</button>
            </form>
          </section>

          <div className="grid gap-6">
            {isLoadingEvents ? <div className="text-center py-10">Carregando...</div> : adminEvents.map(ev => (
              <div key={ev.id} className="bg-zinc-950 border border-zinc-900 p-6 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <img src={ev.imageUrl} className="w-16 h-16 rounded-2xl object-cover" />
                  <div>
                    <h4 className="font-black uppercase text-sm leading-none">{ev.name}</h4>
                    <p className="text-[8px] text-zinc-500 uppercase mt-2">{ev.registrants.length} de {ev.totalVacancies} vagas</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => copyRegistrantsList(ev)} className="px-4 py-2 bg-zinc-900 text-[8px] font-black uppercase rounded-lg border border-zinc-800">Inscritos</button>
                  <button onClick={() => editEvent(ev)} className="px-4 py-2 bg-zinc-900 text-[8px] font-black uppercase rounded-lg border border-zinc-800">Editar</button>
                  <button onClick={() => handleRemoveEvent(ev.id)} className="px-4 py-2 bg-red-900/10 text-red-500 text-[8px] font-black uppercase rounded-lg border border-red-900/20">Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-8">
           <section className="bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-10 shadow-2xl">
            <h2 className="text-xl font-black uppercase mb-8">Novo <span className="text-orange-500">Produto</span></h2>
            <form onSubmit={async e => { e.preventDefault(); await onUpsertProduct(pForm); resetForms(); }} className="space-y-4">
               <input value={pForm.name} onChange={e => setPForm({...pForm, name: e.target.value})} placeholder="Nome do Produto" className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl font-bold" />
               <input value={pForm.link} onChange={e => setPForm({...pForm, link: e.target.value})} placeholder="Link de Interesse" className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl font-bold" />
               <button type="submit" className="w-full bg-orange-600 p-4 rounded-xl font-black uppercase text-[10px]">Lançar Produto</button>
            </form>
           </section>
        </div>
      )}

      {activeTab === 'designer' && (
        <div className="space-y-8">
          <section className="bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-10 shadow-2xl text-center">
            <h2 className="text-xl font-black uppercase mb-8">Personalizar <span className="text-orange-500">Cores</span></h2>
            <div className="grid grid-cols-3 gap-4">
              <input type="color" value={dPrimary} onChange={e => setDPrimary(e.target.value)} className="w-full h-12 bg-transparent cursor-pointer" />
              <input type="color" value={dButton} onChange={e => setDButton(e.target.value)} className="w-full h-12 bg-transparent cursor-pointer" />
              <input type="color" value={dBg} onChange={e => setDBg(e.target.value)} className="w-full h-12 bg-transparent cursor-pointer" />
            </div>
            <button onClick={() => onUpdateColors(dPrimary, dButton, dBg)} className="w-full mt-8 bg-orange-600 p-4 rounded-xl font-black uppercase text-[10px]">Salvar Designer</button>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
