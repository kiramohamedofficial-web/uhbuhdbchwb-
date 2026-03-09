
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { User, Grade, Subscription, QuizAttempt, ToastType } from '../../types';
import { getAllUsers, getAllStudentProgress, getAllGrades, getAllQuizAttempts, deleteUser, updateUser, adminUpdateUserPassword } from '../../services/storageService';
import { logAdminAction } from '../../services/auditService';
import { getAllSubscriptions } from '../../services/subscriptionService';
import { useSession } from '../../hooks/useSession';
import { 
    SearchIcon, ChevronLeftIcon, UsersIcon, VideoCameraIcon, PencilIcon, 
    ChevronRightIcon, CheckCircleIcon, XCircleIcon, EnvelopeIcon, PhoneIcon, 
    ShieldExclamationIcon, TrashIcon, ChartBarIcon, ClockIcon, FilterIcon,
    ArrowUpIcon, ArrowDownIcon, UserCircleIcon, CreditCardIcon, BookOpenIcon,
    ClipboardIcon, LockClosedIcon
} from '../common/Icons';
import { useToast } from '../../useToast';
import Loader from '../common/Loader';
import Modal from '../common/Modal';

// --- مكونات فرعية للتصميم ---

const StatWidget: React.FC<{ icon: any, label: string, value: string | number, color: string }> = ({ icon: Icon, label, value, color }) => (
    <div className="bg-[var(--bg-secondary)] p-5 rounded-3xl border border-[var(--border-primary)] shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color.replace('text-', 'bg-').replace('500', '500/10')} ${color}`}>
            <Icon className="w-7 h-7" />
        </div>
        <div>
            <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-black text-[var(--text-primary)]">{value}</p>
        </div>
    </div>
);

const StudentCard: React.FC<{ 
    user: User; 
    gradeName: string; 
    subscription?: Subscription;
    stats: { watched: number; quizzes: number; progress: number };
    isActive: boolean; 
    onViewDetails: () => void;
    onEdit: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
    onCopy: (e: React.MouseEvent, text: string, type: string) => void;
}> = ({ user, gradeName, subscription, stats, isActive, onViewDetails, onEdit, onDelete, onCopy }) => {
    
    const subTypeLabel = useMemo(() => {
        if (!subscription) return 'مجاني';
        return subscription.teacherId ? 'مادة محددة' : 'باقة شاملة';
    }, [subscription]);

    return (
        <div 
            onClick={onViewDetails}
            className={`group relative bg-[var(--bg-secondary)] rounded-3xl border transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-2xl hover:-translate-y-1 ${isActive ? 'border-[var(--border-primary)] hover:border-emerald-500/30' : 'border-red-500/20 hover:border-red-500/40'}`}
        >
            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black text-white shadow-lg ${isActive ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gray-400 grayscale'}`}>
                            {user.imageUrl ? <img src={user.imageUrl} className="w-full h-full object-cover rounded-2xl" alt={user.name} /> : (user.name?.charAt(0) || '?')}
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-[var(--text-primary)] leading-tight line-clamp-1 max-w-[150px]">{user.name}</h3>
                            <p className="text-sm text-[var(--text-secondary)] font-bold mt-0.5">{gradeName}</p>
                        </div>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-sm font-black uppercase ${isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
                        {isActive ? 'نشط' : 'متوقف'}
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-[var(--bg-tertiary)] p-2 rounded-xl flex flex-col justify-center">
                        <span className="text-sm text-[var(--text-secondary)] mb-1 block">نوع الاشتراك</span>
                        <span className="text-sm font-black text-indigo-600 truncate">{subTypeLabel}</span>
                    </div>
                    <div className="bg-[var(--bg-tertiary)] p-2 rounded-xl flex flex-col justify-center">
                        <span className="text-sm text-[var(--text-secondary)] mb-1 block">نسبة الإنجاز</span>
                        <div className="flex items-center gap-2">
                             <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                 <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.progress}%` }}></div>
                             </div>
                             <span className="text-sm font-black">{stats.progress}%</span>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-primary)]">
                    <div className="flex items-center gap-2">
                        {user.phone && (
                            <button 
                                onClick={(e) => onCopy(e, user.phone, 'الهاتف')} 
                                className="w-8 h-8 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-indigo-500 hover:bg-indigo-500/10 flex items-center justify-center transition-colors"
                                title="نسخ الهاتف"
                            >
                                <PhoneIcon className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button 
                            onClick={onEdit} 
                            className="w-8 h-8 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-amber-500 hover:bg-amber-500/10 flex items-center justify-center transition-colors"
                            title="تعديل البيانات"
                        >
                            <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <button 
                            onClick={onDelete} 
                            className="w-8 h-8 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-colors"
                            title="حذف الحساب"
                        >
                            <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="text-sm font-mono font-bold text-[var(--text-secondary)] opacity-60">
                        {subscription ? new Date(subscription.endDate).toLocaleDateString('en-GB') : '---'}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StudentManagementView: React.FC<{ onViewDetails: (user: User) => void }> = ({ onViewDetails }) => {
    const { currentUser: admin } = useSession();
    const { addToast } = useToast();
    
    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [sortOption, setSortOption] = useState<'name' | 'newest'>('newest');

    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [subscriptions, setSubscriptions] = useState<Map<string, Subscription>>(new Map());
    const [allProgress, setAllProgress] = useState<any[]>([]);
    const [allQuizAttempts, setAllQuizAttempts] = useState<QuizAttempt[]>([]);
    const [allGrades, setAllGrades] = useState<Grade[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 24;

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [editFormData, setEditFormData] = useState<Partial<User>>({});

    // Fetch Data
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [users, subs, progress, grades, attempts] = await Promise.all([
                getAllUsers(),
                getAllSubscriptions(),
                getAllStudentProgress(),
                getAllGrades(),
                getAllQuizAttempts()
            ]);
            setAllGrades(grades);
            setAllUsers(users.filter(u => u.role === 'student'));
            setSubscriptions(new Map(subs.map(s => [s.userId, s])));
            setAllProgress(progress);
            setAllQuizAttempts(attempts);
        } catch (err) {
            addToast("خطأ في جلب البيانات", ToastType.ERROR);
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Helpers
    const calculateStudentStats = useCallback((user: User) => {
        const watched = allProgress.filter(p => p.student_id === user.id).length;
        const quizzes = allQuizAttempts.filter(a => a.userId === user.id).length;
        // تقريب بسيط للتقدم لغرض العرض
        const progress = Math.min(100, Math.round((watched * 2) + (quizzes * 5))); 
        return { watched, quizzes, progress };
    }, [allProgress, allQuizAttempts]);

    const filteredUsers = useMemo(() => {
        let result = allUsers.filter(user => {
            const query = searchQuery.toLowerCase();
            const matchesSearch = 
                (user.name || '').toLowerCase().includes(query) || 
                (user.phone || '').includes(query) ||
                (user.email || '').toLowerCase().includes(query);
            
            const matchesGrade = gradeFilter ? user.grade?.toString() === gradeFilter : true;
            
            const sub = subscriptions.get(user.id);
            const isActive = sub?.status === 'Active' && new Date(sub.endDate) >= new Date();
            const matchesStatus = statusFilter === 'all' ? true : 
                                  statusFilter === 'active' ? isActive : !isActive;

            return matchesSearch && matchesGrade && matchesStatus;
        });

        // Sorting
        result.sort((a, b) => {
            if (sortOption === 'name') return a.name.localeCompare(b.name);
            // Newest first based on ID (assuming sequential or time-based ID generation/insertion order from API)
            // Or if we had createdAt
            return 0; 
        });
        
        // Default to newest if no specific sort or ID based sort
        if (sortOption === 'newest') result.reverse();

        return result;
    }, [allUsers, searchQuery, gradeFilter, statusFilter, sortOption, subscriptions]);

    const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

    // Handlers
    const handleCopy = (e: React.MouseEvent, text: string, type: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        addToast(`تم نسخ ${type}`, ToastType.SUCCESS);
    };

    const handleDeleteClick = (e: React.MouseEvent, user: User) => {
        e.stopPropagation();
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const handleEditClick = (e: React.MouseEvent, user: User) => {
        e.stopPropagation();
        setUserToEdit(user);
        setEditFormData({
            name: user.name,
            email: user.email,
            phone: user.phone,
            guardianPhone: user.guardianPhone,
            grade: user.grade,
            track: user.track
        });
        setNewPassword('');
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userToEdit) return;
        setIsSaving(true);
        try {
            // Update profile data
            const { error } = await updateUser(userToEdit.id, editFormData);
            if (error) throw error;

            // Update password if provided
            if (newPassword.trim()) {
                const { error: passError } = await adminUpdateUserPassword(userToEdit.id, newPassword);
                if (passError) throw passError;
            }

            if (admin) {
                await logAdminAction(admin.id, admin.name, 'تعديل بيانات طالب', `قام المدير بتعديل بيانات الطالب: ${userToEdit.name}`, userToEdit.id, 'student');
            }

            addToast("تم تحديث بيانات الطالب بنجاح", ToastType.SUCCESS);
            fetchData();
            setIsEditModalOpen(false);
        } catch (err: any) {
            addToast(`فشل التحديث: ${err.message}`, ToastType.ERROR);
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        try {
            const { error } = await deleteUser(userToDelete.id);
            if (error) throw error;
            
            if (admin) {
                await logAdminAction(admin.id, admin.name, 'حذف طالب', `قام المدير بحذف حساب الطالب: ${userToDelete.name}`, userToDelete.id, 'student');
            }
            
            addToast("تم حذف الحساب بنجاح", ToastType.SUCCESS);
            fetchData();
            setIsDeleteModalOpen(false);
        } catch (e: any) {
            addToast(`فشل الحذف: ${e.message}`, ToastType.ERROR);
        } finally {
            setIsDeleting(false);
        }
    };

    const activeCount = useMemo(() => allUsers.filter(u => { const s = subscriptions.get(u.id); return s?.status === 'Active' && new Date(s.endDate) >= new Date(); }).length, [allUsers, subscriptions]);

    if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader /></div>;

    return (
        <div className="fade-in space-y-6 pb-32 relative min-h-screen">
            
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                 <StatWidget icon={UsersIcon} label="إجمالي الطلاب" value={allUsers.length} color="text-blue-500" />
                 <StatWidget icon={CheckCircleIcon} label="مشتركون نشطون" value={activeCount} color="text-emerald-500" />
                 <StatWidget icon={XCircleIcon} label="اشتراكات منتهية" value={allUsers.length - activeCount} color="text-red-500" />
                 <StatWidget icon={ChartBarIcon} label="نسبة التفاعل" value={`${allUsers.length > 0 ? Math.round((activeCount/allUsers.length)*100) : 0}%`} color="text-amber-500" />
            </div>

            {/* Sticky Controls Bar */}
            <div className="sticky top-0 z-40 pt-4 pb-2 -mx-4 px-4 sm:-mx-2 sm:px-2 bg-[var(--bg-primary)]/80 backdrop-blur-xl transition-all">
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-lg rounded-[1.5rem] sm:rounded-[2rem] p-2 flex flex-col md:flex-row gap-2 sm:gap-3 items-center">
                    
                    {/* Search Field - FIXED */}
                    <div className="relative flex-1 w-full md:w-auto group">
                        <input
                            type="text"
                            placeholder="بحث بالاسم، الهاتف، الإيميل..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-10 sm:h-12 bg-[var(--bg-tertiary)] border border-transparent focus:border-[var(--accent-primary)] rounded-xl sm:rounded-2xl pr-4 pl-10 sm:pl-12 text-sm sm:text-sm font-bold text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-secondary)] shadow-inner"
                        />
                        {/* Icon Positioned Absolute Left (End of Input in RTL) */}
                        <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--accent-primary)] transition-colors pointer-events-none">
                            <SearchIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                    </div>

                    {/* Filters & Sort */}
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
                         {/* Grade Filter */}
                        <div className="relative h-10 sm:h-12 min-w-[120px] sm:min-w-[140px] flex-shrink-0">
                            <select
                                value={gradeFilter}
                                onChange={(e) => setGradeFilter(e.target.value)}
                                className="w-full h-full pl-8 pr-3 sm:pr-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl sm:rounded-2xl text-sm sm:text-sm font-bold text-[var(--text-primary)] outline-none appearance-none focus:ring-2 focus:ring-[var(--accent-primary)] cursor-pointer"
                            >
                                <option value="">جميع الصفوف</option>
                                {allGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                            <FilterIcon className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--text-secondary)] pointer-events-none" />
                        </div>

                         {/* Status Filter */}
                         <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-xl sm:rounded-2xl border border-[var(--border-primary)] h-10 sm:h-12 flex-shrink-0">
                            {(['all', 'active', 'inactive'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setStatusFilter(f)}
                                    className={`px-3 sm:px-4 h-full rounded-lg sm:rounded-xl text-sm sm:text-sm font-black transition-all whitespace-nowrap ${statusFilter === f ? 'bg-[var(--bg-secondary)] text-[var(--accent-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                >
                                    {{all: 'الكل', active: 'نشط', inactive: 'منتهي'}[f]}
                                </button>
                            ))}
                        </div>

                        {/* Sort */}
                        <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-xl sm:rounded-2xl border border-[var(--border-primary)] h-10 sm:h-12 flex-shrink-0">
                             <button onClick={() => setSortOption('newest')} className={`px-3 sm:px-4 h-full rounded-lg sm:rounded-xl text-sm sm:text-sm font-black ${sortOption === 'newest' ? 'bg-[var(--bg-secondary)] text-[var(--accent-primary)] shadow-sm' : 'text-[var(--text-secondary)]'}`}>الأحدث</button>
                             <button onClick={() => setSortOption('name')} className={`px-3 sm:px-4 h-full rounded-lg sm:rounded-xl text-sm sm:text-sm font-black ${sortOption === 'name' ? 'bg-[var(--bg-secondary)] text-[var(--accent-primary)] shadow-sm' : 'text-[var(--text-secondary)]'}`}>الاسم</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Students Grid */}
            <div className="min-h-[400px]">
                {paginatedUsers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-slide-up">
                        {paginatedUsers.map((user) => {
                            const sub = subscriptions.get(user.id);
                            const isActive = sub?.status === 'Active' && new Date(sub.endDate) >= new Date();
                            const stats = calculateStudentStats(user);
                            const gradeName = allGrades.find(g => g.id === user.grade)?.name || 'غير محدد';

                            return (
                                <StudentCard
                                    key={user.id}
                                    user={user}
                                    gradeName={gradeName}
                                    subscription={sub}
                                    stats={stats}
                                    isActive={isActive}
                                    onViewDetails={() => onViewDetails(user)}
                                    onEdit={(e) => handleEditClick(e, user)}
                                    onDelete={(e) => handleDeleteClick(e, user)}
                                    onCopy={handleCopy}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 opacity-60">
                        <div className="w-24 h-24 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center border-4 border-dashed border-[var(--border-primary)] mb-6">
                            <UsersIcon className="w-10 h-10 text-[var(--text-secondary)]" />
                        </div>
                        <h3 className="text-xl font-bold text-[var(--text-primary)]">لا توجد نتائج</h3>
                        <p className="text-sm text-[var(--text-secondary)]">حاول تغيير كلمات البحث أو الفلاتر</p>
                    </div>
                )}
            </div>

            {/* Floating Pagination */}
            {totalPages > 1 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-[var(--bg-secondary)]/90 backdrop-blur-md p-2 rounded-2xl border border-[var(--border-primary)] shadow-2xl animate-fade-in-up">
                    <button 
                        onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                        disabled={currentPage === 1}
                        className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--accent-primary)] hover:text-white flex items-center justify-center transition-all disabled:opacity-60 disabled:hover:bg-[var(--bg-tertiary)] disabled:hover:text-[var(--text-secondary)]"
                    >
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>
                    
                    <span className="text-sm font-black text-[var(--text-primary)] px-2">
                        {currentPage} <span className="text-[var(--text-secondary)] text-sm font-normal">/ {totalPages}</span>
                    </span>

                    <button 
                        onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                        disabled={currentPage === totalPages}
                        className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--accent-primary)] hover:text-white flex items-center justify-center transition-all disabled:opacity-60 disabled:hover:bg-[var(--bg-tertiary)] disabled:hover:text-[var(--text-secondary)]"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Delete Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="حذف حساب الطالب">
                <div className="text-center p-4">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-50">
                        <ShieldExclamationIcon className="w-10 h-10 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">إجراء لا رجعة فيه</h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-xs mx-auto leading-relaxed">
                        أنت على وشك حذف حساب الطالب <strong className="text-red-600">{userToDelete?.name}</strong> وجميع بياناته بشكل نهائي.
                    </p>
                    <div className="flex justify-center gap-3">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="px-6 py-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-bold hover:bg-[var(--border-primary)] transition-colors">إلغاء</button>
                        <button onClick={handleConfirmDelete} disabled={isDeleting} className="px-6 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all disabled:opacity-50">
                            {isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="تعديل بيانات الطالب" maxWidth="max-w-2xl">
                <form onSubmit={handleSaveEdit} className="p-6 space-y-6">
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                        <ShieldExclamationIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-sm font-bold text-amber-800 leading-relaxed">
                            <p className="font-black mb-1">تحذير هام:</p>
                            تعديل البريد الإلكتروني قد يؤثر على قدرة الطالب على تسجيل الدخول إذا لم يتم إبلاغه بالتغيير. تأكد من صحة البيانات المدخلة.
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mr-2">الاسم الكامل</label>
                            <input 
                                type="text" 
                                value={editFormData.name || ''} 
                                onChange={e => setEditFormData(p => ({...p, name: e.target.value}))}
                                className="w-full p-4 bg-[var(--bg-tertiary)] rounded-2xl font-bold outline-none border-2 border-transparent focus:border-[var(--accent-primary)] transition-all"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mr-2">البريد الإلكتروني</label>
                            <input 
                                type="email" 
                                value={editFormData.email || ''} 
                                onChange={e => setEditFormData(p => ({...p, email: e.target.value}))}
                                className="w-full p-4 bg-[var(--bg-tertiary)] rounded-2xl font-bold outline-none border-2 border-transparent focus:border-[var(--accent-primary)] transition-all"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mr-2">رقم الهاتف</label>
                            <input 
                                type="tel" 
                                value={editFormData.phone || ''} 
                                onChange={e => setEditFormData(p => ({...p, phone: e.target.value}))}
                                className="w-full p-4 bg-[var(--bg-tertiary)] rounded-2xl font-bold outline-none border-2 border-transparent focus:border-[var(--accent-primary)] transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mr-2">هاتف ولي الأمر</label>
                            <input 
                                type="tel" 
                                value={editFormData.guardianPhone || ''} 
                                onChange={e => setEditFormData(p => ({...p, guardianPhone: e.target.value}))}
                                className="w-full p-4 bg-[var(--bg-tertiary)] rounded-2xl font-bold outline-none border-2 border-transparent focus:border-[var(--accent-primary)] transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mr-2">الصف الدراسي</label>
                            <select 
                                value={editFormData.grade || ''} 
                                onChange={e => setEditFormData(p => ({...p, grade: Number(e.target.value)}))}
                                className="w-full p-4 bg-[var(--bg-tertiary)] rounded-2xl font-bold outline-none border-2 border-transparent focus:border-[var(--accent-primary)] transition-all appearance-none"
                            >
                                {allGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mr-2">التخصص</label>
                            <select 
                                value={editFormData.track || 'All'} 
                                onChange={e => setEditFormData(p => ({...p, track: e.target.value as any}))}
                                className="w-full p-4 bg-[var(--bg-tertiary)] rounded-2xl font-bold outline-none border-2 border-transparent focus:border-[var(--accent-primary)] transition-all appearance-none"
                            >
                                <option value="All">عام</option>
                                <option value="Scientific">علمي</option>
                                <option value="Literary">أدبي</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-[var(--border-primary)]">
                        <div className="bg-indigo-500/5 p-5 rounded-3xl border border-indigo-500/10">
                            <label className="flex items-center gap-2 text-sm font-black text-indigo-600 uppercase tracking-widest mb-3">
                                <LockClosedIcon className="w-4 h-4" />
                                تغيير كلمة السر (اختياري)
                            </label>
                            <input 
                                type="password" 
                                placeholder="اتركه فارغاً لعدم التغيير" 
                                value={newPassword} 
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full p-4 bg-white dark:bg-black/20 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all"
                            />
                            <p className="text-sm font-bold text-[var(--text-secondary)] mt-2 opacity-60">سيتم تحديث كلمة السر فور الحفظ.</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
                        <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-bold hover:bg-[var(--border-primary)] transition-colors">إلغاء</button>
                        <button type="submit" disabled={isSaving} className="w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-[var(--accent-primary)] text-white font-black shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 transition-all transform active:scale-95 disabled:opacity-50">
                            {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default StudentManagementView;
