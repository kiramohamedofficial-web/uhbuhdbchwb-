
import { supabase, deleteUser, adminUpdateUserPassword } from './storageService';
import { Teacher } from '../types';

// 🎓 إدارة المدرسين (Teachers)

export const getAllTeachers = async () => {
    const { data, error } = await supabase.from('teachers').select('*').order('name');
    if (error) {
        console.error("Error fetching teachers:", error);
        return [];
    }
    return (data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        subject: t.subject,
        imageUrl: t.image_url,
        phone: t.phone,
        email: t.email,
        teachingLevels: t.teaching_levels || [],
        teachingGrades: t.teaching_grades || [],
        isSpecial: t.is_special || false
    }));
};

export const getTeacherById = async (id: string) => {
    const { data, error } = await supabase.from('teachers').select('*').eq('id', id).single();
    if (error) throw error;
    return {
        id: data.id,
        name: data.name,
        subject: data.subject,
        imageUrl: data.image_url,
        phone: data.phone,
        email: data.email,
        teachingLevels: data.teaching_levels || [],
        teachingGrades: data.teaching_grades || [],
        isSpecial: data.is_special || false
    } as Teacher;
};

export const createTeacher = async (teacher: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    subject: string;
    teachingGrades: number[];
    teachingLevels: string[];
    imageUrl?: string;
    isSpecial?: boolean;
}) => {
    const finalPhone = teacher.phone && teacher.phone.trim() !== "" 
        ? (teacher.phone.startsWith('+') ? teacher.phone : `+20${teacher.phone.replace(/^0/, '')}`)
        : null;

    const rpcParams = {
        p_name: teacher.name,
        p_email: teacher.email,
        p_password: teacher.password || "Teacher123!",
        p_phone: finalPhone,
        p_subject: teacher.subject,
        p_teaching_grades: teacher.teachingGrades || [],
        p_teaching_levels: teacher.teachingLevels || [],
        p_image_url: teacher.imageUrl || null
    };

    const { data, error } = await supabase.rpc('create_teacher_account', rpcParams);

    if (error) {
        console.error("RPC Error:", error);
        return { success: false, error };
    }

    if (data && data.success === false) {
        return { success: false, error: { message: data.error || "فشلت عملية الإضافة الداخلية." } };
    }
    
    // Update is_special flag if true, as RPC might not set it
    if (teacher.isSpecial && data && data.id) {
        await supabase.from('teachers').update({ is_special: true }).eq('id', data.id);
    }

    return { success: true, data };
};

export const updateTeacher = async (id: string, teacher: any) => {
    const finalPhone = teacher.phone && teacher.phone.trim() !== "" 
        ? (teacher.phone.startsWith('+') ? teacher.phone : `+20${teacher.phone.replace(/^0/, '')}`)
        : null;

    // Handle Password Update if provided (Admin Override)
    if (teacher.password && teacher.password.trim().length >= 6) {
        await adminUpdateUserPassword(id, teacher.password);
    }

    const updates: any = {
        name: teacher.name,
        subject: teacher.subject,
        image_url: teacher.imageUrl,
        teaching_levels: teacher.teachingLevels,
        teaching_grades: teacher.teachingGrades,
        email: teacher.email,
        phone: finalPhone,
        is_special: teacher.isSpecial
    };

    const { data, error } = await supabase.from('teachers').update(updates).eq('id', id).select();
    if (error) return { success: false, error };
    return { success: true, data };
};

export const deleteTeacher = async (id: string): Promise<{ success: boolean; error?: any }> => {
    const { error } = await deleteUser(id);
    if (error) {
        const { error: profileError } = await supabase.from('teachers').delete().eq('id', id);
        if (profileError) return { success: false, error: profileError };
    }
    return { success: true };
};
