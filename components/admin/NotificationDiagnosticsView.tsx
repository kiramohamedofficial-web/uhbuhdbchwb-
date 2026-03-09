
import React, { useState, useEffect } from 'react';
import { useToast } from '../../useToast';
import { ToastType } from '../../types';
import { ArrowRightIcon, BellIcon, CheckCircleIcon, XCircleIcon, ServerIcon, WifiIcon, InformationCircleIcon, DatabaseIcon, CodeIcon, ClipboardIcon } from '../common/Icons';
import { supabase } from '../../services/storageService';

const NotificationDiagnosticsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addToast } = useToast();
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
    const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connecting' | 'connected' | 'error'>('unknown');

    useEffect(() => {
        if ("Notification" in window) {
            setPermissionStatus(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        if (!("Notification" in window)) {
            addToast("المتصفح لا يدعم الإشعارات.", ToastType.ERROR);
            return;
        }
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission);
        if (permission === 'granted') {
            addToast("تم منح صلاحية الإشعارات!", ToastType.SUCCESS);
        } else {
            addToast("تم رفض صلاحية الإشعارات.", ToastType.WARNING);
        }
    };

    const sendTestBrowserNotification = () => {
        if (permissionStatus !== 'granted') {
            addToast("يجب منح الصلاحية أولاً.", ToastType.ERROR);
            return;
        }
        try {
            new Notification("تجربة إشعار Gstudent", {
                body: "هذا إشعار تجريبي للتأكد من وصول التنبيهات للجهاز.",
                icon: 'https://j.top4top.io/p_3584uziv73.png',
                dir: 'rtl',
                requireInteraction: false
            });
        } catch (e) {
            console.error(e);
            addToast("حدث خطأ أثناء إرسال الإشعار للنظام.", ToastType.ERROR);
        }
    };

    const sendTestInAppToast = () => {
        addToast("هذا هو شكل التنبيه الداخلي عند إضافة محتوى جديد.", ToastType.INFO);
    };

    const testRealtimeConnection = async () => {
        setConnectionStatus('connecting');
        const channel = supabase.channel('test-connection');
        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                setConnectionStatus('connected');
                addToast("الاتصال بخادم الإشعارات ناجح!", ToastType.SUCCESS);
                supabase.removeChannel(channel);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                setConnectionStatus('error');
                addToast("فشل الاتصال بخادم الإشعارات.", ToastType.ERROR);
                supabase.removeChannel(channel);
            }
        });
    };

    const sqlFixCode = `-- تفعيل الإشعارات للجداول المطلوبة
-- انسخ هذا الكود وشغله في Supabase SQL Editor لحل مشكلة الإشعارات الفارغة

-- 1. تفعيل Realtime للجداول الأساسية
ALTER PUBLICATION supabase_realtime ADD TABLE public.lessons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cartoon_movies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cartoon_episodes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.movie_requests;

-- 2. التأكد من صلاحيات القراءة للعامة (مهم لوصول الإشعار)
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Lessons" ON public.lessons FOR SELECT USING (true);

ALTER TABLE public.cartoon_movies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Movies" ON public.cartoon_movies FOR SELECT USING (true);
`;

    return (
        <div className="fade-in pb-10">
            <button onClick={onBack} className="flex items-center space-x-2 space-x-reverse mb-6 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <ArrowRightIcon className="w-4 h-4" />
                <span>العودة إلى فحص الأعطال</span>
            </button>
            <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">تشخيص نظام الإشعارات</h1>
            <p className="mb-8 text-[var(--text-secondary)]">أدوات متقدمة للتحقق من وصول الإشعارات واتصال الخادم.</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Permissions & Browser Check */}
                <div className="bg-[var(--bg-secondary)] p-6 rounded-xl shadow-lg border border-[var(--border-primary)]">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                        <BellIcon className="w-6 h-6 text-yellow-500" />
                        صلاحيات المتصفح
                    </h2>
                    
                    <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-lg mb-6">
                        <span className="font-semibold text-[var(--text-secondary)]">حالة الإذن:</span>
                        <div className="flex items-center gap-2">
                            {permissionStatus === 'granted' ? <CheckCircleIcon className="w-5 h-5 text-green-500"/> : 
                             permissionStatus === 'denied' ? <XCircleIcon className="w-5 h-5 text-red-500"/> : 
                             <span className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></span>}
                            <span className={`font-bold uppercase ${permissionStatus === 'granted' ? 'text-green-500' : permissionStatus === 'denied' ? 'text-red-500' : 'text-yellow-500'}`}>
                                {permissionStatus === 'default' ? 'غير محدد' : permissionStatus}
                            </span>
                        </div>
                    </div>

                    <button 
                        onClick={requestPermission} 
                        disabled={permissionStatus === 'granted'}
                        className="w-full py-3 font-semibold bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {permissionStatus === 'granted' ? 'الصلاحية ممنوحة ✅' : permissionStatus === 'denied' ? 'تم الرفض (يجب التفعيل من إعدادات الموقع)' : 'طلب الصلاحية'}
                    </button>

                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-300">
                        <p className="flex gap-2">
                            <InformationCircleIcon className="w-4 h-4 flex-shrink-0" />
                            <span>تأكد أن وضع "عدم الإزعاج" (Do Not Disturb) مغلق في جهازك.</span>
                        </p>
                    </div>
                </div>

                {/* 2. Simulation Tests */}
                <div className="bg-[var(--bg-secondary)] p-6 rounded-xl shadow-lg border border-[var(--border-primary)]">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                        <CheckCircleIcon className="w-6 h-6 text-green-500" />
                        محاكاة الإرسال
                    </h2>
                    <div className="space-y-3">
                        <button 
                            onClick={sendTestBrowserNotification} 
                            disabled={permissionStatus !== 'granted'}
                            className="w-full py-3 font-semibold bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-[var(--text-primary)] rounded-lg transition-all border border-[var(--border-primary)] disabled:opacity-50"
                        >
                            1. إرسال إشعار متصفح (System)
                        </button>
                        <button 
                            onClick={sendTestInAppToast} 
                            className="w-full py-3 font-semibold bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-[var(--text-primary)] rounded-lg transition-all border border-[var(--border-primary)]"
                        >
                            2. إرسال تنبيه داخل التطبيق (Toast)
                        </button>
                        <button 
                            onClick={testRealtimeConnection}
                            className="w-full py-3 font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all"
                        >
                            3. اختبار الاتصال بالخادم (Realtime)
                        </button>
                        <div className="mt-2 text-center text-sm font-bold text-[var(--text-secondary)]">
                             الحالة: <span className={connectionStatus === 'connected' ? 'text-green-500' : 'text-amber-500'}>{connectionStatus === 'connected' ? 'متصل' : connectionStatus}</span>
                        </div>
                    </div>
                </div>

                {/* 4. Database Requirements Instructions */}
                <div className="col-span-1 lg:col-span-2 bg-[var(--bg-secondary)] p-6 rounded-xl shadow-lg border border-[var(--border-primary)]">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                        <DatabaseIcon className="w-6 h-6 text-blue-400" />
                        حل مشكلة "عدم وصول الإشعارات"
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                        إذا كانت الإشعارات لا تعمل عند إضافة درس أو فيلم جديد، فهذا يعني أن جداول قاعدة البيانات غير مربوطة بخدمة Realtime. قم بنسخ الكود التالي وتشغيله في Supabase SQL Editor:
                    </p>
                    <div className="relative group">
                        <div className="bg-black/80 p-4 rounded-lg border border-gray-700">
                            <pre className="text-sm text-green-400 font-mono overflow-x-auto whitespace-pre-wrap dir-ltr text-left">
                                {sqlFixCode}
                            </pre>
                        </div>
                        <button 
                            onClick={() => { navigator.clipboard.writeText(sqlFixCode); addToast("تم نسخ الكود!", ToastType.SUCCESS); }}
                            className="absolute top-2 right-2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-colors"
                            title="نسخ الكود"
                        >
                            <ClipboardIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-sm text-red-400 mt-3 font-bold flex items-center gap-2">
                        <CodeIcon className="w-4 h-4" />
                        هذا الإجراء إلزامي لكي تعمل التنبيهات التلقائية.
                    </p>
                </div>

            </div>
        </div>
    );
};

export default NotificationDiagnosticsView;
