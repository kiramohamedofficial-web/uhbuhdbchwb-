import React, { useState, useEffect, useCallback } from 'react';
import { ToastType } from '../../types';
import { clearUserDevices, supabase, clearAllActiveSessions } from '../../services/storageService';
import { getViolatingAccounts, getLoginHistory, logoutDeviceSession } from '../../services/systemService';
import { useToast } from '../../useToast';
import { HardDriveIcon, TrashIcon, ShieldExclamationIcon, LogoutIcon, UsersIcon, ClockIcon, ServerIcon, CheckCircleIcon, XCircleIcon, CodeIcon, ClipboardIcon } from '../common/Icons';
import Loader from '../common/Loader';
import Modal from '../common/Modal';
import { TableWrapper, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../common/Table';

interface ViolatingUser {
    user_id: string;
    user_name: string;
    user_phone: string | null;
    max_devices: number;
    active_devices: number;
    violation_count: number;
    devices: {
        id: string;
        device_name: string | null;
        device_fingerprint: string;
        last_active_at: string | null;
        created_at: string | null;
    }[];
}

interface HistoryItem {
    user_id: string;
    user_name: string;
    total_logins: number;
    unique_devices_count: number;
    last_login: string;
    devices: {
        id: string;
        device_name: string;
        last_active: string;
        is_active: boolean;
    }[];
}

const DeviceManagementView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'violations' | 'history'>('violations');
    const [violatingUsers, setViolatingUsers] = useState<ViolatingUser[]>([]);
    const [loginHistory, setLoginHistory] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();
    const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
    const [isClearingAll, setIsClearingAll] = useState(false);

    // Missing Functions State
    const [missingFunctions, setMissingFunctions] = useState(false);

    // Expandable row state for history
    const [expandedHistoryUser, setExpandedHistoryUser] = useState<string | null>(null);

    const fetchViolations = useCallback(async () => {
        setIsLoading(true);
        setMissingFunctions(false);
        const { data, error } = await getViolatingAccounts();
        if (error) {
            // Check for missing function error (PGRST202 or 42883)
            if (error.code === '42883' || error.message?.includes('function') || error.code === 'PGRST202') {
                setMissingFunctions(true);
            }
            addToast(`فشل جلب المخالفات: ${error.message}`, ToastType.ERROR);
        } else {
            setViolatingUsers(data || []);
        }
        setIsLoading(false);
    }, [addToast]);

    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await getLoginHistory();
        if (error) {
            if (error.code === '42883' || error.message?.includes('function') || error.code === 'PGRST202') {
                setMissingFunctions(true);
            }
            addToast(`فشل جلب السجل: ${error.message}`, ToastType.ERROR);
        } else {
            setLoginHistory(data || []);
        }
        setIsLoading(false);
    }, [addToast]);

    useEffect(() => {
        if (activeTab === 'violations') fetchViolations();
        else fetchHistory();
    }, [activeTab, fetchViolations, fetchHistory]);

    const handleClearDevices = async (userId: string, userName: string) => {
        if (!confirm(`هل أنت متأكد من تسجيل خروج الطالب ${userName} من جميع الأجهزة؟`)) return;

        const { error } = await clearUserDevices(userId);
        if (error) {
            addToast(`فشل مسح جلسات ${userName}: ${error.message}`, ToastType.ERROR);
        } else {
            addToast(`تم مسح جلسات ${userName} بنجاح.`, ToastType.SUCCESS);
            fetchViolations(); // Refresh list
        }
    };

    const handleLogoutSingleDevice = async (sessionId: string) => {
        const { error } = await logoutDeviceSession(sessionId);
        if (error) {
            addToast('فشل تسجيل خروج الجهاز.', ToastType.ERROR);
        } else {
            addToast('تم تسجيل خروج الجهاز بنجاح.', ToastType.SUCCESS);
            if (activeTab === 'violations') fetchViolations();
            else fetchHistory();
        }
    };

    const handleClearAllDevices = async () => {
        setIsClearingAll(true);
        const { error } = await clearAllActiveSessions();
        if (error) {
            addToast(`فشل تسجيل خروج جميع الأجهزة: ${error.message}`, ToastType.ERROR);
        } else {
            addToast('تم تسجيل خروج جميع الأجهزة النشطة بنجاح.', ToastType.SUCCESS);
            setViolatingUsers([]); // Clear list
        }
        setIsClearingAll(false);
        setIsClearAllModalOpen(false);
    };

    const sqlFixCode = `-- إصلاح نظام الأجهزة (شغّل هذا الكود في SQL Editor)

-- 1. التأكد من وجود الجدول
CREATE TABLE IF NOT EXISTS public.device_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    device_fingerprint TEXT NOT NULL,
    device_name TEXT,
    active BOOLEAN DEFAULT TRUE,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. دالة كشف المخالفات
CREATE OR REPLACE FUNCTION get_violating_accounts()
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_phone text,
  max_devices int,
  active_devices bigint,
  violation_count bigint,
  devices jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.name as user_name,
    p.phone as user_phone,
    2 as max_devices,
    count(ds.id) as active_devices,
    (count(ds.id) - 2) as violation_count,
    jsonb_agg(jsonb_build_object(
      'id', ds.id,
      'device_name', ds.device_name,
      'device_fingerprint', ds.device_fingerprint,
      'last_active_at', ds.last_active_at,
      'created_at', ds.created_at
    )) as devices
  FROM profiles p
  JOIN device_sessions ds ON p.id = ds.user_id
  WHERE ds.active = true
  GROUP BY p.id, p.name, p.phone
  HAVING count(ds.id) > 2;
END;
$$;

-- 3. دالة سجل الدخول
CREATE OR REPLACE FUNCTION get_login_history()
RETURNS TABLE (
  user_id uuid,
  user_name text,
  total_logins bigint,
  unique_devices_count bigint,
  last_login timestamptz,
  devices jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.name as user_name,
    count(ds.id) as total_logins,
    count(DISTINCT ds.device_fingerprint) as unique_devices_count,
    max(ds.last_active_at) as last_login,
    jsonb_agg(jsonb_build_object(
      'id', ds.id,
      'device_name', ds.device_name,
      'last_active', ds.last_active_at,
      'is_active', ds.active
    ) ORDER BY ds.last_active_at DESC) as devices
  FROM profiles p
  JOIN device_sessions ds ON p.id = ds.user_id
  GROUP BY p.id, p.name
  ORDER BY max(ds.last_active_at) DESC
  LIMIT 50;
END;
$$;

-- 4. سياسات الأمان (RLS)
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;
-- حذف السياسات القديمة إن وجدت لتجنب التكرار
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.device_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.device_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.device_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.device_sessions;

CREATE POLICY "Users can insert own sessions" ON public.device_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.device_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own sessions" ON public.device_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all sessions" ON public.device_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
`;

    if (missingFunctions) {
        return (
            <div className="fade-in pb-20 max-w-4xl mx-auto">
                <div className="bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-500 rounded-3xl p-8 text-center shadow-xl">
                    <ShieldExclamationIcon className="w-20 h-20 mx-auto text-amber-500 mb-6" />
                    <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2">إعداد قاعدة البيانات مطلوب</h2>
                    <p className="text-[var(--text-secondary)] mb-6 max-w-lg mx-auto leading-relaxed">
                        يبدو أن الدوال البرمجية (Functions) المسؤولة عن مراقبة الأجهزة غير موجودة في قاعدة البيانات. هذا الأمر طبيعي عند التثبيت لأول مرة.
                    </p>

                    <div className="bg-[#0f172a] rounded-2xl p-6 text-left relative group border border-white/10 mb-6 overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-bold text-amber-500 flex items-center gap-2">
                                <CodeIcon className="w-4 h-4" /> SQL Repair Script
                            </span>
                            <button
                                onClick={() => { navigator.clipboard.writeText(sqlFixCode); addToast('تم نسخ الكود!', ToastType.SUCCESS); }}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                            >
                                <ClipboardIcon className="w-3.5 h-3.5" /> نسخ الكود
                            </button>
                        </div>
                        <pre className="text-sm font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap max-h-60 custom-scrollbar" dir="ltr">
                            {sqlFixCode}
                        </pre>
                    </div>

                    <div className="flex gap-4 justify-center">
                        <button onClick={() => window.open('https://supabase.com/dashboard/project/_/sql', '_blank')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg">
                            فتح Supabase SQL Editor
                        </button>
                        <button onClick={() => { setMissingFunctions(false); fetchViolations(); }} className="px-6 py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-[var(--text-primary)] rounded-xl font-bold transition-all">
                            إعادة المحاولة
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in pb-20">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">مراقبة الأجهزة</h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        إدارة الجلسات النشطة ورصد مخالفات تعدد الدخول.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsClearAllModalOpen(true)}
                        className="flex items-center justify-center space-x-2 space-x-reverse px-4 py-2 font-semibold bg-red-600/20 text-red-300 hover:bg-red-600/40 rounded-lg transition-colors border border-red-500/20"
                    >
                        <LogoutIcon className="w-5 h-5" />
                        <span>تصفية شاملة (Emergency)</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-[var(--bg-tertiary)] rounded-xl w-fit mb-6 border border-[var(--border-primary)]">
                <button
                    onClick={() => setActiveTab('violations')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'violations' ? 'bg-[var(--bg-secondary)] text-red-500 shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    المخالفات الحالية ({violatingUsers.length})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-[var(--bg-secondary)] text-[var(--accent-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    سجل الدخول
                </button>
            </div>

            {isLoading ? (
                <div className="flex flex-col justify-center items-center py-20 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)]">
                    <Loader />
                    <p className="mt-4 text-[var(--text-secondary)] animate-pulse">جاري تحميل البيانات...</p>
                </div>
            ) : activeTab === 'violations' ? (
                violatingUsers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {violatingUsers.map(user => (
                            <div key={user.user_id} className="relative overflow-hidden bg-[var(--bg-secondary)] border border-red-500/30 rounded-xl shadow-lg transition-all hover:shadow-red-500/10 hover:border-red-500/60 group">
                                {/* Indicator Stripe */}
                                <div className="absolute top-0 right-0 w-1.5 h-full bg-red-500"></div>

                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-4 pl-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                                                <UsersIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-[var(--text-primary)] leading-tight">{user.user_name}</h3>
                                                <p className="text-sm text-[var(--text-secondary)] font-mono mt-0.5">{user.user_phone || '---'}</p>
                                            </div>
                                        </div>
                                        <div className="bg-red-500 text-white text-xl font-black w-10 h-10 flex items-center justify-center rounded-lg shadow-sm">
                                            {user.active_devices}
                                        </div>
                                    </div>

                                    <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-lg mb-4 text-sm font-medium space-y-2">
                                        <p className="text-red-700 dark:text-red-300 font-bold text-center border-b border-red-200 dark:border-red-800 pb-2 mb-2">
                                            مخالفة: {user.violation_count} جهاز زائد عن الحد ({user.max_devices}).
                                        </p>
                                        {user.devices.map((dev, idx) => (
                                            <div key={dev.id} className="flex justify-between items-center text-[var(--text-secondary)]">
                                                <span>{dev.device_name || 'جهاز غير معروف'}</span>
                                                <button onClick={() => handleLogoutSingleDevice(dev.id)} className="text-red-500 hover:underline">طرد</button>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => handleClearDevices(user.user_id, user.user_name)}
                                        className="w-full py-2.5 font-bold text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                        تسجيل خروج الجميع
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-[var(--bg-secondary)] rounded-xl border-2 border-dashed border-[var(--border-primary)]">
                        <HardDriveIcon className="w-20 h-20 mx-auto text-[var(--text-secondary)] opacity-20 mb-4" />
                        <h3 className="font-bold text-lg text-[var(--text-primary)]">النظام آمن</h3>
                        <p className="text-[var(--text-secondary)] mt-1">لا يوجد أي مستخدم يتجاوز حد الأجهزة المسموح به حالياً.</p>
                    </div>
                )
            ) : (
                // History View
                <TableWrapper>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>المستخدم</TableHead>
                                <TableHead>إجمالي مرات الدخول</TableHead>
                                <TableHead>أجهزة فريدة</TableHead>
                                <TableHead>آخر نشاط</TableHead>
                                <TableHead>التفاصيل</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loginHistory.map((row) => (
                                <React.Fragment key={row.user_id}>
                                    <TableRow>
                                        <TableCell className="font-bold text-[var(--text-primary)]">{row.user_name}</TableCell>
                                        <TableCell>{row.total_logins}</TableCell>
                                        <TableCell>{row.unique_devices_count}</TableCell>
                                        <TableCell className="dir-ltr text-left font-mono">{new Date(row.last_login).toLocaleString()}</TableCell>
                                        <TableCell>
                                            <button
                                                onClick={() => setExpandedHistoryUser(expandedHistoryUser === row.user_id ? null : row.user_id)}
                                                className="text-[var(--accent-primary)] hover:underline font-bold text-sm"
                                            >
                                                {expandedHistoryUser === row.user_id ? 'إخفاء' : 'عرض الأجهزة'}
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                    {expandedHistoryUser === row.user_id && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="bg-[var(--bg-tertiary)]/30">
                                                <div className="grid gap-2 p-2">
                                                    {row.devices.map(dev => (
                                                        <div key={dev.id} className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] shadow-sm text-sm">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-2.5 h-2.5 rounded-full ${dev.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                                                <span className="font-bold">{dev.device_name || 'Unknown Device'}</span>
                                                                <span className="text-[var(--text-secondary)] font-mono text-xs">({new Date(dev.last_active).toLocaleString('ar-EG')})</span>
                                                            </div>
                                                            {dev.is_active && (
                                                                <button onClick={() => handleLogoutSingleDevice(dev.id)} className="text-red-500 font-bold hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors">تسجيل خروج</button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            ))}
                            {loginHistory.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-[var(--text-secondary)] font-bold">لا يوجد سجل دخول متاح.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableWrapper>
            )}

            <Modal isOpen={isClearAllModalOpen} onClose={() => setIsClearAllModalOpen(false)} title="تأكيد تسجيل الخروج الجماعي">
                <div className="text-center">
                    <ShieldExclamationIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">إجراء حرج!</h3>
                    <p className="text-[var(--text-secondary)] mb-6 text-sm">
                        أنت على وشك <strong>تسجيل خروج جميع المستخدمين</strong> (الطلاب والمدرسين) من المنصة فوراً.<br />
                        سيضطر الجميع لإعادة تسجيل الدخول. هل أنت متأكد؟
                    </p>
                    <div className="flex justify-center gap-3">
                        <button onClick={() => setIsClearAllModalOpen(false)} className="px-6 py-2.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] transition-colors font-bold text-[var(--text-secondary)]">إلغاء</button>
                        <button onClick={handleClearAllDevices} disabled={isClearingAll} className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 transition-colors text-white font-bold shadow-lg disabled:opacity-50">
                            {isClearingAll ? 'جاري التنفيذ...' : 'نعم، تسجيل خروج الجميع'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DeviceManagementView;