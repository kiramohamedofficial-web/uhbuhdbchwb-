/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║        مساعد استدعاء Edge Functions من Next.js           ║
 * ║               edgeFunctionsClient.ts                     ║
 * ╚══════════════════════════════════════════════════════════╝
 * 
 * يُستخدم هذا الملف لاستدعاء Supabase Edge Functions
 * من داخل مكونات React / Next.js مباشرة
 */

import { supabase } from './storageService';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://csipsaucwcuserhfrehn.supabase.co';

type EdgeFunctionName =
    | 'send-verification-email'
    | 'verify-email-code'
    | 'create-supervisor'
    | 'delete-supervisor';

interface EdgeFunctionOptions {
    method?: 'GET' | 'POST' | 'DELETE';
    body?: Record<string, unknown>;
    withAuth?: boolean; // إرسال Token المستخدم الحالي
}

/**
 * ✅ استدعاء Edge Function مع إدارة الأخطاء وإرسال Auth Token تلقائياً
 */
export const callEdgeFunction = async <T = unknown>(
    functionName: EdgeFunctionName,
    options: EdgeFunctionOptions = {}
): Promise<{ data: T | null; error: string | null }> => {
    const { method = 'POST', body, withAuth = true } = options;

    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // إلحاق Auth Token من الجلسة الحالية
        if (withAuth) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
        }

        const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                data: null,
                error: result.error || `HTTP ${response.status}: فشل الاستدعاء`,
            };
        }

        return { data: result as T, error: null };

    } catch (err) {
        console.error(`Edge Function "${functionName}" error:`, err);
        return {
            data: null,
            error: 'حدث خطأ في الاتصال بالخادم. يرجى التحقق من الاتصال بالإنترنت.',
        };
    }
};

// ✅ دوال مُختصرة لكل Edge Function

/** إرسال كود التحقق */
export const sendVerificationEmailEdge = (email: string, name: string) =>
    callEdgeFunction<{ success: boolean; code: string; expiresAt: string }>(
        'send-verification-email',
        { body: { email, name }, withAuth: false }
    );

/** التحقق من الكود */
export const verifyEmailCodeEdge = (
    email: string,
    code: string,
    storedCode?: string,
    expiresAt?: string
) =>
    callEdgeFunction<{ success: boolean; message?: string; error?: string }>(
        'verify-email-code',
        { body: { email, code, storedCode, expiresAt }, withAuth: false }
    );

/** إنشاء مشرف (Admin فقط) */
export const createSupervisorEdge = (data: {
    name: string;
    email: string;
    password?: string;
    teacherIds?: string[];
}) =>
    callEdgeFunction<{ success: boolean; userId: string; message: string }>(
        'create-supervisor',
        { body: data, withAuth: true }
    );

/** حذف مشرف (Admin فقط) */
export const deleteSupervisorEdge = (supervisorId: string) =>
    callEdgeFunction<{ success: boolean; message: string }>(
        'delete-supervisor',
        { body: { supervisorId }, withAuth: true }
    );
