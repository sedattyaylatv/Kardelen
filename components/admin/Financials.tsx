
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Due, Income, Expense, PaymentSummary, Role } from '../../types';
import Card from '../common/Card';
import Button from '../common/Button';
import { supabase, formatSupabaseError } from '../../services/supabaseClient';
import Spinner from '../common/Spinner';

// Make XLSX available from the window object after including it in index.html
declare const XLSX: any;

const Financials: React.FC = () => {
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [dues, setDues] = useState<Due[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [paymentSummaries, setPaymentSummaries] = useState<PaymentSummary[]>([]);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Inline Form States
  const [activeTab, setActiveTab] = useState<'income' | 'expenses' | 'dues'>('income');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newIncome, setNewIncome] = useState({ date: '', description: '', amount: 0, receipt_no: '' });
  const [newExpense, setNewExpense] = useState({ date: '', description: '', transaction_amount: 0, fee: 0, receipt_no: '' });
  const [newDue, setNewDue] = useState<{ user_id: number | '', month: string, amount: number }>({ user_id: '', month: '', amount: 0 });

  // Excel Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Data Fetching
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [usersRes, duesRes, incomeRes, expenseRes] = await Promise.all([
        supabase.from('user').select('*').neq('role', Role.Admin), // Yöneticileri hariç tut
        supabase.from('dues').select('*'),
        supabase.from('income').select('*'),
        supabase.from('expenses').select('*'),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (duesRes.error) throw duesRes.error;
      if (incomeRes.error) throw incomeRes.error;
      if (expenseRes.error) throw expenseRes.error;
      
      setUsers(usersRes.data || []);
      setDues(duesRes.data || []);
      setIncomes(incomeRes.data || []);
      setExpenses(expenseRes.data || []);

    } catch (err: any) {
      console.error('Error fetching financial data:', err);
      setError(formatSupabaseError(err, 'Finansal veriler'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculation Effect
  useEffect(() => {
    if (users.length > 0) {
      const summaries = users.map(user => {
        const userTrName = user.name.trim().toLocaleLowerCase('tr-TR');
        
        const totalDue = dues
          .filter(d => d.user_id === user.id)
          .reduce((sum, d) => sum + d.amount, 0);

        const totalPaid = incomes
          .filter(i => {
              const descTrName = i.description.trim().toLocaleLowerCase('tr-TR');
              return descTrName.includes(userTrName);
          })
          .reduce((sum, i) => sum + i.amount, 0);
          
        const remainingBalance = totalDue - totalPaid;

        return {
          userId: user.id,
          name: user.name,
          apartment: user.apartment,
          totalDue,
          totalPaid,
          remainingBalance
        };
      });

      // Sort summaries by apartment number using natural sort.
      summaries.sort((a, b) => a.apartment.localeCompare(b.apartment, 'tr', { numeric: true, sensitivity: 'base' }));
      
      setPaymentSummaries(summaries);
    }
  }, [users, dues, incomes]);


  // Handlers
  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncome.date || !newIncome.description || newIncome.amount <= 0) {
        alert("Lütfen tüm zorunlu alanları doldurun ve tutarın 0'dan büyük olduğundan emin olun.");
        return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.from('income').insert([newIncome]);
    if (error) {
        alert(formatSupabaseError(error, 'Gelir ekleme'));
    } else {
        setNewIncome({ date: '', description: '', amount: 0, receipt_no: '' });
        await fetchData();
    }
    setIsSubmitting(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.date || !newExpense.description || newExpense.transaction_amount <= 0) {
        alert("Lütfen tüm zorunlu alanları doldurun ve işlem tutarının 0'dan büyük olduğundan emin olun.");
        return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.from('expenses').insert([newExpense]);
    if (error) {
        alert(formatSupabaseError(error, 'Gider ekleme'));
    } else {
        setNewExpense({ date: '', description: '', transaction_amount: 0, fee: 0, receipt_no: '' });
        await fetchData();
    }
    setIsSubmitting(false);
  };

  const handleAddDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDue.user_id || !newDue.month || newDue.amount <= 0) {
        alert("Lütfen kullanıcı seçin, dönemi belirtin ve tutarın 0'dan büyük olduğundan emin olun.");
        return;
    }
    setIsSubmitting(true);
    const dueData = { ...newDue, status: 'Ödenmedi' as const };
    const { error } = await supabase.from('dues').insert([dueData]);
    if (error) {
        alert(formatSupabaseError(error, 'Aidat ekleme'));
    } else {
        setNewDue({ user_id: '', month: '', amount: 0 });
        await fetchData();
    }
    setIsSubmitting(false);
  };

  // Excel Upload Handlers
  const handleExcelUploadClick = () => excelInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        setUploadError('');
        setUploadSuccess('');
      }
  };

  const cancelFileUpload = () => {
    setSelectedFile(null);
    if(excelInputRef.current) excelInputRef.current.value = "";
  };
  
  const parseDate = (dateInput: any): string | null => {
    if (!dateInput) return null;
    let date;
    if (typeof dateInput === 'number') {
        date = new Date(Math.round((dateInput - 25569) * 86400 * 1000));
    } else {
        const parts = String(dateInput).match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
        if (parts) {
            date = new Date(`${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}T00:00:00Z`);
        } else {
            date = new Date(dateInput);
        }
    }
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  };

  const handleSaveExcelFile = async () => {
    if (!selectedFile) return;
  
    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');
  
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: null });
  
        if (json.length === 0) throw new Error("Excel dosyası boş veya okunamadı.");
  
        let allRecords: any[] = [];
        let skippedRows: number[] = [];
        let notFoundUsers = new Set<string>();
        let tableName = '';
  
        const normalizeHeader = (header: string) => header.trim().toLocaleLowerCase('tr-TR');
  
        // Normalize headers from the first row of the Excel sheet
        const firstRow = json[0] as object;
        const headerMap = new Map<string, string>();
        for (const key in firstRow) {
          headerMap.set(normalizeHeader(key), key);
        }
  
        const getColumnValue = (row: any, keys: string[]) => {
          for (const key of keys) {
            const mappedKey = headerMap.get(normalizeHeader(key));
            if (mappedKey && row[mappedKey] != null) return row[mappedKey];
          }
          return null;
        };
  
        if (activeTab === 'dues') {
          tableName = 'dues';
          const usersMap = new Map(users.map(u => [u.name.trim().toLocaleLowerCase('tr-TR'), u.id]));
  
          json.forEach((row: any, index: number) => {
            const excelUserName = String(getColumnValue(row, ['kullanıcı adı', 'kullanici adi', 'isim', 'ad soyad']) || '').trim();
            const userNameLower = excelUserName.toLocaleLowerCase('tr-TR');
            const userId = usersMap.get(userNameLower);
            const amount = parseFloat(getColumnValue(row, ['tutar', 'miktar']));
            const periodValue = getColumnValue(row, ['ay', 'yıl', 'dönem', 'yil', 'donem']);
  
            if (userId && periodValue && !isNaN(amount) && amount > 0) {
              allRecords.push({ user_id: userId, month: String(periodValue), amount, status: 'Ödenmedi' });
            } else {
              if (excelUserName && !userId) notFoundUsers.add(excelUserName);
              skippedRows.push(index + 2);
            }
          });
        } else if (activeTab === 'income') {
          tableName = 'income';
          json.forEach((row: any, index: number) => {
            const parsedDate = parseDate(getColumnValue(row, ['tarih']));
            const amount = parseFloat(getColumnValue(row, ['toplam gelir', 'gelir', 'tutar']));
            const description = getColumnValue(row, ['açıklama', 'aciklama']);
  
            if (parsedDate && description && !isNaN(amount) && amount > 0) {
              allRecords.push({ date: parsedDate, description: String(description), amount: amount, receipt_no: getColumnValue(row, ['fiş no', 'fis no']) || null });
            } else {
              skippedRows.push(index + 2);
            }
          });
        } else { // expenses
          tableName = 'expenses';
          json.forEach((row: any, index: number) => {
            const parsedDate = parseDate(getColumnValue(row, ['tarih']));
            const transactionAmount = parseFloat(getColumnValue(row, ['işlem tutarı', 'islem tutari']));
            const description = getColumnValue(row, ['açıklama', 'aciklama']);
  
            if (parsedDate && description && !isNaN(transactionAmount) && transactionAmount > 0) {
              allRecords.push({ date: parsedDate, description: String(description), transaction_amount: transactionAmount, fee: parseFloat(getColumnValue(row, ['havale/eft masrafı', 'masraf']) || 0), receipt_no: getColumnValue(row, ['fiş no', 'fis no']) || null });
            } else {
              skippedRows.push(index + 2);
            }
          });
        }
  
        if (notFoundUsers.size > 0) {
          throw new Error(`Excel'deki şu kullanıcılar sistemde bulunamadı: ${[...notFoundUsers].join(', ')}`);
        }
  
        if (allRecords.length > 0) {
          const { error } = await supabase.from(tableName).insert(allRecords);
          if (error) throw error;
        }
  
        let successMessage = `${allRecords.length} kayıt başarıyla eklendi.`;
        if (skippedRows.length > 0) {
          successMessage += ` ${skippedRows.length} satır geçersiz veri nedeniyle atlandı: Satır ${skippedRows.slice(0, 5).join(', ')}${skippedRows.length > 5 ? '...' : ''}.`;
        }
        setUploadSuccess(successMessage);
        await fetchData();
        cancelFileUpload();
  
      } catch (error: any) {
        console.error("Excel upload error:", error);
        setUploadError(formatSupabaseError(error, 'Excel yükleme'));
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = (error) => {
      console.error("File reader error:", error);
      setUploadError("Dosya okunurken bir hata oluştu.");
      setIsUploading(false);
    };
    reader.readAsBinaryString(selectedFile);
  };
  

 const handlePrint = () => {
    const isDues = activeTab === 'dues';
    const rawDataToPrint = isDues ? dues : (activeTab === 'income' ? incomes : expenses);
    
    const dataToPrint = [...rawDataToPrint].sort((a: any, b: any) => 
        new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime()
    );

    if (dataToPrint.length === 0) {
        alert("Yazdırılacak veri bulunmamaktadır.");
        return;
    }
    
    const reportTitle = isDues ? 'Aidat Raporu' : (activeTab === 'income' ? 'Gelir Raporu' : 'Gider Raporu');
    const headers = isDues 
        ? ['Kullanıcı Adı', 'Dönem', 'Tutar', 'Durum']
        : (activeTab === 'income'
            ? ['Tarih', 'Fiş No', 'Açıklama', 'Toplam Gelir']
            : ['Tarih', 'Fiş No', 'Açıklama', 'İşlem Tutarı', 'Masraf', 'Toplam Gider']);

    let htmlContent = `<html><head><title>${reportTitle}</title><style>body{font-family:sans-serif;margin:20px}h1{text-align:center}p{text-align:center;color:#555;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:14px}th{background-color:#f2f2f2}@media print{body{margin:10px}.no-print{display:none}}</style></head><body><h1>${reportTitle}</h1><p>Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}</p><table><thead><tr><th>#</th>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`;

    const userMap = new Map(users.map(u => [u.id, u.name]));

    dataToPrint.forEach((item: any, index) => {
        htmlContent += `<tr><td>${index + 1}</td>`;
        if (isDues) {
            htmlContent += `<td>${userMap.get(item.user_id) || 'Bilinmiyor'}</td><td>${item.month}</td><td>₺${item.amount.toFixed(2)}</td><td>${item.status}</td>`;
        } else {
            htmlContent += `<td>${new Date(item.date).toLocaleDateString('tr-TR')}</td><td>${item.receipt_no || '-'}</td><td>${item.description}</td>`;
            if ('amount' in item) { // Income
                htmlContent += `<td>₺${item.amount.toFixed(2)}</td>`;
            } else { // Expense
                htmlContent += `<td>₺${item.transaction_amount.toFixed(2)}</td><td>₺${item.fee.toFixed(2)}</td><td>₺${item.total_amount.toFixed(2)}</td>`;
            }
        }
        htmlContent += '</tr>';
    });

    htmlContent += `</tbody></table></body></html>`;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.onafterprint = () => printWindow.close();
    }
};
  
  // Budget Summary
  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  const totalExpense = expenses.reduce((sum, expense) => sum + expense.total_amount, 0);
  const balance = totalIncome - totalExpense;

  // Render Functions
  const renderPaymentSummaries = () => {
    if(isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;
    if(error) return <p className="text-red-500 text-center">{error}</p>;
    return (
        <>
          <div className="space-y-4 md:hidden">
              {paymentSummaries.map((summary) => (
                  <div key={summary.userId} className="bg-slate-50 p-4 rounded-lg shadow space-y-3">
                      <p className="font-bold text-slate-800">{summary.name} <span className="font-normal text-slate-500">({summary.apartment})</span></p>
                      <p><span className="font-semibold">Toplam Borç:</span> ₺{summary.totalDue.toFixed(2)}</p>
                      <p><span className="font-semibold">Toplam Ödenen:</span> ₺{summary.totalPaid.toFixed(2)}</p>
                      <div className={`p-2 rounded text-center font-bold ${summary.remainingBalance <= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          Kalan Bakiye: ₺{summary.remainingBalance.toFixed(2)}
                      </div>
                  </div>
              ))}
          </div>
          <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-sm text-left text-slate-500">
              <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                  <tr>
                    <th scope="col" className="px-6 py-3">Daire</th>
                    <th scope="col" className="px-6 py-3">Ad Soyad</th>
                    <th scope="col" className="px-6 py-3">Toplam Borç</th>
                    <th scope="col" className="px-6 py-3">Toplam Ödenen</th>
                    <th scope="col" className="px-6 py-3">Kalan Bakiye</th>
                  </tr>
              </thead>
              <tbody>
                  {paymentSummaries.map((summary) => (
                  <tr key={summary.userId} className="bg-white border-b hover:bg-slate-50">
                      <td className="px-6 py-4">{summary.apartment}</td>
                      <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{summary.name}</td>
                      <td className="px-6 py-4">₺{summary.totalDue.toFixed(2)}</td>
                      <td className="px-6 py-4">₺{summary.totalPaid.toFixed(2)}</td>
                      <td className={`px-6 py-4 font-semibold ${summary.remainingBalance <= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        ₺{summary.remainingBalance.toFixed(2)}
                      </td>
                  </tr>
                  ))}
              </tbody>
              </table>
          </div>
        </>
    );
  }

  const renderFinancialsContent = () => {
    if(isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;
    if(error) return <p className="text-red-500 text-center">{error.trim()}</p>;
    
    const userMap = new Map(users.map(u => [u.id, u.name]));
    const rawData = activeTab === 'income' ? incomes : activeTab === 'expenses' ? expenses : dues;
    const data = [...rawData].sort((a: any, b: any) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime());

    const tableHeaders = activeTab === 'income' 
        ? ['Tarih', 'Fiş No', 'Açıklama', 'Toplam Gelir']
        : activeTab === 'expenses'
        ? ['Tarih', 'Fiş No', 'Açıklama', 'İşlem Tutarı', 'Masraf', 'Toplam Gider']
        : ['Kullanıcı Adı', 'Dönem', 'Tutar', 'Durum'];

    return (
        <>
            <div className="space-y-4 md:hidden">
            {data.map((item: any) => (
                <div key={item.id} className="bg-slate-50 p-4 rounded-lg shadow space-y-2">
                   {activeTab === 'dues' ? (
                        <>
                           <p><span className="font-semibold">Kullanıcı:</span> {userMap.get(item.user_id) || 'Bilinmiyor'}</p>
                           <p><span className="font-semibold">Dönem:</span> {item.month}</p>
                           <p><span className="font-semibold">Tutar:</span> ₺{item.amount.toFixed(2)}</p>
                           <p><span className="font-semibold">Durum:</span> {item.status}</p>
                        </>
                    ) : (
                        <>
                            <p><span className="font-semibold">Tarih:</span> {new Date(item.date).toLocaleDateString()}</p>
                            <p><span className="font-semibold">Açıklama:</span> {item.description}</p>
                            {'amount' in item ? (
                               <p><span className="font-semibold">Tutar:</span> ₺{item.amount.toFixed(2)}</p>
                            ) : (
                               <>
                                <p><span className="font-semibold">İşlem Tutarı:</span> ₺{item.transaction_amount.toFixed(2)}</p>
                                <p><span className="font-semibold">Masraf:</span> ₺{item.fee.toFixed(2)}</p>
                                <p><span className="font-semibold">Toplam Gider:</span> ₺{item.total_amount.toFixed(2)}</p>
                               </>
                            )}
                        </>
                    )}
                </div>
            ))}
            </div>
            <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                    <tr>
                    <th scope="col" className="px-6 py-3">#</th>
                    {tableHeaders.map(header => <th key={header} scope="col" className="px-6 py-3">{header}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {data.map((item: any, index) => (
                    <tr key={item.id} className="bg-white border-b hover:bg-slate-50">
                        <td className="px-6 py-4">{index + 1}</td>
                        {activeTab === 'dues' ? (
                            <>
                                <td className="px-6 py-4">{userMap.get(item.user_id) || 'Bilinmiyor'}</td>
                                <td className="px-6 py-4">{item.month}</td>
                                <td className="px-6 py-4">₺{item.amount.toFixed(2)}</td>
                                <td className="px-6 py-4">{item.status}</td>
                            </>
                        ) : (
                            <>
                                <td className="px-6 py-4">{new Date(item.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4">{item.receipt_no || '-'}</td>
                                <td className="px-6 py-4">{item.description}</td>
                                {'amount' in item ? (
                                    <td className="px-6 py-4 font-semibold text-green-700">₺{item.amount.toFixed(2)}</td>
                                ) : (
                                    <>
                                        <td className="px-6 py-4">₺{item.transaction_amount.toFixed(2)}</td>
                                        <td className="px-6 py-4">₺{item.fee.toFixed(2)}</td>
                                        <td className="px-6 py-4 font-semibold text-red-700">₺{item.total_amount.toFixed(2)}</td>
                                    </>
                                )}
                            </>
                        )}
                    </tr>
                    ))}
                </tbody>
            </table>
            </div>
        </>
    );
  };
  
  const getTabClass = (tabName: 'income' | 'expenses' | 'dues') => `px-4 py-2 font-semibold transition-colors duration-200 border-b-2 ${activeTab === tabName ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-orange-600'}`;

  const renderInlineForm = () => {
    if (activeTab === 'dues') {
        return (
            <form onSubmit={handleAddDue} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
                    <select value={newDue.user_id} onChange={e => setNewDue({ ...newDue, user_id: parseInt(e.target.value) || '' })} className="mt-1 block w-full input">
                        <option value="">Kullanıcı Seçin</option>
                        {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Dönem</label>
                    <input type="text" placeholder="Örn: 2024 Temmuz" value={newDue.month} onChange={e => setNewDue({ ...newDue, month: e.target.value })} className="mt-1 block w-full input" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Toplam Tutar</label>
                    <input type="number" value={newDue.amount} onChange={e => setNewDue({ ...newDue, amount: parseFloat(e.target.value) || 0 })} className="mt-1 block w-full input" />
                </div>
                <Button type="submit" fullWidth disabled={isSubmitting}>{isSubmitting ? <Spinner size="sm" /> : 'Aidat Ekle'}</Button>
            </form>
        );
    }
    if (activeTab === 'income') {
        return (
            <form onSubmit={handleAddIncome} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tarih</label>
                    <input type="date" value={newIncome.date} onChange={e => setNewIncome({...newIncome, date: e.target.value})} className="mt-1 block w-full input"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Fiş No</label>
                    <input type="text" value={newIncome.receipt_no} onChange={e => setNewIncome({...newIncome, receipt_no: e.target.value})} className="mt-1 block w-full input"/>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                    <input type="text" placeholder="Örn: Ahmet Yılmaz - Temmuz Aidatı" value={newIncome.description} onChange={e => setNewIncome({...newIncome, description: e.target.value})} className="mt-1 block w-full input"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Toplam Gelir</label>
                    <input type="number" value={newIncome.amount} onChange={e => setNewIncome({...newIncome, amount: parseFloat(e.target.value) || 0})} className="mt-1 block w-full input"/>
                </div>
                <Button type="submit" fullWidth disabled={isSubmitting}>{isSubmitting ? <Spinner size="sm"/> : 'Gelir Ekle'}</Button>
            </form>
        );
    }
    if (activeTab === 'expenses') {
        const totalExpenseAmount = (newExpense.transaction_amount || 0) + (newExpense.fee || 0);
        return (
             <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-8 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tarih</label>
                    <input type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="mt-1 block w-full input"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Fiş No</label>
                    <input type="text" value={newExpense.receipt_no} onChange={e => setNewExpense({...newExpense, receipt_no: e.target.value})} className="mt-1 block w-full input"/>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                    <input type="text" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="mt-1 block w-full input"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">İşlem Tutarı</label>
                    <input type="number" step="0.01" value={newExpense.transaction_amount} onChange={e => setNewExpense({...newExpense, transaction_amount: parseFloat(e.target.value) || 0})} className="mt-1 block w-full input"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Masraf</label>
                    <input type="number" step="0.01" value={newExpense.fee} onChange={e => setNewExpense({...newExpense, fee: parseFloat(e.target.value) || 0})} className="mt-1 block w-full input"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Toplam Gider</label>
                    <input type="text" value={`₺${totalExpenseAmount.toFixed(2)}`} readOnly className="mt-1 block w-full input bg-slate-100 text-slate-600 font-semibold"/>
                </div>
                <Button type="submit" fullWidth disabled={isSubmitting}>{isSubmitting ? <Spinner size="sm"/> : 'Gider Ekle'}</Button>
            </form>
        );
    }
    return null;
  }

  return (
    <div className="space-y-6">
        <Card title="Apartman Bütçesi">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <h4 className="text-sm font-medium text-green-800">Toplam Gelir</h4>
                    <p className="text-2xl font-bold text-green-900">₺{totalIncome.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-400">
                    <h4 className="text-sm font-medium text-red-800">Toplam Gider</h4>
                    <p className="text-2xl font-bold text-red-900">₺{totalExpense.toFixed(2)}</p>
                </div>
                <div className={`p-4 rounded-lg border-l-4 ${balance >= 0 ? 'bg-blue-50 border-blue-400' : 'bg-orange-50 border-orange-400'}`}>
                    <h4 className={`text-sm font-medium ${balance >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>Son Durum</h4>
                    <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>₺{balance.toFixed(2)}</p>
                </div>
            </div>
        </Card>
        
        <Card title="Üye Bakiye Durumları">
            {renderPaymentSummaries()}
        </Card>

        <Card title="Gelir, Gider ve Aidat Yönetimi">
            <div className="flex justify-between items-center border-b border-slate-200 mb-4 flex-wrap gap-2">
                <div className="flex">
                    <button className={getTabClass('income')} onClick={() => setActiveTab('income')}>Gelirler</button>
                    <button className={getTabClass('expenses')} onClick={() => setActiveTab('expenses')}>Giderler</button>
                    <button className={getTabClass('dues')} onClick={() => setActiveTab('dues')}>Aidatlar</button>
                </div>
                <div className="flex space-x-2 items-center">
                    <input type="file" ref={excelInputRef} onChange={handleFileChange} accept=".xlsx, .xls" className="hidden"/>
                    {!selectedFile && <Button variant="outline" size="sm" onClick={handleExcelUploadClick} disabled={isUploading}>Excel'den Yükle</Button>}
                    <Button variant="outline" size="sm" onClick={handlePrint} disabled={isUploading || isLoading}>Yazdır</Button>
                </div>
            </div>

            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                {renderInlineForm()}
            </div>

            {selectedFile && (
                <div className="bg-orange-50 p-3 rounded-lg mb-4 flex items-center justify-between">
                    <p className="text-sm text-orange-800 truncate">Seçilen dosya: <span className="font-semibold">{selectedFile.name}</span></p>
                    <div className="flex space-x-2">
                         <Button size="sm" onClick={handleSaveExcelFile} disabled={isUploading}>
                            {isUploading ? <Spinner size="sm" /> : 'Kaydet'}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={cancelFileUpload} disabled={isUploading}>İptal</Button>
                    </div>
                </div>
            )}
            {uploadError && <p className="text-sm text-red-600 mb-2">{uploadError}</p>}
            {uploadSuccess && <p className="text-sm text-green-600 mb-2">{uploadSuccess}</p>}
            {renderFinancialsContent()}
        </Card>
        
        <style>{`.input { padding: 0.5rem 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); } .input:focus { outline: none; border-color: #F97316; box-shadow: 0 0 0 1px #F97316; }`}</style>
    </div>
  );
};

export default Financials;
