
import React, { useMemo, useState, useEffect } from 'react';
import { QuizAttempt, VideoActivity, Lesson, QuizQuestion } from '../../types';
import { getStudentQuizAttempts, getAllGrades, getVideoActivityForStudent, getLessonDetails } from '../../services/storageService';
import { CheckCircleIcon, XCircleIcon, ChartBarIcon, DocumentTextIcon, CalendarIcon, ClockIcon, SearchIcon, VideoCameraIcon, ChevronDownIcon, InformationCircleIcon, SparklesIcon, ChevronLeftIcon, ChevronRightIcon } from '../common/Icons';
import Loader from '../common/Loader';
import { useSession } from '../../hooks/useSession';
import { TableWrapper, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../common/Table';

const StatCard: React.FC<{ title: string; value: string | number; subtitle: string; icon: React.FC<any>; colorClass: string }> = ({ title, value, subtitle, icon: Icon, colorClass }) => (
    <div className="bg-[var(--bg-secondary)] p-5 rounded-[2rem] shadow-lg border border-[var(--border-primary)] relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
        <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-[4rem] opacity-10 transition-transform group-hover:scale-110 ${colorClass.replace('text-', 'bg-')}`}></div>
        <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${colorClass.replace('text-', 'bg-')} bg-opacity-10`}>
                    <Icon className={`w-6 h-6 ${colorClass}`} />
                </div>
            </div>
            <div>
                <h3 className="text-3xl font-black text-[var(--text-primary)] mb-1">{value}</h3>
                <p className="text-sm font-bold text-[var(--text-primary)] opacity-80">{title}</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{subtitle}</p>
            </div>
        </div>
    </div>
);

const ResultCard: React.FC<{ attempt: QuizAttempt; lessonTitle: string }> = ({ attempt, lessonTitle }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    const isPass = attempt.isPass;
    const date = new Date(attempt.submittedAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
    const time = new Date(attempt.submittedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    // Fetch lesson details on mount to calculate stats
    useEffect(() => {
        const fetchLesson = async () => {
            try {
                const data = await getLessonDetails(attempt.lessonId);
                setLesson(data);
            } catch (e) {
                console.error("Error loading lesson details:", e);
            }
        };
        fetchLesson();
    }, [attempt.lessonId]);

    const resolvedQuestions = useMemo((): QuizQuestion[] => {
        if (!lesson) return [];
        const raw = lesson.questions || lesson.videoQuestions || [];
        if (typeof raw === 'string') {
            try { return JSON.parse(raw); } catch (e) { return []; }
        }
        return Array.isArray(raw) ? raw : [];
    }, [lesson]);

    const stats = useMemo(() => {
        if (!resolvedQuestions.length) return { correct: 0, wrong: 0 };
        let correct = 0;
        let wrong = 0;
        resolvedQuestions.forEach((q, idx) => {
            const studentAnswerIdx = (attempt.submittedAnswers as (number | null)[])?.[idx];
            if (studentAnswerIdx !== null && studentAnswerIdx !== undefined && Number(studentAnswerIdx) === Number(q.correctAnswerIndex)) correct++;
            else wrong++;
        });
        return { correct, wrong };
    }, [resolvedQuestions, attempt.submittedAnswers]);

    const handleToggle = () => {
        setIsExpanded(!isExpanded);
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < resolvedQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrevQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    return (
        <div className={`bg-[var(--bg-secondary)] rounded-[2rem] shadow-md border border-[var(--border-primary)] transition-all duration-500 overflow-hidden ${isExpanded ? 'ring-2 ring-indigo-500/30' : 'hover:shadow-xl hover:border-indigo-500/30'}`}>
            <div className="p-5 flex flex-col md:flex-row items-center gap-6 group">
                {/* Score Circle */}
                <div className="relative w-20 h-20 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="40" cy="40" r="36"
                            stroke="currentColor" strokeWidth="6" fill="transparent"
                            className="text-[var(--bg-tertiary)]"
                        />
                        <circle
                            cx="40" cy="40" r="36"
                            stroke="currentColor" strokeWidth="6" fill="transparent"
                            strokeDasharray={2 * Math.PI * 36}
                            strokeDashoffset={(2 * Math.PI * 36) * (1 - attempt.score / 100)}
                            strokeLinecap="round"
                            className={`${isPass ? 'text-blue-500' : 'text-red-500'} transition-all duration-1000`}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className={`text-lg font-black ${isPass ? 'text-blue-600' : 'text-red-600'}`}>{Math.round(attempt.score)}%</span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 text-center md:text-right w-full">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-2">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1 md:mb-0 line-clamp-1">{lessonTitle}</h3>
                        <div className="flex items-center gap-2 self-center md:self-auto">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold inline-flex items-center gap-1 ${isPass ? 'bg-blue-500/10 text-blue-600' : 'bg-red-500/10 text-red-600'}`}>
                                {isPass ? <CheckCircleIcon className="w-3 h-3" /> : <XCircleIcon className="w-3 h-3" />}
                                {isPass ? 'ناجح' : 'يحتاج تحسين'}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-[var(--text-secondary)] mt-3 items-center">
                        <span className="flex items-center gap-1 bg-[var(--bg-tertiary)] px-2 py-1 rounded-lg">
                            <CalendarIcon className="w-3 h-3 text-[var(--accent-primary)]" /> {date}
                        </span>
                        {lesson && (
                            <>
                                <span className="flex items-center gap-1 bg-blue-500/10 text-blue-600 px-2 py-1 rounded-lg font-bold border border-blue-500/20">
                                    <CheckCircleIcon className="w-3 h-3" /> {stats.correct} صحيح
                                </span>
                                <span className="flex items-center gap-1 bg-rose-500/10 text-rose-600 px-2 py-1 rounded-lg font-bold border border-rose-500/20">
                                    <XCircleIcon className="w-3 h-3" /> {stats.wrong} خطأ
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={handleToggle}
                    className={`px-6 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-lg active:scale-95 whitespace-nowrap ${isExpanded ? 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                    {isExpanded ? 'إخفاء التفاصيل' : 'عرض تفاصيل الإجابات'}
                    <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Expanded Review Section */}
            <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100 border-t border-[var(--border-primary)]' : 'max-h-0 opacity-0'}`}>
                <div className="p-6 bg-[var(--bg-tertiary)]/30">
                    {isLoading ? (
                        <div className="py-10 flex justify-center"><Loader /></div>
                    ) : lesson && resolvedQuestions.length > 0 ? (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                                <div className="flex items-center gap-2 text-indigo-600">
                                    <InformationCircleIcon className="w-5 h-5" />
                                    <h4 className="font-black text-sm">مراجعة الإجابات والتحليل</h4>
                                </div>
                                <div className="flex items-center gap-2 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-primary)]">
                                    <button
                                        title="السؤال السابق"
                                        aria-label="السؤال السابق"
                                        onClick={handlePrevQuestion}
                                        disabled={currentQuestionIndex === 0}
                                        className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRightIcon className="w-5 h-5 text-[var(--text-primary)]" />
                                    </button>
                                    <span className="text-sm font-bold text-[var(--text-secondary)] px-2">
                                        سؤال {currentQuestionIndex + 1} من {resolvedQuestions.length}
                                    </span>
                                    <button
                                        title="السؤال التالي"
                                        aria-label="السؤال التالي"
                                        onClick={handleNextQuestion}
                                        disabled={currentQuestionIndex === resolvedQuestions.length - 1}
                                        className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeftIcon className="w-5 h-5 text-[var(--text-primary)]" />
                                    </button>
                                </div>
                            </div>

                            <div className="relative overflow-hidden min-h-[400px]">
                                {resolvedQuestions.map((q, idx) => {
                                    if (idx !== currentQuestionIndex) return null;

                                    const studentAnswerIdx = (attempt.submittedAnswers as (number | null)[])?.[idx];
                                    const isCorrect = studentAnswerIdx !== null && studentAnswerIdx !== undefined && Number(studentAnswerIdx) === Number(q.correctAnswerIndex);

                                    return (
                                        <div key={idx} className={`p-6 rounded-3xl border-2 transition-all animate-in fade-in slide-in-from-right-4 duration-300 ${isCorrect ? 'bg-blue-500/5 border-blue-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
                                            <div className="flex items-start gap-3 mb-6">
                                                <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-lg ${isCorrect ? 'bg-blue-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                    {idx + 1}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="font-bold text-lg text-[var(--text-primary)] leading-relaxed">{q.questionText}</p>
                                                    <span className={`inline-block mt-2 px-3 py-1 rounded-lg text-sm font-bold ${isCorrect ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'}`}>
                                                        {isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-3 mb-6">
                                                {q.options.map((opt, optIdx) => {
                                                    const isStudentChoice = studentAnswerIdx !== null && studentAnswerIdx !== undefined && Number(studentAnswerIdx) === optIdx;
                                                    const isCorrectChoice = Number(q.correctAnswerIndex) === optIdx;

                                                    let style = "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-indigo-500/30";
                                                    let icon = null;

                                                    if (isCorrectChoice) {
                                                        style = "bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-400 font-bold shadow-md ring-1 ring-blue-500/20";
                                                        icon = <CheckCircleIcon className="w-5 h-5 text-blue-500" />;
                                                    } else if (isStudentChoice && !isCorrect) {
                                                        style = "bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-400 font-bold shadow-md ring-1 ring-rose-500/20";
                                                        icon = <XCircleIcon className="w-5 h-5 text-rose-500" />;
                                                    }

                                                    return (
                                                        <div key={optIdx} className={`p-4 rounded-xl border-2 text-sm flex items-center justify-between gap-3 transition-all ${style}`}>
                                                            <div className="flex items-center gap-3">
                                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm border ${isCorrectChoice ? 'border-blue-500 bg-blue-500 text-white' : isStudentChoice ? 'border-rose-500 bg-rose-500 text-white' : 'border-[var(--text-secondary)] opacity-50'}`}>
                                                                    {["أ", "ب", "ج", "د"][optIdx]}
                                                                </span>
                                                                <span>{opt}</span>
                                                            </div>
                                                            {icon}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Explanation / Improvement Tip */}
                                            <div className="mt-6 p-6 bg-[var(--bg-secondary)] rounded-[2rem] border border-[var(--border-primary)] shadow-sm relative overflow-hidden">
                                                <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-10 ${isCorrect ? 'bg-blue-500' : 'bg-rose-500'}`}></div>
                                                <div className="relative z-10 flex gap-4 items-start">
                                                    <div className={`p-3 rounded-2xl shrink-0 ${isCorrect ? 'bg-blue-500/10 text-blue-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                                        <SparklesIcon className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <p className={`text-sm font-black mb-2 uppercase tracking-wider ${isCorrect ? 'text-blue-600' : 'text-rose-600'}`}>
                                                            {isCorrect ? 'لماذا إجابتك صحيحة؟' : 'توضيح وتصحيح المفهوم'}
                                                        </p>
                                                        <p className="text-sm text-[var(--text-secondary)] leading-loose font-medium">
                                                            {q.rationale || (isCorrect ? "أحسنت! إجابتك صحيحة لأنك اخترت الخيار الأدق بناءً على فهمك العميق للمادة العلمية. استمر في هذا المستوى." : "تحتاج لمراجعة هذا الجزء من الدرس. الإجابة الصحيحة تعتمد على الربط بين المفاهيم المذكورة في الفيديو التعليمي. حاول التركيز على التفاصيل الدقيقة في المرة القادمة.")}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Mobile Navigation Footer */}
                            <div className="flex justify-between items-center mt-4 sm:hidden">
                                <button
                                    onClick={handlePrevQuestion}
                                    disabled={currentQuestionIndex === 0}
                                    className="px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] font-bold text-sm disabled:opacity-50"
                                >
                                    السابق
                                </button>
                                <span className="text-sm font-bold text-[var(--text-secondary)]">
                                    {currentQuestionIndex + 1} / {resolvedQuestions.length}
                                </span>
                                <button
                                    onClick={handleNextQuestion}
                                    disabled={currentQuestionIndex === resolvedQuestions.length - 1}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm disabled:opacity-50 disabled:bg-[var(--bg-secondary)] disabled:text-[var(--text-secondary)]"
                                >
                                    التالي
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="py-10 text-center text-[var(--text-secondary)] font-bold opacity-50 italic">
                            لا تتوفر تفاصيل مراجعة لهذا الاختبار حالياً.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ResultsView: React.FC = () => {
    const { currentUser: user } = useSession();
    const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
    const [videoActivity, setVideoActivity] = useState<VideoActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lessonMap, setLessonMap] = useState<Map<string, { lessonTitle: string; unitTitle: string }>>(new Map());
    const [filter, setFilter] = useState<'all' | 'pass' | 'fail'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isVideoActivityExpanded, setIsVideoActivityExpanded] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const buildLessonMap = async () => {
            try {
                const allGrades = await getAllGrades();
                if (!isMounted) return;
                const map = new Map<string, { lessonTitle: string; unitTitle: string }>();
                allGrades.forEach(grade => {
                    grade.semesters.forEach(semester => {
                        semester.units.forEach(unit => {
                            unit.lessons.forEach(lesson => {
                                map.set(lesson.id, { lessonTitle: lesson.title, unitTitle: unit.title });
                            });
                        });
                    });
                });
                setLessonMap(map);
            } catch (error) {
                console.error("Error building lesson map:", error);
            }
        };
        buildLessonMap();
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        if (!user) return;
        let isMounted = true;
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [attemptsData, activityData] = await Promise.all([
                    getStudentQuizAttempts(user.id),
                    getVideoActivityForStudent(user.id)
                ]);
                if (!isMounted) return;
                setAttempts(attemptsData || []);
                setVideoActivity(activityData || []);
            } catch (error) {
                console.error("Error fetching student results:", error);
                if (isMounted) {
                    setAttempts([]);
                    setVideoActivity([]);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        fetchData();
        return () => { isMounted = false; };
    }, [user]);

    const stats = useMemo(() => {
        if (!attempts.length) return { total: 0, average: 0, passed: 0, totalStudySeconds: 0 };
        const total = attempts.length;
        const passed = attempts.filter(a => a.isPass).length;
        const avg = attempts.reduce((acc, curr) => acc + curr.score, 0) / total;

        // Calculate total study time
        const totalStudySeconds = videoActivity.reduce((acc, curr) => acc + (curr.watched_seconds || 0), 0);

        return { total, average: Math.round(avg), passed, totalStudySeconds };
    }, [attempts, videoActivity]);

    const formattedStudyTime = useMemo(() => {
        const hours = Math.floor(stats.totalStudySeconds / 3600);
        const minutes = Math.floor((stats.totalStudySeconds % 3600) / 60);

        if (hours > 0) {
            return `${hours} ساعة و ${minutes} دقيقة`;
        }
        return `${minutes} دقيقة`;
    }, [stats.totalStudySeconds]);

    const filteredAttempts = useMemo(() => {
        return attempts.filter(attempt => {
            const matchesFilter =
                filter === 'all' ? true :
                    filter === 'pass' ? attempt.isPass :
                        !attempt.isPass;

            const lessonInfo = lessonMap.get(attempt.lessonId);
            const lessonTitle = lessonInfo?.lessonTitle || '';
            const matchesSearch = lessonTitle.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesFilter && matchesSearch;
        });
    }, [attempts, filter, searchQuery, lessonMap]);

    const formatSeconds = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);

        if (hours > 0) {
            return `${hours}س ${minutes}د ${seconds}ث`;
        }
        return `${minutes}د ${seconds}ث`;
    };

    if (!user) return null;

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader /></div>;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 fade-in">
            {/* Header Section */}
            <div className="text-center md:text-right">
                <h1 className="text-3xl font-black text-[var(--text-primary)] mb-2">سجل الأداء والنتائج</h1>
                <p className="text-[var(--text-secondary)]">تابع تقدمك الدراسي وحلل نتائج اختباراتك لتحسين مستواك.</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="وقت المذاكرة"
                    value={formattedStudyTime}
                    subtitle="إجمالي مشاهدة الفيديوهات"
                    icon={VideoCameraIcon}
                    colorClass="text-blue-500"
                />
                <StatCard
                    title="إجمالي الاختبارات"
                    value={stats.total}
                    subtitle="اختبار تم أداؤه"
                    icon={DocumentTextIcon}
                    colorClass="text-purple-500"
                />
                <StatCard
                    title="متوسط الدرجات"
                    value={`${stats.average}%`}
                    subtitle="معدل أدائك العام"
                    icon={ChartBarIcon}
                    colorClass="text-indigo-500"
                />
                <StatCard
                    title="معدل النجاح"
                    value={`${stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0}%`}
                    subtitle={`${stats.passed} اختبار ناجح`}
                    icon={CheckCircleIcon}
                    colorClass="text-green-500"
                />
            </div>

            {/* Video Activity Table */}
            <div className="bg-[var(--bg-secondary)] rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm overflow-hidden">
                <div
                    onClick={() => setIsVideoActivityExpanded(!isVideoActivityExpanded)}
                    className="p-6 flex justify-between items-center cursor-pointer hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                    <h2 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-3">
                        <VideoCameraIcon className="w-6 h-6 text-blue-500" />
                        سجل مشاهدة الحصص
                    </h2>
                    <ChevronDownIcon className={`w-6 h-6 text-[var(--text-secondary)] transition-transform duration-300 ${isVideoActivityExpanded ? 'rotate-180' : ''}`} />
                </div>

                <div className={`transition-all duration-500 ease-in-out ${isVideoActivityExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-6 pt-0 overflow-x-auto">
                        <div className="rounded-2xl border border-[var(--border-primary)] overflow-hidden">
                            <TableWrapper>
                                <Table className="min-w-[600px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>الحصة</TableHead>
                                            <TableHead>الوحدة</TableHead>
                                            <TableHead className="text-center">الوقت المشاهد</TableHead>
                                            <TableHead className="text-center">الإنجاز</TableHead>
                                            <TableHead className="text-center">آخر مشاهدة</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {videoActivity.length > 0 ? videoActivity.map(activity => {
                                            const lessonInfo = lessonMap.get(activity.lesson_id);
                                            return (
                                                <TableRow key={activity.id} className="hover:bg-[var(--bg-tertiary)]/30 transition-colors">
                                                    <TableCell className="font-bold text-[var(--text-primary)]">{lessonInfo?.lessonTitle || '---'}</TableCell>
                                                    <TableCell className="text-[var(--text-secondary)] font-medium">{lessonInfo?.unitTitle || '---'}</TableCell>
                                                    <TableCell className="text-center font-mono font-bold text-blue-600">
                                                        <span className="bg-blue-500/5 px-2 py-1 rounded-lg" dir="ltr">{formatSeconds(activity.watched_seconds)}</span>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span className={`px-2.5 py-1 rounded-full text-sm font-black border ${activity.milestone === '100%' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                                                            {activity.milestone || '0%'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center text-sm text-[var(--text-secondary)] opacity-60">
                                                        {new Date(activity.last_updated_at).toLocaleDateString('ar-EG')}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        }) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-12 text-center text-[var(--text-secondary)] opacity-50 italic">
                                                    لم يتم تسجيل أي نشاط مشاهدة بعد.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableWrapper>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quiz Results Section */}
            <div className="space-y-6">
                <h2 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-3">
                    <DocumentTextIcon className="w-6 h-6 text-purple-500" />
                    نتائج الاختبارات والواجبات
                </h2>

                {/* Filters & Search */}
                <div className="bg-[var(--bg-secondary)] p-2 rounded-2xl border border-[var(--border-primary)] flex flex-col md:flex-row gap-4 shadow-sm">
                    <div className="flex p-1 bg-[var(--bg-tertiary)] rounded-xl flex-shrink-0">
                        {(['all', 'pass', 'fail'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${filter === f
                                    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-md'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                {f === 'all' ? 'الكل' : f === 'pass' ? 'الناجحة' : 'تحتاج تحسين'}
                            </button>
                        ))}
                    </div>
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="ابحث عن اسم الدرس أو الامتحان..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-full px-4 py-3 pr-12 bg-[var(--bg-tertiary)] border-none rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--accent-primary)] outline-none transition-all"
                        />
                        <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] opacity-70" />
                    </div>
                </div>

                <div className="space-y-4 min-h-[200px]">
                    {filteredAttempts.length > 0 ? (
                        filteredAttempts.map(attempt => (
                            <div key={attempt.id} className="fade-in">
                                <ResultCard
                                    attempt={attempt}
                                    lessonTitle={lessonMap.get(attempt.lessonId)?.lessonTitle || 'درس غير معروف'}
                                />
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-[var(--bg-secondary)] rounded-[2rem] border-2 border-dashed border-[var(--border-primary)] opacity-70">
                            <DocumentTextIcon className="w-16 h-16 text-[var(--text-secondary)] mb-4" />
                            <h3 className="text-xl font-bold text-[var(--text-primary)]">لا توجد نتائج اختبارات</h3>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResultsView;
