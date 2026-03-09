
import React, { useState, useMemo } from 'react';
import { User, Teacher, TeacherView, Role } from '../../types';
import { CollectionIcon, CreditCardIcon, UserCircleIcon, LogoutIcon, MenuIcon, XIcon, HomeIcon, UsersIcon, ChatBubbleOvalLeftEllipsisIcon, SunIcon, MoonIcon, AtomIcon, BellIcon, TemplateIcon, ChevronLeftIcon, ChevronRightIcon } from '../common/Icons';
import { useAppearance } from '../../AppContext';

interface TeacherLayoutProps {
    user: User;
    teacher: Teacher;
    onLogout: () => void;
    children: React.ReactNode;
    onNavClick: (view: TeacherView) => void;
    activeView: string;
    supervisedTeachers?: Teacher[];
    selectedTeacherId?: string | null;
    onSelectTeacher?: (id: string) => void;
}

// --- Premium Nav Button ---
const NavButton: React.FC<{
    onClick: () => void;
    label: string;
    icon: React.FC<{ className?: string }>;
    isActive: boolean;
    collapsed: boolean;
}> = ({ onClick, label, icon: Icon, isActive, collapsed }) => {

    return (
        <button
            onClick={onClick}
            title={collapsed ? label : ''}
            className={`relative w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 group overflow-hidden 
            ${collapsed ? 'justify-center' : ''}
            ${isActive ? 'bg-gradient-to-r from-[var(--accent-primary)] to-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'}`}
        >
            <div className={`relative z-10 flex items-center justify-center w-6 h-6 transition-transform duration-300 flex-shrink-0 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                <Icon className={`w-full h-full object-contain ${isActive ? 'text-white' : ''}`} />
            </div>
            {!collapsed && <span className="relative z-10 text-sm font-bold tracking-wide truncate">{label}</span>}
        </button>
    )
};

// --- Sidebar Footer ---
const SidebarFooter: React.FC<{ collapsed: boolean }> = ({ collapsed }) => {
    const { mode, setMode } = useAppearance();
    if (collapsed) return null;

    return (
        <div className="mx-4 mb-4 p-1.5 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-between relative border border-[var(--border-primary)] shadow-inner">
            {/* Sliding Indicator */}
            <div
                className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-[var(--bg-secondary)] rounded-xl shadow-sm transition-all duration-300 ease-spring ${mode === 'light' ? 'right-1.5' : 'right-[50%]'}`}
            ></div>

            <button
                onClick={() => setMode('light')}
                className={`flex-1 relative z-10 flex items-center justify-center py-2 text-sm font-bold transition-colors ${mode === 'light' ? 'text-amber-500' : 'text-[var(--text-secondary)]'}`}
            >
                <SunIcon className="w-4 h-4 ml-1.5" />
                <span>نهار</span>
            </button>
            <button
                onClick={() => setMode('dark')}
                className={`flex-1 relative z-10 flex items-center justify-center py-2 text-sm font-bold transition-colors ${mode === 'dark' ? 'text-blue-400' : 'text-[var(--text-secondary)]'}`}
            >
                <MoonIcon className="w-4 h-4 ml-1.5" />
                <span>ليل</span>
            </button>
        </div>
    );
};

const NavContent: React.FC<{
    activeView: string;
    onNavClick: (view: TeacherView) => void;
    onLogout: () => void;
    isSupervisor: boolean;
    teacher: Teacher;
    user: User;
    supervisedTeachers?: Teacher[];
    selectedTeacherId?: string | null;
    onSelectTeacher?: (id: string) => void;
    collapsed: boolean;
}> = ({ activeView, onNavClick, onLogout, isSupervisor, teacher, user, supervisedTeachers, selectedTeacherId, onSelectTeacher, collapsed }) => {

    const navItems = useMemo(() => [
        { id: 'dashboard', label: 'الرئيسية', icon: HomeIcon },
        ...(isSupervisor ? [{ id: 'students', label: 'إدارة الطلاب', icon: UsersIcon }] : []),
        { id: 'studentChats', label: 'رسائل الطلاب', icon: ChatBubbleOvalLeftEllipsisIcon },
        { id: 'content', label: 'المحتوى الدراسي', icon: CollectionIcon },
        { id: 'subscriptions', label: 'الاشتراكات', icon: CreditCardIcon },
        { id: 'profile', label: 'الملف الشخصي', icon: UserCircleIcon },
    ], [isSupervisor]);

    return (
        <div className="flex flex-col h-full">
            {user.role === Role.SUPERVISOR && supervisedTeachers && supervisedTeachers.length > 1 && !collapsed && (
                <div className="p-4 border-b border-[var(--border-primary)] animate-fade-in">
                    <label htmlFor="teacher-select" className="block text-sm font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">عرض محتوى المدرس:</label>
                    <select
                        id="teacher-select"
                        value={selectedTeacherId || ''}
                        onChange={(e) => onSelectTeacher?.(e.target.value)}
                        className={`w-full p-3 rounded-xl text-sm text-[var(--text-primary)] transition-all bg-[var(--bg-tertiary)] border border-[var(--border-primary)] focus:ring-2 focus:ring-[var(--accent-primary)] font-bold`}
                    >
                        {supervisedTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
            )}

            <nav className="flex-grow px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => <NavButton key={item.id} onClick={() => onNavClick(item.id as TeacherView)} label={item.label} icon={item.icon} isActive={activeView === item.id} collapsed={collapsed} />)}
            </nav>

            <div className="px-4 pb-4 mt-auto">
                <SidebarFooter collapsed={collapsed} />
                <button
                    onClick={onLogout}
                    title={collapsed ? 'تسجيل الخروج' : ''}
                    className={`w-full flex items-center justify-center gap-4 p-3.5 rounded-2xl text-red-500 transition-all duration-200 group hover:bg-red-500/10 border border-transparent hover:border-red-500/20 ${collapsed ? '' : 'gap-4'}`}
                >
                    <LogoutIcon className="w-5 h-5 transition-transform group-hover:-translate-x-1 flex-shrink-0" />
                    {!collapsed && <span className="text-sm font-bold">تسجيل الخروج</span>}
                </button>
            </div>
        </div>
    );
};

const TeacherLayout: React.FC<TeacherLayoutProps> = ({ user, teacher, onLogout, children, onNavClick, activeView, supervisedTeachers, selectedTeacherId, onSelectTeacher }) => {
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    return (
        <div className="h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-0 md:p-4 overflow-hidden flex flex-col md:flex-row gap-0">

            {/* Desktop Sidebar - Fixed Z-index and Toggle position */}
            <aside className={`flex-shrink-0 hidden md:flex flex-col z-40 relative transition-all duration-500 m-2 mr-0 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
                <div className="h-full rounded-[2rem] bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-2xl flex flex-col overflow-hidden">
                    {/* Header with Explicit Toggle - Fixed clipping */}
                    <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center py-4' : 'justify-between px-5 py-6'} border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]/30 relative overflow-visible`}>
                        {!isSidebarCollapsed && (
                            <div className="flex items-center gap-3 overflow-hidden">
                                <img src={teacher.imageUrl} alt={teacher.name} className="w-8 h-8 rounded-lg object-cover shadow-sm" />
                                <span className="font-bold text-sm truncate">{teacher.name}</span>
                            </div>
                        )}
                    </div>

                    <NavContent
                        activeView={activeView}
                        onNavClick={onNavClick}
                        onLogout={onLogout}
                        isSupervisor={user.role === Role.SUPERVISOR}
                        teacher={teacher}
                        user={user}
                        supervisedTeachers={supervisedTeachers}
                        selectedTeacherId={selectedTeacherId}
                        onSelectTeacher={onSelectTeacher}
                        collapsed={isSidebarCollapsed}
                    />
                </div>

                {/* Toggle Button */}
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className={`w-10 h-10 rounded-full bg-[var(--bg-secondary)] border-2 border-indigo-600 flex items-center justify-center shadow-2xl hover:bg-indigo-600 hover:text-white transition-all text-indigo-600 absolute z-[100] cursor-pointer active:scale-90 shadow-[0_4px_15px_rgba(0,0,0,0.1)]`}
                    style={{ left: '-20px', top: '50%', transform: 'translateY(-50%)' }}
                    title={isSidebarCollapsed ? "توسيع القائمة" : "تصغير القائمة"}
                >
                    {isSidebarCollapsed ? <ChevronLeftIcon className="w-6 h-6" /> : <ChevronRightIcon className="w-6 h-6" />}
                </button>
            </aside>

            <div className={`flex-1 flex flex-col h-full relative overflow-hidden transition-all duration-300 md:pl-4`}>
                {/* Header */}
                <header className={`relative w-full z-30 px-4 md:px-0 pt-2 pb-4`}>
                    <div className="bg-[rgba(var(--bg-secondary-rgb),0.9)] backdrop-blur-xl border border-[var(--border-primary)] rounded-3xl shadow-sm px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4 md:hidden">
                            <div className="menu-toggle p-2 rounded-xl hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors" onClick={() => setIsMobileNavOpen(true)}>
                                <span className="w-6 h-0.5 bg-[var(--text-primary)] mb-1.5 block rounded-full"></span>
                                <span className="w-4 h-0.5 bg-[var(--text-primary)] mb-1.5 block rounded-full"></span>
                                <span className="w-6 h-0.5 bg-[var(--text-primary)] block rounded-full"></span>
                            </div>
                            <h1 className="text-lg font-bold text-[var(--text-primary)]">لوحة المعلم</h1>
                        </div>

                        <div className="hidden md:block">
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">مرحباً، {user.name}</h2>
                        </div>

                        <div className="flex items-center gap-4">
                            <button className={`p-3 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)] transition-all`}>
                                <BellIcon className="w-5 h-5 text-[var(--text-secondary)]" />
                            </button>
                            <div onClick={() => onNavClick('profile')} className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-lg cursor-pointer transition-transform hover:scale-105 bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-blue-500/20`}>
                                {user.name.charAt(0)}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-0 scroll-smooth custom-scrollbar">
                    <div key={activeView} className="fade-in pb-10">{children}</div>
                </main>
            </div>

            {isMobileNavOpen && (
                <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
                    <div className="fixed inset-0 bg-black/60 animate-fade-in backdrop-blur-md" onClick={() => setIsMobileNavOpen(false)}></div>
                    <div className={`fixed inset-y-2 right-2 w-[85%] max-w-[280px] flex flex-col animate-slide-in-right shadow-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[2rem] overflow-hidden`}>
                        <div className={`h-24 flex items-end justify-between px-6 pb-6 bg-[var(--bg-tertiary)]/30 border-b border-[var(--border-primary)]`}>
                            <div className="flex items-center gap-3">
                                <img src={teacher.imageUrl} alt={teacher.name} className="w-10 h-10 rounded-xl object-cover border border-[var(--border-primary)] shadow-sm" />
                                <span className="font-bold text-lg text-[var(--text-primary)]">المعلم</span>
                            </div>
                            <button onClick={() => setIsMobileNavOpen(false)} className={`p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full bg-[var(--bg-primary)] shadow-sm border border-[var(--border-primary)]`}>
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <NavContent
                            activeView={activeView}
                            onNavClick={(v) => { onNavClick(v); setIsMobileNavOpen(false); }}
                            onLogout={() => { onLogout(); setIsMobileNavOpen(false); }}
                            isSupervisor={user.role === Role.SUPERVISOR}
                            teacher={teacher}
                            user={user}
                            supervisedTeachers={supervisedTeachers}
                            selectedTeacherId={selectedTeacherId}
                            onSelectTeacher={onSelectTeacher}
                            collapsed={false}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherLayout;
