import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Lesson, LessonType, Grade, Unit, StudentView, ToastType } from '../../types';
import { getAIExplanation } from '../../services/geminiService';
import { getLessonDetails, markLessonComplete } from '../../services/storageService';
import { useSwipeBack } from '../../hooks/useSwipeBack';
import Loader from '../common/Loader';
import Modal from '../common/Modal';
import {
    SparklesIcon, ArrowRightIcon, PlaySolidIcon,
    BrainIcon, DocumentTextIcon, CheckCircleIcon,
    DownloadIcon, LockClosedIcon, ClockIcon,
    VideoCameraIcon
} from '../common/Icons';
import { useToast } from '../../useToast';
import QuizTaker from './QuizTaker';
import { useSession } from '../../hooks/useSession';
import { useSubscription } from '../../hooks/useSubscription';

const LessonDetailView: React.FC<{ lesson: Lesson; unit: Unit; grade: Grade; onBack: () => void; onPlay: () => void; onNavigate: (view: StudentView) => void; }> = ({ lesson, unit, grade, onBack, onPlay, onNavigate }) => {
    const { currentUser: user } = useSession();
    const { addToast } = useToast();
    const { activeSubscriptions, isComprehensive } = useSubscription();
    const [currentLesson, setCurrentLesson] = useState(lesson);
    const [isLoading, setIsLoading] = useState(false);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);

    // AI State
    const [aiQuestion, setAiQuestion] = useState('');
    const [aiHistory, setAiHistory] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const chatRef = useRef<HTMLDivElement>(null);

    useSwipeBack(onBack);

    useEffect(() => {
        const fetchDetails = async () => {
            setIsLoading(true);
            const fullLesson = await getLessonDetails(lesson.id);
            if (fullLesson) setCurrentLesson(fullLesson);
            setIsLoading(false);
        };
        fetchDetails();
    }, [lesson.id]);

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTo({
                top: chatRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [aiHistory, isAiThinking]);

    const canAccess = useMemo(() => {
        if (currentLesson.isFree) return true;
        if (isComprehensive) return true;
        return activeSubscriptions.some(sub => sub.teacherId === unit.teacherId);
    }, [currentLesson.isFree, isComprehensive, activeSubscriptions, unit.teacherId]);

    const handleAskAI = async () => {
        if (!aiQuestion.trim() || isAiThinking) return;
        const q = aiQuestion.trim();
        setAiHistory(prev => [...prev, { role: 'user', content: q }]);
        setAiQuestion('');
        setIsAiThinking(true);
        try {
            const explanation = await getAIExplanation(unit.title, q, grade.name, { title: currentLesson.title, description: currentLesson.description || '' });
            setAiHistory(prev => [...prev, { role: 'ai', content: explanation }]);
        } catch {
            setAiHistory(prev => [...prev, { role: 'ai', content: "عذراً، حدث خطأ في الاتصال بالمساعد الذكي." }]);
        }
        finally { setIsAiThinking(false); }
    };

    if (isLoading) return <div className="flex justify-center items-center h-screen bg-[var(--bg-primary)]"><Loader /></div>;

    const isVideo = currentLesson.type === LessonType.EXPLANATION;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] font-tajawal pb-20 selection:bg-indigo-500 selection:text-white">
            {/* Navigation Header */}
            <div className="sticky top-0 z-50 px-6 py-6 bg-[var(--bg-primary)]/80 backdrop-blur-2xl border-b border-[var(--border-primary)]">
                <div className="flex items-center max-w-6xl mx-auto justify-between">
                    <button
                        onClick={onBack}
                        className="w-12 h-12 rounded-2xl glass-strong border border-[var(--glass-border)] flex items-center justify-center text-[var(--text-primary)] hover:bg-indigo-600 hover:text-white transition-all duration-500 group active:scale-95"
                        title="رجوع"
                        aria-label="رجوع"
                    >
                        <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1" />
                    </button>

                    <div className="flex flex-col items-center">
                        <span className="text-sm uppercase tracking-[0.2em] font-black text-indigo-500 mb-0.5">تفاصيل الحصة</span>
                        <h2 className="font-black text-lg md:text-xl text-[var(--text-primary)] truncate max-w-[200px] md:max-w-md">{currentLesson.title}</h2>
                    </div>

                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                        <PlaySolidIcon className="w-5 h-5" />
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 pt-10 animate-enter-right">

                {/* Hero Section: Ultra Premium Refinement */}
                <div className="relative group mb-12 rounded-[3.5rem] overflow-hidden shadow-[0_30px_70px_-20px_rgba(79,70,229,0.3)] border border-white/10">
                    {/* Dynamic Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900"></div>

                    {/* Animated Glows */}
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>

                    <div className="relative z-10 p-10 md:p-16 flex flex-col md:flex-row items-center gap-12">
                        <div className="flex-1 text-center md:text-right">
                            <div className="flex items-center justify-center md:justify-end gap-3 mb-8">
                                <span className="px-5 py-2 rounded-2xl bg-white/5 backdrop-blur-xl text-white text-xs font-black border border-white/10 uppercase tracking-[0.2em] shadow-xl">
                                    {unit.title}
                                </span>
                                <div className="px-5 py-2 rounded-2xl bg-emerald-500/10 backdrop-blur-xl text-emerald-400 text-xs font-black border border-emerald-500/20 flex items-center gap-2.5 shadow-xl">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"></div>
                                    45 دقيقة من الإبداع
                                </div>
                            </div>

                            <h1 className="text-4xl md:text-6xl font-black text-white mb-8 leading-[1.15] drop-shadow-2xl">
                                {currentLesson.title.split(':').map((part, i) => (
                                    <span key={i} className={i === 0 ? "block mb-2 text-indigo-200/90 text-2xl md:text-3xl" : "block"}>
                                        {part.trim()}
                                    </span>
                                ))}
                            </h1>

                            <p className="text-indigo-100/70 font-bold text-base md:text-xl max-w-3xl mb-12 leading-relaxed drop-shadow-sm">
                                {currentLesson.description ? currentLesson.description.replace(/<[^>]*>?/gm, '').substring(0, 160) + '...' : 'هذه المحاضرة مصممة خصيصاً لتبسيط أعقد المفاهيم وجعلها تجربة ممتعة لا تنسى.'}
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-5 justify-center md:justify-end">
                                {canAccess ? (
                                    <button
                                        onClick={isVideo ? onPlay : () => setIsQuizModalOpen(true)}
                                        className="w-full sm:w-auto px-12 py-6 bg-white text-indigo-950 font-black text-xl rounded-[2.5rem] shadow-[0_20px_40px_-10px_rgba(255,255,255,0.3)] flex items-center justify-center gap-4 hover:scale-[1.03] active:scale-95 transition-all group overflow-hidden relative"
                                    >
                                        <span className="relative z-10">{isVideo ? 'مشاهدة المحاضرة' : 'بدء الاختبار'}</span>
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 transition-transform group-hover:rotate-12 group-hover:scale-110 relative z-10 shadow-inner">
                                            <PlaySolidIcon className="w-6 h-6" />
                                        </div>
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 via-white to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => onNavigate('subscription')}
                                        className="w-full sm:w-auto px-12 py-6 bg-indigo-600/20 backdrop-blur-xl border-2 border-indigo-400/30 text-white font-black text-xl rounded-[2.5rem] shadow-2xl flex items-center justify-center gap-4 hover:bg-indigo-600/40 transition-all active:scale-95 group"
                                    >
                                        <LockClosedIcon className="w-6 h-6 group-hover:scale-110 transition-transform text-indigo-300" />
                                        <span>افتح المحتوى الآمن</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="w-56 h-56 md:w-80 md:h-80 rounded-[4rem] glass-strong border border-white/20 p-10 flex items-center justify-center rotate-6 group-hover:rotate-12 transition-all duration-1000 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] shrink-0 relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-[4rem]"></div>
                            <img src="/icons/lesson-hero.png" alt="Hero" className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(255,255,255,0.2)] group-hover:scale-110 transition-transform duration-700"
                                onError={(e) => { e.currentTarget.src = isVideo ? "https://img.icons8.com/clouds/200/video.png" : "https://img.icons8.com/clouds/200/test.png" }}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-12">

                    {/* Left Column: AI & Content */}
                    <div className="lg:col-span-8 space-y-10">

                        {/* Content Card: Priotized */}
                        <div className="bg-[var(--bg-secondary)] rounded-[3.5rem] p-8 md:p-12 shadow-xl border border-[var(--border-primary)] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-4 h-full bg-indigo-500 opacity-10 pointer-events-none" />

                            <h3 className="font-black text-2xl mb-10 flex items-center gap-4 text-[var(--text-primary)]">
                                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/10">
                                    <DocumentTextIcon className="w-7 h-7" />
                                </div>
                                <span>محتوى الحصة التفصيلي</span>
                            </h3>

                            <div className="prose prose-indigo max-w-none text-[var(--text-secondary)] font-bold leading-[2] text-right">
                                {currentLesson.description ? (
                                    <div dangerouslySetInnerHTML={{ __html: currentLesson.description }} className="max-w-full text-lg" />
                                ) : (
                                    <div className="p-8 border-2 border-dashed border-gray-100 rounded-[2.5rem] text-center opacity-70">
                                        <p className="italic">لم يقم المعلم بإضافة تفاصيل نصية لهذه الحصة.</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-12 pt-10 border-t-2 border-gray-50 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    { text: "أفضل جودة شرح في مصر", icon: CheckCircleIcon, color: "text-emerald-500", bg: "bg-emerald-50" },
                                    { text: "تصوير احترافي 4K", icon: VideoCameraIcon, color: "text-indigo-500", bg: "bg-indigo-50" },
                                    { text: "ملخصات PDF قابلة للطباعة", icon: DownloadIcon, color: "text-rose-500", bg: "bg-rose-50" },
                                    { text: "امتحانات تفاعلية ذكية", icon: SparklesIcon, color: "text-amber-500", bg: "bg-amber-50" }
                                ].map((item, i) => (
                                    <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl border-2 border-transparent hover:border-gray-100 transition-all stagger-${i}`}>
                                        <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center ${item.color} shrink-0`}>
                                            <item.icon className="w-6 h-6" />
                                        </div>
                                        <span className="text-sm text-[var(--text-primary)] font-black opacity-80">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* AI Assistant: Modern Chat UI (Moved below content) */}
                        <div className="bg-[var(--bg-secondary)] rounded-[3.5rem] p-8 md:p-10 shadow-xl border border-[var(--border-primary)] flex flex-col h-[600px] relative overflow-hidden ring-1 ring-black/5 hover:shadow-2xl transition-all">
                            {/* AI Background Effects */}
                            <div className="absolute -top-20 -left-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
                            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />

                            <div className="flex items-center justify-between mb-8 relative z-10 px-2">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-[0_10px_20px_-5px_rgba(79,70,229,0.5)] relative overflow-hidden group-hover:rotate-6 transition-transform">
                                        <BrainIcon className="w-8 h-8 relative z-10" />
                                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl text-gray-900">المساعد الذكي (Gemini Pro)</h3>
                                        <div className="flex items-center gap-2 text-sm font-black text-emerald-500">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                                            جاهز لشرح أي فكرة صعبة
                                        </div>
                                    </div>
                                </div>
                                <button className="w-10 h-10 rounded-xl glass border border-[var(--glass-border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-gray-100 transition-all opacity-70" title="إعدادات المساعد" aria-label="إعدادات المساعد">
                                    <SparklesIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <div ref={chatRef} className="flex-1 overflow-y-auto space-y-6 mb-8 custom-scrollbar px-4 relative z-10 scroll-smooth">
                                {aiHistory.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto gap-4">
                                        <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400 mb-2">
                                            <SparklesIcon className="w-10 h-10" />
                                        </div>
                                        <h4 className="font-black text-lg">يا بطل! محتاج مساعدة؟</h4>
                                        <p className="text-sm font-bold text-[var(--text-secondary)] leading-relaxed">اسألني عن أي حاجة مش فاهمها في "{currentLesson.title}" وهرد عليك في ثواني.</p>
                                    </div>
                                )}
                                {aiHistory.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'} animate-enter-up stagger-${idx % 4}`}>
                                        <div className={`max-w-[85%] p-5 rounded-[2rem] text-sm md:text-base font-bold leading-relaxed shadow-sm
                                            ${msg.role === 'user'
                                                ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-tr-sm border border-[var(--border-primary)]'
                                                : 'bg-gradient-to-l from-indigo-600 to-indigo-700 text-white rounded-tl-sm shadow-indigo-500/20'}`}
                                        >
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {isAiThinking && (
                                    <div className="flex justify-end animate-fade-in">
                                        <div className="bg-indigo-600/10 text-indigo-600 px-6 py-4 rounded-[2rem] rounded-tl-sm shadow-sm flex items-center gap-3 border border-indigo-500/20">
                                            <div className="flex gap-1.5">
                                                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></span>
                                            </div>
                                            <span className="text-sm uppercase font-black tracking-widest">المساعد الذكي يفكر...</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative mt-auto z-10">
                                <input
                                    type="text"
                                    value={aiQuestion}
                                    onChange={e => setAiQuestion(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAskAI()}
                                    placeholder="اكتب سؤالك هنا يا بطل..."
                                    className="w-full py-5 pr-6 pl-16 bg-[var(--bg-tertiary)]/50 backdrop-blur-md border-2 border-[var(--border-primary)] rounded-3xl text-sm font-black focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 shadow-inner"
                                />
                                <button
                                    onClick={handleAskAI}
                                    disabled={!aiQuestion.trim() || isAiThinking}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-indigo-600 rounded-2xl text-white disabled:opacity-50 disabled:bg-gray-300 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/30"
                                >
                                    <ArrowRightIcon className="w-6 h-6 rotate-180" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sidebar Actions */}
                    <div className="lg:col-span-4 space-y-10">

                        {/* Progress Tracking Card */}
                        <div className="bg-[var(--bg-secondary)] rounded-[3.5rem] p-10 shadow-xl border border-[var(--border-primary)] flex flex-col items-center justify-center relative group overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-amber-600" />
                            <div className="relative mb-8">
                                <svg className="w-40 h-40 transform -rotate-90">
                                    <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-50 dark:text-gray-900" />
                                    <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-orange-500 transition-all duration-1000" strokeDasharray="452.4" strokeDashoffset="0" strokeLinecap="round" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-black text-orange-600">100%</span>
                                    <span className="text-sm font-black text-gray-400 uppercase tracking-widest mt-1">نسبة الإتقان</span>
                                </div>
                            </div>
                            <div className="text-center">
                                <h4 className="font-black text-lg text-[var(--text-primary)] mb-2">إنجاز عالمي!</h4>
                                <p className="text-sm font-bold text-[var(--text-secondary)] opacity-60">أنت ماشي بمعدل ممتاز، كمل مذاكرتك بنفس القوة.</p>
                            </div>
                        </div>

                        {/* Quick Actions Card */}
                        <div className="bg-[var(--bg-secondary)] rounded-[3.5rem] p-8 md:p-10 shadow-xl border border-[var(--border-primary)] relative overflow-hidden">
                            <h3 className="font-black text-lg mb-8 text-[var(--text-primary)] flex items-center gap-3">
                                <div className="w-2 h-8 bg-indigo-500 rounded-full" />
                                أدوات التحكم السريع
                            </h3>
                            <div className="space-y-4">
                                {isVideo && canAccess && (
                                    <button
                                        onClick={onPlay}
                                        className="w-full py-5 bg-indigo-600 text-white font-black text-sm rounded-[1.5rem] shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 hover:bg-indigo-700 active:scale-95 transition-all group"
                                    >
                                        <PlaySolidIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        <span>مشاهدة الفيديو الآن</span>
                                    </button>
                                )}
                                <button
                                    className="w-full py-5 glass border-2 border-[var(--border-primary)] text-[var(--text-primary)] font-black text-sm rounded-[1.5rem] flex items-center justify-center gap-3 hover:border-emerald-500 hover:text-emerald-500 transition-all active:scale-95 group"
                                >
                                    <DownloadIcon className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                                    <span>تحميل ملزمة الحصة</span>
                                </button>

                                <div className="pt-8 mt-4 border-t border-gray-100 text-center">
                                    <p className="text-sm font-black text-[var(--text-secondary)] tracking-widest uppercase opacity-70 mb-2">معلومات الحصة</p>
                                    <div className="flex items-center justify-center gap-6">
                                        <div className="flex flex-col items-center">
                                            <span className="text-sm font-black text-[var(--text-primary)]">v1.2</span>
                                            <span className="text-[8px] font-bold text-gray-400">إصدار</span>
                                        </div>
                                        <div className="w-px h-6 bg-gray-100" />
                                        <div className="flex flex-col items-center">
                                            <span className="text-sm font-black text-[var(--text-primary)]">1080p</span>
                                            <span className="text-[8px] font-bold text-gray-400">جودة</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Teacher/Unit Info Sidebar Card */}
                        <div className="bg-[var(--bg-secondary)] rounded-[3.5rem] p-8 shadow-xl border border-[var(--border-primary)] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -translate-y-12 translate-x-12 blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
                            <div className="flex flex-col gap-6 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 border border-indigo-100 shrink-0">
                                        <VideoCameraIcon className="w-8 h-8" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-[var(--accent-primary)] text-sm mb-1">الوحدة التعليمية</h4>
                                        <p className="font-bold text-gray-900 truncate">{unit.title}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 mt-2 pt-6 border-t border-gray-50">
                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
                                        <img src="https://img.icons8.com/bubbles/100/teacher.png" className="w-full h-full object-cover" alt="Teacher" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em] mb-0.5">بإشراف المعلم</h4>
                                        <p className="font-black text-gray-900">خبير المادة</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Quiz Modal: Ultra Modern */}
            <Modal isOpen={isQuizModalOpen} onClose={() => setIsQuizModalOpen(false)} title={currentLesson.title} maxWidth="max-w-4xl">
                <div className="p-2">
                    <QuizTaker lesson={currentLesson} onComplete={async (id) => { if (user) await markLessonComplete(user.id, id); setIsQuizModalOpen(false); addToast("إنجاز رائع! تم تسجيل تفوقك في ملفك الشخصي بنجاح.", ToastType.SUCCESS); }} />
                </div>
            </Modal>

            <style>{`
                .animate-enter-right { animation: enterRight 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
                .animate-enter-up { animation: enterUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; opacity: 0; }
                @keyframes enterUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .stagger-0 { animation-delay: 0.1s; }
                .stagger-1 { animation-delay: 0.2s; }
                .stagger-2 { animation-delay: 0.3s; }
                .stagger-3 { animation-delay: 0.4s; }
            `}</style>
        </div>
    );
};

export default LessonDetailView;