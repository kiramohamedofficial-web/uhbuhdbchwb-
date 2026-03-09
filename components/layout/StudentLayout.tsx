
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StudentView, Subscription, AppNotification } from '../../types';
import {
    HomeIcon, UsersIcon, LogoutIcon, XIcon, SparklesIcon,
    BrainIcon, BellIcon, MoonIcon, SunIcon, ChevronRightIcon,
    ChevronLeftIcon, MenuIcon, WhatsAppIcon, CreditCardIcon,
    ChatBubbleOvalLeftEllipsisIcon, VideoCameraIcon, BookOpenIcon,
    ChartBarIcon, FilmIcon, CheckCircleIcon, InformationCircleIcon,
    ClockIcon, ShieldCheckIcon
} from '../common/Icons';
import { useSession } from '../../hooks/useSession';
import { useSubscription } from '../../hooks/useSubscription';
import { useAppearance } from '../../AppContext';
import { useIcons } from '../../IconContext';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../common/Modal'; // Import Modal

interface StudentLayoutProps {
    children: React.ReactNode;
    onNavClick: (view: StudentView) => void;
    activeView: string;
    gradeName?: string;
}

// --- Icons Components ---
const HomeBottomNavIcon: React.FC<{ className?: string }> = ({ className }) => {
    const icons = useIcons();
    return icons.studentNavHomeIconUrl ? <img src={icons.studentNavHomeIconUrl} className={className} alt="Home" /> : <HomeIcon className={className} />;
};
const CurriculumIcon: React.FC<{ className?: string }> = ({ className }) => {
    const icons = useIcons();
    return icons.studentNavCurriculumIconUrl ? <img src={icons.studentNavCurriculumIconUrl} className={className} alt="Curriculum" /> : <BookOpenIcon className={className} />;
};
const CoursesIcon: React.FC<{ className?: string }> = ({ className }) => {
    const icons = useIcons();
    return icons.studentNavHomeIconUrl ? <img src={icons.studentNavHomeIconUrl} className={className} alt="Courses" /> : <BookOpenIcon className={className} />;
};
const SubscriptionBottomNavIcon: React.FC<{ className?: string }> = ({ className }) => {
    const icons = useIcons();
    return icons.studentNavSubscriptionIconUrl ? <img src={icons.studentNavSubscriptionIconUrl} className={className} alt="Subs" /> : <CreditCardIcon className={className} />;
};
const ProfileBottomNavIcon: React.FC<{ className?: string }> = ({ className }) => {
    const icons = useIcons();
    return icons.studentNavProfileIconUrl ? <img src={icons.studentNavProfileIconUrl} className={className} alt="Profile" /> : <UsersIcon className={className} />;
};
const ResultsIcon: React.FC<{ className?: string }> = ({ className }) => {
    const icons = useIcons();
    return icons.studentNavResultsIconUrl ? <img src={icons.studentNavResultsIconUrl} className={className} alt="Results" /> : <ChartBarIcon className={className} />;
};
const ChatbotIcon: React.FC<{ className?: string }> = ({ className }) => {
    const icons = useIcons();
    return icons.studentNavChatbotIconUrl ? <img src={icons.studentNavChatbotIconUrl} className={className} alt="Chatbot" /> : <BrainIcon className={className} />;
};
const CartoonMoviesIcon: React.FC<{ className?: string }> = ({ className }) => {
    const icons = useIcons();
    return icons.studentNavCartoonIconUrl ? <img src={icons.studentNavCartoonIconUrl} className={className} alt="Cartoon" /> : <VideoCameraIcon className={className} />;
};
const QuestionBankIcon: React.FC<{ className?: string }> = ({ className }) => {
    const icons = useIcons();
    return icons.studentNavQuestionBankIconUrl ? <img src={icons.studentNavQuestionBankIconUrl} className={className} alt="Questions" /> : <SparklesIcon className={className} />;
};
const ReelsIcon: React.FC<{ className?: string }> = ({ className }) => {
    const icons = useIcons();
    return icons.studentNavReelsIconUrl ? <img src={icons.studentNavReelsIconUrl} className={className} alt="Reels" /> : <FilmIcon className={className} />;
};

// --- Mobile Bottom Nav Items (6 Items) ---
const bottomNavItems = [
    { id: 'home', label: 'الرئيسية', icon: HomeBottomNavIcon },
    { id: 'grades', label: 'المنهج', icon: CurriculumIcon },
    { id: 'cartoonMovies', label: 'الأفلام', icon: CartoonMoviesIcon },
    { id: 'reels', label: 'ريلز', icon: ReelsIcon },
    { id: 'subscription', label: 'اشتراك', icon: SubscriptionBottomNavIcon },
    { id: 'profile', label: 'ملفي', icon: ProfileBottomNavIcon },
];

// --- Sidebar Profile Card ---
const SidebarProfileCard: React.FC<{
    user: any;
    gradeName?: string;
    collapsed: boolean;
    headerColor: string;
    onNavigate: () => void;
    hasActiveSubscription: boolean;
    onShowDetails: () => void;
}> = ({ user, gradeName, collapsed, headerColor, onNavigate, hasActiveSubscription, onShowDetails }) => {
    return (
        <div
            className={`
                relative overflow-hidden transition-all duration-700 group cursor-pointer shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] border border-white/10
                ${collapsed ? 'h-12 w-12 mx-auto rounded-2xl my-3' : 'rounded-[2rem] p-4 mb-6 mx-2'}
            `}
            style={{
                background: collapsed ? 'transparent' : `linear-gradient(135deg, ${headerColor || '#4F46E5'}, #1e1b4b)`,
            }}
            onClick={onNavigate}
        >
            {!collapsed && (
                <>
                    <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <circle cx="90" cy="10" r="30" fill="white" fillOpacity="0.1" />
                        </svg>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </>
            )}

            <div className={`flex items-center gap-4 relative z-10 ${collapsed ? 'justify-center w-full h-full' : ''}`}>
                <div className="relative shrink-0">
                    <div className={`relative rounded-2xl p-[2px] transition-all duration-500 group-hover:rotate-6 ${collapsed ? 'w-10 h-10' : 'w-12 h-12 bg-white/20 shadow-xl'}`}>
                        <div className="w-full h-full rounded-2xl border-2 border-white/50 overflow-hidden bg-white shadow-inner">
                            {user.imageUrl ? (
                                <img src={user.imageUrl} className="w-full h-full object-cover" alt="Profile" />
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center font-black text-lg text-indigo-600"
                                >
                                    {user.name?.charAt(0)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {!collapsed && (
                    <div className="flex-1 min-w-0 text-right">
                        <h3 className="font-black text-white text-base mb-1 truncate drop-shadow-md">{user.name}</h3>
                        <div className="flex items-center justify-end gap-2">
                            {hasActiveSubscription ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onShowDetails(); }}
                                    className="text-[10px] font-black text-indigo-900 bg-white/90 px-3 py-1 rounded-lg border border-white/20 flex items-center gap-1.5 w-fit hover:bg-white transition-all shadow-sm active:scale-95"
                                >
                                    <CheckCircleIcon className="w-3 h-3 text-indigo-600" /> مشترك
                                </button>
                            ) : (
                                <span className="text-[10px] font-black text-white/90 bg-black/20 px-3 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 w-fit backdrop-blur-sm">
                                    <InformationCircleIcon className="w-3 h-3" /> مجاني
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Nav Button Component ---
const NavButton: React.FC<{
    onClick: () => void;
    label: string;
    icon: React.FC<{ className?: string }>;
    isActive: boolean;
    collapsed: boolean;
}> = React.memo(({ onClick, label, icon: Icon, isActive, collapsed }) => {
    return (
        <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`
                group relative flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200 w-full mb-1 overflow-hidden
                ${collapsed ? 'justify-center p-2' : ''}
                ${isActive
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'}
            `}
            title={collapsed ? label : ''}
        >
            <div className={`
                relative z-10 w-5 h-5 flex items-center justify-center transition-all duration-300 flex-shrink-0
                ${isActive ? 'text-white' : 'text-current'}
            `}>
                <Icon className={`w-4 h-4 object-contain`} />
            </div>

            {!collapsed && (
                <div className="flex-1 text-right relative z-10 flex justify-between items-center">
                    <span className={`text-[11px] transition-colors ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
                    {isActive && <ChevronLeftIcon className="w-2.5 h-2.5 text-white opacity-80" />}
                </div>
            )}
        </button>
    )
});

const SidebarFooter: React.FC<{ collapsed: boolean, onLogout: () => void }> = ({ collapsed, onLogout }) => {
    const { mode, setMode } = useAppearance();

    return (
        <div className="mt-2 pt-2 space-y-2 px-1">
            {/* Theme Toggle */}
            <button
                onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
                className={`w-full flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)]/30 transition-all duration-300 group ${collapsed ? 'justify-center' : ''}`}
            >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${mode === 'light' ? 'bg-orange-400 text-white' : 'bg-indigo-600 text-white'}`}>
                    {mode === 'light' ? <SunIcon className="w-3.5 h-3.5" /> : <MoonIcon className="w-3.5 h-3.5" />}
                </div>
                {!collapsed && (
                    <div className="flex-1 text-right flex justify-between items-center">
                        <span className="font-bold text-sm text-[var(--text-primary)]">{mode === 'light' ? 'نهاري' : 'ليلي'}</span>
                    </div>
                )}
            </button>

            {/* Logout Button */}
            <button
                onClick={onLogout}
                className={`w-full flex items-center gap-3 p-2 rounded-lg bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 border border-red-500/10 group ${collapsed ? 'justify-center' : ''}`}
            >
                <div className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <LogoutIcon className="w-3.5 h-3.5" />
                </div>
                {!collapsed && (
                    <span className="font-bold text-sm">خروج</span>
                )}
            </button>
        </div>
    );
};

const NavSection: React.FC<{ title: string; collapsed: boolean; children: React.ReactNode }> = ({ title, collapsed, children }) => (
    <div className={`
        ${!collapsed ? 'bg-[var(--bg-tertiary)]/10 border border-[var(--border-primary)] rounded-2xl p-1.5 mb-3' : 'mb-2'}
    `}>
        {!collapsed && (
            <p className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1 px-2 opacity-50">
                {title}
            </p>
        )}
        {children}
    </div>
);

const NavContent: React.FC<{
    navItems: any[];
    activeView: string;
    onNavClick: (view: StudentView) => void;
    onLogout: () => void;
    collapsed: boolean;
}> = React.memo(({ navItems, activeView, onNavClick, onLogout, collapsed }) => {

    // Split items into categories
    const mainItems = navItems.filter(i => ['home', 'grades', 'teachers', 'courses', 'results'].includes(i.id));
    const entItems = navItems.filter(i => ['cartoonMovies', 'reels', 'questionBank'].includes(i.id));
    const helpItems = navItems.filter(i => ['askTeacher', 'aiLearning'].includes(i.id));

    return (
        <div className="flex flex-col h-full relative">
            <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1 relative z-10 pb-4 pt-1">

                <NavSection title="الرئيسية" collapsed={collapsed}>
                    {mainItems.map((item) => (
                        <NavButton key={item.id} onClick={() => onNavClick(item.id as StudentView)} label={item.label} icon={item.icon} isActive={activeView === item.id} collapsed={collapsed} />
                    ))}
                </NavSection>

                <NavSection title="الترفيه والتدريب" collapsed={collapsed}>
                    {entItems.map((item) => (
                        <NavButton key={item.id} onClick={() => onNavClick(item.id as StudentView)} label={item.label} icon={item.icon} isActive={activeView === item.id} collapsed={collapsed} />
                    ))}
                </NavSection>

                <NavSection title="المساعد الذكي" collapsed={collapsed}>
                    {helpItems.map((item) => (
                        <NavButton key={item.id} onClick={() => onNavClick(item.id as StudentView)} label={item.label} icon={item.icon} isActive={activeView === item.id} collapsed={collapsed} />
                    ))}
                </NavSection>

                <NavSection title="إضافية" collapsed={collapsed}>
                    <NavButton onClick={() => onNavClick('subscription')} label="الاشتراك" icon={SubscriptionBottomNavIcon} isActive={activeView === 'subscription'} collapsed={collapsed} />
                    <a href="https://wa.me/201222995328" target="_blank" rel="noopener noreferrer" className={`group relative flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 w-full mb-1 overflow-hidden ${collapsed ? 'justify-center p-2' : ''} text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]`}>
                        <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-green-500">
                            <WhatsAppIcon className="w-4 h-4" />
                        </div>
                        {!collapsed && (
                            <div className="flex-1 text-right flex justify-between items-center">
                                <span className="text-[11px] font-bold transition-colors">الدعم الفني</span>
                            </div>
                        )}
                    </a>
                </NavSection>

                {/* Footer Items (Moved inside Nav) */}
                <SidebarFooter collapsed={collapsed} onLogout={onLogout} />
            </nav>
        </div>
    )
});

// --- UPDATED BOTTOM NAV ITEM: No filters, bigger icons ---
const BottomNavItem: React.FC<{ onClick: () => void; label: string; icon: React.FC<{ className?: string }>; isActive: boolean }> = React.memo(({ onClick, label, icon: Icon, isActive }) => (
    <button
        type="button"
        onClick={onClick}
        className={`relative flex flex-col items-center justify-center transition-all duration-500 group flex-1 pt-2 pb-1`}
    >
        <div className={`transition-all duration-500 ${isActive ? '-translate-y-3 scale-110' : 'scale-100 opacity-70 group-hover:opacity-100'}`}>
            <div className={`p-2 rounded-2xl transition-all duration-500 ${isActive ? 'bg-indigo-600 text-white shadow-[0_10px_20px_-5px_rgba(79,70,229,0.5)]' : 'bg-transparent text-gray-500'}`}>
                <Icon className={`w-6 h-6 object-contain`} />
            </div>
        </div>
        <span className={`text-[9px] font-black mt-1 transition-all duration-500 uppercase tracking-tighter ${isActive ? 'text-indigo-600 opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-100'}`}>
            {label}
        </span>
        {isActive && (
            <motion.div layoutId="navIndicator" className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-600" />
        )}
    </button>
));

const StudentLayout: React.FC<StudentLayoutProps> = ({ children, onNavClick, activeView, gradeName }) => {
    const { currentUser: user, handleLogout: onLogout } = useSession();
    const { notifications, activeSubscriptions } = useSubscription();
    const { profileHeaderColor } = useAppearance();
    const icons = useIcons();

    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isSubDetailsModalOpen, setIsSubDetailsModalOpen] = useState(false);
    const [isFullscreenMode, setIsFullscreenMode] = useState(false);
    const notificationsRef = useRef<HTMLDivElement>(null);

    const isImmersiveView = useMemo(() => ['cartoonMovies', 'reels', 'player'].includes(activeView), [activeView]);
    const hasActiveSubscription = activeSubscriptions.length > 0;

    const navItems = useMemo(() => [
        { id: 'home', label: 'الرئيسية', icon: HomeBottomNavIcon },
        { id: 'grades', label: 'المنهج الدراسي', icon: CurriculumIcon },
        { id: 'teachers', label: 'نخبة المدرسين', icon: UsersIcon },
        { id: 'reels', label: 'ريلز', icon: ReelsIcon },
        { id: 'askTeacher', label: 'اسأل مدرسك', icon: ChatBubbleOvalLeftEllipsisIcon },
        { id: 'courses', label: 'الكورسات', icon: CoursesIcon },
        { id: 'results', label: 'النتائج', icon: ResultsIcon },
        { id: 'cartoonMovies', label: 'افلام كرتون', icon: CartoonMoviesIcon },
        { id: 'subscription', label: 'الاشتراك', icon: SubscriptionBottomNavIcon },
        { id: 'questionBank', label: 'بنك الأسئلة', icon: QuestionBankIcon },
        { id: 'aiLearning', label: 'المعلم الذكي', icon: ChatbotIcon },
    ], []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) setIsNotificationsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fullscreen Detection Logic - Added to hide sidebar on mobile
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFs = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement || !!(document as any).mozFullScreenElement || !!(document as any).msFullscreenElement;
            setIsFullscreenMode(isFs);

            // If going fullscreen, make sure side menus are closed
            if (isFs) {
                setIsMobileNavOpen(false);
                setIsNotificationsOpen(false);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('msfullscreenchange', handleFullscreenChange);
        };
    }, []);

    if (!user) return null;

    // --- MAIN LAYOUT RENDER ---
    return (
        <div className="h-[100dvh] bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden flex flex-col md:grid md:grid-rows-1 font-tajawal transition-colors duration-300"
            style={{ gridTemplateColumns: isSidebarCollapsed ? '70px 1fr' : '240px 1fr' }}>

            {/* Desktop Sidebar - Smaller Width [240px] - HIDDEN IN FULLSCREEN */}
            <aside
                className={`hidden md:flex flex-col h-full z-40 transition-[width] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] shadow-xl border-l border-[var(--border-primary)]
            ${isFullscreenMode ? 'hidden' : ''}
            bg-[#FFFDF5] dark:bg-[var(--bg-secondary)] 
            will-change-[width] transform-gpu
            `}
            >
                <div className="flex flex-col h-full overflow-hidden relative z-10">
                    {/* Header */}
                    <div className={`p-4 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                        {!isSidebarCollapsed && (
                            <div className="flex items-center gap-2 animate-slide-up">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-primary)] to-purple-500 flex items-center justify-center shadow-md">
                                    <img src={icons.mainLogoUrl} className="w-5 h-5 object-contain" alt="Logo" />
                                </div>
                                <div className="text-lg font-black italic tracking-tighter gradient-text">G-STUDENT</div>
                            </div>
                        )}
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className="w-7 h-7 rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--accent-primary)] hover:text-white flex items-center justify-center transition-all duration-300 group text-[var(--text-secondary)]"
                        >
                            {isSidebarCollapsed ? <ChevronLeftIcon className="w-4 h-4" /> : <XIcon className="w-4 h-4" />}
                        </button>
                    </div>

                    <div className="px-2 pt-1">
                        <SidebarProfileCard
                            user={user}
                            gradeName={gradeName}
                            collapsed={isSidebarCollapsed}
                            headerColor={profileHeaderColor}
                            onNavigate={() => onNavClick('profile')}
                            hasActiveSubscription={hasActiveSubscription}
                            onShowDetails={() => setIsSubDetailsModalOpen(true)}
                        />
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <NavContent navItems={navItems} activeView={activeView} onNavClick={onNavClick} onLogout={onLogout} collapsed={isSidebarCollapsed} />
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div
                className={`flex-1 flex flex-col h-full relative transition-all duration-300 ease-out will-change-transform transform-gpu`}
            >
                {!isImmersiveView && !isFullscreenMode && (
                    <header className="w-full z-30 sticky top-0 px-4 md:px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-2 animate-slide-up">
                        <div className="flex justify-between items-center">
                            {/* Left: User Info / Menu Trigger */}
                            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setIsMobileNavOpen(true)}>
                                <div className="relative md:hidden">
                                    <div className="absolute -inset-1 bg-gradient-to-tr from-[var(--accent-primary)] to-purple-500 rounded-full blur opacity-70 animate-pulse"></div>
                                    <div className="relative w-9 h-9 rounded-full bg-[var(--bg-secondary)] border-2 border-[var(--bg-secondary)] flex items-center justify-center overflow-hidden">
                                        {user.imageUrl ? <img src={user.imageUrl} className="w-full h-full object-cover" alt="User Profile" /> : <span className="font-black text-[var(--accent-primary)]">{user.name.charAt(0)}</span>}
                                    </div>
                                </div>

                                <div className="hidden md:block">
                                    <h2 className="text-lg font-black text-[var(--text-primary)] leading-none">مرحباً، {user.name.split(' ')[0]} 👋</h2>
                                    <p className="text-sm font-bold text-[var(--accent-primary)] uppercase tracking-widest mt-0.5">
                                        عرض القائمة <ChevronLeftIcon className="w-2.5 h-2.5 inline-block" />
                                    </p>
                                </div>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex gap-2">
                                <button onClick={() => setIsNotificationsOpen(p => !p)} className="w-9 h-9 glass rounded-xl flex items-center justify-center text-white relative active:scale-90 transition-all duration-300 hover:bg-white/10 group icon-bounce">
                                    <BellIcon className="w-5 h-5 group-hover:rotate-12 transition-transform text-[var(--text-primary)]" />
                                    {notifications.length > 0 && <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full animate-pulse border border border-[var(--bg-secondary)]"></span>}
                                </button>
                                <button className="md:hidden w-9 h-9 glass rounded-xl flex items-center justify-center text-[var(--accent-primary)] active:scale-90 transition-all duration-300 hover:bg-[var(--accent-primary)]/20 group icon-bounce" onClick={() => setIsMobileNavOpen(true)} title="فتح القائمة" aria-label="فتح القائمة">
                                    <MenuIcon className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
                                </button>
                            </div>
                        </div>
                    </header>
                )}

                {/* Notification Dropdown */}
                {isNotificationsOpen && !isFullscreenMode && (
                    <div ref={notificationsRef} className="absolute top-16 left-4 z-50 w-80 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[1.5rem] shadow-2xl overflow-hidden animate-slide-up glass">
                        <div className="p-3 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]/50">
                            <h3 className="font-black text-[var(--text-primary)] text-sm">الإشعارات</h3>
                        </div>
                        <div className="max-h-80 overflow-y-auto p-2 custom-scrollbar">
                            {notifications.length > 0 ? notifications.map(n => (
                                <button key={n.id} onClick={() => { if (n.link) onNavClick(n.link); setIsNotificationsOpen(false); }} className="w-full p-3 rounded-xl text-right transition-all mb-1 hover:bg-[var(--bg-tertiary)] group border-b border-[var(--border-primary)]/30 last:border-0">
                                    <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors leading-relaxed">{n.text}</p>
                                    <p className="text-sm text-[var(--text-secondary)] mt-1 opacity-70 font-mono">{new Date(n.createdAt).toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })}</p>
                                </button>
                            )) : <div className="p-6 text-center text-sm font-bold text-[var(--text-secondary)]">لا توجد إشعارات جديدة</div>}
                        </div>
                    </div>
                )}

                <main className={`flex-1 overflow-y-auto ${isImmersiveView || isFullscreenMode ? '' : 'p-4 md:p-6'} scroll-smooth custom-scrollbar`}>
                    <div className={`${isImmersiveView || isFullscreenMode ? 'w-full h-full' : 'max-w-8xl mx-auto min-h-full pb-28 md:pb-10'}`}>
                        <div key={activeView} className="animate-fade-in h-full">
                            {children}
                        </div>
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Nav - 6 Items - HIDDEN IN FULLSCREEN */}
            {!isImmersiveView && !isFullscreenMode && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] pb-[env(safe-area-inset-bottom)]">
                    <div className="shadow-2xl p-1 flex justify-between items-center h-20 px-2">
                        {bottomNavItems.map((item) => (
                            <BottomNavItem
                                key={item.id}
                                onClick={() => onNavClick(item.id as StudentView)}
                                label={item.label}
                                icon={item.icon}
                                isActive={activeView === item.id}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Mobile Menu Overlay - HIDDEN IN FULLSCREEN */}
            {isMobileNavOpen && !isFullscreenMode && (
                <div className="md:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setIsMobileNavOpen(false)}></div>
                    <div className={`fixed inset-y-0 right-0 w-[85%] max-w-[300px] flex flex-col bg-[#FFFDF5] dark:bg-[var(--bg-secondary)] border-l border-[var(--border-primary)] shadow-2xl overflow-hidden animate-slide-in-right rounded-l-[2.5rem]`}>
                        <div className="p-5 bg-[var(--bg-tertiary)]/50 border-b border-[var(--border-primary)] relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="font-black text-lg text-[var(--text-primary)]">القائمة</h2>
                                    <button onClick={() => setIsMobileNavOpen(false)} className="w-8 h-8 rounded-full glass hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors" title="إغلاق" aria-label="إغلاق"><XIcon className="w-4 h-4 text-[var(--text-primary)]" /></button>
                                </div>
                                <SidebarProfileCard
                                    user={user}
                                    gradeName={gradeName}
                                    collapsed={false}
                                    headerColor={profileHeaderColor}
                                    onNavigate={() => { onNavClick('profile'); setIsMobileNavOpen(false); }}
                                    hasActiveSubscription={hasActiveSubscription}
                                    onShowDetails={() => { setIsSubDetailsModalOpen(true); setIsMobileNavOpen(false); }}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-3 py-3">
                            <NavContent navItems={navItems} activeView={activeView} onNavClick={(v) => { onNavClick(v); setIsMobileNavOpen(false); }} onLogout={() => { onLogout(); setIsMobileNavOpen(false); }} collapsed={false} />
                        </div>
                    </div>
                </div>
            )}

            {/* Subscription Details Modal */}
            <Modal isOpen={isSubDetailsModalOpen} onClose={() => setIsSubDetailsModalOpen(false)} title="تفاصيل اشتراكاتك">
                <div className="space-y-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-4">
                        <ShieldCheckIcon className="w-10 h-10 text-emerald-500" />
                        <div>
                            <h4 className="font-black text-emerald-600 text-lg">أنت عضو مشترك</h4>
                            <p className="text-sm text-emerald-700/70 font-bold">لديك {activeSubscriptions.length} اشتراكات نشطة حالياً.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {activeSubscriptions.map((sub, idx) => (
                            <div key={idx} className="bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border-primary)] flex justify-between items-center">
                                <div>
                                    <p className="font-black text-[var(--text-primary)]">{sub.teacherId ? 'مادة محددة' : 'باقة شاملة'}</p>
                                    <p className="text-sm text-[var(--text-secondary)] mt-1">الباقة: {sub.plan === 'Monthly' ? 'شهرية' : 'سنوية'}</p>
                                </div>
                                <div className="text-left bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--border-primary)]">
                                    <span className="block text-sm text-[var(--text-secondary)] uppercase tracking-wider">ينتهي في</span>
                                    <span className="block font-mono font-bold text-sm text-indigo-600">{new Date(sub.endDate).toLocaleDateString('ar-EG')}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-[var(--border-primary)] flex justify-end">
                        <button onClick={() => setIsSubDetailsModalOpen(false)} className="px-6 py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] rounded-xl font-bold text-sm text-[var(--text-primary)]">إغلاق</button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default StudentLayout;