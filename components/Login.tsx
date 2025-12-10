
import React, { useState } from 'react';
import { Role, User } from '../types';
import Button from './common/Button';
import { supabase, formatSupabaseError } from '../services/supabaseClient';
import Spinner from './common/Spinner';
import { logoUrl } from '../assets/logo';

interface LoginProps {
  onLogin: (user: User) => void;
}

type Tab = 'login' | 'register';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<Tab>('login');

  // --- Login States ---
  const [loginForm, setLoginForm] = useState({ apartment: '', sifre: ''});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Register States ---
  const [registerForm, setRegisterForm] = useState({
    name: '',
    apartment: '',
    email: '',
    sifre: '',
    role: Role.Member,
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');


  // --- Login Handlers ---
  const handleLoginInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!loginForm.apartment || !loginForm.sifre) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }
    setIsLoading(true);

    try {
      // Step 1: Find user profile by apartment number to get their email
      const { data: userProfile, error: profileError } = await supabase
        .from('user')
        .select('*')
        .eq('apartment', loginForm.apartment)
        .single();

      if (profileError || !userProfile) {
        setError('Daire Numarası veya şifre hatalı.');
        // Log the actual error for debugging but don't show it to the user
        if (profileError) console.error('Profile lookup error:', formatSupabaseError(profileError, 'Profil arama'));
        return; // Exit here, finally will run
      }

      // Step 2: Attempt to sign in with the found email and the provided password.
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: loginForm.sifre,
      });

      if (authError) {
        setError('Daire Numarası veya şifre hatalı.');
        console.error('Authentication error:', formatSupabaseError(authError, 'Kimlik doğrulama'));
        return; // Exit here, finally will run
      }

      // Step 3: If both steps succeed, the user is authenticated. Log them in.
      onLogin(userProfile);

    } catch (err) {
      // Catch any other unexpected errors during the process.
      const formattedError = formatSupabaseError(err, 'Giriş işlemi');
      setError(formattedError);
      console.error('Unexpected login exception:', formattedError, err);
    } finally {
      setIsLoading(false);
    }
  };


  // --- Register Handlers ---
  const handleRegisterInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRegisterForm(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    if (!registerForm.name || !registerForm.apartment || !registerForm.email || !registerForm.sifre) {
      setRegisterError('Lütfen tüm alanları doldurun.');
      return;
    }
    
    setIsRegistering(true);
    
    // Step 1: Register user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.sifre,
    });

    if (authError) {
      setIsRegistering(false);
      const formattedError = formatSupabaseError(authError, 'Kayıt işlemi');
      console.error('Error registering user:', formattedError, authError);
      setRegisterError(formattedError);
      return;
    }

    // Step 2: If auth is successful, insert the profile into the public 'user' table.
    // The user mentioned a 'profiles' table, but the application consistently uses a 'user' table for this purpose.
    // To maintain consistency, we will insert into the 'user' table.
    if (authData.user) {
        const { error: profileError } = await supabase
            .from('user')
            .insert({
                // Note: This assumes the `user` table has an auto-incrementing `id` and is not directly
                // linked via foreign key to the `auth.users` table's UUID. The link is via the email column.
                name: registerForm.name,
                apartment: registerForm.apartment,
                role: registerForm.role,
                email: registerForm.email,
                // We DO NOT store the password in the public users table for security reasons.
            });
        
        if (profileError) {
            setIsRegistering(false);
            // This is a critical state: the auth user exists, but their public profile does not.
            // A more robust application might try to clean up the created auth user here.
            // For now, we will inform the user to contact support.
            const formattedError = formatSupabaseError(profileError, 'Profil oluşturma');
            console.error('Error creating user profile:', formattedError, profileError);
            setRegisterError(`Kullanıcı kimliği oluşturuldu ancak profil kaydedilemedi. Lütfen yöneticiyle iletişime geçin. Hata: ${formattedError}`);
            return;
        }

        // Handle success/confirmation email logic from the original code
        if (authData.user.identities && authData.user.identities.length === 0) {
             setRegisterError('Bu e-posta adresiyle bir kullanıcı zaten mevcut ancak doğrulanmamış. Lütfen doğrulama e-postasını gelen kutunuzda kontrol edin.');
        } else {
             setRegisterSuccess('Kayıt başarılı! Hesabınızı doğrulamak için lütfen e-postanızı kontrol edin.');
             setRegisterForm({ name: '', apartment: '', email: '', sifre: '', role: Role.Member });
             setTimeout(() => {
                 setActiveTab('login');
                 setRegisterSuccess('');
             }, 5000);
        }
    } else {
        // This case should ideally not be reached if signUp succeeds without an error.
        setRegisterError('Kayıt sırasında bilinmeyen bir hata oluştu.');
    }
    
    setIsRegistering(false);
  };


  const getTabClass = (tabName: Tab) => {
    return `w-full py-3 text-center font-semibold transition-colors duration-300 rounded-t-lg focus:outline-none ${
        activeTab === tabName 
        ? 'bg-white/90 text-orange-600 shadow-lg' 
        : 'bg-black/20 text-slate-100 hover:bg-black/30'
    }`;
  }

  return (
    <div className="w-full max-w-md mx-auto transform transition-all hover:scale-[1.02] duration-500">
      
      <div className="flex">
          <button className={getTabClass('login')} onClick={() => setActiveTab('login')}>Giriş Yap</button>
          <button className={getTabClass('register')} onClick={() => setActiveTab('register')}>Kayıt Ol</button>
      </div>

      <div className="p-8 space-y-8 bg-white/80 backdrop-blur-sm rounded-b-2xl shadow-xl">
          {activeTab === 'login' && (
              <>
                  <div className="text-center">
                      <img 
                          src={logoUrl} 
                          alt="Apartman Logosu" 
                          className="w-24 h-24 mx-auto rounded-full object-cover shadow-lg border-4 border-white"
                      />
                      <h1 className="mt-4 text-3xl font-bold text-slate-900">KardeleN Apt. Yönetimi</h1>
                      <p className="mt-2 text-sm text-slate-600">Hesabınıza giriş yapın.</p>
                  </div>
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Daire Numarası</label>
                          <input type="text" name="apartment" value={loginForm.apartment} onChange={handleLoginInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 font-bold text-slate-900"/>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Şifre</label>
                          <input type="password" name="sifre" value={loginForm.sifre} onChange={handleLoginInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 font-bold text-slate-900"/>
                      </div>
                      {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                      <Button type="submit" fullWidth size="lg" disabled={isLoading}>
                          {isLoading ? <Spinner size="sm" /> : 'Giriş Yap'}
                      </Button>
                  </form>
              </>
          )}

          {activeTab === 'register' && (
              <>
                  <div className="text-center">
                      <h1 className="text-3xl font-bold text-slate-900">Yeni Hesap Oluştur</h1>
                      <p className="mt-2 text-sm text-slate-600">Sisteme dahil olmak için bilgilerinizi girin.</p>
                  </div>
                  <form onSubmit={handleRegister} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Ad Soyad</label>
                          <input type="text" name="name" value={registerForm.name} onChange={handleRegisterInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 font-bold text-slate-900"/>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Daire Numarası</label>
                          <input type="text" name="apartment" value={registerForm.apartment} onChange={handleRegisterInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 font-bold text-slate-900"/>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">E-posta</label>
                          <input type="email" name="email" value={registerForm.email} onChange={handleRegisterInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 font-bold text-slate-900"/>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Şifre</label>
                          <input type="password" name="sifre" value={registerForm.sifre} onChange={handleRegisterInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 font-bold text-slate-900"/>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Kullanıcı Tipi</label>
                          <select name="role" value={registerForm.role} onChange={handleRegisterInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500">
                              <option value={Role.Member}>Üye</option>
                              <option value={Role.Admin}>Yönetici</option>
                          </select>
                      </div>
                      {registerError && <p className="text-sm text-red-600">{registerError}</p>}
                      {registerSuccess && <p className="text-sm text-green-600">{registerSuccess}</p>}
                      <Button type="submit" fullWidth size="lg" disabled={isRegistering}>
                          {isRegistering ? <Spinner size="sm" /> : 'Kayıt Ol'}
                      </Button>
                  </form>
              </>
          )}
      </div>
    </div>
  );
};

export default Login;
