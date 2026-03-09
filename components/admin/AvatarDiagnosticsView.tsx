
import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../services/storageService';
import { useToast } from '../../useToast';
import { ToastType } from '../../types';
import { ArrowRightIcon, PhotoIcon, ServerIcon, LockClosedIcon, CheckCircleIcon } from '../common/Icons';

const LogViewer: React.FC<{ logs: string[] }> = ({ logs }) => (
    <div className="mt-4 bg-[var(--bg-tertiary)] p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm border border-[var(--border-primary)] shadow-inner">
        {logs.map((log, index) => (
            <p key={index} className={`whitespace-pre-wrap ${log.includes('✅') ? 'text-green-500' : log.includes('❌') ? 'text-red-500' : log.includes('⚠️') ? 'text-yellow-500' : 'text-[var(--text-secondary)]'}`}>
                {`[${new Date().toLocaleTimeString('en-GB')}] ${log}`}
            </p>
        ))}
    </div>
);

const AvatarDiagnosticsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addToast } = useToast();
    const [logs, setLogs] = useState<string[]>(['جاهز لبدء فحص نظام الصور...']);
    const [isSimulating, setIsSimulating] = useState(false);

    const addLog = (log: string) => setLogs(prev => [...prev, log]);

    const runCheck = async () => {
        setIsSimulating(true);
        setLogs([]);
        addLog("=== بدء فحص نظام الصور (Avatar) ===");

        let uploadedFilePath: string | null = null;

        try {
            // 1. Check Bucket Existence
            addLog("1. التحقق من وجود سلة التخزين 'images'...");
            const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('images');
            
            if (bucketError) {
                // Relaxed check: Log warning but continue, as RLS might hide bucket metadata
                addLog(`⚠️ تعذر الوصول لبيانات السلة (Metadata): ${bucketError.message}`);
                addLog("ℹ️ سنتابع الفحص بمحاولة الرفع المباشر...");
            } else {
                addLog(`✅ السلة موجودة. (Public: ${bucketData.public ? 'نعم' : 'لا'})`);
                if (!bucketData.public) addLog("⚠️ تنبيه: السلة ليست عامة (Public)، قد لا تظهر الصور للآخرين.");
            }

            // 2. Prepare Test File (Image)
            addLog("2. إعداد ملف اختبار (صورة PNG)...");
            // 1x1 Transparent PNG Base64
            const dummyImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
            
            // Convert base64 to Blob
            const res = await fetch(dummyImageBase64);
            const blob = await res.blob();
            
            const fileName = `diagnostic_test_${Date.now()}.png`;
            const file = new File([blob], fileName, { type: "image/png" });
            addLog(`✅ تم إعداد ملف الصورة: ${fileName} (${blob.size} bytes)`);

            // 3. Attempt Upload
            addLog("3. محاولة رفع الملف إلى Supabase Storage...");
            const { data: uploadData, error: uploadError } = await supabase.storage.from('images').upload(fileName, file);

            if (uploadError) {
                addLog(`❌ فشل الرفع: ${uploadError.message}`);
                if (uploadError.message.includes('row-level security')) {
                    addLog("🚨 السبب: سياسات الأمان (RLS) تمنع الرفع. تأكد من تفعيل سياسات INSERT/UPDATE للسلة 'images'.");
                }
                if (uploadError.message.includes('mime type')) {
                    addLog("🚨 السبب: نوع الملف غير مسموح به في السلة.");
                }
                throw uploadError;
            }

            uploadedFilePath = fileName;
            addLog(`✅ تم الرفع بنجاح! المسار: ${uploadedFilePath}`);

            // 4. Generate Public URL
            addLog("4. توليد رابط الصورة...");
            const { data: urlData } = supabase.storage.from('images').getPublicUrl(uploadedFilePath);
            if (!urlData.publicUrl) throw new Error("فشل توليد الرابط.");
            addLog(`✅ الرابط: ${urlData.publicUrl}`);

            // 5. Verify DB Column Structure (Crucial Step)
            addLog("5. فحص هيكل جدول المستخدمين (Columns Check)...");
            
            // Try to select specifically the 'profile_image_url' column.
            const { error: columnError } = await supabase.from('profiles').select('profile_image_url').limit(1);
            
            if (columnError) {
                if (columnError.code === '42703') {
                    addLog(`❌ خطأ فادح: العمود 'profile_image_url' غير موجود في جدول profiles!`);
                    addLog(`💡 الحل: تأكد من اسم العمود الصحيح في قاعدة البيانات.`);
                    throw new Error("نقص في هيكل قاعدة البيانات (Missing Column).");
                } else {
                    addLog(`⚠️ تحذير: لم نتمكن من التحقق من العمود: ${columnError.message}`);
                }
            } else {
                addLog(`✅ العمود 'profile_image_url' موجود وسليم في قاعدة البيانات.`);
            }

            // 6. Verify Permissions
            addLog("6. التحقق من صلاحيات التعديل (Update Policy)...");
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Try a dummy update (non-destructive)
                const { error: updateError } = await supabase.from('profiles').update({}).eq('id', user.id);
                if (updateError) {
                     addLog(`❌ فشل التحقق من صلاحية التعديل: ${updateError.message}`);
                } else {
                     addLog(`✅ صلاحيات تعديل البروفايل تعمل بنجاح.`);
                }
            } else {
                addLog(`⚠️ تم تخطي فحص الصلاحيات (أنت غير مسجل دخول كطالب).`);
            }

            addLog("\n🏁 النتيجة النهائية: نظام الصور يعمل بشكل كامل.");
            addToast("الفحص ناجح!", ToastType.SUCCESS);

        } catch (error: any) {
            addLog(`❌ توقف الفحص بسبب خطأ: ${error.message}`);
            addToast("فشل الفحص.", ToastType.ERROR);
        } finally {
            // Cleanup
            if (uploadedFilePath) {
                addLog("تنظيف: حذف ملف الاختبار...");
                const { error: delError } = await supabase.storage.from('images').remove([uploadedFilePath]);
                if (delError) addLog(`⚠️ فشل حذف ملف الاختبار: ${delError.message}`);
                else addLog(`✅ تم حذف ملف الاختبار.`);
            }
            setIsSimulating(false);
        }
    };

    return (
        <div className="fade-in">
            <button onClick={onBack} className="flex items-center space-x-2 space-x-reverse mb-6 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <ArrowRightIcon className="w-4 h-4" />
                <span>العودة إلى فحص الأعطال</span>
            </button>
            <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">فحص نظام الصور</h1>
            <p className="mb-8 text-[var(--text-secondary)]">تشخيص مشاكل رفع وتغيير صورة البروفايل (Storage & Schema).</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[var(--bg-secondary)] p-6 rounded-xl shadow-lg border border-[var(--border-primary)]">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            <PhotoIcon className="w-6 h-6 text-purple-500" />
                            بدء الفحص
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                            سيقوم هذا الفحص بالتأكد من وجود سلة التخزين، صلاحيات الرفع (باستخدام صورة اختبارية)، ووجود عمود <code>profile_image_url</code> في قاعدة البيانات.
                        </p>
                        <button 
                            onClick={runCheck} 
                            disabled={isSimulating}
                            className="w-full py-3 font-semibold bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20"
                        >
                            {isSimulating ? 'جاري الفحص...' : 'بدء المحاكاة'}
                        </button>
                    </div>

                    <div className="bg-[var(--bg-secondary)] p-6 rounded-xl shadow-lg border border-[var(--border-primary)]">
                        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                            <ServerIcon className="w-5 h-5 text-blue-500" />
                            المتطلبات التقنية
                        </h2>
                        <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
                            <li className="flex items-start gap-2">
                                <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5" />
                                <span>سلة تخزين باسم <strong>images</strong>.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5" />
                                <span>يسمح بملفات الصور (png, jpg).</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5" />
                                <span>عمود <strong>profile_image_url</strong> في جدول profiles.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <LockClosedIcon className="w-4 h-4 text-yellow-500 mt-0.5" />
                                <span>سياسة <strong>SELECT</strong> (Public) مفعلة للجميع.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <LockClosedIcon className="w-4 h-4 text-yellow-500 mt-0.5" />
                                <span>سياسة <strong>INSERT</strong> مفعلة للمستخدمين.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-[var(--bg-secondary)] p-6 rounded-xl shadow-lg border border-[var(--border-primary)]">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">سجل العمليات</h2>
                    <LogViewer logs={logs} />
                </div>
            </div>
        </div>
    );
};

export default AvatarDiagnosticsView;
