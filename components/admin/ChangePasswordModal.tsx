import React, { useState, useEffect } from 'react';
import { ToastType } from '../../types';
import { KeyIcon, ShieldCheckIcon } from '../common/Icons';
import { useToast } from '../../useToast';
import Modal from '../common/Modal';
import { useSession } from '../../hooks/useSession';
import { updateUserPassword } from '../../services/storageService';
import { logAdminAction } from '../../services/auditService';

const ChangePasswordModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { currentUser } = useSession();
    const { addToast } = useToast();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Reset fields when modal opens
    useEffect(() => {
        if (isOpen) {
            setNewPassword('');
            setConfirmPassword('');
            setIsLoading(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword.length < 6) {
            addToast("كلمة المرور يجب أن تكون 6 أحرف على الأقل", ToastType.ERROR);
            return;
        }

        if (newPassword !== confirmPassword) {
            addToast("كلمات المرور غير متطابقة", ToastType.ERROR);
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await updateUserPassword(newPassword);
            if (error) throw error;
            
            if (currentUser) {
                await logAdminAction(currentUser.id, currentUser.name, 'تغيير كلمة المرور', 'قام المدير بتغيير كلمة مرور حسابه الشخصي.');
            }
            
            addToast("تم تغيير كلمة المرور بنجاح", ToastType.SUCCESS);
            onClose();
        } catch (error: any) {
            addToast(`فشل التحديث: ${error.message}`, ToastType.ERROR);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="تغيير كلمة المرور">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div className="relative group">
                        <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-2 mr-2">كلمة المرور الجديدة</label>
                        <div className="relative">
                            <input 
                                type="password" 
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full p-4 pr-12 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] focus:border-indigo-500 outline-none font-bold shadow-inner" 
                                placeholder="••••••••"
                            />
                            <KeyIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] opacity-50" />
                        </div>
                    </div>
                    
                    <div className="relative group">
                        <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-2 mr-2">تأكيد كلمة المرور</label>
                        <div className="relative">
                            <input 
                                type="password" 
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full p-4 pr-12 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] focus:border-indigo-500 outline-none font-bold shadow-inner" 
                                placeholder="••••••••"
                            />
                            <ShieldCheckIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] opacity-50" />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 gap-3 border-t border-[var(--border-primary)]">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors">إلغاء</button>
                    <button 
                        type="submit" 
                        disabled={isLoading || newPassword.length < 6}
                        className="px-10 py-2.5 font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-lg active:scale-95 transition-all"
                    >
                        {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'حفظ التغييرات'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ChangePasswordModal;
