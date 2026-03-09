// Supabase Edge Function: create-supervisor
// إنشاء حساب مشرف جديد من قِبل الـ Admin
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
        // التحقق من صلاحية الـ Admin
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'غير مصرح لك' }), { status: 401, headers });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // التحقق من هوية المستخدم
        const token = authHeader.replace('Bearer ', '');
        const { data: { user: callerUser }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !callerUser) {
            return new Response(JSON.stringify({ error: 'جلسة غير صالحة' }), { status: 401, headers });
        }

        // التحقق من أن المُنشئ هو admin
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

        const { name, email, password, teacherIds } = await req.json();

        if (!name || !email) {
            return new Response(
                JSON.stringify({ error: 'الاسم والبريد الإلكتروني مطلوبان' }),
                { status: 400, headers }
            );
        }

        // ✅ 1. إنشاء المستخدم في نظام Auth (بدون إرسال إيميل تأكيد تلقائي)
        const { data: authData, error: createError } = await supabase.auth.admin.createUser({
            email,
            password: password || 'Supervisor123!',
            email_confirm: true, // تأكيد الإيميل تلقائياً
            user_metadata: { name, role: 'supervisor' },
        });

        if (createError || !authData?.user) {
            console.error('Auth Create Error:', createError);
            return new Response(
                JSON.stringify({ error: 'فشل إنشاء الحساب', details: createError?.message }),
                { status: 500, headers }
            );
        }

        const userId = authData.user.id;

        // ✅ 2. إنشاء البروفايل في جدول profiles
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: userId,
            name,
            email,
            role: 'supervisor',
        });

        if (profileError) {
            console.error('Profile Insert Error:', profileError);
            // حذف المستخدم من Auth في حال فشل إنشاء البروفايل
            await supabase.auth.admin.deleteUser(userId);
            return new Response(
                JSON.stringify({ error: 'فشل إنشاء البروفايل', details: profileError.message }),
                { status: 500, headers }
            );
        }

        // ✅ 3. إنشاء سجل في جدول supervisors
        const { error: supervisorError } = await supabase.from('supervisors').insert({
            id: userId,
            name,
            email,
        });

        if (supervisorError) {
            console.warn('Supervisors table insert warning:', supervisorError);
            // لا نُلغي العملية - قد يكون الجدول غير موجود أو سياسة مختلفة
        }

        // ✅ 4. ربط المدرسين (إذا توفرت IDs)
        if (teacherIds && teacherIds.length > 0) {
            const links = teacherIds.map((tid: string) => ({
                supervisor_id: userId,
                teacher_id: tid,
            }));
            const { error: linkError } = await supabase.from('supervisor_teachers').insert(links);
            if (linkError) {
                console.warn('Teacher linking warning:', linkError);
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                userId,
                message: `تم إنشاء حساب المشرف "${name}" بنجاح`,
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
