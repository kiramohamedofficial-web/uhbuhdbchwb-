
import React, { useState, useEffect, useCallback } from 'react';
import { Reel, ToastType } from '../../types';
import { getAllReels, addReel, updateReel, deleteReel } from '../../services/storageService';
import Modal from '../common/Modal';
import { PlusIcon, PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon, PlayIcon } from '../common/Icons';
import { useToast } from '../../useToast';
import Loader from '../common/Loader';

const parseYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

const ReelCard: React.FC<{ reel: Reel; onEdit: () => void; onDelete: () => void; }> = ({ reel, onEdit, onDelete }) => {
    const videoId = parseYouTubeVideoId(reel.youtubeUrl);
    const thumbnailUrl = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : 'https://i.ibb.co/k5y5nJg/imgbb-com-image-not-found.png';

    return (
        <div className={`bg-[var(--bg-secondary)] rounded-2xl shadow-md border transition-all duration-300 flex flex-col overflow-hidden group hover:shadow-xl hover:-translate-y-1 ${reel.isPublished ? 'border-[var(--border-primary)]' : 'border-red-500/30 opacity-75'}`}>
            <div className="relative h-48 overflow-hidden">
                <img src={thumbnailUrl} alt={reel.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
                <div className="absolute top-3 right-3 flex gap-2">
                    <span className={`text-sm font-black rounded-full px-3 py-1 shadow-lg backdrop-blur-md border ${reel.isPublished ? 'bg-emerald-500/90 text-white border-emerald-400' : 'bg-red-500/90 text-white border-red-400'}`}>
                        {reel.isPublished ? 'منشور' : 'معطل'}
                    </span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30">
                        <PlayIcon className="w-5 h-5 ml-0.5" />
                    </div>
                </div>
            </div>
            
            <div className="p-4 flex-grow flex flex-col">
                <h3 className="font-bold text-md text-[var(--text-primary)] line-clamp-2 leading-relaxed mb-4">{reel.title}</h3>
                
                <div className="flex justify-between items-center mt-auto pt-3 border-t border-[var(--border-primary)]">
                    <span className="text-sm text-[var(--text-secondary)] font-mono opacity-60">ID: {reel.id.slice(0,4)}</span>
                    <div className="flex gap-2">
                        <button onClick={onEdit} className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors" title="تعديل">
                            <PencilIcon className="w-4 h-4"/>
                        </button>
                        <button onClick={onDelete} className="p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors" title="حذف">
                            <TrashIcon className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ReelModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (data: Partial<Omit<Reel, 'id' | 'createdAt'>>) => void; reel: Partial<Reel> | null; }> = ({ isOpen, onClose, onSave, reel }) => {
    const [formData, setFormData] = useState<Partial<Omit<Reel, 'id' | 'createdAt'>>>({});

    useEffect(() => {
        if (isOpen) {
            setFormData(reel?.id ? reel : { isPublished: true });
        }
    }, [reel, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={reel?.id ? 'تعديل الريل' : 'إضافة ريل جديد'}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2 mr-1">عنوان الفيديو</label>
                    <input type="text" name="title" placeholder="مثال: نصائح للمذاكرة..." value={formData.title || ''} onChange={handleChange} className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl focus:border-[var(--accent-primary)] outline-none transition-all font-bold text-sm" required />
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2 mr-1">رابط يوتيوب (Shorts)</label>
                    <input type="text" name="youtubeUrl" placeholder="https://youtube.com/shorts/..." value={formData.youtubeUrl || ''} onChange={handleChange} className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl focus:border-[var(--accent-primary)] outline-none transition-all font-mono text-sm text-left" dir="ltr" required />
                </div>
                
                <div 
                    onClick={() => setFormData(p => ({...p, isPublished: !p.isPublished}))}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.isPublished ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${formData.isPublished ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-red-500 text-white shadow-lg shadow-red-500/30'}`}>
                            {formData.isPublished ? <CheckCircleIcon className="w-6 h-6" /> : <XCircleIcon className="w-6 h-6" />}
                        </div>
                        <div>
                            <p className={`font-black text-sm ${formData.isPublished ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formData.isPublished ? 'حالة الفيديو: منشور' : 'حالة الفيديو: معطل'}
                            </p>
                            <p className="text-sm font-bold text-[var(--text-secondary)] mt-0.5">
                                {formData.isPublished ? 'يظهر للطلاب في قسم الريلز' : 'مخفي عن الطلاب حالياً'}
                            </p>
                        </div>
                    </div>
                    
                    <div className={`w-14 h-8 rounded-full p-1 transition-colors ${formData.isPublished ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${formData.isPublished ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                </div>
                
                <div className="flex justify-end pt-4 border-t border-[var(--border-primary)]">
                    <button type="submit" className="px-8 py-3 font-black text-white bg-[var(--accent-primary)] rounded-xl hover:bg-indigo-600 transition-all shadow-lg active:scale-95">
                        حفظ التغييرات
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const ReelsManagementView: React.FC = () => {
    const [dataVersion, setDataVersion] = useState(0);
    const { addToast } = useToast();
    const [reels, setReels] = useState<Reel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalState, setModalState] = useState<{ type: string | null; data: any }>({ type: null, data: {} });

    const refreshData = useCallback(() => setDataVersion(v => v + 1), []);
    
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const data = await getAllReels();
            setReels(data);
            setIsLoading(false);
        };
        fetchData();
    }, [dataVersion]);

    const openModal = (type: string, data = {}) => setModalState({ type, data });
    const closeModal = () => setModalState({ type: null, data: {} });

    const handleSave = async (data: Partial<Omit<Reel, 'id' | 'createdAt'>>) => {
        try {
            if (modalState.data.id) { // Editing
                const { error } = await updateReel(modalState.data.id, data);
                if (error) throw error;
                addToast("تم تحديث الريل بنجاح.", ToastType.SUCCESS);
            } else { // Adding
                const { error } = await addReel(data);
                if (error) throw error;
                addToast("تم إضافة الريل بنجاح.", ToastType.SUCCESS);
            }
            refreshData();
            closeModal();
        } catch(error: any) {
            addToast(`فشل حفظ الريل: ${error.message}`, ToastType.ERROR);
        }
    };

    const handleDelete = async () => {
        const { data } = modalState;
        try {
            await deleteReel(data.id);
            addToast("تم حذف الريل بنجاح.", ToastType.SUCCESS);
            refreshData();
            closeModal();
        } catch(error: any) {
            addToast(`حدث خطأ: ${error.message}`, ToastType.ERROR);
        }
    };

    return (
        <div className="fade-in pb-20">
             <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4 bg-[var(--bg-secondary)] p-6 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-primary)]">إدارة الريلز</h1>
                    <p className="text-[var(--text-secondary)] mt-1 font-bold opacity-70">التحكم في الفيديوهات القصيرة وحالتها.</p>
                </div>
                <button 
                    onClick={() => openModal('add')} 
                    className="flex items-center justify-center space-x-2 space-x-reverse px-6 py-3 font-black bg-[var(--accent-primary)] hover:bg-indigo-600 rounded-2xl text-white transition-all shadow-lg shadow-indigo-500/20 transform hover:scale-105 active:scale-95"
                >
                    <PlusIcon className="w-5 h-5"/> 
                    <span>إضافة ريل جديد</span>
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20"><Loader /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {reels.map(reel => (
                        <ReelCard key={reel.id} reel={reel} onEdit={() => openModal('edit', reel)} onDelete={() => openModal('delete', reel)} />
                    ))}
                    {reels.length === 0 && (
                        <div className="col-span-full text-center py-20 bg-[var(--bg-secondary)] rounded-[2.5rem] border-2 border-dashed border-[var(--border-primary)] opacity-60">
                             <PlayIcon className="w-16 h-16 mx-auto text-[var(--text-secondary)] mb-4" />
                             <p className="font-black text-[var(--text-primary)]">لا توجد ريلز مضافة بعد</p>
                        </div>
                    )}
                </div>
            )}
            
            {(modalState.type === 'add' || modalState.type === 'edit') && (
                <ReelModal 
                    isOpen={true}
                    onClose={closeModal}
                    onSave={handleSave}
                    reel={modalState.data}
                />
            )}
            
            {modalState.type === 'delete' && (
                <Modal isOpen={true} onClose={closeModal} title="تأكيد الحذف">
                    <p className="text-[var(--text-secondary)] mb-6 font-bold text-center">هل أنت متأكد من رغبتك في حذف ريل <br/> <span className="text-[var(--text-primary)]">"{modalState.data.title}"</span>؟</p>
                    <div className="flex justify-center gap-3">
                        <button onClick={closeModal} className="px-6 py-3 rounded-xl bg-[var(--bg-tertiary)] font-black text-[var(--text-secondary)] hover:bg-[var(--border-primary)] transition-colors">إلغاء</button>
                        <button onClick={handleDelete} className="px-6 py-3 rounded-xl bg-red-600 font-black text-white hover:bg-red-700 transition-colors shadow-lg">نعم، حذف</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ReelsManagementView;
