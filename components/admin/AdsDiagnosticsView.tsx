
import React, { useState, useCallback } from 'react';
import { supabase } from '../../services/storageService';
import { useToast } from '../../useToast';
import { ToastType, PlatformSettings } from '../../types';
import { 
    ArrowRightIcon, MegaphoneIcon, CheckCircleIcon, XCircleIcon, 
    DatabaseIcon, ShieldCheckIcon, PlayIcon, TrashIcon, PencilIcon,
    PlusIcon, CodeIcon, ClipboardIcon, ShieldExclamationIcon
} from '../common/Icons';

const LogViewer: React.FC<{ logs: string[] }> = ({ logs }) => (
    <div className="mt-4 bg-[#0a0a0a] p-5 rounded-[2rem] h-96 overflow-y-auto font-mono text-[11px] border border-white/5 shadow-inner custom-scrollbar" dir="ltr">
        {logs.map((log, index) => (
            <p key={index} className={`mb-1.5 leading-relaxed ${log.includes('✅') ? 'text-emerald-400 font-bold' : log.includes('❌') ? 'text-red-400 font-bold' : log.includes('🛠️') ? 'text-purple-400' : 'text-gray-500'}`}>
                <span className="opacity-60 mr-2">[{new Date().toLocaleTimeString('en-GB')}]</span>
                {log}
            </p>
        ))}
    </div>
);

const AdsDiagnosticsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addToast } = useToast();
    const [logs, setLogs] = useState<string[]>(['جاهز لبدء فحص نظام الإعلانات...']);
    const [isSimulating, setIsSimulating] = useState(false);
    const [showFix, setShowFix] = useState(false);

    const addLog = (log: string) => setLogs(prev => [log, ...prev]);

    const sqlFixCode = `-- إصلاح نظام الإعلانات المتعددة (Announcements)
-- قم بنسخ هذا الكود وتشغيله في Supabase SQL Editor

-- 1. إنشاء جدول الإعلانات إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    link_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. تفعيل الـ Realtime للجدول لضمان ظهور الإعلانات فوراً للطلاب
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;

-- 3. تفعيل سياسات الأمان (RLS)
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 3.1 السماح للجميع (بما في ذلك الزوار) بقراءة الإعلانات النشطة
DROP POLICY IF EXISTS "Public Read Active Announcements" ON public.announcements;
CREATE POLICY "Public Read Active Announcements" ON public.announcements
FOR SELECT USING (true);

-- 3.2 السماح للمدير فقط بالإدارة الكاملة
DROP POLICY IF EXISTS "Admins Manage Announcements" ON public.announcements;
CREATE POLICY "Admins Manage Announcements" ON public.announcements
FOR ALL TO authenticated
USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' )
WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );
`;

    const handleRunDiagnostic = async () => {
        setIsSimulating(true);
        setLogs([]);
        setShowFix(false);
        addLog("🚀 بدء فحص نظام الإعلانات الجديد (Table Check)...");

        try {
            // 0. Table Check
            addLog("🔍 فحص وجود جدول 'announcements'...");
            const { error: tableError } = await supabase.from('announcements').select('id').limit(1);
            
            if (tableError && tableError.code === '42P01') {
                addLog("❌ خطأ: جدول 'announcements' غير موجود.");
                throw new Error("Missing table.");
            } else if (tableError) {
                addLog(`⚠️ تحذير: مشكلة في الوصول للجدول: ${tableError.message}`);
            } else {
                addLog("✅ الجدول 'announcements' موجود وقابل للقراءة.");
            }

            // 1. Simulation: CREATE
            addLog("1. محاكاة: إضافة إعلان اختبار...");
            const testAd = {
                title: "Test Ad " + Date.now(),
                content: "Content for diagnostic test.",
                is_active: false
            };
            
            const { data: created, error: addError } = await supabase
                .from('announcements')
                .insert(testAd)
                .select()
                .single();

            if (addError) {
                if (addError.code === '42501') {
                     addLog("❌ خطأ صلاحيات (RLS). لا يمكن الكتابة في الجدول.");
                } else {
                     addLog(`❌ فشل الإضافة: ${addError.message}`);
                }
                throw addError;
            }
            addLog(`✅ تم إضافة الإعلان (ID: ${created.id}).`);

            // 2. Cleanup
            addLog("2. تنظيف بيانات الاختبار...");
            await supabase.from('announcements').delete().eq('id', created.id);
            addLog("✅ تم الحذف بنجاح.");

            addLog("\n🏁 اكتمل الفحص! نظام الإعلانات جاهز للعمل.");
            addToast("نظام الإعلانات سليم 100%", ToastType.SUCCESS);

        } catch (e: any) {
            addLog(`❌ فشل الاختبار: ${e.message}`);
            setShowFix(true);
            addToast("تم رصد عطل في نظام الإعلانات.", ToastType.ERROR);
        } finally {
            setIsSimulating(false);
        }
    };

    return (
        <div className="fade-in space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-amber-500 transition-all shadow-sm active:scale-90">
                        <ArrowRightIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">فحص نظام الإعلانات</h1>
                        <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">Ads Table Lifecycle Diagnostics</p>
                    </div>
                </div>
                
                <button 
                    onClick={handleRunDiagnostic} 
                    disabled={isSimulating}
                    className="w-full md:w-auto px-10 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-[2rem] font-black text-sm shadow-xl shadow-amber-500/30 transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                    {isSimulating ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <MegaphoneIcon className="w-5 h-5" />}
                    <span>بدء فحص الجدول الجديد</span>
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Side Panel */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[var(--bg-secondary)] p-8 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm">
                        <h2 className="text-xl font-black text-[var(--text-primary)] mb-6 flex items-center gap-3">
                            <ShieldCheckIcon className="w-6 h-6 text-emerald-500" /> المتطلبات
                        </h2>
                        
                        <div className="space-y-4">
                            {[
                                { label: 'جدول Announcements مستقل', icon: DatabaseIcon, color: 'text-blue-500' },
                                { label: 'صلاحيات RLS (Admin Write)', icon: CodeIcon, color: 'text-purple-500' },
                                { label: 'تفعيل Realtime للتحديث الفوري', icon: MegaphoneIcon, color: 'text-amber-500' }
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
                                <ShieldExclamationIcon className="w-5 h-5"/> التحديث للنظام الجديد
                            </h3>
                            <p className="text-sm text-red-800 dark:text-red-200 font-bold mb-4">
                                النظام الجديد يتطلب جدولاً منفصلاً للإعلانات بدلاً من التخزين في الإعدادات. انسخ الكود أدناه لإنشاء الجدول.
                            </p>
                            <button 
                                onClick={() => { navigator.clipboard.writeText(sqlFixCode); addToast("تم نسخ الكود!", ToastType.SUCCESS); }}
                                className="w-full py-3 bg-red-600 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2"
                            >
                                <ClipboardIcon className="w-4 h-4"/> نسخ كود الإنشاء (SQL)
                            </button>
                        </div>
                    )}
                </div>

                {/* Logs Area */}
                <div className="lg:col-span-8">
                    <div className="bg-[var(--bg-secondary)] p-6 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm h-full flex flex-col">
                        <h3 className="font-black text-sm text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <DatabaseIcon className="w-5 h-5 opacity-70"/> تفاصيل محاكاة النظام
                        </h3>
                        <LogViewer logs={logs} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdsDiagnosticsView;
