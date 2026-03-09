
import React, { useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import { Lesson, LessonType, Grade, User, StudentView, Subscription, WatchedVideo, Unit, QuizQuestion, ToastType } from '../../types';
import { getAIExplanation } from '../../services/geminiService';
import { getLessonDetails } from '../../services/storageService';
import Modal from '../common/Modal';
import {
    SparklesIcon, ChevronDownIcon, DocumentTextIcon,
    ArrowLeftIcon, LockClosedIcon, ShieldExclamationIcon,
    PencilIcon, ArrowRightIcon, CheckCircleIcon, XIcon,
    PlayIcon, PaperAirplaneIcon, BookOpenIcon,
    PlusIcon, ClockIcon, WaveIcon, VideoCameraIcon, DotsVerticalIcon,
    PlaySolidIcon
} from '../common/Icons';
import { useToast } from '../../useToast';
import QuizTaker from './QuizTaker';
import CustomYouTubePlayer from './CustomYouTubePlayer';
import { useSession } from '../../hooks/useSession';
import { useSubscription } from '../../hooks/useSubscription';
import { AppLifecycleContext } from '../../AppContext';

interface LessonViewProps {
    lesson: Lesson;
    onBack: () => void;
    grade: Grade;
    onLessonComplete: (lessonId: string) => Promise<void>;
    onNavigate: (view: StudentView) => void;
    isDataSaverEnabled: boolean;
}

const parseYouTubeVideoId = (url: any): string | null => {
    if (typeof url !== 'string' || !url) return null;
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

const getMegaEmbedUrl = (url: any): string | null => {
    if (typeof url !== 'string' || !url) return null;
    const regex = /mega\.nz\/(file|embed)\/([a-zA-Z0-9]+)#([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    if (match) {
        return `https://mega.nz/embed/${match[2]}#${match[3]}`;
    }
    return null;
};

// --- Modern Bento Card (Gamified 3D) ---
const ModernCard: React.FC<{
    icon: React.FC<any>,
    title: string,
    subtitle?: string,
    gradient: string,
    isOpen?: boolean,
    onToggle?: () => void,
    children?: React.ReactNode,
    action?: React.ReactNode
}> = ({ icon: Icon, title, subtitle, gradient, isOpen = false, onToggle, children, action }) => (
    <div className={`
        group relative overflow-hidden rounded-[2.5rem] transition-all duration-300 border-2
        bg-[var(--bg-secondary)] border-[var(--border-primary)] border-b-[6px]
        ${isOpen ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/20' : 'hover:border-[var(--accent-primary)]/50 hover:shadow-xl hover:-translate-y-1 active:translate-y-1'}
        mb-5
    `}>
        <div
            onClick={onToggle}
            className={`p-6 flex items-center justify-between cursor-pointer select-none ${!onToggle && 'cursor-default'}`}
        >
            <div className="flex items-center gap-5">
                <div className={`
                    w-16 h-16 rounded-[1.4rem] flex items-center justify-center text-white shadow-inner border-2 border-b-[6px] border-black/10 rotate-[-3deg] group-hover:rotate-0
                    bg-gradient-to-br ${gradient} 
                    transform group-hover:scale-110 transition-transform duration-300
                `}>
                    <Icon className="w-8 h-8 drop-shadow-md" />
                </div>
                <div>
                    <h3 className="font-black text-xl text-[var(--text-primary)] leading-tight transition-colors group-hover:text-[var(--accent-primary)]">{title}</h3>
                    {subtitle && <p className="text-sm font-black text-[var(--text-secondary)] opacity-80 uppercase tracking-widest mt-1">{subtitle}</p>}
                </div>
            </div>
            {onToggle && (
                <div className={`
                    w-12 h-12 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 border-2 border-b-4
                    ${isOpen ? 'bg-[var(--accent-primary)] text-white border-indigo-700 shadow-sm rotate-180' : 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-secondary)] group-hover:bg-[var(--accent-primary)]/10 group-hover:text-[var(--accent-primary)]'}
                `}>
                    <ChevronDownIcon className="w-6 h-6 stroke-2" />
                </div>
            )}
        </div>
        {isOpen && (
            <div className="px-8 pb-8 animate-fade-in">
                <div className="h-px bg-[var(--border-primary)]/50 mb-6 w-full"></div>
                <div className="text-sm font-bold text-[var(--text-secondary)] leading-relaxed space-y-4">
                    {children}
                </div>
                {action && <div className="mt-8">{action}</div>}
            </div>
        )}
    </div>
);

const LessonView: React.FC<LessonViewProps> = ({ lesson, onBack, grade, onLessonComplete, onNavigate, isDataSaverEnabled }) => {
    const { currentUser: user } = useSession();
    const { activeSubscriptions } = useSubscription();
    const { setRefreshPaused } = useContext(AppLifecycleContext);
    const { addToast } = useToast();

    const [currentLesson, setCurrentLesson] = useState(lesson);
    const [isFetchingDetails, setIsFetchingDetails] = useState(false);
    const [isGatekeeperModalOpen, setIsGatekeeperModalOpen] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>('explanation');

    useEffect(() => {
        const fetchDetails = async () => {
            let needsFetch = false;
            if (lesson.type === LessonType.EXPLANATION && !lesson.description) needsFetch = true;
            if (lesson.type === LessonType.SUMMARY && !lesson.content) needsFetch = true;
            if ((lesson.type === LessonType.HOMEWORK || lesson.type === LessonType.EXAM) && (!lesson.questions && !lesson.imageUrl)) needsFetch = true;

            if (needsFetch) {
                setIsFetchingDetails(true);
                const fullLesson = await getLessonDetails(lesson.id);
                if (fullLesson) setCurrentLesson(fullLesson);
                setIsFetchingDetails(false);
            } else {
                setCurrentLesson(lesson);
            }
        };
        fetchDetails();
    }, [lesson]);

    useEffect(() => {
        setRefreshPaused(currentLesson.type === LessonType.EXPLANATION);
        return () => setRefreshPaused(false);
    }, [currentLesson.type, setRefreshPaused]);

    const unit = useMemo(() => {
        for (const semester of grade.semesters) {
            const foundUnit = semester.units.find(u => u.lessons.some(l => l.id === currentLesson.id));
            if (foundUnit) return foundUnit;
        }
        return undefined;
    }, [grade, currentLesson.id]);

    const playlist = useMemo(() => {
        const explanations = unit?.lessons.filter(l => l.type === LessonType.EXPLANATION) || [];
        return explanations.sort((a, b) => a.title.localeCompare(b.title, 'ar-EG', { numeric: true }));
    }, [unit]);

    const currentIndex = playlist.findIndex(l => l.id === currentLesson.id);
    const progressPercent = playlist.length > 0 ? Math.round(((currentIndex + 1) / playlist.length) * 100) : 0;

    const canAccess = useMemo(() => {
        if (currentLesson.isFree) return true;
        return activeSubscriptions.some(sub => !sub.teacherId || sub.teacherId === unit?.teacherId);
    }, [currentLesson, activeSubscriptions, unit]);

    const handleVideoEnd = useCallback(() => {
        if (currentLesson.videoQuestions && currentLesson.videoQuestions.length > 0) {
            setIsGatekeeperModalOpen(true);
        } else {
            onLessonComplete(currentLesson.id);
            if (currentIndex < playlist.length - 1) setCurrentLesson(playlist[currentIndex + 1]);
        }
    }, [currentLesson, onLessonComplete, currentIndex, playlist]);

    const getExplanationContent = () => {
        if (currentLesson.type === LessonType.EXPLANATION) {
            return currentLesson.description || '<p class="italic opacity-50">لا يوجد ملاحظات إضافية لهذا الدرس.</p>';
        }
        return currentLesson.content || 'جاري تحميل المحتوى...';
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] font-tajawal pb-32 transition-colors duration-300">

            {/* Header Sticky Glass Bar */}
            <div className="sticky top-0 z-50 bg-white/80 dark:bg-[#0F172A]/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between transition-colors duration-300">
                <button onClick={onBack} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all">
                    <ArrowRightIcon className="w-5 h-5" />
                </button>

                <div className="text-center flex-1 mx-4">
                    <h2 className="text-sm font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em] mb-1">{unit?.title || 'جاري التحميل...'}</h2>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 opacity-90 leading-none">{grade.name}</p>
                </div>

                <button className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    <DotsVerticalIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Video Content */}
            <div className="w-full max-w-7xl mx-auto px-4 md:px-6 mt-6">
                <div className="aspect-video bg-black rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl shadow-indigo-500/10 dark:shadow-black/50 relative border-[4px] border-white dark:border-slate-800 ring-1 ring-slate-200 dark:ring-slate-700">
                    {!canAccess ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-center p-10">
                            <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center mb-6 animate-pulse">
                                <LockClosedIcon className="w-10 h-10 text-indigo-400" />
                            </div>
                            <h3 className="text-white font-black text-2xl mb-4">هذا المحتوى يتطلب اشتراك</h3>
                            <button onClick={() => onNavigate('subscription')} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all">اشترك الآن للفتح</button>
                        </div>
                    ) : parseYouTubeVideoId(currentLesson.content) ? (
                        <CustomYouTubePlayer
                            videoId={parseYouTubeVideoId(currentLesson.content)!}
                            onLessonComplete={handleVideoEnd}
                            isDataSaverEnabled={isDataSaverEnabled}
                            lessonId={currentLesson.id}
                            showWatermark={true}
                        />
                    ) : getMegaEmbedUrl(currentLesson.content) ? (
                        <iframe
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            src={getMegaEmbedUrl(currentLesson.content)!}
                            allowFullScreen
                            allow="autoplay; encrypted-media"
                            className="w-full h-full border-0 rounded-[2rem] md:rounded-[3rem]"
                        ></iframe>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500 italic">
                            <VideoCameraIcon className="w-16 h-16 mb-4 opacity-10" />
                            <span>الفيديو غير متوفر حالياً.</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-5 mt-8 space-y-6">

                {/* Progress Tracking Card (Gamified 3D) */}
                <div className="relative overflow-hidden rounded-[3rem] bg-[var(--bg-secondary)] border-2 border-b-[8px] border-[var(--border-primary)] p-8 shadow-xl transition-all duration-300 mb-8">
                    {/* Decorative Blob */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="text-right">
                            <h1 className="text-2xl sm:text-4xl font-black mb-2 tracking-tight leading-tight text-[var(--text-primary)] drop-shadow-sm">{currentLesson.title}</h1>
                            <p className="text-[var(--text-secondary)] text-sm font-black uppercase tracking-widest flex items-center gap-2 opacity-80">
                                <ClockIcon className="w-5 h-5 text-indigo-500" /> الدرس {currentIndex + 1} من {playlist.length}
                            </p>
                        </div>
                        <div className="flex items-center gap-5 bg-[var(--bg-tertiary)] p-5 rounded-[2rem] border-2 border-b-[6px] border-[var(--border-primary)] self-start sm:self-center">
                            <div className="text-center">
                                <span className="text-4xl font-black block leading-none text-[var(--accent-primary)] drop-shadow-sm">{progressPercent}%</span>
                                <span className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] mt-1 opacity-80 block">مكتمل</span>
                            </div>
                            <div className="w-32 h-5 bg-[var(--bg-primary)] border-2 border-[var(--border-primary)] rounded-full overflow-hidden shadow-inner flex items-center p-0.5">
                                <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)] transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Cards */}
                <div className="animate-fade-in-up space-y-4">
                    <ModernCard
                        icon={BookOpenIcon}
                        title="شرح المعلم"
                        subtitle="ملاحظات وتفاصيل"
                        gradient="from-blue-500 to-indigo-600"
                        isOpen={activeSection === 'explanation'}
                        onToggle={() => setActiveSection(activeSection === 'explanation' ? null : 'explanation')}
                    >
                        <div className="prose prose-sm dark:prose-invert max-w-none font-bold text-slate-600 dark:text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: getExplanationContent() }} />
                    </ModernCard>

                    <ModernCard
                        icon={PencilIcon}
                        title="الواجب المنزلي"
                        subtitle="تطبيق عملي"
                        gradient="from-orange-500 to-rose-500"
                        isOpen={activeSection === 'homework'}
                        onToggle={() => setActiveSection(activeSection === 'homework' ? null : 'homework')}
                    >
                        <p className="font-bold text-slate-500 dark:text-slate-400 mb-6">قم بحل التمارين التالية بعناية لترسيخ المعلومات التي تعلمتها في الفيديو.</p>
                        {currentLesson.quizType === 'image' && currentLesson.imageUrl && (
                            <div className="rounded-[2rem] overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700">
                                <img src={currentLesson.imageUrl} className="w-full object-cover" alt="Homework" />
                            </div>
                        )}
                    </ModernCard>

                    <ModernCard
                        icon={SparklesIcon}
                        title="تحدي الذكاء الاصطناعي"
                        subtitle="اختبار ذكي"
                        gradient="from-purple-600 to-fuchsia-600"
                        isOpen={activeSection === 'quiz'}
                        onToggle={() => setActiveSection(activeSection === 'quiz' ? null : 'quiz')}
                        action={
                            <button
                                onClick={() => setIsGatekeeperModalOpen(true)}
                                className="w-full py-5 bg-gradient-to-r from-purple-500 to-fuchsia-600 border-b-[8px] border-purple-800 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-purple-500/30 active:translate-y-2 hover:-translate-y-1 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 tracking-widest uppercase"
                            >
                                <PlaySolidIcon className="w-6 h-6 drop-shadow-md" /> ابدأ التحدي الآن
                            </button>
                        }
                    >
                        <p className="font-bold text-slate-500 dark:text-slate-400">هذا الاختبار يتم إنشاؤه خصيصاً لك، اجتيازه بنسبة 50% أو أكثر سيفتح لك المحتوى القادم تلقائياً.</p>
                    </ModernCard>

                    {/* PDF Document Card - Gamified */}
                    {typeof currentLesson.content === 'string' && currentLesson.content.includes('.pdf') && (
                        <div className="bg-[var(--bg-secondary)] rounded-[2.5rem] p-6 border-2 border-b-[6px] border-dashed border-[var(--border-primary)] flex items-center justify-between group hover:border-indigo-500 transition-all cursor-pointer hover:-translate-y-1 active:translate-y-1 shadow-sm hover:shadow-xl mt-6">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-[1.4rem] bg-rose-500 text-white border-2 border-b-[6px] border-rose-700 flex items-center justify-center shadow-md rotate-[-3deg] group-hover:rotate-0 transition-transform">
                                    <DocumentTextIcon className="w-8 h-8 drop-shadow-md" />
                                </div>
                                <div className="text-right">
                                    <h4 className="font-black text-lg text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">ملخص المحاضرة.pdf</h4>
                                    <p className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mt-1 opacity-80">شامل وثيقة PDF</p>
                                </div>
                            </div>
                            <a
                                href={currentLesson.content}
                                target="_blank"
                                className="w-14 h-14 rounded-[1.2rem] bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--accent-primary)] border-2 border-b-[4px] border-[var(--border-primary)] group-hover:bg-[var(--accent-primary)] group-hover:text-white group-hover:border-indigo-700 transition-all shadow-sm group-hover:scale-110"
                            >
                                <PlayIcon className="w-6 h-6" />
                            </a>
                        </div>
                    )}
                </div>

                {/* Secure Footer */}
                <div className="py-12 text-center opacity-60 select-none pointer-events-none">
                    <p className="text-sm font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] mb-2">ID: {user.id.slice(0, 8).toUpperCase()} | SECURE MODE</p>
                </div>
            </div>

            {/* Existing Modal for Gatekeeper Quiz */}
            <Modal isOpen={isGatekeeperModalOpen} onClose={() => setIsGatekeeperModalOpen(false)} title="تحدي الاستيعاب الذكي">
                <QuizTaker
                    lesson={currentLesson}
                    onComplete={async (id) => {
                        setIsGatekeeperModalOpen(false);
                        await onLessonComplete(id);
                    }}
                />
            </Modal>
        </div>
    );
};

export default LessonView;
