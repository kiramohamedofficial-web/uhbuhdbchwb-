
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    ArrowRightIcon,
    ChevronDownIcon,
    KeyIcon,
    UserIcon,
    EnvelopeIcon,
    ShieldCheckIcon,
    PhoneIcon,
    VolumeUpIcon,
    VolumeOffIcon,
    ChevronLeftIcon,
    ShieldExclamationIcon,
    GraduationCapIcon,
    InformationCircleIcon,
    CheckIcon,
    SparklesIcon,
    EyeIcon,
    EyeSlashIcon
} from '../common/Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllGrades, getUserIdByEmail, adminUpdateUserPassword } from '../../services/storageService';
import { useSession } from '../../hooks/useSession';
import { InteractiveSwarm } from '../common/InteractiveSwarm';
import { sendVerificationEmail } from '../../services/emailService';
import { useToast } from '../../useToast';
import { useRouter } from 'next/navigation';

const Navigate = ({ to, replace }: { to: string; replace?: boolean }) => {
    const router = useRouter();
    useEffect(() => {
        if (replace) router.replace(to);
        else router.push(to);
    }, [router, to, replace]);
    return null;
};
import { Role } from '../../types';
import Loader from '../common/Loader';
import { ToastType, Grade } from '../../types';
import { useIcons } from '../../IconContext';

interface AuthScreenProps {
    onBack: () => void;
    initialView?: 'login' | 'register';
    onLoginSuccess?: () => void;
    isAudioPlaying?: boolean;
    onToggleAudio?: () => void;
}

type AuthView = 'login' | 'register-step-1' | 'register-step-2' | 'register-verify' | 'reset-password' | 'reset-verify' | 'reset-new-password';

// --- Helper: generate auto email from phone ---
const generateAutoEmail = (phone: string): string => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `${cleanPhone}@gstudent.local`;
};

const isRealEmail = (email: string): boolean => {
    return !!email && email.trim() !== '' && !email.endsWith('@gstudent.local') && email.includes('@');
};

// --- Premium Matte Components ---

const MatteInput: React.FC<{
    name: string;
    type: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    icon: React.FC<{ className?: string }>;
    dir?: 'rtl' | 'ltr';
    optional?: boolean;
}> = React.memo(({ name, type, placeholder, value, onChange, icon: Icon, dir = 'rtl', optional = false }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    return (
        <div className="relative mb-5 group">
            <motion.div
                initial={false}
                animate={{
                    scale: isFocused ? 1.1 : 1,
                    color: isFocused ? '#8b5cf6' : '#9ca3af'
                }}
                className="absolute right-5 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
            >
                <Icon className="w-5 h-5" />
            </motion.div>
            <input
                name={name}
                type={isPassword ? (showPassword ? 'text' : 'password') : type}
                placeholder={optional ? `${placeholder} (اختياري)` : placeholder}
                value={value}
                onChange={onChange}
                dir={dir}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="w-full py-4.5 pr-14 pl-12 bg-[var(--bg-tertiary)]/40 backdrop-blur-xl text-[var(--text-primary)] font-bold text-sm rounded-2xl border-2 border-[var(--border-primary)] focus:border-violet-500/50 focus:bg-[var(--bg-secondary)]/80 outline-none transition-all duration-500 placeholder:text-[var(--text-secondary)]/40 shadow-sm hover:border-violet-400/30"
            />
            {isPassword && (
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-violet-400 transition-colors p-1"
                >
                    {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
            )}
            {optional && !isPassword && (
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-tighter text-violet-400/60 z-10 pointer-events-none">
                    Optional
                </span>
            )}
            <motion.div
                initial={false}
                animate={{
                    width: isFocused ? '100%' : '0%',
                    opacity: isFocused ? 1 : 0
                }}
                className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
            />
        </div>
    );
});

const AUTH_STATE_KEY = 'gstudent_auth_state_v1';

// --- Step Progress Indicator ---
const StepIndicator: React.FC<{ currentStep: number; totalSteps: number }> = React.memo(({ currentStep, totalSteps }) => (
    <div className="flex items-center justify-center gap-3 mb-10">
        {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className="flex items-center">
                <motion.div
                    animate={{
                        width: i === currentStep ? 40 : 12,
                        backgroundColor: i <= currentStep ? '#8b5cf6' : 'rgba(156, 163, 175, 0.2)'
                    }}
                    className="h-2 rounded-full relative overflow-hidden"
                >
                    {i === currentStep && (
                        <motion.div
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        />
                    )}
                </motion.div>
                {i < totalSteps - 1 && (
                    <div className={`w-4 h-0.5 mx-1 rounded-full transition-colors duration-500 ${i < currentStep ? 'bg-violet-500/50' : 'bg-gray-200/10'}`} />
                )}
            </div>
        ))}
    </div>
));

const AuthScreen: React.FC<AuthScreenProps> = ({ onBack, initialView = 'login', onLoginSuccess, isAudioPlaying, onToggleAudio }) => {
    const { currentUser, isLoading: isSessionLoading, handleLogin, handleRegister, authError, clearAuthError } = useSession();
    const { addToast } = useToast();
    const icons = useIcons();

    const [view, setView] = useState<AuthView>(initialView === 'register' ? 'register-step-1' : 'login');
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', guardianPhone: '', password: '', confirmPassword: '', grade: '', track: 'All', loginIdentifier: '' });
    const [verificationCode, setVerificationCode] = useState('');
    const [sentCode, setSentCode] = useState<string | null>(null);
    const [resetUserId, setResetUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [localError, setLocalError] = useState('');
    const [grades, setGrades] = useState<Grade[]>([]);
    const [animKey, setAnimKey] = useState(0);

    useEffect(() => {
        const saved = localStorage.getItem(AUTH_STATE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.view) setView(parsed.view);
                if (parsed.formData) setFormData(prev => ({ ...prev, ...parsed.formData }));
                if (parsed.verificationCode) setVerificationCode(parsed.verificationCode);
                if (parsed.sentCode) setSentCode(parsed.sentCode);
                if (parsed.resetUserId) setResetUserId(parsed.resetUserId);
            } catch (e) {
                console.error("Failed to load auth state", e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(AUTH_STATE_KEY, JSON.stringify({ view, formData, verificationCode, sentCode, resetUserId }));
    }, [view, formData, verificationCode, sentCode, resetUserId]);

    const clearAuthState = () => localStorage.removeItem(AUTH_STATE_KEY);

    useEffect(() => {
        getAllGrades().then(setGrades);
    }, []);

    const toggleView = useCallback((newView: AuthView) => {
        clearAuthError();
        setLocalError('');
        setAnimKey(prev => prev + 1);
        setView(newView);
        if (newView === 'login' || newView === 'register-step-1') {
            setSentCode(null);
            setVerificationCode('');
        }
    }, [clearAuthError]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Get current step number for indicator
    const getCurrentStep = (): number => {
        if (view === 'register-step-1') return 0;
        if (view === 'register-step-2') return 1;
        if (view === 'register-verify') return 2;
        return 0;
    };

    const handleNextStep = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');

        if (view === 'register-step-1') {
            // Name, phone, and password are required. Email is optional.
            if (!formData.name || !formData.phone || !formData.password) {
                setLocalError('الرجاء ملء الاسم ورقم الهاتف وكلمة المرور.'); return;
            }
            if (formData.password !== formData.confirmPassword) {
                setLocalError('كلمتا المرور غير متطابقتين.'); return;
            }
            if (formData.password.length < 6) {
                setLocalError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.'); return;
            }

            // Only check email uniqueness if a real email was provided
            if (isRealEmail(formData.email)) {
                setIsLoading(true);
                try {
                    const existingId = await getUserIdByEmail(formData.email.trim());
                    if (existingId) {
                        setLocalError('هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول بدلاً من إنشاء حساب جديد.');
                        setIsLoading(false);
                        return;
                    }
                } catch (err) {
                    console.warn("Pre-check failed, continuing...", err);
                }
                setIsLoading(false);
            }
            toggleView('register-step-2');
        } else if (view === 'register-step-2') {
            if (!formData.grade) {
                setLocalError('يجب اختيار الصف الدراسي للمتابعة.'); return;
            }

            // If real email provided → send verification code
            if (isRealEmail(formData.email)) {
                setIsLoading(true);
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                const success = await sendVerificationEmail(formData.email.trim(), formData.name, code);
                if (success) {
                    setSentCode(code);
                    toggleView('register-verify');
                    addToast('تم إرسال كود التحقق بنجاح.', ToastType.INFO);
                } else {
                    setLocalError('فشل إرسال كود التحقق، يرجى مراجعة البريد الإلكتروني.');
                }
                setIsLoading(false);
            } else {
                // No real email → skip verification, register directly
                setIsLoading(true);
                const autoEmail = generateAutoEmail(formData.phone);
                const gradeId = parseInt(formData.grade, 10);
                if (isNaN(gradeId)) {
                    setLocalError('حدث خطأ في اختيار الصف الدراسي. يرجى إعادة المحاولة.');
                    setIsLoading(false);
                    return;
                }
                const regData = {
                    ...formData,
                    email: autoEmail,
                    grade: gradeId,
                    phone: formData.phone.startsWith('+20') ? formData.phone : `+20${formData.phone.replace(/^0/, '')}`,
                    guardianPhone: formData.guardianPhone ? (formData.guardianPhone.startsWith('+20') ? formData.guardianPhone : `+20${formData.guardianPhone.replace(/^0/, '')}`) : ''
                };
                const { success, error } = await handleRegister(regData, null);
                if (success && onLoginSuccess) {
                    clearAuthState();
                    onLoginSuccess();
                } else if (error) {
                    if (error.includes('already registered')) {
                        setLocalError('الحساب مسجل بالفعل! يرجى تسجيل الدخول.');
                        setTimeout(() => toggleView('login'), 2000);
                    } else setLocalError(error);
                }
                setIsLoading(false);
            }
        } else if (view === 'reset-password') {
            if (!formData.email) {
                setLocalError('الرجاء إدخال البريد الإلكتروني.'); return;
            }
            setIsLoading(true);
            const safeEmail = formData.email.trim();
            const userId = await getUserIdByEmail(safeEmail);
            if (!userId) {
                setLocalError('لا يوجد حساب مسجل بهذا البريد الإلكتروني.');
                setIsLoading(false);
                return;
            }
            setResetUserId(userId);
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const success = await sendVerificationEmail(safeEmail, "المستخدم", code);
            if (success) {
                setSentCode(code);
                toggleView('reset-verify');
                addToast('تم إرسال كود استعادة كلمة المرور.', ToastType.INFO);
            } else {
                setLocalError('فشل إرسال الكود. تأكد من صحة البريد الإلكتروني.');
            }
            setIsLoading(false);
        } else if (view === 'reset-verify') {
            if (verificationCode !== sentCode) {
                setLocalError('كود التحقق غير صحيح.');
                return;
            }
            toggleView('reset-new-password');
        }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');
        setIsLoading(true);

        if (view === 'login') {
            // Login with phone number or email
            const identifier = formData.phone.trim();
            const isEmail = identifier.includes('@');
            const loginIdentifier = isEmail ? identifier : (identifier.startsWith('+20') ? identifier : `+20${identifier.replace(/^0/, '')}`);

            const { success, error } = await handleLogin(loginIdentifier, formData.password);
            if (success && onLoginSuccess) {
                clearAuthState();
                onLoginSuccess();
            }
            else if (error) setLocalError(error);
        } else if (view === 'register-verify') {
            if (verificationCode !== sentCode) {
                setLocalError('كود التحقق غير صحيح.');
                setIsLoading(false);
                return;
            }
            const gradeId = parseInt(formData.grade, 10);
            if (isNaN(gradeId)) {
                setLocalError('حدث خطأ في اختيار الصف الدراسي. يرجى إعادة المحاولة.');
                setIsLoading(false);
                return;
            }
            const regData = {
                ...formData,
                email: formData.email.trim(),
                grade: gradeId,
                phone: formData.phone.startsWith('+20') ? formData.phone : `+20${formData.phone.replace(/^0/, '')}`,
                guardianPhone: formData.guardianPhone ? (formData.guardianPhone.startsWith('+20') ? formData.guardianPhone : `+20${formData.guardianPhone.replace(/^0/, '')}`) : ''
            };
            const { success, error } = await handleRegister(regData, null);
            if (success && onLoginSuccess) {
                clearAuthState();
                onLoginSuccess();
            } else if (error) {
                if (error.includes('already registered')) {
                    setLocalError('الحساب مسجل بالفعل! يرجى تسجيل الدخول.');
                    setTimeout(() => toggleView('login'), 2000);
                } else setLocalError(error);
            }
        } else if (view === 'reset-new-password') {
            if (formData.password.length < 6) {
                setLocalError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
                setIsLoading(false);
                return;
            }
            if (!resetUserId) {
                setLocalError('معرف المستخدم غير موجود.');
                setIsLoading(false);
                return;
            }
            const { error } = await adminUpdateUserPassword(resetUserId, formData.password);
            if (error) {
                setLocalError(error.message.includes('permission denied') ? 'غير مصرح بهذا الإجراء.' : error.message);
            } else {
                addToast('تم التحديث بنجاح.', ToastType.SUCCESS);
                clearAuthState();
                toggleView('login');
            }
        }
        setIsLoading(false);
    };

    if (isSessionLoading) return <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-primary)]"><Loader /></div>;
    if (currentUser) {
        const path = currentUser.role === Role.ADMIN ? "/admin" : (currentUser.role === Role.TEACHER || currentUser.role === Role.SUPERVISOR ? "/teacher" : "/student");
        return <Navigate to={path} replace />;
    }

    const getTitle = () => {
        if (view === 'login') return 'أهلاً بك مجدداً';
        if (view.startsWith('register')) return 'أنشئ حسابك';
        return 'استعادة الوصول';
    };

    const getSubtitle = () => {
        if (view === 'login') return 'ادخل برقم هاتفك أو بريدك الإلكتروني';
        if (view === 'register-step-1') return 'أدخل بياناتك الأساسية للبدء';
        if (view === 'register-step-2') return 'اختر صفك الدراسي';
        if (view === 'register-verify') return 'أدخل الكود المرسل لبريدك';
        if (view === 'reset-password') return 'أدخل بريدك لاستعادة كلمة المرور';
        if (view === 'reset-verify') return 'أدخل كود التحقق';
        if (view === 'reset-new-password') return 'أدخل كلمة المرور الجديدة';
        return '';
    };

    return (
        <div className="relative min-h-screen flex font-tajawal overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <InteractiveSwarm />

            {/* ===== LEFT BRANDING PANEL (Desktop Only) ===== */}
            <div className="hidden lg:flex flex-col justify-between w-[45%] xl:w-[40%] relative overflow-hidden p-14 shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-indigo-950 to-purple-950" />
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '28px 28px' }} />
                <div className="absolute -top-40 -left-20 w-80 h-80 bg-violet-600/30 rounded-full blur-[80px]" />
                <div className="absolute -bottom-20 right-20 w-60 h-60 bg-pink-600/20 rounded-full blur-[60px]" />

                <button onClick={onBack} className="relative z-10 flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 w-fit text-sm font-bold">
                    <ArrowRightIcon className="w-4 h-4" />
                    <span>الرئيسية</span>
                </button>

                <div className="relative z-10 space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl p-2.5">
                            <img src={icons.mainLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h2 className="font-black text-xl text-white tracking-tight">منصة المتفوقين</h2>
                            <p className="text-violet-300/70 text-xs font-bold uppercase tracking-widest">G-STUDENT PLATFORM</p>
                        </div>
                    </div>
                    <div>
                        <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-4">
                            ابدأ رحلة<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-pink-400">تعليمك الآن</span>
                        </h1>
                        <p className="text-white/50 text-lg font-bold leading-relaxed">منصة تعليمية متكاملة لدعم الطالب في كل خطوة نحو التفوق.</p>
                    </div>
                    <div className="space-y-3">
                        {[
                            { icon: '🎓', label: 'حصص HD تفاعلية مع أفضل المعلمين' },
                            { icon: '🤖', label: 'مساعد ذكي للإجابة عن أسئلتك فوراً' },
                            { icon: '📈', label: 'تتبع تقدمك ونتائجك الدراسية' },
                            { icon: '🛡️', label: 'بيانات آمنة ومحمية 100%' },
                        ].map((f, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                <span className="text-xl">{f.icon}</span>
                                <span className="text-white/70 font-bold text-sm">{f.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <p className="relative z-10 text-white/30 text-xs font-bold">© {new Date().getFullYear()} G-Student. All rights reserved.</p>
            </div>

            {/* ===== RIGHT FORM PANEL ===== */}
            <div className="flex-1 flex flex-col items-center justify-center p-5 md:p-10 overflow-y-auto relative">
                {/* Mobile top bar */}
                <div className="lg:hidden fixed top-4 left-0 right-0 px-5 flex justify-between items-center z-50">
                    <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-sm font-black hover:bg-[var(--accent-primary)] hover:text-white transition-all active:scale-95">
                        <ArrowRightIcon className="w-4 h-4" />
                        <span>رجوع</span>
                    </button>
                    {onToggleAudio && (
                        <button onClick={onToggleAudio} title={isAudioPlaying ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى'} className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border-primary)] transition-all ${isAudioPlaying ? 'text-violet-500' : 'text-[var(--text-secondary)]'}`}>
                            {isAudioPlaying ? <VolumeUpIcon className="w-5 h-5" /> : <VolumeOffIcon className="w-5 h-5" />}
                        </button>
                    )}
                </div>

                {/* Form Card */}
                <div className="w-full max-w-md mt-16 lg:mt-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={view}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -16 }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                        >
                            {/* Header */}
                            <div className="text-center mb-10">
                                <div className="lg:hidden inline-block relative mb-5">
                                    <motion.div
                                        whileHover={{ rotate: 5, scale: 1.05 }}
                                        className="w-20 h-20 rounded-[1.75rem] bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-2xl p-4 border border-violet-400/30"
                                    >
                                        <img src={view === 'login' ? (icons.authLoginIconUrl || icons.mainLogoUrl) : (icons.authRegisterIconUrl || icons.mainLogoUrl)} alt="Logo" className="w-full h-full object-contain" />
                                    </motion.div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-xl border-2 border-[var(--bg-primary)] flex items-center justify-center">
                                        <ShieldCheckIcon className="w-3 h-3 text-white" />
                                    </div>
                                </div>
                                {view.startsWith('register') && (
                                    <StepIndicator currentStep={getCurrentStep()} totalSteps={isRealEmail(formData.email) ? 3 : 2} />
                                )}
                                <h1 className="text-3xl lg:text-4xl font-black tracking-tight gradient-text mb-2">{getTitle()}</h1>
                                <p className="text-[var(--text-secondary)] font-bold text-base opacity-80">{getSubtitle()}</p>
                            </div>

                            {/* Form */}
                            <form onSubmit={(view === 'register-step-1' || view === 'register-step-2' || view === 'reset-password' || view === 'reset-verify') ? handleNextStep : onSubmit} className="space-y-1">
                                {view === 'login' && (
                                    <div key={`login-${animKey}`} className="space-y-1">
                                        <MatteInput name="phone" type="text" placeholder="رقم الهاتف أو البريد الإلكتروني" value={formData.phone} onChange={handleChange} icon={UserIcon} dir="ltr" />
                                        <MatteInput name="password" type="password" placeholder="كلمة المرور" value={formData.password} onChange={handleChange} icon={KeyIcon} />
                                        <div className="flex justify-end pb-2 mt-1">
                                            <button type="button" onClick={() => toggleView('reset-password')} className="text-sm font-black text-violet-400 hover:text-violet-300 transition-colors bg-violet-500/10 hover:bg-violet-500/20 px-4 py-2 rounded-xl">هل نسيت كلمة المرور؟</button>
                                        </div>
                                    </div>
                                )}
                                {view === 'register-step-1' && (
                                    <div key={`reg1-${animKey}`} className="space-y-0">
                                        <MatteInput name="name" type="text" placeholder="الاسم الرباعي كاملاً" value={formData.name} onChange={handleChange} icon={UserIcon} />
                                        <div className="grid grid-cols-2 gap-3">
                                            <MatteInput name="phone" type="tel" placeholder="رقم هاتفك" value={formData.phone} onChange={handleChange} icon={PhoneIcon} dir="ltr" />
                                            <MatteInput name="guardianPhone" type="tel" placeholder="ولي الأمر" value={formData.guardianPhone} onChange={handleChange} icon={ShieldCheckIcon} dir="ltr" />
                                        </div>
                                        <MatteInput name="password" type="password" placeholder="كلمة مرور قوية (6 أحرف+)" value={formData.password} onChange={handleChange} icon={KeyIcon} />
                                        <MatteInput name="confirmPassword" type="password" placeholder="أعد كتابتها للتأكيد" value={formData.confirmPassword} onChange={handleChange} icon={KeyIcon} />
                                        <div className="mt-2 pt-3 border-t border-[var(--border-primary)]">
                                            <MatteInput name="email" type="email" placeholder="البريد الإلكتروني" value={formData.email} onChange={handleChange} icon={EnvelopeIcon} optional={true} />
                                            <p className="text-sm text-violet-300 -mt-3 mr-2 font-bold flex items-center gap-1">
                                                <InformationCircleIcon className="w-3 h-3 inline-block" />
                                                <span>اختياري - للتحقق وحماية حسابك</span>
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {view === 'register-step-2' && (
                                    <div key={`reg2-${animKey}`} className="py-3">
                                        <label className="block text-sm font-black text-violet-400 uppercase tracking-widest mb-3 mr-2">الصف الدراسي حالياً</label>
                                        <div className="relative mb-6">
                                            <select name="grade" value={formData.grade} onChange={handleChange} aria-label="اختيار الصف الدراسي" title="اختيار الصف الدراسي" className="w-full py-4 pr-14 pl-6 bg-[var(--bg-tertiary)]/80 backdrop-blur-md border-2 border-[var(--border-primary)] rounded-2xl font-black text-[var(--text-primary)] outline-none focus:border-violet-500 appearance-none shadow-sm text-sm transition-all duration-300">
                                                <option value="">اختر من القائمة...</option>
                                                {grades.map(g => <option key={g.id} value={g.id} className="bg-[var(--bg-secondary)]">{g.name}</option>)}
                                            </select>
                                            <GraduationCapIcon className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                                            <ChevronDownIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                                        </div>
                                        <div className="p-4 bg-[var(--bg-tertiary)]/50 backdrop-blur-md border border-violet-500/20 rounded-2xl flex items-start gap-3">
                                            <SparklesIcon className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                                            <p className="text-sm font-bold text-[var(--text-primary)] leading-relaxed">
                                                {isRealEmail(formData.email) ? 'باقي خطوة! سنرسل كود تحقق لبريدك.' : 'هذه آخر خطوة! اضغط استمرار لإنشاء حسابك.'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {(view === 'register-verify' || view === 'reset-verify') && (
                                    <div key={`verify-${animKey}`} className="text-center space-y-6 py-3">
                                        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl">
                                            <p className="text-sm font-black text-emerald-400">تحقق من بريدك الآن! الرمز في الطريق.</p>
                                        </div>
                                        <input type="text" maxLength={6} value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))} className="w-full py-7 text-center text-4xl font-black tracking-[0.5em] rounded-2xl bg-[var(--bg-tertiary)]/80 border-2 border-[var(--border-primary)] focus:border-violet-500 outline-none transition-all duration-300 shadow-sm text-[var(--text-primary)]" placeholder="------" dir="ltr" />
                                        <button type="button" onClick={() => view === 'register-verify' ? setView('register-step-2') : setView('reset-password')} className="text-sm font-black text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 px-6 py-3 rounded-xl transition-all">مشكلة في الكود؟ أرسل مجدداً</button>
                                    </div>
                                )}
                                {view === 'reset-password' && (
                                    <div key={`reset-${animKey}`} className="space-y-5">
                                        <p className="text-sm font-bold text-[var(--text-primary)] text-center">أدخل بريدك الإلكتروني المرتبط وسنرسل لك كود الاسترداد.</p>
                                        <MatteInput name="email" type="email" placeholder="بريدك الإلكتروني" value={formData.email} onChange={handleChange} icon={EnvelopeIcon} />
                                    </div>
                                )}
                                {view === 'reset-new-password' && (
                                    <div key={`newpw-${animKey}`} className="space-y-5">
                                        <p className="text-sm font-black text-emerald-400 text-center">الكود صحيح! ضع كلمة سر جديدة.</p>
                                        <MatteInput name="password" type="password" placeholder="كلمة السر الجديدة" value={formData.password} onChange={handleChange} icon={KeyIcon} />
                                    </div>
                                )}

                                {/* Submit Button */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    type="submit"
                                    disabled={isLoading}
                                    className="group w-full py-5 mt-8 bg-gradient-to-br from-violet-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 text-white font-black text-lg rounded-2xl shadow-[0_20px_40px_-10px_rgba(79,70,229,0.5)] transition-all duration-500 disabled:opacity-50 overflow-hidden relative"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                    <div className="flex items-center justify-center gap-3 relative z-10">
                                        {isLoading ? (
                                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <span>{view === 'login' ? 'دخول الآن' : (view === 'register-step-1' || view === 'register-step-2') ? 'التالي ←' : 'تأكيد'}</span>
                                        )}
                                    </div>
                                </motion.button>

                                {/* Footer Nav */}
                                {(view === 'login' || view === 'register-step-1') && (
                                    <div className="mt-8 pt-6 border-t border-[var(--border-primary)]/30 text-center">
                                        <p className="text-sm font-bold text-[var(--text-secondary)]/60 mb-2">
                                            {view === 'login' ? 'طالب جديد؟' : 'لديك حساب بالفعل؟'}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => toggleView(view === 'login' ? 'register-step-1' : 'login')}
                                            className="text-violet-500 hover:text-violet-400 font-black text-base transition-all bg-violet-500/5 hover:bg-violet-500/10 border border-violet-500/10 px-6 py-2.5 rounded-2xl w-full"
                                        >
                                            {view === 'login' ? '✨ إنشاء حساب جديد' : 'تسجيل الدخول'}
                                        </button>
                                    </div>
                                )}
                                {(view === 'reset-password' || view === 'reset-verify' || view === 'reset-new-password') && (
                                    <div className="mt-8 pt-6 border-t border-[var(--border-primary)]/30 text-center">
                                        <button
                                            type="button"
                                            onClick={() => toggleView('login')}
                                            className="text-violet-500 hover:text-violet-400 font-black text-base transition-all bg-violet-500/5 hover:bg-violet-500/10 border border-violet-500/10 px-6 py-2.5 rounded-2xl w-full"
                                        >
                                            العودة لتسجيل الدخول
                                        </button>
                                    </div>
                                )}

                                {/* Error Banner */}
                                <AnimatePresence>
                                    {(localError || authError) && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-400"
                                        >
                                            <ShieldExclamationIcon className="w-5 h-5 shrink-0" />
                                            <p className="text-sm font-bold leading-relaxed">{localError || authError}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </form>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;


