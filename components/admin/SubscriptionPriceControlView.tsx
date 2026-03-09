
import React, { useState, useEffect } from 'react';
import { PlatformSettings, ToastType, SubscriptionMode } from '../../types';
import { getPlatformSettings, updatePlatformSettings } from '../../services/storageService';
import { 
    CreditCardIcon, 
    CogIcon, 
    SparklesIcon, 
    ShieldCheckIcon,
    ChartBarIcon,
    CheckCircleIcon,
    ClockIcon,
    PhoneIcon,
    InformationCircleIcon
} from '../common/Icons';
import Loader from '../common/Loader';
import { useToast } from '../../useToast';

const PlanPriceCard: React.FC<{ 
    label: string; 
    value: number; 
    onChange: (val: number) => void;
    icon: React.FC<any>;
    gradient: string;
    description: string;
}> = ({ label, value, onChange, icon: Icon, gradient, description }) => (
    <div className="group relative bg-[var(--bg-secondary)] p-6 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 overflow-hidden">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-[0.05] group-hover:opacity-[0.1] transition-opacity`}></div>
        
        <div className="relative z-10">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br ${gradient} text-white shadow-lg`}>
                <Icon className="w-6 h-6" />
            </div>
            
            <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-1">{label}</label>
            <div className="flex items-end gap-2 mb-2">
                <input 
                    type="number" 
                    value={value} 
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-transparent text-3xl font-black text-[var(--text-primary)] border-none focus:ring-0 p-0 outline-none"
                />
                <span className="text-sm font-bold text-[var(--text-secondary)] mb-1">ج.م</span>
            </div>
            <p className="text-sm font-medium text-[var(--text-secondary)] opacity-60 leading-relaxed">{description}</p>
        </div>
        
        <div className={`absolute bottom-0 right-6 left-6 h-1 bg-gradient-to-r ${gradient} rounded-t-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>
    </div>
);

const SubscriptionPriceControlView: React.FC = () => {
    const [settings, setSettings] = useState<PlatformSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        getPlatformSettings().then(data => {
            setSettings(data);
            setIsLoading(false);
        });
    }, []);

    const handlePriceChange = (key: keyof PlatformSettings, val: number) => {
        setSettings(prev => prev ? { ...prev, [key]: val } : null);
        setIsDirty(true);
    };

    const handleModeToggle = (mode: SubscriptionMode) => {
        setSettings(prev => {
            if (!prev) return null;
            const current = prev.enabledSubscriptionModes || [];
            const updated = current.includes(mode) 
                ? current.filter(m => m !== mode) 
                : [...current, mode];
            return { ...prev, enabledSubscriptionModes: updated };
        });
        setIsDirty(true);
    };

    const handleSave = async () => {
        if (!settings) return;
        setIsSaving(true);
        const { error } = await updatePlatformSettings(settings);
        if (error) {
            addToast('حدث خطأ أثناء الحفظ', ToastType.ERROR);
        } else {
            addToast('تم تحديث الأسعار بنجاح', ToastType.SUCCESS);
            setIsDirty(false);
        }
        setIsSaving(false);
    };

    if (isLoading || !settings) return <div className="flex justify-center items-center h-96"><Loader /></div>;

    return (
        <div className="fade-in space-y-8 pb-24 max-w-6xl mx-auto px-2">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
                <div>
                    <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">إعدادات الاشتراك</h1>
                    <p className="text-[var(--text-secondary)] mt-2 text-lg font-medium">إدارة الخطط السعرية، بوابات الدفع، وصلاحيات الوصول.</p>
                </div>
                {isDirty && (
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="w-full md:w-auto bg-[var(--accent-primary)] hover:bg-indigo-600 text-white px-10 py-4 rounded-3xl font-black shadow-2xl shadow-indigo-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircleIcon className="w-6 h-6" />}
                        <span>حفظ التغييرات</span>
                    </button>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                <div className="lg:col-span-8 space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <PlanPriceCard 
                            label="الباقة الشهرية" 
                            value={settings.monthlyPrice} 
                            onChange={(v) => handlePriceChange('monthlyPrice', v)}
                            icon={ClockIcon}
                            gradient="from-blue-500 to-indigo-600"
                            description="الخيار الأساسي للطلاب للوصول لمدة 30 يوماً."
                        />
                        <PlanPriceCard 
                            label="الباقة الربع سنوية" 
                            value={settings.quarterlyPrice} 
                            onChange={(v) => handlePriceChange('quarterlyPrice', v)}
                            icon={ChartBarIcon}
                            gradient="from-purple-500 to-pink-600"
                            description="توفير متوسط لمدة 90 يوماً متواصلة."
                        />
                        <PlanPriceCard 
                            label="الباقة النصف سنوية" 
                            value={settings.semiAnnuallyPrice} 
                            onChange={(v) => handlePriceChange('semiAnnuallyPrice', v)}
                            icon={ShieldCheckIcon}
                            gradient="from-emerald-500 to-teal-600"
                            description="خصم كبير لفترة دراسية كاملة (180 يوماً)."
                        />
                        <PlanPriceCard 
                            label="الباقة السنوية" 
                            value={settings.annualPrice} 
                            onChange={(v) => handlePriceChange('annualPrice', v)}
                            icon={SparklesIcon}
                            gradient="from-amber-400 to-orange-600"
                            description="أفضل قيمة مقابل سعر للعام الدراسي بالكامل."
                        />
                    </div>

                    <div className="bg-[var(--bg-secondary)] p-6 md:p-8 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm">
                        <h2 className="text-xl font-black text-[var(--text-primary)] mb-6 flex items-center gap-4">
                            <CreditCardIcon className="w-6 h-6 text-indigo-500" />
                            بوابات الدفع (Vodafone Cash)
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[0, 1].map(idx => (
                                <div key={idx} className="relative group">
                                    <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 mr-2">رقم المحفظة {idx + 1}</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="أدخل الرقم هنا..."
                                            value={settings.paymentNumbers[idx] || ''}
                                            onChange={(e) => {
                                                const newNums = [...settings.paymentNumbers];
                                                newNums[idx] = e.target.value;
                                                handlePriceChange('paymentNumbers' as any, newNums as any);
                                            }}
                                            className="w-full bg-[var(--bg-tertiary)] border-2 border-transparent focus:border-indigo-500 p-4 rounded-2xl font-mono font-bold tracking-widest outline-none transition-all text-center"
                                        />
                                        <PhoneIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20"/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-[var(--bg-secondary)] p-6 md:p-8 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm h-full">
                        <h2 className="text-xl font-black text-[var(--text-primary)] mb-8 flex items-center gap-4">
                            <CogIcon className="w-6 h-6 text-indigo-500" />
                            أوضاع الاشتراك
                        </h2>
                        
                        <div className="space-y-4">
                            {[
                                { id: 'comprehensive' as SubscriptionMode, label: 'الاشتراك الشامل', desc: 'فتح جميع مواد المنصة دفعة واحدة.', color: 'indigo' },
                                { id: 'singleSubject' as SubscriptionMode, label: 'اشتراك المواد', desc: 'الاشتراك في مادة مدرس واحد فقط.', color: 'purple' }
                            ].map(mode => (
                                <div 
                                    key={mode.id}
                                    onClick={() => handleModeToggle(mode.id)}
                                    className={`p-6 rounded-3xl border-2 transition-all cursor-pointer select-none ${settings.enabledSubscriptionModes?.includes(mode.id) ? `bg-${mode.color}-500/5 border-${mode.color}-500/50 shadow-inner` : 'bg-[var(--bg-tertiary)] border-transparent opacity-60'}`}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`font-black text-sm uppercase tracking-wider ${settings.enabledSubscriptionModes?.includes(mode.id) ? `text-${mode.color}-600` : 'text-[var(--text-secondary)]'}`}>{mode.label}</span>
                                        <div className={`w-10 h-6 rounded-full relative transition-all ${settings.enabledSubscriptionModes?.includes(mode.id) ? `bg-${mode.color}-600` : 'bg-gray-400'}`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${settings.enabledSubscriptionModes?.includes(mode.id) ? 'left-1' : 'left-[calc(100%-1.25rem)]'}`}></div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)] font-bold leading-relaxed">{mode.desc}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 p-6 bg-amber-500/5 border border-amber-500/20 rounded-[2rem] flex gap-4">
                            <InformationCircleIcon className="w-8 h-8 text-amber-500 flex-shrink-0"/>
                            <div>
                                <h4 className="font-black text-amber-600 text-sm mb-1">نصيحة الإدارة</h4>
                                <p className="text-sm text-amber-800 dark:text-amber-200 font-bold leading-relaxed">
                                    يفضل تفعيل وضع واحد فقط لتبسيط عملية الاشتراك للطلاب وتفادي الالتباس عند الدفع.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SubscriptionPriceControlView;
