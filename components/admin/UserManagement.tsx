
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Role } from '../../types';
import Card from '../common/Card';
import Button from '../common/Button';
import { supabase, formatSupabaseError } from '../../services/supabaseClient';
import Spinner from '../common/Spinner';
import Modal from '../common/Modal';

// Make XLSX available from the window object
declare const XLSX: any;

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState<React.ReactNode | null>(null);
  
  // Single User Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', apartment: '', email: '', role: Role.Member, sifre: '' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion States
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const confirmDeleteTimeoutRef = useRef<number | null>(null);

  // Excel Upload States
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploadingStatus, setUploadingStatus] = useState({
    isLoading: false,
    message: '',
    successCount: 0,
    errorCount: 0,
    errors: [] as string[],
  });
  const fileInputRef = useRef<HTMLInputElement>(null);


  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setDeleteError(null);
    const { data, error } = await supabase
      .from('user')
      .select('*')
      .neq('role', Role.Admin);
    if (error) {
      console.error("Error fetching users:", error);
      setError(formatSupabaseError(error, 'Kullanıcılar'));
    } else {
      setUsers(data || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    return () => {
      if (confirmDeleteTimeoutRef.current) {
        clearTimeout(confirmDeleteTimeoutRef.current);
      }
    };
  }, []);

  const proceedWithDeletion = async (userId: number) => {
    setDeleteError(null);
    setDeletingUserId(userId);
    try {
      const { error: messagesError } = await supabase.from('messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      if (messagesError) throw new Error(`Mesajlar silinirken hata oluştu. Veritabanı güvenlik (RLS) kurallarınızı kontrol edin. Detay: ${messagesError.message}`);

      const { error: duesError } = await supabase.from('dues').delete().eq('user_id', userId);
      if (duesError) throw new Error(`Aidatlar silinirken hata oluştu. Veritabanı güvenlik (RLS) kurallarınızı kontrol edin. Detay: ${duesError.message}`);
      
      const { error: userError } = await supabase.from('user').delete().eq('id', userId);
      if (userError) throw new Error(`Kullanıcı silinirken hata oluştu. Veritabanı güvenlik (RLS) kurallarınızı kontrol edin. Detay: ${userError.message}`);
      
      setUsers(users.filter(user => user.id !== userId));
    } catch (error: any) {
      setDeleteError(error.message || 'Kullanıcı silinirken bilinmeyen bir hata oluştu.');
      console.error('Error during user deletion process:', error);
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleDeleteClick = (userId: number) => {
    if (confirmDeleteTimeoutRef.current) {
      clearTimeout(confirmDeleteTimeoutRef.current);
    }
    if (confirmingDeleteId === userId) {
      setConfirmingDeleteId(null);
      proceedWithDeletion(userId);
    } else {
      setConfirmingDeleteId(userId);
      confirmDeleteTimeoutRef.current = window.setTimeout(() => {
        setConfirmingDeleteId(null);
      }, 3000);
    }
  };
  
  const handleSaveUser = async () => {
    if(!formData.name || !formData.apartment || !formData.email) {
        alert("Lütfen Ad Soyad, Daire ve E-posta alanlarını doldurun.");
        return;
    }
    setIsSubmitting(true);
    
    if (editingUser) {
        // --- UPDATE USER LOGIC ---
        const { error } = await supabase
            .from('user')
            .update({
                name: formData.name,
                apartment: formData.apartment,
                email: formData.email,
                role: formData.role,
            })
            .eq('id', editingUser.id);
        
        if (formData.sifre.trim()) {
            alert("Profil bilgileri güncellendi. Not: Şifre değiştirme bu ekrandan yapılamamaktadır. Güvenlik nedeniyle, kullanıcı şifresini 'şifremi unuttum' bağlantısıyla kendisi sıfırlamalıdır.");
        }

        if (error) {
            alert(formatSupabaseError(error, `Kullanıcı güncelleme`));
            console.error(`Error updating user:`, error);
        } else {
            closeModal();
            await fetchUsers();
        }

    } else {
        // --- ADD NEW USER LOGIC ---
        if (!formData.sifre) {
            alert("Yeni kullanıcılar için şifre girmek zorunludur.");
            setIsSubmitting(false);
            return;
        }

        // Step 1: Create the user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.sifre,
        });

        if (authError) {
            alert(formatSupabaseError(authError, 'Kimlik oluşturma'));
            console.error('Auth signup error:', authError);
            setIsSubmitting(false);
            return;
        }

        // Step 2: If auth user is created, insert the profile into the 'user' table
        if (authData.user) {
            const { error: profileError } = await supabase
                .from('user')
                .insert({
                    name: formData.name,
                    apartment: formData.apartment,
                    email: formData.email,
                    role: formData.role,
                });
            
            if (profileError) {
                // Critical state: Auth user exists, but profile doesn't.
                alert(`Kullanıcı kimliği oluşturuldu ancak profil kaydedilemedi. Lütfen yöneticiyle iletişime geçin. Hata: ${formatSupabaseError(profileError, 'Profil oluşturma')}`);
                console.error('Error creating profile for new auth user:', profileError);
            } else {
                closeModal();
                await fetchUsers();
            }
        } else {
             alert('Kimlik oluşturuldu ancak kullanıcı verisi alınamadı. Lütfen tekrar deneyin.');
        }
    }
    setIsSubmitting(false);
  }
  
  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ name: '', apartment: '', email: '', role: Role.Member, sifre: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({ name: user.name, apartment: user.apartment, email: user.email, role: user.role, sifre: '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ name: '', apartment: '', email: '', role: Role.Member, sifre: '' });
  };

  const closeExcelModal = () => {
    setIsExcelModalOpen(false);
    setExcelFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadingStatus({
        isLoading: false,
        message: '',
        successCount: 0,
        errorCount: 0,
        errors: [],
    });
  };

  const handleExcelImport = async () => {
    if (!excelFile) {
        setUploadingStatus(prev => ({ ...prev, message: 'Lütfen bir dosya seçin.' }));
        return;
    }

    setUploadingStatus({
        isLoading: true,
        message: 'Kullanıcılar işleniyor, lütfen bekleyin...',
        successCount: 0,
        errorCount: 0,
        errors: [],
    });

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = event.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const usersData: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (usersData.length === 0) {
                throw new Error('Excel dosyası boş veya okunamadı.');
            }

            let localSuccess = 0;
            let localErrors: string[] = [];

            for (const [index, row] of usersData.entries()) {
                const name = row['ad soyad'];
                const apartment = String(row['daire'] || '');
                const email = row['e-posta'];
                const password = String(row['şifre'] || '');
                let roleStr = (row['rol'] || 'Üye').trim().toLowerCase();
                const role = roleStr === 'yönetici' ? Role.Admin : Role.Member;

                if (!name || !apartment || !email || !password) {
                    localErrors.push(`Satır ${index + 2}: Eksik bilgi (ad soyad, daire, e-posta, şifre zorunludur). Bu satır atlandı.`);
                    continue;
                }

                try {
                    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

                    if (authError) {
                        throw new Error(`Satır ${index + 2} (${email}): ${formatSupabaseError(authError, 'Kimlik oluşturma')}`);
                    }

                    if (authData.user) {
                        const { error: profileError } = await supabase.from('user').insert({ name, apartment, email, role });
                        if (profileError) {
                            throw new Error(`Satır ${index + 2} (${email}): Kimlik oluşturuldu ancak profil kaydedilemedi: ${formatSupabaseError(profileError, 'Profil oluşturma')}`);
                        }
                        localSuccess++;
                    } else {
                        throw new Error(`Satır ${index + 2} (${email}): Kimlik oluşturuldu ancak kullanıcı verisi alınamadı.`);
                    }
                } catch (e: any) {
                    localErrors.push(e.message);
                }
            }

            setUploadingStatus({
                isLoading: false,
                message: 'İçe aktarma tamamlandı.',
                successCount: localSuccess,
                errorCount: localErrors.length,
                errors: localErrors,
            });

            if (localSuccess > 0) {
                await fetchUsers(); // Refresh the user list
            }

        } catch (e: any) {
            setUploadingStatus({
                isLoading: false,
                message: `Dosya okunurken bir hata oluştu: ${e.message}`,
                successCount: 0,
                errorCount: 1,
                errors: [e.message]
            });
        }
    };
    reader.readAsBinaryString(excelFile);
  };

  const renderContent = () => {
    if(isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;
    if(error) return <p className="text-red-500 text-center">{error}</p>;

    return (
    <>
        {/* Mobile View - Card List */}
        <div className="space-y-4 md:hidden">
            {users.map((user) => (
                <div key={user.id} className="bg-slate-50 p-4 rounded-lg shadow space-y-3 border-l-4 border-slate-300">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-bold text-slate-800">{user.name}</p>
                            <p className="text-sm text-slate-500">{user.apartment}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.role === Role.Admin ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                            {user.role}
                        </span>
                    </div>
                    <p className="text-sm text-slate-600 break-all">{user.email}</p>
                    <div className="flex space-x-2 pt-3 border-t border-slate-200">
                        <Button size="sm" variant="outline" onClick={() => openEditModal(user)}>Düzenle</Button>
                        <Button size="sm" variant="danger" onClick={() => handleDeleteClick(user.id)} disabled={deletingUserId === user.id}>
                            {deletingUserId === user.id ? <Spinner size="sm" /> : (confirmingDeleteId === user.id ? 'Emin misiniz?' : 'Sil')}
                        </Button>
                    </div>
                </div>
            ))}
        </div>

        {/* Desktop View - Table */}
        <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-sm text-left text-slate-500">
            <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                <tr>
                <th scope="col" className="px-6 py-3">Ad Soyad</th>
                <th scope="col" className="px-6 py-3">Daire</th>
                <th scope="col" className="px-6 py-3">Rol</th>
                <th scope="col" className="px-6 py-3">E-posta</th>
                <th scope="col" className="px-6 py-3">İşlemler</th>
                </tr>
            </thead>
            <tbody>
                {users.map((user) => (
                <tr key={user.id} className="bg-white border-b hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{user.name}</td>
                    <td className="px-6 py-4">{user.apartment}</td>
                    <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.role === Role.Admin ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                        {user.role}
                    </span>
                    </td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4 flex space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEditModal(user)}>Düzenle</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDeleteClick(user.id)} disabled={deletingUserId === user.id}>
                        {deletingUserId === user.id ? <Spinner size="sm" /> : (confirmingDeleteId === user.id ? 'Emin misiniz?' : 'Sil')}
                    </Button>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
    </>
    );
  };

  return (
    <>
    <Card title="Kullanıcı Yönetimi" actions={
        <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => setIsExcelModalOpen(true)}>Excel ile Toplu Ekle</Button>
            <Button size="sm" onClick={openAddModal}>Yeni Kullanıcı Ekle</Button>
        </div>
    }>
        {deleteError && (
          <div className="p-4 mb-4 bg-red-100 border-l-4 border-red-500 text-red-800 rounded-lg text-sm" role="alert">
            <p className="font-bold">Silme Başarısız</p>
            <p>{deleteError}</p>
          </div>
        )}
        {renderContent()}
    </Card>

    <Modal isOpen={isModalOpen} onClose={closeModal} title={editingUser ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı Ekle"} footer={
        <>
            <Button variant="secondary" onClick={closeModal} disabled={isSubmitting}>İptal</Button>
            <Button onClick={handleSaveUser} disabled={isSubmitting}>
                {isSubmitting ? <Spinner size="sm" /> : 'Kaydet'}
            </Button>
        </>
    }>
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Ad Soyad</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Daire</label>
                <input type="text" value={formData.apartment} onChange={e => setFormData({...formData, apartment: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">E-posta</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Şifre</label>
                <input
                    type="password"
                    value={formData.sifre}
                    onChange={e => setFormData({...formData, sifre: e.target.value})}
                    placeholder={editingUser ? "Değiştirmek için yeni şifre girin" : "Yeni kullanıcı için zorunlu"}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Rol</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500">
                    <option value={Role.Member}>Üye</option>
                    <option value={Role.Admin}>Yönetici</option>
                </select>
            </div>
        </div>
    </Modal>

    <Modal
        isOpen={isExcelModalOpen}
        onClose={closeExcelModal}
        title="Excel ile Toplu Kullanıcı Ekle"
        footer={
            <>
                <Button variant="secondary" onClick={closeExcelModal} disabled={uploadingStatus.isLoading}>
                    Kapat
                </Button>
                <Button onClick={handleExcelImport} disabled={uploadingStatus.isLoading || !excelFile}>
                    {uploadingStatus.isLoading ? <Spinner size="sm" /> : 'İçe Aktar'}
                </Button>
            </>
        }
    >
        <div className="space-y-4">
            <div>
                <p className="text-sm text-slate-600 mb-2">
                    Lütfen aşağıdaki sütun başlıklarını içeren bir Excel dosyası hazırlayın:
                </p>
                <code className="text-sm bg-slate-100 p-2 rounded-md block">
                    ad soyad | daire | e-posta | şifre | rol
                </code>
                <p className="text-xs text-slate-500 mt-1">
                    'rol' sütunu 'Yönetici' veya 'Üye' olabilir. Boş bırakılırsa varsayılan olarak 'Üye' atanır.
                </p>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Excel Dosyası</label>
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => setExcelFile(e.target.files ? e.target.files[0] : null)}
                    accept=".xlsx, .xls"
                    className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                />
            </div>
            {uploadingStatus.message && (
                <div className={`p-3 rounded-lg text-sm ${uploadingStatus.isLoading ? 'bg-blue-50 text-blue-800' : (uploadingStatus.errorCount > 0 ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800')}`}>
                    <p className="font-semibold">{uploadingStatus.message}</p>
                    {uploadingStatus.isLoading && <div className="mt-2 w-full bg-slate-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full animate-pulse"></div></div>}
                    {!uploadingStatus.isLoading && (uploadingStatus.successCount > 0 || uploadingStatus.errorCount > 0) && (
                        <div className="text-xs mt-2">
                            <p>Başarılı: {uploadingStatus.successCount}</p>
                            <p>Hatalı: {uploadingStatus.errorCount}</p>
                        </div>
                    )}
                </div>
            )}
            {!uploadingStatus.isLoading && uploadingStatus.errors.length > 0 && (
                <div className="max-h-40 overflow-y-auto bg-slate-100 p-2 rounded-md mt-2">
                    <p className="text-sm font-semibold text-slate-700">Hata Detayları:</p>
                    <ul className="list-disc list-inside text-xs text-red-700 space-y-1 mt-1">
                        {uploadingStatus.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </div>
            )}
        </div>
    </Modal>
    </>
  );
};

export default UserManagement;
