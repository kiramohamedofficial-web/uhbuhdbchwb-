
import { supabase } from './storageService';
import { Teacher, Unit, Lesson, SubscriptionCode } from '../types';

/**
 * 📁 teachers_premium: جلب بيانات المدرسين المميزين فقط
 */
export const getPremiumTeachers = async (): Promise<Teacher[]> => {
    const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('is_special', true)
        .order('name');
    
    if (error) return [];
    return data.map((t: any) => ({
        id: t.id,
        name: t.name,
        subject: t.subject,
        imageUrl: t.image_url,
        isSpecial: true,
        teachingGrades: t.teaching_grades,
        teachingLevels: t.teaching_levels
    }));
};

/**
 * 📁 curriculum_premium: جلب المنهج الخاص بمدرس مميز محدد
 */
export const getPremiumCurriculum = async (teacherId: string): Promise<Unit[]> => {
    const { data: units, error } = await supabase
        .from('units')
        .select('*, lessons(*)')
        .eq('teacher_id', teacherId)
        .order('title');
    
    return units || [];
};

/**
 * 📁 codes_premium: جلب وإدارة الأكواد المرتبطة بمدرس مميز
 */
export const getPremiumCodes = async (teacherId: string): Promise<SubscriptionCode[]> => {
    const { data, error } = await supabase
        .from('subscription_codes')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });
    
    return data || [];
};

/**
 * 📁 students_premium: تسجيل الطالب بكود مدرس مميز (فتح آلي للمحتوى)
 */
export const activateSpecialAccess = async (userId: string, code: string) => {
    // 1. التحقق من الكود وربطه بالمدرس المميز
    const { data: codeData, error: valError } = await supabase.rpc('validate_subscription_code_usage', { 
        p_code: code.trim().toUpperCase(),
        p_user_id: userId 
    });

    if (valError || !codeData.valid) {
        return { success: false, error: codeData?.error || 'الكود غير صالح' };
    }

    // 2. استخدام الكود وتحديث حالته
    const { error: useError } = await supabase.rpc('use_subscription_code', {
        p_code: code.trim().toUpperCase(),
        p_user_id: userId
    });

    if (useError) return { success: false, error: 'فشل تفعيل الكود' };

    // 3. 📁 sessions_premium: فتح الحصص والمناهج بربط الطالب بالمدرس
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + (codeData.duration_days || 30));

    const { error: subError } = await supabase.from('subscriptions').insert({
        user_id: userId,
        teacher_id: codeData.teacher_id,
        plan: 'Monthly',
        status: 'Active',
        start_date: new Date().toISOString(),
        end_date: expiry.toISOString()
    });

    return { success: !subError, error: subError?.message };
};
