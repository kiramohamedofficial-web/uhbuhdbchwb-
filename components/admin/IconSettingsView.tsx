
import React, { useState, useEffect, useMemo } from 'react';
import { PlatformSettings, ToastType, IconSettings } from '../../types';
import { getPlatformSettings, updatePlatformSettings } from '../../services/storageService';
import { useToast } from '../../useToast';
import { 
    PhotoIcon, SparklesIcon, CogIcon, SmartphoneIcon, 
    LayoutIcon, KeyIcon, UserCircleIcon, CheckCircleIcon,
    TrashIcon, ClockIcon
} from '../common/Icons';
import ImageUpload from '../common/ImageUpload';
import Loader from '../common/Loader';
import { defaultIcons } from '../../IconContext';

// Group definitions for a better UX
const GROUPS = [
    { id: 'branding', label: 'الهوية والبراند', icon: SparklesIcon },
    { id: 'auth', label: 'صفحات الدخول', icon: KeyIcon },
    { id: 'welcome', label: 'الشاشة الترحيبية', icon: LayoutIcon },
    { id: 'student_nav', label: 'قائمة الطالب', icon: SmartphoneIcon },
    { id: 'admin_nav', label: 'قائمة الإدارة', icon: CogIcon },
    { id: 'avatars', label: 'الصور الشخصية', icon: UserCircleIcon },
];

const FIELDS_MAP: Record<string, { key: keyof IconSettings; label: string; description: string; shape: 'circle' | 'square' }[]> = {
    branding: [
        { key: 'mainLogoUrl', label: 'الشعار الرئيسي', description: 'يظهر في الهيدر والصفحات الرئيسية', shape: 'square' },
        { key: 'faviconUrl', label: 'أيقونة المتصفح (Favicon)', description: 'تظهر في تبويب المتصفح العلوي', shape: 'square' },
    ],
    auth: [
        { key: 'authLoginIconUrl', label: 'أيقونة تسجيل الدخول', description: 'تظهر أعلى نموذج الدخول', shape: 'circle' },
        { key: 'authRegisterIconUrl', label: 'أيقونة إنشاء الحساب', description: 'تظهر أعلى نموذج التسجيل', shape: 'circle' },
    ],
    welcome: [
        { key: 'welcomeHeroImageUrl', label: 'صورة الداشبورد الترحيبية', description: 'الصورة الكبيرة في واجهة الترحيب', shape: 'square' },
        { key: 'welcomeStatStudentIconUrl', label: 'أيقونة إحصائية الطلاب', description: 'تظهر في قسم الأرقام', shape: 'square' },
        { key: 'welcomeStatLessonIconUrl', label: 'أيقونة إحصائية الدروس', description: 'تظهر في قسم الأرقام', shape: 'square' },
        { key: 'welcomeFeatureAiIconUrl', label: 'أيقونة ميزة الذكاء الاصطناعي', description: 'تظهر في بطاقات المميزات', shape: 'square' },
        { key: 'welcomeFeatureCinemaIconUrl', label: 'أيقونة سينما الطلاب', description: 'تظهر في بطاقات المميزات', shape: 'square' },
    ],
    student_nav: [
        { key: 'studentNavHomeIconUrl', label: 'أيقونة الرئيسية', description: 'القائمة الجانبية والسفلية', shape: 'square' },
        { key: 'studentNavCurriculumIconUrl', label: 'أيقونة المنهج الدراسي', description: 'الوصول للمواد الدراسية', shape: 'square' },
        { key: 'studentNavReelsIconUrl', label: 'أيقونة الريلز', description: 'فيديوهات الطالب القصيرة', shape: 'square' },
        { key: 'studentNavSubscriptionIconUrl', label: 'أيقونة الاشتراك', description: 'باقات الدفع', shape: 'square' },
        { key: 'studentNavProfileIconUrl', label: 'أيقونة الملف الشخصي', description: 'إعدادات حساب الطالب', shape: 'square' },
        { key: 'studentNavChatbotIconUrl', label: 'أيقونة المساعد الذكي', description: 'المحادثة مع AI', shape: 'square' },
        { key: 'studentNavCartoonIconUrl', label: 'أيقونة الأفلام', description: 'قسم الترفيه', shape: 'square' },
        { key: 'studentNavQuestionBankIconUrl', label: 'أيقونة بنك الأسئلة', description: 'التدريبات الذكية', shape: 'square' },
    ],
    admin_nav: [
        { key: 'adminNavContentIconUrl', label: 'أيقونة إدارة المحتوى', description: 'القائمة الجانبية للإدارة', shape: 'square' },
        { key: 'adminNavTeacherIconUrl', label: 'أيقونة إدارة المدرسين', description: 'القائمة الجانبية للإدارة', shape: 'square' },
        { key: 'adminNavStudentIconUrl', label: 'أيقونة إدارة الطلاب', description: 'القائمة الجانبية للإدارة', shape: 'square' },
        { key: 'adminNavHealthIconUrl', label: 'أيقونة فحص النظام', description: 'القائمة الجانبية للإدارة', shape: 'square' },
        { key: 'adminNavCartoonIconUrl', label: 'أيقونة الأفلام (إدارة)', description: 'أيقونة قسم الميديا في القائمة', shape: 'square' },
    ],
    avatars: [
        { key: 'studentAvatar1Url', label: 'صورة افتراضية 1', description: 'تظهر للطالب للاختيار منها', shape: 'circle' },
        { key: 'studentAvatar2Url', label: 'صورة افتراضية 2', description: 'تظهر للطالب للاختيار منها', shape: 'circle' },
        { key: 'studentAvatar3Url', label: 'صورة افتراضية 3', description: 'تظهر للطالب للاختيار منها', shape: 'circle' },
        { key: 'studentAvatar4Url', label: 'صورة افتراضية 4', description: 'تظهر للطالب للاختيار منها', shape: 'circle' },
        { key: 'studentAvatar5Url', label: 'صورة افتراضية 5', description: 'تظهر للطالب للاختيار منها', shape: 'circle' },
        { key: 'studentAvatar6Url', label: 'صورة افتراضية 6', description: 'تظهر للطالب للاختيار منها', shape: 'circle' },
    ]
};

const IconSettingCard: React.FC<{
    field: { key: keyof IconSettings; label: string; description: string; shape: 'circle' | 'square' };
    value: string;
    onChange: (value: string) => void;
    onDelete: () => void;
}> = ({ field, value, onChange, onDelete }) => {
    // Determine the preview: either the custom value or the system default
    const displayValue = value && value.trim() !== "" ? value : defaultIcons[field.key];
    const isUsingDefault = !value || value.trim() === "";

    return (
        <div className={`bg-[var(--bg-secondary)] p-5 rounded-[2rem] border transition-all duration-300 group relative ${isUsingDefault ? 'border-[var(--border-primary)] opacity-80' : 'border-indigo-500/30 shadow-md'}`}>
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                {/* Preview Area */}
                <div className={`
                    relative w-24 h-24 flex-shrink-0 bg-[var(--bg-tertiary)] border-2 border-dashed overflow-hidden flex items-center justify-center transition-all
                    ${field.shape === 'circle' ? 'rounded-full' : 'rounded-3xl'}
                    ${isUsingDefault ? 'border-[var(--border-primary)]' : 'border-indigo-500/50'}
                `}>
                    {displayValue ? (
                        <img src={displayValue} alt={field.label} className="w-full h-full object-contain p-1" />
                    ) : (
                        <PhotoIcon className="w-8 h-8 text-[var(--text-secondary)] opacity-20" />
                    )}
                    
                    {isUsingDefault && (
                        <div className="absolute inset-0 bg-black/5 backdrop-blur-[1px] flex items-center justify-center">
                            <span className="bg-white/80 dark:bg-black/60 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter text-[var(--text-primary)] shadow-sm">الافتراضي</span>
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 text-center sm:text-right">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                             <h3 className="font-black text-md text-[var(--text-primary)]">{field.label}</h3>
                             {!isUsingDefault && <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>}
                        </div>
                        {!isUsingDefault && (
                            <button 
                                onClick={(e) => { e.preventDefault(); onDelete(); }}
                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
                                title="حذف والعودة للافتراضي"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <p className="text-sm font-bold text-[var(--text-secondary)] leading-relaxed mb-4">{field.description}</p>
                    
                    <div className="scale-90 origin-right">
                        <ImageUpload 
                            label="" 
                            value={value} 
                            onChange={onChange} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const IconSettingsView: React.FC = () => {
    const [settings, setSettings] = useState<PlatformSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('branding');
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        getPlatformSettings().then(s => {
            setSettings(s);
            setIsLoading(false);
        });
    }, []);

    const handleChange = (key: keyof IconSettings, value: string) => {
        setSettings(prev => {
            if (!prev) return null;
            return {
                ...prev,
                iconSettings: {
                    ...(prev.iconSettings || {}),
                    [key]: value
                }
            };
        });
    };

    const handleSave = async () => {
        if (!settings) return;
        setIsSaving(true);
        try {
            const { error } = await updatePlatformSettings(settings);
            if (error) throw error;
            addToast('تم حفظ التعديلات بنجاح. سيلاحظ الطلاب التغيير فوراً.', ToastType.SUCCESS);
        } catch (e: any) {
            console.error("Icon Save Error:", e);
            addToast(`فشل الحفظ: ${e.message}`, ToastType.ERROR);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading || !settings) {
        return (
            <div className="flex flex-col justify-center items-center h-96 gap-4">
                <Loader />
                <p className="text-[var(--text-secondary)] font-bold animate-pulse">جاري تحميل إعدادات الأيقونات...</p>
            </div>
        );
    }

    const currentIcons = settings.iconSettings || {};

    return (
        <div className="fade-in max-w-6xl mx-auto pb-32 px-2">
            {/* Page Header */}
            <div className="mb-10 text-center md:text-right">
                <h1 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-2 tracking-tight">إدارة الأيقونات والصور</h1>
                <p className="text-[var(--text-secondary)] font-medium">تحكم في الهوية البصرية للمنصة بالكامل. سيتم تحديث الأيقونات عند الطلاب بشكل لحظي.</p>
            </div>

            {/* Navigation Tabs - Responsive Scrollable */}
            <div className="sticky top-0 z-30 py-4 bg-[var(--bg-primary)]/80 backdrop-blur-md -mx-4 px-4 mb-8">
                <div className="flex overflow-x-auto no-scrollbar gap-2 p-1.5 bg-[var(--bg-tertiary)] rounded-[2rem] border border-[var(--border-primary)] shadow-inner">
                    {GROUPS.map(group => {
                        const Icon = group.icon;
                        const isActive = activeTab === group.id;
                        return (
                            <button
                                key={group.id}
                                onClick={() => setActiveTab(group.id)}
                                className={`
                                    flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm whitespace-nowrap transition-all duration-300
                                    ${isActive 
                                        ? 'bg-[var(--bg-secondary)] text-[var(--accent-primary)] shadow-md' 
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }
                                `}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--accent-primary)]' : ''}`} />
                                {group.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Group Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 animate-fade-in">
                {FIELDS_MAP[activeTab].map(field => (
                    <IconSettingCard 
                        key={field.key}
                        field={field}
                        value={currentIcons[field.key] || ''}
                        onChange={(v) => handleChange(field.key, v)}
                        onDelete={() => handleChange(field.key, '')}
                    />
                ))}
            </div>

            {/* Floating Footer Action */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-6">
                <div className="bg-[rgba(var(--bg-secondary-rgb),0.9)] backdrop-blur-xl border border-[var(--border-primary)] p-3 rounded-[2.5rem] shadow-2xl flex items-center justify-between gap-4">
                    <div className="hidden sm:block pr-4">
                        <p className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest">التغييرات الحالية</p>
                        <p className="text-sm font-bold text-[var(--text-primary)]">سيتم تحديث النظام عند الحفظ</p>
                    </div>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-10 py-4 bg-[var(--accent-primary)] hover:bg-indigo-600 text-white font-black rounded-[2rem] shadow-lg shadow-indigo-500/30 transition-all transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <CheckCircleIcon className="w-6 h-6" />
                                <span>حفظ التحديثات</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IconSettingsView;
