
import React, { useState, useEffect, useMemo } from 'react';
import { User, ToastType, SubscriptionRequest, PlatformSettings } from '../../types';
import { getPlatformSettings } from '../../services/storageService';
import { addSubscriptionRequest } from '../../services/subscriptionService';
import { useToast } from '../../useToast';
import Modal from '../common/Modal';
import { ArrowRightIcon, CheckIcon, SparklesIcon, ShieldCheckIcon, CheckCircleIcon, SmartphoneIcon } from '../common/Icons';
import { useSession } from '../../hooks/useSession';
import Loader from '../common/Loader';

type PlanName = 'Monthly' | 'Quarterly' | 'SemiAnnually' | 'Annual';

interface Plan {
    name: string;
    plan: PlanName;
    price: number;
    originalPrice?: number;
    savePercent?: number;
    features: string[];
    isPopular: boolean;
}

const PremiumPlanCard: React.FC<{ plan: Plan, onSelect: (plan: Plan) => void }> = ({ plan, onSelect }) => (
    <div className={`relative flex flex-col p-8 rounded-[3rem] transition-all duration-500 border-2 overflow-hidden group ${
        plan.isPopular 
            ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-indigo-500 shadow-2xl shadow-indigo-500/30 scale-105 z-10' 
            : 'bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)] hover:border-indigo-400'
    }`}>
        {plan.isPopular && (
            <div className="absolute top-6 left-6 bg-white/20 backdrop-blur-md text-white px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] rounded-lg border border-white/20">
                Most Popular
            </div>
        )}
        
        <div className="mb-8">
            <h3 className="text-2xl font-black mb-1">{plan.name}</h3>
            <p className={`text-sm font-bold uppercase tracking-widest ${plan.isPopular ? 'text-indigo-100/60' : 'text-[var(--text-secondary)] opacity-60'}`}>
                الوصول الشامل للمنصة
            </p>
        </div>

        <div className="mb-8">
            <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black tracking-tighter">{plan.price}</span>
                <span className={`text-sm font-bold ${plan.isPopular ? 'text-indigo-100' : 'text-[var(--text-secondary)]'}`}>ج.م</span>
            </div>
            {plan.savePercent && plan.savePercent > 0 && (
                <div className={`mt-2 flex items-center gap-2 ${plan.isPopular ? 'text-indigo-100' : 'text-green-500'}`}>
                    <span className="text-sm font-bold bg-white/10 px-2 py-0.5 rounded-md">وفر {plan.savePercent}%</span>
                    <span className="text-sm line-through opacity-70">{plan.originalPrice} ج.م</span>
                </div>
            )}
        </div>

        <div className={`h-px w-full mb-8 ${plan.isPopular ? 'bg-white/10' : 'bg-[var(--border-primary)]'}`}></div>

        <ul className="space-y-4 mb-10 flex-grow">
            {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.isPopular ? 'bg-white/20' : 'bg-indigo-500/10'}`}>
                        <CheckIcon className={`w-3 h-3 ${plan.isPopular ? 'text-white' : 'text-indigo-600'}`} />
                    </div>
                    <span className={`text-sm font-bold ${plan.isPopular ? 'text-indigo-50' : 'text-[var(--text-secondary)]'}`}>{feature}</span>
                </li>
            ))}
        </ul>

        <button 
            onClick={() => onSelect(plan)}
            className={`w-full py-4 rounded-2xl font-black text-sm transition-all duration-300 transform active:scale-95 shadow-xl ${
                plan.isPopular 
                    ? 'bg-white text-indigo-600 hover:bg-indigo-50' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20'
            }`}
        >
            تفعيل الاشتراك
        </button>
    </div>
);

const ComprehensiveSubscription: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { currentUser: user } = useSession();
    const { addToast } = useToast();
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [settings, setSettings] = useState<PlatformSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [paymentNumber, setPaymentNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        getPlatformSettings().then(data => {
            setSettings(data);
            setIsLoading(false);
        });
    }, []);

    const plans = useMemo((): Plan[] => {
        if (!settings) return [];
        const { monthlyPrice, quarterlyPrice, semiAnnuallyPrice, annualPrice } = settings;
        
        // FIX: Explicitly cast 'plan' property values to PlanName to resolve TypeScript string-to-literal union mismatch.
        const allPlans: Plan[] = [
            { name: 'شهري', plan: 'Monthly' as PlanName, price: monthlyPrice, originalPrice: monthlyPrice, savePercent: 0, features: ['الوصول لجميع المواد', 'حل بنك الأسئلة', 'إحصائيات التقدم'], isPopular: false },
            { name: 'ربع سنوي', plan: 'Quarterly' as PlanName, price: quarterlyPrice, originalPrice: monthlyPrice * 3, savePercent: Math.round((1 - quarterlyPrice / (monthlyPrice * 3)) * 100), features: ['مميزات الباقة الشهرية', 'دعم فني متميز', 'جلسات مراجعة لايف'], isPopular: true },
            { name: 'سنوي', plan: 'Annual' as PlanName, price: annualPrice, originalPrice: monthlyPrice * 12, savePercent: Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100), features: ['مميزات الباقة الربع سنوية', 'أرخص سعر للحصة', 'وصول لجميع الكورسات'], isPopular: false },
        ].filter(p => p.price > 0);

        return allPlans;
    }, [settings]);

    const handleFinalConfirm = async () => {
        if (!user || !selectedPlan || paymentNumber.length < 11) return;
        setIsSubmitting(true);
        try {
            const { error } = await addSubscriptionRequest(
                user.id, 
                user.name, 
                selectedPlan.plan, 
                paymentNumber, 
                'الباقة الشاملة'
            );
            
            if (error) {
                addToast(`حدث خطأ أثناء الإرسال: ${error.message}`, ToastType.ERROR);
            } else {
                addToast('تم استلام طلبك بنجاح! سيتم تفعيله قريباً.', ToastType.SUCCESS);
                onBack();
            }
        } catch (e: any) {
            addToast(`خطأ: ${e.message}`, ToastType.ERROR);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader /></div>;

    return (
        <div className="max-w-6xl mx-auto pb-40 px-4">
            <button onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] font-black text-sm hover:text-indigo-600 transition-all active:scale-95 group mb-12">
                <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                <span>العودة لخيارات الاشتراك</span>
            </button>

            <div className="text-center mb-16">
                <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-600 mx-auto mb-6 shadow-inner">
                    <SparklesIcon className="w-10 h-10" />
                </div>
                <h1 className="text-4xl md:text-6xl font-black text-[var(--text-primary)] mb-4 tracking-tighter leading-tight">الاشتراك الشامل</h1>
                <p className="text-[var(--text-secondary)] font-bold text-sm md:text-lg max-w-xl mx-auto opacity-70">باقة واحدة تمنحك مفتاحاً سحرياً لكل محتوى المنصة، من دروس ومراجعات وأفلام كرتون.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 items-center">
                {plans.map(plan => (
                    <PremiumPlanCard key={plan.plan} plan={plan} onSelect={setSelectedPlan} />
                ))}
            </div>

            <Modal isOpen={!!selectedPlan} onClose={() => setSelectedPlan(null)} title={`إتمام الاشتراك: ${selectedPlan?.name}`} maxWidth="max-w-xl">
                 <div className="space-y-6">
                    <div className="bg-indigo-600 p-6 rounded-[2rem] text-white flex justify-between items-center shadow-xl">
                        <div>
                            <p className="text-sm font-black uppercase tracking-widest opacity-60 mb-1">المبلغ المطلوب</p>
                            <p className="text-3xl font-black">{selectedPlan?.price} ج.م</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold opacity-60">الباقة الشاملة</p>
                            <p className="text-lg font-black">{selectedPlan?.name}</p>
                        </div>
                    </div>

                    <div className="p-6 bg-[var(--bg-tertiary)] rounded-[2.5rem] border border-[var(--border-primary)] space-y-5">
                        <div className="flex items-center gap-3">
                            <SmartphoneIcon className="w-5 h-5 text-indigo-500"/>
                            <h4 className="font-black text-sm">أرقام تحويل فودافون كاش</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {settings?.paymentNumbers.map((num, i) => (
                                <div key={i} className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-primary)] flex justify-between items-center group">
                                    <p className="font-mono text-lg font-black tracking-widest">{num}</p>
                                    <button onClick={() => { navigator.clipboard.writeText(num); addToast("تم النسخ", ToastType.SUCCESS); }} className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all">
                                        <CheckIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                        
                        <div className="pt-4 border-t border-[var(--border-primary)]/50">
                            <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mb-3 mr-2">رقم الهاتف المحول منه</label>
                            <input 
                                type="tel"
                                value={paymentNumber}
                                onChange={(e) => setPaymentNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                                placeholder="01XXXXXXXXX"
                                className="w-full bg-[var(--bg-secondary)] border-2 border-[var(--border-primary)] focus:border-indigo-500 rounded-[1.5rem] py-4 px-6 text-center font-mono text-xl font-black tracking-widest outline-none transition-all shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 flex gap-4">
                        <ShieldCheckIcon className="w-6 h-6 text-emerald-500 shrink-0" />
                        <p className="text-sm font-bold text-emerald-700 leading-relaxed">بمجرد الإرسال، سيتم تفعيل الباقة لك خلال وقت قصير جداً بعد مطابقة التحويل.</p>
                    </div>

                    <button 
                        disabled={isSubmitting || paymentNumber.length < 11}
                        onClick={handleFinalConfirm}
                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black text-xl shadow-2xl shadow-indigo-500/30 flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                        {isSubmitting ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <><CheckCircleIcon className="w-6 h-6"/> إرسال طلب التفعيل</>}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default ComprehensiveSubscription;
