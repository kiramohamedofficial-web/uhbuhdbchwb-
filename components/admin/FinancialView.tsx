
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { SubscriptionRequest, ToastType, Subscription, Grade, User, PlatformSettings, AdminView } from '../../types';
import { getAllUsers, getAllGrades, getPlatformSettings, supabase } from '../../services/storageService';
import { 
    getAllSubscriptionRequests, 
    updateSubscriptionRequest, 
    createOrUpdateSubscription, 
    getAllSubscriptions, 
    cancelSubscription 
} from '../../services/subscriptionService';
import { sendSubscriptionActivationEmail } from '../../services/emailService';
import { useToast } from '../../useToast';
import Modal from '../common/Modal';
import { BellIcon, CheckCircleIcon, ClockIcon, CreditCardIcon, TrashIcon, CheckIcon, UserCircleIcon, CurrencyDollarIcon, CalendarIcon, XCircleIcon, InformationCircleIcon, EnvelopeIcon, ShieldExclamationIcon } from '../common/Icons';
import Loader from '../common/Loader';

// --- Improved Components ---

const StatCard: React.FC<{ title: string; value: string | number; icon: React.FC<any>; color: string }> = ({ title, value, icon: Icon, color }) => (
    <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl shadow-lg border border-[var(--border-primary)] flex items-center gap-5 transition-transform hover:-translate-y-1">
        <div className={`p-4 rounded-2xl ${color.replace('text-', 'bg-').replace('500', '500/10').replace('400', '400/10')}`}>
            <Icon className={`w-8 h-8 ${color}`} />
        </div>
        <div>
            <p className="text-sm font-bold text-[var(--text-secondary)] opacity-80 uppercase tracking-wide">{title}</p>
            <p className="text-3xl font-black text-[var(--text-primary)] mt-1">{value}</p>
        </div>
    </div>
);

const RequestCard: React.FC<{
    request: SubscriptionRequest & { userEmail?: string };
    price: number | null;
    onApprove: (req: SubscriptionRequest) => void;
    onReject: (req: SubscriptionRequest) => void;
}> = ({ request, price, onApprove, onReject }) => {
    const planLabels: Record<SubscriptionRequest['plan'], string> = {
        Monthly: 'شهري', Quarterly: 'ربع سنوي', Annual: 'سنوي', SemiAnnually: 'نصف سنوي'
    };

    return (
        <div className="group bg-[var(--bg-secondary)] rounded-3xl shadow-sm hover:shadow-xl border border-[var(--border-primary)] p-6 transition-all duration-300 relative overflow-hidden animate-slide-up">
            {/* Status Indicator Strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 to-orange-500"></div>

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="font-black text-xl text-[var(--text-primary)] mb-1">{request.userName || 'مستخدم'}</h3>
                    <div className="flex items-center gap-2 text-sm font-bold text-indigo-500 mb-2">
                        <EnvelopeIcon className="w-3 h-3" />
                        <span dir="ltr">{request.userEmail || 'البريد غير متوفر'}</span>
                    </div>
                    <p className="text-sm font-bold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-2 py-1 rounded-md inline-block">
                        {request.subjectName || 'الباقة الشاملة'}
                    </p>
                </div>
                <div className="text-left">
                    <span className="block font-black text-2xl text-[var(--text-accent)]">{price ? `${price} ج.م` : '---'}</span>
                    <span className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">{planLabels[request.plan]}</span>
                </div>
            </div>

            <div className="space-y-3 mb-6 bg-[var(--bg-tertiary)] p-4 rounded-2xl border border-[var(--border-primary)]">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--text-secondary)] flex items-center gap-2">رقم الدفع</span>
                    <span className="font-mono font-bold text-[var(--text-primary)] tracking-wider" dir="ltr">{request.paymentFromNumber || '---'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--text-secondary)] flex items-center gap-2"><ClockIcon className="w-4 h-4"/> التاريخ</span>
                    <span className="font-bold text-[var(--text-primary)]">{new Date(request.createdAt).toLocaleDateString('ar-EG')}</span>
                </div>
            </div>

            <div className="flex gap-3">
                 <button onClick={() => onReject(request)} className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2 border border-red-500/20">
                    <TrashIcon className="w-5 h-5"/> رفض
                </button>
                <button onClick={() => onApprove(request)} className="flex-[2] py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                    <CheckIcon className="w-5 h-5"/> تفعيل الاشتراك
                </button>
            </div>
        </div>
    );
};

const SubscriptionCard: React.FC<{ subscription: Subscription; user: User | undefined; isActive: boolean; onCancel?: () => void }> = ({ subscription, user, isActive, onCancel }) => {
    const planLabels: Record<Subscription['plan'], string> = { Monthly: 'شهري', Quarterly: 'ربع سنوي', Annual: 'سنوي', SemiAnnually: 'نصف سنوي' };
    
    return (
        <div className={`bg-[var(--bg-secondary)] rounded-3xl shadow-sm border p-6 transition-all ${isActive ? 'border-[var(--border-primary)] hover:border-emerald-400' : 'border-[var(--border-primary)] opacity-80 grayscale'}`}>
            <div className="flex items-center gap-4 mb-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md ${isActive ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gray-400'}`}>
                    {user?.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-[var(--text-primary)] truncate">{user?.name || 'مستخدم غير معروف'}</h3>
                    <p className="text-sm text-indigo-500 font-bold truncate" dir="ltr">{user?.email}</p>
                    <p className="text-sm text-[var(--text-secondary)] font-mono">{user?.phone}</p>
                </div>
                {isActive && <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-[var(--bg-tertiary)] p-3 rounded-xl text-center">
                    <p className="text-sm text-[var(--text-secondary)] mb-1">الباقة</p>
                    <p className="font-bold text-sm text-[var(--text-primary)]">{planLabels[subscription.plan]}</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] p-3 rounded-xl text-center">
                     <p className="text-sm text-[var(--text-secondary)] mb-1">الانتهاء</p>
                    <p className={`font-bold text-sm ${isActive ? 'text-emerald-500' : 'text-red-500'}`}>{new Date(subscription.endDate).toLocaleDateString('ar-EG')}</p>
                </div>
            </div>
            
            {onCancel && isActive && (
                <button onClick={onCancel} className="w-full py-2.5 text-sm font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors flex items-center justify-center gap-2 border border-red-500/10">
                    <XCircleIcon className="w-4 h-4"/> إلغاء الاشتراك
                </button>
            )}
        </div>
    );
}

const ApprovalModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    request: SubscriptionRequest | null;
    onConfirm: (request: SubscriptionRequest, plan: Subscription['plan'], customEndDate?: string) => void;
}> = ({ isOpen, onClose, request, onConfirm }) => {
    const [endDate, setEndDate] = useState('');

    useEffect(() => { if (!isOpen) setEndDate(''); }, [isOpen]);
    if (!request) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`تفعيل اشتراك: ${request.userName}`}>
            <div className="space-y-5">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                    <p className="text-sm font-bold text-blue-800 dark:text-blue-200">تفاصيل الطلب:</p>
                    <ul className="mt-2 space-y-1 text-sm text-blue-600 dark:text-blue-300">
                        <li>• الباقة: {request.plan}</li>
                        <li>• المادة: {request.subjectName || 'شامل'}</li>
                    </ul>
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">تاريخ الانتهاء المخصص (اختياري)</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                    <p className="text-sm text-[var(--text-secondary)] mt-2 opacity-70">
                        <InformationCircleIcon className="w-3 h-3 inline ml-1"/>
                        اتركه فارغًا ليقوم النظام بحساب التاريخ تلقائياً بناءً على نوع الباقة (30 يوم، 90 يوم، إلخ).
                    </p>
                </div>

                 <div className="flex justify-end pt-4 border-t border-[var(--border-primary)]">
                    <button onClick={() => onConfirm(request, request.plan, endDate || undefined)} className="px-8 py-3 font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95">
                        تأكيد وإرسال إشعار
                    </button>
                </div>
            </div>
        </Modal>
    )
}

interface SubscriptionManagementViewProps {
    onNavigate?: (view: AdminView) => void;
}

const SubscriptionManagementView: React.FC<SubscriptionManagementViewProps> = ({ onNavigate }) => {
    const [dataVersion, setDataVersion] = useState(0);
    const [activeTab, setActiveTab] = useState<'Pending' | 'Active' | 'Expired'>('Pending');
    const [approvalRequest, setApprovalRequest] = useState<SubscriptionRequest | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [allRequests, setAllRequests] = useState<SubscriptionRequest[]>([]);
    const [allSubscriptions, setAllSubscriptions] = useState<Subscription[]>([]);
    const [userMap, setUserMap] = useState<Map<string, User>>(new Map());
    const [allGrades, setAllGrades] = useState<Grade[]>([]);
    const [settings, setSettings] = useState<PlatformSettings | null>(null);
    const { addToast } = useToast();

    const refreshData = useCallback(() => setDataVersion(v => v + 1), []);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [requests, subscriptions, users, grades, platformSettings] = await Promise.all([
                    getAllSubscriptionRequests(),
                    getAllSubscriptions(),
                    getAllUsers(),
                    getAllGrades(),
                    getPlatformSettings()
                ]);
                setAllRequests(requests);
                setAllSubscriptions(subscriptions);
                setUserMap(new Map(users.map(u => [u.id, u])));
                setAllGrades(grades);
                setSettings(platformSettings);
            } catch (error) {
                console.error("Error fetching data:", error);
                addToast("حدث خطأ أثناء تحديث البيانات.", ToastType.ERROR);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [dataVersion, addToast]);
    
    useEffect(() => {
        const channel = supabase
            .channel('subscription-requests-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'subscription_requests_temp' }, () => { // Updated to temp table
                addToast('تم تحديث قائمة الطلبات.', ToastType.INFO);
                refreshData();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [refreshData, addToast]);

    const findTeacherIdForUnit = useCallback((unitIdToFind: string): string | undefined => {
        for (const grade of allGrades) {
            for (const semester of grade.semesters) {
                const unit = semester.units.find(u => u.id === unitIdToFind);
                if (unit) return unit.teacherId;
            }
        }
        return undefined;
    }, [allGrades]);

    const handleApproveConfirm = async (request: SubscriptionRequest, plan: Subscription['plan'], customEndDate?: string) => {
        const teacherId = request.unitId ? findTeacherIdForUnit(request.unitId) : undefined;
        let finalEndDate = customEndDate;
        if (!finalEndDate) {
             const now = new Date();
             if (plan === 'Annual') now.setFullYear(now.getFullYear() + 1);
             else if (plan === 'SemiAnnually') now.setMonth(now.getMonth() + 6);
             else if (plan === 'Quarterly') now.setMonth(now.getMonth() + 3);
             else now.setDate(now.getDate() + 30);
             finalEndDate = now.toISOString();
        }

        const { error } = await createOrUpdateSubscription(request.userId, plan, 'Active', finalEndDate, teacherId);
        
        if (error) {
            addToast(`فشل التفعيل: ${error.message}`, ToastType.ERROR);
        } else {
            await updateSubscriptionRequest({ ...request, status: 'Approved' });
            const user = userMap.get(request.userId);
            if (user?.email) {
                const planName = { Monthly: 'شهرية', Quarterly: 'ربع سنوية', SemiAnnually: 'نصف سنوية', Annual: 'سنوية' }[plan] || plan;
                const formattedDate = new Date(finalEndDate).toLocaleDateString('ar-EG');
                sendSubscriptionActivationEmail(user.email, user.name, planName, formattedDate);
            }
            addToast(`تم تفعيل اشتراك ${request.userName} بنجاح.`, ToastType.SUCCESS);
            refreshData();
        }
        setApprovalRequest(null);
    };

    const handleReject = async (request: SubscriptionRequest) => {
        if(!confirm("هل أنت متأكد من رفض هذا الطلب؟")) return;
        await updateSubscriptionRequest({ ...request, status: 'Rejected' });
        addToast(`تم رفض الطلب.`, ToastType.INFO);
        refreshData();
    };

    const handleCancel = async (sub: Subscription) => {
        if (confirm('هل أنت متأكد من إلغاء هذا الاشتراك؟ سيتم إيقاف صلاحية الوصول فوراً.')) {
            const { error } = await cancelSubscription(sub.userId);
            if (error) addToast(`فشل الإلغاء: ${error.message}`, ToastType.ERROR);
            else {
                addToast('تم إلغاء الاشتراك.', ToastType.SUCCESS);
                refreshData();
            }
        }
    };

    const getPriceForRequest = (request: SubscriptionRequest): number | null => {
        if (!settings) return null;
        switch (request.plan) {
            case 'Monthly': return settings.monthlyPrice;
            case 'Quarterly': return settings.quarterlyPrice;
            case 'SemiAnnually': return settings.semiAnnuallyPrice;
            case 'Annual': return settings.annualPrice;
            default: return null;
        }
    };

    const { pendingRequests, activeSubscriptions, expiredSubscriptions } = useMemo(() => {
        const active = allSubscriptions.filter(s => s.status === 'Active' && new Date(s.endDate) >= new Date());
        const expired = allSubscriptions.filter(s => s.status === 'Expired' || new Date(s.endDate) < new Date());
        return {
            pendingRequests: allRequests.filter(r => r.status === 'Pending'),
            activeSubscriptions: active,
            expiredSubscriptions: expired,
        };
    }, [allRequests, allSubscriptions]);

    const renderContent = () => {
        if (isLoading) return <div className="flex justify-center p-16"><Loader /></div>;

        switch (activeTab) {
            case 'Pending':
                return pendingRequests.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
                        {pendingRequests.map(req => (
                            <RequestCard key={req.id} request={req} price={getPriceForRequest(req)} onApprove={setApprovalRequest} onReject={handleReject} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-[var(--bg-secondary)] rounded-[3rem] border-2 border-dashed border-[var(--border-primary)] opacity-60">
                        <CheckCircleIcon className="w-16 h-16 text-[var(--text-secondary)] mb-4" />
                        <p className="font-bold text-lg text-[var(--text-secondary)]">لا توجد طلبات جديدة</p>
                        <button onClick={refreshData} className="mt-4 text-indigo-500 font-bold hover:underline text-sm">تحديث القائمة</button>
                    </div>
                );
            
            case 'Active':
                return activeSubscriptions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up">
                        {activeSubscriptions.map(sub => (
                            <SubscriptionCard key={sub.id} subscription={sub} user={userMap.get(sub.userId)} isActive={true} onCancel={() => handleCancel(sub)} />
                        ))}
                    </div>
                ) : <p className="text-center py-16 text-[var(--text-secondary)]">لا توجد اشتراكات نشطة.</p>;

            case 'Expired':
                 return expiredSubscriptions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up">
                        {expiredSubscriptions.map(sub => <SubscriptionCard key={sub.id} subscription={sub} user={userMap.get(sub.userId)} isActive={false} />)}
                    </div>
                ) : <p className="text-center py-16 text-[var(--text-secondary)]">لا توجد اشتراكات منتهية.</p>;
        }
    };
    
    return (
        <div className="fade-in max-w-7xl mx-auto px-2 pb-24">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-black mb-2 text-[var(--text-primary)]">المالية والاشتراكات</h1>
                    <p className="text-[var(--text-secondary)] font-medium">إدارة طلبات الدفع ومتابعة صلاحيات الطلاب.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => onNavigate?.('subscriptionRequestsDiagnostics')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-sm font-bold transition-colors shadow-sm"
                        title="تشخيص أعطال النظام"
                    >
                        <ShieldExclamationIcon className="w-4 h-4"/> فحص الأعطال
                    </button>
                    <button onClick={refreshData} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors shadow-sm">
                        <ClockIcon className="w-4 h-4"/> تحديث البيانات
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <StatCard title="طلبات الانتظار" value={pendingRequests.length} icon={BellIcon} color="text-amber-500" />
                <StatCard title="اشتراكات نشطة" value={activeSubscriptions.length} icon={CheckCircleIcon} color="text-emerald-500" />
                <StatCard title="اشتراكات منتهية" value={expiredSubscriptions.length} icon={ClockIcon} color="text-red-400" />
            </div>

            {/* Custom Tabs */}
            <div className="flex bg-[var(--bg-tertiary)] p-1.5 rounded-2xl w-fit mb-8 border border-[var(--border-primary)]">
                {(['Pending', 'Active', 'Expired'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === tab ? 'bg-[var(--bg-secondary)] text-[var(--accent-primary)] shadow-md' : 'text-[var(--text-secondary)]'}`}
                    >
                        {tab === 'Pending' ? 'طلبات بانتظار المراجعة' : tab === 'Active' ? 'اشتراكات نشطة' : 'اشتراكات منتهية'}
                    </button>
                ))}
            </div>

            <div className="min-h-[400px]">
                {renderContent()}
            </div>

            <ApprovalModal 
                isOpen={!!approvalRequest} 
                onClose={() => setApprovalRequest(null)} 
                request={approvalRequest} 
                onConfirm={handleApproveConfirm}
            />
        </div>
    );
};

export default SubscriptionManagementView;
