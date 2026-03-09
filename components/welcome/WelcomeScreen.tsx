import React, { useState, useEffect, memo } from 'react';
import { useRouter } from 'next/navigation';

const Navigate = ({ to, replace }: { to: string; replace?: boolean }) => {
    const router = useRouter();
    useEffect(() => {
        if (replace) router.replace(to);
        else router.push(to);
    }, [router, to, replace]);
    return null;
};
import { useSession } from '../../hooks/useSession';
import { Role } from '../../types';
import Loader from '../common/Loader';
import { getPlatformSettings } from '../../services/storageService';
import { PlatformSettings } from '../../types';
import { ArrowRightIcon, MenuIcon, SparklesIcon, SunIcon, MoonIcon, CheckCircleIcon, ChartBarIcon, VideoCameraIcon, BrainIcon, XIcon, UserIcon, UserCircleIcon, TicketIcon, InformationCircleIcon, PlayIcon, PlaySolidIcon, ChevronLeftIcon, ChevronRightIcon, QuestionMarkCircleIcon, CodeIcon, LayoutIcon, PhoneIcon, YoutubeIcon, FacebookIcon, InstagramIcon, WhatsAppIcon, ArrowLeftIcon, MegaphoneIcon, StarIcon, TemplateIcon } from '../common/Icons';
import { useAppearance } from '../../AppContext';
import { CosmicBackground } from '../common/CosmicBackground';
import { useIcons } from '../../IconContext';
import Footer from '../layout/Footer';

interface WelcomeScreenProps {
    onNavigateToLogin: () => void;
    onNavigateToRegister: () => void;
    onPlayAudio: () => void;
}

// --- Mobile Nav ---
const MobileNav: React.FC<{ isOpen: boolean; onClose: () => void; onNavigateToLogin: () => void; onNavigateToRegister: () => void }> = React.memo(({ isOpen, onClose, onNavigateToLogin, onNavigateToRegister }) => {
    const icons = useIcons();
    if (!isOpen) return null;
    const handleNavigate = (action: () => void) => { action(); onClose(); };

    return (
        <div className="md:hidden fixed inset-0 z-[100]" role="dialog" aria-modal="true" onClick={onClose}>
            <div className="fixed inset-0 bg-black/80 animate-fade-in backdrop-blur-xl"></div>
            <div
                className={`fixed top-0 right-0 h-full w-[85%] max-w-[320px] flex flex-col animate-slide-in-right shadow-2xl border-l border-[var(--border-primary)] bg-[var(--bg-secondary)]/95 backdrop-blur-2xl`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 flex justify-between items-center border-b border-[var(--border-primary)]">
                    <h2 className="text-xl font-black text-[var(--text-primary)]">القائمة</h2>
                    <button onClick={onClose} className="p-2 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                    <button onClick={() => handleNavigate(onNavigateToLogin)} className="w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] font-bold active:scale-95 transition-transform">
                        <span>تسجيل الدخول</span>
                        <div className="bg-[var(--bg-secondary)] p-2 rounded-full">
                            {icons.authLoginIconUrl ? <img src={icons.authLoginIconUrl} className="w-5 h-5 object-contain" alt="Login" /> : <UserCircleIcon className="w-5 h-5" />}
                        </div>
                    </button>

                    <button onClick={() => handleNavigate(onNavigateToRegister)} className="w-full flex items-center justify-between p-4 rounded-2xl bg-blue-600 text-white font-bold shadow-lg active:scale-95 transition-transform hover:bg-blue-700">
                        <span>إنشاء حساب جديد</span>
                        <div className="bg-white/20 p-2 rounded-full text-[#FFD700]">
                            {icons.authRegisterIconUrl ? <img src={icons.authRegisterIconUrl} className="w-5 h-5 object-contain" alt="Register" /> : <SparklesIcon className="w-4 h-4 text-[#FFD700]" />}
                        </div>
                    </button>

                    <div className="border-t border-[var(--border-primary)] my-6"></div>

                    <div className="text-center">
                        <p className="text-[var(--text-secondary)] text-sm mb-4">اختر المظهر</p>
                        <ThemeSwitcher />
                    </div>
                </div>
            </div>
        </div>
    );
});

const ThemeSwitcher: React.FC = React.memo(() => {
    const { mode, setMode } = useAppearance();

    return (
        <div className={`flex items-center justify-center gap-1 p-1.5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] w-fit mx-auto`}>
            <button
                onClick={() => setMode('light')}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${mode === 'light' ? 'bg-white text-yellow-500 shadow-sm' : 'text-[var(--text-secondary)]'}`}
            >
                <SunIcon className="w-5 h-5" />
            </button>
            <button
                onClick={() => setMode('dark')}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${mode === 'dark' ? 'bg-slate-700 text-blue-400 shadow-sm' : 'text-[var(--text-secondary)]'}`}
            >
                <MoonIcon className="w-5 h-5" />
            </button>
        </div>
    );
});

const Header: React.FC<{ onNavigateToLogin: () => void; onNavigateToRegister: () => void; onOpenNav: () => void; settings: PlatformSettings; }> = React.memo(({ onNavigateToLogin, onNavigateToRegister, onOpenNav, settings }) => {
    const icons = useIcons();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const isScrolled = window.scrollY > 20;
            if (isScrolled !== scrolled) {
                setScrolled(isScrolled);
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [scrolled]);

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'py-2' : 'py-4 md:py-6'}`}>
            <div className="container mx-auto max-w-7xl px-4 md:px-6">
                <div className={`flex justify-between items-center px-4 md:px-6 py-3 rounded-full transition-all duration-300 ${scrolled ? 'bg-[var(--bg-secondary)]/90 backdrop-blur-2xl border border-[var(--border-primary)] shadow-2xl' : 'bg-transparent'}`}>
                    <div className="flex items-center gap-3">
                        <img src={icons.mainLogoUrl} alt="Logo" className="w-12 h-12 object-contain drop-shadow-sm" />
                        <span className="font-black text-xl md:text-2xl hidden sm:block text-[var(--text-primary)] tracking-tight">{settings.platformName}</span>
                    </div>

                    <div className="hidden md:flex items-center gap-3">
                        <ThemeSwitcher />
                        <div className="w-px h-6 bg-[var(--border-primary)] mx-2"></div>

                        <button
                            onClick={onNavigateToLogin}
                            className="group flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all border border-transparent hover:border-[var(--border-primary)]"
                        >
                            <span>دخول</span>
                            <div className="w-6 h-6 rounded-full bg-[var(--bg-tertiary)] group-hover:bg-[var(--bg-secondary)] flex items-center justify-center transition-colors">
                                {icons.authLoginIconUrl ? <img src={icons.authLoginIconUrl} className="w-4 h-4 object-contain" alt="Login" /> : <UserCircleIcon className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-blue-600" />}
                            </div>
                        </button>

                        <button
                            onClick={onNavigateToRegister}
                            className={`px-6 py-2.5 text-sm font-bold text-white rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-lg relative overflow-hidden group bg-blue-600 hover:bg-blue-700`}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <span>حساب جديد</span>
                                {icons.authRegisterIconUrl ? <img src={icons.authRegisterIconUrl} className="w-4 h-4 object-contain" alt="Register" /> : <SparklesIcon className="w-4 h-4 text-[#FFD700]" />}
                            </span>
                        </button>
                    </div>

                    <div className="md:hidden flex items-center gap-3">
                        <button onClick={onOpenNav} className={`p-2.5 rounded-full text-[var(--text-primary)] bg-[var(--bg-tertiary)]/50 backdrop-blur-md border border-[var(--border-primary)]`}><MenuIcon className="w-6 h-6" /></button>
                    </div>
                </div>
            </div>
        </header>
    );
});

const HeroSection: React.FC<{ onNavigateToLogin: () => void; onNavigateToRegister: () => void; onPlayAudio: () => void; settings: PlatformSettings; }> = React.memo(({ onNavigateToLogin, onNavigateToRegister, onPlayAudio, settings }) => {

    // Helper to render subtitle with the results icon injected
    const renderSubtitleWithIcon = (text: string) => {
        const keyword = "النتائج";
        if (!text.includes(keyword)) return text;
        const parts = text.split(keyword);
        return (
            <>
                {parts[0]}
                <span className="inline-flex items-center gap-2 relative group/res-icon">
                    <span className="text-blue-600 font-black">{keyword}</span>
                    <img
                        src="https://l.top4top.io/p_3680i61om1.png"
                        alt="Results Icon"
                        className="w-10 h-10 md:w-16 md:h-16 object-contain inline-block animate-drop-in"
                        style={{ animationDelay: '0.6s' }}
                    />
                </span>
                {parts[1]}
            </>
        );
    };

    return (
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-32 pb-20 overflow-hidden">
            <div className="container mx-auto px-6 relative z-10 flex flex-col items-center text-center">

                <div className="flex flex-col items-center mb-10 relative z-10 w-full max-w-6xl overflow-visible">
                    <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black leading-[1.05] tracking-tighter drop-shadow-2xl flex flex-col items-center gap-4">
                        {/* Title Part 1 */}
                        <span className="text-blue-600 relative animate-slide-up">
                            {settings.heroTitle || "رحلة التفوق"}
                            {/* Top Right Floating Icon - Dropping In */}
                            <img
                                src="https://a.top4top.io/p_3680v9ez92.png"
                                alt="Top Right Icon"
                                className="absolute -top-10 -right-10 md:-top-16 md:-right-16 w-14 h-14 md:w-24 md:h-24 object-contain animate-drop-in pointer-events-none z-10"
                                style={{ animationDelay: '0.8s' }}
                            />
                            {/* Bottom Left Floating Icon - Dropping In */}
                            <img
                                src="https://c.top4top.io/p_3680s35lo4.png"
                                alt="Bottom Left Icon"
                                className="absolute -bottom-10 -left-10 md:-bottom-16 md:-left-16 w-14 h-14 md:w-24 md:h-24 object-contain animate-drop-in pointer-events-none z-10"
                                style={{ animationDelay: '1s' }}
                            />
                        </span>
                        {/* Title Part 2 */}
                        <span className="text-[#FFD700] relative animate-slide-up" style={{ animationDelay: '0.2s' }}>
                            {settings.heroSubtitle && settings.heroSubtitle.includes('\n') ? settings.heroSubtitle.split('\n')[0] : "تبدأ من هنا"}
                            <div className="absolute -bottom-4 left-0 right-0 h-1.5 md:h-3 bg-blue-600/30 rounded-full blur-sm -rotate-1"></div>
                        </span>
                    </h1>
                </div>

                {/* Subtitle with Pop-in Results Icon */}
                <p className="text-lg md:text-2xl text-[var(--text-secondary)] mb-12 max-w-3xl mx-auto leading-[1.8] font-semibold opacity-90 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    {renderSubtitleWithIcon(settings.heroSubtitle || "محتوى تعليمي احترافي لطلاب المرحلة الإعدادية والثانوية. نقدّم شرحًا مبسّطًا للمناهج مع اختبارات تفاعلية تساعد الطلاب على الفهم والتدريب الذكي. هدفنا هو دعم الطلاب بأفضل أدوات التعليم الرقمي، لمساعدتهم على التفوق بثقة وتحقيق أعلى النتائج.")}
                </p>

                {/* Action Buttons: Entrance with Delay & Direction */}
                <div className="flex flex-col items-center gap-6 z-20 relative w-full">
                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-lg">
                        {/* Register: Enter from Left */}
                        <div className="flex-1 animate-enter-left" style={{ animationDelay: '0.4s' }}>
                            <button
                                onClick={onNavigateToRegister}
                                className="w-full px-8 py-5 font-black text-xl text-white bg-blue-600 hover:bg-blue-700 rounded-[1.5rem] shadow-xl shadow-blue-600/20 transition-all duration-300 transform hover:scale-[1.03] active:scale-95 flex items-center justify-center gap-3 border-b-4 border-blue-800"
                            >
                                <span>{settings.heroButtonText || "إنشاء حساب"}</span>
                                <span className="animate-drop-in" style={{ animationDelay: '1.2s' }}>
                                    <SparklesIcon className="w-6 h-6 text-[#FFD700]" />
                                </span>
                            </button>
                        </div>

                        {/* Login: Enter from Right (Slow) */}
                        <div className="flex-1 animate-enter-right" style={{ animationDelay: '0.4s' }}>
                            <button
                                onClick={onNavigateToLogin}
                                className="w-full px-8 py-5 font-black text-xl text-[var(--text-primary)] bg-[var(--bg-secondary)] border-2 border-[var(--border-primary)] hover:border-blue-500/50 rounded-[1.5rem] shadow-lg transition-all duration-300 transform hover:scale-[1.03] active:scale-95 flex items-center justify-center gap-3 border-b-4 border-[var(--border-primary)]"
                            >
                                <span>تسجيل دخول</span>
                                <span className="animate-drop-in" style={{ animationDelay: '1.4s' }}>
                                    <UserIcon className="w-6 h-6 text-blue-600" />
                                </span>
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            onPlayAudio();
                            document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="flex items-center gap-2 px-6 py-3 mt-2 text-sm font-bold text-[var(--text-secondary)] bg-[var(--bg-secondary)]/30 backdrop-blur-md border border-[var(--border-primary)] rounded-full hover:bg-[var(--bg-secondary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] transition-all shadow-sm animate-fade-in"
                        style={{ animationDelay: '1.5s' }}
                    >
                        <InformationCircleIcon className="w-5 h-5" />
                        <span>تعليمات المنصة</span>
                    </button>
                </div>
            </div>
        </section>
    );
});

// --- Marquee Feature Card Component (Landscape) ---
const LandscapeFeatureCard: React.FC<{
    title: string;
    icon: React.FC<any>;
    description: string;
    color: string;
    iconUrl?: string;
}> = memo(({ title, icon: Icon, description, color, iconUrl }) => {
    const [imgError, setImgError] = useState(false);

    useEffect(() => { setImgError(false); }, [iconUrl]);

    return (
        <div className={`
            flex-shrink-0 w-[300px] md:w-[350px] p-4 mx-3 rounded-2xl
            bg-[var(--bg-secondary)] 
            border-2 border-black
            shadow-[5px_5px_0px_0px_#FCD34D]
            hover:shadow-[2px_2px_0px_0px_#FCD34D] hover:translate-y-[3px] hover:translate-x-[3px]
            transition-all duration-200
            relative overflow-hidden group flex items-center gap-4
        `}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>

            <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-black bg-white shadow-sm z-10`}>
                {iconUrl && !imgError ? (
                    <img
                        src={iconUrl}
                        alt={title}
                        className="w-10 h-10 object-contain"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <Icon className={`w-8 h-8 ${color}`} />
                )}
            </div>

            <div className="flex-1 text-right z-10">
                <h3 className="text-sm font-black text-[var(--text-primary)] mb-1 group-hover:text-[var(--accent-primary)] transition-colors">{title}</h3>
                <p className="text-sm font-bold text-[var(--text-secondary)] opacity-80 leading-relaxed line-clamp-2">{description}</p>
            </div>
        </div>
    );
});

// UPDATED: 3D Look for Photo Card
const PhotoCard: React.FC<{ imageUrl: string; label: string }> = memo(({ imageUrl, label }) => (
    <div className="flex-shrink-0 w-[250px] h-[180px] mx-3 rounded-2xl overflow-hidden relative group border-2 border-black shadow-[5px_5px_0px_0px_#FCD34D] hover:shadow-[2px_2px_0px_0px_#FCD34D] hover:translate-y-[3px] hover:translate-x-[3px] transition-all duration-200">
        <img src={imageUrl} alt={label} className="w-full h-full object-cover" onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/250x180?text=No+Image'} />
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>
        <div className="absolute bottom-3 right-3 bg-white px-3 py-1 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_black]">
            <span className="text-black text-sm font-black">{label}</span>
        </div>
    </div>
));

// --- Optimized CSS-only MarqueeBoard ---
const MarqueeBoard: React.FC<{
    items: any[];
    renderItem: (item: any, index: number | string) => React.ReactNode;
    speed?: number;
    title?: string;
    direction?: 'left' | 'right'; // 'left' means moving TO left (standard)
}> = memo(({ items, renderItem, speed = 40, title, direction = 'left' }) => {

    // Determine CSS class based on intended visual direction
    const animationClass = direction === 'left' ? 'scroll-track-left' : 'scroll-track-right';

    return (
        <section className="py-4 relative group/board" dir="ltr">
            {title && (
                <div className="container mx-auto px-6 mb-6 text-center" dir="rtl">
                    <h2 className="text-2xl font-black text-[var(--text-primary)]">{title}</h2>
                </div>
            )}

            <div className="w-full relative overflow-x-auto no-scrollbar">
                <div
                    className={`flex w-max ${animationClass} hover:[animation-play-state:paused]`}
                    style={{ animationDuration: `${speed}s` }}
                >
                    {/* First Set */}
                    <div className="flex">
                        {items.map((item, idx) => renderItem(item, idx))}
                    </div>
                    {/* Duplicate Set for Infinite Loop */}
                    <div className="flex">
                        {items.map((item, idx) => renderItem(item, `dup-${idx}`))}
                    </div>
                </div>
            </div>
        </section>
    );
});

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNavigateToLogin, onNavigateToRegister, onPlayAudio }) => {
    const { currentUser, isLoading } = useSession();
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [settings, setSettings] = useState<PlatformSettings | null>(null);
    const icons = useIcons();

    useEffect(() => {
        getPlatformSettings().then(setSettings);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            document.documentElement.classList.add('lights-on');
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    const features = [
        { title: "المعلم الذكي (AI)", desc: "مساعد شخصي يعمل بالذكاء الاصطناعي للإجابة على أسئلتك فوراً.", icon: BrainIcon, color: "text-purple-500", iconUrl: icons.welcomeFeatureAiIconUrl },
        { title: "سينما تعليمية", desc: "تعلم من خلال أفلام وثائقية وكارتون تعليمي ممتع.", icon: VideoCameraIcon, color: "text-red-500", iconUrl: icons.welcomeFeatureCinemaIconUrl },
        { title: "إحصائيات دقيقة", desc: "لوحة تحكم شاملة لمتابعة تقدمك ودرجاتك في كل مادة.", icon: ChartBarIcon, color: "text-blue-500", iconUrl: icons.welcomeFeatureStatsIconUrl },
        { title: "بنك الأسئلة", desc: "آلاف الأسئلة المتدرجة الصعوبة للتدريب المستمر.", icon: TemplateIcon, color: "text-emerald-500" },
        { title: "نظام المكافآت", desc: "اجمع النقاط واحصل على جوائز قيمة عند التفوق.", icon: TicketIcon, color: "text-amber-500" },
        { title: "فيديوهات 4K", desc: "جودة عرض فائقة الوضوح لتجربة مشاهدة ممتعة.", icon: VideoCameraIcon, color: "text-pink-500", iconUrl: icons.welcomeFeaturePlayerIconUrl },
        { title: "دعم فني مباشر", desc: "فريق دعم متواجد على مدار الساعة لحل مشاكلك.", icon: PhoneIcon, color: "text-cyan-500", iconUrl: icons.welcomeStatSupportIconUrl }
    ];

    // Splitting features for dual-direction marquee
    const featuresRow1 = features.slice(0, 4);
    const featuresRow2 = features.slice(4);

    const defaultGallery = [
        { url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=500&q=60", label: "مجتمع طلابي" },
        { url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=500&q=60", label: "تعليم متميز" },
        { url: "https://images.unsplash.com/photo-1427504494785-3a9ca28497b1?auto=format&fit=crop&w=500&q=60", label: "بيئة تفاعلية" },
    ];

    const galleryItems = (settings?.galleryImages && settings.galleryImages.length > 0)
        ? settings.galleryImages.filter(url => url).map((url, i) => ({ url, label: `معرض الصور ${i + 1}` }))
        : defaultGallery;

    if (isLoading || !settings) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <Loader />
            </div>
        );
    }

    if (currentUser) {
        switch (currentUser.role) {
            case Role.ADMIN:
                return <Navigate to="/admin" replace />;
            case Role.TEACHER:
            case Role.SUPERVISOR:
                return <Navigate to="/teacher" replace />;
            case Role.STUDENT:
            default:
                return <Navigate to="/student" replace />;
        }
    }

    if (!settings) return null;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-tajawal selection:bg-blue-500 selection:text-white relative">
            <CosmicBackground />

            <Header onNavigateToLogin={onNavigateToLogin} onNavigateToRegister={onNavigateToRegister} onOpenNav={() => setIsMobileNavOpen(true)} settings={settings} />
            <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} onNavigateToLogin={onNavigateToLogin} onNavigateToRegister={onNavigateToRegister} />

            <main>
                <HeroSection onNavigateToLogin={onNavigateToLogin} onNavigateToRegister={onNavigateToRegister} onPlayAudio={onPlayAudio} settings={settings} />

                {/* Features Section */}
                <div id="features" className="py-10">
                    <div className="container mx-auto px-6 mb-8 text-center" dir="rtl">
                        <h2 className="text-3xl font-black text-[var(--text-primary)]">مميزات المنصة الحصرية</h2>
                    </div>

                    {/* Row 1: Moves Left */}
                    <MarqueeBoard
                        items={featuresRow1}
                        speed={50}
                        direction="left"
                        renderItem={(item, idx) => (
                            <LandscapeFeatureCard
                                key={`f1-${idx}`}
                                title={item.title}
                                description={item.desc}
                                icon={item.icon}
                                color={item.color}
                                iconUrl={item.iconUrl}
                            />
                        )}
                    />

                    <div className="mb-4"></div> {/* Spacer */}

                    {/* Row 2: Moves Right */}
                    <MarqueeBoard
                        items={featuresRow2}
                        speed={60}
                        direction="right"
                        renderItem={(item, idx) => (
                            <LandscapeFeatureCard
                                key={`f2-${idx}`}
                                title={item.title}
                                description={item.desc}
                                icon={item.icon}
                                color={item.color}
                                iconUrl={item.iconUrl}
                            />
                        )}
                    />
                </div>

                <div className="mt-8">
                    {/* Gallery: Moves Right (Reverse Marquee) */}
                    <MarqueeBoard
                        title="جولة في عالمنا"
                        items={galleryItems}
                        speed={50}
                        direction="right"
                        renderItem={(item, idx) => (
                            <PhotoCard key={`p-${idx}`} imageUrl={item.url} label={item.label} />
                        )}
                    />
                </div>
            </main>

            <Footer settings={settings} />
        </div>
    );
};

export default WelcomeScreen;