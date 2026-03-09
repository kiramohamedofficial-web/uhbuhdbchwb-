
import React, { useState } from 'react';
import { supabase } from '../../services/storageService';
import { useToast } from '../../useToast';
import { ToastType, IconSettings } from '../../types';
import { ArrowRightIcon, PhotoIcon, CheckCircleIcon, XCircleIcon, ShieldExclamationIcon, DatabaseIcon, SparklesIcon, WaveIcon, ShieldCheckIcon, InformationCircleIcon, ClipboardIcon } from '../common/Icons';

// الروابط الافتراضية المضمونة
const REPAIR_DEFAULTS: IconSettings = {
    faviconUrl: 'https://h.top4top.io/p_3583m5j8t0.png',
    mainLogoUrl: 'https://h.top4top.io/p_3583m5j8t0.png',
    welcomeHeroImageUrl: 'https://d.top4top.io/p_3584t5zwf3.png',
    welcomeStatStudentIconUrl: 'https://k.top4top.io/p_3583inhay3.png',
    welcomeStatLessonIconUrl: 'https://j.top4top.io/p_3583kuzn32.png',
    welcomeStatSatisfactionIconUrl: 'https://h.top4top.io/p_3583croib0.png',
    welcomeStatSupportIconUrl: 'https://i.ibb.co/L1pDcnv/support.png',
    welcomeFeatureStatsIconUrl: 'https://f.top4top.io/p_3583e5jv00.png',
    welcomeFeaturePlayerIconUrl: 'https://h.top4top.io/p_3583a5wke2.png',
    welcomeFeatureAiIconUrl: 'https://g.top4top.io/p_358376lzw1.png',
    welcomeFeatureCinemaIconUrl: 'https://h.top4top.io/p_3584kk8d71.png',
    authLoginIconUrl: 'https://h.top4top.io/p_3583m5j8t0.png',
    authRegisterIconUrl: 'https://h.top4top.io/p_3583m5j8t0.png',
    studentNavHomeIconUrl: 'https://k.top4top.io/p_3591rrrv00.png',
    studentNavCurriculumIconUrl: 'https://j.top4top.io/p_3583qcfj42.png',
    studentNavReelsIconUrl: 'https://f.top4top.io/p_3597znq510.png',
    studentNavSubscriptionIconUrl: 'https://k.top4top.io/p_35830gaoq2.png',
    studentNavProfileIconUrl: 'https://l.top4top.io/p_3583el7rr0.png',
    studentNavResultsIconUrl: 'https://www2.0zz0.com/2025/11/02/17/240318741.png',
    studentNavChatbotIconUrl: 'https://b.top4top.io/p_3583ycfjf2.png',
    studentNavCartoonIconUrl: 'https://h.top4top.io/p_3584kk8d71.png',
    studentNavQuestionBankIconUrl: 'https://www2.0zz0.com/2025/11/02/17/635761079.png',
    studentAvatar1Url: "https://k.top4top.io/p_359873dvt0.png",
    studentAvatar2Url: "https://l.top4top.io/p_359858i061.png",
    studentAvatar3Url: "https://a.top4top.io/p_3598lyf3w2.png",
    studentAvatar4Url: "https://b.top4top.io/p_3598yozk03.png",
    studentAvatar5Url: "https://c.top4top.io/p_3598n64m84.png",
    studentAvatar6Url: "https://d.top4top.io/p_3598i9l4m5.png",
    adminNavContentIconUrl: 'https://a.top4top.io/p_3591fcsm53.png',
    adminNavTeacherIconUrl: 'https://l.top4top.io/p_3591st8vz2.png',
    adminNavStudentIconUrl: 'https://l.top4top.io/p_3591vsc7c1.png',
    adminNavHealthIconUrl: 'https://g.top4top.io/p_3584g68tl0.png',
    adminNavCartoonIconUrl: 'https://h.top4top.io/p_3584kk8d71.png',
};

const LogViewer: React.FC<{ logs: string[] }> = ({ logs }) => (
    <div className="mt-4 bg-[#0a0a0a] p-5 rounded-[2rem] h-96 overflow-y-auto font-mono text-[11px] border border-white/5 shadow-inner" dir="ltr">
        {logs.map((log, index) => (
            <p key={index} className={`mb-1.5 leading-relaxed ${log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-emerald-400' : log.includes('📝') ? 'text-blue-400 font-bold' : 'text-gray-500'}`}>
                <span className="opacity-60 mr-2">[{new Date().toLocaleTimeString('en-GB')}]</span>
                {log}
            </p>
        ))}
    </div>
);

interface IconStatus {
    key: string;
    label: string;
    dbValue: string | null;
    status: 'ok' | 'missing' | 'insecure' | 'broken';
}

const IconDiagnosticsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addToast } = useToast();
    const [logs, setLogs] = useState<string[]>(['نظام التشخيص الفائق جاهز للعمل...']);
    const [isScanning, setIsScanning] = useState(false);
    const [isRepairing, setIsRepairing] = useState(false);
    const [isSaveTesting, setIsSaveTesting] = useState(false);
    const [iconStatuses, setIconStatuses] = useState<IconStatus[]>([]);

    const addLog = (log: string) => setLogs(prev => [log, ...prev]);

    const checkUrlAccessibility = async (url: string): Promise<boolean> => {
        try {
            const response = await fetch(url, { mode: 'no-cors' });
            return true;
        } catch (e) {
            return false;
        }
    };

    const runDeepDiagnostics = async () => {
        setIsScanning(true);
        setLogs([]);
        setIconStatuses([]);
        addLog("🚀 بدء الفحص العميق لروابط المنصة...");

        try {
            const { data, error } = await supabase.from('platform_settings').select('icon_settings').limit(1).single();

            if (error) throw new Error(`فشل الاتصال بـ Supabase: ${error.message}`);
            
            const dbSettings = (data?.icon_settings || {}) as Record<string, string>;
            const statuses: IconStatus[] = [];

            const keysToScan = [
                { key: 'mainLogoUrl', label: 'الشعار الرئيسي' },
                { key: 'faviconUrl', label: 'أيقونة المتصفح' },
                { key: 'welcomeHeroImageUrl', label: 'صورة الواجهة' },
                { key: 'authLoginIconUrl', label: 'أيقونة الدخول' },
                { key: 'studentNavHomeIconUrl', label: 'أيقونة الرئيسية' }
            ];

            for (const item of keysToScan) {
                const url = dbSettings[item.key];
                addLog(`🔍 فحص: ${item.label}...`);

                if (!url) {
                    addLog(`❌ ${item.label}: مفقود.`);
                    statuses.push({ key: item.key, label: item.label, dbValue: null, status: 'missing' });
                } else if (!url.startsWith('https')) {
                    addLog(`⚠️ ${item.label}: بروتوكول غير آمن (Mixed Content).`);
                    statuses.push({ key: item.key, label: item.label, dbValue: url, status: 'insecure' });
                } else {
                    const isAlive = await checkUrlAccessibility(url);
                    if (isAlive) {
                        addLog(`✅ ${item.label}: الرابط مستجيب.`);
                        statuses.push({ key: item.key, label: item.label, dbValue: url, status: 'ok' });
                    } else {
                        addLog(`❌ ${item.label}: السيرفر المستضيف لا يستجيب.`);
                        statuses.push({ key: item.key, label: item.label, dbValue: url, status: 'broken' });
                    }
                }
            }

            setIconStatuses(statuses);
            addLog("🏁 اكتمل التحليل الشامل للمنصة.");

        } catch (error: any) {
            addLog(`🚨 خطأ في النظام: ${error.message}`);
        } finally {
            setIsScanning(false);
        }
    };

    const handleSaveTest = async () => {
        setIsSaveTesting(true);
        setLogs([]);
        addLog("📝 بدء اختبار صلاحية الحفظ (Save Write Test)...");

        try {
            addLog("1. جلب الإعدادات الحالية من جدول platform_settings...");
            const { data, error: fetchErr } = await supabase.from('platform_settings').select('id, icon_settings').limit(1).single();
            if (fetchErr) throw fetchErr;

            const originalIcons = (data.icon_settings as Record<string, any>) || {};
            const testTimestamp = new Date().toISOString();
            
            addLog("2. محاولة تحديث حقل تجريبي (_diagnostic_save) في قاعدة البيانات...");
            const { error: updateErr } = await supabase
                .from('platform_settings')
                .update({ 
                    icon_settings: { 
                        ...originalIcons, 
                        _last_diagnostic_save: testTimestamp 
                    } 
                })
                .eq('id', data.id);

            if (updateErr) {
                if (updateErr.code === '42501') {
                    addLog("❌ فشل: خطأ في الصلاحيات (RLS). لا تملك إذن UPDATE لجدول الإعدادات.");
                } else {
                    addLog(`❌ فشل: خطأ في قاعدة البيانات: ${updateErr.message}`);
                }
                throw updateErr;
            }
            addLog("✅ نجاح: تم إرسال البيانات واستلام تأكيد الحفظ من السيرفر.");

            addLog("3. فحص دقة البيانات المحفوظة (Verification Polling)...");
            // Retry fetch to handle eventual consistency
            let verified = false;
            for (let i = 0; i < 3; i++) {
                await new Promise(r => setTimeout(r, 800));
                const { data: verifyData } = await supabase.from('platform_settings').select('icon_settings').eq('id', data.id).single();
                if ((verifyData?.icon_settings as any)?._last_diagnostic_save === testTimestamp) {
                    verified = true;
                    break;
                }
                addLog(`- محاولة التحقق رقم ${i+1}...`);
            }

            if (verified) {
                addLog("✅ مطابقة: البيانات المسترجعة تطابق التوقيت الزمني للاختبار.");
                addToast("اختبار الحفظ نجح تماماً!", ToastType.SUCCESS);
            } else {
                addLog("⚠️ تحذير: لم نتمكن من تأكيد التغيير في الحقل التجريبي. قد يكون هناك تأخير في المزامنة.");
            }

        } catch (e: any) {
            addLog(`❌ فشل الاختبار الفني: ${e.message}`);
            addToast("فشل اختبار الحفظ.", ToastType.ERROR);
        } finally {
            setIsSaveTesting(false);
        }
    };

    const handleSmartRepair = async () => {
        if (!confirm("سيقوم الإصلاح الذكي باستبدال الروابط التالفة فقط بالروابط الافتراضية. هل تود البدء؟")) return;
        
        setIsRepairing(true);
        addLog("🛠️ بدء عملية الإصلاح الذكي...");

        try {
            const { data: current, error: fetchErr } = await supabase.from('platform_settings').select('id, icon_settings').limit(1).single();
            if (fetchErr) throw fetchErr;

            const currentIcons = (current.icon_settings as Record<string, string>) || {};
            const repairedIcons = { ...currentIcons };
            let repairCount = 0;

            Object.keys(REPAIR_DEFAULTS).forEach(key => {
                const k = key as keyof IconSettings;
                if (!currentIcons[k] || currentIcons[k].trim() === "") {
                    repairedIcons[k] = REPAIR_DEFAULTS[k]!;
                    repairCount++;
                }
            });

            if (repairCount > 0) {
                const { error: updateErr } = await supabase
                    .from('platform_settings')
                    .update({ icon_settings: repairedIcons })
                    .eq('id', current.id);

                if (updateErr) throw updateErr;
                addLog(`✅ تم إصلاح ${repairCount} رابط مفقود بنجاح.`);
                addToast("تم الإصلاح الذكي!", ToastType.SUCCESS);
                setTimeout(() => window.location.reload(), 1000);
            } else {
                addLog("ℹ️ لم يتم العثور على روابط مفقودة لإصلاحها.");
            }

        } catch (e: any) {
            addLog(`❌ فشل الإصلاح: ${e.message}`);
        } finally {
            setIsRepairing(false);
        }
    };

    return (
        <div className="fade-in space-y-6 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-purple-500 transition-all">
                        <ArrowRightIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-primary)]">مختبر الصور والأيقونات</h1>
                        <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">Image Connectivity & Security Lab</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <button onClick={runDeepDiagnostics} disabled={isScanning} className="flex-1 md:flex-none px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50">
                        {isScanning ? 'جاري الفحص...' : 'فحص الاتصال'}
                    </button>
                    <button onClick={handleSaveTest} disabled={isSaveTesting} className="flex-1 md:flex-none px-6 py-3 bg-purple-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        {isSaveTesting ? 'جاري الاختبار...' : <><CheckCircleIcon className="w-4 h-4"/> اختبار الحفظ</>}
                    </button>
                    <button onClick={handleSmartRepair} disabled={isRepairing} className="flex-1 md:flex-none px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                        <SparklesIcon className="w-4 h-4"/> إصلاح ذكي
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Detailed Status */}
                <div className="lg:col-span-7 space-y-4">
                    <h3 className="font-black text-sm text-[var(--text-secondary)] uppercase flex items-center gap-2 mb-4">
                        <ShieldCheckIcon className="w-5 h-5 text-emerald-500"/> تقرير الحالة الحية
                    </h3>
                    
                    {iconStatuses.length === 0 ? (
                        <div className="p-20 bg-[var(--bg-secondary)] border-2 border-dashed border-[var(--border-primary)] rounded-[3rem] text-center opacity-70">
                            <PhotoIcon className="w-16 h-16 mx-auto mb-4" />
                            <p className="font-bold">يرجى الضغط على "فحص الاتصال" لتحليل السيرفرات</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {iconStatuses.map(item => (
                                <div key={item.key} className="bg-[var(--bg-secondary)] p-4 rounded-3xl border border-[var(--border-primary)] flex items-center gap-4 transition-all hover:shadow-md">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden border-2 ${item.status === 'ok' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                                        {item.dbValue ? (
                                            <img src={item.dbValue} className="w-full h-full object-contain" onError={(e) => (e.target as HTMLImageElement).src = 'https://placehold.co/100?text=Error'}/>
                                        ) : <XCircleIcon className="w-8 h-8 text-red-500/30" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-sm text-[var(--text-primary)]">{item.label}</h4>
                                        <p className="text-sm font-mono text-[var(--text-secondary)] truncate mt-0.5">{item.dbValue || 'NOT_SET'}</p>
                                    </div>
                                    <div className={`px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-tighter ${
                                        item.status === 'ok' ? 'bg-emerald-500 text-white' : 
                                        item.status === 'insecure' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                                    }`}>
                                        {{ok: 'متصل', insecure: 'غير آمن', broken: 'معطل', missing: 'مفقود'}[item.status]}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Analysis Console */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-[var(--bg-secondary)] p-6 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm">
                        <h3 className="font-black text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            <DatabaseIcon className="w-5 h-5 text-blue-500"/> سجل العمليات التقني
                        </h3>
                        <LogViewer logs={logs} />
                    </div>

                    <div className="bg-purple-600/5 p-8 rounded-[2.5rem] border border-purple-500/20">
                        <h3 className="font-black text-purple-600 mb-3 flex items-center gap-2">
                            <InformationCircleIcon className="w-6 h-6"/> نصيحة الخبير
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
                            لضمان أقصى درجات الاستقرار، يفضل دائماً رفع الصور إلى سلة تخزين **Supabase Storage** الخاصة بالمنصة بدلاً من الروابط الخارجية، حيث تضمن لك سيرفراتنا سرعة تحميل أعلى وتوافقاً كاملاً مع بروتوكولات الأمان.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IconDiagnosticsView;
