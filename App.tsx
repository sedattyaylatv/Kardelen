
import React, { useState, useCallback } from 'react';
import { User, Role } from './types';
import Login from './components/Login';
import Header from './components/Header';
import AdminDashboard from './components/admin/AdminDashboard';
import MemberDashboard from './components/member/MemberDashboard';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = useCallback((selectedUser: User) => {
    setUser(selectedUser);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
  }, []);
  
  const dashboard = user ? (
    user.role === Role.Admin ? <AdminDashboard user={user} /> : <MemberDashboard user={user} />
  ) : null;

  return (
    <div className="min-h-screen text-slate-100 dynamic-bg">
       {user ? (
        <>
          <Header user={user} onLogout={handleLogout} />
          <main className="container mx-auto p-4 md:p-6 lg:p-8">
            <div className="animate-fade-in">
              {dashboard}
            </div>
          </main>
        </>
      ) : (
        <main className="flex items-center justify-center min-h-screen p-4">
          <div className="animate-fade-in w-full">
            <Login onLogin={handleLogin} />
          </div>
        </main>
      )}
      <style>{`
        .dynamic-bg {
          background: linear-gradient(-45deg, #1e3a8a, #3b82f6, #312e81, #2563eb);
          background-size: 400% 400%;
          animation: gradientBG 15s ease infinite;
        }

        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
