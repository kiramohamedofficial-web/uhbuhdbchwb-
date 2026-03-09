
import { supabase, deleteUser, getTemporaryClient, adminUpdateUserPassword } from './storageService';
import { Teacher, SupervisorProfile, Role } from '../types';

/**
 * 👔 إحصائيات المشرفين والمدرسين
 */
export const getStaffStats = async () => {
  const [teachersRes, supervisorsRes, linksRes] = await Promise.all([
    supabase.from('teachers').select('id', { count: 'exact', head: true }),
    supabase.from('supervisors').select('id', { count: 'exact', head: true }),
    supabase.from('supervisor_teachers').select('id', { count: 'exact', head: true }),
  ]);

  return {
    totalTeachers: teachersRes.count || 0,
    totalSupervisors: supervisorsRes.count || 0,
    totalLinks: linksRes.count || 0,
  };
};

/**
 * ✅ جلب جميع المشرفين مع المدرسين المرتبطين بهم
 */
export const fetchAllSupervisors = async (): Promise<SupervisorProfile[]> => {
  const { data, error } = await supabase
    .from('supervisors')
    .select(`
        *,
        supervisor_teachers (
            teachers (id, name, subject, image_url, phone, email, teaching_grades, teaching_levels)
        )
    `)
    .order('name');

  if (error) {
    console.error("Error fetching supervisors:", error);
    const { data: simpleData, error: simpleError } = await supabase
      .from('supervisors')
      .select('*')
      .order('name');
      
    if (simpleError) throw simpleError;
    
    return (simpleData || []).map((s: any) => ({
      ...s,
      role: Role.SUPERVISOR,
      supervisor_teachers: []
    })) as SupervisorProfile[];
  }

  return (data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone || '',
    role: Role.SUPERVISOR,
    supervisor_teachers: (s.supervisor_teachers || [])
      .filter((st: any) => st.teachers)
      .map((st: any) => ({
        teachers: {
          id: st.teachers.id,
          name: st.teachers.name,
          subject: st.teachers.subject,
          imageUrl: st.teachers.image_url,
          phone: st.teachers.phone,
          email: st.teachers.email,
          teachingGrades: st.teachers.teaching_grades,
          teachingLevels: st.teachers.teaching_levels
        }
      }))
  })) as SupervisorProfile[];
};

/**
 * ✅ إنشاء حساب مشرف كامل (مع المصادقة والربط)
 */
export const createSupervisorAccount = async (data: { 
    name: string; 
    email: string; 
    password?: string; 
    teacherIds?: string[];
}) => {
    // استخدام عميل مؤقت لمنع تسجيل خروج المدير الحالي
    const tempClient = getTemporaryClient();

    // 1. إنشاء حساب في نظام المصادقة (Auth)
    const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: data.email,
        password: data.password || "Supervisor123!",
        options: { 
            data: { 
                name: data.name, 
                role: 'supervisor' 
            }
        }
    });

    if (authError || !authData.user) return { success: false, error: authError };

    const userId = authData.user.id;

    // 2. إضافة في جدول user_roles (إذا كان موجوداً)
    try {
        await supabase.from('user_roles').insert({ user_id: userId, role: 'supervisor' });
    } catch (e) {
        console.warn("Table user_roles skip.");
    }

    // 3. إضافة المشرف لجدول المشرفين (عبر العميل الرئيسي للمدير)
    const { error: insError } = await supabase.from('supervisors').insert({
        id: userId,
        name: data.name,
        email: data.email
    });

    if (insError) {
        console.error("Error inserting into supervisors table:", insError);
        return { success: false, error: insError };
    }

    // 4. ربط المدرسين المحددين (Bulk Linking)
    if (data.teacherIds && data.teacherIds.length > 0) {
        const links = data.teacherIds.map(tid => ({ supervisor_id: userId, teacher_id: tid }));
        const { error: linkError } = await supabase.from('supervisor_teachers').insert(links);
        if (linkError) console.error("Error linking teachers:", linkError);
    }

    return { success: true, userId };
};

/**
 * ✅ تعديل بيانات مشرف وإدارة روابط المدرسين
 */
export const updateSupervisor = async (id: string, data: { name: string; email: string; teacherIds?: string[]; password?: string }) => {
    // Handle Password Update if provided (Admin Override)
    if (data.password && data.password.trim().length >= 6) {
        await adminUpdateUserPassword(id, data.password);
    }

    // تحديث البيانات الأساسية
    const { error: updError } = await supabase
        .from('supervisors')
        .update({ name: data.name, email: data.email })
        .eq('id', id);
    
    if (updError) return { success: false, error: updError };

    // تحديث الروابط (Re-syncing)
    if (data.teacherIds) {
        // حذف الروابط القديمة
        await supabase.from('supervisor_teachers').delete().eq('supervisor_id', id);
        
        // إضافة الروابط الجديدة
        const links = data.teacherIds.map((tid: string) => ({ 
            supervisor_id: id, 
            teacher_id: tid 
        }));
        
        if (links.length > 0) {
            const { error: linkError } = await supabase.from('supervisor_teachers').insert(links);
            if (linkError) return { success: false, error: linkError };
        }
    }
    
    return { success: true };
};

/**
 * ✅ حذف مشرف نهائياً مع تنظيف الروابط
 */
export const deleteSupervisor = async (id: string): Promise<{ success: boolean; error?: any }> => {
    // 1. حذف الروابط يدوياً للتأكد (رغم وجود Cascade)
    await supabase.from('supervisor_teachers').delete().eq('supervisor_id', id);

    // 2. حذف حساب المصادقة والبروفايل عبر الـ RPC الموحد
    const { error } = await deleteUser(id);
    
    if (error) {
        const { error: profileError } = await supabase.from('supervisors').delete().eq('id', id);
        if (profileError) return { success: false, error: profileError };
    }
    return { success: true };
};

/**
 * 🔗 فك ارتباط مدرس معين من مشرف
 */
export const unlinkTeacher = async (supervisorId: string, teacherId: string) => {
    return await supabase
        .from('supervisor_teachers')
        .delete()
        .eq('supervisor_id', supervisorId)
        .eq('teacher_id', teacherId);
};
