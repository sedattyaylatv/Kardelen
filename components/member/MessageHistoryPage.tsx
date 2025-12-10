
import React from 'react';
import { Message, User } from '../../types';
import Card from '../common/Card';

interface MessageHistoryPageProps {
  messages: Message[];
  currentUser: User;
  adminUser: User;
  onBack: () => void;
}

const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);


const MessageHistoryPage: React.FC<MessageHistoryPageProps> = ({ messages, currentUser, adminUser, onBack }) => {
  const sortedMessages = [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <Card>
      <div className="flex items-center border-b border-slate-200 pb-4 mb-4">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 mr-4">
          <ArrowLeftIcon className="w-6 h-6 text-slate-600" />
        </button>
        <div>
            <h2 className="text-xl font-bold text-slate-800">Mesaj Geçmişi</h2>
            <p className="text-sm text-slate-500">{adminUser.name} ile konuşmanız</p>
        </div>
      </div>
      <div className="space-y-4 p-4 h-[60vh] overflow-y-auto bg-slate-50 rounded-lg">
        {sortedMessages.map((msg) => {
          const isSentByMe = msg.sender_id === currentUser.id;
          return (
            <div key={msg.id} className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-xl ${isSentByMe ? 'bg-indigo-500 text-white' : 'bg-white text-slate-800 shadow-sm'}`}>
                <p className="text-sm">{msg.content}</p>
                <p className={`text-xs mt-1 ${isSentByMe ? 'text-indigo-200' : 'text-slate-400'} text-right`}>
                  {new Date(msg.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
            <div className="text-center text-slate-500 py-10">
                <p>Mesaj geçmişiniz bulunmamaktadır.</p>
            </div>
        )}
      </div>
    </Card>
  );
};

export default MessageHistoryPage;