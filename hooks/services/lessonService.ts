
import { supabase } from './storageService';
import { QuizQuestion } from '../types';

// === Interfaces ===

// Extend or adapt QuizQuestion if the DB schema differs slightly, 
// or use the existing one from types.ts if compatible.
// Based on prompt, we define the structure expected by the service functions.

export interface LessonData {
  title: string;              // اسم الحصة (مطلوب)
  description?: string;       // الوصف
  content?: string;           // الملخص
  video_url?: string;         // رابط الفيديو
  image_url?: string;         // صورة الحصة
  unit_id?: string;           // معرف الوحدة
  grade_id?: number;          // معرف الصف
  subject_id?: number;        // معرف المادة
  teacher_id?: string;        // معرف المعلم
  type?: 'video' | 'quiz' | 'text' | 'Explanation' | 'Homework' | 'Exam' | 'Summary';  // نوع الحصة
  is_free?: boolean;          // مجانية
  display_order?: number;     // الترتيب
  questions?: QuizQuestion[]; // أسئلة تخطي الدرس
  correct_answers?: string[]; // الإجابات الصحيحة
  passing_score?: number;     // درجة النجاح
  time_limit?: number;        // وقت الاختبار
}

export interface LessonQuizData {
  questions: QuizQuestion[];
  passing_score?: number;    // درجة النجاح (0-100)
  time_limit?: number;       // الوقت بالدقائق
}

export interface LessonDetailsData {
  description?: string;  // الوصف
  content?: string;      // الملخص/الشرح
}

// === إضافة حصة جديدة ===
export const addLesson = async (lessonData: LessonData) => {
  const { data, error } = await supabase
    .from('lessons')
    .insert({
      title: lessonData.title,
      description: lessonData.description || null,
      content: lessonData.content || null,
      // Note: Adjusting mapping based on existing DB schema if columns differ
      // Assuming columns exist as per instruction or mapped to existing ones
      video_url: lessonData.video_url || null, 
      image_url: lessonData.image_url || null,
      unit_id: lessonData.unit_id || null,
      grade_id: lessonData.grade_id || null,
      // subject_id: lessonData.subject_id || null, // Uncomment if subject_id column exists
      teacher_id: lessonData.teacher_id || null,
      type: lessonData.type || 'video',
      is_free: lessonData.is_free || false,
      display_order: lessonData.display_order || 0,
      questions: lessonData.questions || [],
      correct_answers: lessonData.correct_answers || [],
      passing_score: lessonData.passing_score || 50,
      time_limit: lessonData.time_limit || null
    })
    .select()
    .single();

  if (error) {
    console.error('❌ فشل إضافة الحصة:', error.message);
    return { success: false, error: error.message };
  }

  console.log('✅ تم إضافة الحصة:', data);
  return { success: true, data };
};

// === تعديل اسم الحصة ===
export const updateLessonTitle = async (lessonId: string, newTitle: string) => {
  const { data, error } = await supabase
    .from('lessons')
    .update({ title: newTitle })
    .eq('id', lessonId)
    .select()
    .single();

  if (error) {
    console.error('❌ فشل تعديل الاسم:', error.message);
    return { success: false, error: error.message };
  }

  console.log('✅ تم تعديل الاسم:', data);
  return { success: true, data };
};

// === تعديل الوصف والملخص ===
export const updateLessonDetails = async (
  lessonId: string, 
  details: LessonDetailsData
) => {
  const { data, error } = await supabase
    .from('lessons')
    .update({
      description: details.description,
      content: details.content
    })
    .eq('id', lessonId)
    .select()
    .single();

  if (error) {
    console.error('❌ فشل التعديل:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, data };
};

// === إضافة/تعديل أسئلة تخطي الدرس ===
export const updateLessonQuiz = async (
  lessonId: string,
  quizData: LessonQuizData
) => {
  // استخراج الإجابات الصحيحة (Assuming QuizQuestion has correctAnswerIndex or correctAnswer)
  const correctAnswers = quizData.questions.map(q => 
    q.correctAnswerIndex !== undefined ? q.correctAnswerIndex.toString() : ''
  );

  const { data, error } = await supabase
    .from('lessons')
    .update({
      // type: 'quiz', // Optional: Force type update or keep existing
      questions: quizData.questions,
      correct_answers: correctAnswers,
      passing_score: quizData.passing_score || 50,
      time_limit: quizData.time_limit || null
    })
    .eq('id', lessonId)
    .select()
    .single();

  if (error) {
    console.error('❌ فشل تحديث الأسئلة:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, data };
};

// === جلب كل الحصص ===
export const fetchAllLessons = async () => {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('❌ فشل جلب الحصص:', error.message);
    return [];
  }

  return data;
};

// === جلب حصص وحدة معينة ===
export const fetchLessonsByUnit = async (unitId: string) => {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('unit_id', unitId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('❌ فشل جلب الحصص:', error.message);
    return [];
  }

  return data;
};

// === جلب حصة واحدة ===
export const fetchLesson = async (lessonId: string) => {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .maybeSingle();

  if (error) {
    console.error('❌ فشل جلب الحصة:', error.message);
    return null;
  }

  return data;
};

// === حذف حصة ===
export const deleteLesson = async (lessonId: string) => {
  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', lessonId);

  if (error) {
    console.error('❌ فشل حذف الحصة:', error.message);
    return { success: false, error: error.message };
  }

  console.log('✅ تم حذف الحصة');
  return { success: true };
};

// === تعديل شامل للحصة ===
export const updateLesson = async (
  lessonId: string,
  updates: Partial<LessonData>
) => {
  const { data, error } = await supabase
    .from('lessons')
    .update(updates)
    .eq('id', lessonId)
    .select()
    .single();

  if (error) {
    console.error('❌ فشل تعديل الحصة:', error.message);
    return { success: false, error: error.message };
  }

  console.log('✅ تم تعديل الحصة:', data);
  return { success: true, data };
};
