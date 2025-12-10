
import React, { useState } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import { supabase, formatSupabaseError } from '../../services/supabaseClient';

const PasswordChange: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!password || !confirmPassword) {
            setError('Lütfen tüm alanları doldurun.');
            return;
        }

        if (password.length < 6) {
            setError('Yeni şifre en az 6 karakter olmalıdır.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Girdiğiniz şifreler eşleşmiyor.');
            return;
        }

        setIsSubmitting(true);

        const { error: updateError } = await supabase.auth.updateUser({
            password: password,
        });

        if (updateError) {
            setError(formatSupabaseError(updateError, 'Şifre güncelleme'));
        } else {
            setSuccess('Şifreniz başarıyla güncellendi.');
            setPassword('');
            setConfirmPassword('');
        }

        setIsSubmitting(false);
    };

    return (
        <Card title="Şifre Değiştir">
            <div className="max-w-md mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Yeni Şifre</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                            placeholder="••••••••"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Yeni Şifre (Tekrar)</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                            placeholder="••••••••"
                        />
                    </div>
                    
                    {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                    {success && <p className="text-sm text-green-600 text-center">{success}</p>}

                    <div>
                        <Button type="submit" fullWidth disabled={isSubmitting}>
                            {isSubmitting ? <Spinner size="sm" /> : 'Şifreyi Kaydet'}
                        </Button>
                    </div>
                </form>
            </div>
        </Card>
    );
};

export default PasswordChange;
