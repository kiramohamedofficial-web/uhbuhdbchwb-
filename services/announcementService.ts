
import { supabase } from './storageService';
import { Announcement } from '../types';

/**
 * 📢 إدارة الإعلانات (Announcements Service)
 * هذا الملف مستقل تماماً عن إعدادات المنصة لضمان عدم حدوث تضارب في التحديثات.
 */

// جلب جميع الإعلانات (للإدارة)
export const getAllAnnouncements = async (): Promise<Announcement[]> => {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching announcements:", error);
        return [];
    }

    return (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        imageUrl: item.image_url,
        linkUrl: item.link_url,
        isActive: item.is_active,
        priority: item.priority || 0,
        createdAt: item.created_at
    }));
};

// جلب الإعلانات النشطة فقط (للطلاب)
export const getActiveAnnouncements = async (): Promise<Announcement[]> => {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) return [];

    return (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        imageUrl: item.image_url,
        linkUrl: item.link_url,
        isActive: item.is_active,
        priority: item.priority || 0,
        createdAt: item.created_at
    }));
};

// إضافة إعلان جديد
export const createAnnouncement = async (announcement: Partial<Announcement>) => {
    const { data, error } = await supabase
        .from('announcements')
        .insert({
            title: announcement.title,
            content: announcement.content,
            image_url: announcement.imageUrl,
            link_url: announcement.linkUrl,
            is_active: announcement.isActive,
            priority: announcement.priority || 0
        })
        .select()
        .single();

    if (error) return { success: false, error };
    return { success: true, data };
};

// تحديث إعلان
export const updateAnnouncement = async (id: string, updates: Partial<Announcement>) => {
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.linkUrl !== undefined) dbUpdates.link_url = updates.linkUrl;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;

    const { error } = await supabase
        .from('announcements')
        .update(dbUpdates)
        .eq('id', id);

    if (error) return { success: false, error };
    return { success: true };
};

// حذف إعلان
export const deleteAnnouncement = async (id: string) => {
    const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

    if (error) return { success: false, error };
    return { success: true };
};
