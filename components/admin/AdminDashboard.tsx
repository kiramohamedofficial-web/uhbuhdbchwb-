
import React, { useState, useMemo, useEffect, lazy, Suspense, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { User, Teacher, AdminView, PlatformSettings } from '../../types';
import AdminLayout from '../layout/AdminLayout';
import { getAdminStats } from '../../services/systemService';
import { getAuditLogs, AuditLog } from '../../services/auditService';
import {
    ChartBarIcon, UsersIcon, BellIcon, SearchIcon,
    InformationCircleIcon, ShieldCheckIcon, ServerIcon, StarIcon,
    CheckCircleIcon, ShieldExclamationIcon, CurrencyDollarIcon,
    SparklesIcon, CogIcon, QrcodeIcon, SunIcon, MoonIcon, CollectionIcon,
    ArrowLeftIcon, ClockIcon, DatabaseIcon, MegaphoneIcon, WifiIcon,
    ChevronRightIcon, ChevronLeftIcon, AtomIcon, CreditCardIcon
} from '../common/Icons';
import RevenueChart from './RevenueChart';
import { useSession } from '../../hooks/useSession';
import Loader from '../common/Loader';

const SubscriptionManagementView = lazy(() => import('./FinancialView'));
const StudentDetailView = lazy(() => import('./StudentDetailView'));
const QrCodeGeneratorView = lazy(() => import('./QrCodeGeneratorView'));
const HomeManagementView = lazy(() => import('./HomeManagementView'));
const PlatformSettingsView = lazy(() => import('./PlatformSettingsView'));
const AdminSettingsView = lazy(() => import('./AdminSettingsView'));
const SystemHealthView = lazy(() => import('./SystemHealthView'));
const SubscriptionPriceControlView = lazy(() => import('./SubscriptionPriceControlView'));
const CourseManagementView = lazy(() => import('./CourseManagementView'));
const ContentManagementView = lazy(() => import('./ContentManagementView'));
const SpecialContentManagementView = lazy(() => import('./SpecialContentManagementView'));
const DeviceManagementView = lazy(() => import('./DeviceManagementView'));
const AccountCreationDiagnosticsView = lazy(() => import('./AccountCreationDiagnosticsView'));
const TeacherCreationDiagnosticsView = lazy(() => import('./TeacherCreationDiagnosticsView'));
const FinancialReportsView = lazy(() => import('./FinancialReportsView'));
const CurriculumDiagnosticsView = lazy(() => import('./CurriculumDiagnosticsView'));
const SubscriptionCodeDiagnosticsView = lazy(() => import('./SubscriptionCodeDiagnosticsView'));
const CartoonMoviesManagementView = lazy(() => import('./CartoonMoviesManagementView'));
const SupervisorsManagementView = lazy(() => import('./SupervisorsManagementView'));
const ReelsManagementView = lazy(() => import('./ReelsManagementView'));
const IconSettingsView = lazy(() => import('./IconSettingsView'));
const TeacherManagementView = lazy(() => import('./TeacherManagementView'));
const StudentManagementView = lazy(() => import('./StudentManagementView'));
const CartoonDiagnosticsView = lazy(() => import('./CartoonDiagnosticsView'));
const SessionDiagnosticsView = lazy(() => import('./SessionDiagnosticsView'));
const CourseDiagnosticsView = lazy(() => import('./CourseDiagnosticsView'));
const NotificationDiagnosticsView = lazy(() => import('./NotificationDiagnosticsView'));
const AvatarDiagnosticsView = lazy(() => import('./AvatarDiagnosticsView'));
const IconDiagnosticsView = lazy(() => import('./IconDiagnosticsView'));
const MediaIntegrityView = lazy(() => import('./MediaIntegrityView'));
const DatabaseDiagnosticsView = lazy(() => import('./DatabaseDiagnosticsView'));
const StoryManagementView = lazy(() => import('./StoryManagementView'));
const StoryDiagnosticsView = lazy(() => import('./StoryDiagnosticsView'));
const FullScanDiagnosticsView = lazy(() => import('./FullScanDiagnosticsView'));
const AdsDiagnosticsView = lazy(() => import('./AdsDiagnosticsView'));
const SubscriptionRequestsDiagnosticsView = lazy(() => import('./SubscriptionRequestsDiagnosticsView'));
const QuestionBankView = lazy(() => import('./QuestionBankView'));
const LessonDiagnosticsView = lazy(() => import('./LessonDiagnosticsView'));
const DatabaseAuditView = lazy(() => import('./DatabaseAuditView'));
const SystemTestView = lazy(() => import('./SystemTestView'));
const PasswordDiagnosticsView = lazy(() => import('./PasswordDiagnosticsView'));
const ErrorLogsView = lazy(() => import('./ErrorLogsView'));
const AuditLogsView = lazy(() => import('./AuditLogsView'));

const SuspenseLoader: React.FC = () => (
    <div className="w-full h-full flex items-center justify-center min-h-[400px]">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center font-black text-sm text-indigo-500 uppercase tracking-widest animate-pulse">جاري التحميل</div>
        </div>
    </div>
);

const GreetingCard: React.FC<{ name: string }> = ({ name }) => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'صباح الخير والتميز' : hour < 18 ? 'طاب يومك بكل خير' : 'مساء الإنجاز والجمال';

    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-[3rem] p-10 md:p-14 mb-10 text-white border border-white/5 shadow-2xl isolate group">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px] z-0"></div>
            {/* Animated background elements */}
            <div className="absolute top-[-10%] right-[-5%] w-80 h-80 bg-indigo-500/20 blur-[100px] rounded-full animate-pulse z-[-1]"></div>
            <div className="absolute bottom-[-10%] left-[10%] w-64 h-64 bg-purple-500/20 blur-[100px] rounded-full animate-pulse z-[-1]" style={{ animationDelay: '1s' }}></div>

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="flex items-center gap-8 w-full md:w-auto">
                    <div className="w-20 h-20 rounded-[2rem] bg-white/10 border border-white/20 flex items-center justify-center shadow-2xl transform rotate-3 group-hover:rotate-0 transition-transform duration-500 backdrop-blur-xl relative">
                        <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-[2.1rem] opacity-20 blur-sm"></div>
                        <span className="text-4xl relative z-10">👑</span>
                    </div>
                    <div>
                        <p className="text-indigo-300 font-black text-sm uppercase tracking-[0.3em] mb-2 opacity-60">{greeting}</p>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-2">
                            {greeting.split(' ')[0]}، <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-purple-300 drop-shadow-sm">{name.split(' ')[0]}</span>
                        </h1>
                        <div className="flex items-center gap-3">
                            <p className="text-indigo-100/70 font-bold text-sm tracking-wide">المنصة تعمل بأعلى كفاءة، وأداء النظام مثالي حالياً.</p>
                            <div className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-sm font-black text-emerald-400 animate-pulse">LIVE</div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-4 bg-black/30 backdrop-blur-3xl border border-white/10 p-6 rounded-[2.5rem] shadow-xl group-hover:border-indigo-500/30 transition-all duration-500">
                    <div className="flex items-center gap-4">
                        <div className="text-center px-4 border-l border-white/10">
                            <p className="text-sm font-black text-white/70 uppercase tracking-widest mb-1">سرعة النظام</p>
                            <p className="text-xl font-black text-emerald-400">99.8%</p>
                        </div>
                        <div className="text-center px-4">
                            <p className="text-sm font-black text-white/70 uppercase tracking-widest mb-1">وقت التشغيل</p>
                            <p className="text-xl font-black text-blue-400">24/7</p>
                        </div>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="w-[98%] h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{
    title: string;
    value: string;
    icon: React.FC<any>;
    theme: 'blue' | 'purple' | 'emerald' | 'amber';
    onClick: () => void;
    delay?: string;
}> = ({ title, value, icon: Icon, theme, onClick, delay = "0ms" }) => {

    const themeStyles = {
        blue: { bg: 'bg-blue-600/10', text: 'text-blue-500', border: 'border-blue-500/10', hover: 'hover:border-blue-500/40', accent: 'bg-blue-600' },
        purple: { bg: 'bg-purple-600/10', text: 'text-purple-500', border: 'border-purple-500/10', hover: 'hover:border-purple-500/40', accent: 'bg-purple-600' },
        emerald: { bg: 'bg-emerald-600/10', text: 'text-emerald-500', border: 'border-emerald-500/10', hover: 'hover:border-emerald-500/40', accent: 'bg-emerald-500' },
        amber: { bg: 'bg-amber-600/10', text: 'text-amber-500', border: 'border-amber-500/10', hover: 'hover:border-amber-500/40', accent: 'bg-amber-500' },
    };

    const style = themeStyles[theme];

    return (
        <button
            onClick={onClick}
            style={{ animationDelay: delay }}
            className={`group relative w-full bg-[var(--bg-secondary)] p-8 rounded-[2.5rem] border ${style.border} ${style.hover} shadow-xl transition-all duration-500 hover-lift text-right animate-enter-up glass-strong overflow-hidden isolate`}
        >
            <div className={`absolute -right-10 -top-10 w-32 h-32 ${style.accent} opacity-5 blur-[60px] rounded-full z-0 group-hover:opacity-10 transition-opacity`}></div>

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className={`p-4 rounded-2xl ${style.bg} ${style.text} shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                    <Icon className="w-7 h-7" />
                </div>
                <div className={`w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] shadow-sm opacity-50 group-hover:opacity-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500`}>
                    <ChevronRightIcon className="w-5 h-5" />
                </div>
            </div>
            <div className="relative z-10">
                <h3 className="text-4xl font-black text-[var(--text-primary)] mb-2 tracking-tight group-hover:scale-[1.02] transition-transform">{value}</h3>
                <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">{title}</p>
                    <div className="flex items-center gap-1 text-sm font-bold text-emerald-500">
                        <span>+2.4%</span>
                        <SunIcon className="w-3 h-3" />
                    </div>
                </div>
            </div>

            {/* Modern Bottom Accent Line */}
            <div className={`absolute bottom-0 left-0 right-0 h-1.5 ${style.accent} opacity-30 group-hover:opacity-100 transition-opacity`}></div>
        </button>

    );
};

const QuickAction: React.FC<{ label: string; desc: string; icon: React.FC<any>; onClick: () => void; color: string }> = ({ label, desc, icon: Icon, onClick, color }) => (
    <button
        onClick={onClick}
        className={`
            relative overflow-hidden flex flex-col items-center justify-center p-6 rounded-[2.5rem] 
            bg-[var(--bg-secondary)] border border-[var(--border-primary)] 
            hover:shadow-2xl transition-all duration-500 group hover-lift glass-strong
            hover:border-indigo-500/20 isolate
        `}
    >
        <div className={`absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>

        <div className={`
            mb-4 p-4 rounded-2xl bg-${color}-500/10 text-${color}-600 
            group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-500/30 transition-all duration-500 shadow-sm relative z-10
        `}>
            <Icon className="w-7 h-7" />
        </div>
        <span className="text-sm font-black text-[var(--text-primary)] mb-1 group-hover:text-indigo-600 transition-colors relative z-10">{label}</span>
        <span className="text-sm font-bold text-[var(--text-secondary)] opacity-60 relative z-10">{desc}</span>

        {/* Hover Gradient Overlay */}
        <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-indigo-500 scale-x-0 group-hover:scale-x-75 transition-transform duration-500 rounded-full"></div>
    </button>
);

const SystemInfoChip: React.FC<{ label: string; value: string; icon: any; color: string }> = ({ label, value, icon: Icon, color }) => (
    <div className={`flex items-center gap-4 px-6 py-4 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-md min-w-[180px] hover:border-indigo-500/20 transition-all duration-300 glass hover-lift`}>
        <div className={`p-2 rounded-xl ${color.replace('text-', 'bg-').replace('500', '500/10')} shadow-sm`}>
            <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <div>
            <p className="text-sm font-black text-[var(--text-secondary)] opacity-70 uppercase tracking-[0.2em] mb-0.5">{label}</p>
            <p className="text-sm font-black text-[var(--text-primary)]">{value}</p>
        </div>
    </div>
);

const AdminDashboardHome: React.FC<{ user: User; onNavigate: (view: AdminView) => void }> = ({ user, onNavigate }) => {
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
    const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [adminStats, auditLogs] = await Promise.all([
                    getAdminStats(),
                    getAuditLogs(5)
                ]);
                setStats(adminStats);
                setRecentLogs(auditLogs);

                if (adminStats.settings && adminStats.subs) {
                    const prices: Record<string, number> = {
                        Monthly: adminStats.settings.monthlyPrice,
                        Quarterly: adminStats.settings.quarterlyPrice,
                        SemiAnnually: adminStats.settings.semiAnnuallyPrice,
                        Annual: adminStats.settings.annualPrice
                    };
                    const revenue: Record<string, number> = {};
                    adminStats.subs.forEach((sub: any) => {
                        const date = new Date(sub.startDate);
                        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        const price = prices[sub.plan] || 0;
                        revenue[monthKey] = (revenue[monthKey] || 0) + price;
                    });
                    const revenueData = Object.entries(revenue)
                        .map(([month, rev]) => ({
                            month: new Date(month + '-02').toLocaleString('ar-EG', { month: 'short' }),
                            revenue: rev
                        }))
                        .slice(-6);
                    setMonthlyRevenue(revenueData);
                }
            } catch (e) {
                console.error("Error fetching admin stats:", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) return <SuspenseLoader />;
    const totalRev = monthlyRevenue.reduce((a: number, b: any) => a + b.revenue, 0);
    const activeSubCount = stats?.subs?.filter((s: any) => s.status === 'Active' && new Date(s.endDate) >= new Date()).length || 0;

    return (
        <div className="animate-fade-in space-y-8 pb-32 max-w-[1600px] mx-auto px-4 md:px-6">
            <GreetingCard name={user.name} />

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard title="إجمالي الطلاب المسجلين" value={stats?.students?.toLocaleString() || '0'} icon={UsersIcon} theme="blue" onClick={() => onNavigate('students')} delay="0s" />
                <StatCard title="الاشتراكات النشطة حالياً" value={activeSubCount.toLocaleString()} icon={ShieldCheckIcon} theme="emerald" onClick={() => onNavigate('students')} delay="0.1s" />
                <StatCard title="عدد المدرسين المعتمدين" value={stats?.teachers?.toLocaleString() || '0'} icon={StarIcon} theme="amber" onClick={() => onNavigate('teachers')} delay="0.2s" />
                <StatCard title="إجمالي الإيرادات" value={`${totalRev.toLocaleString()} ج.م`} icon={CurrencyDollarIcon} theme="purple" onClick={() => onNavigate('financials')} delay="0.3s" />
            </div>

            {/* Content & Quick Actions Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-10">
                    {/* Financial Chart Section */}
                    <div className="bg-[var(--bg-secondary)] p-10 rounded-[3rem] border border-[var(--border-primary)] shadow-xl glass-strong hover:border-indigo-500/10 transition-all duration-500">
                        <div className="flex justify-between items-center mb-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-indigo-600/10 text-indigo-600">
                                    <ChartBarIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-[var(--text-primary)]">التحليل المالي</h2>
                                    <p className="text-sm font-bold text-[var(--text-secondary)] opacity-50 uppercase tracking-widest mt-1">مخطط الإيرادات في آخر 6 أشهر</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-indigo-500 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20 shadow-sm transition-all hover:bg-indigo-600 hover:text-white cursor-help">تحديث فوري</span>
                            </div>
                        </div>
                        <div className="h-[380px] relative">
                            <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none rounded-3xl"></div>
                            <RevenueChart data={monthlyRevenue} />
                        </div>
                    </div>

                    {/* Recent Activity Section */}
                    <div className="bg-[var(--bg-secondary)] p-10 rounded-[3rem] border border-[var(--border-primary)] shadow-xl glass-strong hover:border-indigo-500/10 transition-all duration-500">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600">
                                    <ClockIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-[var(--text-primary)]">سجل النشاطات</h2>
                                    <p className="text-sm font-bold text-[var(--text-secondary)] opacity-50 uppercase tracking-widest mt-1">متابعة تحركات الإدارة والنظام</p>
                                </div>
                            </div>
                            <button onClick={() => onNavigate('auditLogs')} className="text-sm font-black text-indigo-500 hover:text-indigo-400 group flex items-center gap-1.5 transition-all">
                                عرض السجل الكامل <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {recentLogs.length > 0 ? recentLogs.map((log, idx) => (
                                <div key={log.id} style={{ animationDelay: `${idx * 100}ms` }} className="flex items-center justify-between p-6 rounded-[2rem] bg-[var(--bg-tertiary)]/40 border border-[var(--border-primary)] hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all duration-300 group animate-enter-up">
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform shadow-inner">
                                            <ShieldCheckIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-[var(--text-primary)] group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{log.action}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-sm font-bold text-indigo-500">{log.admin_name}</span>
                                                <span className="w-1 h-1 bg-[var(--text-secondary)]/30 rounded-full"></span>
                                                <p className="text-sm text-[var(--text-secondary)] font-bold opacity-60">{new Date(log.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <span className="text-sm font-black text-[var(--text-secondary)] opacity-50 uppercase bg-[var(--bg-tertiary)] px-3 py-1 rounded-full group-hover:bg-indigo-500 group-hover:text-white transition-colors">{new Date(log.created_at).toLocaleDateString('ar-EG')}</span>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-20 bg-[var(--bg-tertiary)]/20 rounded-[2.5rem] border-2 border-dashed border-[var(--border-primary)]">
                                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-200 mx-auto mb-4">
                                        <ClockIcon className="w-8 h-8" />
                                    </div>
                                    <p className="text-sm font-black text-[var(--text-secondary)] opacity-70">لا توجد نشاطات مسجلة في هذه اللحظة.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-10">
                    {/* Quick-Actions Widget */}
                    <div className="bg-[var(--bg-secondary)] p-10 h-full rounded-[3rem] border border-[var(--border-primary)] shadow-xl glass-strong hover:border-indigo-500/10 transition-all duration-500 flex flex-col">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 rounded-2xl bg-indigo-600/10 text-indigo-600">
                                <SparklesIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-[var(--text-primary)]">الوصول السريع</h2>
                                <p className="text-sm font-bold text-[var(--text-secondary)] opacity-50 uppercase tracking-widest mt-1">الأوامر الأكثر استخداماً</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6 flex-1">
                            <QuickAction label="المناهج" desc="الوحدات والدروس" icon={CollectionIcon} onClick={() => onNavigate('content')} color="indigo" />
                            <QuickAction label="أكواد الاشتراك" desc="توليد وتفعيل" icon={QrcodeIcon} onClick={() => onNavigate('tools')} color="blue" />
                            <QuickAction label="فحص الأعطال" desc="تشخيص النظام" icon={ShieldExclamationIcon} onClick={() => onNavigate('systemHealth')} color="rose" />
                            <QuickAction label="مدفق الذكاء" desc="فحص شامل للمنصة" icon={AtomIcon} onClick={() => onNavigate('systemTest')} color="amber" />
                        </div>

                        {/* Premium Ad Space or Tip */}
                        <div className="mt-10 p-6 rounded-[2rem] bg-gradient-to-br from-indigo-600 to-purple-700 text-white relative overflow-hidden group hover-lift shadow-lg shadow-indigo-600/20 isolate">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2 z-0"></div>
                            <p className="text-sm font-black uppercase tracking-widest opacity-60 mb-2 relative z-10">نصيحة المالك</p>
                            <p className="text-sm font-black relative z-10 leading-relaxed group-hover:scale-105 transition-transform">تأكد من مراجعة طلبات الاشتراك المعلقة يومياً لضمان رضا الطلاب التام عن الخدمة. 🚀</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* System Insights Strip (Premium Chips) */}
            <div className="flex flex-wrap gap-6 pt-6 animate-enter-up" style={{ animationDelay: '0.4s' }}>
                <SystemInfoChip label="حالة السيرفر" value="متصل ومستقر (99.9%)" icon={ServerIcon} color="text-emerald-500" />
                <SystemInfoChip label="قاعدة البيانات" value="جيدة (0.02ms latency)" icon={DatabaseIcon} color="text-blue-500" />
                <SystemInfoChip label="آخر نسخة احتياطية" value="اليوم 04:00 ص" icon={ClockIcon} color="text-indigo-500" />
                <SystemInfoChip label="إصدار المنصة" value="v2.5.0 Premium Edition" icon={MegaphoneIcon} color="text-slate-500" />
            </div>

            <style>{`
                @keyframes enterUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-enter-up {
                    animation: enterUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                }
            `}</style>
        </div>
    );
};

let inMemoryState: any = {};
export const setMemoryState = (state: any) => { inMemoryState = state; };

const StudentDetailWrapper: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const router = useRouter();
    if (!inMemoryState?.user) {
        router.replace('/admin/students');
        return null;
    }
    return <StudentDetailView user={inMemoryState.user} onBack={onBack} />;
};

const AdminDashboard: React.FC = () => {
    const { currentUser: user, handleLogout } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    const activeView = useMemo(() => {
        const path = pathname || '';
        if (path === '/admin' || path === '/admin/dashboard') return 'dashboard';
        if (path.includes('/students')) return 'students';
        if (path.includes('/subscriptions')) return 'subscriptions';
        if (path.includes('/tools')) return 'tools';
        if (path.includes('/home-management')) return 'homeManagement';
        if (path.includes('/story-management')) return 'storyManagement';
        if (path.includes('/platform-settings')) return 'platformSettings';
        if (path.includes('/icon-settings')) return 'iconSettings';
        if (path.includes('/account-settings')) return 'accountSettings';
        if (path.includes('/teachers')) return 'teachers';
        if (path.includes('/system-health')) return 'systemHealth';
        if (path.includes('/device-management')) return 'deviceManagement';
        if (path.includes('/content')) return 'content';
        if (path.includes('/special-content')) return 'specialContent';
        if (path.includes('/course-management')) return 'courseManagement';
        if (path.includes('/subscription-prices')) return 'subscriptionPrices';
        if (path.includes('/financials')) return 'financials';
        if (path.includes('/cartoon-movies')) return 'cartoonMoviesManagement';
        if (path.includes('/reels')) return 'reelsManagement';
        if (path.includes('/supervisors')) return 'supervisors';
        if (path.includes('/question-bank')) return 'questionBank';
        if (path.includes('/db-audit')) return 'dbAudit';
        if (path.includes('/system-test')) return 'systemTest';
        if (path.includes('/error-logs')) return 'errorLogs';
        if (path.includes('/audit-logs')) return 'auditLogs';
        return 'dashboard';
    }, [pathname]);

    const handleNavClick = useCallback((view: AdminView) => {
        switch (view) {
            case 'dashboard': router.push('/admin/dashboard'); break;
            case 'students': router.push('/admin/students'); break;
            case 'subscriptions': router.push('/admin/subscriptions'); break;
            case 'tools': router.push('/admin/tools'); break;
            case 'homeManagement': router.push('/admin/home-management'); break;
            case 'storyManagement': router.push('/admin/story-management'); break;
            case 'platformSettings': router.push('/admin/platform-settings'); break;
            case 'iconSettings': router.push('/admin/icon-settings'); break;
            case 'accountSettings': router.push('/admin/account-settings'); break;
            case 'teachers': router.push('/admin/teachers'); break;
            case 'systemHealth': router.push('/admin/system-health'); break;
            case 'deviceManagement': router.push('/admin/device-management'); break;
            case 'content': router.push('/admin/content'); break;
            case 'specialContent': router.push('/admin/special-content'); break;
            case 'courseManagement': router.push('/admin/course-management'); break;
            case 'subscriptionPrices': router.push('/admin/subscription-prices'); break;
            case 'accountCreationDiagnostics': router.push('/admin/system-health/account-creation'); break;
            case 'teacherCreationDiagnostics': router.push('/admin/system-health/teacher-creation'); break;
            case 'curriculumDiagnostics': router.push('/admin/system-health/curriculum'); break;
            case 'subscriptionCodeDiagnostics': router.push('/admin/system-health/subscription-code'); break;
            case 'cartoonDiagnostics': router.push('/admin/system-health/cartoon'); break;
            case 'storyDiagnostics': router.push('/admin/system-health/story'); break;
            case 'sessionDiagnostics': router.push('/admin/system-health/session'); break;
            case 'courseDiagnostics': router.push('/admin/system-health/course'); break;
            case 'notificationDiagnostics': router.push('/admin/system-health/notification'); break;
            case 'avatarDiagnostics': router.push('/admin/system-health/avatar'); break;
            case 'iconDiagnostics': router.push('/admin/system-health/icon'); break;
            case 'mediaIntegrity': router.push('/admin/system-health/media-integrity'); break;
            case 'databaseDiagnostics': router.push('/admin/system-health/database'); break;
            case 'userDeletionDiagnostics': router.push('/admin/system-health/user-deletion'); break;
            case 'financials': router.push('/admin/financials'); break;
            case 'cartoonMoviesManagement': router.push('/admin/cartoon-movies'); break;
            case 'reelsManagement': router.push('/admin/reels'); break;
            case 'supervisors': router.push('/admin/supervisors'); break;
            case 'adsDiagnostics': router.push('/admin/system-health/ads'); break;
            case 'subscriptionRequestsDiagnostics': router.push('/admin/system-health/subscription-requests'); break;
            case 'questionBank': router.push('/admin/question-bank'); break;
            case 'lessonDiagnostics': router.push('/admin/system-health/lesson'); break;
            case 'dbAudit': router.push('/admin/db-audit'); break;
            case 'systemTest': router.push('/admin/system-test'); break;
            case 'passwordDiagnostics': router.push('/admin/system-health/password'); break;
            case 'errorLogs': router.push('/admin/error-logs'); break;
            case 'auditLogs': router.push('/admin/audit-logs'); break;
            default: router.push('/admin/dashboard');
        }
    }, [router]);

    if (!user) return null;

    const renderContent = () => {
        const path = pathname || '';

        if (path.includes('/system-health/account-creation')) return <AccountCreationDiagnosticsView />;
        if (path.includes('/system-health/teacher-creation')) return <TeacherCreationDiagnosticsView onBack={() => router.push('/admin/system-health')} />;
        if (path.includes('/system-health/curriculum')) return <CurriculumDiagnosticsView onBack={() => router.push('/admin/system-health')} />;
        if (path.includes('/system-health/subscription-code')) return <SubscriptionCodeDiagnosticsView onBack={() => router.push('/admin/system-health')} />;
        if (path.includes('/system-health/cartoon')) return <CartoonDiagnosticsView onBack={() => router.push('/admin/system-health')} />;
        if (path.includes('/system-health/story')) return <StoryDiagnosticsView onBack={() => router.push('/admin/system-health')} />;
        if (path.includes('/system-health/session')) return <SessionDiagnosticsView onBack={() => router.push('/admin/system-health')} />;
        if (path.includes('/system-health/course')) return <CourseDiagnosticsView onBack={() => router.push('/admin/system-health')} />;
        if (path.includes('/system-health/notification')) return <NotificationDiagnosticsView onBack={() => router.push('/admin/system-health')} />;
        if (path.includes('/system-health/avatar')) return <AvatarDiagnosticsView onBack={() => router.push('/admin/system-health')} />;
        if (path.includes('/system-health/icon')) return <IconDiagnosticsView onBack={() => router.push('/admin/system-health')} />;
        if (path.includes('/system-health/media-integrity')) return <MediaIntegrityView onBack={() => router.push('/admin/system-health')} />;
        if (path.includes('/system-health/database')) return <DatabaseDiagnosticsView onBack={() => router.push('/admin/system-health')} />;
        if (path.includes('/system-health/user-deletion')) return <AccountCreationDiagnosticsView />;
        if (path.includes('/system-health/ads')) return <AdsDiagnosticsView onBack={() => router.push('/admin/system-health')} />;
        if (path.includes('/system-health/subscription-requests')) return <SubscriptionRequestsDiagnosticsView onBack={() => router.push('/admin/system-health')} />;
        if (path.includes('/system-health/lesson')) return <LessonDiagnosticsView onBack={() => router.push('/admin/system-health')} />;
        if (path.includes('/system-health/password')) return <PasswordDiagnosticsView onBack={() => router.push('/admin/system-health')} />;

        if (path.includes('/students/')) return <StudentDetailWrapper onBack={() => router.push('/admin/students')} />;
        if (path.includes('/students')) return <StudentManagementView onViewDetails={(u) => { setMemoryState({ user: u }); router.push(`/admin/students/${u.id}`); }} />;
        if (path.includes('/subscriptions')) return <SubscriptionManagementView onNavigate={handleNavClick} />;
        if (path.includes('/tools')) return <QrCodeGeneratorView />;
        if (path.includes('/home-management')) return <HomeManagementView />;
        if (path.includes('/story-management')) return <StoryManagementView />;
        if (path.includes('/platform-settings')) return <PlatformSettingsView user={user} />;
        if (path.includes('/icon-settings')) return <IconSettingsView />;
        if (path.includes('/account-settings')) return <AdminSettingsView />;
        if (path.includes('/teachers')) return <TeacherManagementView />;
        if (path.includes('/system-health')) return <SystemHealthView onNavigate={handleNavClick} />;
        if (path.includes('/device-management')) return <DeviceManagementView />;
        if (path.includes('/content')) return <ContentManagementView />;
        if (path.includes('/special-content')) return <SpecialContentManagementView />;
        if (path.includes('/course-management')) return <CourseManagementView />;
        if (path.includes('/subscription-prices')) return <SubscriptionPriceControlView />;
        if (path.includes('/financials')) return <FinancialReportsView />;
        if (path.includes('/cartoon-movies')) return <CartoonMoviesManagementView />;
        if (path.includes('/reels')) return <ReelsManagementView />;
        if (path.includes('/supervisors')) return <SupervisorsManagementView />;
        if (path.includes('/question-bank')) return <QuestionBankView />;
        if (path.includes('/db-audit')) return <DatabaseAuditView onBack={() => router.push('/admin/system-health')} />;
        if (path.includes('/system-test')) return <SystemTestView onBack={() => router.push('/admin/dashboard')} />;
        if (path.includes('/error-logs')) return <ErrorLogsView onBack={() => router.push('/admin/system-health')} />;
        if (path.includes('/audit-logs')) return <AuditLogsView onBack={() => router.push('/admin/system-health')} />;

        return <AdminDashboardHome user={user} onNavigate={handleNavClick} />;
    };

    return (
        <AdminLayout
            user={user}
            onLogout={handleLogout}
            activeView={activeView}
            onNavClick={handleNavClick}
        >
            <Suspense fallback={<SuspenseLoader />}>
                {renderContent()}
            </Suspense>
        </AdminLayout>
    );
};

export default AdminDashboard;
