
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Message, Role } from '../../types';
import { supabase, formatSupabaseError } from '../../services/supabaseClient';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import Button from '../common/Button';

interface AdminMessagesProps {
  adminUser: User;
}

const AdminMessages: React.FC<AdminMessagesProps> = ({ adminUser }) => {
  const [members, setMembers] = useState<User[]>([]);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    setError('');
    const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('role', Role.Member)
        .order('name', { ascending: true });

    if (error) {
        setError(formatSupabaseError(error, 'Üyeler'));
    } else {
        setMembers(data || []);
    }
    setLoadingMembers(false);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);
  
  const fetchMessagesForMember = useCallback(async (member: User) => {
    if (!member) return;
    setLoadingMessages(true);
    setMessages([]);
    setError('');
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${adminUser.id},receiver_id.eq.${member.id}),and(sender_id.eq.${member.id},receiver_id.eq.${adminUser.id})`)
        .order('created_at', { ascending: true });

    if (error) {
        setError(formatSupabaseError(error, 'Mesajlar'));
    } else {
        setMessages(data || []);
    }
    setLoadingMessages(false);
  }, [adminUser.id]);

  const handleSelectMember = (member: User) => {
    setSelectedMember(member);
    fetchMessagesForMember(member);
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedMember) return;
    
    setSendingMessage(true);
    const { error } = await supabase.from('messages').insert({
        sender_id: adminUser.id,
        receiver_id: selectedMember.id,
        content: newMessage.trim(),
    });

    if (error) {
        setError(formatSupabaseError(error, 'Mesaj gönderme'));
    } else {
        setNewMessage('');
        await fetchMessagesForMember(selectedMember); 
    }
    setSendingMessage(false);
  };

  return (
    <Card title="Üye Mesajları">
      <div className="flex flex-col md:flex-row h-[70vh] border rounded-lg">
        {/* Member List (Left Panel) */}
        <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto">
           {loadingMembers ? <div className="flex justify-center items-center h-full"><Spinner/></div> : 
            members.map(member => (
              <button 
                key={member.id} 
                onClick={() => handleSelectMember(member)}
                className={`w-full text-left p-4 hover:bg-slate-100 transition-colors duration-200 ${selectedMember?.id === member.id ? 'bg-orange-100' : ''}`}
              >
                <p className="font-semibold text-slate-800">{member.name}</p>
              </button>
            ))
           }
        </div>
        {/* Chat Panel (Right Panel) */}
        <div className="w-full md:w-2/3 flex flex-col bg-slate-50">
          {!selectedMember ? (
            <div className="flex-grow flex items-center justify-center text-slate-500">
              <p>Mesajları görüntülemek için soldaki listeden bir üye seçin.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-slate-200 bg-white">
                <h3 className="font-bold text-slate-800">{selectedMember.name} ile konuşma</h3>
              </div>
              <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {loadingMessages ? <div className="flex justify-center items-center h-full"><Spinner/></div> : 
                  messages.map(msg => {
                    const isSentByAdmin = msg.sender_id === adminUser.id;
                    return (
                      <div key={msg.id} className={`flex ${isSentByAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-md p-3 rounded-xl ${isSentByAdmin ? 'bg-orange-500 text-white' : 'bg-white text-slate-800 shadow-sm'}`}>
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-xs mt-1 ${isSentByAdmin ? 'text-orange-200' : 'text-slate-400'} text-right`}>
                            {new Date(msg.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                }
                 <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white">
                 {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Bir mesaj yazın..."
                    className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    disabled={sendingMessage || loadingMessages}
                  />
                  <Button type="submit" disabled={sendingMessage || loadingMessages}>
                    {sendingMessage ? <Spinner size="sm"/> : 'Gönder'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

export default AdminMessages;
