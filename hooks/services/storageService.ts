
import { createClient } from '@supabase/supabase-js';
import { User, PlatformSettings, Grade, Lesson, Unit, Story, Reel, Course, Book, QuizAttempt, Role, StudentQuestion } from '../types';

const supabaseUrl = 'https://csipsaucwcuserhfrehn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaXBzYXVjd2N1c2VyaGZyZWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTQwMTgsImV4cCI6MjA3Njg3MDAxOH0.FJu12ARvbqG0ny0D9d1Jje3BxXQ-q33gjx7JSH26j1w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to ensure JSON fields are parsed correctly
const safeParseJson = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try {
        return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
        console.error("Failed to parse JSON field:", e);
        return [];
    }
};

// --- Auth Functions ---
export const signIn = (identifier: string, pass: string) => {
    const isEmail = identifier.includes('@');
    if (isEmail) {
        return supabase.auth.signInWithPassword({ email: identifier, password: pass });
    } else {
        const phone = identifier.startsWith('+') ? identifier : `+20${identifier.replace(/^0/, '')}`;
        return supabase.auth.signInWithPassword({ phone, password: pass });
    }
};
export const signUp = (userData: any) => {
    const email = userData.email && userData.email.trim() && !userData.email.endsWith('@gstudent.local')
        ? userData.email.trim()
        : `${(userData.phone || '').replace(/[^0-9]/g, '')}@gstudent.local`;
    return supabase.auth.signUp({ email, password: userData.password });
};
export const signOut = () => supabase.auth.signOut();
export const onAuthStateChange = (cb: (event: string, session: any) => void) => supabase.auth.onAuthStateChange(cb);
export const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
};
export const updateUserPassword = (password: string) => supabase.auth.updateUser({ password });
export const sendPasswordResetEmail = (email: string) => supabase.auth.resetPasswordForEmail(email);

/**
 * 🔐 تحديث كلمة المرور للمدير
 * يستخدم RPC (Stored Procedure) لسهولة الإعداد والاستخدام
 * يتطلب تشغيل كود SQL الخاص بالدالة admin_update_password في Supabase
 */
export const adminUpdateUserPassword = async (userId: string, password: string) => {
    return await supabase.rpc('admin_update_password', {
        user_id: userId,
        new_password: password
    });
};

export const getTemporaryClient = () => {
    return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
};

// --- User & Profile Functions ---
export const updateUser = async (id: string, updates: Partial<User>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.guardianPhone !== undefined) dbUpdates.guardian_phone = updates.guardianPhone;
    if (updates.grade !== undefined) dbUpdates.grade_id = updates.grade;
    if (updates.track !== undefined) dbUpdates.track = updates.track;
    if (updates.imageUrl !== undefined) dbUpdates.profile_image_url = updates.imageUrl;

    return await supabase.from('profiles').update(dbUpdates).eq('id', id);
};

export const deleteUser = async (id: string) => {
    return await supabase.rpc('delete_user_account', { user_id: id });
};

export const deleteSelf = async () => {
    return await supabase.rpc('delete_own_account');
};

export const getAllUsers = async (): Promise<User[]> => {
    const { data } = await supabase.from('profiles').select('*');
    return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        guardianPhone: p.guardian_phone,
        grade: p.grade_id,
        track: p.track,
        role: p.role as Role,
        imageUrl: p.profile_image_url,
        subscriptionId: p.subscription_id,
        teacherId: p.teacher_id
    }));
};

export const getUsersByIds = async (ids: string[]): Promise<User[]> => {
    if (!ids || ids.length === 0) return [];
    const { data, error } = await supabase.from('profiles').select('*').in('id', ids);
    if (error) {
        console.error("Error fetching users by ids:", error);
        return [];
    }
    return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        guardianPhone: p.guardian_phone,
        grade: p.grade_id,
        track: p.track,
        role: p.role as Role,
        imageUrl: p.profile_image_url,
        subscriptionId: p.subscription_id,
        teacherId: p.teacher_id
    }));
};

export const getUserById = async (id: string): Promise<User | null> => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (!data) return null;
    return {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        guardianPhone: data.guardian_phone,
        grade: data.grade_id,
        track: data.track,
        role: data.role as Role,
        imageUrl: data.profile_image_url
    };
};

export const getUserByTeacherId = async (teacherId: string): Promise<User | null> => {
    const { data } = await supabase.from('profiles').select('*').eq('teacher_id', teacherId).maybeSingle();
    if (!data) return null;
    return {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        guardianPhone: data.guardian_phone,
        grade: data.grade_id,
        track: data.track,
        role: data.role as Role,
        imageUrl: data.profile_image_url
    };
};

export const getUserIdByEmail = async (email: string): Promise<string | null> => {
    const { data } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
    return data?.id || null;
};

export const getInactiveUsers = async (days: number): Promise<User[]> => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const { data } = await supabase.from('profiles').select('*').lt('created_at', date.toISOString()).eq('role', 'student');
    return (data || []).map((p: any) => ({ id: p.id, name: p.name } as User));
};

export const bulkDeleteUsers = async (ids: string[]) => {
    let successCount = 0;
    const errors = [];
    for (const id of ids) {
        const { error } = await deleteUser(id);
        if (error) errors.push(error);
        else successCount++;
    }
    return { successCount, errors };
};

// --- Curriculum Functions ---
let cachedGrades: Grade[] = [];
let isDataInitialized = false;
let initPromise: Promise<void> | null = null;

export const initData = async (): Promise<void> => {
    if (isDataInitialized) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            const { data, error } = await supabase.from('grades').select('*, semesters(*, units(*, lessons(*)))');
            if (error) throw error;
            if (data) {
                cachedGrades = data.map((g: any) => ({
                    ...g,
                    semesters: (g.semesters || []).map((s: any) => ({
                        ...s,
                        units: (s.units || []).map((u: any) => ({
                            ...u,
                            teacherId: u.teacher_id,
                            lessons: (u.lessons || []).map((l: any) => ({
                                id: l.id,
                                title: l.title,
                                type: l.type,
                                content: l.content,
                                videos: safeParseJson(l.videos),
                                description: l.description,
                                isFree: l.is_free,
                                quizType: l.quiz_type,
                                questions: safeParseJson(l.questions),
                                imageUrl: l.image_url,
                                correctAnswers: l.correct_answers,
                                videoQuestions: safeParseJson(l.video_questions),
                                timeLimit: l.time_limit,
                                passingScore: l.passing_score,
                                unitId: l.unit_id,
                                teacherId: l.teacher_id,
                                publishedAt: l.published_at
                            }))
                        }))
                    }))
                }));
                isDataInitialized = true;
            }
        } catch (err) {
            console.error("Critical error during initData:", err);
            initPromise = null;
            throw err;
        }
    })();

    return initPromise;
};

export const getAllGrades = async (): Promise<Grade[]> => {
    if (!isDataInitialized) await initData();
    return cachedGrades;
};

export const getGradeByIdSync = (id: number | null) => {
    if (!id) return undefined;
    if (!isDataInitialized) {
        console.warn("Attempted to get grade before data initialization.");
    }
    return cachedGrades.find(g => g.id === id);
};

export const getGradesForSelection = () => {
    return cachedGrades.map(g => ({ id: g.id, name: g.name }));
};

export const getUnitsForSemester = async (gradeId: number, semesterId: string) => {
    const { data } = await supabase.from('units').select('*').eq('semester_id', semesterId);
    return (data || []).map((u: any) => ({
        ...u,
        teacherId: u.teacher_id
    }));
};

export const getLessonsByUnit = async (unitId: string) => {
    const { data } = await supabase.from('lessons').select('*').eq('unit_id', unitId).order('created_at', { ascending: true });
    return (data || []).map((l: any) => ({
        id: l.id,
        title: l.title,
        type: l.type,
        content: l.content,
        videos: safeParseJson(l.videos), // Parse videos
        description: l.description,
        isFree: l.is_free,
        quizType: l.quiz_type,
        questions: safeParseJson(l.questions),
        imageUrl: l.image_url,
        correctAnswers: l.correct_answers,
        videoQuestions: safeParseJson(l.video_questions),
        timeLimit: l.time_limit,
        passingScore: l.passing_score,
        unitId: l.unit_id,
        teacherId: l.teacher_id,
        publishedAt: l.published_at,
        homeworkQuestions: safeParseJson(l.homework_questions),
        examQuestions: safeParseJson(l.exam_questions),
        summaryContent: l.summary_content,
        hasHomework: l.has_homework,
        hasExam: l.has_exam,
        hasSummary: l.has_summary,
        isVisible: l.is_visible !== undefined ? l.is_visible : true
    }));
};

export const getLessonDetails = async (id: string) => {
    const { data } = await supabase.from('lessons').select('*').eq('id', id).single();
    if (!data) return null;
    return {
        id: data.id,
        title: data.title,
        type: data.type,
        content: data.content,
        videos: safeParseJson(data.videos), // Parse videos
        description: data.description,
        isFree: data.is_free,
        quizType: data.quiz_type,
        questions: safeParseJson(data.questions),
        imageUrl: data.image_url,
        correctAnswers: data.correct_answers,
        videoQuestions: safeParseJson(data.video_questions),
        timeLimit: data.time_limit,
        passingScore: data.passing_score,
        unitId: data.unit_id,
        teacherId: data.teacher_id,
        publishedAt: data.published_at,
        homeworkQuestions: safeParseJson(data.homework_questions),
        examQuestions: safeParseJson(data.exam_questions),
        summaryContent: data.summary_content,
        hasHomework: data.has_homework,
        hasExam: data.has_exam,
        hasSummary: data.has_summary,
        isVisible: data.is_visible !== undefined ? data.is_visible : true
    };
};

export const addUnitToSemester = async (gradeId: number, semesterId: string, unit: Omit<Unit, 'id' | 'lessons'>) => {
    return await supabase.from('units').insert({
        title: unit.title,
        title_ar: unit.title,
        teacher_id: unit.teacherId,
        track: unit.track,
        semester_id: semesterId,
        is_published: true
    });
};

export const updateUnit = async (gradeId: number, semesterId: string, unit: Unit) => {
    return await supabase.from('units').update({
        title: unit.title,
        title_ar: unit.title,
        teacher_id: unit.teacherId,
        track: unit.track
    }).eq('id', unit.id);
};

export const deleteUnit = async (gradeId: number, semesterId: string, unitId: string) => {
    return await supabase.from('units').delete().eq('id', unitId);
};

export const addLessonToUnit = async (gradeId: number, semesterId: string, unitId: string, lesson: Omit<Lesson, 'id'>, teacherId?: string) => {
    const isFree = Boolean(lesson.isFree);
    return await supabase.from('lessons').insert({
        title: lesson.title,
        type: lesson.type,
        content: lesson.content,
        videos: lesson.videos, // Save videos
        description: lesson.description,
        is_free: isFree,
        quiz_type: lesson.quizType,
        questions: lesson.questions,
        image_url: lesson.imageUrl,
        // Fix: lesson.correctAnswers matches the Lesson interface
        correct_answers: lesson.correctAnswers,
        video_questions: lesson.videoQuestions,
        time_limit: lesson.timeLimit,
        passing_score: lesson.passingScore,
        unit_id: unitId,
        teacher_id: teacherId || lesson.teacherId,
        published_at: lesson.publishedAt,
        homework_questions: lesson.homeworkQuestions,
        exam_questions: lesson.examQuestions,
        summary_content: lesson.summaryContent,
        has_homework: lesson.hasHomework,
        has_exam: lesson.hasExam,
        has_summary: lesson.hasSummary,
        is_visible: lesson.isVisible !== undefined ? lesson.isVisible : true
    });
};

export const updateLesson = async (gradeId: number, semesterId: string, unitId: string, lesson: Lesson) => {
    const isFree = Boolean(lesson.isFree);
    return await supabase.from('lessons').update({
        title: lesson.title,
        type: lesson.type,
        content: lesson.content,
        videos: lesson.videos, // Update videos
        description: lesson.description,
        is_free: isFree,
        quiz_type: lesson.quizType,
        questions: lesson.questions,
        // Fix: lesson.imageUrl matches the Lesson interface
        image_url: lesson.imageUrl,
        correct_answers: lesson.correctAnswers,
        video_questions: lesson.videoQuestions,
        time_limit: lesson.timeLimit,
        passing_score: lesson.passingScore,
        published_at: lesson.publishedAt,
        homework_questions: lesson.homeworkQuestions,
        exam_questions: lesson.examQuestions,
        summary_content: lesson.summaryContent,
        has_homework: lesson.hasHomework,
        has_exam: lesson.hasExam,
        has_summary: lesson.hasSummary,
        is_visible: lesson.isVisible !== undefined ? lesson.isVisible : true
    }).eq('id', lesson.id);
};

export const deleteLesson = async (gradeId: number, semesterId: string, unitId: string, lessonId: string) => {
    return await supabase.from('lessons').delete().eq('id', lessonId);
};

// --- Progress Functions ---
export const getStudentProgress = async (userId: string) => {
    const { data } = await supabase.from('student_progress').select('lesson_id').eq('student_id', userId);
    return data || [];
};

export const getAllStudentProgress = async () => {
    const { data } = await supabase.from('student_progress').select('*');
    return data || [];
};

export const markLessonComplete = async (userId: string, lessonId: string) => {
    return await supabase.from('student_progress').upsert({ student_id: userId, lesson_id: lessonId }, { onConflict: 'student_id,lesson_id' });
};

export const trackVideoProgress = async (userId: string, lessonId: string, watchedSeconds: number, totalSeconds: number) => {
    const milestone = Math.round((watchedSeconds / totalSeconds) * 100) + '%';
    return await supabase.from('video_activity').upsert({
        user_id: userId,
        lesson_id: lessonId,
        watched_seconds: Math.round(watchedSeconds),
        milestone,
        last_updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,lesson_id' });
};

export const getVideoActivityForStudent = async (userId: string): Promise<any[]> => {
    const { data } = await supabase.from('video_activity').select('*').eq('user_id', userId);
    return data || [];
};

export const getStudentQuizAttempts = async (userId: string): Promise<QuizAttempt[]> => {
    const { data } = await supabase.from('quiz_attempts').select('*').eq('user_id', userId);
    return (data || []).map((a: any) => ({
        id: a.id,
        userId: a.user_id,
        lessonId: a.lesson_id,
        submittedAt: a.submitted_at,
        score: a.score,
        submittedAnswers: a.submitted_answers,
        timeTaken: a.time_taken,
        isPass: a.is_pass
    }));
};

export const getAllQuizAttempts = async (): Promise<QuizAttempt[]> => {
    const { data } = await supabase.from('quiz_attempts').select('*');
    return (data || []).map((a: any) => ({
        id: a.id,
        userId: a.user_id,
        lessonId: a.lesson_id,
        submittedAt: a.submitted_at,
        score: a.score,
        submittedAnswers: a.submitted_answers,
        timeTaken: a.time_taken,
        isPass: a.is_pass
    }));
};

export const getLatestQuizAttemptForLesson = async (userId: string, lessonId: string): Promise<QuizAttempt | null> => {
    const { data } = await supabase.from('quiz_attempts').select('*').eq('user_id', userId).eq('lesson_id', lessonId).order('submitted_at', { ascending: false }).limit(1).maybeSingle();
    if (!data) return null;
    return {
        id: data.id,
        userId: data.user_id,
        lessonId: data.lesson_id,
        submittedAt: data.submitted_at,
        score: data.score,
        submittedAnswers: data.submitted_answers,
        timeTaken: data.time_taken,
        isPass: data.is_pass
    };
};

export const saveQuizAttempt = async (userId: string, lessonId: string, score: number, answers: any[], timeTaken: number) => {
    const isPass = score >= 50;
    return await supabase.from('quiz_attempts').insert({
        user_id: userId,
        lesson_id: lessonId,
        score,
        submitted_answers: answers,
        time_taken: timeTaken,
        is_pass: isPass,
        submitted_at: new Date().toISOString()
    });
};

// --- Featured & Store Content ---
export const getPublishedCourses = async (): Promise<Course[]> => {
    const { data } = await supabase.from('courses').select('*, course_videos(*)').eq('is_published', true);
    return (data || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        teacherId: c.teacher_id,
        coverImage: c.cover_image,
        price: c.price,
        isFree: c.is_free,
        pdfUrl: c.pdf_url,
        videos: (c.course_videos || []).map((v: any) => ({
            id: v.id,
            title: v.title,
            videoUrl: v.video_url,
            isFree: v.is_free
        }))
    }));
};

export const getAllCourses = async (): Promise<Course[]> => {
    const { data } = await supabase.from('courses').select('*, course_videos(*)');
    return (data || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        teacherId: c.teacher_id,
        coverImage: c.cover_image,
        price: c.price,
        isFree: c.is_free || false,
        pdfUrl: c.pdf_url,
        videos: (c.course_videos || []).map((v: any) => ({
            id: v.id,
            title: v.title,
            videoUrl: v.video_url,
            isFree: v.is_free
        }))
    }));
};

export const createCourse = async (course: Omit<Course, 'id'>) => {
    const { data, error } = await supabase.from('courses').insert({
        title: course.title,
        title_ar: course.title,
        description: course.description,
        // Fix: Changed teacher_id to teacherId to match the Omit<Course, 'id'> interface
        teacher_id: course.teacherId,
        cover_image: course.coverImage,
        price: course.price,
        is_free: course.isFree,
        is_published: true,
        pdf_url: course.pdfUrl
    }).select().single();

    if (data && course.videos?.length > 0) {
        const vids = course.videos.map(v => ({
            title: v.title,
            video_url: v.videoUrl,
            is_free: v.isFree,
            course_id: data.id
        }));
        await supabase.from('course_videos').insert(vids);
    }
    return { data, error };
};

export const updateCourse = async (id: string, course: Partial<Course>) => {
    let isFreeUpdate = undefined;
    if (course.isFree !== undefined) {
        isFreeUpdate = course.isFree === true;
    }

    const updates: any = {
        title: course.title,
        description: course.description,
        teacher_id: course.teacherId,
        cover_image: course.coverImage,
        price: course.price,
        pdf_url: course.pdfUrl
    };

    if (isFreeUpdate !== undefined) {
        updates.is_free = isFreeUpdate;
    }

    const { error: courseError } = await supabase.from('courses').update(updates).eq('id', id);
    if (courseError) return { error: courseError };

    if (course.videos) {
        await supabase.from('course_videos').delete().eq('course_id', id);
        if (course.videos.length > 0) {
            const vids = course.videos.map(v => ({
                title: v.title,
                video_url: v.videoUrl,
                is_free: v.isFree,
                course_id: id
            }));
            const { error: vidError } = await supabase.from('course_videos').insert(vids);
            if (vidError) return { error: vidError };
        }
    }

    return { error: null };
};

export const deleteCourse = async (id: string) => {
    return await supabase.from('courses').delete().eq('id', id);
};

export const checkCoursePurchase = async (userId: string, courseId: string) => {
    const { data } = await supabase.from('course_purchases').select('id').eq('user_id', userId).eq('course_id', courseId).maybeSingle();
    return !!data;
};

export const purchaseCourse = async (userId: string, courseId: string) => {
    return await supabase.from('course_purchases').insert({ user_id: userId, course_id: courseId });
};

export const getFeaturedCourses = async () => {
    const { data } = await supabase.from('featured_courses').select('*');
    return data || [];
};

export const addFeaturedCourse = async (course: any) => supabase.from('featured_courses').insert(course);
export const updateFeaturedCourse = async (course: any) => supabase.from('featured_courses').update(course).eq('id', course.id);
export const deleteFeaturedCourse = async (id: string) => supabase.from('featured_courses').delete().eq('id', id);

export const getFeaturedBooks = async () => {
    const { data } = await supabase.from('books').select('*');
    return data || [];
};

export const addFeaturedBook = async (book: any) => supabase.from('books').insert(book);
export const updateFeaturedBook = async (book: any) => supabase.from('books').update(book).eq('id', book.id);
export const deleteFeaturedBook = async (id: string) => supabase.from('books').delete().eq('id', id);

// --- Reels ---
export const getAllReels = async (): Promise<Reel[]> => {
    const { data } = await supabase.from('reels').select('*');
    return (data || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        youtubeUrl: r.youtube_url,
        isPublished: r.is_published,
        createdAt: r.created_at
    }));
};

export const getPublishedReels = async (): Promise<Reel[]> => {
    const { data } = await supabase.from('reels').select('*').eq('is_published', true);
    return (data || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        youtubeUrl: r.youtube_url,
        isPublished: r.is_published,
        createdAt: r.created_at
    }));
};

export const addReel = async (reel: Partial<Reel>) => supabase.from('reels').insert({
    title: reel.title,
    youtube_url: reel.youtubeUrl,
    is_published: reel.isPublished
});

export const updateReel = async (id: string, reel: any) => supabase.from('reels').update({
    title: reel.title,
    youtube_url: reel.youtubeUrl,
    is_published: reel.isPublished
}).eq('id', id);

export const deleteReel = async (id: string) => {
    return await supabase.from('reels').delete().eq('id', id);
};

// --- Stories ---
export const getStories = async (category: 'main' | 'movies'): Promise<Story[]> => {
    const { data } = await supabase.from('stories').select('*').eq('category', category).order('created_at', { ascending: false });
    return (data || []).map((s: any) => ({
        id: s.id,
        type: s.type,
        content: s.content,
        category: s.category,
        is_permanent: s.is_permanent,
        expires_at: s.expires_at,
        created_at: s.created_at,
        movie_data: s.movie_data
    }));
};

export const addStory = async (story: Partial<Story>) => {
    const expiresAt = story.is_permanent ? null : new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    return await supabase.from('stories').insert({
        type: story.type,
        content: story.content,
        category: story.category,
        is_permanent: story.is_permanent,
        expires_at: expiresAt,
        movie_data: story.movie_data
    });
};

export const deleteStory = async (id: string) => {
    return await supabase.from('stories').delete().eq('id', id);
};

export const deleteExpiredStories = async () => {
    const now = new Date().toISOString();
    const { count, error } = await supabase.from('stories').delete({ count: 'exact' }).lt('expires_at', now).eq('is_permanent', false);
    return { count: count || 0, error };
};

// --- Question Bank & Chat ---
export const getAllStudentQuestions = async (): Promise<StudentQuestion[]> => {
    const { data } = await supabase.from('student_questions').select('*').order('created_at', { ascending: false });
    return (data || []).map((q: any) => ({
        id: q.id,
        userId: q.user_id,
        userName: q.user_name,
        questionText: q.question_text,
        answerText: q.answer_text,
        status: q.status,
        createdAt: q.created_at
    }));
};

export const answerStudentQuestion = async (id: string, answer: string) => {
    return await supabase.from('student_questions').update({ answer_text: answer, status: 'Answered' }).eq('id', id);
};

export const getChatUsage = (userId: string) => {
    const key = `chat_usage_${userId}_${new Date().toISOString().split('T')[0]}`;
    const used = parseInt(localStorage.getItem(key) || '0');
    return { used, remaining: 50 - used };
};

export const incrementChatUsage = (userId: string) => {
    const key = `chat_usage_${userId}_${new Date().toISOString().split('T')[0]}`;
    const used = parseInt(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, used.toString());
    return { used, remaining: 50 - used };
};

// --- Device Sessions ---
export const clearUserDevices = async (userId: string) => {
    return await supabase.from('device_sessions').update({ active: false }).eq('user_id', userId);
};

export const clearAllActiveSessions = async () => {
    return await supabase.from('device_sessions').update({ active: false }).eq('active', true);
};

// --- Platform Settings ---
export const getPlatformSettings = async (): Promise<PlatformSettings | null> => {
    const { data } = await supabase.from('platform_settings').select('*').limit(1).single();
    if (!data) return null;
    return {
        id: data.id,
        platformName: data.platform_name,
        heroTitle: data.hero_title,
        heroSubtitle: data.hero_subtitle,
        heroButtonText: data.hero_button_text,
        heroImageUrl: data.hero_image_url,
        teacherImageUrl: data.teacher_image_url,
        featuresTitle: data.features_title,
        featuresSubtitle: data.features_subtitle,
        features: data.features,
        footerDescription: data.footer_description,
        contactPhone: data.contact_phone,
        contactFacebookUrl: data.contact_facebook_url,
        contactYoutubeUrl: data.contact_youtube_url,
        contactInstagramUrl: data.contact_instagram_url,
        contactWhatsappUrl: data.contact_whatsapp_url,
        // Fix: Use camelCase key for galleryImages to match PlatformSettings interface
        galleryImages: data.gallery_images || [],
        monthlyPrice: data.monthly_price,
        quarterlyPrice: data.quarterly_price,
        semiAnnuallyPrice: data.semi_annually_price,
        annualPrice: data.annual_price,
        currency: data.currency,
        paymentNumbers: data.payment_numbers,
        enabledSubscriptionModes: data.enabled_subscription_modes,
        /* Fixed: Property naming mismatch between DB (snake_case) and Interface (camelCase) */
        announcementBanner: data.announcement_banner,
        iconSettings: data.icon_settings
    };
};

export const updatePlatformSettings = async (settings: PlatformSettings) => {
    if (!settings.id) {
        console.error("Missing ID in updatePlatformSettings");
        return { error: { message: "فشل التعرف على سجل الإعدادات (ID مفقود)." } };
    }

    const dbSettings = {
        platform_name: settings.platformName,
        hero_title: settings.heroTitle,
        hero_subtitle: settings.heroSubtitle,
        hero_button_text: settings.heroButtonText,
        hero_image_url: settings.heroImageUrl,
        teacher_image_url: settings.teacherImageUrl,
        features_title: settings.featuresTitle,
        features_subtitle: settings.featuresSubtitle,
        features: settings.features,
        footer_description: settings.footerDescription,
        contact_phone: settings.contactPhone,
        contact_facebook_url: settings.contactFacebookUrl,
        contact_youtube_url: settings.contactYoutubeUrl,
        contact_instagram_url: settings.contactInstagramUrl,
        contact_whatsapp_url: settings.contactWhatsappUrl,
        // Fix: Use camelCase key from settings for galleryImages
        gallery_images: settings.galleryImages || [],
        monthly_price: settings.monthlyPrice,
        quarterly_price: settings.quarterlyPrice,
        semi_annually_price: settings.semiAnnuallyPrice,
        annual_price: settings.annualPrice,
        currency: settings.currency,
        payment_numbers: settings.paymentNumbers,
        enabled_subscription_modes: settings.enabledSubscriptionModes,
        /* Fixed: Property naming mismatch between Input (camelCase) and DB Payload (snake_case) */
        announcement_banner: settings.announcementBanner || { text: '', enabled: false },
        icon_settings: settings.iconSettings
    };
    return await supabase.from('platform_settings').update(dbSettings).eq('id', settings.id);
};

// --- Storage Upload ---
export async function uploadImage(file: File, options?: { oldImageUrl?: string }) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    if (options?.oldImageUrl) {
        const parts = options.oldImageUrl.split('/');
        const oldFileName = parts[parts.length - 1];
        await supabase.storage.from('images').remove([oldFileName]);
    }

    const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
    if (uploadError) return { url: null, error: uploadError };

    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
    return { url: data.publicUrl, error: null };
}
