
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { User, Grade, ToastType, Subscription, QuizAttempt, VideoActivity, Teacher, Lesson, QuizQuestion } from '../../types';
import {
    getAllGrades,
    getStudentProgress,
    getStudentQuizAttempts,
    getVideoActivityForStudent,
    updateUser,
    deleteUser,
    adminUpdateUserPassword,
    getGradesForSelection,
    clearUserDevices,
    getLessonDetails
} from '../../services/storageService';
import { getSubscriptionsByUserId, createOrUpdateSubscription, cancelSubscription } from '../../services/subscriptionService';
import { getAllTeachers } from '../../services/teacherService';
import {
    ArrowRightIcon, ChartBarIcon, VideoCameraIcon, CheckCircleIcon, XCircleIcon,
    PencilIcon, UserIcon, GraduationCapIcon, EnvelopeIcon, PhoneIcon,
    ShieldCheckIcon, ClockIcon, KeyIcon, TrashIcon, CreditCardIcon,
    ShieldExclamationIcon, HardDriveIcon, CalendarIcon, ClipboardIcon,
    PlaySolidIcon, BookOpenIcon, CheckIcon, UserCircleIcon, QrcodeIcon,
    InformationCircleIcon, SparklesIcon
} from '../common/Icons';
import { useToast } from '../../useToast';
import Loader from '../common/Loader';
import Modal from '../common/Modal';
import ImageUpload from '../common/ImageUpload';
import { TableWrapper, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../common/Table';

// --- Utility Functions ---

const formatSecondsToText = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    let parts = [];
    if (hours > 0) parts.push(`${hours} ساعة`);
    if (minutes > 0) parts.push(`${minutes} دقيقة`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} ثانية`);

    return parts.join(' و ');
};

const detectGender = (name: string): 'male' | 'female' => {
    const first = name.split(' ')[0].trim();
    // Common Arabic female endings and specific names
    if (first.endsWith('ة') || first.endsWith('ه') || first.endsWith('ى') || first.endsWith('اء')) return 'female';

    const femaleNames = ['مريم', 'زينب', 'هند', 'سعاد', 'نور', 'شهد', 'ملك', 'يارا', 'ريماس', 'جنى', 'حبيبة', 'بسملة', 'فاطمة', 'عائشة', 'سلمى', 'آية', 'فريدة', 'مكة', 'خلود', 'رانيا', 'دعاء', 'إيمان', 'هدير', 'نسمة', 'نهى', 'رضوى', 'ياسمين', 'أمل', 'أماني'];
    if (femaleNames.includes(first)) return 'female';

    return 'male'; // Default assumption
};

// --- Components ---

const StatBox: React.FC<{ label: string; value: string | number; icon: any; color: string; subValue?: string }> = ({ label, value, icon: Icon, color, subValue }) => (
    <div className="bg-[var(--bg-secondary)] p-5 rounded-[2rem] border border-[var(--border-primary)] shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-[4rem] opacity-5 transition-transform group-hover:scale-110 ${color.replace('text-', 'bg-')}`}></div>
        <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-2">
                <div className={`p-3 rounded-2xl ${color.replace('text-', 'bg-').replace('500', '500/10')} ${color}`}>
                    <Icon className="w-6 h-6" />
                </div>
                {subValue && <span className="text-sm font-bold bg-[var(--bg-tertiary)] px-2 py-1 rounded-full text-[var(--text-secondary)]">{subValue}</span>}
            </div>
            <div>
                <h4 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{value}</h4>
                <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-1 opacity-80">{label}</p>
            </div>
        </div>
    </div>
);

const DetailRow: React.FC<{ label: string; value: string; icon?: any; isCopyable?: boolean }> = ({ label, value, icon: Icon, isCopyable }) => {
    const { addToast } = useToast();
    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        addToast('تم النسخ', ToastType.SUCCESS);
    };

    return (
        <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)]/50 rounded-2xl border border-[var(--border-primary)] group hover:border-[var(--accent-primary)]/30 transition-colors">
            <div className="flex items-center gap-3">
                {Icon && <Icon className="w-5 h-5 text-[var(--text-secondary)]" />}
                <div>
                    <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="text-sm font-black text-[var(--text-primary)]" dir="auto">{value || 'غير محدد'}</p>
                </div>
            </div>
            {isCopyable && value && (
                <button
                    onClick={handleCopy}
                    title="انسخ القيمة"
                    aria-label={`نسخ ${label}`}
                    className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-secondary)] rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                    <ClipboardIcon className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

// --- Modals ---

const SubscriptionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    subscription: Subscription | undefined;
    teachers: Teacher[];
    onSave: (plan: Subscription['plan'], status: 'Active' | 'Expired', customEndDate?: string, teacherId?: string | null) => void;
}> = ({ isOpen, onClose, subscription, teachers, onSave }) => {
    const [plan, setPlan] = useState<Subscription['plan']>('Monthly');
    const [status, setStatus] = useState<'Active' | 'Expired'>('Active');
    const [endDate, setEndDate] = useState('');
    const [teacherId, setTeacherId] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            if (subscription) {
                setPlan(subscription.plan);
                setStatus(subscription.status);
                const dateValue = (subscription as any).end_date || subscription.endDate;
                setEndDate(dateValue ? new Date(dateValue).toISOString().split('T')[0] : '');
                setTeacherId(subscription.teacherId || '');
            } else {
                setPlan('Monthly');
                setStatus('Active');
                setEndDate('');
                setTeacherId('');
            }
        }
    }, [subscription, isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={subscription ? "تعديل الاشتراك" : "إضافة اشتراك جديد"}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">نوع الاشتراك</label>
                    <select
                        title="اختر المادة"
                        aria-label="نوع الاشتراك"
                        value={teacherId}
                        onChange={(e) => setTeacherId(e.target.value)}
                        className="w-full p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] outline-none focus:border-[var(--accent-primary)] font-bold text-sm"
                        disabled={!!subscription}
                    >
                        <option value="">✨ الباقة الشاملة (جميع المواد)</option>
                        {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.name} - {t.subject}</option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">المدة</label>
                        <select title="مدة الاشتراك" aria-label="مدة الاشتراك" value={plan} onChange={(e) => setPlan(e.target.value as any)} className="w-full p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] outline-none focus:border-[var(--accent-primary)] font-bold text-sm">
                            <option value="Monthly">شهرية</option>
                            <option value="Quarterly">3 شهور</option>
                            <option value="SemiAnnually">6 شهور</option>
                            <option value="Annual">سنوية</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">الحالة</label>
                        <select title="حالة الاشتراك" aria-label="حالة الاشتراك" value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] outline-none focus:border-[var(--accent-primary)] font-bold text-sm">
                            <option value="Active">نشط</option>
                            <option value="Expired">منتهي</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">تاريخ الانتهاء المخصص</label>
                    <input type="date" title="تاريخ الانتهاء" aria-label="تاريخ الانتهاء المخصص" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] outline-none focus:border-[var(--accent-primary)] font-bold text-sm" />
                </div>
                <div className="flex justify-end pt-4">
                    <button onClick={() => { onSave(plan, status, endDate || undefined, teacherId || null); onClose(); }} className="px-8 py-3 font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                        حفظ البيانات
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const EditProfileModal: React.FC<{ isOpen: boolean; onClose: () => void; user: User; onSave: (data: Partial<User>) => void; allGrades: Grade[] }> = ({ isOpen, onClose, user, onSave, allGrades }) => {
    const [formData, setFormData] = useState({ name: user.name, phone: user.phone, guardianPhone: user.guardianPhone, grade: user.grade });

    useEffect(() => { setFormData({ name: user.name, phone: user.phone, guardianPhone: user.guardianPhone, grade: user.grade }) }, [user, isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="تعديل الملف الشخصي">
            <div className="space-y-4">
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="الاسم" className="w-full p-3 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)] font-bold outline-none" />
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="الهاتف" className="w-full p-3 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)] font-bold outline-none dir-ltr" dir="ltr" />
                    <input type="text" value={formData.guardianPhone} onChange={e => setFormData({ ...formData, guardianPhone: e.target.value })} placeholder="ولي الأمر" className="w-full p-3 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)] font-bold outline-none dir-ltr" dir="ltr" />
                </div>
                <select title="الصف الدراسي" aria-label="الصف الدراسي" value={formData.grade || ''} onChange={e => setFormData({ ...formData, grade: Number(e.target.value) })} className="w-full p-3 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)] font-bold outline-none">
                    {allGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <button onClick={() => { onSave(formData); onClose(); }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold mt-4 hover:bg-indigo-700">حفظ التغييرات</button>
            </div>
        </Modal>
    );
}

// --- Main Component ---

interface StudentDetailViewProps {
    user: User;
    onBack: () => void;
}

const StudentDetailView: React.FC<StudentDetailViewProps> = ({ user, onBack }) => {
    const { addToast } = useToast();
    const [dataVersion, setDataVersion] = useState(0);
    const [localUser, setLocalUser] = useState(user);

    // Data State
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);
    const [activeTab, setActiveTab] = useState<'academic' | 'financial' | 'personal' | 'security'>('academic');
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [allGrades, setAllGrades] = useState<Grade[]>([]);
    const [progress, setProgress] = useState<any[]>([]);
    const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
    const [videoActivity, setVideoActivity] = useState<VideoActivity[]>([]);

    // UI State
    const [watchHistoryMode, setWatchHistoryMode] = useState<'normal' | 'detailed'>('normal');

    // Modal States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [selectedSub, setSelectedSub] = useState<Subscription | undefined>(undefined);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [isDeletingPassword, setIsDeletingPassword] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Quiz Review State
    const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null);
    const [reviewLesson, setReviewLesson] = useState<Lesson | null>(null);
    const [isLoadingReview, setIsLoadingReview] = useState(false);

    useEffect(() => { setLocalUser(user); }, [user]);

    const refreshData = useCallback(() => setDataVersion(v => v + 1), []);

    const handleViewQuizReview = async (attempt: QuizAttempt) => {
        setSelectedAttempt(attempt);
        setIsLoadingReview(true);
        try {
            const lesson = await getLessonDetails(attempt.lessonId);
            setReviewLesson(lesson);
        } catch (e) {
            addToast('فشل تحميل تفاصيل الاختبار', ToastType.ERROR);
        } finally {
            setIsLoadingReview(false);
        }
    };

    const resolvedReviewQuestions = useMemo((): QuizQuestion[] => {
        if (!reviewLesson) return [];
        const raw = reviewLesson.questions || reviewLesson.videoQuestions || [];
        if (typeof raw === 'string') {
            try { return JSON.parse(raw); } catch (e) { return []; }
        }
        return Array.isArray(raw) ? raw : [];
    }, [reviewLesson]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoadingDetails(true);
            try {
                const [subsData, teachersData, gradesData, progressData, attemptsData, activityData] = await Promise.all([
                    getSubscriptionsByUserId(localUser.id),
                    getAllTeachers(),
                    getAllGrades(),
                    getStudentProgress(localUser.id),
                    getStudentQuizAttempts(localUser.id),
                    getVideoActivityForStudent(localUser.id)
                ]);
                setSubscriptions(subsData);
                setTeachers(teachersData);
                setAllGrades(gradesData);
                setProgress(progressData || []);
                setAttempts(attemptsData || []);
                setVideoActivity(activityData || []);
            } catch (e) {
                console.error("Error fetching detail view data", e);
            } finally {
                setIsLoadingDetails(false);
            }
        };
        fetchData();
    }, [localUser.id, dataVersion]);

    // Computed Values
    const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);
    const lessonMap = useMemo(() => {
        const map = new Map<string, { lessonTitle: string; unitTitle: string; }>();
        allGrades.forEach(g => g.semesters?.forEach(s => s.units?.forEach(u => u.lessons?.forEach(l => {
            map.set(l.id, { lessonTitle: l.title, unitTitle: u.title });
        }))));
        return map;
    }, [allGrades]);

    const gradeName = useMemo(() => allGrades.find(g => g.id === localUser.grade)?.name || 'غير محدد', [localUser.grade, allGrades]);

    const stats = useMemo(() => {
        const passedQuizzes = attempts.filter(a => a.isPass).length;
        const totalWatchTime = videoActivity.reduce((acc, curr) => acc + (curr.watched_seconds || 0), 0);
        const hours = Math.floor(totalWatchTime / 3600);
        const activeSubsCount = subscriptions.filter(s => s.status === 'Active' && new Date(s.endDate) > new Date()).length;

        return {
            quizPassRate: attempts.length > 0 ? Math.round((passedQuizzes / attempts.length) * 100) : 0,
            totalWatchHours: hours,
            completedLessons: progress.length,
            activeSubs: activeSubsCount
        };
    }, [attempts, videoActivity, progress, subscriptions]);

    const { activeSubscriptions, expiredSubscriptions } = useMemo(() => {
        const now = new Date();
        // Sort subscriptions by date descending
        const sortedSubs = [...subscriptions].sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

        return {
            activeSubscriptions: sortedSubs.filter(s => s.status === 'Active' && new Date(s.endDate) >= now),
            expiredSubscriptions: sortedSubs.filter(s => s.status === 'Expired' || new Date(s.endDate) < now)
        };
    }, [subscriptions]);

    const studentGender = useMemo(() => detectGender(localUser.name), [localUser.name]);

    // Handlers
    const handleUpdateUser = async (data: Partial<User>) => {
        const res = await updateUser(localUser.id, data);
        if (res.error) addToast(res.error.message, ToastType.ERROR);
        else {
            addToast('تم التحديث بنجاح', ToastType.SUCCESS);
            setLocalUser({ ...localUser, ...data });
            refreshData();
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) return addToast('كلمة المرور قصيرة جداً (6 أحرف على الأقل)', ToastType.ERROR);

        setIsDeletingPassword(true);
        try {
            const { data, error } = await adminUpdateUserPassword(localUser.id, newPassword);
            if (error) {
                addToast(`فشل التحديث: ${error.message}`, ToastType.ERROR);
            } else {
                addToast('تم تغيير كلمة المرور بنجاح عبر نظام الإدارة!', ToastType.SUCCESS);
                setIsPasswordModalOpen(false);
                setNewPassword('');
            }
        } finally {
            setIsDeletingPassword(false);
        }
    };

    const handleSubscriptionSave = async (plan: string, status: string, endDate?: string, teacherId?: string | null) => {
        const targetTeacherId = selectedSub ? selectedSub.teacherId : teacherId;
        const { error } = await createOrUpdateSubscription(localUser.id, plan, status, endDate, targetTeacherId);
        if (error) addToast(error.message, ToastType.ERROR);
        else {
            addToast(selectedSub ? 'تم تعديل الاشتراك' : 'تم إضافة الاشتراك', ToastType.SUCCESS);
            refreshData();
        }
    };

    const handleCancelSub = async (sub: Subscription) => {
        if (!confirm('هل أنت متأكد من إلغاء هذا الاشتراك؟')) return;
        const { error } = await cancelSubscription(localUser.id);
        if (error) addToast(error.message, ToastType.ERROR);
        else {
            addToast('تم الإلغاء', ToastType.SUCCESS);
            refreshData();
        }
    };

    const handleDeleteAccount = async () => {
        const { error } = await deleteUser(localUser.id);
        if (error) addToast(error.message, ToastType.ERROR);
        else {
            addToast('تم حذف الحساب نهائياً', ToastType.SUCCESS);
            onBack();
        }
    };

    if (isLoadingDetails) return <div className="flex items-center justify-center h-screen"><Loader /></div>;

    return (
        <div className="fade-in space-y-6 pb-20">
            {/* Top Bar */}
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors group">
                    <ArrowRightIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span>العودة للقائمة</span>
                </button>
                <div className="flex gap-2">
                    <button title="تعديل" aria-label="تعديل التفاصيل" onClick={() => setIsEditModalOpen(true)} className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-secondary)] hover:text-indigo-600 shadow-sm transition-all"><PencilIcon className="w-5 h-5" /></button>
                    <button title="كلمة المرور" aria-label="إعادة تعيين كلمة المرور" onClick={() => { setIsPasswordModalOpen(true); setNewPassword(''); }} className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-secondary)] hover:text-amber-500 shadow-sm transition-all"><KeyIcon className="w-5 h-5" /></button>
                    <button title="حذف الطالب" aria-label="حذف الحساب" onClick={() => setIsDeleteModalOpen(true)} className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500 hover:text-white shadow-sm transition-all"><TrashIcon className="w-5 h-5" /></button>
                </div>
            </div>

            {/* Hero Profile Card - Gender Aware */}
            <div className="bg-[var(--bg-secondary)] rounded-[2.5rem] p-8 border border-[var(--border-primary)] shadow-lg relative overflow-hidden mb-8">
                <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">

                    {/* Gender Specific Avatar Container */}
                    <div className={`w-32 h-32 rounded-[2rem] p-1 shadow-2xl bg-gradient-to-br ${studentGender === 'female' ? 'from-pink-400 to-rose-500' : 'from-blue-500 to-indigo-600'}`}>
                        <div className="w-full h-full rounded-[1.8rem] overflow-hidden bg-[var(--bg-tertiary)] flex items-center justify-center relative">
                            {localUser.imageUrl ? (
                                <img src={localUser.imageUrl} alt="صورة الطالب الشخصية" className="w-full h-full object-cover" />
                            ) : (
                                studentGender === 'female' ? (
                                    <UserCircleIcon className="w-16 h-16 text-pink-400" />
                                ) : (
                                    <UserIcon className="w-16 h-16 text-indigo-500" />
                                )
                            )}
                            {/* Gender Icon Badge */}
                            <div className={`absolute bottom-2 left-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold border-2 border-[var(--bg-secondary)] shadow-sm ${studentGender === 'female' ? 'bg-pink-500' : 'bg-blue-600'}`}>
                                {studentGender === 'female' ? '♀' : '♂'}
                            </div>
                        </div>
                    </div>

                    <div className="text-center md:text-right flex-1">
                        <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
                            <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">{localUser.name}</h1>
                            <span className={`px-4 py-1 rounded-full text-sm font-black uppercase tracking-widest ${activeSubscriptions.length > 0 ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                {activeSubscriptions.length > 0 ? 'اشتراك نشط' : 'غير مشترك'}
                            </span>
                        </div>
                        <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm font-bold text-[var(--text-secondary)] opacity-80">
                            <span className="flex items-center gap-2"><GraduationCapIcon className="w-4 h-4" /> {gradeName}</span>
                            <span className="flex items-center gap-2"><PhoneIcon className="w-4 h-4" /> <span dir="ltr">{localUser.phone}</span></span>
                            <span className="flex items-center gap-2"><EnvelopeIcon className="w-4 h-4" /> <span dir="ltr">{localUser.email}</span></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatBox label="إجمالي المشاهدة" value={`${stats.totalWatchHours} ساعة`} icon={ClockIcon} color="text-blue-500" />
                <StatBox label="حصص مكتملة" value={stats.completedLessons} icon={CheckCircleIcon} color="text-emerald-500" />
                <StatBox label="معدل النجاح" value={`${stats.quizPassRate}%`} icon={ChartBarIcon} color="text-purple-500" />
                <StatBox label="الاشتراكات" value={stats.activeSubs} icon={CreditCardIcon} color="text-amber-500" subValue={subscriptions.length.toString()} />
            </div>

            {/* Content Tabs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Navigation & Personal Info */}
                <div className="space-y-6">
                    <div className="bg-[var(--bg-secondary)] p-2 rounded-3xl border border-[var(--border-primary)] shadow-sm flex flex-col gap-1">
                        {[
                            { id: 'academic', label: 'الأداء الأكاديمي', icon: BookOpenIcon },
                            { id: 'financial', label: 'الاشتراكات والمالية', icon: CreditCardIcon },
                            { id: 'security', label: 'الأمان والجلسات', icon: ShieldCheckIcon },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                            >
                                <tab.icon className="w-5 h-5" />
                                <span className="font-bold text-sm">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="bg-[var(--bg-secondary)] p-6 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm">
                        <h3 className="font-black text-lg mb-6 flex items-center gap-2"><UserIcon className="w-5 h-5 text-indigo-500" /> تفاصيل الاتصال</h3>
                        <div className="space-y-3">
                            <DetailRow label="رقم ولي الأمر" value={localUser.guardianPhone} icon={ShieldExclamationIcon} isCopyable />
                            <DetailRow label="تاريخ الانضمام" value={new Date(localUser.createdAt || Date.now()).toLocaleDateString('ar-EG')} icon={CalendarIcon} />
                            <DetailRow label="المسار" value={localUser.track === 'Scientific' ? 'علمي' : localUser.track === 'Literary' ? 'أدبي' : 'عام'} icon={BookOpenIcon} />
                        </div>
                    </div>
                </div>

                {/* Right Column: Dynamic Content */}
                <div className="lg:col-span-2 space-y-6">

                    {activeTab === 'academic' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Video History (Dual Mode) */}
                            <div className="bg-[var(--bg-secondary)] p-6 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-black text-lg flex items-center gap-2">
                                        <VideoCameraIcon className="w-6 h-6 text-blue-500" />
                                        سجل المشاهدة ({videoActivity.length})
                                    </h3>
                                    <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-xl border border-[var(--border-primary)]">
                                        <button
                                            onClick={() => setWatchHistoryMode('normal')}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${watchHistoryMode === 'normal' ? 'bg-white text-black shadow-sm' : 'text-[var(--text-secondary)]'}`}
                                        >
                                            عادي (نسبة)
                                        </button>
                                        <button
                                            onClick={() => setWatchHistoryMode('detailed')}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${watchHistoryMode === 'detailed' ? 'bg-white text-black shadow-sm' : 'text-[var(--text-secondary)]'}`}
                                        >
                                            تفصيلي (وقت)
                                        </button>
                                    </div>
                                </div>

                                <div className="max-h-96 overflow-y-auto custom-scrollbar pr-2">
                                    <div className="space-y-3">
                                        {videoActivity.length > 0 ? videoActivity.map((act, idx) => {
                                            const info = lessonMap.get(act.lesson_id);
                                            const timeWatchedText = formatSecondsToText(act.watched_seconds || 0);
                                            const milestoneNum = parseInt(act.milestone?.replace('%', '') || '0');

                                            return (
                                                <div key={idx} className="bg-[var(--bg-tertiary)] p-4 rounded-2xl border border-[var(--border-primary)] hover:border-blue-500/20 transition-all">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="font-black text-sm text-[var(--text-primary)]">{info?.lessonTitle || 'درس غير معروف'}</p>
                                                            <p className="text-sm text-[var(--text-secondary)] mt-0.5 opacity-80">{info?.unitTitle}</p>
                                                        </div>

                                                        {watchHistoryMode === 'detailed' && (
                                                            <div className="text-left bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-primary)]">
                                                                <div className="flex items-center gap-1.5">
                                                                    <ClockIcon className="w-3 h-3 text-blue-500" />
                                                                    <span className="text-sm font-bold text-blue-600">{timeWatchedText}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-500 rounded-full" style={{ width: act.milestone || '0%' }}></div>
                                                        </div>
                                                        <span className="text-sm font-black text-blue-500 w-8 text-left">{act.milestone || '0%'}</span>
                                                    </div>

                                                    <div className="mt-2 text-sm text-[var(--text-secondary)] text-left opacity-60">
                                                        آخر مشاهدة: {new Date(act.last_updated_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            );
                                        }) : <p className="text-center py-10 text-[var(--text-secondary)] font-bold opacity-50">لا يوجد سجل مشاهدة</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Quiz Results */}
                            <div className="bg-[var(--bg-secondary)] p-6 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm">
                                <h3 className="font-black text-lg mb-6 flex items-center gap-2"><ChartBarIcon className="w-6 h-6 text-purple-500" /> نتائج الاختبارات ({attempts.length})</h3>
                                <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                                    {attempts.length > 0 ? attempts.map((att, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-4 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--border-primary)] hover:border-indigo-500/30 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${att.isPass ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                                    {att.score}%
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-[var(--text-primary)]">{lessonMap.get(att.lessonId)?.lessonTitle || 'اختبار'}</p>
                                                    <p className="text-sm text-[var(--text-secondary)] mt-1">{new Date(att.submittedAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleViewQuizReview(att)}
                                                className="px-4 py-2 bg-indigo-600/10 text-indigo-600 rounded-xl text-sm font-black hover:bg-indigo-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                عرض التفاصيل
                                            </button>
                                        </div>
                                    )) : <p className="text-center py-10 text-[var(--text-secondary)] font-bold opacity-50">لا توجد نتائج اختبارات</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="space-y-8 animate-fade-in">
                            {/* Active Subscriptions */}
                            <div className="bg-[var(--bg-secondary)] p-8 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="font-black text-lg flex items-center gap-2"><CreditCardIcon className="w-6 h-6 text-emerald-500" /> الاشتراكات النشطة</h3>
                                    <button onClick={() => { setSelectedSub(undefined); setIsSubModalOpen(true); }} className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-700 transition-all">إضافة اشتراك</button>
                                </div>

                                <div className="space-y-4">
                                    {activeSubscriptions.length > 0 ? activeSubscriptions.map((sub, idx) => (
                                        <div key={idx} className="p-5 rounded-[2rem] border-2 bg-emerald-500/5 border-emerald-500/20 transition-all">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="font-black text-lg text-[var(--text-primary)]">{sub.teacherId ? teacherMap.get(sub.teacherId) : 'الباقة الشاملة'}</p>
                                                    <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">{sub.plan}</p>
                                                </div>
                                                <span className="px-3 py-1 rounded-lg text-sm font-black uppercase bg-emerald-500 text-white shadow-sm">نشط</span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <p className="text-sm font-bold text-[var(--text-secondary)] flex items-center gap-1">
                                                    <ClockIcon className="w-4 h-4" /> ينتهي في: {new Date(sub.endDate).toLocaleDateString('ar-EG')}
                                                </p>
                                                <div className="flex gap-2">
                                                    <button title="تعديل الاشتراك" aria-label="تعديل الاشتراك" onClick={() => { setSelectedSub(sub); setIsSubModalOpen(true); }} className="p-2 bg-white dark:bg-black/20 rounded-lg text-[var(--text-secondary)] hover:text-indigo-600 transition-colors shadow-sm"><PencilIcon className="w-4 h-4" /></button>
                                                    <button title="إلغاء الاشتراك" aria-label="إلغاء الاشتراك" onClick={() => handleCancelSub(sub)} className="p-2 bg-white dark:bg-black/20 rounded-lg text-[var(--text-secondary)] hover:text-red-600 transition-colors shadow-sm"><XCircleIcon className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        </div>
                                    )) : <div className="text-center py-10 bg-[var(--bg-tertiary)] rounded-[2rem] border-2 border-dashed border-[var(--border-primary)]"><p className="font-bold text-[var(--text-secondary)]">لا توجد اشتراكات نشطة حالياً</p></div>}
                                </div>
                            </div>

                            {/* Expired / History Subscriptions */}
                            <div className="bg-[var(--bg-secondary)] p-8 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm">
                                <h3 className="font-black text-lg flex items-center gap-2 mb-6"><ClockIcon className="w-6 h-6 text-gray-400" /> سجل الاشتراكات السابقة</h3>

                                <TableWrapper>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="rounded-r-xl">الباقة</TableHead>
                                                <TableHead>تاريخ البدء</TableHead>
                                                <TableHead>تاريخ الانتهاء</TableHead>
                                                <TableHead className="rounded-l-xl text-center">الحالة</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {expiredSubscriptions.map((sub, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-bold text-[var(--text-primary)]">
                                                        {sub.teacherId ? teacherMap.get(sub.teacherId) : 'شامل'} <span className="text-sm text-[var(--text-secondary)] block font-normal">{sub.plan}</span>
                                                    </TableCell>
                                                    <TableCell className="text-[var(--text-secondary)]">{new Date(sub.startDate).toLocaleDateString('ar-EG')}</TableCell>
                                                    <TableCell className="text-[var(--text-secondary)]">{new Date(sub.endDate).toLocaleDateString('ar-EG')}</TableCell>
                                                    <TableCell className="text-center">
                                                        <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-sm font-bold">منتهي</span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {expiredSubscriptions.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="py-8 text-center text-[var(--text-secondary)] italic opacity-60">السجل فارغ</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableWrapper>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="bg-[var(--bg-secondary)] p-8 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm animate-fade-in space-y-8">
                            <div>
                                <h3 className="font-black text-lg mb-4 flex items-center gap-2"><HardDriveIcon className="w-6 h-6 text-red-500" /> الجلسات والأجهزة</h3>
                                <div className="bg-[var(--bg-tertiary)] p-6 rounded-3xl border border-[var(--border-primary)] text-center">
                                    <p className="text-sm font-bold text-[var(--text-secondary)] mb-6">يمكنك تسجيل خروج الطالب من جميع الأجهزة المتصلة حالياً في حال الشك بنشاط غير مصرح به.</p>
                                    <button onClick={async () => { await clearUserDevices(localUser.id); addToast('تم مسح الجلسات', ToastType.SUCCESS); }} className="w-full py-4 bg-red-500/10 text-red-600 font-black rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-500/20">تسجيل خروج من كل الأجهزة</button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Modals */}
            <EditProfileModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} user={localUser} onSave={handleUpdateUser} allGrades={allGrades} />
            <SubscriptionModal isOpen={isSubModalOpen} onClose={() => setIsSubModalOpen(false)} subscription={selectedSub} teachers={teachers} onSave={handleSubscriptionSave} />

            <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title={`إعادة تعيين كلمة مرور: ${localUser.name}`}>
                <form onSubmit={handlePasswordReset} className="space-y-6">
                    <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3">
                        <InformationCircleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm font-bold text-amber-700 dark:text-amber-300 leading-relaxed">
                            سيتم تغيير كلمة مرور الطالب فوراً عبر <strong>نظام الإدارة الآمن</strong>. يرجى إبلاغ الطالب بكلمة المرور الجديدة ليتمكن من الدخول.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="relative group">
                            <input
                                type="password"
                                required
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="كلمة المرور الجديدة (6 أحرف فأكثر)"
                                className="w-full p-4 pr-12 bg-[var(--bg-tertiary)] rounded-2xl font-bold border border-[var(--border-primary)] focus:border-indigo-500 outline-none transition-all shadow-inner"
                            />
                            <KeyIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] opacity-50" />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="flex-1 py-4 bg-[var(--bg-tertiary)] rounded-2xl font-bold text-sm text-[var(--text-secondary)]">إلغاء</button>
                        <button
                            type="submit"
                            disabled={isDeletingPassword || newPassword.length < 6}
                            className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/30 transition-all transform active:scale-95 disabled:opacity-50"
                        >
                            {isDeletingPassword ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div> : 'تحديث كلمة المرور'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="حذف الحساب نهائياً">
                <div className="text-center p-4">
                    <ShieldExclamationIcon className="w-20 h-20 text-red-500 mx-auto mb-4" />
                    <p className="font-bold text-[var(--text-secondary)] mb-6">هل أنت متأكد؟ هذا الإجراء لا يمكن التراجع عنه.</p>
                    <div className="flex gap-4">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-[var(--bg-tertiary)] rounded-xl font-bold">إلغاء</button>
                        <button onClick={handleDeleteAccount} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">حذف</button>
                    </div>
                </div>
            </Modal>

            {/* Quiz Review Modal for Admin */}
            <Modal isOpen={!!selectedAttempt} onClose={() => { setSelectedAttempt(null); setReviewLesson(null); }} title="تفاصيل إجابات الطالب" maxWidth="max-w-4xl">
                {isLoadingReview ? (
                    <div className="py-20 flex justify-center"><Loader /></div>
                ) : selectedAttempt && reviewLesson ? (
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                        <div className="bg-indigo-600/5 border border-indigo-600/10 p-6 rounded-3xl flex justify-between items-center">
                            <div>
                                <h4 className="font-black text-lg text-indigo-600">{lessonMap.get(selectedAttempt.lessonId)?.lessonTitle}</h4>
                                <p className="text-sm font-bold text-[var(--text-secondary)] mt-1">تاريخ التسليم: {new Date(selectedAttempt.submittedAt).toLocaleString('ar-EG')}</p>
                            </div>
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${selectedAttempt.isPass ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                {selectedAttempt.score}%
                            </div>
                        </div>

                        <div className="space-y-4">
                            {resolvedReviewQuestions.length > 0 ? resolvedReviewQuestions.map((q, idx) => {
                                const studentAnswerIdx = (selectedAttempt.submittedAnswers as (number | null)[])?.[idx];
                                const isCorrect = studentAnswerIdx !== null && studentAnswerIdx !== undefined && Number(studentAnswerIdx) === Number(q.correctAnswerIndex);

                                return (
                                    <div key={idx} className={`p-6 rounded-3xl border-2 transition-all ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
                                        <div className="flex items-start gap-3 mb-4">
                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>{idx + 1}</span>
                                            <p className="font-bold text-[var(--text-primary)] pt-1">{q.questionText}</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {q.options.map((opt, optIdx) => {
                                                const isStudentChoice = studentAnswerIdx !== null && studentAnswerIdx !== undefined && Number(studentAnswerIdx) === optIdx;
                                                const isCorrectChoice = Number(q.correctAnswerIndex) === optIdx;

                                                let style = "bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-secondary)]";
                                                if (isCorrectChoice) style = "bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-400";
                                                else if (isStudentChoice && !isCorrect) style = "bg-rose-500/20 border-rose-500/40 text-rose-700 dark:text-rose-400";

                                                return (
                                                    <div key={optIdx} className={`p-3 rounded-xl border text-sm font-bold flex items-center gap-2 ${style}`}>
                                                        <span className="opacity-50">{["أ", "ب", "ج", "د"][optIdx]}.</span>
                                                        <span>{opt}</span>
                                                        {isCorrectChoice && <CheckCircleIcon className="w-4 h-4 mr-auto" />}
                                                        {isStudentChoice && !isCorrect && <XCircleIcon className="w-4 h-4 mr-auto" />}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Explanation / Improvement Tip */}
                                        {!isCorrect && (
                                            <div className="mt-4 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex items-center gap-3 mb-2">
                                                <InformationCircleIcon className="w-5 h-5 text-indigo-500" />
                                                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                                    الإجابة الصحيحة هي: <span className="underline">{q.options[Number(q.correctAnswerIndex)]}</span>
                                                </p>
                                            </div>
                                        )}

                                        {(!isCorrect || q.rationale) && (
                                            <div className="mt-2 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex gap-3 items-start">
                                                <SparklesIcon className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-black text-indigo-600 mb-1 uppercase tracking-wider">تحليل الذكاء الاصطناعي</p>
                                                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                                        {q.rationale || (isCorrect ? "أحسنت! إجابتك صحيحة لأنك اخترت الخيار الأدق بناءً على فهمك للمادة." : "يحتاج الطالب لمراجعة هذا الجزء. الإجابة الصحيحة تعتمد على المفاهيم الأساسية المذكورة في الشرح.")}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }) : (
                                <div className="text-center py-10 bg-[var(--bg-tertiary)] rounded-3xl border border-dashed border-[var(--border-primary)]">
                                    <p className="text-sm font-bold text-[var(--text-secondary)]">لا تتوفر تفاصيل لهذا الاختبار (قد يكون اختباراً صورياً أو قديماً)</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="py-20 text-center text-[var(--text-secondary)] font-bold">تعذر تحميل البيانات</div>
                )}
            </Modal>
        </div>
    );
};

export default StudentDetailView;
