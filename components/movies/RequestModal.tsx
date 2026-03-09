
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/storageService';
import { useToast } from '../../useToast';
import { ToastType } from '../../types';
import Modal from '../common/Modal';
import { 
    MegaphoneIcon, 
    PlusIcon, 
    TicketIcon, 
    CheckCircleIcon, 
    ClockIcon, 
    ChatBubbleOvalLeftEllipsisIcon, 
    ArrowRightIcon, 
    PaperAirplaneIcon,
    XIcon
} from '../common/Icons';

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

interface RequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    studentName: string;
}

const RequestModal: React.FC<RequestModalProps> = ({ isOpen, onClose, userId, studentName }) => {
    const { addToast } = useToast();
    const [requests, setRequests] = useState<MovieRequest[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newRequest, setNewRequest] = useState({ movieName: '', notes: '' });
    const [view, setView] = useState<'list' | 'new'>('list');

    const fetchRequests = async () => {
        try {
            const { data, error } = await supabase
                .from('movie_requests')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setRequests(data || []);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchRequests();
            const channel = supabase
                .channel(`user-movie-requests-${userId}`)
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'movie_requests',
                    filter: `user_id=eq.${userId}`
                }, () => fetchRequests())
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [isOpen, userId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRequest.movieName.trim()) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('movie_requests').insert({
                user_id: userId,
                student_name: studentName,
                movie_name: newRequest.movieName,
                notes: newRequest.notes,
                status: 'pending'
            });
            if (error) throw error;
            addToast("تم إرسال طلبك بنجاح! سنقوم بمراجعته قريباً.", ToastType.SUCCESS);
            setNewRequest({ movieName: '', notes: '' });
            setView('list');
            fetchRequests();
        } catch (e) {
            addToast("فشل إرسال الطلب", ToastType.ERROR);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="مركز طلبات الميديا" maxWidth="max-w-2xl">
            <div className="space-y-6 text-right font-cairo">
                {view === 'list' ? (
                    <>
                        <div className="flex items-center justify-between mb-6">
                             <button 
                                onClick={() => setView('new')}
                                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-2xl font-black text-sm hover:bg-red-700 transition-all shadow-xl shadow-red-900/20"
                            >
                                <PlusIcon className="w-4 h-4" /> طلب جديد
                            </button>
                            <div className="text-right">
                                <h3 className="text-xl font-black text-white">طلباتك السابقة</h3>
                                <p className="text-gray-500 text-sm font-bold mt-1 uppercase tracking-widest">تتبع حالة طلبات الأفلام والمسلسلات الخاصة بك</p>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {requests.length > 0 ? requests.map(req => (
                                <div key={req.id} className="p-5 bg-white/5 border border-white/10 rounded-3xl hover:border-red-600/30 transition-all group">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className={`px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-widest flex items-center gap-2 ${req.status === 'done' ? 'bg-green-600/20 text-green-400 border border-green-600/30' : 'bg-amber-600/20 text-amber-400 border border-amber-600/30'}`}>
                                            {req.status === 'done' ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <ClockIcon className="w-3.5 h-3.5" />}
                                            {req.status === 'done' ? 'تم التنفيذ' : 'قيد المراجعة'}
                                        </div>
                                        <h4 className="font-black text-white text-lg">{req.movie_name}</h4>
                                    </div>
                                    
                                    {req.notes && <p className="mt-3 text-sm text-gray-400 font-medium leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5">{req.notes}</p>}
                                    
                                    {req.admin_reply && (
                                        <div className="mt-4 p-4 bg-red-600/10 border border-red-600/20 rounded-2xl relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-1 h-full bg-red-600"></div>
                                            <div className="flex items-center gap-2 text-red-500 font-black text-sm mb-2 uppercase tracking-widest">
                                                <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4" /> رد الإدارة
                                            </div>
                                            <p className="text-white text-sm font-bold leading-loose">{req.admin_reply}</p>
                                        </div>
                                    )}
                                    
                                    <div className="mt-4 flex justify-end">
                                        <span className="text-sm text-gray-600 font-black uppercase tracking-widest">{new Date(req.created_at).toLocaleDateString('ar-EG')}</span>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-20 opacity-20">
                                    <TicketIcon className="w-20 h-20 mx-auto mb-4" />
                                    <p className="text-lg font-black">لا توجد طلبات سابقة</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between mb-4">
                            <button type="button" onClick={() => setView('list')} className="text-gray-500 hover:text-white transition-colors flex items-center gap-2 text-sm font-black"><ArrowRightIcon className="w-4 h-4 rotate-180" /> العودة للقائمة</button>
                            <h3 className="text-xl font-black text-white">إرسال طلب جديد</h3>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-black text-gray-400 uppercase tracking-widest mr-2">اسم الفيلم أو المسلسل</label>
                                <input 
                                    required
                                    type="text" 
                                    placeholder="مثال: ون بيس، سبايدرمان..."
                                    className="w-full bg-white/5 border-2 border-white/10 focus:border-red-600 rounded-2xl py-4 px-6 text-white outline-none transition-all font-bold"
                                    value={newRequest.movieName}
                                    onChange={e => setNewRequest(prev => ({ ...prev, movieName: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-black text-gray-400 uppercase tracking-widest mr-2">ملاحظات إضافية (اختياري)</label>
                                <textarea 
                                    placeholder="أي تفاصيل أخرى تود إضافتها..."
                                    rows={4}
                                    className="w-full bg-white/5 border-2 border-white/10 focus:border-red-600 rounded-2xl py-4 px-6 text-white outline-none transition-all font-bold resize-none"
                                    value={newRequest.notes}
                                    onChange={e => setNewRequest(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>
                        </div>

                        <button 
                            disabled={isSubmitting}
                            type="submit"
                            className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-base hover:bg-red-700 transition-all shadow-2xl shadow-red-900/30 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'جاري الإرسال...' : <><PaperAirplaneIcon className="w-5 h-5" /> إرسال الطلب الآن</>}
                        </button>
                    </form>
                )}
            </div>
        </Modal>
    );
};

export default RequestModal;
