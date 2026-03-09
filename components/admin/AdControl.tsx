
import React, { useState, useEffect, useCallback } from 'react';
import { Announcement, ToastType } from '../../types';
import { 
    getAllAnnouncements, 
    createAnnouncement, 
    updateAnnouncement, 
    deleteAnnouncement 
} from '../../services/announcementService';
import { useToast } from '../../useToast';
import { 
    MegaphoneIcon, 
    PlusIcon, 
    PhotoIcon, 
    LinkIcon, 
    PencilIcon, 
    TrashIcon 
} from '../common/Icons';
import ImageUpload from '../common/ImageUpload';
import Loader from '../common/Loader';
import Modal from '../common/Modal';

// Reusing Input components for consistency
const AdInput: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; icon?: React.FC<any> }> = ({ label, name, value, onChange, placeholder, icon: Icon }) => (
    <div className="group space-y-2">
        <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] group-focus-within:text-indigo-500 transition-colors mr-1 flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4"/>} {label}
        </label>
        <input 
            type="text" 
            name={name} 
            value={value} 
            onChange={onChange} 
            placeholder={placeholder}
            className="w-full px-6 py-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-2xl font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
        />
    </div>
);

const AdTextarea: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; rows?: number; placeholder?: string }> = ({ label, name, value, onChange, rows = 3, placeholder }) => (
    <div className="group space-y-2">
        <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] group-focus-within:text-indigo-500 transition-colors mr-1">{label}</label>
        <textarea 
            name={name} 
            value={value} 
            onChange={onChange} 
            rows={rows}
            placeholder={placeholder}
            className="w-full px-6 py-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-2xl font-bold text-[var(--text-primary)] focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none leading-relaxed"
        />
    </div>
);

const AdControl: React.FC = () => {
    const { addToast } = useToast();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<Announcement>>({});
    const [isSaving, setIsSaving] = useState(false);

    const fetchAnnouncements = useCallback(async () => {
        setIsLoading(true);
        const data = await getAllAnnouncements();
        setAnnouncements(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    const handleSave = async () => {
        if (!editingItem.title || !editingItem.content) {
            addToast("العنوان والمحتوى مطلوبان.", ToastType.ERROR);
            return;
        }

        setIsSaving(true);
        try {
            let res;
            if (editingItem.id) {
                res = await updateAnnouncement(editingItem.id, editingItem);
            } else {
                res = await createAnnouncement({ ...editingItem, isActive: true });
            }

            if (res.success) {
                addToast("تم حفظ الإعلان بنجاح.", ToastType.SUCCESS);
                setIsModalOpen(false);
                fetchAnnouncements();
            } else {
                throw res.error;
            }
        } catch (e: any) {
            addToast(`خطأ: ${e.message}`, ToastType.ERROR);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("حذف هذا الإعلان نهائياً؟")) return;
        const res = await deleteAnnouncement(id);
        if (res.success) {
            addToast("تم الحذف.", ToastType.SUCCESS);
            fetchAnnouncements();
        } else {
            addToast("فشل الحذف.", ToastType.ERROR);
        }
    };

    const toggleActive = async (item: Announcement) => {
        await updateAnnouncement(item.id, { isActive: !item.isActive });
        fetchAnnouncements();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-[var(--bg-tertiary)] p-4 rounded-3xl border border-[var(--border-primary)]">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                        <MegaphoneIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-black text-lg text-[var(--text-primary)]">قائمة الإعلانات</h3>
                        <p className="text-sm text-[var(--text-secondary)]">يمكنك إضافة أكثر من إعلان.</p>
                    </div>
                </div>
                <button 
                    onClick={() => { setEditingItem({}); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-lg transition-all active:scale-95"
                >
                    <PlusIcon className="w-4 h-4"/> جديد
                </button>
            </div>

            {isLoading ? <div className="text-center py-10"><Loader /></div> : (
                <div className="grid gap-4">
                    {announcements.map(ad => (
                        <div key={ad.id} className={`p-5 rounded-3xl border transition-all ${ad.isActive ? 'bg-[var(--bg-secondary)] border-[var(--border-primary)] shadow-sm' : 'bg-[var(--bg-tertiary)] border-transparent opacity-60'}`}>
                            <div className="flex flex-col md:flex-row gap-4 items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex-shrink-0 overflow-hidden border border-[var(--border-primary)]">
                                        {ad.imageUrl ? <img src={ad.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><PhotoIcon className="w-6 h-6 text-[var(--text-secondary)] opacity-60"/></div>}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-lg text-[var(--text-primary)] mb-1">{ad.title}</h4>
                                        <p className="text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed">{ad.content}</p>
                                        <div className="flex gap-2 mt-2">
                                            {ad.isActive && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-sm font-black rounded-lg border border-emerald-500/20">نشط</span>}
                                            {ad.linkUrl && <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-sm font-black rounded-lg border border-blue-500/20 flex items-center gap-1"><LinkIcon className="w-3 h-3"/> رابط</span>}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0 border-t md:border-t-0 border-[var(--border-primary)] pt-3 md:pt-0">
                                    <button onClick={() => toggleActive(ad)} className={`flex-1 md:flex-none py-2 px-3 rounded-xl font-bold text-sm transition-all ${ad.isActive ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white' : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white'}`}>
                                        {ad.isActive ? 'تعطيل' : 'تفعيل'}
                                    </button>
                                    <button onClick={() => { setEditingItem(ad); setIsModalOpen(true); }} className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-blue-500 hover:bg-blue-500/10 transition-all"><PencilIcon className="w-4 h-4"/></button>
                                    <button onClick={() => handleDelete(ad.id)} className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-all"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {announcements.length === 0 && <div className="text-center py-10 opacity-50 font-bold">لا توجد إعلانات مضافة.</div>}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem.id ? "تعديل الإعلان" : "إضافة إعلان جديد"}>
                <div className="space-y-4">
                    <AdInput label="العنوان الرئيسي" name="title" value={editingItem.title || ''} onChange={e => setEditingItem({...editingItem, title: e.target.value})} placeholder="تنبيه هام..." />
                    <AdTextarea label="نص الإعلان" name="content" value={editingItem.content || ''} onChange={e => setEditingItem({...editingItem, content: e.target.value})} placeholder="تفاصيل الإعلان..." rows={4} />
                    <AdInput label="رابط التوجيه (اختياري)" name="linkUrl" value={editingItem.linkUrl || ''} onChange={e => setEditingItem({...editingItem, linkUrl: e.target.value})} placeholder="https://..." icon={LinkIcon} />
                    
                    <div className="bg-[var(--bg-tertiary)] p-4 rounded-2xl border border-[var(--border-primary)]">
                        <label className="text-sm font-black uppercase text-[var(--text-secondary)] mb-2 block">صورة الإعلان</label>
                        <ImageUpload label="" value={editingItem.imageUrl || ''} onChange={v => setEditingItem({...editingItem, imageUrl: v})} />
                    </div>

                    <div className="flex justify-end pt-4">
                         <button onClick={handleSave} disabled={isSaving} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50">
                             {isSaving ? 'جاري الحفظ...' : 'حفظ الإعلان'}
                         </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AdControl;
