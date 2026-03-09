
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Lesson, QuizAttempt, QuizQuestion } from '../../types';
import { getLatestQuizAttemptForLesson, saveQuizAttempt } from '../../services/storageService';
import { 
    ClockIcon, CheckCircleIcon, XCircleIcon, BookOpenIcon, 
    ChevronLeftIcon, ChevronRightIcon, PlaySolidIcon, 
    CheckIcon, PencilIcon, SparklesIcon, ChartBarIcon,
    ShieldCheckIcon, InformationCircleIcon
} from '../common/Icons';
import { useSession } from '../../hooks/useSession';
import Loader from '../common/Loader';

interface QuizTakerProps {
  lesson: Lesson;
  onComplete: (lessonId: string) => Promise<void>;
}

const QuizTaker: React.FC<QuizTakerProps> = ({ lesson, onComplete }) => {
    const { currentUser: user } = useSession();
    const [view, setView] = useState<'start' | 'taking' | 'result'>('start');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [imageAnswers, setImageAnswers] = useState<string[]>([]);
    const [mcqAnswers, setMcqAnswers] = useState<{ [key: number]: number }>({});
    const [timeLeft, setTimeLeft] = useState(lesson.timeLimit ? lesson.timeLimit * 60 : 0);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [currentAttempt, setCurrentAttempt] = useState<QuizAttempt | null | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const resolvedQuestions = useMemo((): QuizQuestion[] => {
        const raw = lesson.questions || lesson.videoQuestions || [];
        if (typeof raw === 'string') {
            try { return JSON.parse(raw); } catch (e) { return []; }
        }
        return Array.isArray(raw) ? raw : [];
    }, [lesson.questions, lesson.videoQuestions]);

    useEffect(() => {
        if (!user) return;
        const fetchPreviousAttempt = async () => {
            const attempt = await getLatestQuizAttemptForLesson(user.id, lesson.id);
            setCurrentAttempt(attempt);
            if (attempt) setView('result');
        };
        fetchPreviousAttempt();
    }, [user, lesson.id]);

    const handleSubmit = useCallback(async () => {
        if (!user || isSubmitting) return;
        setIsSubmitting(true);
        
        let score = 0;
        let submittedAnswers: QuizAttempt['submittedAnswers'] = [];
        const passingScore = lesson.passingScore ?? 50;
        const isMcq = (lesson.quizType?.toLowerCase() === 'mcq') || (resolvedQuestions.length > 0);

        if (isMcq && resolvedQuestions.length > 0) {
            const mcqAnswersArray: (number | null)[] = Array(resolvedQuestions.length).fill(null);
            for (const qIndex in mcqAnswers) {
                mcqAnswersArray[parseInt(qIndex)] = mcqAnswers[qIndex];
            }
            submittedAnswers = mcqAnswersArray;
            const correctCount = resolvedQuestions.reduce((count, q, idx) => {
                const userAnswer = mcqAnswers[idx];
                if (userAnswer === undefined || userAnswer === null) return count;
                return count + (Number(q.correctAnswerIndex) === Number(userAnswer) ? 1 : 0);
            }, 0);
            score = Math.round((correctCount / resolvedQuestions.length) * 100);
        } else {
             submittedAnswers = imageAnswers;
             const correctAnswers = lesson.correctAnswers || [];
             const correctCount = imageAnswers.filter(ans => correctAnswers.some(c => c.trim().toLowerCase() === ans.trim().toLowerCase())).length;
             score = correctAnswers.length > 0 ? Math.round((correctCount / correctAnswers.length) * 100) : 100;
        }

        const timeTaken = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
        await saveQuizAttempt(user.id, lesson.id, score, submittedAnswers, timeTaken);
        
        if (score >= passingScore) await onComplete(lesson.id);

        const newAttemptData = await getLatestQuizAttemptForLesson(user.id, lesson.id);
        if(newAttemptData) setCurrentAttempt(newAttemptData);
        setView('result');
        setIsSubmitting(false);
    }, [imageAnswers, mcqAnswers, lesson, user, startTime, onComplete, resolvedQuestions, isSubmitting]);

    const handleOptionSelect = (qIndex: number, optIndex: number) => {
        setMcqAnswers(prev => ({ ...prev, [qIndex]: optIndex }));
        
        if (qIndex < resolvedQuestions.length - 1) {
            setTimeout(() => {
                setCurrentQuestionIndex(prev => prev + 1);
            }, 500);
        }
    };

    useEffect(() => {
        if (view !== 'taking' || !lesson.timeLimit) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { clearInterval(timer); handleSubmit(); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [view, lesson.timeLimit, handleSubmit]);
    
    if (!user || currentAttempt === undefined) return <div className="flex justify-center py-20"><Loader /></div>;

    if (view === 'start') {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in max-w-xl mx-auto">
                <div className="w-24 h-24 bg-indigo-500/10 text-indigo-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner border-2 border-indigo-500/10 animate-bounce-slow">
                    <SparklesIcon className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black text-[var(--text-primary)] mb-4 tracking-tight">جاهز لبدء التحدي؟</h2>
                <p className="text-[var(--text-secondary)] mb-10 text-base font-bold leading-relaxed opacity-60">سيتم اختبارك في النقاط الأساسية للدرس. تأكد من مراجعة الفيديو جيداً قبل البدء.</p>
                
                <div className="grid grid-cols-2 gap-4 w-full mb-10">
                    <div className="bg-[var(--bg-tertiary)] p-6 rounded-[2rem] border border-[var(--border-primary)] shadow-sm">
                        <p className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-2 opacity-50">عدد الأسئلة</p>
                        <p className="text-2xl font-black text-indigo-600">{resolvedQuestions.length || lesson.correctAnswers?.length || 0}</p>
                    </div>
                    <div className="bg-[var(--bg-tertiary)] p-6 rounded-[2rem] border border-[var(--border-primary)] shadow-sm">
                        <p className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-2 opacity-50">درجة النجاح</p>
                        <p className="text-2xl font-black text-emerald-500">{lesson.passingScore || 50}%</p>
                    </div>
                </div>

                <button 
                    onClick={() => { setView('taking'); setStartTime(Date.now()); }}
                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-4 group"
                >
                    <span>ابدأ الاختبار الآن</span>
                    <PlaySolidIcon className="w-5 h-5 transition-transform group-hover:scale-110" />
                </button>
            </div>
        );
    }

    if (view === 'taking') {
        const isMcq = (lesson.quizType?.toLowerCase() === 'mcq') || (resolvedQuestions.length > 0);
        const progress = resolvedQuestions.length > 0 ? ((currentQuestionIndex + 1) / resolvedQuestions.length) * 100 : 0;

        return (
            <div className="max-w-3xl mx-auto animate-fade-in px-4">
                {/* Modern Header: Progress & Timer */}
                <div className="mb-10 space-y-5">
                    <div className="flex justify-between items-end px-2">
                        <div className="text-right">
                             <p className="text-sm font-black text-indigo-500 uppercase tracking-widest mb-1">التقدم</p>
                            <h3 className="text-2xl font-black text-[var(--text-primary)]">
                                {currentQuestionIndex + 1} <span className="text-sm opacity-60">/ {resolvedQuestions.length}</span>
                            </h3>
                        </div>
                        {lesson.timeLimit && (
                            <div className="px-6 py-2.5 bg-rose-500/10 rounded-2xl flex items-center gap-3 border border-rose-500/20 shadow-sm animate-pulse">
                                <ClockIcon className="w-5 h-5 text-rose-500" />
                                <span className="font-mono font-black text-rose-600 text-base">
                                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="h-2 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(79,70,229,0.5)]" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                {isMcq ? (
                    <div className="bg-[var(--bg-secondary)] rounded-[3rem] p-6 md:p-10 shadow-2xl border border-[var(--border-primary)] min-h-[500px] flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                        
                        <div className="animate-slide-up flex-1" key={currentQuestionIndex}>
                            <div className="bg-[var(--bg-tertiary)] p-6 md:p-8 rounded-[2.5rem] border border-[var(--border-primary)] mb-10 shadow-inner">
                                <h2 className="text-xl md:text-2xl font-black text-[var(--text-primary)] leading-relaxed text-center">
                                    {resolvedQuestions[currentQuestionIndex].questionText}
                                </h2>
                            </div>
                            
                            {resolvedQuestions[currentQuestionIndex].imageUrl && (
                                <div className="mb-10 rounded-[2.5rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl max-h-72">
                                    <img src={resolvedQuestions[currentQuestionIndex].imageUrl} className="w-full h-full object-contain bg-slate-900" alt="Question" />
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4">
                                {resolvedQuestions[currentQuestionIndex].options.map((opt, idx) => {
                                    const isSelected = mcqAnswers[currentQuestionIndex] === idx;
                                    return (
                                        <button 
                                            key={idx}
                                            onClick={() => handleOptionSelect(currentQuestionIndex, idx)}
                                            className={`
                                                w-full p-5 rounded-2xl text-right transition-all duration-300 group flex items-center justify-between border-2 active:scale-[0.98]
                                                ${isSelected 
                                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-500/30 -translate-y-1' 
                                                    : 'bg-[var(--bg-tertiary)] border-transparent hover:border-indigo-300 text-[var(--text-primary)]'}
                                            `}
                                        >
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center font-black transition-all ${isSelected ? 'bg-white text-indigo-600 border-white' : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
                                                    {["أ", "ب", "ج", "د"][idx]}
                                                </div>
                                                <span className="font-bold text-sm md:text-base leading-snug">{opt}</span>
                                            </div>
                                            {isSelected && (
                                                <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md">
                                                    <CheckIcon className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Pagination & Action Bar */}
                        <div className="flex justify-between items-center mt-12 pt-8 border-t border-[var(--border-primary)]">
                            <button 
                                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentQuestionIndex === 0}
                                className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-black text-sm disabled:opacity-20 transition-all hover:bg-[var(--border-primary)]"
                            >
                                <ChevronRightIcon className="w-5 h-5" /> السابق
                            </button>

                            {currentQuestionIndex === resolvedQuestions.length - 1 ? (
                                <button 
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="px-12 py-4 rounded-2xl bg-emerald-600 text-white font-black text-sm shadow-xl shadow-emerald-500/30 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 border-b-4 border-emerald-800"
                                >
                                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><CheckIcon className="w-5 h-5" /> تسليم الاختبار</>}
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setCurrentQuestionIndex(prev => Math.min(resolvedQuestions.length - 1, prev + 1))}
                                    className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                                >
                                    التالي <ChevronLeftIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Image-based Interface */
                    <div className="bg-[var(--bg-secondary)] rounded-[3rem] p-8 shadow-2xl border border-[var(--border-primary)] overflow-hidden relative">
                         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-rose-600"></div>
                        <div className="mb-10">
                            <h3 className="font-black text-[var(--text-primary)] text-xl mb-6 flex items-center gap-3">
                                <BookOpenIcon className="w-7 h-7 text-orange-500"/>
                                أجب على الأسئلة الموضحة بالصورة:
                            </h3>
                            <div className="rounded-[2rem] overflow-hidden shadow-2xl border border-[var(--border-primary)] bg-black group relative">
                                <img src={lesson.imageUrl} alt="Quiz" className="w-full h-auto opacity-90 group-hover:scale-105 transition-transform duration-1000" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <label className="block text-sm font-black uppercase text-[var(--text-secondary)] tracking-widest mr-2">مربع الإجابات</label>
                            <textarea
                                className="w-full p-8 bg-[var(--bg-tertiary)] rounded-[2.5rem] border-2 border-transparent focus:border-orange-500 outline-none transition-all text-base md:text-xl font-bold min-h-[250px] shadow-inner resize-none leading-relaxed"
                                placeholder="اكتب إجابتك لكل سؤال في سطر منفصل... مثال:
1. الإجابة الأولى
2. الإجابة الثانية"
                                onChange={(e) => setImageAnswers(e.target.value.split('\n'))}
                            />
                        </div>
                        
                        <button 
                            onClick={handleSubmit} 
                            disabled={isSubmitting}
                            className="w-full mt-10 py-5 bg-gradient-to-r from-orange-600 to-rose-600 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-orange-500/30 transition-all transform hover:scale-[1.02] active:scale-95 border-b-8 border-rose-800"
                        >
                            {isSubmitting ? <Loader /> : 'تسليم الحل النهائي'}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    if (view === 'result' && currentAttempt) {
        const { score, isPass, timeTaken, submittedAnswers } = currentAttempt;
        const minutes = Math.floor(timeTaken / 60);
        const seconds = timeTaken % 60;
        const isMcq = (lesson.quizType?.toLowerCase() === 'mcq') || (resolvedQuestions.length > 0);

        return (
            <div className="animate-fade-in max-w-3xl mx-auto px-4 pb-20">
                {/* Result Header Card */}
                <div className="bg-[var(--bg-secondary)] rounded-[3rem] p-10 shadow-2xl border border-[var(--border-primary)] mb-10 relative overflow-hidden text-center">
                    <div className={`absolute top-0 left-0 w-full h-2 ${isPass ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                    
                    <div className={`w-32 h-32 mx-auto rounded-[3rem] flex items-center justify-center mb-8 shadow-2xl border-4 transform rotate-3 transition-transform hover:rotate-0 ${isPass ? 'bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-900/20' : 'bg-rose-50 border-rose-500 text-rose-600 dark:bg-rose-900/20'}`}>
                        <div className="text-center">
                            <span className="text-4xl font-black block leading-none">{score}%</span>
                            <span className="text-sm font-bold uppercase mt-1">الدرجة</span>
                        </div>
                    </div>
                    
                    <h2 className="text-3xl font-black text-[var(--text-primary)] mb-3 tracking-tighter">
                        {isPass ? '🏆 عمل بطولي!' : '💪 محاولة جيدة!'}
                    </h2>
                    <p className="text-[var(--text-secondary)] text-sm font-bold mb-10 leading-relaxed opacity-60 max-w-md mx-auto">
                        {isPass 
                            ? 'لقد استوعبت المحتوى بشكل رائع. يمكنك الآن متابعة رحلتك التعليمية للدرس التالي بكل ثقة.' 
                            : 'هناك بعض النقاط التي تحتاج لمراجعة. لا بأس، التعلم رحلة مستمرة. حاول مراجعة الفيديو وإعادة المحاولة.'}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-2">
                        <div className="p-5 rounded-3xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] shadow-sm">
                            <ClockIcon className="w-5 h-5 text-indigo-500 mx-auto mb-2"/>
                            <p className="text-sm font-black uppercase text-[var(--text-secondary)] mb-1 opacity-70">الوقت المستغرق</p>
                            <p className="text-sm font-black" dir="ltr">{minutes}m {seconds}s</p>
                        </div>
                        <div className="p-5 rounded-3xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] shadow-sm">
                            <ChartBarIcon className="w-5 h-5 text-purple-500 mx-auto mb-2"/>
                            <p className="text-sm font-black uppercase text-[var(--text-secondary)] mb-1 opacity-70">الحالة</p>
                            <p className={`text-sm font-black ${isPass ? 'text-emerald-500' : 'text-rose-500'}`}>{isPass ? 'تم الاجتياز' : 'يحتاج مراجعة'}</p>
                        </div>
                    </div>
                </div>

                {/* Detailed Review Section */}
                {isMcq && resolvedQuestions.length > 0 && (
                    <div className="space-y-6 mb-12">
                        <h3 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3 px-4">
                            <SparklesIcon className="w-6 h-6 text-indigo-500" />
                            مراجعة الإجابات
                        </h3>
                        
                        {resolvedQuestions.map((q, idx) => {
                            const studentAnswerIdx = (submittedAnswers as (number | null)[])?.[idx];
                            const isCorrect = studentAnswerIdx === q.correctAnswerIndex;
                            
                            return (
                                <div key={idx} className={`bg-[var(--bg-secondary)] rounded-[2.5rem] p-6 md:p-8 border-2 transition-all ${isCorrect ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-black text-sm ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                            {idx + 1}
                                        </div>
                                        <h4 className="text-lg font-black text-[var(--text-primary)] leading-relaxed pt-1">
                                            {q.questionText}
                                        </h4>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        {q.options.map((opt, optIdx) => {
                                            const isStudentChoice = studentAnswerIdx === optIdx;
                                            const isCorrectChoice = q.correctAnswerIndex === optIdx;
                                            
                                            let bgColor = 'bg-[var(--bg-tertiary)]';
                                            let borderColor = 'border-transparent';
                                            let textColor = 'text-[var(--text-primary)]';
                                            let icon = null;

                                            if (isCorrectChoice) {
                                                bgColor = 'bg-emerald-500/10';
                                                borderColor = 'border-emerald-500/30';
                                                textColor = 'text-emerald-600 dark:text-emerald-400';
                                                icon = <CheckCircleIcon className="w-5 h-5 text-emerald-500" />;
                                            } else if (isStudentChoice && !isCorrect) {
                                                bgColor = 'bg-rose-500/10';
                                                borderColor = 'border-rose-500/30';
                                                textColor = 'text-rose-600 dark:text-rose-400';
                                                icon = <XCircleIcon className="w-5 h-5 text-rose-500" />;
                                            }

                                            return (
                                                <div 
                                                    key={optIdx}
                                                    className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-4 ${bgColor} ${borderColor} ${textColor}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm font-black ${isCorrectChoice ? 'bg-emerald-500 text-white border-emerald-500' : isStudentChoice ? 'bg-rose-500 text-white border-rose-500' : 'bg-[var(--bg-secondary)] border-[var(--border-primary)]'}`}>
                                                            {["أ", "ب", "ج", "د"][optIdx]}
                                                        </div>
                                                        <span className="font-bold text-sm">{opt}</span>
                                                    </div>
                                                    {icon}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    {!isCorrect && (
                                        <div className="mt-6 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex items-center gap-3">
                                            <InformationCircleIcon className="w-5 h-5 text-indigo-500" />
                                            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                                الإجابة الصحيحة هي: <span className="underline">{q.options[q.correctAnswerIndex]}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="space-y-4">
                    {!isPass && (
                        <button 
                            onClick={() => setView('start')}
                            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-base shadow-2xl active:scale-95 transition-all"
                        >
                            إعادة التحدي
                        </button>
                    )}
                    <div className="p-5 bg-blue-500/5 rounded-[2rem] border-2 border-dashed border-blue-500/10 flex items-center justify-center gap-3">
                         <ShieldCheckIcon className="w-5 h-5 text-blue-500 opacity-50" />
                         <span className="text-sm font-bold text-blue-700 dark:text-blue-300">تمت أرشفة هذه النتيجة في سجل تفوقك الدراسي.</span>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default QuizTaker;
