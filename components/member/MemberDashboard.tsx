
import React, { useState } from 'react';
import { User } from '../../types';
import MyDues from './MyDues';
import MemberAnnouncements from './MemberAnnouncements';
import MemberMessages from './MemberMessages';
import MemberFinancials from './MemberFinancials';
import PasswordChange from './PasswordChange';

interface MemberDashboardProps {
    user: User;
}

type Tab = 'announcements' | 'dues' | 'financials' | 'messages' | 'password';

const MemberDashboard: React.FC<MemberDashboardProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<Tab>('announcements');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'announcements':
                return <MemberAnnouncements />;
            case 'dues':
                return <MyDues memberId={user.id} />;
            case 'financials':
                return <MemberFinancials memberId={user.id} />;
            case 'messages':
                return <MemberMessages user={user} />;
            case 'password':
                return <PasswordChange />;
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
             <div className="bg-white p-2 rounded-xl shadow-md">
                <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2 overflow-x-auto pb-2">
                    <button onClick={() => setActiveTab('announcements')} className={getTabClass('announcements')}>
                        Güncel Duyurular
                    </button>
                    <button onClick={() => setActiveTab('dues')} className={getTabClass('dues')}>
                        Aidat Durumu
                    </button>
                    <button onClick={() => setActiveTab('financials')} className={getTabClass('financials')}>
                        Finansal Durum
                    </button>
                    <button onClick={() => setActiveTab('messages')} className={getTabClass('messages')}>
                        Yönetici ile Mesajlaşma
                    </button>
                     <button onClick={() => setActiveTab('password')} className={getTabClass('password')}>
                        Şifre
                    </button>
                </div>
            </div>
            <div>
                {renderTabContent()}
            </div>
        </div>
    );
};

export default MemberDashboard;
