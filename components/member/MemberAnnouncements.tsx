
import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import { Announcement } from '../../types';
import { supabase, formatSupabaseError } from '../../services/supabaseClient';
import Spinner from '../common/Spinner';

const MemberAnnouncements: React.FC = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAnnouncements = async () => {
            setIsLoading(true);
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
            setIsLoading(false);
        };

        fetchAnnouncements();
    }, []);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center p-8">
                    <Spinner />
                </div>
            );
        }

        if (error) {
            return <p className="text-sm text-red-500 text-center py-4">{error}</p>;
        }

        if (announcements.length === 0) {
            return <p className="text-sm text-slate-500 text-center py-4">Gösterilecek duyuru bulunmamaktadır.</p>;
        }

        return announcements.map((ann) => (
            <div key={ann.id} className="p-4 rounded-lg bg-slate-50 border-l-4 border-orange-400 transition-transform duration-200 hover:scale-[1.02]">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-slate-800">{ann.title}</h4>
                        <p className="text-sm text-slate-600 mt-1">{ann.content}</p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap ml-4">{new Date(ann.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        ));
    };

    return (
        <Card title="Güncel Duyurular">
            <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-2">
                {renderContent()}
            </div>
        </Card>
    );
};

export default MemberAnnouncements;
