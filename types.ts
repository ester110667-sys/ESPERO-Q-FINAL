
export interface Registrant {
  id: string;
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
  registrantCount: number;
}

export interface Product {
  id: string;
  name: string;
  link: string;
  images: string[];
  isActive: boolean;
}

export type ViewState = 'home' | 'event-detail' | 'admin-dashboard';

export enum EventStatus {
  CLOSED = 'Inscrições fechadas',
  OPEN = 'Inscrições abertas',
  FULL = 'Vagas esgotadas',
  FINISHED = 'Evento encerrado',
  CONFIG_ERROR = 'Erro de Configuração'
}
