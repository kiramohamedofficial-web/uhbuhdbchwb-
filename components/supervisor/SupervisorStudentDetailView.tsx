
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { User, Grade, ToastType, Subscription, QuizAttempt, VideoActivity, Teacher, Lesson, QuizQuestion } from '../../types';
import { 
    getAllGrades,
    getStudentProgress, 
    getStudentQuizAttempts,
    getVideoActivityForStudent,
    getLessonDetails
} from '../../services/storageService';
import { getSubscriptionsByUserId } from '../../services/subscriptionService';
import { getAllTeachers } from '../../services/teacherService';
import { 
    ArrowRightIcon, ChartBarIcon, VideoCameraIcon, CheckCircleIcon, XCircleIcon, 
    PencilIcon, UserIcon, GraduationCapIcon, EnvelopeIcon, PhoneIcon, ShieldCheckIcon, 
    ClockIcon, QrcodeIcon, UserCircleIcon, CreditCardIcon, CalendarIcon, SparklesIcon,
    InformationCircleIcon
} from '../common/Icons';
import { useToast } from '../../useToast';
import Loader from '../common/Loader';
import Modal from '../common/Modal';

// --- Utility Functions ---

const formatSecondsToText = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    let parts = [];
    if (hours > 0) parts.push(`${hours} ساعة`);
    if (minutes > 0) parts.push(`${minutes} دقيقة`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} ثانية`);
    
    return parts.join(' و ');
};

const detectGender = (name: string): 'male' | 'female' => {
    const first = name.split(' ')[0].trim();
    if (first.endsWith('ة') || first.endsWith('ه') || first.endsWith('ى') || first.endsWith('اء')) return 'female';
    const femaleNames = ['مريم', 'زينب', 'هند', 'سعاد', 'نور', 'شهد', 'ملك', 'يارا', 'ريماس', 'جنى', 'حبيبة', 'بسملة', 'فاطمة', 'عائشة', 'سلمى', 'آية', 'فريدة', 'مكة', 'خلود', 'رانيا', 'دعاء', 'إيمان', 'هدير', 'نسمة', 'نهى', 'رضوى', 'ياسمين', 'أمل', 'أماني'];
    if (femaleNames.includes(first)) return 'female';
    return 'male';
};

const DetailRow: React.FC<{ label: string; value: string; icon?: any; isCopyable?: boolean }> = ({ label, value, icon: Icon, isCopyable }) => {
    const { addToast } = useToast();
    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        addToast('تم النسخ', ToastType.SUCCESS);
    };

    return (
        <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)]/50 rounded-2xl border border-[var(--border-primary)] group hover:border-purple-400/30 transition-colors">
            <div className="flex items-center gap-3 overflow-hidden">
                {Icon && <Icon className="w-5 h-5 text-[var(--text-secondary)] shrink-0" />}
                <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="text-sm font-black text-[var(--text-primary)] truncate" dir="auto">{value || 'غير محدد'}</p>
                </div>
            </div>
            {isCopyable && value && (
                <button onClick={handleCopy} className="p-2 text-[var(--text-secondary)] hover:text-purple-500 hover:bg-[var(--bg-secondary)] rounded-xl transition-all opacity-0 group-hover:opacity-100">
                    <QrcodeIcon className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

interface SupervisorStudentDetailViewProps {
  user: User;
  onBack: () => void;
}

const SupervisorStudentDetailView: React.FC<SupervisorStudentDetailViewProps> = ({ user, onBack }) => {
  const { addToast } = useToast();
  const [dataVersion, setDataVersion] = useState(0);
  const [localUser, setLocalUser] = useState(user);

  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allGrades, setAllGrades] = useState<Grade[]>([]);
  const [progress, setProgress] = useState<{ lesson_id: string }[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [videoActivity, setVideoActivity] = useState<VideoActivity[]>([]);

  // UI State
  const [watchHistoryMode, setWatchHistoryMode] = useState<'normal' | 'detailed'>('normal');

  // Quiz Review State
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null);
  const [reviewLesson, setReviewLesson] = useState<Lesson | null>(null);
  const [isLoadingReview, setIsLoadingReview] = useState(false);

  useEffect(() => { setLocalUser(user); }, [user]);

  const handleViewQuizReview = async (attempt: QuizAttempt) => {
    setSelectedAttempt(attempt);
    setIsLoadingReview(true);
    try {
      const lesson = await getLessonDetails(attempt.lessonId);
      setReviewLesson(lesson);
    } catch (e) {
      addToast('فشل تحميل تفاصيل الاختبار', ToastType.ERROR);
    } finally {
      setIsLoadingReview(false);
    }
  };

  const resolvedReviewQuestions = useMemo((): QuizQuestion[] => {
    if (!reviewLesson) return [];
    const raw = reviewLesson.questions || reviewLesson.videoQuestions || [];
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch (e) { return []; }
    }
    return Array.isArray(raw) ? raw : [];
  }, [reviewLesson]);
  
  const lessonMap = useMemo(() => {
    const map = new Map<string, { lessonTitle: string; unitTitle: string; }>();
    if (allGrades) {
        allGrades.forEach(grade => {
            (grade.semesters || []).forEach(semester => {
                (semester.units || []).forEach(unit => {
                    (unit.lessons || []).forEach(lesson => {
                        map.set(lesson.id, { lessonTitle: lesson.title, unitTitle: unit.title });
                    });
                });
            });
        });
    }
    return map;
  }, [allGrades]);

  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);

  useEffect(() => {
    const fetchData = async () => {
        setIsLoadingDetails(true);
        try {
            const [subsData, teachersData, gradesData, progressData, attemptsData, activityData] = await Promise.all([
                getSubscriptionsByUserId(localUser.id),
                getAllTeachers(),
                getAllGrades(),
                getStudentProgress(localUser.id),
                getStudentQuizAttempts(localUser.id),
                getVideoActivityForStudent(localUser.id)
            ]);
            setSubscriptions(subsData);
            setTeachers(teachersData);
            setAllGrades(gradesData);
            setProgress(progressData || []);
            setAttempts(attemptsData || []);
            setVideoActivity(activityData || []);
        } catch (e) {
            console.error("Error fetching detail view data", e);
        } finally {
             setIsLoadingDetails(false);
        }
    };
    fetchData();
  }, [localUser.id, dataVersion]);
  
  const gradeId = localUser.grade;
  const gradeName = useMemo(() => {
    if (gradeId === null || gradeId === undefined) return 'غير محدد';
    const gradeInfo = allGrades.find(g => g.id === gradeId);
    return gradeInfo?.name || `صف غير معروف (ID: ${gradeId})`;
  }, [gradeId, allGrades]);

  const studentGender = useMemo(() => detectGender(localUser.name), [localUser.name]);

  const { activeSubscriptions, expiredSubscriptions } = useMemo(() => {
      const now = new Date();
      const sortedSubs = [...subscriptions].sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
      
      return {
          activeSubscriptions: sortedSubs.filter(s => s.status === 'Active' && new Date(s.endDate) >= now),
          expiredSubscriptions: sortedSubs.filter(s => s.status === 'Expired' || new Date(s.endDate) < now)
      };
  }, [subscriptions]);

  return (
    <div className="fade-in pb-20">
      <button onClick={onBack} className="flex items-center space-x-2 space-x-reverse mb-6 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
        <ArrowRightIcon className="w-4 h-4" />
        <span>العودة إلى قائمة الطلاب</span>
      </button>

      {/* Hero Profile Card - Gender Aware */}
      <div className="bg-[var(--bg-secondary)] rounded-[2.5rem] p-8 border border-[var(--border-primary)] shadow-lg relative overflow-hidden mb-8">
            <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-purple-500/10 to-transparent pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                
                {/* Gender Specific Avatar Container */}
                <div className={`w-32 h-32 rounded-[2rem] p-1 shadow-2xl bg-gradient-to-br ${studentGender === 'female' ? 'from-pink-400 to-rose-500' : 'from-blue-500 to-indigo-600'}`}>
                    <div className="w-full h-full rounded-[1.8rem] overflow-hidden bg-[var(--bg-tertiary)] flex items-center justify-center relative">
                         {localUser.imageUrl ? (
                             <img src={localUser.imageUrl} className="w-full h-full object-cover" /> 
                         ) : (
                             studentGender === 'female' ? (
                                <UserCircleIcon className="w-16 h-16 text-pink-400" /> 
                             ) : (
                                <UserIcon className="w-16 h-16 text-indigo-500" />
                             )
                         )}
                         {/* Gender Icon Badge */}
                         <div className={`absolute bottom-2 left-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold border-2 border-[var(--bg-secondary)] shadow-sm ${studentGender === 'female' ? 'bg-pink-500' : 'bg-blue-600'}`}>
                            {studentGender === 'female' ? '♀' : '♂'}
                         </div>
                    </div>
                </div>

                <div className="text-center md:text-right flex-1">
                    <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
                        <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">{localUser.name}</h1>
                        <span className={`px-4 py-1 rounded-full text-sm font-black uppercase tracking-widest ${activeSubscriptions.length > 0 ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                            {activeSubscriptions.length > 0 ? 'اشتراك نشط' : 'غير مشترك'}
                        </span>
                    </div>
                    <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm font-bold text-[var(--text-secondary)] opacity-80">
                        <span className="flex items-center gap-2"><GraduationCapIcon className="w-4 h-4"/> {gradeName}</span>
                        <span className="flex items-center gap-2"><PhoneIcon className="w-4 h-4"/> <span dir="ltr">{localUser.phone}</span></span>
                    </div>
                </div>
            </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Personal Info & Subscriptions */}
          <div className="lg:col-span-1 space-y-6">
              <div className="bg-[var(--bg-secondary)] p-6 rounded-[2.5rem] shadow-lg border border-[var(--border-primary)]">
                  <h2 className="text-lg font-black text-[var(--text-primary)] mb-4 flex items-center gap-2"><UserIcon className="w-5 h-5 text-purple-500"/> البيانات الشخصية</h2>
                  <div className="space-y-3">
                      <DetailRow label="كود الطالب (ID)" value={localUser.id} icon={QrcodeIcon} isCopyable />
                      <DetailRow label="البريد الإلكتروني" value={localUser.email} icon={EnvelopeIcon} />
                      <DetailRow label="رقم ولي الأمر" value={localUser.guardianPhone} icon={ShieldCheckIcon} isCopyable />
                  </div>
              </div>
              
              {/* Subscriptions List (Active & Expired) */}
              <div className="bg-[var(--bg-secondary)] p-6 rounded-[2.5rem] shadow-lg border border-[var(--border-primary)]">
                  <h2 className="text-lg font-black text-[var(--text-primary)] mb-4 flex items-center gap-2"><CreditCardIcon className="w-5 h-5 text-emerald-500"/> الاشتراكات</h2>
                  
                  {activeSubscriptions.length > 0 && (
                      <div className="mb-6 space-y-3">
                          <p className="text-sm font-bold text-[var(--text-secondary)] uppercase">نشط حالياً</p>
                          {activeSubscriptions.map((sub) => (
                              <div key={sub.id} className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
                                  <div className="flex justify-between items-start mb-2">
                                      <div>
                                          <p className="font-black text-sm text-[var(--text-primary)]">{sub.teacherId ? teacherMap.get(sub.teacherId) : "باقة شاملة"}</p>
                                          <p className="text-sm text-[var(--text-secondary)] uppercase font-bold">{sub.plan}</p>
                                      </div>
                                      <span className="px-2 py-0.5 rounded text-sm font-black bg-emerald-500 text-white">نشط</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-sm text-emerald-700 font-mono">
                                      <ClockIcon className="w-3 h-3"/>
                                      <span>ينتهي: {new Date(sub.endDate).toLocaleDateString('ar-EG')}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}

                  {expiredSubscriptions.length > 0 && (
                      <div className="space-y-3">
                          <p className="text-sm font-bold text-[var(--text-secondary)] uppercase">السجل السابق</p>
                          {expiredSubscriptions.slice(0, 3).map((sub) => (
                              <div key={sub.id} className="p-3 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)] opacity-70">
                                  <div className="flex justify-between items-center">
                                      <p className="font-bold text-sm text-[var(--text-primary)]">{sub.teacherId ? teacherMap.get(sub.teacherId) : "باقة شاملة"}</p>
                                      <span className="text-sm font-bold text-red-500">منتهي</span>
                                  </div>
                                  <p className="text-sm text-[var(--text-secondary)] mt-1 font-mono">{new Date(sub.endDate).toLocaleDateString('ar-EG')}</p>
                              </div>
                          ))}
                      </div>
                  )}
                  
                  {subscriptions.length === 0 && <p className="text-sm text-[var(--text-secondary)] text-center py-4">لا توجد اشتراكات مسجلة.</p>}
              </div>
          </div>
          
          {/* Right Column: Academic Performance */}
          <div className="lg:col-span-2 bg-[var(--bg-secondary)] p-6 rounded-[2.5rem] shadow-lg border border-[var(--border-primary)] space-y-6">
                
                {isLoadingDetails ? <div className="flex justify-center items-center h-64"><Loader/></div> : (
                    <>
                         {/* Video Activity Table */}
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-3">
                                    <VideoCameraIcon className="w-6 h-6 text-blue-400"/>
                                    سجل المشاهدة ({videoActivity.length})
                                </h2>
                                <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-xl border border-[var(--border-primary)]">
                                    <button 
                                        onClick={() => setWatchHistoryMode('normal')}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${watchHistoryMode === 'normal' ? 'bg-white text-black shadow-sm' : 'text-[var(--text-secondary)]'}`}
                                    >
                                        نسبة
                                    </button>
                                    <button 
                                        onClick={() => setWatchHistoryMode('detailed')}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${watchHistoryMode === 'detailed' ? 'bg-white text-black shadow-sm' : 'text-[var(--text-secondary)]'}`}
                                    >
                                        وقت
                                    </button>
                                </div>
                            </div>
                            
                            <div className="max-h-80 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                                {videoActivity.length > 0 ? videoActivity.map(activity => {
                                    const lessonInfo = lessonMap.get(activity.lesson_id);
                                    const timeWatchedText = formatSecondsToText(activity.watched_seconds || 0);

                                    return (
                                        <div key={activity.id} className="p-4 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--border-primary)] hover:border-blue-400/30 transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-bold text-sm text-[var(--text-primary)]">{lessonInfo?.lessonTitle || 'درس غير معروف'}</p>
                                                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">{lessonInfo?.unitTitle || 'وحدة غير معروفة'}</p>
                                                </div>
                                                
                                                {watchHistoryMode === 'detailed' && (
                                                    <div className="text-left bg-[var(--bg-secondary)] px-2 py-1 rounded-lg border border-[var(--border-primary)] flex items-center gap-1.5">
                                                        <ClockIcon className="w-3 h-3 text-blue-500" />
                                                        <span className="text-sm font-bold text-blue-600 dir-ltr">{timeWatchedText}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: activity.milestone || '0%' }}></div>
                                                </div>
                                                <span className="text-sm font-black text-blue-500 w-8 text-left">{activity.milestone || '0%'}</span>
                                            </div>
                                            
                                            <div className="mt-2 text-sm text-[var(--text-secondary)] text-left opacity-60 font-mono">
                                                آخر مشاهدة: {new Date(activity.last_updated_at).toLocaleString('ar-EG')}
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="text-center py-12 text-[var(--text-secondary)] opacity-50">
                                        لا يوجد نشاط مشاهدة مسجل.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quiz Results */}
                        <div className="pt-4 border-t border-[var(--border-primary)]">
                            <h3 className="font-black text-[var(--text-primary)] mb-4 flex items-center gap-2"><ChartBarIcon className="w-5 h-5 text-purple-500"/> نتائج الاختبارات ({attempts.length})</h3>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                                {attempts.length > 0 ? attempts.map(att => (
                                    <div key={att.id} className="flex justify-between items-center p-3 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)] group hover:border-indigo-500/30 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm ${att.isPass ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                                {att.score}%
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-[var(--text-primary)]">{lessonMap.get(att.lessonId)?.lessonTitle || 'اختبار غير معروف'}</p>
                                                <p className="text-sm text-[var(--text-secondary)] mt-0.5">{new Date(att.submittedAt).toLocaleDateString('ar-EG')}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleViewQuizReview(att)}
                                            className="px-3 py-1.5 bg-indigo-600/10 text-indigo-600 rounded-lg text-sm font-black hover:bg-indigo-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            عرض
                                        </button>
                                    </div>
                                )) : (
                                    <p className="text-center text-sm text-[var(--text-secondary)] py-4">لا توجد نتائج اختبارات.</p>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
      </div>

      {/* Quiz Review Modal for Supervisor */}
      <Modal isOpen={!!selectedAttempt} onClose={() => { setSelectedAttempt(null); setReviewLesson(null); }} title="تفاصيل إجابات الطالب" maxWidth="max-w-4xl">
        {isLoadingReview ? (
          <div className="py-20 flex justify-center"><Loader /></div>
        ) : selectedAttempt && reviewLesson ? (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
            <div className="bg-indigo-600/5 border border-indigo-600/10 p-6 rounded-3xl flex justify-between items-center">
              <div>
                <h4 className="font-black text-lg text-indigo-600">{lessonMap.get(selectedAttempt.lessonId)?.lessonTitle}</h4>
                <p className="text-sm font-bold text-[var(--text-secondary)] mt-1">تاريخ التسليم: {new Date(selectedAttempt.submittedAt).toLocaleString('ar-EG')}</p>
              </div>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${selectedAttempt.isPass ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                {selectedAttempt.score}%
              </div>
            </div>

            <div className="space-y-4">
              {resolvedReviewQuestions.length > 0 ? resolvedReviewQuestions.map((q, idx) => {
                const studentAnswerIdx = (selectedAttempt.submittedAnswers as (number | null)[])?.[idx];
                const isCorrect = studentAnswerIdx !== null && studentAnswerIdx !== undefined && Number(studentAnswerIdx) === Number(q.correctAnswerIndex);

                return (
                  <div key={idx} className={`p-6 rounded-3xl border-2 transition-all ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
                    <div className="flex items-start gap-3 mb-4">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>{idx + 1}</span>
                      <p className="font-bold text-[var(--text-primary)] pt-1">{q.questionText}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => {
                        const isStudentChoice = studentAnswerIdx !== null && studentAnswerIdx !== undefined && Number(studentAnswerIdx) === optIdx;
                        const isCorrectChoice = Number(q.correctAnswerIndex) === optIdx;
                        
                        let style = "bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-secondary)]";
                        if (isCorrectChoice) style = "bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-400";
                        else if (isStudentChoice && !isCorrect) style = "bg-rose-500/20 border-rose-500/40 text-rose-700 dark:text-rose-400";

                        return (
                          <div key={optIdx} className={`p-3 rounded-xl border text-sm font-bold flex items-center gap-2 ${style}`}>
                            <span className="opacity-50">{["أ", "ب", "ج", "د"][optIdx]}.</span>
                            <span>{opt}</span>
                            {isCorrectChoice && <CheckCircleIcon className="w-4 h-4 mr-auto" />}
                            {isStudentChoice && !isCorrect && <XCircleIcon className="w-4 h-4 mr-auto" />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation / Improvement Tip */}
                    {!isCorrect && (
                        <div className="mt-4 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex items-center gap-3 mb-2">
                            <InformationCircleIcon className="w-5 h-5 text-indigo-500" />
                            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                الإجابة الصحيحة هي: <span className="underline">{q.options[Number(q.correctAnswerIndex)]}</span>
                            </p>
                        </div>
                    )}

                    {(!isCorrect || q.rationale) && (
                        <div className="mt-2 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex gap-3 items-start">
                            <SparklesIcon className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-black text-indigo-600 mb-1 uppercase tracking-wider">تحليل الذكاء الاصطناعي</p>
                                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                    {q.rationale || (isCorrect ? "أحسنت! إجابتك صحيحة لأنك اخترت الخيار الأدق بناءً على فهمك للمادة." : "يحتاج الطالب لمراجعة هذا الجزء. الإجابة الصحيحة تعتمد على المفاهيم الأساسية المذكورة في الشرح.")}
                                </p>
                            </div>
                        </div>
                    )}
                  </div>
                );
              }) : (
                <div className="text-center py-10 bg-[var(--bg-tertiary)] rounded-3xl border border-dashed border-[var(--border-primary)]">
                  <p className="text-sm font-bold text-[var(--text-secondary)]">لا تتوفر تفاصيل لهذا الاختبار</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-[var(--text-secondary)] font-bold">تعذر تحميل البيانات</div>
        )}
      </Modal>
    </div>
  );
};

export default SupervisorStudentDetailView;
