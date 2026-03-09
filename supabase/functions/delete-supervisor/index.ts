// Supabase Edge Function: delete-supervisor
// حذف حساب مشرف نهائياً (من قِبل الـ Admin فقط)
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

    if (req.method !== 'POST' && req.method !== 'DELETE') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
    }

    try {
        // التحقق من التوثيق
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'غير مصرح لك' }), { status: 401, headers });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // التحقق من هوية الطالب
        const token = authHeader.replace('Bearer ', '');
        const { data: { user: callerUser }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !callerUser) {
            return new Response(JSON.stringify({ error: 'جلسة غير صالحة' }), { status: 401, headers });
        }

        // التحقق من صلاحية Admin
        const { data: callerProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', callerUser.id)
            .single();

        if (!callerProfile || callerProfile.role !== 'admin') {
            return new Response(
                JSON.stringify({ error: 'هذه العملية متاحة للمدير فقط' }),
                { status: 403, headers }
            );
        }

        const { supervisorId } = await req.json();

        if (!supervisorId) {
            return new Response(
                JSON.stringify({ error: 'معرّف المشرف مطلوب' }),
                { status: 400, headers }
            );
        }

        // التأكد من أن الهدف ليس Admin نفسه
        if (supervisorId === callerUser.id) {
            return new Response(
                JSON.stringify({ error: 'لا يمكنك حذف حسابك الخاص' }),
                { status: 400, headers }
            );
        }

        // التحقق من أن الحساب المراد حذفه هو مشرف فعلاً
        const { data: targetProfile } = await supabase
            .from('profiles')
            .select('role, name')
            .eq('id', supervisorId)
            .single();

        if (!targetProfile) {
            return new Response(
                JSON.stringify({ error: 'المشرف غير موجود' }),
                { status: 404, headers }
            );
        }

        if (targetProfile.role === 'admin') {
            return new Response(
                JSON.stringify({ error: 'لا يمكن حذف حساب مدير' }),
                { status: 403, headers }
            );
        }

        const errors: string[] = [];

        // ✅ 1. حذف الروابط مع المدرسين (supervisor_teachers)
        const { error: linksError } = await supabase
            .from('supervisor_teachers')
            .delete()
            .eq('supervisor_id', supervisorId);

        if (linksError) {
            errors.push(`تحذير: فشل حذف روابط المدرسين - ${linksError.message}`);
        }

        // ✅ 2. حذف من جدول supervisors
        const { error: supervisorTableError } = await supabase
            .from('supervisors')
            .delete()
            .eq('id', supervisorId);

        if (supervisorTableError) {
            errors.push(`تحذير: فشل حذف من جدول supervisors - ${supervisorTableError.message}`);
        }

        // ✅ 3. حذف البروفايل
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', supervisorId);

        if (profileError) {
            errors.push(`تحذير: فشل حذف البروفايل - ${profileError.message}`);
        }

        // ✅ 4. حذف حساب Auth (نهائي)
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(supervisorId);

        if (authDeleteError) {
            console.error('Auth Delete Error:', authDeleteError);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'فشل حذف حساب المصادقة',
                    details: authDeleteError.message,
                    warnings: errors,
                }),
                { status: 500, headers }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `تم حذف المشرف "${targetProfile.name}" بنجاح`,
                warnings: errors.length > 0 ? errors : undefined,
            }),
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
