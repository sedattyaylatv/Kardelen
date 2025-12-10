
import React, { useState, useEffect, useCallback } from 'react';
import { Announcement } from '../../types';
import Card from '../common/Card';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Spinner from '../common/Spinner';
import { generateAnnouncement } from '../../services/geminiService';
import { supabase, formatSupabaseError } from '../../services/supabaseClient';

const Announcements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
  const [aiPrompt, setAiPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');

  const fetchAnnouncements = useCallback(async () => {
    setIsFetching(true);
    setError('');
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
      setError(formatSupabaseError(error, 'Duyurular'));
    } else {
      setAnnouncements(data || []);
    }
    setIsFetching(false);
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleCreateAnnouncement = async () => {
    if (newAnnouncement.title && newAnnouncement.content) {
        setIsLoading(true);
        setError('');
        const { error } = await supabase
            .from('announcements')
            .insert([{ title: newAnnouncement.title, content: newAnnouncement.content }]);

        if (error) {
            console.error('Error creating announcement:', error);
            setError(formatSupabaseError(error, 'Duyuru oluşturma'));
        } else {
            closeModal();
            await fetchAnnouncements(); // Refresh the list
        }
        setIsLoading(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!aiPrompt) return;
    setIsLoading(true);
    setError('');
    try {
      const generatedContent = await generateAnnouncement(aiPrompt);
      setNewAnnouncement(prev => ({ ...prev, content: generatedContent }));
    } catch (e: any) {
      setError(e.message || 'Bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewAnnouncement({ title: '', content: '' });
    setAiPrompt('');
    setError('');
  };

  return (
    <>
      <Card title="Duyurular" actions={<Button size="sm" onClick={() => setIsModalOpen(true)}>Yeni Duyuru Oluştur</Button>}>
        {isFetching ? (
            <div className="flex justify-center items-center p-8">
                <Spinner />
            </div>
        ) : error && !isFetching ? (
            <p className="text-red-500 text-center">{error}</p>
        ) : (
            <div className="space-y-4">
            {announcements.map((ann) => (
                <div key={ann.id} className="p-4 rounded-lg bg-slate-50 border-l-4 border-orange-400">
                <div className="flex justify-between items-start">
                    <div>
                    <h4 className="font-bold text-slate-800">{ann.title}</h4>
                    <p className="text-sm text-slate-600 mt-1">{ann.content}</p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap ml-4">{new Date(ann.created_at).toLocaleDateString()}</span>
                </div>
                </div>
            ))}
            </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title="Yeni Duyuru Oluştur"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={isLoading}>İptal</Button>
            <Button onClick={handleCreateAnnouncement} disabled={isLoading}>
                {isLoading ? <Spinner size="sm"/> : 'Kaydet'}
            </Button>
          </>
        }>
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Başlık</label>
            <input
              type="text"
              id="title"
              value={newAnnouncement.title}
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="ai-prompt" className="block text-sm font-medium text-gray-700">Yapay Zeka ile İçerik Oluştur</label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="text"
                id="ai-prompt"
                placeholder="Örn: Cumartesi günü havuz temizliği yapılacak"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
              />
              <Button onClick={handleGenerateWithAI} disabled={isLoading} className="rounded-l-none">
                {isLoading ? <Spinner size="sm" /> : 'Oluştur'}
              </Button>
            </div>
             {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">İçerik</label>
            <textarea
              id="content"
              rows={5}
              value={newAnnouncement.content}
              onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            />
          </div>
          {error && !isLoading && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
      </Modal>
    </>
  );
};

export default Announcements;
