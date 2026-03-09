
import React, { useState, useCallback, useEffect } from 'react';
import { User, ToastType } from '../../types';
import { LogoutIcon, KeyIcon, TemplateIcon, ArrowsExpandIcon, ArrowsShrinkIcon, CheckCircleIcon, SunIcon, MoonIcon, CheckIcon, ShieldCheckIcon } from '../common/Icons';
import { useToast } from '../../useToast';
import Modal from '../common/Modal';
import { useSession } from '../../hooks/useSession';
import { useAppearance } from '../../AppContext';
import { updateUserPassword } from '../../services/storageService';
import { logAdminAction } from '../../services/auditService';
import ChangePasswordModal from './ChangePasswordModal';

const AppearanceSettings: React.FC = () => {
    const { mode, setMode } = useAppearance();

    return (
        <div className="bg-[var(--bg-secondary)] p-6 rounded-3xl shadow-lg border border-[var(--border-primary)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-3">
                <TemplateIcon className="w-6 h-6 text-purple-400" />
                المظهر العام
            </h2>

            {/* Day / Night Switcher */}
            <div className="bg-[var(--bg-tertiary)] p-2 rounded-2xl flex items-center justify-between mb-8 relative border border-[var(--border-primary)]">
                <div className={`absolute top-2 bottom-2 w-[calc(50%-8px)] bg-[var(--bg-secondary)] rounded-xl shadow-sm transition-all duration-300 ease-spring ${mode === 'light' ? 'right-2' : 'right-[50%] mr-2'}`}></div>

                <button
                    onClick={() => setMode('light')}
                    className={`flex-1 relative z-10 py-3 flex items-center justify-center gap-2 font-bold transition-colors ${mode === 'light' ? 'text-amber-500' : 'text-[var(--text-secondary)]'}`}
                >
                    <SunIcon className="w-5 h-5" />
                    <span>نهار (Light)</span>
                </button>
                <button
                    onClick={() => setMode('dark')}
                    className={`flex-1 relative z-10 py-3 flex items-center justify-center gap-2 font-bold transition-colors ${mode === 'dark' ? 'text-blue-400' : 'text-[var(--text-secondary)]'}`}
                >
                    <MoonIcon className="w-5 h-5" />
                    <span>ليل (Dark)</span>
                </button>
            </div>
        </div>
    );
};


const AdminSettingsView: React.FC = () => {
    const { currentUser: user, handleLogout: onLogout } = useSession();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

    const handleFullscreenChange = useCallback(() => {
        setIsFullscreen(!!document.fullscreenElement);
    }, []);

    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [handleFullscreenChange]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    };

    if (!user) return null;

    return (
        <div className="fade-in">
            <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">إعدادات الحساب</h1>
            <p className="mt-1 text-[var(--text-secondary)] mb-8">إدارة ملفك الشخصي، وتخصيص المظهر، والتحكم في أمان حسابك.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Left Column - Profile & Actions */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-[var(--bg-secondary)] p-6 rounded-3xl shadow-lg border border-[var(--border-primary)] text-center">
                        <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-4xl mb-4 shadow-xl ring-4 ring-[var(--bg-tertiary)]">
                            {user.name.charAt(0)}
                        </div>
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">{user.name}</h2>
                        <p className="text-sm text-[var(--text-secondary)]">{user.email}</p>
                        <div className="mt-4 inline-block px-4 py-1 rounded-full bg-purple-500/10 text-purple-500 text-sm font-bold border border-purple-500/20">
                            المدير العام
                        </div>
                    </div>

                    <div className="bg-[var(--bg-secondary)] p-6 rounded-3xl shadow-lg border border-[var(--border-primary)]">
                        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">إجراءات سريعة</h2>
                        <div className="space-y-3">
                            <button onClick={toggleFullscreen} className="w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] transition-all duration-200 group">
                                <div className="flex items-center gap-3">
                                    {isFullscreen ? <ArrowsShrinkIcon className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-purple-400" /> : <ArrowsExpandIcon className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-purple-400" />}
                                    <span className="font-semibold text-sm text-[var(--text-primary)]">{isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}</span>
                                </div>
                            </button>
                            <button onClick={() => setIsPasswordModalOpen(true)} className="w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] transition-all duration-200 group">
                                <div className="flex items-center gap-3">
                                    <KeyIcon className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-purple-400" />
                                    <span className="font-semibold text-sm text-[var(--text-primary)]">تغيير كلمة المرور</span>
                                </div>
                            </button>
                            <button onClick={onLogout} className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-500/5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200 group">
                                <div className="flex items-center gap-3">
                                    <LogoutIcon className="w-5 h-5 text-red-500" />
                                    <span className="font-bold text-sm text-red-500">تسجيل الخروج</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column - Appearance */}
                <div className="lg:col-span-2">
                    <AppearanceSettings />
                </div>
            </div>
            <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
        </div>
    );
};

export default AdminSettingsView;
