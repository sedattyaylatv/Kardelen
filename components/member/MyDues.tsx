import React, { useState, useEffect, useCallback } from 'react';
import Card from '../common/Card';
import { Due, Income, User } from '../../types';
import { supabase, formatSupabaseError } from '../../services/supabaseClient';
import Spinner from '../common/Spinner';

const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const AlertCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const normalizeText = (text: string): string => {
    if (!text) return '';
    return text.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

interface MyDuesProps {
  memberId: number;
}

const MyDues: React.FC<MyDuesProps> = ({ memberId }) => {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFinancials = useCallback(async () => {
    if (!memberId) return;
    setIsLoading(true);
    setError('');
    try {
      const [userRes, duesRes, incomeRes] = await Promise.all([
        supabase.from('user').select('*').eq('id', memberId).single(),
        supabase.from('dues').select('*').eq('user_id', memberId),
        supabase.from('income').select('*'),
      ]);

      if (userRes.error) throw userRes.error;
      if (duesRes.error) throw duesRes.error;
      if (incomeRes.error) throw incomeRes.error;

      const user = userRes.data as User;
      const dues = duesRes.data as Due[];
      const incomes = incomeRes.data as Income[];

      const totalDue = dues.reduce((sum, due) => sum + due.amount, 0);

      const normalizedUserName = normalizeText(user.name);
      const userApartmentNum = user.apartment.replace(/\D/g, '');
      const totalPaid = incomes
        .filter(income => {
          const normalizedDescription = normalizeText(income.description);
          const nameMatch = normalizedUserName ? normalizedDescription.includes(normalizedUserName) : false;
          const apartmentMatch = userApartmentNum ? new RegExp(`\\b${userApartmentNum}\\b`).test(normalizedDescription) : false;
          return nameMatch || apartmentMatch;
        })
        .reduce((sum, income) => sum + income.amount, 0);
        
      setBalance(totalDue - totalPaid);

    } catch (err: any) {
      console.error("Error fetching financial summary:", err);
      setError(formatSupabaseError(err, "Güncel borç bilgisi"));
    } finally {
      setIsLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchFinancials();
  }, [fetchFinancials]);

  if (isLoading) {
    return (
      <Card title="Güncel Borç">
        <div className="flex justify-center items-center p-4">
          <Spinner />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Güncel Borç">
        <p className="text-red-500">{error}</p>
      </Card>
    );
  }

  const hasDebt = balance > 0;

  return (
    <Card title="Güncel Borç" className={!hasDebt ? 'bg-green-100' : 'bg-red-100'}>
      <div className="flex items-center space-x-4">
        <div>
          {!hasDebt ? (
            <CheckCircleIcon className="w-10 h-10 text-green-600" />
          ) : (
            <AlertCircleIcon className="w-10 h-10 text-red-600" />
          )}
        </div>
        <div>
          <p className="text-lg font-bold">
            <span className={!hasDebt ? 'text-green-800' : 'text-red-800'}>
              {hasDebt ? 'Toplam Borcunuz' : 'Borcunuz bulunmamaktadır'}
            </span>
          </p>
          <p className="text-3xl font-bold text-slate-800">
            ₺{balance.toFixed(2)}
          </p>
        </div>
      </div>
      {hasDebt && <p className="text-sm text-red-700 mt-4">Lütfen ödemenizi en kısa sürede yapınız.</p>}
      {!hasDebt && balance < 0 && <p className="text-sm text-green-700 mt-4">Hesabınızda ₺{(-balance).toFixed(2)} fazla bakiye bulunmaktadır.</p>}
    </Card>
  );
};

export default MyDues;