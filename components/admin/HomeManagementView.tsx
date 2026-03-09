
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Book, ToastType, Teacher } from '../../types';
import { 
    getFeaturedCourses, addFeaturedCourse, updateFeaturedCourse, deleteFeaturedCourse,
    getFeaturedBooks, addFeaturedBook, updateFeaturedBook, deleteFeaturedBook
} from '../../services/storageService';
import { getAllTeachers } from '../../services/teacherService';
import Modal from '../common/Modal';
import { PlusIcon, PencilIcon, TrashIcon, BookBookmarkIcon, TemplateIcon, SearchIcon } from '../common/Icons';
import { useToast } from '../../useToast';
import ImageUpload from '../common/ImageUpload';
import Loader from '../common/Loader';

// --- Premium Card Component (Responsive: Horizontal on Mobile, Vertical on Desktop) ---
const ContentCard: React.FC<{ 
    title: string; 
    subtitle: string; 
    image: string; 
    price: number;
    meta?: string;
    onEdit: () => void; 
    onDelete: () => void; 
}> = ({ title, subtitle, image, price, meta, onEdit, onDelete }) => (
    <div className="group relative bg-[var(--bg-secondary)] rounded-3xl overflow-hidden border border-[var(--border-primary)] shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 flex flex-row md:flex-col h-32 md:h-auto">
        {/* Image Container - Fixed width on mobile, Full on desktop */}
        <div className="relative w-32 md:w-full h-full md:h-48 flex-shrink-0 overflow-hidden">
            <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
            
            {/* Price Tag */}
            <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-white/20 backdrop-blur-md border border-white/20 text-white px-2 py-0.5 md:px-3 md:py-1 rounded-full text-sm md:text-sm font-bold">
                {price > 0 ? `${price} EGP` : 'مجاني'}
            </div>
        </div>

        {/* Content Body */}
        <div className="p-3 md:p-5 flex flex-col flex-grow justify-between min-w-0">
            <div>
                <h3 className="text-sm md:text-lg font-black text-[var(--text-primary)] mb-1 line-clamp-1 truncate">{title}</h3>
                <p className="text-sm md:text-sm text-[var(--text-secondary)] font-medium mb-1 md:mb-3 line-clamp-1 truncate">{subtitle}</p>
                
                {meta && (
                    <div className="hidden md:inline-block px-2 py-1 bg-[var(--bg-tertiary)] rounded-md text-sm font-bold text-[var(--text-secondary)] mb-4">
                        {meta}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-auto pt-2 md:pt-4 border-t-0 md:border-t border-[var(--border-primary)] opacity-100 md:opacity-0 md:translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                <button onClick={onEdit} className="flex-1 py-1.5 md:py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--accent-primary)] hover:text-white text-[var(--text-secondary)] rounded-lg md:rounded-xl text-sm md:text-sm font-bold transition-colors flex items-center justify-center gap-2">
                    <PencilIcon className="w-3 h-3"/> <span className="hidden md:inline">تعديل</span>
                </button>
                <button onClick={onDelete} className="w-8 md:w-10 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg md:rounded-xl transition-colors">
                    <TrashIcon className="w-3.5 h-3.5 md:w-4 md:h-4"/>
                </button>
            </div>
        </div>
    </div>
);

const StatBadge: React.FC<{ label: string; value: number; color: string; icon: React.FC<any> }> = ({ label, value, color, icon: Icon }) => (
    <div className={`flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-sm transition-transform hover:-translate-y-1`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} bg-opacity-10`}>
            <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <div>
            <p className="text-sm text-[var(--text-secondary)] font-medium">{label}</p>
            <p className="text-2xl font-black text-[var(--text-primary)]">{value}</p>
        </div>
    </div>
);

const HomeManagementView: React.FC = () => {
    const [dataVersion, setDataVersion] = useState(0);
    const { addToast } = useToast();
    const [modalState, setModalState] = useState<{ type: string | null; data: any }>({ type: null, data: {} });
    const [formData, setFormData] = useState<any>({});
    const [activeTab, setActiveTab] = useState<'courses' | 'books'>('courses');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    
    const [courses, setCourses] = useState<any[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);

    const refreshData = useCallback(() => setDataVersion(v => v + 1), []);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const [c, b, t] = await Promise.all([
                getFeaturedCourses(),
                getFeaturedBooks(),
                getAllTeachers()
            ]);
            setCourses(c);
            setBooks(b as Book[]);
            setTeachers(t);
            setIsLoading(false);
        };
        fetchData();
    }, [dataVersion]);

    const openModal = (type: string, data = {}) => {
        setFormData(data);
        setModalState({ type, data });
    };
    
    const closeModal = () => {
        setModalState({ type: null, data: {} });
        setFormData({});
    };

    const handleSave = () => {
        const { type, data } = modalState;
        switch(type) {
            case 'edit-course': updateFeaturedCourse({ ...data, ...formData }); break;
            case 'add-course': addFeaturedCourse(formData); break;
            case 'edit-book': updateFeaturedBook({ ...data, ...formData }); break;
            case 'add-book': addFeaturedBook(formData); break;
        }
        addToast('تم الحفظ بنجاح', ToastType.SUCCESS);
        refreshData();
        closeModal();
    };

    const handleDelete = () => {
        const { type, data } = modalState;
         switch(type) {
            case 'delete-course': deleteFeaturedCourse(data.id); break;
            case 'delete-book': deleteFeaturedBook(data.id); break;
        }
        addToast('تم الحذف بنجاح', ToastType.SUCCESS);
        refreshData();
        closeModal();
    };

    const filteredItems = useMemo(() => {
        const list = activeTab === 'courses' ? courses : books;
        return list.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [activeTab, courses, books, searchQuery]);

    const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);

    if (isLoading) return <div className="flex justify-center items-center h-96"><Loader /></div>;

    return (
        <div className="fade-in space-y-8 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">إدارة الواجهة</h1>
                    <p className="text-[var(--text-secondary)] mt-2 text-lg">التحكم في المحتوى المميز المعروض للزوار.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative group w-full md:w-auto">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition-opacity"></div>
                        <button 
                            onClick={() => openModal(activeTab === 'courses' ? 'add-course' : 'add-book')} 
                            className="relative w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl font-bold text-[var(--text-primary)] transition-all"
                        >
                            <PlusIcon className="w-5 h-5 text-purple-500" />
                            <span>{activeTab === 'courses' ? 'كورس جديد' : 'كتاب جديد'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <StatBadge label="الكورسات المميزة" value={courses.length} color="bg-purple-500" icon={TemplateIcon} />
                <StatBadge label="الكتب والملازم" value={books.length} color="bg-blue-500" icon={BookBookmarkIcon} />
            </div>

            {/* Content Controls */}
            <div className="bg-[var(--bg-secondary)] p-2 rounded-2xl border border-[var(--border-primary)] flex flex-col md:flex-row gap-4 shadow-sm">
                <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-xl w-full md:w-auto">
                    <button onClick={() => setActiveTab('courses')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'courses' ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)]'}`}>
                        الكورسات
                    </button>
                    <button onClick={() => setActiveTab('books')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'books' ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)]'}`}>
                        الكتب
                    </button>
                </div>
                <div className="relative flex-1">
                    <input 
                        type="text" 
                        placeholder="ابحث في المحتوى..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-full pl-4 pr-12 py-3 md:py-2 bg-[var(--bg-tertiary)] rounded-xl border-none text-[var(--text-primary)] focus:ring-2 focus:ring-purple-500 transition-all placeholder-[var(--text-secondary)]"
                    />
                    <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                </div>
            </div>

            {/* Grid Content - Single Column on Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredItems.map(item => (
                    <ContentCard
                        key={item.id}
                        title={item.title}
                        subtitle={activeTab === 'courses' ? teacherMap.get(item.teacherId) || '' : item.teacherName}
                        image={item.coverImage}
                        price={item.price}
                        meta={activeTab === 'courses' ? `${item.videoCount || 0} فيديو` : 'كتاب PDF'}
                        onEdit={() => openModal(activeTab === 'courses' ? 'edit-course' : 'edit-book', item)}
                        onDelete={() => openModal(activeTab === 'courses' ? 'delete-course' : 'delete-book', item)}
                    />
                ))}
            </div>

            {/* Common Modal */}
            <Modal isOpen={!!modalState.type} onClose={closeModal} title={modalState.type?.includes('add') ? 'إضافة محتوى' : modalState.type?.includes('delete') ? 'تأكيد الحذف' : 'تعديل المحتوى'}>
                {modalState.type?.includes('delete') ? (
                    <div className="text-center py-4">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><TrashIcon className="w-8 h-8" /></div>
                        <p className="text-lg font-bold text-[var(--text-primary)] mb-2">هل أنت متأكد؟</p>
                        <p className="text-[var(--text-secondary)] mb-6">سيتم حذف هذا العنصر نهائياً من الواجهة الرئيسية.</p>
                        <div className="flex justify-center gap-3">
                            <button onClick={closeModal} className="px-6 py-3 rounded-xl bg-[var(--bg-tertiary)] font-bold text-[var(--text-secondary)]">إلغاء</button>
                            <button onClick={handleDelete} className="px-6 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-500/30">نعم، حذف</button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <input name="title" placeholder="العنوان الرئيسي" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} className="premium-input w-full" required />
                                {activeTab === 'courses' ? (
                                    <select name="teacherId" value={formData.teacherId || ''} onChange={e => setFormData({...formData, teacherId: e.target.value})} className="premium-input w-full" required>
                                        <option value="">اختر المدرس</option>
                                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                ) : (
                                    <input name="teacherName" placeholder="اسم المدرس/المؤلف" value={formData.teacherName || ''} onChange={e => setFormData({...formData, teacherName: e.target.value})} className="premium-input w-full" />
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" name="price" placeholder="السعر" value={formData.price || ''} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="premium-input w-full" />
                                    {activeTab === 'courses' && <input type="number" name="videoCount" placeholder="عدد الفيديوهات" value={formData.videoCount || ''} onChange={e => setFormData({...formData, videoCount: Number(e.target.value)})} className="premium-input w-full" />}
                                </div>
                                <textarea name="description" placeholder="وصف مختصر..." value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="premium-input w-full rounded-2xl resize-none" rows={3}></textarea>
                            </div>
                            <div className="bg-[var(--bg-tertiary)] p-4 rounded-2xl border border-[var(--border-primary)] text-center h-full flex flex-col justify-center">
                                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-4">صورة الغلاف</label>
                                <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/20 mb-4 border-2 border-dashed border-[var(--border-primary)] relative">
                                    {formData.coverImage ? <img src={formData.coverImage} className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-[var(--text-secondary)] opacity-50"><TemplateIcon className="w-8 h-8"/></div>}
                                </div>
                                <ImageUpload label="" value={formData.coverImage || ''} onChange={v => setFormData({...formData, coverImage: v})} />
                            </div>
                        </div>
                        <div className="flex justify-end pt-4 border-t border-[var(--border-primary)]">
                            <button type="submit" className="px-8 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95">حفظ البيانات</button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default HomeManagementView;
