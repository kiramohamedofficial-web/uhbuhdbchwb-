
import React, { useMemo, useState, useEffect } from 'react';
import { User, StudentView, ToastType, Grade, QuizAttempt, Teacher } from '../../types';
import { deleteSelf, updateUser, getStudentProgress, getStudentQuizAttempts, updateUserPassword, getAllGrades } from '../../services/storageService';
import { getAllTeachers } from '../../services/teacherService';
import { TrashIcon, PencilIcon, CheckCircleIcon, CogIcon, MoonIcon, SunIcon, CheckIcon, VideoCameraIcon, ChevronLeftIcon, ShieldCheckIcon, ClockIcon, BookOpenIcon, ArrowsExpandIcon, ArrowsShrinkIcon, ShieldExclamationIcon, CreditCardIcon, KeyIcon } from '../common/Icons';
import { useToast } from '../../useToast';
import { useSession } from '../../hooks/useSession';
import { useAppearance } from '../../AppContext';
import { useIcons } from '../../IconContext';
import { useSubscription } from '../../hooks/useSubscription';
import Modal from '../common/Modal';

const AVAILABLE_COLORS = [
    '#F43F5E', '#EC4899', '#D946EF', '#A855F7', '#8B5CF6', '#6366F1',
    '#3B82F6', '#0EA5E9', '#06B6D4', '#14B8A6', '#10B981', '#22C55E',
    '#84CC16', '#EAB308', '#F59E0B', '#F97316', '#EF4444', '#64748B'
];

const TrophyIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M21 4h-3V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v1H3a1 1 0 0 0-1 1v3c0 4.42 3.58 8 8 8h4c4.42 0 8-3.58 8-8V5a1 1 0 0 0-1-1ZM4 8V6h2v6.83A6.001 6.001 0 0 1 4 8Zm16 0c0 1.94-.93 3.66-2.37 4.75L18 12.83V6h2v2Zm-5 10H9v-2h6v2Zm2 2H7v-2h10v2Z" />
    </svg>
);

const PaletteIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10c1.38 0 2.5-1.12 2.5-2.5 0-.61-.23-1.21-.64-1.67-.08-.09-.13-.21-.13-.33 0-.28.22-.5.5-.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9zm-4.5 9c-.83 0-1.5-.67-1.5-1.5S6.67 8 7.5 8s1.5.67 1.5 1.5S8.33 11 7.5 11zM10 7c-.83 0-1.5-.67-1.5-1.5S9.17 4 10 4s1.5.67 1.5 1.5S10.83 7 10 7zm4 0c-.83 0-1.5-.67-1.5-1.5S13.17 4 14 4s1.5.67 1.5 1.5S14.83 7 14 7zm4.5 4c-.83 0-1.5-.67-1.5-1.5S17.67 8 18.5 8s1.5.67 1.5 1.5S19.33 11 18.5 11z" />
    </svg>
);

const MenuActionCard: React.FC<{ label: string; icon: React.FC<any>; onClick: () => void; isActive?: boolean; badge?: string; }> = ({ label, icon: Icon, onClick, isActive, badge }) => (
    <button
        onClick={onClick}
        title={label}
        aria-label={label}
        className={`w-full flex items-center justify-between p-5 mb-4 rounded-3xl transition-all duration-300 active:translate-y-2 ${isActive ? 'bg-[var(--bg-tertiary)] border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/30 border-b-4' : 'bg-[var(--bg-secondary)] border-2 border-[var(--border-primary)] border-b-[6px] hover:border-[var(--accent-primary)]/40 hover:-translate-y-1'} group`}
    >
        <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center transition-all ${isActive ? 'bg-[var(--accent-primary)] text-white shadow-[0_4px_0_rgb(0,0,0,0.1)]' : 'bg-[var(--bg-tertiary)] text-[var(--accent-primary)] border-2 border-b-4 border-[var(--border-primary)]'}`}>
                <Icon className="w-7 h-7" />
            </div>
            <span className="text-lg font-black text-[var(--text-primary)]">{label}</span>
        </div>
        <div className="flex items-center gap-3">
            {badge && <span className="px-4 py-1.5 rounded-full bg-rose-500 text-white text-sm font-black shadow-inner">{badge}</span>}
            <ChevronLeftIcon className={`w-6 h-6 text-[var(--text-secondary)] transition-transform duration-300 ${isActive ? '-rotate-90 text-[var(--accent-primary)]' : 'group-hover:-translate-x-1'}`} />
        </div>
    </button>
);

const Profile: React.FC<{ onNavigate: (view: StudentView) => void; isDataSaverEnabled: boolean; onDataSaverToggle: (enabled: boolean) => void; }> = ({ onNavigate, isDataSaverEnabled, onDataSaverToggle }) => {
    const { currentUser: user, handleLogout: onLogout, refetchUser } = useSession();
    const { addToast } = useToast();
    const { mode, setMode, profileHeaderColor, setProfileHeaderColor } = useAppearance();
    const { activeSubscriptions, isComprehensive } = useSubscription();
    const icons = useIcons();

    const AVATAR_OPTIONS = useMemo(() => [
        icons.studentAvatar1Url, icons.studentAvatar2Url, icons.studentAvatar3Url, icons.studentAvatar4Url, icons.studentAvatar5Url, icons.studentAvatar6Url,
    ].filter(Boolean) as string[], [icons]);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [expandedSection, setExpandedSection] = useState<'progress' | 'results' | null>(null);
    const [studentProgress, setStudentProgress] = useState<any[]>([]);
    const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
    const [allGrades, setAllGrades] = useState<Grade[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [editFormData, setEditFormData] = useState({ name: '', grade: '' });

    // Password State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPassLoading, setIsPassLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        if (user) {
            setEditFormData({ name: user.name, grade: user.grade?.toString() || '' });
            Promise.all([
                getStudentProgress(user.id),
                getStudentQuizAttempts(user.id),
                getAllGrades(),
                getAllTeachers()
            ]).then(([prog, quizes, grades, teachersList]) => {
                if (!isMounted) return;
                setStudentProgress((prog || []).reverse());
                setQuizAttempts((quizes || []).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
                setAllGrades(grades || []);
                setTeachers(teachersList || []);
            }).catch(error => {
                console.error("Error loading profile data:", error);
                if (isMounted) {
                    setStudentProgress([]);
                    setQuizAttempts([]);
                    setAllGrades([]);
                    setTeachers([]);
                }
            });
        }
        return () => { isMounted = false; };
    }, [user]);

    const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        setIsFullscreen(!!document.fullscreenElement);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                addToast('لا يمكن تفعيل وضع ملء الشاشة في هذا المتصفح', ToastType.ERROR);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    const handleSelectAvatar = async (url: string) => {
        if (!user) return;
        const { error } = await updateUser(user.id, { imageUrl: url });
        if (error) {
            addToast("حدث خطأ في تحديث الصورة", ToastType.ERROR);
        } else {
            addToast("تم تحديث صورتك بنجاح!", ToastType.SUCCESS);
            await refetchUser(false);
            setIsAvatarPickerOpen(false);
        }
    };

    const handleColorSelect = (color: string) => {
        setProfileHeaderColor(color);
        setIsColorPickerOpen(false);
        addToast("تم تغيير لون المظهر", ToastType.SUCCESS);
    };

    const saveProfileChanges = async () => {
        if (!user) return;
        const updates: Partial<User> = {
            name: editFormData.name,
            grade: editFormData.grade ? parseInt(editFormData.grade) : null,
        };
        const { error } = await updateUser(user.id, updates);
        if (error) addToast(`فشل: ${error.message}`, ToastType.ERROR);
        else {
            addToast("تم تحديث بياناتك بنجاح!", ToastType.SUCCESS);
            setIsEditModalOpen(false);
            refetchUser(true);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword.length < 6) {
            addToast("كلمة المرور يجب أن تكون 6 أحرف على الأقل", ToastType.ERROR);
            return;
        }

        if (newPassword !== confirmPassword) {
            addToast("كلمات المرور غير متطابقة", ToastType.ERROR);
            return;
        }

        setIsPassLoading(true);
        try {
            const { error } = await updateUserPassword(newPassword);
            if (error) {
                addToast(`فشل التحديث: ${error.message}`, ToastType.ERROR);
            } else {
                addToast("تم تغيير كلمة المرور بنجاح", ToastType.SUCCESS);
                setIsPasswordModalOpen(false);
                setNewPassword('');
                setConfirmPassword('');
            }
        } finally {
            setIsPassLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            const { error } = await deleteSelf();

            if (error) {
                addToast(`فشل حذف الحساب: ${error.message}`, ToastType.ERROR);
                setIsDeleting(false);
            } else {
                addToast("تم حذف حسابك بنجاح", ToastType.SUCCESS);
                onLogout();
            }
        } catch (e: any) {
            addToast(`حدث خطأ: ${e.message}`, ToastType.ERROR);
            setIsDeleting(false);
        }
    };

    const lessonInfoMap = useMemo(() => {
        const map = new Map<string, { title: string, unit: string }>();
        allGrades.forEach(g => g.semesters.forEach(s => s.units.forEach(u => u.lessons.forEach(l => {
            map.set(l.id, { title: l.title, unit: u.title });
        }))));
        return map;
    }, [allGrades]);

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] -mx-4 md:-mx-6 -mt-20 sm:-mt-24 pb-40 transition-colors duration-500 overflow-x-hidden relative">

            {/* --- Advanced Geometric Background --- */}
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0">
                <div className="absolute top-[-10%] -left-[10%] w-[900px] h-[900px] bg-[var(--accent-primary)]/5 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-10 -right-[15%] w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[140px]"></div>
                <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.01]" style={{ backgroundImage: `radial-gradient(var(--text-primary) 2px, transparent 0)`, backgroundSize: '48px 48px' }}></div>
            </div>

            {/* --- Master 3D Header with Ocean Waves --- */}
            <div className="relative w-full h-[380px] sm:h-[460px] z-10 animate-fade-in">
                <div className="absolute inset-0 transition-all duration-700 overflow-hidden" style={{ backgroundColor: profileHeaderColor }}>

                    {/* --- DECORATIVE SHAPES LAYER (Professional Geometric Design) --- */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-overlay">
                        {/* Large abstract circle */}
                        <div className="absolute -top-32 -right-16 w-96 h-96 rounded-full border-[60px] border-white/10 blur-[2px] transform rotate-12"></div>

                        {/* Floating dots pattern */}
                        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

                        {/* Glowing orb bottom left */}
                        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-gradient-to-tr from-white/20 to-transparent rounded-full blur-3xl"></div>

                        {/* Diagonal lines overlay */}
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 15px, white 15px, white 16px)' }}></div>

                        {/* Subtle geometric accents */}
                        <div className="absolute top-[20%] right-[20%] w-32 h-32 border border-white/20 rounded-3xl rotate-45 backdrop-blur-sm"></div>
                        <div className="absolute bottom-[30%] left-[15%] w-16 h-16 bg-white/10 rounded-full blur-md"></div>
                        <div className="absolute top-[40%] left-[10%] w-24 h-1 bg-gradient-to-r from-white/30 to-transparent rotate-45"></div>
                        <div className="absolute top-[15%] left-[40%] w-1 h-32 bg-gradient-to-b from-white/30 to-transparent rotate-12"></div>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/30"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.4),transparent_70%)]"></div>

                    {/* --- OCEAN WAVE DIVIDER (High Precision SVG) --- */}
                    <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] z-20 transform translate-y-[1px]">
                        <svg className="relative block w-[calc(100%+1.3px)] h-[80px] sm:h-[150px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" preserveAspectRatio="none">
                            <path fill="var(--bg-primary)" fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,197.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                        </svg>
                    </div>

                </div>

                {/* Glass Controls */}
                <div className="absolute top-24 sm:top-28 left-6 right-6 flex justify-between items-center z-20">
                    <button onClick={() => setIsColorPickerOpen(true)} title="تغيير لون المظهر" aria-label="تغيير لون المظهر" className="w-12 h-12 bg-white/20 backdrop-blur-3xl rounded-2xl flex items-center justify-center text-white border border-white/30 active:scale-90 transition-all shadow-xl hover:bg-white/30">
                        <PaletteIcon className="w-7 h-7" />
                    </button>
                    <button onClick={() => setIsEditModalOpen(true)} title="تعديل البيانات" aria-label="تعديل البيانات" className="bg-white/20 backdrop-blur-3xl text-white border border-white/30 px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-white/30 transition-all shadow-xl active:scale-95">
                        <PencilIcon className="w-4 h-4" /> <span>تعديل البيانات</span>
                    </button>
                </div>

                {/* Avatar with Gamified 3D Effect */}
                <div className="absolute bottom-[20px] left-0 right-0 flex flex-col items-center z-30">
                    <div className="relative group cursor-pointer" onClick={() => setIsAvatarPickerOpen(true)}>
                        <div className="absolute inset-0 rounded-[2.5rem] blur-[40px] opacity-70 scale-125 transition-all duration-1000 group-hover:scale-150 rotate-6" style={{ backgroundColor: profileHeaderColor }}></div>
                        <div className="relative w-36 h-36 sm:w-48 sm:h-48 rounded-[2.5rem] p-3 bg-[var(--bg-primary)] shadow-2xl transition-transform duration-500 group-hover:scale-[1.05] group-hover:-translate-y-2 border-b-[8px] border-r-4 border-[var(--border-primary)] rotate-[-3deg] group-hover:rotate-0">
                            <div className="w-full h-full rounded-[1.8rem] bg-[var(--bg-tertiary)] overflow-hidden shadow-inner flex items-center justify-center relative">
                                {user.imageUrl ? (
                                    <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-5xl sm:text-7xl font-black bg-gradient-to-br from-[var(--accent-primary)] to-indigo-800 text-white uppercase shadow-[inset_0_-10px_20px_rgba(0,0,0,0.3)]">
                                        {user.name.charAt(0)}
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 pointer-events-none rounded-[1.8rem]"></div>
                            </div>
                        </div>
                        <button title="تغيير الصورة الرمزية" aria-label="تغيير الصورة الرمزية" className="absolute -bottom-4 -right-4 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-b from-indigo-500 to-indigo-600 border-4 border-b-[8px] border-[var(--bg-primary)] rounded-[1.5rem] flex items-center justify-center text-white active:translate-y-2 hover:-translate-y-1 transition-all shadow-xl z-40 hover:rotate-12">
                            <PencilIcon className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-md" />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- Main Content Section --- */}
            <div className="mt-4 text-center px-6 max-w-2xl mx-auto relative z-10">
                <div className="mb-12 animate-fade-in-up">
                    <h1 className="text-4xl sm:text-5xl font-black text-[var(--text-primary)] tracking-tight leading-none mb-3">{user.name}</h1>
                    <div className="inline-block bg-[var(--bg-tertiary)]/60 backdrop-blur-md px-5 py-2 rounded-2xl border border-[var(--border-primary)] mb-5">
                        <p className="text-sm font-bold text-[var(--text-secondary)] dir-ltr opacity-80 font-mono tracking-widest uppercase">{user.email}</p>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                        <span className="px-5 py-2 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-[11px] font-black uppercase tracking-widest border border-[var(--accent-primary)]/20 shadow-sm">
                            {user.gradeData?.name || 'طالب المنصة'}
                        </span>
                    </div>
                </div>

                {/* Performance Cards */}
                <div className="grid grid-cols-1 gap-6 mb-8 animate-fade-in-up">
                    <div className="bg-[var(--bg-secondary)]/80 p-2.5 rounded-[3.5rem] border border-[var(--border-primary)] backdrop-blur-xl shadow-2xl relative overflow-hidden">

                        <MenuActionCard
                            label="سجل المشاهدة"
                            icon={VideoCameraIcon}
                            isActive={expandedSection === 'progress'}
                            badge={studentProgress.length > 0 ? studentProgress.length.toString() : undefined}
                            onClick={() => setExpandedSection(expandedSection === 'progress' ? null : 'progress')}
                        />
                        {expandedSection === 'progress' && (
                            <div className="px-2 pb-6 space-y-4 max-h-[480px] overflow-y-auto animate-fade-in custom-scrollbar">
                                {studentProgress.length > 0 ? studentProgress.map((p, i) => {
                                    const lessonInfo = lessonInfoMap.get(p.lesson_id);
                                    return (
                                        <div key={i} className="flex items-center gap-4 p-4.5 bg-[var(--bg-secondary)] rounded-[2.2rem] border border-[var(--border-primary)] shadow-sm active:scale-[0.98] transition-all group overflow-hidden relative animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                                            <div className="w-14 h-14 flex-shrink-0 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center shadow-inner text-indigo-500 border border-white/5">
                                                <VideoCameraIcon className="w-7 h-7" />
                                            </div>
                                            <div className="flex-1 min-w-0 text-right">
                                                <h4 className="text-[15px] font-black text-[var(--text-primary)] truncate leading-tight mb-1.5">
                                                    {lessonInfo?.title || 'عنوان الدرس غير متوفر'}
                                                </h4>
                                                <div className="flex items-center gap-2 opacity-60">
                                                    <BookOpenIcon className="w-4 h-4 text-[var(--text-secondary)]" />
                                                    <p className="text-[12px] font-bold text-[var(--text-secondary)] truncate">
                                                        {lessonInfo?.unit || 'وحدة تعليمية'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0 bg-emerald-500/10 text-emerald-600 p-3 rounded-2xl border border-emerald-500/20">
                                                <CheckCircleIcon className="w-5.5 h-5.5" />
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="py-20 text-center opacity-70">
                                        <VideoCameraIcon className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-5" />
                                        <p className="text-base font-black">السجل فارغ حالياً</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <MenuActionCard
                            label="نتائج الاختبارات"
                            icon={TrophyIcon}
                            isActive={expandedSection === 'results'}
                            badge={quizAttempts.length > 0 ? quizAttempts.length.toString() : undefined}
                            onClick={() => setExpandedSection(expandedSection === 'results' ? null : 'results')}
                        />
                        {expandedSection === 'results' && (
                            <div className="px-2 pb-6 space-y-4 max-h-[480px] overflow-y-auto animate-fade-in custom-scrollbar">
                                {quizAttempts.length > 0 ? quizAttempts.map((q, i) => {
                                    const lessonInfo = lessonInfoMap.get(q.lessonId);
                                    return (
                                        <div key={i} className="flex items-center gap-5 p-4.5 bg-[var(--bg-secondary)] rounded-[2.2rem] border border-[var(--border-primary)] shadow-sm hover:border-[var(--accent-primary)]/30 transition-all animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                                            <div className="flex-1 min-w-0 text-right pr-2">
                                                <p className="text-[15px] font-black truncate text-[var(--text-primary)] leading-tight mb-2">{lessonInfo?.title || 'نتيجة اختبار'}</p>
                                                <div className="flex items-center gap-2 opacity-50">
                                                    <ClockIcon className="w-4 h-4" />
                                                    <p className="text-[11px] font-bold text-[var(--text-secondary)] tracking-wider">{new Date(q.submittedAt).toLocaleDateString('ar-EG')}</p>
                                                </div>
                                            </div>
                                            <div className={`w-18 h-14 rounded-[1.5rem] flex items-center justify-center font-black text-sm shadow-md border ${q.isPass ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-rose-500 text-white border-rose-400'}`}>
                                                {q.score}%
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="py-20 text-center opacity-70">
                                        <TrophyIcon className="w-20 h-20 mx-auto mb-5" />
                                        <p className="text-base font-black">ابدأ أول اختبار لك الآن</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Subscription Status - Gamified */}
                <div className="bg-[var(--bg-secondary)] p-6 rounded-[2.5rem] border-2 border-b-[8px] border-[var(--border-primary)] shadow-xl mb-8 relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                    <h2 className="text-xl font-black text-[var(--text-primary)] mb-6 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-[1.2rem] bg-indigo-500/10 text-indigo-500 flex items-center justify-center border-2 border-b-4 border-indigo-500/20">
                            <CreditCardIcon className="w-6 h-6" />
                        </div>
                        حالة الاشتراك
                    </h2>

                    {activeSubscriptions.length > 0 ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-5 bg-emerald-500 border-b-[6px] border-emerald-600 rounded-[2rem] transform transition-transform hover:-translate-y-1">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white shadow-inner">
                                        <ShieldCheckIcon className="w-7 h-7 drop-shadow-md" />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-white drop-shadow-sm">اشتراك نشط</p>
                                        <p className="text-xs text-white/90 font-bold mt-0.5 uppercase tracking-widest">
                                            {isComprehensive ? 'وصول شامل للمنصة' : `مشترك في ${activeSubscriptions.length} مواد`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[var(--bg-tertiary)] p-5 rounded-[2rem] border-2 border-b-[6px] border-[var(--border-primary)] text-right space-y-4">
                                <p className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-wider border-b-2 border-dashed border-[var(--border-primary)] pb-3">الباقات المتاحة لك</p>
                                {activeSubscriptions.map((sub, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-[var(--bg-secondary)] p-3 rounded-2xl border-2 border-[var(--border-primary)] border-b-4">
                                        <div className="flex flex-col">
                                            <span className="font-black text-[var(--text-primary)] text-sm">
                                                {sub.teacherId ? `أ. ${teacherMap.get(sub.teacherId) || 'ممارس مادة'}` : 'الباقة الشاملة (الكل)'}
                                            </span>
                                            <span className="text-xs text-[var(--accent-primary)] font-black uppercase tracking-wider mt-0.5">
                                                {sub.plan === 'Annual' ? 'اشتراك سنوي' : sub.plan === 'SemiAnnually' ? 'نص سنوي' : sub.plan === 'Quarterly' ? 'ربع سنوي' : 'اشتراك شهري'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1 text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-3 py-2 rounded-xl border border-[var(--border-primary)] shadow-sm">
                                            <span className="text-[10px] uppercase font-black tracking-widest opacity-60">ينتهي في</span>
                                            <span className="font-black text-xs text-indigo-500">{new Date(sub.endDate).toLocaleDateString('ar-EG')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <div className="w-20 h-20 bg-rose-500/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 text-rose-500 border-2 border-b-4 border-rose-500/20 rotate-[-5deg]">
                                <ShieldExclamationIcon className="w-10 h-10" />
                            </div>
                            <p className="text-sm font-black text-[var(--text-secondary)] mb-6">أنت لست مشتركاً. جميع الدروس مغلقة.</p>
                            <button
                                onClick={() => onNavigate('subscription')}
                                className="w-full py-4 bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 border-b-[6px] border-emerald-600 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-emerald-500/30 transition-all active:translate-y-2 hover:-translate-y-1"
                            >
                                افتح الفصول الآن
                            </button>
                        </div>
                    )}
                </div>

                {/* System Settings Panel - Gamified 3D */}
                <div className="bg-[var(--bg-secondary)] p-8 rounded-[3.5rem] border-2 border-b-[8px] border-[var(--border-primary)] space-y-7 shadow-2xl relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <div className="absolute bottom-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-[40px] translate-y-1/2 translate-x-1/2"></div>

                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-[var(--text-primary)]">إعدادات المنصة</h3>
                        <div className="w-12 h-12 rounded-[1.2rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-inner border-2 border-[var(--border-primary)]"><CogIcon className="w-6 h-6 text-[var(--text-secondary)]" /></div>
                    </div>

                    {/* Data Saver */}
                    <div className="flex items-center justify-between p-5 bg-[var(--bg-tertiary)] rounded-[2rem] border-2 border-b-[6px] border-[var(--border-primary)] shadow-sm transition-all group scale-[0.98] hover:scale-100">
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center transition-all ${isDataSaverEnabled ? 'bg-emerald-500 text-white shadow-lg drop-shadow-md' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-2 border-b-4 border-[var(--border-primary)] shadow-sm'}`}>
                                <ShieldCheckIcon className="w-7 h-7" />
                            </div>
                            <div className="text-right">
                                <p className="text-base font-black text-[var(--text-primary)]">توفير البيانات</p>
                                <p className="text-xs text-[var(--text-secondary)] font-bold opacity-80 mt-1">يقلل جودة الفيديو</p>
                            </div>
                        </div>
                        <button
                            onClick={() => onDataSaverToggle(!isDataSaverEnabled)}
                            title="تفعيل توفير البيانات"
                            aria-label="تفعيل توفير البيانات"
                            className={`w-16 h-10 rounded-full relative transition-all duration-300 border-2 border-b-4 border-[var(--border-primary)] ${isDataSaverEnabled ? 'bg-emerald-500 border-emerald-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                        >
                            <div className={`absolute top-1 bottom-1 w-7 bg-white rounded-full shadow-md transition-all ${isDataSaverEnabled ? 'left-1' : 'left-[calc(100%-2rem)]'}`}></div>
                        </button>
                    </div>

                    {/* Dark Mode */}
                    <div className="flex items-center justify-between p-5 bg-[var(--bg-tertiary)] rounded-[2rem] border-2 border-b-[6px] border-[var(--border-primary)] shadow-sm transition-all group scale-[0.98] hover:scale-100">
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center transition-all ${mode === 'dark' ? 'bg-indigo-600 text-white drop-shadow-md' : 'bg-amber-400 text-white drop-shadow-md'}`}>
                                {mode === 'dark' ? <MoonIcon className="w-7 h-7" /> : <SunIcon className="w-8 h-8" />}
                            </div>
                            <div className="text-right">
                                <p className="text-base font-black text-[var(--text-primary)]">المظهر الداكن</p>
                                <p className="text-xs text-[var(--text-secondary)] font-bold opacity-80 mt-1">{mode === 'dark' ? 'الوضع الليلي نشط' : 'الوضع النهاري نشط'}</p>
                            </div>
                        </div>
                        <button title="المظهر الداكن" aria-label="المظهر الداكن" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')} className={`w-16 h-10 rounded-full relative transition-all duration-300 border-2 border-b-4 border-[var(--border-primary)] ${mode === 'dark' ? 'bg-indigo-600 border-indigo-700' : 'bg-amber-400 border-amber-500'}`}>
                            <div className={`absolute top-1 bottom-1 w-7 bg-white rounded-full shadow-sm transition-all ${mode === 'dark' ? 'left-1' : 'left-[calc(100%-2rem)]'}`}></div>
                        </button>
                    </div>

                    {/* Full Screen Mode */}
                    <div className="flex items-center justify-between p-5 bg-[var(--bg-tertiary)] rounded-[2rem] border-2 border-b-[6px] border-[var(--border-primary)] shadow-sm transition-all group scale-[0.98] hover:scale-100">
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center transition-all ${isFullscreen ? 'bg-purple-600 text-white drop-shadow-md' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-2 border-b-4 border-[var(--border-primary)] shadow-sm'}`}>
                                {isFullscreen ? <ArrowsShrinkIcon className="w-7 h-7" /> : <ArrowsExpandIcon className="w-7 h-7" />}
                            </div>
                            <div className="text-right">
                                <p className="text-base font-black text-[var(--text-primary)]">ملء الشاشة</p>
                                <p className="text-xs text-[var(--text-secondary)] font-bold opacity-80 mt-1">{isFullscreen ? 'مفعل' : 'غير مفعل'}</p>
                            </div>
                        </div>
                        <button title="ملء الشاشة" aria-label="ملء الشاشة" onClick={toggleFullscreen} className={`w-16 h-10 rounded-full relative transition-all duration-300 border-2 border-b-4 border-[var(--border-primary)] ${isFullscreen ? 'bg-purple-600 border-purple-700' : 'bg-slate-200 dark:bg-slate-800'}`}>
                            <div className={`absolute top-1 bottom-1 w-7 bg-white rounded-full shadow-sm transition-all ${isFullscreen ? 'left-1' : 'left-[calc(100%-2rem)]'}`}></div>
                        </button>
                    </div>

                </div>

                {/* Final Actions */}
                <div className="mt-14 space-y-5 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                    <button onClick={() => { setIsPasswordModalOpen(true); setNewPassword(''); setConfirmPassword(''); }} className="w-full py-5 rounded-[1.5rem] bg-[var(--bg-secondary)] border-2 border-b-[6px] border-[var(--border-primary)] font-black text-sm text-[var(--text-primary)] flex items-center justify-center gap-3 active:translate-y-1 transition-transform">
                        <KeyIcon className="w-5 h-5 text-indigo-500" /> تغيير كلمة المرور
                    </button>

                    <div className="flex gap-4">
                        <button
                            onClick={onLogout}
                            title="تسجيل الخروج"
                            aria-label="تسجيل الخروج"
                            className="flex-1 py-5 rounded-[1.5rem] bg-indigo-600 text-white border-b-[6px] border-indigo-800 font-black text-sm uppercase tracking-wider active:translate-y-2 transition-transform shadow-xl flex items-center justify-center gap-2"
                        >
                            تسجيل الخروج
                        </button>
                        <button
                            onClick={() => setIsDeleteModalOpen(true)}
                            title="حذف الحساب"
                            aria-label="حذف الحساب"
                            className="w-20 h-20 rounded-[1.5rem] bg-rose-50 text-rose-500 dark:bg-rose-500/10 border-2 border-b-[6px] border-rose-200 dark:border-rose-500/20 flex items-center justify-center active:translate-y-2 transition-transform hover:bg-rose-100 shadow-sm"
                        >
                            <TrashIcon className="w-7 h-7" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals remain the same... */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="تعديل الملف الشخصي">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="editProfileName" className="block text-sm font-bold text-[var(--text-secondary)] mb-1">الاسم الكامل</label>
                        <input
                            id="editProfileName"
                            type="text"
                            placeholder="الاسم الكامل"
                            title="الاسم الكامل"
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                            className="w-full p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] focus:border-[var(--accent-primary)] outline-none"
                        />
                    </div>
                    <div>
                        <label htmlFor="editProfileGrade" className="block text-sm font-bold text-[var(--text-secondary)] mb-1">الصف الدراسي</label>
                        <select
                            id="editProfileGrade"
                            title="الصف الدراسي"
                            aria-label="اختر الصف الدراسي"
                            value={editFormData.grade}
                            onChange={(e) => setEditFormData({ ...editFormData, grade: e.target.value })}
                            className="w-full p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] focus:border-[var(--accent-primary)] outline-none"
                        >
                            <option value="">اختر الصف...</option>
                            {allGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button onClick={saveProfileChanges} className="px-6 py-2 bg-[var(--accent-primary)] text-white rounded-lg font-bold shadow-lg hover:brightness-110 transition-all">حفظ التغييرات</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isColorPickerOpen} onClose={() => setIsColorPickerOpen(false)} title="لون المظهر" maxWidth="max-w-sm">
                <div className="grid grid-cols-4 gap-3 p-2">
                    {AVAILABLE_COLORS.map(color => (
                        <button
                            key={color}
                            onClick={() => handleColorSelect(color)}
                            className="w-12 h-12 rounded-full relative shadow-sm border-2 border-white/20 hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                        >
                            {profileHeaderColor === color && <span className="absolute inset-0 flex items-center justify-center text-white"><CheckIcon className="w-6 h-6 drop-shadow-md" /></span>}
                        </button>
                    ))}
                </div>
            </Modal>

            <Modal isOpen={isAvatarPickerOpen} onClose={() => setIsAvatarPickerOpen(false)} title="اختر صورة رمزية">
                <div className="grid grid-cols-3 gap-4">
                    {AVATAR_OPTIONS.map((url, i) => (
                        <button
                            key={i}
                            onClick={() => handleSelectAvatar(url)}
                            className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 ${user.imageUrl === url ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/30' : 'border-transparent'}`}
                        >
                            <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            </Modal>

            <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title="تغيير كلمة المرور">
                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <p className="text-sm text-[var(--text-secondary)] font-bold">أدخل كلمة المرور الجديدة لضمان أمان حسابك:</p>

                    <div className="relative group">
                        <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="كلمة المرور الجديدة"
                            className="w-full p-4 pr-12 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] focus:border-[var(--accent-primary)] outline-none font-bold shadow-inner"
                        />
                        <KeyIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] opacity-50" />
                    </div>

                    <div className="relative group">
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="تأكيد كلمة المرور"
                            className="w-full p-4 pr-12 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] focus:border-[var(--accent-primary)] outline-none font-bold shadow-inner"
                        />
                        <ShieldCheckIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] opacity-50" />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-primary)]">
                        <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors">إلغاء</button>
                        <button
                            type="submit"
                            disabled={isPassLoading}
                            className="px-8 py-2.5 bg-[var(--accent-primary)] text-white rounded-xl font-black shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                        >
                            {isPassLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'تحديث كلمة المرور'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="حذف حسابي نهائياً">
                <div className="space-y-4">
                    <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 text-red-600">
                        <p className="font-bold text-sm">هل أنت متأكد؟</p>
                        <p className="text-sm mt-1 leading-relaxed">
                            سيتم حذف حسابك وجميع بياناتك بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.
                            يشمل ذلك: البريد الإلكتروني، الاشتراكات، التقدم، والسجلات.
                        </p>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="px-5 py-2.5 rounded-lg font-bold bg-[var(--bg-tertiary)] text-[var(--text-primary)]">إلغاء</button>
                        <button onClick={handleDeleteAccount} disabled={isDeleting} className="px-5 py-2.5 rounded-lg font-bold bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20 disabled:opacity-50">
                            {isDeleting ? "جاري الحذف..." : "نعم، احذف حسابي"}
                        </button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default Profile;
