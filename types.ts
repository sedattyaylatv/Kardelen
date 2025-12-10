export enum Role {
  Admin = 'Yönetici',
  Member = 'Üye',
}

export interface User {
  id: number;
  name: string;
  apartment: string;
  role: Role;
  email: string;
  sifre?: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export interface Due {
  id: number;
  user_id: number;
  month: string;
  amount: number;
  status: 'Ödendi' | 'Ödenmedi';
  user: {
    name: string;
    apartment: string;
  } | null;
}

export interface Message {
  id: number;
  created_at: string;
  sender_id: number;
  receiver_id: number;
  content: string;
}

export interface Income {
  id: number;
  date: string;
  receipt_no: string | null;
  description: string;
  amount: number;
}

export interface Expense {
  id: number;
  date: string;
  receipt_no: string | null;
  description: string;
  transaction_amount: number;
  fee: number;
  total_amount: number;
}

export interface PaymentSummary {
  userId: number;
  name: string;
  apartment: string;
  totalDue: number;
  totalPaid: number;
  remainingBalance: number;
}