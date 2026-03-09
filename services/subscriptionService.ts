
import { supabase, signUp } from './storageService';
import { Subscription, SubscriptionCode, DurationType, SubscriptionRequest } from '../types';

// --- Subscriptions ---

export const getAllSubscriptions = async () => {
    const { data } = await supabase.from('subscriptions').select('*');
    return (data || []).map((s: any) => ({
        id: s.id,
        userId: s.user_id,
        plan: s.plan,
        status: s.status,
        startDate: s.start_date,
        endDate: s.end_date,
        teacherId: s.teacher_id
    }));
};

export const getSubscriptionsByUserId = async (userId: string) => {
    const { data } = await supabase.from('subscriptions').select('*').eq('user_id', userId);
    return data || [];
};

export const getSubscriptionByUserId = async (userId: string) => {
    // Get the most relevant active subscription (prioritizing comprehensive)
    // We fetch all active ones and sort/filter in application logic if needed, 
    // but here we grab the first valid one for simple checks.
    const now = new Date().toISOString();
    const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'Active')
        .gte('end_date', now) // Ensure it hasn't expired in DB
        .limit(1)
        .maybeSingle();

    if(data) {
        return {
            id: data.id,
            userId: data.user_id,
            plan: data.plan,
            status: data.status,
            startDate: data.start_date,
            endDate: data.end_date,
            teacherId: data.teacher_id
        };
    }
    return null;
};

export const createOrUpdateSubscription = async (userId: string, plan: string, status: string, endDate?: string, teacherId?: string | null) => {
    // 1. Calculate End Date if not provided
    let finalEndDate = endDate;
    if (!finalEndDate) {
        const d = new Date();
        if (plan === 'Annual') d.setFullYear(d.getFullYear() + 1);
        else if (plan === 'SemiAnnually') d.setMonth(d.getMonth() + 6);
        else if (plan === 'Quarterly') d.setMonth(d.getMonth() + 3);
        else d.setDate(d.getDate() + 30); // Monthly default
        finalEndDate = d.toISOString();
    }

    // 2. Find existing subscription matching EXACT criteria (User + Teacher ID combination)
    // This allows a student to have a subscription for Teacher A AND a separate one for Teacher B.
    let query = supabase.from('subscriptions').select('id').eq('user_id', userId);
    
    if (teacherId) {
        query = query.eq('teacher_id', teacherId);
    } else {
        query = query.is('teacher_id', null);
    }

    const { data: existingSub } = await query.maybeSingle();

    if (existingSub) {
        // Update existing
        return await supabase.from('subscriptions').update({
            plan,
            status,
            end_date: finalEndDate,
        }).eq('id', existingSub.id);
    } else {
        // Insert new
        return await supabase.from('subscriptions').insert({
            user_id: userId,
            plan,
            status,
            end_date: finalEndDate,
            teacher_id: teacherId || null,
            start_date: new Date().toISOString()
        });
    }
};

export const cancelSubscription = async (userId: string) => {
    return await supabase.from('subscriptions').update({ status: 'Expired', end_date: new Date().toISOString() }).eq('user_id', userId);
};

export const getSubscriptionsByTeacherId = async (teacherId: string) => {
    const { data } = await supabase.from('subscriptions').select('*').eq('teacher_id', teacherId);
    return (data || []).map((s: any) => ({
        id: s.id,
        userId: s.user_id,
        plan: s.plan,
        status: s.status,
        startDate: s.start_date,
        endDate: s.end_date,
        teacherId: s.teacher_id
    }));
};

export const getSubscriptionsByTeacherIds = async (teacherIds: string[]) => {
    const { data } = await supabase.from('subscriptions').select('*').in('teacher_id', teacherIds);
    return (data || []).map((s: any) => ({
        id: s.id,
        userId: s.user_id,
        plan: s.plan,
        status: s.status,
        startDate: s.start_date,
        endDate: s.end_date,
        teacherId: s.teacher_id
    }));
};

// --- Subscription Requests ---

export const getAllSubscriptionRequests = async () => {
    // Attempt 1: Try fetching with Foreign Key relation (Standard Way)
    // Using subscription_requests_temp (Table) instead of subscription_requests (View)
    const { data, error } = await supabase
        .from('subscription_requests_temp')
        .select('*, profiles:user_id(email)')
        .order('created_at', { ascending: false });

    // Attempt 2: If relation fails (PGRST202) or returns null, use Manual Join Strategy
    if (error || !data) {
        console.warn("Fetching requests with relation failed, switching to manual join strategy.", error?.message);
        
        // 1. Fetch raw requests from temp table
        const { data: rawRequests, error: reqError } = await supabase
            .from('subscription_requests_temp')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (reqError) {
            console.error("Critical error fetching subscription_requests_temp:", reqError);
            return [];
        }
        
        if (!rawRequests || rawRequests.length === 0) return [];

        // 2. Extract User IDs and fetch profiles manually
        const userIds = [...new Set(rawRequests.map((r: any) => r.user_id))];
        
        let emailMap = new Map();
        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, email')
                .in('id', userIds);
            
            if (profiles) {
                emailMap = new Map(profiles.map(p => [p.id, p.email]));
            }
        }

        // 3. Merge Data manually
        return rawRequests.map((r: any) => ({
            id: r.id,
            userId: r.user_id,
            userName: r.user_name,
            userEmail: emailMap.get(r.user_id) || 'غير متوفر', 
            plan: r.plan,
            // Handle new column 'payment_from_number'
            paymentFromNumber: r.payment_from_number || r.payment_number || '---',
            status: r.status,
            createdAt: r.created_at,
            subjectName: r.subject_name,
            unitId: r.unit_id
        }));
    }

    // Return successfully mapped data from Attempt 1
    return data.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.profiles?.email || 'N/A', 
        plan: r.plan,
        paymentFromNumber: r.payment_from_number || r.payment_number || '---',
        status: r.status,
        createdAt: r.created_at,
        subjectName: r.subject_name,
        unitId: r.unit_id
    }));
};

// NEW: Get requests for a specific user
export const getUserSubscriptionRequests = async (userId: string) => {
    const { data } = await supabase
        .from('subscription_requests_temp')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'Pending');
        
    return (data || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        plan: r.plan,
        paymentFromNumber: r.payment_from_number || r.payment_number || '---',
        status: r.status,
        createdAt: r.created_at,
        subjectName: r.subject_name,
        unitId: r.unit_id
    }));
};

export const addSubscriptionRequest = async (userId: string, userName: string, plan: string, paymentNumber: string, subjectName?: string, unitId?: string) => {
    // Insert into subscription_requests_temp table
    // Map the user provided 'paymentNumber' (sender's number) to 'payment_from_number' column
    return await supabase.from('subscription_requests_temp').insert({
        user_id: userId,
        user_name: userName,
        plan,
        payment_from_number: paymentNumber || "", 
        subject_name: subjectName,
        unit_id: unitId,
        status: 'Pending'
    });
};

export const updateSubscriptionRequest = async (request: any) => {
    return await supabase.from('subscription_requests_temp').update({ status: request.status }).eq('id', request.id);
};

export const getPendingSubscriptionRequestCount = async () => {
    const { count } = await supabase.from('subscription_requests_temp').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
    return count || 0;
};

// --- Subscription Codes ---

const mapSubscriptionCode = (row: any): SubscriptionCode => ({
    code: row.code,
    teacherId: row.teacher_id,
    durationDays: row.duration_days,
    maxUses: row.max_uses,
    timesUsed: row.times_used,
    usedByUserIds: row.used_by_user_ids || [],
    createdAt: row.created_at
});

export const generateSubscriptionCodes = async (params: { 
    count: number;
    durationType: DurationType;
    maxUses?: number;
    teacherId?: string | null;
    customDays?: number;
    description?: string;
}) => {
    const teacherIdParam = params.teacherId ?? null;
    const maxUses = params.maxUses || 1;
    let days = 30;

    switch (params.durationType) {
        case 'monthly': days = 30; break;
        case 'quarterly': days = 90; break;
        case 'semi_annually': days = 180; break;
        case 'annually': days = 365; break;
        case 'custom': days = params.customDays || 30; break;
    }

    const generatedCodes: any[] = [];
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; 

    for (let i = 0; i < params.count; i++) {
        let code = '';
        for (let j = 0; j < 4; j++) code += charset.charAt(Math.floor(Math.random() * charset.length));
        code += '-';
        for (let j = 0; j < 4; j++) code += charset.charAt(Math.floor(Math.random() * charset.length));
        
        generatedCodes.push({
            code: code,
            duration_days: days,
            max_uses: maxUses,
            teacher_id: teacherIdParam,
            times_used: 0,
            used_by_user_ids: [],
            created_at: new Date().toISOString()
        });
    }

    const { data, error } = await supabase
        .from('subscription_codes')
        .insert(generatedCodes)
        .select();

    if (error) return { data: null, error };
    return { data: (data || []).map(mapSubscriptionCode), error: null };
};

export const getAllSubscriptionCodes = async () => {
    let allCodes: any[] = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('subscription_codes')
            .select('*')
            .order('created_at', { ascending: false })
            .range(from, from + limit - 1);
        
        if (error) {
            console.error("Error fetching codes:", error);
            break;
        }

        if (data && data.length > 0) {
            allCodes = [...allCodes, ...data];
            if (data.length < limit) {
                hasMore = false;
            } else {
                from += limit;
            }
        } else {
            hasMore = false;
        }
    }
        
    return allCodes.map(mapSubscriptionCode);
};

export const deleteAllSubscriptionCodes = async () => {
    return await supabase.from('subscription_codes').delete().neq('code', '0');
};

export const deleteUsedSubscriptionCodes = async () => {
    const allCodes = await getAllSubscriptionCodes();
    
    if (!allCodes || allCodes.length === 0) return { count: 0 };
    
    const usedCodes = allCodes.filter(c => c.timesUsed >= c.maxUses).map(c => c.code);
    
    if (usedCodes.length === 0) return { count: 0 };
    
    let error = null;
    const batchSize = 200;
    
    for (let i = 0; i < usedCodes.length; i += batchSize) {
        const batch = usedCodes.slice(i, i + batchSize);
        const { error: batchError } = await supabase.from('subscription_codes').delete().in('code', batch);
        if (batchError) error = batchError;
    }

    return { error, count: usedCodes.length };
};

export const validateSubscriptionCode = async (code: string, userId?: string) => {
    const { data, error } = await supabase.rpc(
        'validate_subscription_code_usage',
        userId ? { p_code: code, p_user_id: userId } : { p_code: code }
    );
    
    if (error) {
        console.error("RPC Error:", error);
        return { data: null, error };
    }
    
    return { data, error: null };
};

export const useSubscriptionCode = async (code: string, userId: string) => {
    const { data, error } = await supabase.rpc('use_subscription_code', {
        p_code: code.trim().toUpperCase(),
        p_user_id: userId
    });
    return { data, error };
};

const handleSubscriptionUpsert = async (userId: string, duration: number, teacherId?: string) => {
    let planName = 'Monthly';
    if (duration >= 360) planName = 'Annual';
    else if (duration >= 180) planName = 'SemiAnnually';
    else if (duration >= 90) planName = 'Quarterly';

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);

    // FIX: Using teacherId in check to allow separate subscriptions per teacher or comprehensive
    let query = supabase.from('subscriptions').select('id').eq('user_id', userId);
    
    if (teacherId) {
        query = query.eq('teacher_id', teacherId);
    } else {
        query = query.is('teacher_id', null);
    }

    const { data: existingSub } = await query.maybeSingle();

    if (existingSub) {
        await supabase.from('subscriptions').update({
            plan: planName,
            teacher_id: teacherId || null,
            end_date: endDate.toISOString(),
            status: 'Active'
        }).eq('id', existingSub.id);
    } else {
        await supabase.from('subscriptions').insert({
            user_id: userId,
            plan: planName,
            teacher_id: teacherId || null,
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString(),
            status: 'Active'
        });
    }
};

export const redeemCode = async (code: string, gradeId: number, track: string) => {
    const cleanCode = code.trim().toUpperCase(); 
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { success: false, error: 'يجب تسجيل الدخول أولاً.' };

    const { data: result, error: rpcError } = await useSubscriptionCode(cleanCode, session.user.id);

    if (rpcError) {
        console.error("RPC Error (Attempting manual fallback):", rpcError);
        const { data: validateRes } = await validateSubscriptionCode(cleanCode, session.user.id);
        if (!validateRes || !validateRes.valid) return { success: false, error: validateRes?.error || 'كود التفعيل غير صحيح.' };
        
        try {
            const { data: codeData } = await supabase.from('subscription_codes').select('times_used, used_by_user_ids, duration_days, teacher_id').eq('code', cleanCode).single();
            if (codeData) {
                const usedUsers = [...(codeData.used_by_user_ids || []), session.user.id];
                await supabase.from('subscription_codes').update({ 
                    times_used: codeData.times_used + 1,
                    used_by_user_ids: usedUsers
                }).eq('code', cleanCode);
                
                await handleSubscriptionUpsert(session.user.id, codeData.duration_days, codeData.teacher_id);
                return { success: true };
            }
        } catch (e) {
            return { success: false, error: 'حدث خطأ أثناء تفعيل الكود.' };
        }
    }

    if (!result || !result.success) {
        return { success: false, error: result?.error || 'كود التفعيل غير صحيح أو غير متاح.' };
    }

    try {
        await handleSubscriptionUpsert(session.user.id, result.duration_days, result.teacher_id);
        return { success: true };
    } catch (e) {
        console.error("Redemption error:", e);
        return { success: false, error: 'حدث خطأ أثناء تفعيل الاشتراك.' };
    }
};

export const registerAndRedeemCode = async (userData: any, code: string) => {
    const { data: signUpData, error: signUpError } = await signUp(userData);
    if (signUpError || !signUpData.user) return { data: null, error: signUpError?.message || 'Signup failed' };
    const redeemResult = await redeemCode(code, userData.grade, userData.track);
    return { data: { userId: signUpData.user.id }, error: redeemResult.error };
};

export const deleteSubscriptionCode = async (code: string) => supabase.from('subscription_codes').delete().eq('code', code);
