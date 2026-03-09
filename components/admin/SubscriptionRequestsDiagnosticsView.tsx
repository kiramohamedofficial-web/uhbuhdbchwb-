
import React, { useState, useCallback } from 'react';
import { supabase } from '../../services/storageService';
import { useToast } from '../../useToast';
import { ToastType } from '../../types';
import { 
    ArrowRightIcon, CreditCardIcon, CheckCircleIcon, XCircleIcon, 
    ShieldExclamationIcon, DatabaseIcon, CodeIcon, ClipboardIcon, 
    PlayIcon, SearchIcon, InformationCircleIcon, PlusIcon, UserIcon
} from '../common/Icons';

const LogViewer: React.FC<{ logs: string[] }> = ({ logs }) => (
    <div className="mt-4 bg-[#0a0a0a] p-5 rounded-[2rem] h-96 overflow-y-auto font-mono text-[11px] border border-white/5 shadow-inner custom-scrollbar" dir="ltr">
        {logs.map((log, index) => (
            <p key={index} className={`mb-1.5 leading-relaxed ${log.includes('✅') ? 'text-emerald-400 font-bold' : log.includes('❌') ? 'text-red-400 font-bold' : log.includes('🔍') ? 'text-blue-400' : log.includes('🛠️') ? 'text-purple-400' : 'text-gray-500'}`}>
                <span className="opacity-60 mr-2">[{new Date().toLocaleTimeString('en-GB')}]</span>
                {log}
            </p>
        ))}
    </div>
);

const SubscriptionRequestsDiagnosticsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addToast } = useToast();
    const [logs, setLogs] = useState<string[]>(['جاهز لبدء فحص نظام طلبات الاشتراك...']);
    const [isSimulating, setIsSimulating] = useState(false);
    const [showFix, setShowFix] = useState(false);

    const addLog = (log: string) => setLogs(prev => [log, ...prev]);

    const sqlRepairCode = `-- كود الإصلاح الجذري لعلاقة جلب الطلبات (SQL)
-- انسخ هذا الكود وشغله في SQL Editor لحل مشكلة "Could not find a relationship"

-- 1. التأكد من وجود عمود user_id في جدول subscription_requests_temp
-- 2. إضافة قيد المفتاح الأجنبي (Foreign Key) لربط الطلب ببروفايل الطالب
ALTER TABLE IF EXISTS public.subscription_requests_temp 
DROP CONSTRAINT IF EXISTS subscription_requests_temp_user_id_fkey;

ALTER TABLE public.subscription_requests_temp 
ADD CONSTRAINT subscription_requests_temp_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- 3. تفعيل الـ Realtime للجدول
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_requests_temp;

-- 4. إصلاح أذونات الإرسال (Policies)
ALTER TABLE public.subscription_requests_temp ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can create requests" ON public.subscription_requests_temp;
CREATE POLICY "Users can create requests" ON public.subscription_requests_temp FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view/update requests" ON public.subscription_requests_temp;
CREATE POLICY "Admins can view/update requests" ON public.subscription_requests_temp 
FOR ALL 
USING ( (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor') );
`;

    // 1. READ CHECK
    const handleRunDiagnostic = async () => {
        setIsSimulating(true);
        setLogs([]);
        setShowFix(false);
        addLog("🚀 بدء فحص قراءة الطلبات (Read Check)...");

        try {
            // 1. Basic Connection
            addLog("🔍 1. فحص الاتصال بجدول subscription_requests_temp...");
            const { count, error: connError } = await supabase.from('subscription_requests_temp').select('*', { count: 'exact', head: true });
            if (connError) throw new Error(`فشل الاتصال: ${connError.message}`);
            addLog(`✅ الجدول موجود ويحتوي على ${count} طلبات.`);

            // 2. Schema Check
            addLog("🔍 2. فحص هيكل الأعمدة المطلوبة...");
            const { data: sample, error: schemaError } = await supabase.from('subscription_requests_temp').select('*').limit(1);
            if (schemaError) throw schemaError;
            
            if (sample && sample.length > 0) {
                const cols = Object.keys(sample[0]);
                const required = ['user_id', 'plan', 'status', 'payment_from_number'];
                const missing = required.filter(c => !cols.includes(c));
                if (missing.length > 0) throw new Error(`أعمدة مفقودة: ${missing.join(', ')}`);
                addLog("✅ هيكل الأعمدة سليم.");
            } else {
                addLog("ℹ️ الجدول فارغ، لا يمكن فحص الأعمدة تلقائياً.");
            }

            // 3. Join Logic Check (CRITICAL)
            addLog("🔍 3. اختبار الربط البرمجي (Join) مع جدول Profiles...");
            const { error: joinError } = await supabase
                .from('subscription_requests_temp')
                .select('id, profiles:user_id(email)')
                .limit(1);

            if (joinError) {
                addLog(`❌ فشل الربط البرمجي (Join Error): ${joinError.message}`);
                addLog("⚠️ السبب الرئيسي: قاعدة البيانات لا تملك Foreign Key يربط الطلب بالحساب.");
                setShowFix(true);
                throw new Error("Missing Database Relationship");
            }
            addLog("✅ تم التحقق من نجاح عملية الربط المباشر.");

            addLog("\n🏁 اكتمل فحص نظام القراءة بنجاح!");
            addToast("نظام عرض الطلبات سليم", ToastType.SUCCESS);

        } catch (e: any) {
            addLog(`❌ فشل الفحص: ${e.message}`);
            setShowFix(true);
            addToast("تم رصد خلل في النظام.", ToastType.ERROR);
        } finally {
            setIsSimulating(false);
        }
    };

    // 2. WRITE CHECK (New Feature)
    const handleSimulateSubmission = async () => {
        setIsSimulating(true);
        setLogs([]);
        addLog("👤 بدء محاكاة: طالب يرسل طلب اشتراك (Write Check)...");

        try {
            // A. Get a valid student ID
            addLog("🔍 1. البحث عن حساب طالب صالح للاختبار...");
            const { data: student, error: userError } = await supabase
                .from('profiles')
                .select('id, name')
                .limit(1)
                .maybeSingle();

            if (userError) throw new Error(`فشل جلب طالب: ${userError.message}`);
            if (!student) throw new Error("لا يوجد طلاب في قاعدة البيانات لإجراء الاختبار عليهم.");

            addLog(`✅ تم اختيار الطالب: ${student.name} (ID: ${student.id})`);

            // B. Prepare Payload
            const dummyPayment = "010TEST" + Math.floor(Math.random() * 1000);
            const payload = {
                user_id: student.id,
                user_name: "Test User (Diagnostic)",
                plan: 'Monthly',
                payment_from_number: dummyPayment, // Ensure this column name matches DB
                status: 'Pending',
                subject_name: 'Diagnostic Test'
            };

            addLog(`📥 2. محاولة إرسال الطلب (INSERT) برقم: ${dummyPayment}...`);
            
            // Try Insert
            const { data: inserted, error: insertError } = await supabase
                .from('subscription_requests_temp')
                .insert(payload)
                .select()
                .single();

            if (insertError) {
                addLog(`❌ العطل هنا! فشل الإدراج: ${insertError.message}`);
                if (insertError.code === '42501') {
                     addLog("⚠️ تحليل العطل: خطأ في الصلاحيات (RLS). سياسة الأمان تمنع الإضافة.");
                } else if (insertError.code === '23503') {
                     addLog("⚠️ تحليل العطل: مفتاح أجنبي (Foreign Key) غير صحيح.");
                } else if (insertError.message.includes('column')) {
                     addLog("⚠️ تحليل العطل: اسم العمود غير صحيح (ربما payment_number vs payment_from_number).");
                }
                setShowFix(true);
                throw insertError;
            }

            addLog(`✅ نجاح! تم استقبال الطلب في قاعدة البيانات (ID: ${inserted.id}).`);

            // C. Cleanup
            addLog("🧹 3. تنظيف البيانات (حذف الطلب التجريبي)...");
            await supabase.from('subscription_requests_temp').delete().eq('id', inserted.id);
            addLog("✅ تم الحذف. دورة الإرسال تعمل بنجاح.");
            
            addToast("نظام إرسال الطلبات يعمل بنجاح!", ToastType.SUCCESS);

        } catch (e: any) {
            addLog(`❌ النتيجة: عملية الإرسال فشلت.`);
            addToast("فشل اختبار الإرسال", ToastType.ERROR);
        } finally {
            setIsSimulating(false);
        }
    };

    return (
        <div className="fade-in space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-blue-500 transition-all shadow-sm active:scale-90">
                        <ArrowRightIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">فحص طلبات الاشتراك</h1>
                        <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">Financial Requests Diagnostic Lab</p>
                    </div>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                    <button 
                        onClick={() => setShowFix(!showFix)}
                        className={`flex-1 md:flex-none px-5 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-[2rem] font-black text-sm transition-all hover:bg-[var(--border-primary)] ${showFix ? 'ring-2 ring-purple-500' : ''}`}
                    >
                        {showFix ? 'إخفاء الحل' : 'كود الإصلاح'}
                    </button>
                    
                    {/* New Simulation Button */}
                    <button 
                        onClick={handleSimulateSubmission} 
                        disabled={isSimulating}
                        className="flex-1 md:flex-none px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-[2rem] font-black text-sm shadow-xl shadow-purple-500/30 transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSimulating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <PlusIcon className="w-4 h-4" />}
                        <span>محاكاة طلب طالب</span>
                    </button>

                    <button 
                        onClick={handleRunDiagnostic} 
                        disabled={isSimulating}
                        className="flex-1 md:flex-none px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-black text-sm shadow-xl shadow-blue-500/30 transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSimulating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <PlayIcon className="w-4 h-4" />}
                        <span>فحص الجلب</span>
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Info Panel */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[var(--bg-secondary)] p-8 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm">
                        <h2 className="text-xl font-black text-[var(--text-primary)] mb-6 flex items-center gap-3">
                            <CreditCardIcon className="w-6 h-6 text-blue-500" /> مخرجات الفحص
                        </h2>
                        
                        <div className="space-y-4">
                            {[
                                { label: 'سلامة جدول subscription_requests_temp', icon: DatabaseIcon, color: 'text-indigo-500' },
                                { label: 'تجربة إرسال طلب (INSERT)', icon: UserIcon, color: 'text-purple-500' },
                                { label: 'علاقة الربط مع Profiles', icon: InformationCircleIcon, color: 'text-blue-500' },
                                { label: 'صلاحيات جلب البريد الإلكتروني', icon: ShieldExclamationIcon, color: 'text-emerald-500' },
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
                                    <div className={`p-2 rounded-xl bg-white/10 ${item.color}`}>
                                        <item.icon className="w-5 h-5"/>
                                    </div>
                                    <span className="text-[11px] font-black text-[var(--text-primary)]">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {showFix && (
                        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2.5rem] animate-fade-in">
                            <h3 className="text-red-500 font-black text-sm mb-3 flex items-center gap-2">
                                <ShieldExclamationIcon className="w-5 h-5"/> حل مشكلة العطل
                            </h3>
                            <p className="text-sm text-red-800 dark:text-red-200 font-bold mb-4">
                                إذا فشل الفحص، غالباً ما تكون المشكلة في غياب العلاقة (Foreign Key) أو صلاحيات RLS. انسخ الكود وشغله في Supabase SQL Editor.
                            </p>
                            <button 
                                onClick={() => { navigator.clipboard.writeText(sqlRepairCode); addToast("تم نسخ الكود!", ToastType.SUCCESS); }}
                                className="w-full py-3 bg-red-600 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-lg hover:bg-red-700 transition-colors"
                            >
                                <ClipboardIcon className="w-4 h-4"/> نسخ كود الإصلاح الجذري
                            </button>
                        </div>
                    )}
                </div>

                {/* Log Console */}
                <div className="lg:col-span-8">
                    <div className="bg-[var(--bg-secondary)] p-6 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm h-full flex flex-col">
                        <h3 className="font-black text-sm text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <DatabaseIcon className="w-5 h-5 opacity-70"/> تقرير الفحص المالي
                        </h3>
                        <LogViewer logs={logs} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionRequestsDiagnosticsView;
