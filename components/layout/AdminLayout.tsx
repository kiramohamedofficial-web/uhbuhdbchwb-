
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User } from '../../types';
import { QrcodeIcon, CreditCardIcon, HomeIcon, XIcon, TemplateIcon, CogIcon, LogoutIcon, BellIcon, CurrencyDollarIcon, BookOpenIcon, HardDriveIcon, ChartBarIcon, UsersIcon, ReelsIcon, SunIcon, MoonIcon, AtomIcon, SparklesIcon, UserCheckIcon, MenuIcon, ChevronRightIcon, ChevronLeftIcon, ClockIcon, PhotoIcon, FilmIcon, VideoCameraIcon, ChatBubbleOvalLeftEllipsisIcon, QuestionMarkCircleIcon, StarIcon } from '../common/Icons';
import { supabase } from '../../services/storageService';
import { getPendingSubscriptionRequestCount } from '../../services/subscriptionService';
import { useAppearance } from '../../AppContext';
import { useIcons } from '../../IconContext';

type AdminView = 'dashboard' | 'students' | 'subscriptions' | 'courseManagement' | 'tools' | 'homeManagement' | 'questionBank' | 'platformSettings' | 'systemHealth' | 'accountSettings' | 'teachers' | 'subscriptionPrices' | 'deviceManagement' | 'content' | 'specialContent' | 'accountCreationDiagnostics' | 'teacherCreationDiagnostics' | 'financials' | 'cartoonMoviesManagement' | 'supervisors' | 'reelsManagement' | 'iconSettings' | 'storyManagement' | 'storyDiagnostics';

interface AdminLayoutProps {
    user: User;
    onLogout: () => void;
    children: React.ReactNode;
    onNavClick: (view: AdminView) => void;
    activeView: string;
}

const NavButton: React.FC<{
    onClick: () => void;
    label: string;
    iconUrl?: string;
    fallbackIcon: React.FC<{ className?: string }>;
    isActive: boolean;
    collapsed: boolean;
    isSpecial?: boolean;
}> = React.memo(({ onClick, label, iconUrl, fallbackIcon: FallbackIcon, isActive, collapsed, isSpecial }) => (
    <button
        onClick={onClick}
        title={collapsed ? label : ''}
        className={`w-full text-right flex items-center group rounded-2xl p-3 transition-all duration-300 relative overflow-hidden mb-1
        ${collapsed ? 'justify-center' : 'space-x-3 space-x-reverse'}
        ${isActive
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : isSpecial
                    ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/20'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'}`}
    >
        <div className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all flex-shrink-0 
            ${isActive ? 'bg-white/20' : isSpecial ? 'bg-amber-500/20 text-amber-600' : 'bg-[var(--bg-tertiary)]'}`}>
            {iconUrl ? (
                <img src={iconUrl} alt={label} className={`w-5 h-5 object-contain ${isActive ? 'brightness-0 invert' : ''}`} />
            ) : (
                <FallbackIcon className={`w-5 h-5 ${isActive ? 'text-white' : isSpecial ? 'text-amber-600' : 'text-current'}`} />
            )}
        </div>
        {!collapsed && (
            <div className="flex flex-1 items-center justify-between">
                <span className={`text-sm font-bold tracking-wide truncate ${isSpecial && !isActive ? 'text-amber-700 dark:text-amber-400' : ''}`}>{label}</span>
                {isSpecial && !isActive && <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse mr-2"></div>}
            </div>
        )}
        {isActive && !collapsed && <div className="absolute left-2 w-1 h-4 bg-white/40 rounded-full"></div>}
    </button>
));

const GroupHeader: React.FC<{ label: string; collapsed: boolean }> = ({ label, collapsed }) => {
    if (collapsed) return <div className="h-px bg-[var(--border-primary)] my-4 mx-4 opacity-50"></div>;
    return (
        <div className="px-4 mt-6 mb-2">
            <p className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] opacity-70">{label}</p>
        </div>
    );
};

const PendingRequestsCard: React.FC<{ count: number; onNavClick: () => void; collapsed: boolean }> = ({ count, onNavClick, collapsed }) => {
    if (count === 0) return null;

    return (
        <div className={`px-4 pb-4 transition-all duration-300 ${collapsed ? 'hidden' : 'block'}`}>
            <button
                onClick={onNavClick}
                className="w-full bg-gradient-to-br from-rose-500 to-pink-600 p-4 rounded-2xl shadow-lg shadow-pink-600/20 hover:shadow-pink-600/40 transition-all duration-300 text-right space-y-2 group transform hover:-translate-y-1 relative overflow-hidden"
            >
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                <div className="flex items-center space-x-3 space-x-reverse relative z-10">
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-full relative">
                        <BellIcon className="w-5 h-5 text-white" />
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-rose-600 text-sm font-black">{count}</span>
                    </div>
                    <span className="font-black text-sm text-white">طلبات اشتراك</span>
                </div>
            </button>
        </div>
    );
};

const SidebarThemeToggle: React.FC<{ collapsed: boolean }> = ({ collapsed }) => {
    const { mode, setMode } = useAppearance();
    if (collapsed) return null;

    return (
        <div className="mx-4 mb-4 p-1 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-between relative border border-[var(--border-primary)] shadow-inner">
            <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[var(--bg-secondary)] rounded-xl shadow-sm transition-all duration-300 ease-spring ${mode === 'light' ? 'right-1' : 'right-[50%]'}`}
            ></div>

            <button
                onClick={() => setMode('light')}
                className={`flex-1 relative z-10 flex items-center justify-center py-2 text-sm font-black transition-colors ${mode === 'light' ? 'text-amber-500' : 'text-[var(--text-secondary)]'}`}
            >
                <SunIcon className="w-3.5 h-3.5 ml-1.5" />
                <span>نهار</span>
            </button>
            <button
                onClick={() => setMode('dark')}
                className={`flex-1 relative z-10 flex items-center justify-center py-2 text-sm font-black transition-colors ${mode === 'dark' ? 'text-blue-400' : 'text-[var(--text-secondary)]'}`}
            >
                <MoonIcon className="w-3.5 h-3.5 ml-1.5" />
                <span>ليل</span>
            </button>
        </div>
    );
};


const NavContent: React.FC<{
    activeView: string;
    onNavClick: (view: AdminView) => void;
    pendingRequestsCount: number;
    onLogout: () => void;
    collapsed: boolean
}> = ({ activeView, onNavClick, pendingRequestsCount, onLogout, collapsed }) => {
    const icons = useIcons();

    // 1. Core Management Group
    const coreNavItems = [
        { id: 'dashboard', label: 'الرئيسية', iconUrl: '', fallback: HomeIcon },
        { id: 'students', label: 'إدارة الطلاب', iconUrl: icons.adminNavStudentIconUrl, fallback: UsersIcon },
        { id: 'teachers', label: 'إدارة المدرسين', iconUrl: icons.adminNavTeacherIconUrl, fallback: UsersIcon },
        { id: 'supervisors', label: 'إدارة المشرفين', iconUrl: '', fallback: UsersIcon },
        { id: 'content', label: 'إدارة المنهج الدراسي', iconUrl: icons.adminNavContentIconUrl, fallback: BookOpenIcon },
        { id: 'specialContent', label: 'التحكم المميز', iconUrl: '', fallback: StarIcon, isSpecial: true },
        { id: 'courseManagement', label: 'إدارة الكورسات', iconUrl: '', fallback: BookOpenIcon },
    ];

    // 2. Media & Entertainment Group
    const mediaNavItems = [
        { id: 'storyManagement', label: 'إدارة الاستوري', iconUrl: '', fallback: PhotoIcon, isSpecial: false },
        { id: 'cartoonMoviesManagement', label: 'أفلام الكرتون', iconUrl: icons.adminNavCartoonIconUrl, fallback: FilmIcon },
        { id: 'reelsManagement', label: 'إدارة الريلز', iconUrl: '', fallback: VideoCameraIcon },
        { id: 'homeManagement', label: 'إدارة الواجهة', iconUrl: '', fallback: TemplateIcon },
    ];

    // 3. Financial & Tools Group
    const toolNavItems = [
        { id: 'subscriptions', label: 'الاشتراكات', iconUrl: '', fallback: CreditCardIcon },
        { id: 'financials', label: 'التقارير المالية', iconUrl: '', fallback: ChartBarIcon },
        { id: 'subscriptionPrices', label: 'أسعار الاشتراكات', iconUrl: '', fallback: CurrencyDollarIcon },
        { id: 'tools', label: 'أكواد الاشتراكات', iconUrl: '', fallback: QrcodeIcon },
        { id: 'questionBank', label: 'بنك الأسئلة', iconUrl: '', fallback: ChatBubbleOvalLeftEllipsisIcon },
    ];

    // 4. System & Settings Group
    const settingsNavItems = [
        { id: 'platformSettings', label: 'إعدادات المنصة', iconUrl: '', fallback: CogIcon },
        { id: 'iconSettings', label: 'إدارة الأيقونات', iconUrl: '', fallback: SparklesIcon },
        { id: 'deviceManagement', label: 'إدارة الأجهزة', iconUrl: '', fallback: HardDriveIcon },
        { id: 'systemHealth', label: 'فحص الأعطال', iconUrl: icons.adminNavHealthIconUrl, fallback: HardDriveIcon },
        { id: 'accountSettings', label: 'إعدادات الحساب', iconUrl: '', fallback: UserCheckIcon },
    ];

    return (
        <div className="flex flex-col flex-1 h-full overflow-hidden">
            <div className={`flex items-center justify-center px-4 flex-shrink-0 relative transition-all duration-500 ${collapsed ? 'h-20' : 'h-24'}`}>
                <div className="flex flex-col items-center gap-1.5 relative z-10">
                    <img src={icons.mainLogoUrl} alt="Logo" className={`object-contain transition-all duration-500 ${collapsed ? 'w-10 h-10' : 'w-11 h-11'}`} />
                    {!collapsed && <h1 className="text-sm font-black text-[var(--text-primary)] tracking-tight uppercase">لوحة التحكم</h1>}
                </div>
            </div>

            <nav className="flex-grow px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
                {/* Group 1: Core */}
                <div>
                    <GroupHeader label="الإدارة التعليمية" collapsed={collapsed} />
                    {coreNavItems.map((item) => (
                        <NavButton key={item.id} onClick={() => onNavClick(item.id as AdminView)} label={item.label} iconUrl={item.iconUrl} fallbackIcon={item.fallback} isActive={activeView === item.id} collapsed={collapsed} isSpecial={item.isSpecial} />
                    ))}
                </div>

                {/* Group 2: Media */}
                <div>
                    <GroupHeader label="الوسائط والترفيه" collapsed={collapsed} />
                    {mediaNavItems.map((item) => (
                        <NavButton key={item.id} onClick={() => onNavClick(item.id as AdminView)} label={item.label} iconUrl={item.iconUrl} fallbackIcon={item.fallback} isActive={activeView === item.id} collapsed={collapsed} isSpecial={item.isSpecial} />
                    ))}
                </div>

                {/* Group 3: Financial */}
                <div>
                    <GroupHeader label="المالية والأدوات" collapsed={collapsed} />
                    {toolNavItems.map((item) => (
                        <NavButton key={item.id} onClick={() => onNavClick(item.id as AdminView)} label={item.label} iconUrl={item.iconUrl} fallbackIcon={item.fallback} isActive={activeView === item.id} collapsed={collapsed} />
                    ))}
                </div>

                {/* Group 4: Settings */}
                <div>
                    <GroupHeader label="إعدادات النظام" collapsed={collapsed} />
                    {settingsNavItems.map((item) => (
                        <NavButton key={item.id} onClick={() => onNavClick(item.id as AdminView)} label={item.label} iconUrl={item.iconUrl} fallbackIcon={item.fallback} isActive={activeView === item.id} collapsed={collapsed} />
                    ))}
                </div>
            </nav>

            <div className="mt-auto pt-4 flex-shrink-0 z-20 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
                <PendingRequestsCard count={pendingRequestsCount} onNavClick={() => onNavClick('subscriptions')} collapsed={collapsed} />
                <SidebarThemeToggle collapsed={collapsed} />
                <div className="px-4 pb-4">
                    <button onClick={onLogout} className={`w-full flex items-center justify-center p-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all duration-300 group shadow-sm font-black text-sm ${collapsed ? '' : 'space-x-3 space-x-reverse'}`}>
                        <LogoutIcon className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                        {!collapsed && <span>تسجيل الخروج</span>}
                    </button>
                </div>
            </div>
        </div>
    )
};

const AdminLayout: React.FC<AdminLayoutProps> = ({ user, onLogout, children, onNavClick, activeView }) => {
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'subscription_requests_temp'
            }, payload => {
                fetchPendingCount();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMobileNavClick = (view: AdminView) => {
        onNavClick(view);
        setIsMobileNavOpen(false);
    };

    return (
        <div className="h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-0 md:p-3 flex flex-col md:grid md:grid-rows-1 overflow-hidden font-sans"
            style={{ gridTemplateColumns: isSidebarCollapsed ? '80px 1fr' : '288px 1fr' }}>
            <aside className={`relative z-40 transition-all duration-500 hidden md:flex flex-col`}>
                <div className="h-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
                    <NavContent activeView={activeView} onNavClick={onNavClick} pendingRequestsCount={pendingRequestsCount} onLogout={onLogout} collapsed={isSidebarCollapsed} />
                </div>
                {/* Toggle Button - positioned relative to aside but visually floating */}
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="absolute top-1/2 -translate-y-1/2 -left-4 z-50 w-8 h-8 bg-[var(--bg-secondary)] border-2 border-indigo-600 rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-600 hover:text-white transition-all text-indigo-600 cursor-pointer active:scale-90"
                    title={isSidebarCollapsed ? "توسيع القائمة" : "تصغير القائمة"}
                >
                    {isSidebarCollapsed ? <ChevronLeftIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                </button>
            </aside>

            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <header className="flex-shrink-0 z-30 pt-2 pb-4 px-4 md:px-0 sticky top-0">
                    <div className="bg-[rgba(var(--bg-secondary-rgb),0.9)] backdrop-blur-xl border border-[var(--border-primary)] shadow-sm rounded-[2rem] px-6 py-4 flex items-center justify-between transition-all duration-300">
                        <div className="flex items-center gap-4 md:hidden">
                            <button className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors" onClick={() => setIsMobileNavOpen(true)}>
                                <MenuIcon className="w-6 h-6 text-[var(--text-primary)]" />
                            </button>
                            <h1 className="text-lg font-black text-[var(--text-primary)]">لوحة المالك</h1>
                        </div>

                        <div className="hidden md:block">
                            <p className="text-sm text-[var(--text-secondary)] font-bold">مرحباً بالمالك، <span className="text-[var(--text-primary)] font-black">{user.name}</span></p>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <button onClick={() => { setIsNotificationsOpen(p => !p); setIsProfileMenuOpen(false); }} className="relative bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-sm active:scale-95 group">
                                    <BellIcon className="w-5.5 h-5.5" />
                                    {pendingRequestsCount > 0 && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--bg-secondary)] animate-pulse"></span>}
                                </button>
                                {isNotificationsOpen && (
                                    <div ref={notificationsRef} className="absolute top-full mt-4 left-0 w-80 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[2.5rem] shadow-2xl z-50 fade-in-up overflow-hidden">
                                        <div className="p-5 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]/50"><h3 className="font-black text-sm text-[var(--text-primary)]">تنبيهات النظام</h3></div>
                                        <div className="p-2 max-h-80 overflow-y-auto custom-scrollbar">
                                            {pendingRequestsCount > 0 ? (
                                                <button onClick={() => { onNavClick('subscriptions'); setIsNotificationsOpen(false); }} className="w-full p-4 rounded-3xl hover:bg-[var(--bg-tertiary)] text-right transition-colors group">
                                                    <p className="font-black text-sm text-[var(--text-primary)]">طلب اشتراك جديد</p>
                                                    <p className="text-sm text-[var(--text-secondary)] font-bold">لديك {pendingRequestsCount} طلبات معلقة.</p>
                                                </button>
                                            ) : (
                                                <div className="p-12 text-center text-sm font-bold text-[var(--text-secondary)]">لا توجد إشعارات حالياً.</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div onClick={() => setIsProfileMenuOpen(p => !p)} className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md cursor-pointer">
                                {user.name.charAt(0)}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-0 md:bg-transparent scroll-smooth custom-scrollbar">
                    <div key={activeView} className="fade-in h-full">
                        {children}
                    </div>
                </main>
            </div>

            {isMobileNavOpen && (
                <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
                    <div className="fixed inset-0 bg-black/60 animate-fade-in backdrop-blur-md" onClick={() => setIsMobileNavOpen(false)}></div>
                    <div className={`fixed inset-y-2 right-2 w-[80%] max-w-[300px] bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex flex-col animate-slide-in-right rounded-[2.5rem] overflow-hidden shadow-2xl`}>
                        <div className="h-20 flex items-center justify-center flex-shrink-0 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]/20 relative">
                            <img src={icons.mainLogoUrl} alt="Logo" className="w-10 h-10 object-contain" />
                            <button onClick={() => setIsMobileNavOpen(false)} className="absolute left-4 p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-full"><XIcon className="w-6 h-6" /></button>
                        </div>
                        <NavContent activeView={activeView} onNavClick={handleMobileNavClick} pendingRequestsCount={pendingRequestsCount} onLogout={onLogout} collapsed={false} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLayout;
