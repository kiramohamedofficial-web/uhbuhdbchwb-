import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../services/storageService';
import { useToast } from '../../useToast';
import { analyzeDatabaseStructure, getChatbotResponseStream } from '../../services/geminiService';
import { checkSecurityHardening } from '../../services/systemService';
import { ToastType } from '../../types';
import { 
    ArrowRightIcon, DatabaseIcon, CheckCircleIcon, XCircleIcon, 
    ShieldExclamationIcon, ListIcon, 
    CodeIcon, ClipboardIcon, InformationCircleIcon, SparklesIcon,
    ShieldCheckIcon, LockClosedIcon, ClockIcon
} from '../common/Icons';
import Loader from '../common/Loader';

const FULL_DB_DOCS = `
# 📊 المخطط النموذجي لمنصة Gstudent (Security Hardened)

## 👥 المستخدمين
- **profiles**: id (UUID), name, email, phone, role, grade_id, created_at.
- **teachers**: id (UUID), name, phone, subject, is_special.

## 🛡️ الأمان والتدقيق
- **security_audit_log**: id, actor_id, action, target_id, ip_address, created_at. (Critical for compliance)
- **device_sessions**: لتقييد عدد الأجهزة.

## ⚙️ الدوال المؤمنة
- **admin_update_password**: يجب أن تتحقق من (auth.jwt() ->> 'role' = 'admin').
`;

const DatabaseAuditView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addToast } = useToast();
    const [activeView, setActiveView] = useState<'audit' | 'ai-report' | 'security' | 'docs'>('audit');
    const [isLoading, setIsLoading] = useState(false);
    
    const [auditSummary, setAuditSummary] = useState<any>(null);
    const [securityReport, setSecurityReport] = useState<any>(null);
    const [aiAnalysisResult, setAiAnalysisResult] = useState<string>('');
    const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

    const runSecurityAudit = async () => {
        setIsLoading(true);
        const report = await checkSecurityHardening();
        setSecurityReport(report);
        setIsLoading(false);
        if (report.error) {
            addToast("بعض دوال فحص الأمان مفقودة.", ToastType.WARNING);
        }
    };

    const runDeepAudit = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: allDbTables, error: listError } = await supabase.rpc('list_public_tables');
            if (listError) throw listError;
            setAuditSummary({ tablesFound: (allDbTables as any[]).length });
            addToast("اكتمل المسح الأولي لهيكل البيانات.", ToastType.SUCCESS);
        } catch (e: any) {
            addToast(`خطأ أثناء الفحص: ${e.message}`, ToastType.ERROR);
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    const runAiAudit = async () => {
        if (!process.env.API_KEY) {
            addToast("مفتاح API مفقود.", ToastType.ERROR);
            return;
        }

        setIsAiAnalyzing(true);
        setAiAnalysisResult('');
        
        try {
            // 1. جلب الهيكل الكامل الحالي بدقة
            const { data: allDbTables } = await supabase.rpc('list_public_tables');
            const currentLiveSchema: Record<string, string[]> = {};

            if (Array.isArray(allDbTables)) {
                for (const t of (allDbTables as any[])) {
                    const { data: cols } = await supabase.rpc('get_table_columns', { p_table: t.table_name });
                    if (Array.isArray(cols)) {
                        currentLiveSchema[t.table_name] = cols.map(c => c.column_name);
                    }
                }
            }

            // 2. طلب التحليل من Gemini
            const analysis = await analyzeDatabaseStructure(JSON.stringify(currentLiveSchema), FULL_DB_DOCS);
            setAiAnalysisResult(analysis);
            addToast("تم إنتاج التقرير الذكي.", ToastType.SUCCESS);
            // Fix: Changed setActiveTab to setActiveView to match the state setter defined on line 66.
            setActiveView('ai-report');

        } catch (e: any) {
            addToast(`فشل التحليل الذكي: ${e.message}`, ToastType.ERROR);
        } finally {
            setIsAiAnalyzing(false);
        }
    };

    const hardeningSql = `-- 🔐 Gstudent Security Hardening Script
-- 1. تفعيل مكتبة التشفير
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. إنشاء جدول سجلات الأمان (Audit Log)
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_id UUID,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. تفعيل RLS لجدول السجلات (للمدير فقط)
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins only audit view" ON public.security_audit_log 
FOR SELECT USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- 4. دالة فحص وجود الجداول (للمدقق)
CREATE OR REPLACE FUNCTION check_table_exists(p_table text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = p_table AND table_schema = 'public');
END; $$;

-- 5. دالة فحص حالة RLS (للمدقق)
CREATE OR REPLACE FUNCTION check_rls_status()
RETURNS TABLE (table_name text, rls_enabled boolean) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT relname::text, relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r';
END; $$;
`;

    return (
        <div className="fade-in space-y-6 pb-20 max-w-6xl mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-purple-500 transition-all">
                        <ArrowRightIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-primary)]">هيكل قاعدة البيانات</h1>
                        <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">Audit & Security Hardening</p>
                    </div>
                </div>
                <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-primary)] shadow-sm overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveView('audit')} className={`px-6 py-2 rounded-lg text-sm font-black transition-all whitespace-nowrap ${activeView === 'audit' ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-secondary)]'}`}>الجداول</button>
                    <button onClick={() => { setActiveView('security'); runSecurityAudit(); }} className={`px-6 py-2 rounded-lg text-sm font-black transition-all whitespace-nowrap ${activeView === 'security' ? 'bg-red-600 text-white shadow-md' : 'text-[var(--text-secondary)]'}`}>تحصين الأمان 🛡️</button>
                    <button onClick={() => setActiveView('ai-report')} className={`px-6 py-2 rounded-lg text-sm font-black transition-all whitespace-nowrap ${activeView === 'ai-report' ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-secondary)]'}`}>تحليل AI</button>
                    <button onClick={() => setActiveView('docs')} className={`px-6 py-2 rounded-lg text-sm font-black transition-all whitespace-nowrap ${activeView === 'docs' ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-secondary)]'}`}>التوثيق</button>
                </div>
            </header>

            {activeView === 'security' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`p-6 rounded-[2.5rem] border shadow-lg flex items-center justify-between ${securityReport?.auditLogEnabled ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${securityReport?.auditLogEnabled ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                    <ListIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-black text-[var(--text-primary)]">Security Audit Log</h3>
                                    <p className="text-sm text-[var(--text-secondary)] font-bold">{securityReport?.auditLogEnabled ? 'مفعل ويعمل ✅' : 'غير موجود ❌'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 rounded-[2.5rem] bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-lg">
                            <h3 className="font-black mb-4 flex items-center gap-2"><LockClosedIcon className="w-5 h-5 text-indigo-500"/> حالة حماية الجداول (RLS)</h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                {securityReport?.rlsStatus?.map((s: any) => (
                                    <div key={s.table_name} className="flex justify-between items-center p-2 bg-[var(--bg-tertiary)] rounded-xl text-sm font-bold">
                                        <span className="font-mono">{s.table_name}</span>
                                        {s.rls_enabled ? <span className="text-emerald-500">PROTECTED</span> : <span className="text-red-500 animate-pulse">VULNERABLE</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#0f172a] rounded-[3rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 blur-[100px] pointer-events-none"></div>
                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <div className="flex items-center gap-3">
                                <ShieldExclamationIcon className="w-8 h-8 text-red-500" />
                                <div>
                                    <h2 className="text-xl font-black text-white">إصلاح وتحصين قاعدة البيانات</h2>
                                    <p className="text-sm text-slate-400 font-bold">قم بتشغيل هذا الكود لتفعيل "سجل التدقيق" و"دوال الفحص الأمنية".</p>
                                </div>
                            </div>
                            <button onClick={() => { navigator.clipboard.writeText(hardeningSql); addToast("تم نسخ الكود", ToastType.SUCCESS); }} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl flex items-center gap-2 border border-white/10 transition-all">
                                <ClipboardIcon className="w-5 h-5" /> <span className="text-sm font-black">نسخ الكود</span>
                            </button>
                        </div>
                        <pre className="bg-black/40 p-6 rounded-2xl text-sm font-mono text-emerald-400 leading-relaxed overflow-x-auto max-h-80 custom-scrollbar border border-white/5" dir="ltr">
                            {hardeningSql}
                        </pre>
                    </div>
                </div>
            )}

            {activeView === 'audit' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? <div className="col-span-full py-20 flex justify-center"><Loader /></div> : (
                        auditSummary?.tablesFound ? (
                            <div className="col-span-full text-center py-20 bg-[var(--bg-secondary)] rounded-[3rem] border border-[var(--border-primary)] shadow-sm">
                                <CheckCircleIcon className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                                <h3 className="text-2xl font-black">تم العثور على {auditSummary.tablesFound} جدول</h3>
                                <p className="text-[var(--text-secondary)] font-bold mt-2">انتقل لتبويب "تحصين الأمان" لفحص الثغرات.</p>
                            </div>
                        ) : (
                            <div className="col-span-full text-center py-20">
                                <DatabaseIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <button onClick={runDeepAudit} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all">بدء فحص الهيكل</button>
                            </div>
                        )
                    )}
                </div>
            )}

            {activeView === 'ai-report' && (
                <div className="animate-fade-in">
                    {isAiAnalyzing ? <div className="py-32 flex flex-col items-center gap-6"><div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div><p className="font-black">Gemini يقوم بتحليل الأمان...</p></div> : (
                        aiAnalysisResult ? (
                             <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[3rem] shadow-2xl p-8 overflow-hidden">
                                <div className="prose prose-sm md:prose-lg dark:prose-invert max-w-none font-bold text-[var(--text-primary)] leading-loose">
                                    <div dangerouslySetInnerHTML={{ __html: aiAnalysisResult.replace(/\n/g, '<br/>') }} />
                                </div>
                             </div>
                        ) : <div className="py-32 text-center"><button onClick={runAiAudit} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl flex items-center gap-3 mx-auto"><SparklesIcon className="w-6 h-6"/> بدء التحليل الذكي</button></div>
                    )}
                </div>
            )}

            {activeView === 'docs' && (
                <div className="bg-[var(--bg-secondary)] p-8 md:p-12 rounded-[3rem] border border-[var(--border-primary)] shadow-sm">
                    <h2 className="text-2xl font-black text-indigo-600 mb-6">الدليل المرجعي للأمان</h2>
                    <div className="prose prose-sm dark:prose-invert max-w-none font-bold text-[var(--text-secondary)] leading-loose text-right" dir="rtl">
                        <div dangerouslySetInnerHTML={{ __html: FULL_DB_DOCS.replace(/\n/g, '<br/>') }} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatabaseAuditView;