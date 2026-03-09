
import React, { useState, useEffect } from 'react';
import { Course, CourseVideo, Teacher, ToastType } from '../../types';
import { createCourse, updateCourse } from '../../services/storageService';
import { useToast } from '../../useToast';
import Modal from '../common/Modal';
import ImageUpload from '../common/ImageUpload';
import { PlusIcon, PencilIcon, TrashIcon, VideoCameraIcon, UserCircleIcon, UsersIcon } from '../common/Icons';
import VideoModal from './VideoModal';

interface CourseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    course: Course | null;
    teachers: Teacher[];
}

const CourseModal: React.FC<CourseModalProps> = ({ isOpen, onClose, onSave, course, teachers }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState<Partial<Course>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isVidoModalOpen, setIsVideoModalOpen] = useState(false);
    const [editingVideo, setEditingVideo] = useState<{ video: CourseVideo, index: number } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(course || { isFree: false, price: 0, videos: [] });
        }
    }, [course, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            // Force price to 0 if marking as free
            setFormData(prev => ({ ...prev, [name]: checked, price: checked ? 0 : prev.price }));
        } else if (type === 'number') {
            // Handle empty string correctly so it doesn't become NaN, but 0 or current val if typing
            const numVal = value === '' ? 0 : parseFloat(value);
            setFormData(prev => ({ ...prev, [name]: numVal }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.teacherId) {
            addToast('الرجاء ملء العنوان وتعيين المدرس المسؤول.', ToastType.ERROR);
            return;
        }

        setIsSaving(true);
        try {
            // Ensure isFree is explicit boolean
            const cleanData = { ...formData, isFree: !!formData.isFree };

            if (course) { // Editing
                const { error } = await updateCourse(course.id, cleanData);
                if (error) throw error;
                addToast('تم تحديث الكورس بنجاح!', ToastType.SUCCESS);
            } else { // Creating
                const { error } = await createCourse(cleanData as Omit<Course, 'id'>);
                 if (error) throw error;
                addToast('تم إضافة الكورس للمدرس بنجاح!', ToastType.SUCCESS);
            }
            onSave();
        } catch (error: any) {
            addToast(`حدث خطأ: ${error.message}`, ToastType.ERROR);
        } finally {
            setIsSaving(false);
        }
    };

    const handleVideoSave = (video: CourseVideo) => {
        setFormData(prev => {
            const videos = [...(prev.videos || [])];
            if (editingVideo) {
                videos[editingVideo.index] = video;
            } else {
                videos.push(video);
            }
            return { ...prev, videos };
        });
        setIsVideoModalOpen(false);
        setEditingVideo(null);
    };

    const handleVideoDelete = (index: number) => {
        setFormData(prev => {
            const videos = [...(prev.videos || [])];
            videos.splice(index, 1);
            return { ...prev, videos };
        });
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={course ? 'تعديل الكورس' : 'إنشاء كورس جديد'} maxWidth="max-w-4xl">
                <form onSubmit={handleFormSubmit}>
                    <div className="max-h-[70vh] overflow-y-auto p-1 -m-1 pr-2 -mr-2">
                        
                        {/* Teacher Assignment Section - Highly Visible */}
                        <div className="mb-8 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-100 dark:border-indigo-800 rounded-3xl p-6">
                            <h3 className="font-black text-indigo-600 dark:text-indigo-400 text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                                <UsersIcon className="w-5 h-5" /> ربط بالكادر التعليمي
                            </h3>
                            <div className="relative group">
                                <select 
                                    name="teacherId" 
                                    value={formData.teacherId || ''} 
                                    onChange={handleChange} 
                                    required 
                                    className="w-full p-4 pl-12 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-2xl font-bold text-lg text-[var(--text-primary)] appearance-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                >
                                    <option value="">-- اختر المدرس المسؤول --</option>
                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500">
                                    <UserCircleIcon className="w-6 h-6" />
                                </div>
                            </div>
                            <p className="text-sm text-indigo-400 font-bold mt-2 mr-1">سيتم إضافة هذا الكورس إلى الصفحة الخاصة بالمدرس المختار.</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                            {/* Left Column */}
                            <div className="lg:col-span-3 space-y-6">
                                <div className="bg-[var(--bg-tertiary)] p-4 rounded-3xl border border-[var(--border-primary)] space-y-4">
                                    <h3 className="font-bold text-sm text-[var(--text-secondary)] uppercase tracking-wider">تفاصيل الكورس</h3>
                                    <input type="text" name="title" placeholder="عنوان الكورس (مثال: المراجعة النهائية للفيزياء)" value={formData.title || ''} onChange={handleChange} className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl focus:border-[var(--accent-primary)] font-bold outline-none" required />
                                    <textarea name="description" placeholder="وصف محتوى الكورس وما سيتعلمه الطالب..." value={formData.description || ''} onChange={handleChange} className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl focus:border-[var(--accent-primary)] font-medium outline-none h-24 resize-none"></textarea>
                                </div>
                                <div className="bg-[var(--bg-tertiary)] p-4 rounded-3xl border border-[var(--border-primary)] space-y-4">
                                    <h3 className="font-bold text-sm text-[var(--text-secondary)] uppercase tracking-wider">التسعير</h3>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center cursor-pointer p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-[var(--border-primary)] transition-all">
                                            <input type="checkbox" name="isFree" checked={!!formData.isFree} onChange={handleChange} className="h-5 w-5 rounded text-purple-600 focus:ring-purple-500" />
                                            <span className="mr-3 text-sm font-bold text-[var(--text-primary)]">كورس مجاني</span>
                                        </label>
                                        {!formData.isFree && (
                                            <div className="relative flex-1">
                                                <input type="number" name="price" placeholder="السعر" value={formData.price} onChange={handleChange} className="w-full p-3 pr-12 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl font-bold outline-none focus:border-[var(--accent-primary)]" />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-secondary)]">ج.م</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-[var(--bg-tertiary)] p-4 rounded-3xl border border-[var(--border-primary)]">
                                     <h3 className="font-bold text-sm text-[var(--text-secondary)] uppercase tracking-wider mb-2">المرفقات</h3>
                                     <input type="text" name="pdfUrl" placeholder="رابط ملف PDF (اختياري)" value={formData.pdfUrl || ''} onChange={handleChange} className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl outline-none font-mono text-sm text-left" dir="ltr" />
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-[var(--bg-tertiary)] p-4 rounded-3xl border border-[var(--border-primary)]">
                                    <h3 className="font-bold text-sm text-[var(--text-secondary)] uppercase tracking-wider mb-3">صورة الغلاف</h3>
                                    <ImageUpload label="" value={formData.coverImage || ''} onChange={value => setFormData(prev => ({...prev, coverImage: value}))} />
                                </div>

                                <div className="bg-[var(--bg-tertiary)] p-4 rounded-3xl border border-[var(--border-primary)] h-full flex flex-col">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-sm text-[var(--text-secondary)] uppercase tracking-wider">فيديوهات الكورس</h3>
                                        <button type="button" onClick={() => { setEditingVideo(null); setIsVideoModalOpen(true); }} className="flex items-center gap-1 text-sm text-white bg-purple-600 px-3 py-1.5 rounded-lg font-bold hover:bg-purple-700 transition-colors"><PlusIcon className="w-3 h-3"/> إضافة فيديو</button>
                                    </div>
                                    <div className="space-y-2 flex-1 overflow-y-auto max-h-48 custom-scrollbar">
                                        {(formData.videos || []).map((video, index) => (
                                            <div key={video.id || index} className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] group hover:border-[var(--accent-primary)]/30 transition-all">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)]">
                                                        <VideoCameraIcon className="w-4 h-4"/>
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-bold truncate text-[var(--text-primary)]">{video.title}</span>
                                                        {video.isFree && <span className="text-sm text-green-500 font-bold">مجاني</span>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button type="button" onClick={() => { setEditingVideo({video, index}); setIsVideoModalOpen(true); }} className="p-1.5 text-[var(--text-secondary)] hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"><PencilIcon className="w-3.5 h-3.5"/></button>
                                                    <button type="button" onClick={() => handleVideoDelete(index)} className="p-1.5 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><TrashIcon className="w-3.5 h-3.5"/></button>
                                                </div>
                                            </div>
                                        ))}
                                        {(formData.videos || []).length === 0 && (
                                            <div className="text-center py-8 opacity-70">
                                                <VideoCameraIcon className="w-8 h-8 mx-auto mb-2"/>
                                                <p className="text-sm font-bold">لا توجد فيديوهات</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                    <div className="flex justify-end pt-6 mt-2 border-t border-[var(--border-primary)]">
                        <button type="submit" disabled={isSaving} className="px-8 py-3 font-black text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 disabled:opacity-60 shadow-lg shadow-indigo-500/30 transition-all transform active:scale-95 flex items-center gap-2">
                            <PlusIcon className="w-5 h-5" />
                            {isSaving ? 'جاري المعالجة...' : (course ? 'حفظ التعديلات' : 'إنشاء الكورس')}
                        </button>
                    </div>
                </form>
            </Modal>
            
            <VideoModal
                isOpen={isVidoModalOpen}
                onClose={() => setIsVideoModalOpen(false)}
                onSave={handleVideoSave}
                video={editingVideo?.video || null}
            />
        </>
    );
};

export default CourseModal;
