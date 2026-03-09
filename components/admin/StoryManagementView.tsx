
import React, { useState, useEffect, useCallback } from 'react';
import { Story, ToastType, CartoonMovie } from '../../types';
import { addStory, getStories, deleteStory, deleteExpiredStories } from '../../services/storageService';
import { getAllCartoonMovies } from '../../services/movieService';
import { useToast } from '../../useToast';
import { PlusIcon, TrashIcon, CheckCircleIcon, ClockIcon, StarIcon, VideoCameraIcon, PhotoIcon, DocumentTextIcon, FilmIcon, XIcon, SparklesIcon, ChevronDownIcon, BellIcon } from '../common/Icons';
import Loader from '../common/Loader';
import ImageUpload from '../common/ImageUpload';
import Modal from '../common/Modal';
import { broadcastMessage, NotificationSeverity } from '../../services/notificationService';
import { useSession } from '../../hooks/useSession';


const StoryCard: React.FC<{ story: Story; onDelete: () => void }> = ({ story, onDelete }) => {
    const isExpired = !story.is_permanent && story.expires_at && new Date(story.expires_at) < new Date();

    return (
        <div className={`bg-[var(--bg-secondary)] rounded-2xl p-4 border border-[var(--border-primary)] shadow-sm relative group overflow-hidden ${isExpired ? 'opacity-60' : ''}`}>
            {isExpired && <div className="absolute inset-0 bg-black/10 z-10 flex items-center justify-center font-bold text-red-500 bg-white/80 dark:bg-black/50 backdrop-blur-sm">منتهية الصلاحية</div>}

            <div className="absolute top-2 left-2 z-20 flex gap-1">
                {story.is_permanent ? (
                    <span className="bg-yellow-500 text-white text-sm px-2 py-0.5 rounded-full font-bold shadow-sm">دائم</span>
                ) : (
                    <span className="bg-blue-500 text-white text-sm px-2 py-0.5 rounded-full font-bold shadow-sm">12 ساعة</span>
                )}
                <span className={`text-sm px-2 py-0.5 rounded-full font-bold shadow-sm uppercase ${story.category === 'movies' ? 'bg-red-600 text-white' : 'bg-gray-700 text-white'}`}>
                    {story.category === 'movies' ? 'أفلام' : 'عام'}
                </span>
            </div>

            <button onClick={onDelete} className="absolute top-2 right-2 z-20 p-2 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600 active:scale-90">
                <TrashIcon className="w-5 h-5" />
            </button>

            <div className="h-32 rounded-xl bg-[var(--bg-tertiary)] overflow-hidden mb-3 flex items-center justify-center relative border border-[var(--border-primary)]">
                {story.type === 'image' && <img src={story.content} className="w-full h-full object-cover" />}
                {story.type === 'text' && <p className="p-2 text-center text-sm font-bold text-[var(--text-primary)] line-clamp-4">{story.content}</p>}
                {story.type === 'movie' && (
                    <div className="text-center w-full h-full relative">
                        <img src={story.movie_data?.posterUrl} className="absolute inset-0 w-full h-full object-cover opacity-50 blur-sm" />
                        <div className="relative z-10 flex flex-col h-full items-center justify-center bg-black/20 p-2">
                            <FilmIcon className="w-8 h-8 text-white drop-shadow-md mb-1" />
                            <p className="text-sm font-bold text-white drop-shadow-md px-1 truncate w-full text-center">{story.movie_data?.title}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center text-sm text-[var(--text-secondary)] font-mono">
                <span>{new Date(story.created_at).toLocaleDateString()}</span>
                {story.expires_at && <span>إلى: {new Date(story.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
            </div>
        </div>
    );
};

const StoryManagementView: React.FC = () => {
    const { addToast } = useToast();
    const { currentUser: adminUser } = useSession();
    const [stories, setStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<'main' | 'movies'>('main');
    const [moviesList, setMoviesList] = useState<CartoonMovie[]>([]);
    const [activeTab, setActiveTab] = useState<'stories' | 'notifications'>('stories');

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newStoryType, setNewStoryType] = useState<'image' | 'text' | 'movie'>('image');
    const [newStoryContent, setNewStoryContent] = useState('');
    const [isPermanent, setIsPermanent] = useState(false);
    const [selectedMovieId, setSelectedMovieId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Notification State
    const [notifTitle, setNotifTitle] = useState('');
    const [notifBody, setNotifBody] = useState('');
    const [notifSeverity, setNotifSeverity] = useState<NotificationSeverity>('info');
    const [notifExpiry, setNotifExpiry] = useState<number>(24);
    const [notifTarget, setNotifTarget] = useState<'all' | 'students' | 'teachers'>('students');
    const [isSendingNotif, setIsSendingNotif] = useState(false);


    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const data = await getStories(activeCategory);
        setStories(data);

        if (moviesList.length === 0) {
            const m = await getAllCartoonMovies();
            setMoviesList(m);
        }

        setIsLoading(false);
    }, [activeCategory, moviesList.length]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddStory = async () => {
        if (newStoryType === 'text' && !newStoryContent.trim()) {
            addToast('الرجاء إدخال النص.', ToastType.ERROR);
            return;
        }
        if (newStoryType === 'image' && !newStoryContent) {
            addToast('الرجاء رفع صورة.', ToastType.ERROR);
            return;
        }
        if (newStoryType === 'movie' && !selectedMovieId) {
            addToast('الرجاء اختيار فيلم.', ToastType.ERROR);
            return;
        }

        setIsSubmitting(true);
        try {
            let contentToSave = newStoryContent;
            let movieData = undefined;

            if (newStoryType === 'movie') {
                const movie = moviesList.find(m => m.id === selectedMovieId);
                if (movie) {
                    contentToSave = movie.id;
                    movieData = { title: movie.title, posterUrl: movie.posterUrl, type: movie.type };
                }
            }

            const { error } = await addStory({
                type: newStoryType,
                content: contentToSave,
                category: activeCategory,
                is_permanent: isPermanent,
                movie_data: movieData
            });

            if (error) throw error;

            addToast('تمت إضافة الحالة بنجاح!', ToastType.SUCCESS);
            setIsAddModalOpen(false);
            setNewStoryContent('');
            setSelectedMovieId('');
            fetchData();
        } catch (e: any) {
            addToast(`خطأ: ${e.message}`, ToastType.ERROR);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteStory = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه الحالة؟')) return;
        const { error } = await deleteStory(id);
        if (error) addToast('فشل الحذف.', ToastType.ERROR);
        else {
            addToast('تم الحذف.', ToastType.SUCCESS);
            setStories(prev => prev.filter(s => s.id !== id));
        }
    };

    const handleCleanExpired = async () => {
        if (!confirm('حذف جميع الحالات منتهية الصلاحية؟')) return;
        const { count, error } = await deleteExpiredStories();
        if (error) addToast('فشل التنظيف.', ToastType.ERROR);
        else {
            addToast(`تم حذف ${count} حالة منتهية.`, ToastType.SUCCESS);
            fetchData();
        }
    };

    const handleSendNotification = async () => {
        if (!notifTitle.trim() || !notifBody.trim()) {
            addToast('الرجاء إدخال العنوان والمحتوى.', ToastType.ERROR);
            return;
        }
        if (!adminUser) {
            addToast('لا يمكن تحديد المدير. يرجى إعادة تسجيل الدخول.', ToastType.ERROR);
            return;
        }
        setIsSendingNotif(true);
        try {
            const result = await broadcastMessage({
                title: notifTitle,
                body: notifBody,
                target: notifTarget,
                severity: notifSeverity,
                channel: 'both',
                expiresInHours: notifExpiry,
                adminId: adminUser.id,
                adminName: adminUser.name,
            });

            if (!result.success) throw new Error(result.error || 'فشل الإرسال');

            addToast(`✅ تم إرسال الإشعار لـ ${result.recipientCount} مستخدم!`, ToastType.SUCCESS);
            setNotifTitle('');
            setNotifBody('');
        } catch (e: any) {
            addToast(`خطأ: ${e.message}`, ToastType.ERROR);
        } finally {
            setIsSendingNotif(false);
        }
    };

    return (

        <div className="fade-in space-y-6 pb-32 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-primary)]">إدارة الاستوري والإشعارات</h1>
                    <p className="text-[var(--text-secondary)] mt-1 font-bold">تحكم في الحالات المعروضة وإرسال التنبيهات.</p>
                </div>

                <div className="flex gap-2 w-full md:w-auto bg-[var(--bg-secondary)] p-1.5 rounded-2xl border border-[var(--border-primary)] shadow-sm">
                    <button
                        onClick={() => setActiveTab('stories')}
                        title="تبويب الاستوري"
                        className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-sm font-black transition-all duration-300 flex items-center gap-2 justify-center ${activeTab === 'stories' ? 'bg-indigo-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                    >
                        <PhotoIcon className="w-5 h-5" /> الاستوري
                    </button>
                    <button
                        onClick={() => setActiveTab('notifications')}
                        title="تبويب التنبيهات"
                        className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-sm font-black transition-all duration-300 flex items-center gap-2 justify-center ${activeTab === 'notifications' ? 'bg-rose-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                    >
                        <BellIcon className="w-5 h-5" /> التنبيهات
                    </button>
                </div>
            </div>

            {activeTab === 'stories' ? (
                <>
                    <div className="sticky top-0 z-30 py-2 bg-[var(--bg-primary)]/80 backdrop-blur-md flex justify-between items-center gap-4">
                        <div className="flex bg-[var(--bg-secondary)] p-1.5 rounded-2xl w-full md:w-fit border border-[var(--border-primary)] shadow-sm">
                            <button
                                onClick={() => setActiveCategory('main')}
                                className={`flex-1 md:flex-none px-10 py-3 rounded-xl text-sm font-black transition-all duration-300 ${activeCategory === 'main' ? 'bg-indigo-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                            >
                                الحالة العامة للطلاب
                            </button>
                            <button
                                onClick={() => setActiveCategory('movies')}
                                className={`flex-1 md:flex-none px-10 py-3 rounded-xl text-sm font-black transition-all duration-300 ${activeCategory === 'movies' ? 'bg-indigo-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                            >
                                استوري الأفلام 🎬
                            </button>
                        </div>
                        <div className="hidden md:flex gap-2">
                            <button onClick={handleCleanExpired} className="px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-sm font-bold transition-all border border-red-500/20 flex items-center gap-2 active:scale-95" title="تنظيف المنتهية">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => setIsAddModalOpen(true)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2 active:scale-95" title="إضافة">
                                <PlusIcon className="w-5 h-5" /> إضافة
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-20"><Loader /></div>
                    ) : stories.length === 0 ? (
                        <div className="text-center py-32 bg-[var(--bg-secondary)] rounded-[2.5rem] border-2 border-dashed border-[var(--border-primary)] opacity-60">
                            <ClockIcon className="w-20 h-20 mx-auto mb-6 text-[var(--text-secondary)]" />
                            <p className="font-black text-lg">لا توجد حالات حالياً في هذا القسم</p>
                            <button onClick={() => setIsAddModalOpen(true)} className="mt-4 text-indigo-600 font-bold hover:underline">أنشئ أول حالة الآن</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                            {stories.map(story => (
                                <StoryCard key={story.id} story={story} onDelete={() => handleDeleteStory(story.id)} />
                            ))}
                        </div>
                    )}

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        title="إضافة"
                        className="md:hidden fixed bottom-8 left-8 z-[60] w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl border-4 border-white/20 flex items-center justify-center transition-transform active:scale-90 hover:scale-105"
                    >
                        <PlusIcon className="w-8 h-8" />
                    </button>
                </>
            ) : (
                <div className="max-w-3xl mx-auto space-y-6 pt-4">
                    <div className="bg-[var(--bg-secondary)] p-8 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                                <BellIcon className="w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-[var(--text-primary)]">إرسال إشعار جديد</h2>
                                <p className="text-[var(--text-secondary)] font-bold text-sm">سيظهر الإشعار كرسالة منبثقة للطلاب المختارين ويصل كإشعار للهاتف.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-black text-[var(--text-secondary)] mb-2 uppercase tracking-wide">عنوان الإشعار</label>
                                <input
                                    type="text"
                                    value={notifTitle}
                                    title="العنوان"
                                    onChange={(e) => setNotifTitle(e.target.value)}
                                    placeholder="مثال: تنبيه هام، عطلة رسمية، تحديث محتوى..."
                                    className="w-full p-4 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--border-primary)] outline-none focus:border-rose-500 font-bold transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-black text-[var(--text-secondary)] mb-2 uppercase tracking-wide">نص الإشعار</label>
                                <textarea
                                    value={notifBody}
                                    title="المحتوى"
                                    onChange={(e) => setNotifBody(e.target.value)}
                                    placeholder="اكتب تفاصيل الإشعار هنا..."
                                    className="w-full p-4 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--border-primary)] outline-none focus:border-rose-500 font-bold min-h-[120px] transition-all resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-black text-[var(--text-secondary)] mb-2 uppercase tracking-wide">النوع</label>
                                    <select
                                        value={notifSeverity}
                                        title="Severity"
                                        onChange={(e) => setNotifSeverity(e.target.value as NotificationSeverity)}
                                        className="w-full p-4 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--border-primary)] outline-none focus:border-rose-500 font-bold"
                                    >
                                        <option value="info">عادي (معلومة)</option>
                                        <option value="success">نجاح الإجراء (أخضر)</option>
                                        <option value="warning">تنبيه (أصفر)</option>
                                        <option value="urgent">عاجل جداً (أحمر)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-black text-[var(--text-secondary)] mb-2 uppercase tracking-wide">صلاحية ظهوره (ساعات)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        title="Expiry"
                                        value={notifExpiry}
                                        onChange={(e) => setNotifExpiry(Number(e.target.value))}
                                        className="w-full p-4 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--border-primary)] outline-none focus:border-rose-500 font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-black text-[var(--text-secondary)] mb-2 uppercase tracking-wide">الفئة المستهدفة</label>
                                <div className="flex gap-2">
                                    {[
                                        { id: 'students', label: 'الطلاب فقط' },
                                        { id: 'teachers', label: 'المدرسين فقط' },
                                        { id: 'all', label: 'الجميع' },
                                    ].map((target) => (
                                        <button
                                            key={target.id}
                                            onClick={() => setNotifTarget(target.id as any)}
                                            title="اختيار टारगेट"
                                            className={`flex-1 py-3 rounded-xl font-black text-sm transition-all border outline-none ${notifTarget === target.id ? 'bg-rose-50 border-rose-500 text-rose-600 dark:bg-rose-500/10' : 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-slate-300'}`}
                                        >
                                            {target.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleSendNotification}
                                disabled={isSendingNotif}
                                title="إرسال"
                                className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-rose-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                            >
                                {isSendingNotif ? (
                                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <><SparklesIcon className="w-6 h-6" /> بث الإشعار الآن</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={`نشر حالة: ${activeCategory === 'main' ? 'عامة' : 'أفلام'}`} maxWidth="max-w-xl">
                <div className="space-y-6">
                    <div className="flex bg-[var(--bg-tertiary)] p-1.5 rounded-2xl border border-[var(--border-primary)]">
                        {[
                            { id: 'image', label: 'صورة', icon: PhotoIcon },
                            { id: 'text', label: 'نص', icon: DocumentTextIcon },
                            { id: 'movie', label: 'ربط فيلم', icon: FilmIcon }
                        ].map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setNewStoryType(type.id as any)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${newStoryType === type.id ? 'bg-[var(--bg-secondary)] text-indigo-600 shadow-sm' : 'text-[var(--text-secondary)]'}`}
                            >
                                <type.icon className="w-4 h-4" /> {type.label}
                            </button>
                        ))}
                    </div>

                    <div className="animate-fade-in">
                        {newStoryType === 'image' && (
                            <ImageUpload label="صورة الحالة" value={newStoryContent} onChange={setNewStoryContent} />
                        )}
                        {newStoryType === 'text' && (
                            <textarea
                                value={newStoryContent}
                                onChange={e => setNewStoryContent(e.target.value)}
                                placeholder="اكتب نص الحالة هنا..."
                                className="w-full p-5 bg-[var(--bg-tertiary)] rounded-[1.5rem] border border-[var(--border-primary)] min-h-[140px] outline-none focus:border-indigo-500 text-center text-xl font-bold leading-relaxed shadow-inner"
                            />
                        )}
                        {newStoryType === 'movie' && (
                            <div className="space-y-4">
                                <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 text-sm font-bold text-blue-600 text-center">
                                    سيتم استخدام بوستر الفيلم كصورة للحالة وتفعيل زر المشاهدة المباشرة.
                                </div>
                                <label className="block text-sm font-black uppercase tracking-widest text-[var(--text-secondary)] mr-2">اختر من مكتبة الأفلام</label>
                                <div className="relative">
                                    <select
                                        value={selectedMovieId}
                                        onChange={e => setSelectedMovieId(e.target.value)}
                                        className="w-full p-4 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--border-primary)] outline-none focus:border-indigo-500 font-bold appearance-none"
                                    >
                                        <option value="">-- اختر من الأفلام المتاحة --</option>
                                        {moviesList.map(m => (
                                            <option key={m.id} value={m.id}>{m.title} ({m.type === 'movie' ? 'فيلم' : 'مسلسل'})</option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none opacity-50" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-indigo-500/5 p-5 rounded-[2rem] border border-indigo-500/10 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isPermanent ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white'}`}>
                                    {isPermanent ? <StarIcon className="w-6 h-6" /> : <ClockIcon className="w-6 h-6" />}
                                </div>
                                <div>
                                    <p className="font-black text-sm text-[var(--text-primary)]">{isPermanent ? 'حالة دائمة' : 'حالة مؤقتة'}</p>
                                    <p className="text-sm text-[var(--text-secondary)] font-bold">{isPermanent ? 'ستبقى ظاهرة للطلاب دائماً' : 'تختفي تلقائياً بعد 12 ساعة'}</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={isPermanent} onChange={e => setIsPermanent(e.target.checked)} className="sr-only peer" />
                                <div className="w-14 h-8 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-yellow-500 shadow-inner"></div>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 rounded-2xl bg-[var(--bg-tertiary)] font-black text-sm text-[var(--text-secondary)]">إلغاء</button>
                        <button onClick={handleAddStory} disabled={isSubmitting} className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl disabled:opacity-50 flex items-center justify-center gap-2">
                            {isSubmitting ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <><SparklesIcon className="w-5 h-5" /> نشر الآن</>}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default StoryManagementView;
