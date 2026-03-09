
import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { User, TeacherView, Teacher, Grade, Role } from '../../types';
import { getAllGrades, supabase } from '../../services/storageService';
import { getTeacherById } from '../../services/teacherService';
import { getSubscriptionsByTeacherId, getSubscriptionsByTeacherIds } from '../../services/subscriptionService';
import TeacherLayout from './TeacherLayout';
import { CollectionIcon, UsersIcon, InformationCircleIcon, ChartBarIcon, StarIcon, CheckCircleIcon, SparklesIcon, ShieldCheckIcon } from '../common/Icons';
import { useSession } from '../../hooks/useSession';
import Loader from '../common/Loader';

const TeacherContentManagement = lazy(() => import('./TeacherContentManagement'));
const TeacherSubscriptionsView = lazy(() => import('./TeacherSubscriptionsView'));
const TeacherProfileView = lazy(() => import('./TeacherProfileView'));
const SupervisorStudentManagementView = lazy(() => import('../supervisor/SupervisorStudentManagementView'));
const SupervisorStudentDetailView = lazy(() => import('../supervisor/SupervisorStudentDetailView'));
const StudentChatsView = lazy(() => import('./StudentChatsView'));
const TeacherStudentChatsView = lazy(() => import('./TeacherStudentChatsView'));

// --- Premium Stat Card ---
const StatBento: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.FC<any>;
    gradient: string;
    colSpan?: string;
}> = ({ title, value, subtitle, icon: Icon, gradient, colSpan = "col-span-1" }) => (
    <div className={`relative overflow-hidden rounded-[2.5rem] p-6 shadow-lg transition-all duration-300 hover:scale-[1.02] group ${colSpan} bg-white dark:bg-[#1A1A1A] border border-[var(--border-primary)]`}>
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-bl-full transition-transform group-hover:scale-110`}></div>

        <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>

            <div>
                <h3 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">{value}</h3>
                <p className="text-sm font-bold text-[var(--text-secondary)] mt-1">{title}</p>
                {subtitle && <p className="text-sm font-medium text-[var(--text-secondary)] opacity-60 mt-2">{subtitle}</p>}
            </div>
        </div>
    </div>
);

// --- Main Dashboard Component ---
const MainDashboard: React.FC<{ teacher: Teacher | null; user: User; supervisedTeachers: Teacher[] }> = ({ teacher, user, supervisedTeachers }) => {
    const [stats, setStats] = useState({
        totalUnits: 0,
        totalStudents: 0,
        totalLessons: 0,
        activeSubscriptions: 0
    });
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    const isSupervisor = user.role === Role.SUPERVISOR;

    useEffect(() => {
        const loadStats = async () => {
            setIsLoadingStats(true);
            try {
                let unitsCount = 0;
                let lessonsCount = 0;
                let studentsCount = 0;
                let activeSubCount = 0;

                const allGrades = await getAllGrades();

                if (isSupervisor) {
                    // Supervisor Logic: Aggregate all teachers
                    const teacherIds = supervisedTeachers.map(t => t.id);

                    // Content Stats
                    allGrades.forEach(g => {
                        g.semesters.forEach(s => {
                            s.units.forEach(u => {
                                if (teacherIds.includes(u.teacherId)) {
                                    unitsCount++;
                                    lessonsCount += u.lessons.length;
                                }
                            });
                        });
                    });

                    // Student Stats
                    if (teacherIds.length > 0) {
                        const subs = await getSubscriptionsByTeacherIds(teacherIds);
                        studentsCount = new Set(subs.map((s: any) => s.userId)).size;
                        activeSubCount = subs.filter((s: any) => s.status === 'Active').length;
                    }

                } else if (teacher) {
                    // Teacher Logic
                    allGrades.forEach(g => {
                        g.semesters.forEach(s => {
                            s.units.forEach(u => {
                                if (u.teacherId === teacher.id) {
                                    unitsCount++;
                                    lessonsCount += u.lessons.length;
                                }
                            });
                        });
                    });

                    const subs = await getSubscriptionsByTeacherId(teacher.id);
                    studentsCount = new Set(subs.map((s: any) => s.userId)).size;
                    activeSubCount = subs.filter((s: any) => s.status === 'Active').length;
                }

                setStats({
                    totalUnits: unitsCount,
                    totalLessons: lessonsCount,
                    totalStudents: studentsCount,
                    activeSubscriptions: activeSubCount
                });
            } catch (error) {
                console.error("Error loading dashboard stats", error);
            } finally {
                setIsLoadingStats(false);
            }
        };

        loadStats();
    }, [teacher, isSupervisor, supervisedTeachers]);

    const firstName = user.name.split(' ')[0];

    return (
        <div className="space-y-8 fade-in pb-20">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-[3rem] bg-[#0F172A] p-8 md:p-12 text-white shadow-2xl border border-white/5">
                <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-indigo-600/30 to-transparent"></div>
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-600/30 rounded-full blur-[80px]"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className={`px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-widest border border-white/10 backdrop-blur-md ${isSupervisor ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-300'}`}>
                                {isSupervisor ? 'حساب مشرف' : 'حساب معلم'}
                            </span>
                            <span className="flex items-center gap-1 text-sm text-white/60 font-bold">
                                <CheckCircleIcon className="w-3 h-3 text-emerald-400" /> متصل
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-2">
                            مرحباً، <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200">{firstName}</span> 👋
                        </h1>
                        <p className="text-indigo-200/70 font-medium text-lg max-w-lg">
                            {isSupervisor
                                ? 'لديك نظرة شاملة على أداء المدرسين والطلاب. تابع التقدم وأدر المحتوى بكفاءة.'
                                : 'لوحة التحكم الخاصة بك جاهزة. قم بإدارة المحتوى والطلاب ومتابعة الاشتراكات.'}
                        </p>
                    </div>

                    {/* Role Badge / Icon */}
                    <div className="hidden md:flex flex-col items-center justify-center w-32 h-32 bg-white/5 backdrop-blur-lg rounded-[2.5rem] border border-white/10 shadow-inner">
                        {isSupervisor ? (
                            <ShieldCheckIcon className="w-12 h-12 text-amber-400 mb-2" />
                        ) : (
                            <SparklesIcon className="w-12 h-12 text-indigo-400 mb-2" />
                        )}
                        <span className="text-sm font-black uppercase tracking-widest text-white/80">
                            {isSupervisor ? 'Super Admin' : 'Instructor'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatBento
                    title="إجمالي الطلاب"
                    value={isLoadingStats ? '-' : stats.totalStudents}
                    icon={UsersIcon}
                    gradient="from-blue-500 to-indigo-600"
                    subtitle="عدد الطلاب الفريدين"
                />
                <StatBento
                    title="الاشتراكات النشطة"
                    value={isLoadingStats ? '-' : stats.activeSubscriptions}
                    icon={CheckCircleIcon}
                    gradient="from-emerald-500 to-teal-600"
                    subtitle="باقات سارية المفعول"
                />
                <StatBento
                    title="الوحدات الدراسية"
                    value={isLoadingStats ? '-' : stats.totalUnits}
                    icon={CollectionIcon}
                    gradient="from-purple-500 to-pink-600"
                    subtitle="محتوى تم نشره"
                />
                <StatBento
                    title="إجمالي الدروس"
                    value={isLoadingStats ? '-' : stats.totalLessons}
                    icon={ChartBarIcon}
                    gradient="from-amber-500 to-orange-600"
                    subtitle="شرح، واجبات، واختبارات"
                />
            </div>

            {/* Supervisor Specific: Managed Teachers */}
            {isSupervisor && supervisedTeachers.length > 0 && (
                <div className="bg-[var(--bg-secondary)] p-8 rounded-[3rem] border border-[var(--border-primary)] shadow-sm">
                    <h2 className="text-2xl font-black text-[var(--text-primary)] mb-6 flex items-center gap-3">
                        <UsersIcon className="w-6 h-6 text-purple-500" />
                        المدرسين تحت إشرافك
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {supervisedTeachers.map(t => (
                            <div key={t.id} className="flex items-center gap-4 p-4 rounded-3xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] hover:border-purple-500/30 transition-all">
                                <img src={t.imageUrl || 'https://via.placeholder.com/50'} alt={t.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white dark:border-slate-700 shadow-sm" />
                                <div>
                                    <h4 className="font-bold text-[var(--text-primary)]">{t.name}</h4>
                                    <p className="text-sm text-[var(--text-secondary)] opacity-70">{t.subject}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

let inMemoryState: any = {};
export const setMemoryState = (state: any) => { inMemoryState = state; };

const StudentDetailWrapper: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const router = useRouter();
    if (!inMemoryState?.user) {
        router.replace('/teacher/students');
        return null;
    }
    return <SupervisorStudentDetailView user={inMemoryState.user} onBack={onBack} />;
};

const TeacherDashboard: React.FC = () => {
    const { currentUser: user, handleLogout: onLogout } = useSession();
    const [teacherProfile, setTeacherProfile] = useState<Teacher | null>(null);
    const [supervisedTeachers, setSupervisedTeachers] = useState<Teacher[]>([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setTeacherProfile(null);
            setSupervisedTeachers([]);
            setSelectedTeacherId(null);

            if (user.role === Role.SUPERVISOR) {
                const { data: links, error: linkError } = await supabase
                    .from('supervisor_teachers')
                    .select('teacher_id')
                    .eq('supervisor_id', user.id);

                if (links && links.length > 0) {
                    const teacherIds = links.map(l => l.teacher_id);
                    const profiles = await Promise.all(teacherIds.map(async (id) => {
                        try {
                            return await getTeacherById(id);
                        } catch (e) {
                            return null;
                        }
                    }));

                    const validProfiles = profiles.filter((p): p is Teacher => p !== null);
                    setSupervisedTeachers(validProfiles);
                    if (validProfiles.length > 0) setSelectedTeacherId(validProfiles[0].id);
                }
                setIsLoading(false);

            } else if (user.role === Role.TEACHER) {
                const teacherRecordId = user.teacherId;
                if (teacherRecordId) {
                    try {
                        const profile = await getTeacherById(teacherRecordId);
                        setTeacherProfile(profile);
                    } catch (e) {
                        console.error("Failed to fetch teacher profile", e);
                    }
                }
                setIsLoading(false);
            } else {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    const effectiveTeacherProfile = useMemo(() => {
        if (user?.role === Role.SUPERVISOR) {
            return supervisedTeachers.find(t => t.id === selectedTeacherId) || null;
        }
        return teacherProfile;
    }, [user?.role, selectedTeacherId, supervisedTeachers, teacherProfile]);

    const activeView = useMemo(() => {
        const path = pathname || '';
        if (path === '/teacher' || path === '/teacher/dashboard') return 'dashboard';
        if (path.includes('/students')) return 'students';
        if (path.includes('/student-chats')) return 'studentChats';
        if (path.includes('/content')) return 'content';
        if (path.includes('/subscriptions')) return 'subscriptions';
        if (path.includes('/profile')) return 'profile';
        return 'dashboard';
    }, [pathname]);

    const handleNavClick = (view: TeacherView) => {
        switch (view) {
            case 'dashboard': router.push('/teacher/dashboard'); break;
            case 'students': router.push('/teacher/students'); break;
            case 'studentChats': router.push('/teacher/student-chats'); break;
            case 'content': router.push('/teacher/content'); break;
            case 'subscriptions': router.push('/teacher/subscriptions'); break;
            case 'profile': router.push('/teacher/profile'); break;
            default: router.push('/teacher/dashboard');
        }
    };

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
                <Loader />
                <p className="mt-4 text-lg text-[var(--text-secondary)]">جاري تحميل البيانات...</p>
            </div>
        );
    }

    // Check if we have a valid profile to show layout
    if (!user || (!effectiveTeacherProfile && user.role === Role.TEACHER)) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)] p-8 text-center">
                <InformationCircleIcon className="mx-auto h-20 w-20 text-yellow-500" />
                <h1 className="text-3xl font-bold mt-6">الحساب غير مربوط</h1>
                <p className="mt-4 text-lg text-[var(--text-secondary)] max-w-md">
                    للوصول إلى لوحة التحكم، يجب أن يكون حسابك مربوطًا بملف مدرس. يرجى التواصل مع مسؤول المنصة لإتمام عملية الربط.
                </p>
                <button onClick={onLogout} className="mt-8 px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors">تسجيل الخروج</button>
            </div>
        );
    }

    // Ensure effectiveTeacherProfile is passed only if it exists, otherwise handle supervisor w/o teachers inside layout
    const layoutTeacher = effectiveTeacherProfile || (user.role === Role.SUPERVISOR ? { id: 'dummy', name: 'مشرف', subject: '', imageUrl: '' } as Teacher : null);

    if (!layoutTeacher) return null;

    const renderContent = () => {
        const path = pathname || '';

        if (path.includes('/students/')) {
            return <StudentDetailWrapper onBack={() => router.push('/teacher/students')} />;
        }

        if (path.includes('/students')) {
            return user?.role === Role.SUPERVISOR ? (
                <SupervisorStudentManagementView supervisedTeachers={supervisedTeachers} onViewDetails={(u) => { setMemoryState({ user: u }); router.push(`/teacher/students/${u.id}`); }} />
            ) : (
                <MainDashboard teacher={effectiveTeacherProfile} user={user!} supervisedTeachers={supervisedTeachers} />
            );
        }

        if (path.includes('/student-chats')) {
            return user?.role === Role.SUPERVISOR ? (
                <StudentChatsView supervisedTeachers={supervisedTeachers} supervisorId={user.id} />
            ) : (
                <TeacherStudentChatsView teacher={effectiveTeacherProfile!} teacherId={user.id} />
            );
        }

        if (path.includes('/content')) return <TeacherContentManagement teacher={effectiveTeacherProfile!} isReadOnly={false} />;
        if (path.includes('/subscriptions')) return <TeacherSubscriptionsView teacher={effectiveTeacherProfile!} />;
        if (path.includes('/profile')) return <TeacherProfileView teacher={effectiveTeacherProfile!} />;

        return <MainDashboard teacher={effectiveTeacherProfile} user={user!} supervisedTeachers={supervisedTeachers} />;
    };

    return (
        <TeacherLayout
            user={user}
            teacher={layoutTeacher}
            onLogout={onLogout}
            activeView={activeView}
            onNavClick={handleNavClick}
            supervisedTeachers={supervisedTeachers}
            selectedTeacherId={selectedTeacherId}
            onSelectTeacher={setSelectedTeacherId}
        >
            <Suspense fallback={<Loader />}>
                {renderContent()}
            </Suspense>
        </TeacherLayout>
    );
};

export default TeacherDashboard;
