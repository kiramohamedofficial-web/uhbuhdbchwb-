
import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { Grade, Unit, Lesson, LessonType, User, StudentView, ToastType } from '../../types';
import { getStudentProgress, getLessonsByUnit } from '../../services/storageService';
import { useSwipeBack } from '../../hooks/useSwipeBack';
import {
    BookOpenIcon, PencilIcon, CheckCircleIcon,
    VideoCameraIcon, DocumentTextIcon, ArrowRightIcon,
    ChevronDownIcon, LockClosedIcon, CheckIcon,
    ArrowLeftIcon, PlaySolidIcon, ClockIcon,
    SparklesIcon, InformationCircleIcon
} from '../common/Icons';
import Loader from '../common/Loader';
import { useSubscription } from '../../hooks/useSubscription';
import { useToast } from '../../useToast';

interface GroupedLesson {
    baseTitle: string;
    explanations: Lesson[];
    homeworks: Lesson[];
    exams: Lesson[];
    summaries: Lesson[];
    isCompleted: boolean;
    progress: number;
    completedCount: number;
    totalParts: number;
    hasNew: boolean;
}

const isNew = (dateStr?: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
};

const ActionItem = ({
    icon: Icon,
    title,
    subtitle,
    gradientFrom,
    gradientTo,
    onClick,
    isLocked,
    isCompleted
}: any) => (
    <div
        onClick={onClick}
        className={`group flex items-center gap-4 p-5 rounded-[2rem] border-2 transition-all duration-300 cursor-pointer font-tajawal shadow-sm
        ${isLocked
                ? 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] border-b-[6px] opacity-70 grayscale'
                : `bg-[var(--bg-secondary)] border-[var(--border-primary)] border-b-[6px] hover:border-[var(--accent-primary)] hover:-translate-y-1 active:translate-y-1 hover:shadow-xl hover:shadow-[var(--accent-primary)]/10`
            }`}
    >
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradientFrom} ${gradientTo} border-2 border-b-4 border-black/10 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300`}>
            {isCompleted ? <CheckIcon className="w-8 h-8 drop-shadow-md" /> : isLocked ? <LockClosedIcon className="w-6 h-6 opacity-70 drop-shadow-md" /> : <Icon className="w-7 h-7 drop-shadow-md" />}
        </div>
        <div className="flex-1 text-right">
            <div className={`font-black text-lg md:text-xl mb-1.5 transition-colors ${isLocked ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)] group-hover:text-[var(--accent-primary)]'}`}>
                {title}
            </div>
            <div className="text-sm text-[var(--text-secondary)] font-bold flex items-center gap-1.5 opacity-80">
                <span className={`w-2 h-2 rounded-full ${isLocked ? 'bg-[var(--border-primary)]' : 'bg-[var(--accent-primary)] animate-pulse'}`}></span>
                {subtitle}
            </div>
        </div>
        <div className="flex items-center gap-3">
            {isLocked && (
                <div className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 text-rose-500 rounded-xl border-2 border-rose-500/20 shadow-inner">
                    <LockClosedIcon className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">مغلق</span>
                </div>
            )}
            {!isLocked && !isCompleted && (
                <div className="w-10 h-10 rounded-[1rem] bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--accent-primary)] border-2 border-b-[4px] border-[var(--border-primary)] group-hover:bg-[var(--accent-primary)] group-hover:text-white group-hover:border-indigo-700 transition-all shadow-sm">
                    <ArrowRightIcon className="w-5 h-5 -rotate-180 drop-shadow-sm" />
                </div>
            )}
            {isCompleted && (
                <div className="w-10 h-10 rounded-[1rem] bg-emerald-500 flex items-center justify-center text-white border-2 border-b-4 border-emerald-600 shadow-sm drop-shadow-sm group-hover:-translate-y-1 transition-transform">
                    <CheckIcon className="w-6 h-6 stroke-3 drop-shadow-md" />
                </div>
            )}
        </div>
    </div>
);

const CourseView: React.FC<{
    grade: Grade; unit: Unit; user: User; onBack: () => void;
    onNavigate: (view: StudentView) => void;
    onPlayLesson: (lesson: Lesson) => void;
    initialLesson?: Lesson | null;
    isDataSaverEnabled: boolean;
}> = ({ grade, unit, user, onBack, onPlayLesson }) => {
    const [userProgress, setUserProgress] = useState<Record<string, boolean>>({});
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { activeSubscriptions, isComprehensive } = useSubscription();
    const { addToast } = useToast();

    useSwipeBack(onBack);

    useEffect(() => {
        const fetchAll = async () => {
            setIsLoading(true);
            const [prog, data] = await Promise.all([getStudentProgress(user.id), getLessonsByUnit(unit.id)]);
            if (prog) setUserProgress(prog.reduce((acc, item) => ({ ...acc, [item.lesson_id]: true }), {}));
            setLessons(data.filter(l => l.publishedAt));
            setIsLoading(false);
        };
        fetchAll();
    }, [user.id, unit.id]);

    const groupedLessons = useMemo((): GroupedLesson[] => {
        const groups: Record<string, any> = {};
        lessons.forEach(l => {
            let baseTitle = l.title;
            const splitMatch = l.title.match(/^(.+?)(?::|-)(.+)/);
            if (splitMatch) {
                baseTitle = splitMatch[1].trim();
            } else {
                const lessonNumMatch = l.title.match(/(?:الدرس|الحصة|محاضرة)\s+(\d+)/);
                if (lessonNumMatch) {
                    baseTitle = lessonNumMatch[0];
                }
            }

            if (!groups[baseTitle]) groups[baseTitle] = {
                baseTitle, explanations: [], homeworks: [], exams: [], summaries: [], hasNew: false
            };

            if (isNew(l.publishedAt)) groups[baseTitle].hasNew = true;

            if (l.type === LessonType.EXPLANATION) groups[baseTitle].explanations.push(l);
            else if (l.type === LessonType.HOMEWORK) groups[baseTitle].homeworks.push(l);
            else if (l.type === LessonType.EXAM) groups[baseTitle].exams.push(l);
            else if (l.type === LessonType.SUMMARY) groups[baseTitle].summaries.push(l);
        });

        return Object.values(groups).map(g => {
            const all = [...g.explanations, ...g.summaries, ...g.homeworks, ...g.exams];
            const completed = all.filter(p => userProgress[p.id]).length;
            return {
                ...g,
                isCompleted: completed === all.length && all.length > 0,
                progress: all.length > 0 ? (completed / all.length) * 100 : 0,
                completedCount: completed,
                totalParts: all.length
            };
        }).sort((a, b) => a.baseTitle.localeCompare(b.baseTitle, 'ar-EG', { numeric: true }));
    }, [lessons, userProgress]);

    const hasAccess = isComprehensive || activeSubscriptions.some(s => s.teacherId === unit.teacherId);
    const isLessonAccessible = useCallback((l: Lesson) => l.isFree || hasAccess, [hasAccess]);

    const handleLessonClick = (l: Lesson) => {
        if (!isLessonAccessible(l)) {
            addToast('🚫 هذا المحتوى يتطلب اشتراكاً فعالاً للوصول إليه.', ToastType.ERROR);
            return;
        }
        onPlayLesson(l);
    };

    const overallProgress = useMemo(() => {
        if (lessons.length === 0) return 0;
        return Math.round((lessons.filter(l => userProgress[l.id]).length / lessons.length) * 100);
    }, [lessons, userProgress]);

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] font-tajawal pb-24 selection:bg-indigo-500 selection:text-white">

            {/* Ultra Premium Header */}
            <div className="sticky top-0 z-50 transition-all duration-300">
                <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-2xl border-b border-[var(--border-primary)] shadow-lg shadow-black/5">
                    <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
                        <button
                            onClick={onBack}
                            className="w-12 h-12 rounded-2xl glass-strong border border-[var(--glass-border)] flex items-center justify-center text-[var(--text-primary)] hover:bg-indigo-600 hover:text-white transition-all duration-500 group active:scale-95"
                            title="رجوع"
                            aria-label="رجوع"
                        >
                            <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1" />
                        </button>

                        <div className="flex flex-col items-center gap-1 max-w-[60%] text-center">
                            <span className="text-sm uppercase tracking-widest font-black text-indigo-500 opacity-80">الوحدة التعليمية</span>
                            <h2 className="font-black text-lg md:text-2xl text-[var(--text-primary)] truncate">{unit.title}</h2>
                        </div>

                        <div className="relative w-14 h-14 group">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-[var(--bg-tertiary)]" />
                                <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-indigo-500 transition-all duration-1000" strokeDasharray="150.8" strokeDashoffset={150.8 - (150.8 * overallProgress) / 100} strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-sm font-black text-indigo-500">{overallProgress}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 mt-12 space-y-6">

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-40 gap-4">
                        <Loader />
                        <p className="text-sm font-black text-gray-500 animate-pulse">جاري تحضير المحتوى...</p>
                    </div>
                ) : groupedLessons.length === 0 ? (
                    <div className="text-center py-40 flex flex-col items-center gap-6 glass-strong rounded-[3rem] border border-[var(--glass-border)] opacity-60">
                        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-gray-300">
                            <BookOpenIcon className="w-12 h-12" />
                        </div>
                        <p className="text-lg font-black text-gray-500">لا يوجد محتوى مدرَس لهذه الوحدة بعد.</p>
                    </div>
                ) : (
                    groupedLessons.map((group, idx) => (
                        <div
                            key={idx}
                            className={`group bg-[var(--bg-secondary)] rounded-[2.5rem] overflow-hidden border-2 border-b-[8px] transition-all duration-300 shadow-sm hover:shadow-xl
                                ${openAccordion === group.baseTitle ? 'border-[var(--accent-primary)]/80 ring-4 ring-[var(--accent-primary)]/10 scale-[1.01]' : 'border-[var(--border-primary)] hover:border-[var(--accent-primary)]/40 hover:-translate-y-1'}
                            `}
                        >
                            <div
                                onClick={() => setOpenAccordion(openAccordion === group.baseTitle ? null : group.baseTitle)}
                                className={`p-6 md:p-8 flex items-center justify-between cursor-pointer transition-colors
                                    ${openAccordion === group.baseTitle ? 'bg-[var(--accent-primary)]/5' : 'hover:bg-[var(--bg-tertiary)]/50'}
                                `}
                            >
                                <div className="flex-1 flex items-center gap-6 text-right">
                                    <div className={`w-16 h-16 rounded-[1.4rem] border-2 border-b-[6px] border-black/10 flex items-center justify-center shrink-0 transition-transform duration-500 shadow-md rotate-[-2deg] group-hover:rotate-0
                                        ${group.isCompleted ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white border-emerald-600' : 'bg-gradient-to-br from-[var(--accent-primary)] to-indigo-600 text-white border-indigo-700 group-hover:scale-110'}
                                    `}>
                                        {group.isCompleted ? <CheckCircleIcon className="w-8 h-8 drop-shadow-md" /> : <BookOpenIcon className="w-8 h-8 drop-shadow-md" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                                            <h3 className="font-black text-2xl md:text-3xl text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                                                {group.baseTitle}
                                            </h3>
                                            {group.hasNew && (
                                                <span className="px-4 py-1 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-full text-xs font-black shadow-lg shadow-orange-500/30 animate-pulse border-b-[3px] border-orange-600 tracking-widest uppercase">
                                                    جديد
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-5 text-sm font-bold">
                                            <div className="flex items-center gap-2 text-[var(--text-secondary)] opacity-80">
                                                <ClockIcon className="w-5 h-5" />
                                                <span>{group.totalParts} أجزاء تفاعلية</span>
                                            </div>
                                            <div className={`flex items-center gap-2 ${group.isCompleted ? 'text-emerald-500' : 'text-[var(--accent-primary)]'}`}>
                                                {group.isCompleted ? <CheckIcon className="w-5 h-5 bg-emerald-100 rounded-full p-0.5" /> : <div className="w-2.5 h-2.5 rounded-full bg-current drop-shadow-md animate-pulse" />}
                                                <span className="font-black tracking-wide">{group.isCompleted ? 'مكتمل بنجاح!' : `${group.completedCount} من ${group.totalParts} منجز`}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center transition-all duration-500 border-2 border-b-4
                                    ${openAccordion === group.baseTitle ? 'bg-[var(--accent-primary)] border-indigo-700 text-white -rotate-180 shadow-lg shadow-indigo-500/30' : 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-secondary)] group-hover:bg-[var(--accent-primary)]/10 group-hover:text-[var(--accent-primary)]'}
                                `}>
                                    <ChevronDownIcon className="w-6 h-6 stroke-2" />
                                </div>
                            </div>

                            {/* Accordion Content with Ultra Smooth Animation */}
                            <div className={`grid transition-all duration-500 ease-out overflow-hidden ${openAccordion === group.baseTitle ? 'grid-rows-[1fr] opacity-100 border-t border-gray-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="min-h-0">
                                    <div className="p-6 md:p-8 space-y-4 bg-gray-50/30">

                                        {/* Group Header Info */}
                                        <div className="flex items-center justify-between mb-4 px-2">
                                            <div className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-8 h-px bg-gray-200" />
                                                محتوى الدرس
                                                <div className="w-8 h-px bg-gray-200" />
                                            </div>
                                        </div>

                                        {/* Explanations */}
                                        {group.explanations.map(l => (
                                            <ActionItem
                                                key={l.id} icon={PlaySolidIcon} title={l.title}
                                                subtitle={l.isFree ? "معاينة مجانية" : "محاضرة فيديو HD"}
                                                gradientFrom="from-indigo-500" gradientTo="to-indigo-600"
                                                onClick={() => handleLessonClick(l)} isLocked={!isLessonAccessible(l)}
                                                isCompleted={!!userProgress[l.id]}
                                            />
                                        ))}

                                        {/* Summaries */}
                                        {group.summaries.map(l => (
                                            <ActionItem
                                                key={l.id} icon={DocumentTextIcon} title={l.title}
                                                subtitle="ملخص شامل PDF"
                                                gradientFrom="from-rose-500" gradientTo="to-rose-600"
                                                onClick={() => handleLessonClick(l)} isLocked={!isLessonAccessible(l)}
                                                isCompleted={!!userProgress[l.id]}
                                            />
                                        ))}

                                        {/* Homeworks */}
                                        {group.homeworks.map(l => (
                                            <ActionItem
                                                key={l.id} icon={PencilIcon} title={l.title}
                                                subtitle="تمارين وتطبيقات"
                                                gradientFrom="from-emerald-500" gradientTo="to-emerald-600"
                                                onClick={() => handleLessonClick(l)} isLocked={!isLessonAccessible(l)}
                                                isCompleted={!!userProgress[l.id]}
                                            />
                                        ))}

                                        {/* Exams */}
                                        {group.exams.map(l => (
                                            <ActionItem
                                                key={l.id} icon={SparklesIcon} title={l.title}
                                                subtitle="اختبار ذكي للتقييم"
                                                gradientFrom="from-amber-500" gradientTo="to-amber-600"
                                                onClick={() => handleLessonClick(l)} isLocked={!isLessonAccessible(l)}
                                                isCompleted={!!userProgress[l.id]}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {/* Premium Gamified Banner */}
                {!isLoading && groupedLessons.length > 0 && (
                    <div className="relative group p-8 rounded-[2.5rem] bg-gradient-to-b from-indigo-500 to-indigo-700 text-white shadow-xl shadow-indigo-500/20 overflow-hidden mt-12 mb-8 border-2 border-b-[8px] border-indigo-800 rotate-[-1deg] hover:rotate-0 transition-transform duration-300">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                            <div className="w-16 h-16 rounded-[1.2rem] bg-indigo-400/30 border-2 border-indigo-400/50 flex items-center justify-center text-white rotate-6 group-hover:rotate-12 transition-transform duration-500 shadow-inner">
                                <SparklesIcon className="w-8 h-8 drop-shadow-md" />
                            </div>
                            <div className="text-center md:text-right flex-1">
                                <h4 className="text-2xl font-black mb-2 text-white drop-shadow-md">نصيحة المنصة للمتميزين</h4>
                                <p className="text-sm font-bold/80 leading-relaxed max-w-2xl opacity-90 text-indigo-100">أكمل جميع أجزاء الوحدة لتحصل على شارة الإتقان الذهبية وترفع نقاطك في لوحة المتصدرين وتنافس على القمة!</p>
                            </div>
                            <button className="px-8 py-4 bg-white text-indigo-700 rounded-2xl font-black text-lg hover:scale-105 active:translate-y-1 active:scale-95 transition-all shadow-[0_6px_0_rgb(199,210,254)] hover:shadow-[0_8px_0_rgb(199,210,254)] mt-4 md:mt-0 border-2 border-indigo-200 uppercase tracking-widest">
                                ابدأ التحدي الآن
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(CourseView);
