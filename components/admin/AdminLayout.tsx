
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User } from '../../types';
import {
    QrcodeIcon, CreditCardIcon, HomeIcon, XIcon, TemplateIcon, CogIcon,
    LogoutIcon, BellIcon, CurrencyDollarIcon, BookOpenIcon, HardDriveIcon,
    ChartBarIcon, UsersIcon, ReelsIcon, SunIcon, MoonIcon, AtomIcon,
    SparklesIcon, UserCheckIcon, MenuIcon, ChevronLeftIcon, ClockIcon,
    PhotoIcon, FilmIcon, VideoCameraIcon, ChatBubbleOvalLeftEllipsisIcon,
    QuestionMarkCircleIcon, StarIcon, ShieldExclamationIcon,
} from '../common/Icons';
import { supabase } from '../../services/storageService';
import { getPendingSubscriptionRequestCount } from '../../services/subscriptionService';
import { useAppearance } from '../../AppContext';
import { useIcons } from '../../IconContext';

type AdminView =
    | 'dashboard' | 'students' | 'subscriptions' | 'courseManagement' | 'tools'
    | 'homeManagement' | 'questionBank' | 'platformSettings' | 'systemHealth'
    | 'accountSettings' | 'teachers' | 'subscriptionPrices' | 'deviceManagement'
    | 'content' | 'specialContent' | 'accountCreationDiagnostics'
    | 'teacherCreationDiagnostics' | 'financials' | 'cartoonMoviesManagement'
    | 'supervisors' | 'reelsManagement' | 'iconSettings' | 'storyManagement'
    | 'storyDiagnostics' | 'fullScan' | 'adsDiagnostics'
    | 'subscriptionRequestsDiagnostics' | 'lessonDiagnostics' | 'dbAudit'
    | 'systemTest' | 'passwordDiagnostics' | 'errorLogs' | 'notificationDiagnostics';

interface AdminLayoutProps {
    user: User;
    onLogout: () => void;
    children: React.ReactNode;
    onNavClick: (view: AdminView) => void;
    activeView: string;
}

// ── ألوان خلفية الـ Grid Cards ──────────────────────────────
const CARD_COLORS: Record<string, string> = {
    dashboard: 'from-indigo-600 to-violet-600',
    students: 'from-blue-500 to-cyan-500',
    teachers: 'from-teal-500 to-green-500',
    supervisors: 'from-purple-500 to-fuchsia-500',
    content: 'from-orange-500 to-amber-500',
    courseManagement: 'from-yellow-500 to-lime-500',
    questionBank: 'from-emerald-500 to-teal-500',
    specialContent: 'from-pink-500 to-rose-500',
    storyManagement: 'from-rose-500 to-orange-500',
    cartoonMoviesManagement: 'from-red-500 to-pink-500',
    reelsManagement: 'from-fuchsia-500 to-purple-500',
    homeManagement: 'from-sky-500 to-blue-500',
    subscriptions: 'from-green-500 to-emerald-500',
    financials: 'from-cyan-500 to-blue-500',
    subscriptionPrices: 'from-amber-500 to-yellow-500',
    tools: 'from-violet-500 to-purple-500',
    platformSettings: 'from-slate-500 to-gray-500',
    iconSettings: 'from-pink-400 to-rose-500',
    deviceManagement: 'from-blue-600 to-indigo-600',
    systemHealth: 'from-amber-600 to-orange-600',
    systemTest: 'from-red-500 to-rose-600',
    accountSettings: 'from-indigo-400 to-blue-500',
    notificationDiagnostics: 'from-yellow-500 to-amber-600',
};

// ── Mini Grid Button (for dual-column sidebar) ─────────────
const GridNavButton: React.FC<{
    onClick: () => void;
    label: string;
    iconUrl?: string;
    fallbackIcon: React.FC<{ className?: string }>;
    isActive: boolean;
    isSpecial?: boolean;
    colorKey: string;
    badge?: number;
}> = React.memo(({ onClick, label, iconUrl, fallbackIcon: FallbackIcon, isActive, isSpecial, colorKey, badge }) => {
    const gradient = CARD_COLORS[colorKey] || 'from-indigo-500 to-indigo-600';

    return (
        <button
            onClick={onClick}
            title={label}
            className={`
                relative w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1.5
                transition-all duration-300 active:scale-90 overflow-hidden group
                ${isActive
                    ? `bg-gradient-to-br ${gradient} shadow-lg ring-2 ring-white/20`
                    : isSpecial
                        ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30'
                        : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-indigo-500/30'
                }
            `}
        >
            {/* Shimmer on active */}
            {isActive && (
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
            )}

            <div className={`
                w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110
                ${isActive ? 'bg-white/20' : 'bg-[var(--bg-secondary)]'}
            `}>
                {iconUrl ? (
                    <img src={iconUrl} alt={label} className="w-5 h-5 object-contain" />
                ) : (
                    <FallbackIcon className={`w-4 h-4 ${isActive ? 'text-white' : isSpecial ? 'text-amber-500' : 'text-[var(--text-secondary)] group-hover:text-indigo-500'}`} />
                )}
            </div>

            <span className={`text-[9px] font-black text-center leading-tight px-1 line-clamp-2 ${isActive ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
                {label}
            </span>

            {/* Badge */}
            {!!badge && !isActive && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow">
                    {badge}
                </span>
            )}

            {/* Active dot */}
            {isActive && (
                <div className="absolute bottom-1.5 w-1.5 h-1.5 bg-white/80 rounded-full shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
            )}

            {/* Special pulse */}
            {isSpecial && !isActive && (
                <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
            )}
        </button>
    );
});

// ── Section Group (dual-column grid) ──────────────────────
const GridGroup: React.FC<{
    label: string;
    items: any[];
    activeView: string;
    onNavClick: (view: AdminView) => void;
    badge?: Record<string, number>;
}> = ({ label, items, activeView, onNavClick, badge }) => (
    <div className="mb-3">
        <p className="text-[9px] font-black text-indigo-400/60 uppercase tracking-[0.25em] px-1 mb-2">{label}</p>
        <div className="grid grid-cols-2 gap-2">
            {items.map((item) => (
                <GridNavButton
                    key={item.id}
                    onClick={() => onNavClick(item.id as AdminView)}
                    label={item.label}
                    iconUrl={item.iconUrl}
                    fallbackIcon={item.fallback}
                    isActive={activeView === item.id}
                    isSpecial={item.isSpecial}
                    colorKey={item.id}
                    badge={badge?.[item.id]}
                />
            ))}
        </div>
    </div>
);

// ── Expanded Classic Button (for non-grid collapsed sidebar) 
const NavButton: React.FC<{
    onClick: () => void;
    label: string;
    iconUrl?: string;
    fallbackIcon: React.FC<{ className?: string }>;
    isActive: boolean;
    isSpecial?: boolean;
}> = React.memo(({ onClick, label, iconUrl, fallbackIcon: FallbackIcon, isActive, isSpecial }) => (
    <button
        onClick={onClick}
        className={`w-full text-right flex items-center group rounded-2xl p-3 transition-all duration-300 relative overflow-hidden mb-1.5
        ${isActive
                ? 'bg-indigo-600/10 text-indigo-600 border border-indigo-500/20 shadow-md'
                : isSpecial
                    ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/20'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] border border-transparent'
            }`}
    >
        <div className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 flex-shrink-0
            ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : isSpecial ? 'bg-amber-500/20' : 'bg-[var(--bg-tertiary)] group-hover:scale-110'}`}>
            {iconUrl ? (
                <img src={iconUrl} alt={label} className="w-6 h-6 object-contain" />
            ) : (
                <FallbackIcon className={`w-5 h-5 ${isActive ? 'text-white' : isSpecial ? 'text-amber-600' : 'text-current group-hover:text-indigo-500'}`} />
            )}
        </div>
        <div className="flex flex-1 items-center justify-between mr-3">
            <span className={`text-[11px] font-black tracking-wide truncate transition-colors duration-300 ${isActive ? 'text-indigo-700 dark:text-indigo-400' : isSpecial ? 'text-amber-700 dark:text-amber-400' : 'group-hover:text-indigo-600'}`}>{label}</span>
            {isSpecial && !isActive && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse mr-2" />}
            {isActive && <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full mr-2 shadow-[0_0_8px_rgba(79,70,229,0.8)]" />}
        </div>
    </button>
));

// ── Pending Requests Card ──────────────────────────────────
const PendingRequestsCard: React.FC<{ count: number; onNavClick: () => void }> = ({ count, onNavClick }) => {
    if (count === 0) return null;
    return (
        <div className="px-3 pb-3">
            <button
                onClick={onNavClick}
                className="w-full bg-gradient-to-br from-rose-600 to-pink-700 p-4 rounded-[2rem] shadow-xl shadow-pink-600/20 hover:shadow-pink-600/40 transition-all duration-500 text-right space-y-1 group transform active:scale-95 relative overflow-hidden isolate"
            >
                <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 z-0" />
                <div className="flex items-center gap-3 relative z-10">
                    <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl relative">
                        <BellIcon className="w-5 h-5 text-white" />
                        <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-rose-600 text-sm font-black shadow-lg">{count}</span>
                    </div>
                    <div>
                        <span className="font-black text-sm text-white block">طلبات اشتراك جديدة</span>
                        <span className="text-[11px] font-bold text-rose-100 opacity-80">تحتاج مراجعة فورية</span>
                    </div>
                </div>
            </button>
        </div>
    );
};

// ── Theme Toggle ───────────────────────────────────────────
const SidebarThemeToggle: React.FC = () => {
    const { mode, setMode } = useAppearance();
    return (
        <div className="mx-3 mb-3 p-1 bg-[var(--bg-tertiary)]/50 backdrop-blur-md rounded-2xl flex items-center justify-between relative border border-[var(--border-primary)] shadow-inner">
            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[var(--bg-secondary)] rounded-xl shadow-md transition-all duration-500 ease-spring ${mode === 'light' ? 'right-1' : 'right-[50%]'}`} />
            <button onClick={() => setMode('light')} className={`flex-1 relative z-10 flex items-center justify-center py-2 text-xs font-black transition-colors ${mode === 'light' ? 'text-amber-500' : 'text-[var(--text-secondary)] opacity-60'}`}>
                <SunIcon className="w-3.5 h-3.5 ml-1" /><span>نهاري</span>
            </button>
            <button onClick={() => setMode('dark')} className={`flex-1 relative z-10 flex items-center justify-center py-2 text-xs font-black transition-colors ${mode === 'dark' ? 'text-blue-400' : 'text-[var(--text-secondary)] opacity-60'}`}>
                <MoonIcon className="w-3.5 h-3.5 ml-1" /><span>ليلي</span>
            </button>
        </div>
    );
};

// ── NavContent (renders dual-column grid) ──────────────────
const NavContent: React.FC<{
    activeView: string;
    onNavClick: (view: AdminView) => void;
    pendingRequestsCount: number;
    onLogout: () => void;
}> = ({ activeView, onNavClick, pendingRequestsCount, onLogout }) => {
    const icons = useIcons();

    const groups = [
        {
            label: 'الرئيسية',
            items: [
                { id: 'dashboard', label: 'لوحة التحكم', iconUrl: '', fallback: HomeIcon },
                { id: 'accountSettings', label: 'إعدادات الحساب', iconUrl: '', fallback: UserCheckIcon },
            ],
        },
        {
            label: 'المستخدمون',
            items: [
                { id: 'students', label: 'إدارة الطلاب', iconUrl: icons.adminNavStudentIconUrl, fallback: UsersIcon },
                { id: 'teachers', label: 'المدرسون', iconUrl: icons.adminNavTeacherIconUrl, fallback: UsersIcon },
                { id: 'supervisors', label: 'المشرفون', iconUrl: '', fallback: UsersIcon },
            ],
        },
        {
            label: 'المحتوى التعليمي',
            items: [
                { id: 'content', label: 'المنهج الدراسي', iconUrl: icons.adminNavContentIconUrl, fallback: BookOpenIcon },
                { id: 'courseManagement', label: 'الكورسات', iconUrl: '', fallback: BookOpenIcon },
                { id: 'questionBank', label: 'بنك الأسئلة', iconUrl: '', fallback: ChatBubbleOvalLeftEllipsisIcon },
                { id: 'specialContent', label: 'تحكم مميز', iconUrl: '', fallback: StarIcon, isSpecial: true },
            ],
        },
        {
            label: 'الوسائط',
            items: [
                { id: 'storyManagement', label: 'الاستوري', iconUrl: '', fallback: PhotoIcon },
                { id: 'cartoonMoviesManagement', label: 'أفلام الكرتون', iconUrl: icons.adminNavCartoonIconUrl, fallback: FilmIcon },
                { id: 'reelsManagement', label: 'الريلز', iconUrl: '', fallback: VideoCameraIcon },
                { id: 'homeManagement', label: 'الواجهة', iconUrl: '', fallback: TemplateIcon },
            ],
        },
        {
            label: 'المالية',
            items: [
                { id: 'subscriptions', label: 'الاشتراكات', iconUrl: '', fallback: CreditCardIcon },
                { id: 'financials', label: 'التقارير المالية', iconUrl: '', fallback: ChartBarIcon },
                { id: 'subscriptionPrices', label: 'الأسعار', iconUrl: '', fallback: CurrencyDollarIcon },
                { id: 'tools', label: 'الأكواد', iconUrl: '', fallback: QrcodeIcon },
            ],
        },
        {
            label: 'النظام والإعدادات',
            items: [
                { id: 'platformSettings', label: 'إعدادات المنصة', iconUrl: '', fallback: CogIcon },
                { id: 'iconSettings', label: 'الأيقونات', iconUrl: '', fallback: SparklesIcon },
                { id: 'deviceManagement', label: 'الأجهزة', iconUrl: '', fallback: HardDriveIcon },
                { id: 'systemHealth', label: 'فحص الأعطال', iconUrl: icons.adminNavHealthIconUrl, fallback: HardDriveIcon },
                { id: 'notificationDiagnostics', label: 'الإشعارات', iconUrl: '', fallback: BellIcon },
                { id: 'systemTest', label: 'المدقق الذكي', iconUrl: '', fallback: ShieldExclamationIcon, isSpecial: true },
            ],
        },
    ];

    return (
        <div className="flex flex-col flex-1 h-full overflow-hidden">
            {/* Logo */}
            <div className="h-20 flex items-center justify-center px-3 flex-shrink-0 relative">
                <div className="flex flex-col items-center gap-1 relative z-10">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 group-hover:opacity-60 transition-opacity" />
                        <img src={icons.mainLogoUrl} alt="Logo" className="w-11 h-11 object-contain relative z-10 transition-all duration-300" />
                    </div>
                    <p className="text-[9px] font-black text-indigo-400/80 uppercase tracking-widest">Owner Panel</p>
                </div>
            </div>

            {/* Grid Nav */}
            <nav className="flex-grow px-3 py-2 overflow-y-auto custom-scrollbar">
                {groups.map((g) => (
                    <GridGroup
                        key={g.label}
                        label={g.label}
                        items={g.items}
                        activeView={activeView}
                        onNavClick={onNavClick}
                        badge={g.label === 'المالية' ? { subscriptions: pendingRequestsCount } : undefined}
                    />
                ))}
            </nav>

            {/* Footer */}
            <div className="mt-auto pt-2 flex-shrink-0 z-20 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]/50 backdrop-blur-xl">
                <PendingRequestsCard count={pendingRequestsCount} onNavClick={() => onNavClick('subscriptions')} />
                <SidebarThemeToggle />
                <div className="px-3 pb-4">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl text-rose-500 hover:bg-rose-500/10 transition-all duration-300 group font-black text-xs"
                    >
                        <LogoutIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
                        <span>تسجيل الخروج</span>
                    </button>
                    <p className="text-[8px] font-black text-[var(--text-secondary)] opacity-40 text-center mt-2 tracking-widest uppercase">
                        Owner Dashboard v3.0
                    </p>
                </div>
            </div>
        </div>
    );
};

// ── Main AdminLayout ───────────────────────────────────────
const AdminLayout: React.FC<AdminLayoutProps> = ({ user, onLogout, children, onNavClick, activeView }) => {
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const icons = useIcons();

    useEffect(() => {
        const fetchPendingCount = async () => {
            const count = await getPendingSubscriptionRequestCount();
            setPendingRequestsCount(count);
        };
        fetchPendingCount();
        const channel = supabase
            .channel('pending-requests-count-layout')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'subscription_requests_temp' }, () => fetchPendingCount())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) setIsProfileMenuOpen(false);
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) setIsNotificationsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMobileNavClick = (view: AdminView) => {
        onNavClick(view);
        setIsMobileNavOpen(false);
    };

    return (
        <div className="h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-0 md:p-4 flex overflow-hidden font-tajawal selection:bg-indigo-500 selection:text-white">

            {/* ── Compact Dual-Column Sidebar ── */}
            <aside className="flex-shrink-0 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[2.5rem] hidden md:flex flex-col z-40 relative shadow-2xl glass-strong isolate w-[168px] transition-all duration-500">
                <NavContent
                    activeView={activeView}
                    onNavClick={onNavClick}
                    pendingRequestsCount={pendingRequestsCount}
                    onLogout={onLogout}
                />
            </aside>

            <div className="flex-1 flex flex-col h-full overflow-hidden md:mr-5 relative">
                {/* Background Effects */}
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[150px] pointer-events-none rounded-full" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[150px] pointer-events-none rounded-full" />

                {/* Header */}
                <header className="flex-shrink-0 z-30 pt-2 pb-5 px-4 md:px-0 sticky top-0">
                    <div className="bg-[var(--bg-secondary)]/70 backdrop-blur-3xl border border-[var(--border-primary)] shadow-xl rounded-[2rem] px-6 py-4 flex items-center justify-between transition-all duration-500 hover:shadow-2xl hover:border-indigo-500/10 isolate">

                        {/* Mobile Hamburger */}
                        <div className="flex items-center gap-4 md:hidden">
                            <button className="w-10 h-10 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all group active:scale-95" onClick={() => setIsMobileNavOpen(true)}>
                                <MenuIcon className="w-5 h-5" />
                            </button>
                            <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">لوحة المالك</h1>
                        </div>

                        {/* Desktop greeting */}
                        <div className="hidden md:block">
                            <p className="text-xs text-[var(--text-secondary)] font-black opacity-70 uppercase tracking-[0.2em] mb-0.5">مرحباً بك مجدداً</p>
                            <p className="text-base font-black text-[var(--text-primary)]">سعادة المالك، <span className="text-indigo-500">{user.name}</span> ✨</p>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Status chip */}
                            <div className="hidden lg:flex flex-col items-end">
                                <span className="text-[10px] font-black text-[var(--text-secondary)] opacity-70 uppercase">حالة النظام</span>
                                <span className="text-xs font-black text-emerald-500 flex items-center gap-1 ring-1 ring-emerald-500/20 px-2.5 py-0.5 rounded-full bg-emerald-500/5">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> مثالي
                                </span>
                            </div>

                            <div className="h-8 w-px bg-[var(--border-primary)]" />

                            {/* Notifications */}
                            <div className="relative" ref={notificationsRef}>
                                <button
                                    onClick={() => { setIsNotificationsOpen(p => !p); setIsProfileMenuOpen(false); }}
                                    className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 active:scale-95
                                        ${isNotificationsOpen ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-primary)] hover:border-indigo-500/30'}
                                    `}
                                >
                                    <BellIcon className="w-5 h-5" />
                                    {pendingRequestsCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-[var(--bg-secondary)] shadow-sm animate-bounce" />}
                                </button>

                                {isNotificationsOpen && (
                                    <div className="absolute top-full mt-4 left-0 w-72 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[2rem] shadow-2xl z-50 animate-scale-in overflow-hidden glass-strong">
                                        <div className="p-5 border-b border-[var(--border-primary)] flex items-center justify-between bg-[var(--bg-tertiary)]/30">
                                            <h3 className="font-black text-sm text-[var(--text-primary)]">التنبيهات</h3>
                                            <span className="text-xs bg-indigo-500 text-white px-2.5 py-1 rounded-full font-black">{pendingRequestsCount}</span>
                                        </div>
                                        <div className="p-3 max-h-80 overflow-y-auto custom-scrollbar">
                                            {pendingRequestsCount > 0 ? (
                                                <button onClick={() => { onNavClick('subscriptions'); setIsNotificationsOpen(false); }} className="w-full p-4 rounded-[1.5rem] hover:bg-rose-500/5 text-right transition-all border border-transparent hover:border-rose-500/20">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                                                            <CreditCardIcon className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-sm text-[var(--text-primary)]">طلبات اشتراك جديدة</p>
                                                            <p className="text-xs text-[var(--text-secondary)] font-bold">{pendingRequestsCount} طالب بانتظار التفعيل.</p>
                                                        </div>
                                                    </div>
                                                </button>
                                            ) : (
                                                <div className="p-12 text-center">
                                                    <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-300 mx-auto mb-3">
                                                        <BellIcon className="w-7 h-7" />
                                                    </div>
                                                    <p className="text-xs font-black text-[var(--text-secondary)] opacity-50">لا توجد إشعارات حالياً.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Profile avatar */}
                            <button
                                onClick={() => setIsProfileMenuOpen(p => !p)}
                                className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black shadow-xl shadow-indigo-600/20 active:scale-95 transition-all hover:scale-105"
                            >
                                {user.name.charAt(0)}
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-2 scroll-smooth custom-scrollbar relative z-10">
                    <div key={activeView} className="animate-fade-in h-full">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Nav Drawer */}
            {isMobileNavOpen && (
                <div className="md:hidden fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl transition-opacity animate-fade-in" onClick={() => setIsMobileNavOpen(false)} />
                    <div className="fixed inset-y-4 right-4 w-[80%] max-w-[300px] bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex flex-col animate-slide-in-right rounded-[2.5rem] overflow-hidden shadow-2xl glass-strong z-[60]">
                        <div className="h-24 flex flex-col items-center justify-center border-b border-[var(--border-primary)] bg-indigo-600/5 relative">
                            <div className="absolute top-3 left-3">
                                <button onClick={() => setIsMobileNavOpen(false)} className="w-9 h-9 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] border border-[var(--border-primary)]">
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <img src={icons.mainLogoUrl} alt="Logo" className="w-12 h-12 object-contain shadow-lg rounded-xl p-1 bg-white" />
                            <p className="text-[10px] font-black text-indigo-600 mt-1 tracking-widest uppercase">Platform Owner</p>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <NavContent
                                activeView={activeView}
                                onNavClick={handleMobileNavClick}
                                pendingRequestsCount={pendingRequestsCount}
                                onLogout={onLogout}
                            />
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .glass-strong { background: var(--glass-strong); backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px); }
                .animate-slide-in-right { animation: slideInRight 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .ease-spring { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
            `}</style>
        </div>
    );
};

export default AdminLayout;
