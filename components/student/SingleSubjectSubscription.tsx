
import React, { useState, useMemo, useEffect } from 'react';
import { User, SubscriptionRequest, Grade, ToastType, Unit, PlatformSettings, Teacher } from '../../types';
import { getPlatformSettings, getAllGrades } from '../../services/storageService';
import { getAllTeachers } from '../../services/teacherService';
import { addSubscriptionRequest } from '../../services/subscriptionService';
import { useToast } from '../../useToast';
import { ArrowRightIcon, ShieldCheckIcon, ChevronLeftIcon, UserCircleIcon, BookOpenIcon, ClockIcon, CreditCardIcon, CheckIcon, CheckCircleIcon, SmartphoneIcon } from '../common/Icons';
import { useSession } from '../../hooks/useSession';
import Loader from '../common/Loader';

interface SingleSubjectSubscriptionProps {
  onBack: () => void;
}

type Plan = 'Monthly' | 'Quarterly' | 'SemiAnnually' | 'Annual';

const planLabels: Record<Plan, string> = {
    Monthly: 'الباقة الشهرية',
    Quarterly: 'باقة الـ 3 شهور',
    SemiAnnually: 'باقة الـ 6 شهور',
    Annual: 'الباقة السنوية',
};

const PlanCard: React.FC<{ 
    plan: Plan; 
    isSelected: boolean; 
    onSelect: () => void; 
    price: number;
    description: string;
}> = ({ plan, isSelected, onSelect, price, description }) => (
    <button
        onClick={onSelect}
        className={`w-full p-6 rounded-[2rem] text-right transition-all duration-500 border-2 relative overflow-hidden group ${
            isSelected 
                ? 'bg-indigo-600 border-indigo-600 shadow-2xl shadow-indigo-500/30 -translate-y-1' 
                : 'bg-[var(--bg-secondary)] border-[var(--border-primary)] hover:border-indigo-300'
        }`}
    >
        <div className="flex justify-between items-center relative z-10">
            <div className="flex-1">
                <p className={`font-black text-xl mb-1 ${isSelected ? 'text-white' : 'text-[var(--text-primary)]'}`}>{planLabels[plan]}</p>
                <p className={`text-sm font-bold ${isSelected ? 'text-indigo-100' : 'text-[var(--text-secondary)]'} opacity-70`}>{description}</p>
            </div>
            <div className="text-left">
                <p className={`text-3xl font-black ${isSelected ? 'text-white' : 'text-indigo-600'}`}>{price}</p>
                <p className={`text-sm font-black uppercase tracking-widest ${isSelected ? 'text-indigo-100' : 'text-[var(--text-secondary)]'}`}>ج.م</p>
            </div>
        </div>
        
        {isSelected && (
            <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        )}
        
        <div className={`absolute bottom-4 left-4 transition-all duration-500 ${isSelected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <CheckIcon className="w-5 h-5 text-white" />
            </div>
        </div>
    </button>
);

const SingleSubjectSubscription: React.FC<SingleSubjectSubscriptionProps> = ({ onBack }) => {
    const { currentUser: user } = useSession();
    const { addToast } = useToast();
    
    const [settings, setSettings] = useState<PlatformSettings | null>(null);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [allGrades, setAllGrades] = useState<Grade[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Wizard State
    const [step, setStep] = useState(1);
    const [selectedUnitId, setSelectedUnitId] = useState<string>('');
    const [selectedPlan, setSelectedPlan] = useState<Plan>('Monthly');
    const [paymentNumber, setPaymentNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [settingsData, teachersData, gradesData] = await Promise.all([
                    getPlatformSettings(),
                    getAllTeachers(),
                    getAllGrades()
                ]);
                setSettings(settingsData);
                setTeachers(teachersData);
                setAllGrades(gradesData);
            } catch (err) {
                addToast("فشل تحميل البيانات.", ToastType.ERROR);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [addToast]);

    const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);

    const availableSubjects = useMemo(() => {
        if (!user || !allGrades.length) return [];
        const userGrade = allGrades.find(g => g.id === user.grade);
        if (!userGrade) return [];
        return (userGrade.semesters || []).flatMap(s => s.units.filter(u => {
            if (!user.track) return true;
            return !u.track || u.track === 'All' || u.track === user.track;
        }));
    }, [allGrades, user]);

    const handleConfirmRequest = async () => {
        if (!user || !selectedUnitId || !paymentNumber) return;
        
        setIsSubmitting(true);
        const selectedSubject = availableSubjects.find(u => u.id === selectedUnitId);
        
        try {
            const { error } = await addSubscriptionRequest(
                user.id, 
                user.name, 
                selectedPlan, 
                paymentNumber, 
                selectedSubject?.title, 
                selectedUnitId
            );
            
            if (error) {
                addToast(`حدث خطأ أثناء الإرسال: ${error.message}`, ToastType.ERROR);
            } else {
                addToast('تم إرسال طلبك بنجاح! سيتم مراجعته قريباً.', ToastType.SUCCESS);
                onBack();
            }
        } catch (e: any) {
            addToast(`حدث خطأ: ${e.message}`, ToastType.ERROR);
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast('تم نسخ الرقم بنجاح.', ToastType.SUCCESS);
    };

    if (isLoading || !settings) return <div className="flex justify-center items-center h-screen"><Loader /></div>;

    const selectedSubject = availableSubjects.find(u => u.id === selectedUnitId);
    const selectedTeacher = selectedSubject ? teacherMap.get(selectedSubject.teacherId) : null;

    return (
        <div className="max-w-3xl mx-auto pb-40 pt-6 px-4">
            {/* Header / Back */}
            <div className="flex items-center justify-between mb-10">
                <button onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] font-black text-sm hover:text-indigo-600 transition-all active:scale-95 group">
                    <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    <span>تغيير نوع الاشتراك</span>
                </button>
                
                {/* Visual Stepper */}
                <div className="flex items-center gap-1.5">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${step >= s ? 'w-6 bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.3)]' : 'w-2 bg-[var(--border-primary)] opacity-70'}`}></div>
                    ))}
                </div>
            </div>

            {/* Step 1: Subject Selection */}
            {step === 1 && (
                <div className="animate-fade-in space-y-8">
                    <div className="text-right">
                        <h2 className="text-3xl font-black text-[var(--text-primary)] mb-2">اختر مادتك المفضلة 📚</h2>
                        <p className="text-sm font-bold text-[var(--text-secondary)] opacity-60">حدد المادة والمدرس الذي ترغب في متابعة دروسه.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        {availableSubjects.map((unit, idx) => {
                            const teacher = teacherMap.get(unit.teacherId);
                            const isSelected = selectedUnitId === unit.id;
                            return (
                                <button 
                                    key={unit.id}
                                    onClick={() => setSelectedUnitId(unit.id)}
                                    className={`relative flex items-center gap-4 p-5 rounded-[2rem] text-right border-2 transition-all duration-300 ${isSelected ? 'border-indigo-600 bg-indigo-500/5 shadow-xl -translate-y-0.5' : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:border-indigo-300'}`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl overflow-hidden bg-[var(--bg-tertiary)] border-2 transition-all ${isSelected ? 'border-indigo-600' : 'border-transparent'}`}>
                                        <img src={teacher?.imageUrl || 'https://via.placeholder.com/100'} className="w-full h-full object-cover" alt={teacher?.name} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-black text-lg text-[var(--text-primary)] leading-tight">{unit.title}</p>
                                        <p className="text-sm font-bold text-[var(--text-secondary)] opacity-60 mt-0.5">أ. {teacher?.name || '---'}</p>
                                    </div>
                                    {isSelected && <CheckCircleIcon className="w-6 h-6 text-indigo-600" />}
                                </button>
                            );
                        })}
                        {availableSubjects.length === 0 && (
                            <div className="text-center p-8 bg-[var(--bg-secondary)] rounded-[2rem] border-2 border-dashed border-[var(--border-primary)] opacity-60">
                                <BookOpenIcon className="w-16 h-16 mx-auto mb-4" />
                                <p className="font-bold">لا توجد مواد متاحة لصفك الدراسي حالياً.</p>
                            </div>
                        )}
                    </div>

                    <button 
                        disabled={!selectedUnitId}
                        onClick={() => setStep(2)}
                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black text-xl shadow-xl shadow-indigo-500/30 transition-all transform active:scale-95 disabled:opacity-60 disabled:active:scale-100 flex items-center justify-center gap-3"
                    >
                        <span>اختيار الباقة السعرية</span>
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                </div>
            )}

            {/* Step 2: Plan Selection */}
            {step === 2 && (
                <div className="animate-fade-in space-y-8">
                    <div className="text-right">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm font-black uppercase text-[var(--text-secondary)] mb-3">
                             {selectedSubject?.title} • أ. {selectedTeacher?.name}
                        </div>
                        <h2 className="text-3xl font-black text-[var(--text-primary)] mb-2">اختر الباقة المناسبة 💎</h2>
                        <p className="text-sm font-bold text-[var(--text-secondary)] opacity-60">نوفر لك خيارات دفع مرنة تناسب احتياجاتك الدراسية.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {settings.monthlyPrice > 0 && (
                            <PlanCard 
                                plan="Monthly" 
                                isSelected={selectedPlan === 'Monthly'} 
                                onSelect={() => setSelectedPlan('Monthly')} 
                                price={settings.monthlyPrice}
                                description="وصول كامل لمدة 30 يوماً."
                            />
                        )}
                        {settings.quarterlyPrice > 0 && (
                            <PlanCard 
                                plan="Quarterly" 
                                isSelected={selectedPlan === 'Quarterly'} 
                                onSelect={() => setSelectedPlan('Quarterly')} 
                                price={settings.quarterlyPrice}
                                description="توفير متوسط لمدة 90 يوماً."
                            />
                        )}
                        {settings.semiAnnuallyPrice > 0 && (
                            <PlanCard 
                                plan="SemiAnnually" 
                                isSelected={selectedPlan === 'SemiAnnually'} 
                                onSelect={() => setSelectedPlan('SemiAnnually')} 
                                price={settings.semiAnnuallyPrice}
                                description="خصم كبير لمدة 180 يوماً."
                            />
                        )}
                        {settings.annualPrice > 0 && (
                            <PlanCard 
                                plan="Annual" 
                                isSelected={selectedPlan === 'Annual'} 
                                onSelect={() => setSelectedPlan('Annual')} 
                                price={settings.annualPrice}
                                description="أفضل قيمة للعام بالكامل."
                            />
                        )}
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setStep(1)} className="w-1/3 py-5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-3xl font-black transition-all hover:bg-[var(--border-primary)]">تراجع</button>
                        <button onClick={() => setStep(3)} className="w-2/3 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black text-xl shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3">
                            <span>مراجعة وتأكيد</span>
                            <ChevronLeftIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Payment & Confirmation */}
            {step === 3 && (
                <div className="animate-fade-in space-y-6">
                    <div className="text-right">
                        <h2 className="text-3xl font-black text-[var(--text-primary)] mb-2">تأكيد طلب الاشتراك 💳</h2>
                        <p className="text-sm font-bold text-[var(--text-secondary)] opacity-60">الرجاء إتمام عملية التحويل وإرسال رقم المحفظة.</p>
                    </div>

                    {/* Order Summary Box */}
                    <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden isolate">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 z-0"></div>
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="text-center md:text-right">
                                <p className="text-sm font-black uppercase tracking-[0.2em] opacity-60 mb-2">تفاصيل الفاتورة</p>
                                <h3 className="text-2xl font-black mb-1">{selectedSubject?.title}</h3>
                                <p className="text-sm font-bold opacity-80">{planLabels[selectedPlan]} • أ. {selectedTeacher?.name}</p>
                            </div>
                            <div className="text-center md:text-left bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20 min-w-[140px]">
                                <p className="text-sm font-black uppercase tracking-widest opacity-60 mb-1">المبلغ المطلوب</p>
                                <p className="text-4xl font-black leading-none">
                                    {selectedPlan === 'Monthly' ? settings.monthlyPrice : selectedPlan === 'Quarterly' ? settings.quarterlyPrice : selectedPlan === 'SemiAnnually' ? settings.semiAnnuallyPrice : settings.annualPrice}
                                    <span className="text-sm mr-1 opacity-60">ج.م</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Payment Gateways */}
                    <div className="bg-[var(--bg-secondary)] p-8 rounded-[3rem] border-2 border-[var(--border-primary)] shadow-sm space-y-6">
                        <div className="flex items-center gap-3 border-b border-[var(--border-primary)] pb-4 mb-4">
                            <SmartphoneIcon className="w-6 h-6 text-indigo-500" />
                            <h4 className="font-black text-lg">بوابات الدفع المتاحة</h4>
                        </div>
                        
                        <p className="text-sm font-bold text-[var(--text-secondary)] leading-relaxed">قم بتحويل المبلغ المذكور أعلاه عبر فودافون كاش إلى أحد الأرقام التالية:</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {(settings.paymentNumbers || []).map((num, i) => (
                                <div key={i} className="bg-[var(--bg-tertiary)] p-4 rounded-2xl border border-[var(--border-primary)] flex justify-between items-center group transition-all hover:border-indigo-400">
                                    <div className="text-right">
                                        <p className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-0.5">المحفظة {i+1}</p>
                                        <p className="font-mono text-lg font-black text-[var(--text-primary)] tracking-widest">{num}</p>
                                    </div>
                                    <button onClick={() => copyToClipboard(num)} className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                        <CheckIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="h-px bg-[var(--border-primary)] my-6"></div>

                        <div className="space-y-4">
                            <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mr-2">رقم الهاتف المحول منه</label>
                            <div className="relative group">
                                <input 
                                    type="tel"
                                    value={paymentNumber}
                                    onChange={(e) => setPaymentNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                                    placeholder="01XXXXXXXXX"
                                    className="w-full bg-[var(--bg-tertiary)] border-2 border-[var(--border-primary)] focus:border-indigo-500 rounded-3xl py-4 px-6 text-center font-mono text-xl font-black tracking-widest outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-base placeholder:opacity-60 shadow-inner"
                                />
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-500 opacity-20"><SmartphoneIcon className="w-6 h-6"/></div>
                            </div>
                        </div>
                    </div>

                    {/* Trust Banner */}
                    <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 flex items-center gap-4">
                        <ShieldCheckIcon className="w-8 h-8 text-blue-500 flex-shrink-0" />
                        <p className="text-sm font-bold text-blue-800 dark:text-blue-200 leading-relaxed">
                            سيتم مراجعة طلبك من قبل فريق الإدارة وتفعيله في أسرع وقت ممكن (عادة خلال أقل من ساعتين). سيصلك بريد إلكتروني فور التفعيل.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setStep(2)} className="w-1/3 py-5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-3xl font-black transition-all hover:bg-[var(--border-primary)]">تعديل الباقة</button>
                        <button 
                            disabled={isSubmitting || paymentNumber.length < 11}
                            onClick={handleConfirmRequest}
                            className="w-2/3 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black text-xl shadow-2xl shadow-indigo-500/30 flex items-center justify-center gap-3 transition-all transform active:scale-95 disabled:opacity-60"
                        >
                            {isSubmitting ? (
                                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <><span>تأكيد وإرسال الطلب</span> <CheckCircleIcon className="w-6 h-6" /></>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SingleSubjectSubscription;
