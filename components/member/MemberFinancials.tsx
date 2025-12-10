
import React, { useState, useEffect, useCallback } from 'react';
import { Due, Income, User } from '../../types';
import Card from '../common/Card';
import { supabase, formatSupabaseError } from '../../services/supabaseClient';
import Spinner from '../common/Spinner';
import Modal from '../common/Modal';
import Button from '../common/Button';

interface MemberFinancialsProps {
  memberId: number;
}

const normalizeText = (text: string): string => {
    if (!text) return '';
    const lowercased = text.toLocaleLowerCase('tr-TR');
    return lowercased
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
};

// Define the shape of our processed financial data
interface FinancialRow {
    id: number;
    month: string;
    dueAmount: number;
    paidAmount: number;
    payments: Income[];
}

const MemberFinancials: React.FC<MemberFinancialsProps> = ({ memberId }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dues, setDues] = useState<Due[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [financialData, setFinancialData] = useState<FinancialRow[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState<Income[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');

  const fetchData = useCallback(async () => {
    if (!memberId) return;
    setIsLoading(true);
    setError('');
    try {
      const [userRes, duesRes, incomeRes] = await Promise.all([
        supabase.from('user').select('*').eq('id', memberId).single(),
        supabase.from('dues').select('*').eq('user_id', memberId).order('created_at', { ascending: false }),
        supabase.from('income').select('*'),
      ]);

      if (userRes.error) throw userRes.error;
      if (duesRes.error) throw duesRes.error;
      if (incomeRes.error) throw incomeRes.error;

      setUser(userRes.data);
      setDues(duesRes.data || []);
      setIncomes(incomeRes.data || []);

    } catch (err: any) {
      console.error('Error fetching member financial data:', err);
      setError(formatSupabaseError(err, 'Finansal geçmiş'));
    } finally {
      setIsLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!user || dues.length === 0) {
        setFinancialData([]);
        return;
    }

    const turkishMonths: { [key: string]: number } = {
        'ocak': 1, 'şubat': 2, 'mart': 3, 'nisan': 4, 'mayıs': 5, 'haziran': 6, 
        'temmuz': 7, 'ağustos': 8, 'eylül': 9, 'ekim': 10, 'kasım': 11, 'aralık': 12
    };

    const normalizedUserName = normalizeText(user.name);
    const userApartmentNum = user.apartment.replace(/\D/g, '');

    const processedData: FinancialRow[] = dues.map(due => {
        const duePeriod = due.month.trim().toLocaleLowerCase('tr-TR');
        const yearMatch = duePeriod.match(/\b(20\d{2})\b/);
        const dueYear = yearMatch ? parseInt(yearMatch[0], 10) : null;
        
        let dueMonth: number | null = null;
        for (const [monthName, monthIndex] of Object.entries(turkishMonths)) {
            if (duePeriod.includes(monthName)) {
                dueMonth = monthIndex;
                break;
            }
        }

        let relevantIncomes: Income[] = [];
        if (dueYear !== null && dueMonth !== null) {
            relevantIncomes = incomes.filter(income => {
                const normalizedDescription = normalizeText(income.description);
                const nameMatch = normalizedUserName ? normalizedDescription.includes(normalizedUserName) : false;
                const apartmentMatch = userApartmentNum ? new RegExp(`\\b${userApartmentNum}\\b`).test(normalizedDescription) : false;
                if (!nameMatch && !apartmentMatch) {
                    return false;
                }

                if (!income.date || !/^\d{4}-\d{2}-\d{2}$/.test(income.date)) {
                    return false;
                }
                const dateParts = income.date.split('-');
                const incomeYear = parseInt(dateParts[0], 10);
                const incomeMonth = parseInt(dateParts[1], 10);
                
                return incomeYear === dueYear && incomeMonth === dueMonth;
            });
        }
        
        const paidAmount = relevantIncomes.reduce((sum, income) => sum + income.amount, 0);
        
        return {
            id: due.id,
            month: due.month,
            dueAmount: due.amount,
            paidAmount: paidAmount,
            payments: relevantIncomes,
        };
    });

    setFinancialData(processedData);

}, [user, dues, incomes]);

  const handleOpenModal = (month: string, payments: Income[]) => {
      if (payments.length === 0) return;
      setSelectedMonth(month);
      setSelectedPayments(payments);
      setIsModalOpen(true);
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
  };

  const totalDues = financialData.reduce((sum, d) => sum + d.dueAmount, 0);
  const totalPaid = financialData.reduce((sum, d) => sum + d.paidAmount, 0);
  const remainingBalance = totalDues - totalPaid;

  const handlePrint = () => {
    if (!user || financialData.length === 0) {
      alert("Yazdırılacak finansal veri bulunmamaktadır.");
      return;
    }

    const reportTitle = `${user.name} - Finansal Geçmiş Raporu`;
    
    let htmlContent = `
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 20px; color: #333; }
            h1, h2 { text-align: center; color: #1e3a8a; }
            p.report-date { text-align: center; font-size: 12px; color: #555; }
            .summary { display: flex; justify-content: space-around; margin: 20px 0; padding: 10px; background-color: #f3f4f6; border-radius: 8px; }
            .summary-item { text-align: center; }
            .summary-item h3 { margin: 0; font-size: 14px; color: #4b5563; }
            .summary-item p { font-size: 20px; font-weight: bold; margin: 5px 0 0 0; }
            .total-due { color: #4b5563; }
            .total-paid { color: #166534; }
            .balance { color: ${remainingBalance > 0 ? '#b91c1c' : '#1e3a8a'}; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 14px; }
            th { background-color: #eef2ff; color: #1e3a8a; }
            tr:nth-child(even) { background-color: #f9fafb; }
          </style>
        </head>
        <body>
          <h1>${reportTitle}</h1>
          <p class="report-date">Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}</p>
          
          <h2>Finansal Özet</h2>
          <div class="summary">
            <div class="summary-item">
              <h3>Toplam Borç</h3>
              <p class="total-due">₺${totalDues.toFixed(2)}</p>
            </div>
            <div class="summary-item">
              <h3>Toplam Ödenen</h3>
              <p class="total-paid">₺${totalPaid.toFixed(2)}</p>
            </div>
            <div class="summary-item">
              <h3>Kalan Bakiye</h3>
              <p class="balance">₺${remainingBalance.toFixed(2)}</p>
            </div>
          </div>

          <h2>Aidat Dökümü</h2>
          <table>
            <thead>
              <tr>
                <th>Ay</th>
                <th>Aidat Tutarı</th>
                <th>Ödenen Tutar</th>
              </tr>
            </thead>
            <tbody>
    `;

    financialData.forEach(item => {
      htmlContent += `
        <tr>
          <td>${item.month}</td>
          <td>₺${item.dueAmount.toFixed(2)}</td>
          <td>₺${item.paidAmount.toFixed(2)}</td>
        </tr>
      `;
    });

    htmlContent += `
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    }
  };


  const renderContent = () => {
      if(isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;
      if(error) return <p className="text-red-500 text-center">{error}</p>;
      if(financialData.length === 0) return <p className="text-center text-slate-500 py-4">Finansal geçmişiniz bulunmamaktadır.</p>;

      return (
          <>
            <div className="space-y-4 md:hidden">
                {financialData.map((item) => {
                    const isFullyPaid = item.paidAmount >= item.dueAmount;
                    return (
                    <div key={item.id} className={`bg-slate-50 p-4 rounded-lg shadow space-y-2 border-l-4 ${isFullyPaid ? 'border-green-400' : 'border-red-400'}`}>
                        <p className="font-bold text-slate-800">{item.month} Ayı</p>
                        <p className="text-lg font-semibold text-slate-700">Aidat: ₺{item.dueAmount.toFixed(2)}</p>
                        <p className={`text-lg font-semibold ${isFullyPaid ? 'text-green-700' : 'text-slate-700'}`}>
                          Ödenen: {item.paidAmount > 0 ? (
                            <button onClick={() => handleOpenModal(item.month, item.payments)} className="underline hover:text-orange-600 focus:outline-none">
                                ₺{item.paidAmount.toFixed(2)}
                            </button>
                          ) : '-'}
                        </p>
                    </div>
                    )
                })}
            </div>

            <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                    <tr>
                    <th scope="col" className="px-6 py-3">Ay</th>
                    <th scope="col" className="px-6 py-3">Aidat</th>
                    <th scope="col" className="px-6 py-3">Ödenen</th>
                    </tr>
                </thead>
                <tbody>
                    {financialData.map((item) => {
                        const isFullyPaid = item.paidAmount >= item.dueAmount;
                        return (
                            <tr key={item.id} className="bg-white border-b hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{item.month}</td>
                                <td className="px-6 py-4">₺{item.dueAmount.toFixed(2)}</td>
                                <td className={`px-6 py-4 font-semibold ${isFullyPaid ? 'text-green-700' : 'text-slate-900'}`}>
                                    {item.paidAmount > 0 ? (
                                        <button onClick={() => handleOpenModal(item.month, item.payments)} className="underline hover:text-orange-600 focus:outline-none">
                                            ₺{item.paidAmount.toFixed(2)}
                                        </button>
                                    ) : '-'}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
                </table>
            </div>
          </>
      );
  }

  return (
    <Card title="Finansal Geçmişiniz" actions={<Button size="sm" onClick={handlePrint}>Yazdır</Button>}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-slate-50 rounded-lg border-l-4 border-slate-400">
                <h4 className="text-sm font-medium text-slate-800">Toplam Borç</h4>
                <p className="text-2xl font-bold text-slate-900">₺{totalDues.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                <h4 className="text-sm font-medium text-green-800">Toplam Ödenen</h4>
                <p className="text-2xl font-bold text-green-900">₺{totalPaid.toFixed(2)}</p>
            </div>
            <div className={`p-4 rounded-lg border-l-4 ${remainingBalance > 0 ? 'bg-red-50 border-red-400' : 'bg-blue-50 border-blue-400'}`}>
                 <h4 className={`text-sm font-medium ${remainingBalance > 0 ? 'text-red-800' : 'text-blue-800'}`}>Kalan Bakiye</h4>
                 <p className={`text-2xl font-bold ${remainingBalance > 0 ? 'text-red-900' : 'text-blue-900'}`}>₺{remainingBalance.toFixed(2)}</p>
            </div>
        </div>
        {renderContent()}

        <Modal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            title={`${selectedMonth} Ayı Ödeme Detayları`}
        >
            <div className="overflow-x-auto">
                {selectedPayments.length > 0 ? (
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                            <tr>
                                <th scope="col" className="px-4 py-2">Tarih</th>
                                <th scope="col" className="px-4 py-2">Açıklama</th>
                                <th scope="col" className="px-4 py-2 text-right">Tutar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedPayments.map(payment => (
                                <tr key={payment.id} className="bg-white border-b hover:bg-slate-50">
                                    <td className="px-4 py-2 whitespace-nowrap">{new Date(payment.date).toLocaleDateString('tr-TR')}</td>
                                    <td className="px-4 py-2">{payment.description}</td>
                                    <td className="px-4 py-2 text-right font-medium">₺{payment.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-center text-slate-500 py-4">Bu ay için ödeme detayı bulunamadı.</p>
                )}
            </div>
        </Modal>
    </Card>
  );
};

export default MemberFinancials;
