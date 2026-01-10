
export interface Registrant {
  id: string;
  name: string;
  email: string;
  timestamp: number;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  totalVacancies: number;
  openAt: number;
  closedAt: number;
  registrants: Registrant[];
}

export interface Product {
  id: string;
  name: string;
  images: string[]; // URLs do Supabase Storage
  link: string;
  isActive: boolean;
}

export type ViewState = 'home' | 'event-detail' | 'admin-dashboard';

export enum EventStatus {
  CLOSED = 'Inscrições fechadas',
  OPEN = 'Inscrições abertas',
  FULL = 'Vagas esgotadas',
  FINISHED = 'Evento encerrado'
}
