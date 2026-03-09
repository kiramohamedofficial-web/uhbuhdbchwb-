import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { PaperAirplaneIcon } from '../../common/Icons';

interface MovieRequest {
    id: string;
    user_id: string;
    student_name: string;
    movie_name: string;
    notes?: string;
    admin_reply?: string;
    status: 'pending' | 'done';
    created_at: string;
    updated_at: string;
}

interface MovieRequestsModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: MovieRequest | null;
    onReply: (requestId: string, reply: string) => Promise<void>;
}

const MovieRequestsModal: React.FC<MovieRequestsModalProps> = ({ isOpen, onClose, request, onReply }) => {
    const [adminReply, setAdminReply] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAdminReply('');
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (request && adminReply.trim()) {
            await onReply(request.id, adminReply);
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="الرد على طلب الميديا">
            <div className="space-y-6 p-1">
                <div className="bg-[var(--bg-tertiary)] p-4 rounded-2xl border border-[var(--border-primary)]">
                    <p className="text-sm font-black text-indigo-600 uppercase mb-1">الطلب:</p>
                    <p className="text-sm font-black text-[var(--text-primary)] mb-1">🎬 {request?.movie_name}</p>
                    <p className="text-sm text-[var(--text-secondary)] font-bold italic">"{request?.notes || 'بدون ملاحظات'}"</p>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-black uppercase tracking-widest text-[var(--text-secondary)] mr-2">الرد للطالب</label>
                    <textarea 
                        value={adminReply} 
                        onChange={e => setAdminReply(e.target.value)} 
                        placeholder="تم توفير العمل في القسم المخصص..." 
                        className="w-full p-5 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-[1.5rem] font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-inner"
                        rows={5}
                    />
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-4 rounded-2xl bg-[var(--bg-tertiary)] font-black text-sm transition-all hover:bg-[var(--border-primary)]">إلغاء</button>
                    <button 
                        onClick={handleSend} 
                        disabled={!adminReply.trim()} 
                        className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <PaperAirplaneIcon className="w-5 h-5"/>
                        إرسال الرد
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default MovieRequestsModal;
