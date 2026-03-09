// Supabase Edge Function: verify-email-code
// التحقق من كود التحقق الذي أدخله المستخدم
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req: Request) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Content-Type': 'application/json',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
    }

    try {
        const { email, code, storedCode, expiresAt } = await req.json();

        if (!email || !code) {
            return new Response(
                JSON.stringify({ error: 'البريد الإلكتروني والكود مطلوبان' }),
                { status: 400, headers }
            );
        }

        // ✅ طريقة 1: التحقق من الكود المُمرر مباشرة (بدون DB)
        if (storedCode && expiresAt) {
            const now = new Date();
            const expiry = new Date(expiresAt);

            if (now > expiry) {
                return new Response(
                    JSON.stringify({ success: false, error: 'انتهت صلاحية الكود. يرجى طلب كود جديد.' }),
                    { status: 200, headers }
                );
            }

            if (code.trim() !== storedCode.trim()) {
                return new Response(
                    JSON.stringify({ success: false, error: 'الكود غير صحيح. يرجى التأكد والمحاولة مرة أخرى.' }),
                    { status: 200, headers }
                );
            }

            // ✅ الكود صحيح - تحديث حالة التحقق في قاعدة البيانات
            if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
                const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
                await supabase
                    .from('profiles')
                    .update({ email_verified: true, email_verified_at: new Date().toISOString() })
                    .eq('email', email);
            }

            return new Response(
                JSON.stringify({ success: true, message: 'تم التحقق من البريد الإلكتروني بنجاح!' }),
                { status: 200, headers }
            );
        }

        // ✅ طريقة 2: التحقق من الكود المخزّن في قاعدة البيانات (email_verifications table)
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            return new Response(
                JSON.stringify({ error: 'إعدادات الخادم غير مكتملة' }),
                { status: 500, headers }
            );
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data: verification, error } = await supabase
            .from('email_verifications')
            .select('*')
            .eq('email', email)
            .eq('code', code)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('DB Error:', error);
            return new Response(
                JSON.stringify({ error: 'خطأ في قاعدة البيانات' }),
                { status: 500, headers }
            );
        }

        if (!verification) {
            return new Response(
                JSON.stringify({ success: false, error: 'الكود غير صحيح أو منتهي الصلاحية.' }),
                { status: 200, headers }
            );
        }

        // حذف الكود بعد الاستخدام (One-time use)
        await supabase.from('email_verifications').delete().eq('id', verification.id);

        // تحديث حالة التحقق
        await supabase
            .from('profiles')
            .update({ email_verified: true, email_verified_at: new Date().toISOString() })
            .eq('email', email);

        return new Response(
            JSON.stringify({ success: true, message: 'تم التحقق من البريد الإلكتروني بنجاح!' }),
            { status: 200, headers }
        );

    } catch (err) {
        console.error('Edge Function Error:', err);
        return new Response(
            JSON.stringify({ error: 'حدث خطأ داخلي', details: String(err) }),
            { status: 500, headers }
        );
    }
});
