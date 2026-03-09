
import React, { useState } from 'react';
import { supabase } from '../../services/storageService';
import { generateSubscriptionCodes, validateSubscriptionCode, deleteSubscriptionCode } from '../../services/subscriptionService';
import { useToast } from '../../useToast';
import { ToastType } from '../../types';
import { ArrowRightIcon, QrcodeIcon, CheckCircleIcon, ShieldCheckIcon, ServerIcon, LinkIcon, SearchIcon, BugAntIcon, PlayIcon, VideoCameraIcon, CodeIcon, ClipboardIcon } from '../common/Icons';

const LogViewer: React.FC<{ logs: string[] }> = ({ logs }) => (
    <div className="mt-4 bg-[var(--bg-tertiary)] p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm border border-[var(--border-primary)] shadow-inner custom-scrollbar" dir="ltr">
        {logs.map((log, index) => (
            <p key={index} className={`whitespace-pre-wrap mb-2 font-medium ${log.includes('✅') ? 'text-green-600 dark:text-green-400' : log.includes('❌') ? 'text-red-600 dark:text-red-400' : log.includes('ℹ️') ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--text-secondary)]'}`}>
                <span className="opacity-50 text-sm mr-2 select-none">[{new Date().toLocaleTimeString('en-GB')}]</span>
                {log}
            </p>
        ))}
    </div>
);

const SubscriptionCodeDiagnosticsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addToast } = useToast();
    const [logs, setLogs] = useState<string[]>(['جاهز لبدء فحص نظام التفعيل...']);
    const [isSimulating, setIsSimulating] = useState(false);
    const [showSqlFix, setShowSqlFix] = useState(false);
    
    const [targetCode, setTargetCode] = useState('');
    const [isInspecting, setIsInspecting] = useState(false);

    const addLog = (log: string) => setLogs(prev => [log, ...prev]);

    const sqlFixCode = `-- SQL FIX FOR SUBSCRIPTION CODES
-- Run this in Supabase SQL Editor

-- 1. Optimized validation function
CREATE OR REPLACE FUNCTION validate_subscription_code_usage(p_code text, p_user_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code_record RECORD;
BEGIN
  SELECT * INTO v_code_record FROM subscription_codes WHERE upper(code) = upper(p_code);
  
  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'الكود غير موجود');
  END IF;
  
  IF p_user_id IS NOT NULL AND p_user_id = ANY(v_code_record.used_by_user_ids) THEN
     RETURN json_build_object('valid', false, 'error', 'لقد استخدمت هذا الكود من قبل');
  END IF;

  IF v_code_record.times_used >= v_code_record.max_uses THEN
    RETURN json_build_object('valid', false, 'error', 'تم استنفاد عدد مرات استخدام الكود');
  END IF;
  
  RETURN json_build_object(
    'valid', true, 
    'duration_days', v_code_record.duration_days, 
    'teacher_id', v_code_record.teacher_id,
    'description', 'كود تفعيل صالح'
  );
END;
$$;

-- 2. New usage function for one-step activation
CREATE OR REPLACE FUNCTION use_subscription_code(p_code text, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_record RECORD;
BEGIN
  SELECT * INTO v_code_record FROM subscription_codes WHERE code = UPPER(BTRIM(p_code));

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'الكود غير موجود');
  END IF;

  IF p_user_id = ANY(COALESCE(v_code_record.used_by_user_ids, ARRAY[]::uuid[])) THEN
    RETURN json_build_object('success', false, 'error', 'لقد استخدمت هذا الكود من قبل');
  END IF;

  IF v_code_record.times_used >= v_code_record.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'تم استنفاد الكود');
  END IF;

  UPDATE subscription_codes
  SET 
    times_used = times_used + 1,
    used_by_user_ids = array_append(COALESCE(used_by_user_ids, ARRAY[]::uuid[]), p_user_id)
  WHERE code = UPPER(BTRIM(p_code));

  RETURN json_build_object(
    'success', true,
    'duration_days', v_code_record.duration_days,
    'teacher_id', v_code_record.teacher_id
  );
END;
$$;`;

    // --- FEATURE 1: INSPECT SPECIFIC CODE ---
    const handleInspectCode = async () => {
        if (!targetCode.trim()) {
            addToast("الرجاء إدخال الكود للفحص", ToastType.ERROR);
            return;
        }

        setIsInspecting(true);
        setShowSqlFix(false);
        setLogs([]); 
        const codeToTest = targetCode.trim();

        addLog(`🔍 === بدء فحص الكود: "${codeToTest}" ===`);

        try {
            addLog("1. جاري البحث في قاعدة البيانات (Direct Query)...");
            const { data: dbCode, error: dbError } = await supabase
                .from('subscription_codes')
                .select('*')
                .ilike('code', codeToTest)
                .maybeSingle();

            if (dbError) {
                addLog(`❌ خطأ في الاتصال بقاعدة البيانات: ${dbError.message}`);
                return;
            }

            if (!dbCode) {
                addLog(`❌ الكود غير موجود نهائياً في جدول الأكواد.`);
                return;
            }

            addLog(`✅ الكود موجود في النظام.`);
            addLog(`   - مرات الاستخدام: ${dbCode.times_used} / ${dbCode.max_uses}`);
            addLog(`   - المستخدمين المسجلين: ${dbCode.used_by_user_ids?.length || 0}`);

            addLog("2. اختبار الدالة البرمجية (RPC: validate_subscription_code_usage)...");
            
            const { data: result, error: rpcError } = await supabase.rpc('validate_subscription_code_usage', { p_code: dbCode.code });

            if (rpcError) {
                addLog(`❌ خطأ في استدعاء الدالة: ${rpcError.message}`);
                if (rpcError.message.includes('does not exist')) {
                    setShowSqlFix(true);
                }
            } else if (result) {
                if (result.valid) {
                    addLog(`✅ الدالة تعمل وترجع نتيجة إيجابية.`);
                } else {
                    addLog(`⚠️ الدالة تعمل ولكنها رفضت الكود: ${result.error}`);
                }
            }

        } catch (e: any) {
            addLog(`❌ حدث خطأ غير متوقع: ${e.message}`);
        } finally {
            setIsInspecting(false);
        }
    };

    // --- FEATURE 2: FULL CYCLE TEST ---
    const handleRunFullCycle = async () => {
        setIsSimulating(true);
        setShowSqlFix(false);
        setLogs([]);
        let createdCode: string | null = null;

        const cleanup = async () => {
            if (createdCode) {
                addLog(`🗑️ تنظيف: جاري حذف الكود التجريبي...`);
                await deleteSubscriptionCode(createdCode);
            }
        };

        try {
            addLog("🚀 === بدء اختبار نظام التفعيل الكامل ===");
            addLog("1. محاولة توليد كود جديد...");
            const { data: codes, error: genError } = await generateSubscriptionCodes({ 
                count: 1, 
                durationType: 'monthly', 
                maxUses: 1,
                description: 'DIAGNOSTIC_TEST'
            });
            
            if (genError || !codes || codes.length === 0) {
                throw new Error(`فشل إنشاء الكود: ${genError?.message}`);
            }
            
            createdCode = codes[0].code;
            addLog(`✅ تم إنشاء كود تجريبي: [ ${createdCode} ]`);

            addLog("2. اختبار التفعيل البرمجي عبر RPC...");
            const { data: result, error: valError } = await validateSubscriptionCode(createdCode);

            if (valError) {
                setShowSqlFix(true);
                throw new Error(`فشل استدعاء RPC: ${valError.message}`);
            }
            
            if (result && result.valid) {
                addLog(`✅ نجاح! الكود صالح للمدة: ${result.duration_days} يوم.`);
                addToast("نظام الأكواد سليم!", ToastType.SUCCESS);
            } else {
                addLog(`❌ فشل التفعيل: ${result?.error || 'سبب مجهول'}`);
                throw new Error("RPC returned invalid for a fresh code.");
            }

        } catch (error: any) {
            addLog(`❌ فشل الاختبار: ${error.message}`);
            addToast(`فشل الاختبار: ${error.message}`, ToastType.ERROR);
        } finally {
            await cleanup();
            setIsSimulating(false);
        }
    };

    return (
        <div className="fade-in space-y-6">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="flex items-center space-x-2 space-x-reverse text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                    <ArrowRightIcon className="w-4 h-4" />
                    <span>العودة إلى فحص الأعطال</span>
                </button>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2 flex items-center gap-3">
                        <QrcodeIcon className="w-8 h-8 text-purple-500" />
                        فحص نظام التفعيل
                    </h1>
                    <p className="text-[var(--text-secondary)]">أدوات تشخيصية لمعرفة سبب تعطل الأكواد واختبار دورة التفعيل.</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl shadow-lg border border-[var(--border-primary)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-bl-[3rem]"></div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2 relative z-10">
                            <BugAntIcon className="w-5 h-5 text-purple-500" />
                            اختبار الدورة الكاملة
                        </h2>
                        <button 
                            onClick={handleRunFullCycle} 
                            disabled={isSimulating}
                            className="w-full py-4 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSimulating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><PlayIcon className="w-4 h-4"/> بدء الفحص الشامل</>}
                        </button>
                    </div>

                    <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl shadow-lg border border-[var(--border-primary)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-[3rem]"></div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2 relative z-10">
                            <SearchIcon className="w-5 h-5 text-blue-500" />
                            فحص كود معطل
                        </h2>
                        <div className="space-y-3">
                            <input 
                                type="text" 
                                value={targetCode}
                                onChange={(e) => setTargetCode(e.target.value)}
                                placeholder="ادخل الكود هنا..."
                                className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-center font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                            />
                            <button 
                                onClick={handleInspectCode} 
                                disabled={isInspecting || !targetCode}
                                className="w-full py-3 font-bold bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isInspecting ? 'جاري الفحص...' : 'تشخيص سبب العطل'}
                            </button>
                        </div>
                    </div>

                    {showSqlFix && (
                        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl animate-fade-in">
                            <h3 className="text-amber-600 font-black text-sm mb-2 flex items-center gap-2">
                                <CodeIcon className="w-5 h-5"/> كود إصلاح SQL
                            </h3>
                            <p className="text-sm text-amber-800 dark:text-amber-200 mb-4 font-bold">انسخ هذا الكود وقم بتشغيله في SQL Editor بسوبابيس لإصلاح الدوال المفقودة أو القديمة.</p>
                            <button 
                                onClick={() => { navigator.clipboard.writeText(sqlFixCode); addToast("تم نسخ الكود!", ToastType.SUCCESS); }}
                                className="w-full py-2 bg-amber-500 text-white rounded-lg text-sm font-black flex items-center justify-center gap-2"
                            >
                                <ClipboardIcon className="w-4 h-4"/> نسخ كود الإصلاح
                            </button>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-8">
                     <div className="bg-[var(--bg-secondary)] p-1 rounded-2xl shadow-lg border border-[var(--border-primary)] h-full flex flex-col">
                        <div className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center bg-[var(--bg-tertiary)]/30 rounded-t-2xl">
                            <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <ServerIcon className="w-5 h-5 text-gray-400" />
                                سجل العمليات والنتائج
                            </h3>
                        </div>
                        <div className="flex-1 p-2">
                            <LogViewer logs={logs} />
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionCodeDiagnosticsView;
