
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Message } from '../../types';
import { supabase, formatSupabaseError } from '../../services/supabaseClient';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import Button from '../common/Button';

interface MemberMessagesProps {
  user: User;
}

const MemberMessages: React.FC<MemberMessagesProps> = ({ user }) => {
  const [admin, setAdmin] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    // 1. Fetch Admin
    const { data: adminData, error: adminError } = await supabase
      .from('user')
      .select('*')
      .eq('role', 'Yönetici')
      .limit(1)
      .single();

    if (adminError) {
      setError(formatSupabaseError(adminError, 'Yönetici bilgisi'));
      setLoading(false);
      return;
    }
    setAdmin(adminData);

    // 2. Fetch Messages
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${adminData.id}),and(sender_id.eq.${adminData.id},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (messagesError) {
      setError(formatSupabaseError(messagesError, 'Mesajlar'));
    } else {
      setMessages(messagesData || []);
    }
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !admin) return;

    setSendingMessage(true);
    const { error: insertError } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: admin.id,
      content: newMessage.trim(),
    });

    if (insertError) {
      setError(formatSupabaseError(insertError, 'Mesaj gönderme'));
    } else {
      setNewMessage('');
      // Refresh messages after sending a new one
      const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${admin.id}),and(sender_id.eq.${admin.id},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

      if (messagesError) {
        setError(formatSupabaseError(messagesError, 'Mesajlar'));
      } else {
        setMessages(messagesData || []);
      }
    }
    setSendingMessage(false);
  };
  
  const renderContent = () => {
    if (loading) {
      return <div className="flex-grow flex items-center justify-center"><Spinner /></div>;
    }
    if (error && messages.length === 0) {
      return <div className="flex-grow flex items-center justify-center text-red-500 p-4">{error}</div>;
    }
    return (
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {messages.map(msg => {
                const isSentByMe = msg.sender_id === user.id;
                return (
                    <div key={msg.id} className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-md p-3 rounded-xl ${isSentByMe ? 'bg-orange-500 text-white' : 'bg-white text-slate-800 shadow-sm'}`}>
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-xs mt-1 ${isSentByMe ? 'text-orange-200' : 'text-slate-400'} text-right`}>
                                {new Date(msg.created_at).toLocaleString()}
                            </p>
                        </div>
                    </div>
                );
            })}
            {messages.length === 0 && (
                <div className="text-center text-slate-500 py-10">
                    <p>Yönetici ile mesaj geçmişiniz bulunmamaktadır.</p>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
  }

  return (
    <Card title="Yönetici ile Mesajlaşma">
      <div className="flex flex-col h-[70vh] bg-slate-50 rounded-lg">
        {renderContent()}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white">
          {error && messages.length > 0 && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder={!admin && !loading ? "Yönetici bulunamadı." : "Bir mesaj yazın..."}
              className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              disabled={sendingMessage || loading || !admin}
            />
            <Button type="submit" disabled={sendingMessage || loading || !admin}>
              {sendingMessage ? <Spinner size="sm" /> : 'Gönder'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
};

export default MemberMessages;
