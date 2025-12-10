
import React, { useState } from 'react';
import UserManagement from './UserManagement';
import Announcements from './Announcements';
import Financials from './Financials';
import AdminMessages from './AdminMessages'; // Import the new component
import { User } from '../../types';

type Tab = 'users' | 'announcements' | 'financials' | 'messages'; // Add 'messages' tab

interface AdminDashboardProps {
    user: User;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<Tab>('announcements');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'announcements':
        return <Announcements />;
      case 'financials':
        return <Financials />;
      case 'messages':
        return <AdminMessages adminUser={user} />; // Render the new component
      default:
        return null;
    }
  };

  const getTabClass = (tabName: Tab) => {
    return `w-full md:w-auto px-4 py-2 font-semibold rounded-lg transition-colors duration-300 whitespace-nowrap text-center ${
      activeTab === tabName
        ? 'bg-orange-600 text-white shadow'
        : 'text-slate-600 hover:bg-orange-100 hover:text-orange-600'
    }`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-baseline">
        <h1 className="text-3xl font-bold text-white">Yönetici Paneli</h1>
        <p className="text-md text-slate-200 hidden sm:block">
            Giriş yapan: <span className="font-semibold">{user.name}</span>
        </p>
      </div>
      <div className="bg-white p-2 rounded-xl shadow-md">
        <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2 overflow-x-auto pb-2">
            <button onClick={() => setActiveTab('announcements')} className={getTabClass('announcements')}>
            Duyurular
            </button>
            <button onClick={() => setActiveTab('financials')} className={getTabClass('financials')}>
            Finansal Durum
            </button>
            <button onClick={() => setActiveTab('users')} className={getTabClass('users')}>
            Kullanıcı Yönetimi
            </button>
             <button onClick={() => setActiveTab('messages')} className={getTabClass('messages')}>
              Mesajlar
            </button>
        </div>
      </div>
      <div>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;
