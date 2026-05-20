export interface Lead {
  id: number;
  name: string;
  email: string;
  company: string;
  status: 'new' | 'contacted' | 'qualified' | 'lost';
  value: number;
  createdAt: string;
}

export interface CreateLeadDto {
  name: string;
  email: string;
  company: string;
  status?: Lead['status'];
  value?: number;
}
