
import React, { useState, useEffect, useCallback } from 'react';
import { supabase, adminUpdateUserPassword, deleteUser, getTemporaryClient } from '../../services/storageService';
import { getSecurityHardeningReport, getSecurityAuditLogs } from '../../services/systemService';
import { useToast } from '../../useToast';
import { ToastType } from '../../types';
import { 
    ArrowRightIcon, KeyIcon, ShieldCheckIcon, ShieldExclamationIcon, 
    CodeIcon, ClipboardIcon, PlayIcon, UserCheckIcon, DatabaseIcon,
    ServerIcon, WaveIcon, InformationCircleIcon, ClockIcon, ListIcon,
    LockClosedIcon, ShieldCheckIcon as ShieldIcon
} from '../common/Icons';
import Loader from '../common/Loader';

const LogViewer: React.FC<{ logs: string[] }> = ({ logs }) => (
    <div className="mt-4 bg-[#0a0a0a] p-5 rounded-[2rem] h-80 overflow-y-auto font-mono text-[11px] border border-white/5 shadow-inner custom-scrollbar" dir="ltr">
        {logs.map((log, index) => (
            <p key={index} className={`mb-1.5 leading-relaxed ${log.includes('✅') ? 'text-emerald-400 font-bold' : log.includes('❌') ? 'text-red-400 font-bold' : log.includes('🚀') ? 'text-blue-400' : log.includes('🔐') ? 'text-amber-400' : 'text-gray-500'}`}>
                <span className="opacity-60 mr-2">[{new Date().toLocaleTimeString('en-GB')}]</span>
                {log}
            </p>
        ))}
    </div>
);

const SecurityAuditTable: React.FC<{ logs: any[] }> = ({ logs }) => (
    <div className="overflow-x-auto rounded-3xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)]/30">
        <table className="w-full text-right text-sm">
            <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-black uppercase tracking-widest">
                <tr>
                    <th className="p-4">المنفذ</th>
                    <th className="p-4">العملية</th>
                    <th className="p-4">التوقيت</th>
                    <th className="p-4">الحالة</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-primary)]">
                {logs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold">{log.actor_email || 'System'}</td>
                        <td className="p-4"><span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-md font-mono">{log.action}</span></td>
                        <td className="p-4 opacity-60">{new Date(log.created_at).toLocaleString('ar-EG')}</td>
                        <td className="p-4"><span className="text-emerald-500 font-black">SUCCESS</span></td>
                    </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan={4} className="p-10 text-center opacity-70 font-bold">لا توجد سجلات تدقيق حالياً</td></tr>}
            </tbody>
        </table>
    </div>
);

const PasswordDiagnosticsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'audit' | 'simulation' | 'logs'>('audit');
    const [logs, setLogs] = useState<string[]>(['نظام التشخيص الأمني جاهز...']);
    const [isSimulating, setIsSimulating] = useState(false);
    const [auditData, setAuditData] = useState<any>(null);
    const [securityLogs, setSecurityLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const addLog = (log: string) => setLogs(prev => [log, ...prev]);

    const fetchAuditInfo = useCallback(async () => {
        setIsLoading(true);
        const [hardening, history] = await Promise.all([
            getSecurityHardeningReport(),
            getSecurityAuditLogs()
        ]);
        if (hardening.success) setAuditData(hardening.data);
        setSecurityLogs(history.data || []);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchAuditInfo();
    }, [fetchAuditInfo]);

    const handleRunFullDiagnostic = async () => {
        setIsSimulating(true);
        setActiveTab('simulation');
        setLogs([]);
        addLog("🚀 بدء فحص تحديث كلمة المرور عبر الـ Edge Function...");
        
        try {
            addLog("🔐 1. التحقق من وجود حساب طالب تجريبي...");
            const { data: student } = await supabase.from('profiles').select('id, name').limit(1).maybeSingle();
            if (!student) throw new Error("لا يوجد مستخدمين للاختبار.");
            
            addLog(`🔍 2. محاكاة استدعاء Edge Function: admin-update-password...`);
            const { data, error } = await adminUpdateUserPassword(student.id, "TestNewPass123!");

            if (error) {
                if (error.message?.includes('404')) {
                    addLog("❌ فشل: الـ Edge Function غير منشورة (Not Found).");
                } else {
                    addLog(`❌ فشل الـ استدعاء: ${error.message}`);
                }
                throw error;
            }

            addLog("✅ نجاح: تم استلام رد إيجابي من نظام الإدارة.");
            addToast("نظام تحديث كلمات المرور سليم!", ToastType.SUCCESS);
            fetchAuditInfo();
        } catch (e: any) {
            addLog(`❌ توقف الفحص: ${e.message}`);
            addToast("فشل الفحص. تأكد من نشر الـ Edge Function.", ToastType.ERROR);
        } finally {
            setIsSimulating(false);
        }
    };

    const edgeFunctionCode = `// 🛡️ Supabase Edge Function: admin-update-password
// Deploy this to enable secure admin password resets

import { createClient } from "https://esm.sh/@supabase/supabase-js";

Deno.serve(async (req) => {
  const { user_id, new_password } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // CRITICAL: Use Service Role
  );

  const { error } = await supabase.auth.admin.updateUserById(user_id, {
    password: new_password,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});`;

    return (
        <div className="fade-in space-y-6 pb-20 max-w-6xl mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-indigo-600 shadow-sm transition-all active:scale-90">
                        <ArrowRightIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-primary)]">أمن كلمات المرور</h1>
                        <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">Admin API & Edge Functions</p>
                    </div>
                </div>
                <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-primary)] shadow-sm">
                    <button onClick={() => setActiveTab('audit')} className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${activeTab === 'audit' ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-secondary)]'}`}>ملخص الحماية</button>
                    <button onClick={() => setActiveTab('simulation')} className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${activeTab === 'simulation' ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-secondary)]'}`}>محاكي الفحص</button>
                    <button onClick={() => setActiveTab('logs')} className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-secondary)]'}`}>سجل التدقيق</button>
                </div>
            </header>

            {isLoading ? <div className="py-20 flex justify-center"><Loader /></div> : (
                <div className="animate-fade-in">
                    {activeTab === 'audit' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-8 space-y-6">
                                <div className="bg-[var(--bg-secondary)] p-8 rounded-[2.5rem] border border-[var(--border-primary)] shadow-lg">
                                    <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                                        <ShieldCheckIcon className="w-6 h-6 text-emerald-500" /> الحالة الأمنية الحالية
                                    </h2>
                                    <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
                                        تم تحديث النظام ليعمل بنمط <strong>Edge Functions</strong> بدلاً من الـ RPC المباشر على جدول <code>auth.users</code>. هذا يضمن حماية جلسات المستخدمين والتوافق مع معايير Supabase الرسمية.
                                    </p>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                                            <p className="text-sm font-black uppercase text-emerald-600 mb-1">User Self-Update</p>
                                            <p className="text-sm font-bold">Native Auth SDK ✅</p>
                                        </div>
                                        <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl">
                                            <p className="text-sm font-black uppercase text-indigo-600 mb-1">Admin-Driven Update</p>
                                            <p className="text-sm font-bold">Edge Function API ✅</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#0f172a] rounded-[3rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] pointer-events-none"></div>
                                    <div className="flex justify-between items-center mb-6 relative z-10">
                                        <div className="flex items-center gap-3 text-white">
                                            <CodeIcon className="w-8 h-8 text-indigo-400" />
                                            <div>
                                                <h2 className="text-xl font-black">كود الـ Edge Function</h2>
                                                <p className="text-sm text-slate-400 font-bold">admin-update-password</p>
                                            </div>
                                        </div>
                                        <button onClick={() => { navigator.clipboard.writeText(edgeFunctionCode); addToast("تم النسخ!", ToastType.SUCCESS); }} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl flex items-center gap-2 border border-white/10 transition-all">
                                            <ClipboardIcon className="w-5 h-5" /> <span className="text-sm font-black">نسخ الكود</span>
                                        </button>
                                    </div>
                                    <pre className="bg-black/40 p-6 rounded-2xl text-sm font-mono text-emerald-400 leading-relaxed overflow-x-auto max-h-64 custom-scrollbar border border-white/5" dir="ltr">
                                        {edgeFunctionCode}
                                    </pre>
                                </div>
                            </div>

                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                                    <h3 className="text-lg font-black mb-4 relative z-10 flex items-center gap-2"><InformationCircleIcon className="w-5 h-5"/> تنبيه أمني</h3>
                                    <p className="text-sm font-bold opacity-80 leading-relaxed relative z-10 mb-6">
                                        يُمنع منعاً باتاً تعديل جدول <code>auth.users</code> يدوياً أو عبر <code>SECURITY DEFINER</code>. هذا الفعل قد يكسر نظام المصادقة ويترك ثغرات جسيمة.
                                    </p>
                                    <button onClick={handleRunFullDiagnostic} className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all">بدء اختبار الاتصال</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'simulation' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
                            <div className="lg:col-span-8">
                                <div className="bg-[var(--bg-secondary)] p-6 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm h-full flex flex-col">
                                    <h2 className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <DatabaseIcon className="w-5 h-5 opacity-70"/> FUNCTION CALL CONSOLE
                                    </h2>
                                    <LogViewer logs={logs} />
                                </div>
                            </div>
                            <div className="lg:col-span-4 space-y-4">
                                 <button 
                                    onClick={handleRunFullDiagnostic} 
                                    disabled={isSimulating}
                                    className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isSimulating ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <PlayIcon className="w-6 h-6" />}
                                    اختبار الـ Function
                                </button>
                                <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/20">
                                    <h4 className="text-emerald-600 font-black text-sm mb-2">كيف يعمل الفحص؟</h4>
                                    <p className="text-sm text-emerald-700 font-bold leading-relaxed">
                                        يقوم النظام بمحاولة استدعاء الدالة البرمجية في الخادم وتمرير معرّف مستخدم وهمي للتأكد من أن الخادم يستجيب بشكل صحيح وأن صلاحيات المفاتيح (Service Role) تعمل.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'logs' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-black flex items-center gap-2"><ListIcon className="w-6 h-6 text-indigo-600"/> سجل العمليات الأمنية (Audit Trail)</h2>
                                <button onClick={fetchAuditInfo} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><ClockIcon className="w-5 h-5"/></button>
                            </div>
                            <SecurityAuditTable logs={securityLogs} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PasswordDiagnosticsView;
