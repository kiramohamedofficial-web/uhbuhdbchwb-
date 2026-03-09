
import React, { useState, useMemo, useEffect } from 'react';
import { StudentView, ToastType, PlatformSettings, Teacher, Subscription, SubscriptionRequest } from '../../types';
import { BookOpenIcon, VideoCameraIcon, SparklesIcon, ArrowRightIcon, QrcodeIcon, CreditCardIcon, CheckCircleIcon, ClockIcon, ShieldCheckIcon, UserCircleIcon, ChevronLeftIcon } from '../common/Icons';
import { useSession } from '../../hooks/useSession';
import { useToast } from '../../useToast';
import { getPlatformSettings } from '../../services/storageService';
import { getAllTeachers } from '../../services/teacherService';
import { redeemCode } from '../../services/subscriptionService';
import { useSubscription } from '../../hooks/useSubscription';
import Loader from '../common/Loader';

interface SubscriptionViewProps {
    onNavigate: (view: StudentView) => void;
}

const PremiumSelectionCard: React.FC<{
    icon: React.FC<{ className?: string }>;
    title: string;
    description: string;
    onClick: () => void;
    colorTheme: 'purple' | 'blue' | 'amber';
    index: number;
    badge?: string;
}> = ({ icon: Icon, title, description, onClick, colorTheme, index, badge }) => {

    const themeStyles = {
        purple: {
            bg: 'bg-gradient-to-br from-amber-500/10 to-yellow-500/5',
            border: 'border-amber-500/20',
            iconBg: 'bg-amber-600',
            glow: 'shadow-amber-500/20'
        },
        blue: {
            bg: 'bg-gradient-to-br from-blue-500/10 to-cyan-500/5',
            border: 'border-blue-500/20',
            iconBg: 'bg-blue-600',
            glow: 'shadow-blue-500/20'
        },
        amber: {
            bg: 'bg-gradient-to-br from-amber-500/10 to-orange-500/5',
            border: 'border-amber-500/20',
            iconBg: 'bg-amber-500',
            glow: 'shadow-amber-500/20'
        },
    };

    const currentTheme = themeStyles[colorTheme];

    return (
        <button
            onClick={onClick}
            style={{ animationDelay: `${index * 100}ms` }}
            className={`w-full group relative overflow-hidden rounded-[2.5rem] p-6 text-right border transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] reveal-item ${currentTheme.bg} ${currentTheme.border} bg-white dark:bg-slate-900/40 backdrop-blur-xl`}
        >
            <div className="flex items-center gap-5">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl ${currentTheme.iconBg} ${currentTheme.glow} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                    <Icon className="w-8 h-8" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-black text-[var(--text-primary)] leading-tight">{title}</h3>
                        {badge && <span className="px-2 py-0.5 rounded-md bg-white/20 text-[8px] font-black uppercase tracking-widest border border-white/10">{badge}</span>}
                    </div>
                    <p className="text-sm font-bold text-[var(--text-secondary)] opacity-70 leading-relaxed line-clamp-2">{description}</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-[var(--text-secondary)] group-hover:bg-white group-hover:text-black transition-all">
                    <ChevronLeftIcon className="w-5 h-5" />
                </div>
            </div>
        </button>
    );
};

const ActiveSubSummary: React.FC<{ sub: Subscription, teacherName?: string, index: number }> = ({ sub, teacherName, index }) => {
    const isComprehensive = !sub.teacherId;
    return (
        <div
            style={{ animationDelay: `${index * 100}ms` }}
            className="flex items-center gap-4 p-4 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/20 animate-fade-in shadow-sm hover:border-emerald-500/40 transition-colors"
        >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg flex-shrink-0">
                <ShieldCheckIcon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-[var(--text-primary)] truncate">{isComprehensive ? 'اشتراك شامل' : `مادة: ${teacherName}`}</p>
                    <span className="text-sm font-black bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-md">نشط</span>
                </div>
                <p className="text-sm font-black text-emerald-600/70 mt-1 flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    ينتهي في {new Date(sub.endDate).toLocaleDateString('ar-EG')}
                </p>
            </div>
        </div>
    );
};

const PendingRequestCard: React.FC<{ request: SubscriptionRequest, index: number }> = ({ request, index }) => (
    <div
        style={{ animationDelay: `${index * 100}ms` }}
        className="flex items-center gap-4 p-4 rounded-[2rem] bg-amber-500/5 border border-amber-500/20 animate-fade-in"
    >
        <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg flex-shrink-0">
            <ClockIcon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
                <p className="text-sm font-black text-[var(--text-primary)] truncate">{request.subjectName || 'باقة شاملة'}</p>
                <span className="text-sm font-black bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-md">قيد المراجعة</span>
            </div>
            <p className="text-sm font-black text-amber-600/70 mt-1">
                تم الطلب في {new Date(request.createdAt).toLocaleDateString('ar-EG')}
            </p>
        </div>
    </div>
);

const SubscriptionView: React.FC<SubscriptionViewProps> = ({ onNavigate }) => {
    const { currentUser } = useSession();
    const { activeSubscriptions, pendingRequests, refetchSubscription, isLoading: isSubLoading } = useSubscription();
    const { addToast } = useToast();
    const [code, setCode] = useState('');
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [teachers, setTeachers] = useState<Teacher[]>([]);

    useEffect(() => {
        Promise.all([
            getPlatformSettings(),
            getAllTeachers()
        ]).then(([settings, teachersData]) => {
            setTeachers(teachersData);
            setIsLoadingData(false);
        });
    }, []);

    const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);

    const handleRedeemCode = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanCode = code.trim().toUpperCase();
        if (!cleanCode || !currentUser) return;

        setIsRedeeming(true);
        try {
            const result = await redeemCode(cleanCode, currentUser.grade || 0, currentUser.track || 'All');
            if (result.success) {
                addToast('🎉 مبروك! تم تفعيل الاشتراك بنجاح. استمتع بمحتواك الجديد.', ToastType.SUCCESS);
                setCode('');
                await refetchSubscription();
            } else {
                addToast(result.error || 'الكود غير صحيح أو مستخدم من قبل.', ToastType.ERROR);
            }
        } catch (error) {
            addToast('حدث خطأ أثناء الاتصال بالخادم. حاول مرة أخرى.', ToastType.ERROR);
        } finally {
            setIsRedeeming(false);
        }
    };

    if (isLoadingData || isSubLoading) return <div className="flex justify-center items-center h-screen"><Loader /></div>;

    return (
        <div className="max-w-4xl mx-auto pb-40 pt-10 px-4">

            {/* 1. Header Section */}
            <div className="text-center mb-16 reveal-item">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-600 text-sm font-black uppercase tracking-[0.2em] mb-4 border border-amber-500/20">
                    Premium Access
                </div>
                <h1 className="text-4xl md:text-6xl font-black text-[var(--text-primary)] mb-4 tracking-tighter leading-tight">
                    استعد للـ <span className="text-amber-600">تفوق</span> 🚀
                </h1>
                <p className="text-[var(--text-secondary)] font-bold text-sm md:text-lg max-w-xl mx-auto opacity-70">
                    اختر الباقة المناسبة لك وابدأ رحلتك التعليمية مع نخبة من أفضل المدرسين.
                </p>
            </div>

            {/* 1.5 Pending Requests (New Section) */}
            {pendingRequests.length > 0 && (
                <div className="mb-8 animate-fade-in-up">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h2 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                            <ClockIcon className="w-5 h-5 text-amber-500" /> طلبات قيد المراجعة
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {pendingRequests.map((req, idx) => (
                            <PendingRequestCard key={req.id} request={req} index={idx} />
                        ))}
                    </div>
                </div>
            )}

            {/* 2. Active Subscriptions */}
            {activeSubscriptions.length > 0 && (
                <div className="mb-12 animate-fade-in-up">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h2 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                            <CheckCircleIcon className="w-5 h-5 text-emerald-500" /> اشتراكاتك الحالية
                        </h2>
                        <span className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest">{activeSubscriptions.length} اشتراك</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {activeSubscriptions.map((sub, idx) => (
                            <ActiveSubSummary
                                key={sub.id}
                                sub={sub}
                                teacherName={sub.teacherId ? teacherMap.get(sub.teacherId) : undefined}
                                index={idx}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* 3. Subscription Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
                <PremiumSelectionCard
                    index={0}
                    icon={SparklesIcon}
                    title="الاشتراك الشامل"
                    description="افتح جميع المواد والمراجعات النهائية بضغطة واحدة."
                    colorTheme="amber"
                    onClick={() => onNavigate('comprehensiveSubscription')}
                    badge="Best Value"
                />
                <PremiumSelectionCard
                    index={1}
                    icon={BookOpenIcon}
                    title="اشتراك مادة واحدة"
                    description="اشترك في مادة محددة مع المدرس الذي تفضله."
                    colorTheme="purple"
                    onClick={() => onNavigate('singleSubjectSubscription')}
                />
            </div>

            {/* 3.5 Comparison Table (NEW) */}
            <div className="mb-16 reveal-item" style={{ animationDelay: '300ms' }}>
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2">قارن بين الباقات ✨</h2>
                    <p className="text-sm font-bold text-[var(--text-secondary)] opacity-60">اختر التفوق الذي يناسب طموحك</p>
                </div>

                <div className="overflow-x-auto rounded-[2rem] border border-[var(--border-primary)] bg-[var(--bg-secondary)]/50 backdrop-blur-md shadow-xl">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border-primary)]">
                                <th className="p-5 text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest">الميزة</th>
                                <th className="p-5 text-sm font-black text-purple-500 text-center">باقة المادة</th>
                                <th className="p-5 text-sm font-black text-amber-500 text-center">الباقة الشاملة</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-bold">
                            {[
                                { name: 'الوصول لجميع الدروس والوحدات', basic: true, pro: true },
                                { name: 'امتحانات دورية وتصحيح تلقائي', basic: true, pro: true },
                                { name: 'مذكرات PDF حصرية', basic: true, pro: true },
                                { name: 'المراجعات النهائية وليالي الامتحان', basic: false, pro: true },
                                { name: 'دخول لجميع المواد بلا استثناء', basic: false, pro: true },
                                { name: 'أولوية الرد في بنك الأسئلة', basic: false, pro: true },
                                { name: 'كود خصم خاص للمتفوقين', basic: false, pro: true },
                            ].map((row, i) => (
                                <tr key={i} className="border-b border-[var(--border-primary)]/50 hover:bg-white/5 transition-colors">
                                    <td className="p-5 text-[var(--text-primary)]">{row.name}</td>
                                    <td className="p-5 text-center">
                                        {row.basic ? <CheckCircleIcon className="w-5 h-5 text-emerald-500 mx-auto" /> : <span className="text-gray-500 opacity-30 text-xs">غير شامل</span>}
                                    </td>
                                    <td className="p-5 text-center">
                                        {row.pro ? <CheckCircleIcon className="w-5 h-5 text-amber-500 mx-auto" /> : <span className="text-gray-500 opacity-30">---</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={() => window.open('https://youtube.com', '_blank')}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-black text-[var(--text-secondary)] hover:text-amber-500 hover:bg-white/10 transition-all"
                    >
                        <VideoCameraIcon className="w-4 h-4" />
                        شرح طريقة الاشتراك (30 ثانية)
                    </button>
                    <button
                        onClick={() => window.open('https://wa.me/201234567890', '_blank')}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-sm font-black text-amber-600 hover:bg-amber-500/20 transition-all"
                    >
                        <UserCircleIcon className="w-4 h-4" />
                        مساعدة - تواصل مع الدعم
                    </button>
                </div>
            </div>

            {/* 4. Redeem Code Section */}
            <div className="relative overflow-hidden rounded-[3rem] p-1 bg-gradient-to-br from-amber-500 via-yellow-600 to-orange-500 shadow-2xl reveal-item" style={{ animationDelay: '400ms' }}>
                <div className="bg-[var(--bg-secondary)] dark:bg-slate-900 rounded-[2.8rem] p-8 md:p-12 relative overflow-hidden">
                    {/* Decorative Background */}
                    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                        <div className="md:w-1/2 text-center md:text-right">
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 mb-4 mx-auto md:mx-0">
                                <QrcodeIcon className="w-8 h-8" />
                            </div>
                            <h2 className="text-3xl font-black text-[var(--text-primary)] mb-2">تفعيل كود هدية؟ 🎁</h2>
                            <p className="text-sm font-bold text-[var(--text-secondary)] opacity-70">أدخل الكود المكون من 8 رموز لتفعيل اشتراكك فوراً والاستمتاع بالمميزات المدفوعة.</p>
                        </div>

                        <form onSubmit={handleRedeemCode} className="md:w-1/2 w-full space-y-4">
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="XXXX-XXXX"
                                    className="w-full bg-[var(--bg-tertiary)] border-2 border-[var(--border-primary)] focus:border-amber-500 rounded-3xl py-5 px-6 text-center font-mono text-2xl font-black tracking-[0.2em] outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-base placeholder:opacity-60 shadow-inner"
                                    dir="ltr"
                                    maxLength={20}
                                />
                                <div className="absolute inset-0 rounded-3xl border-2 border-amber-500 opacity-0 group-focus-within:opacity-10 pointer-events-none transition-opacity"></div>
                            </div>
                            <button
                                type="submit"
                                disabled={isRedeeming || code.length < 4}
                                className="w-full py-5 bg-amber-600 hover:bg-amber-700 text-white rounded-3xl font-black text-lg shadow-xl shadow-amber-500/30 transition-all transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-3"
                            >
                                {isRedeeming ? (
                                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <><span>تفعيل الكود الآن</span> <CheckCircleIcon className="w-6 h-6" /></>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* 5. Courses Store Footer */}
            <div className="mt-8">
                <PremiumSelectionCard
                    index={2}
                    icon={VideoCameraIcon}
                    title="متجر الكورسات"
                    description="تصفح واشترِ كورسات المراجعة المكثفة والمواد الإضافية."
                    colorTheme="blue"
                    onClick={() => onNavigate('courses')}
                />
            </div>
        </div>
    );
};

export default SubscriptionView;
