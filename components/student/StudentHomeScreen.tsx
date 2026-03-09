
import React, { useMemo, useState, useEffect, memo, useCallback } from 'react';
import { Teacher, User, StudentView, Unit, Lesson, WatchedVideo, AISubject, CartoonMovie, Story, Announcement } from '../../types';
import { getGradeByIdSync, getStudentProgress, getStories, getPlatformSettings } from '../../services/storageService';
import { getAllTeachers } from '../../services/teacherService';
import { getPublishedCartoonMovies, cleanExpiredMovieRequests } from '../../services/movieService';
import { getActiveAnnouncements } from '../../services/announcementService';
import {
    VideoCameraIcon, PlaySolidIcon, SparklesIcon, PlayIcon, StarIcon,
    ChevronLeftIcon, ArrowLeftIcon, CheckCircleIcon, ClockIcon, FilmIcon,
    BrainIcon, BookOpenIcon, ChartBarIcon, FacebookIcon, InstagramIcon,
    YoutubeIcon, WhatsAppIcon, MegaphoneIcon, ArrowRightIcon
} from '../common/Icons';
import { useSubscription } from '../../hooks/useSubscription';
import { useAppearance } from '../../AppContext';
import StoryViewer from '../common/StoryViewer';

interface StudentHomeScreenProps {
    user: User;
    onNavigate: (view: StudentView, data?: { unit?: Unit, lesson?: Lesson, teacher?: Teacher, aiSubject?: AISubject, movie?: CartoonMovie }) => void;
}

// --- Icons for AI Subjects ---
const BulbIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" /></svg>
);
const AtomIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="1" /><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z" /><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z" /></svg>
);
const CalculateIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="18" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" /></svg>
);
const FlaskIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M8.5 2h7" /><path d="M12 2v6.5" /><path d="m13.742 7.51 7.718 13.692A1.2 1.2 0 0 1 20.422 23H3.578a1.2 1.2 0 0 1-1.038-1.798L10.258 7.51a1.203 1.203 0 0 1 2.484 0Z" /><path d="m10 16 2 2 4-4" /></svg>
);

// --- Components ---

const AnnouncementCarousel: React.FC<{ items: Announcement[] }> = ({ items }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (items.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % items.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [items.length]);

    if (!items || items.length === 0) return null;
    const currentItem = items[currentIndex];

    return (
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-indigo-900 to-purple-900 shadow-lg border border-white/5 mb-6 group mx-2">
            {currentItem.imageUrl && (
                <div className="absolute inset-0 z-0">
                    <img src={currentItem.imageUrl} alt="bg" className="w-full h-full object-cover opacity-20 mix-blend-overlay blur-sm scale-110" />
                </div>
            )}

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-5 md:p-6 gap-4">
                <div className="flex items-start gap-4 flex-1">
                    <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 hidden sm:block">
                        <MegaphoneIcon className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="bg-yellow-500 text-black text-sm font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">إعلان</span>
                            {items.length > 1 && (
                                <div className="flex gap-1">
                                    {items.map((_, idx) => (
                                        <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-3' : 'bg-white/30'}`}></div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <h3 className="text-lg md:text-xl font-black text-white mb-1 leading-tight line-clamp-1">{currentItem.title}</h3>
                        <p className="text-indigo-100 text-sm md:text-sm font-medium leading-relaxed max-w-xl line-clamp-2">{currentItem.content}</p>
                    </div>
                </div>

                {currentItem.linkUrl && (
                    <a
                        href={currentItem.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full md:w-auto px-5 py-2.5 bg-white text-indigo-900 rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span>التفاصيل</span>
                        <ArrowLeftIcon className="w-3 h-3" />
                    </a>
                )}
            </div>
        </div>
    );
};

const WelcomeCard: React.FC<{ name: string; progress: number; onContinue: () => void }> = ({ name, progress, onContinue }) => {
    const { profileHeaderColor } = useAppearance();

    return (
        <div className="w-full px-2 mb-8 perspective-1000">
            <div
                className="relative w-full rounded-[2.5rem] overflow-hidden group shadow-[0_20px_50px_-12px_rgba(79,70,229,0.5)] border border-white/20 transition-all duration-700 hover:scale-[1.01]"
                style={{
                    background: `linear-gradient(135deg, ${profileHeaderColor || '#4F46E5'}, #1e1b4b)`,
                    transformStyle: 'preserve-3d'
                }}
            >
                {/* --- Modern Geometric Background Layers --- */}
                <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0 0 L100 0 L100 100 Z" fill="white" fillOpacity="0.1" />
                        <circle cx="90" cy="10" r="30" fill="white" fillOpacity="0.05" />
                    </svg>
                </div>

                <div className="absolute inset-0 opacity-[0.1] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

                <div className="relative z-10 p-6 md:p-10 flex flex-row items-center justify-between gap-6 backdrop-blur-[2px]">
                    <div className="flex flex-col gap-2 text-right flex-1 transform translate-z-20 transition-transform duration-500">
                        <div className="flex items-center justify-start gap-2.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_#34d399]"></div>
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-indigo-100/90 drop-shadow-sm">بوابة المتفوقين</span>
                        </div>
                        <h1 className="text-2xl md:text-4xl font-black text-white leading-tight drop-shadow-2xl">
                            مرحباً، <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-purple-200">{name.split(' ')[0]}</span> ✨
                        </h1>
                        <p className="text-indigo-100/80 text-sm md:text-base font-bold leading-relaxed hidden sm:block drop-shadow-md">
                            مستعد لرحلة تعلم ممتعة النهاردة؟
                        </p>

                        <div className="mt-4 flex justify-start">
                            <button
                                onClick={onContinue}
                                className="group relative px-8 py-3.5 bg-white text-indigo-900 rounded-2xl font-black text-sm shadow-[0_10px_25px_-5px_rgba(0,0,0,0.4)] active:scale-95 transition-all overflow-hidden flex items-center gap-3"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    <PlaySolidIcon className="w-4 h-4" /> استكمال المذاكرة
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>
                        </div>
                    </div>

                    <div className="relative flex-shrink-0 group-hover:rotate-6 transition-transform duration-500">
                        <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center relative">
                            {/* Inner Ring Glow */}
                            <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-2xl animate-pulse"></div>

                            <svg className="w-full h-full transform -rotate-90 absolute top-0 left-0">
                                <circle cx="50%" cy="50%" r="42%" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
                            </svg>
                            <svg className="w-full h-full transform -rotate-90 relative z-10">
                                <circle
                                    cx="50%" cy="50%" r="42%"
                                    stroke="url(#welcomeGradient)"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray="264"
                                    strokeDashoffset={264 - (264 * progress) / 100}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                                <defs>
                                    <linearGradient id="welcomeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#4ade80" />
                                        <stop offset="100%" stopColor="#22d3ee" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20">
                                <span className="text-xl md:text-2xl font-black leading-none tracking-tighter drop-shadow-lg">{Math.round(progress)}<span className="text-xs">%</span></span>
                                <span className="text-[8px] font-black uppercase tracking-tighter opacity-70">إنجاز</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SubjectCard: React.FC<{
    title: string;
    icon: React.FC<any>;
    colorClass: string;
    borderColor: string;
    bgClass: string;
    onClick: () => void;
}> = ({ title, icon: Icon, colorClass, borderColor, bgClass, onClick }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group w-full">
        <div className={`w-full aspect-square rounded-[1.5rem] ${bgClass} border ${borderColor} flex items-center justify-center ${colorClass} group-active:scale-90 transition-all duration-300 group-hover:bg-opacity-20 relative overflow-hidden shadow-sm`}>
            <div className={`absolute inset-0 ${colorClass.replace('text-', 'bg-')}/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300`}></div>
            <Icon className="w-8 h-8 md:w-10 md:h-10 relative z-10 group-hover:scale-110 transition-transform duration-300" />
        </div>
        <span className={`text-sm md:text-sm font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors truncate w-full text-center`}>{title}</span>
    </button>
);

const LessonCard: React.FC<{ lesson: Lesson; unit: Unit; teacher?: Teacher; onClick: () => void; isCompleted: boolean }> = ({ lesson, unit, teacher, onClick, isCompleted }) => (
    <div
        onClick={onClick}
        className={`p-5 bg-white rounded-[2rem] flex items-center gap-5 group cursor-pointer transition-all duration-500 border-2 active:scale-95 shadow-[0_8px_30px_-5px_rgba(0,0,0,0.08)] hover:shadow-xl relative overflow-hidden
        ${isCompleted ? 'border-emerald-200' : 'border-gray-200 hover:border-indigo-400/40'}`}
    >
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 relative overflow-hidden group-hover:rotate-3 transition-transform duration-500 ${isCompleted ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
            <PlaySolidIcon className="w-6 h-6 relative z-10" />
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isCompleted ? 'bg-emerald-500/5' : 'bg-indigo-500/5'}`}></div>
        </div>

        <div className="flex-1 min-w-0 text-right">
            <div className="flex items-center justify-end gap-2 mb-1.5 flex-wrap-reverse">
                <span className="text-xs font-black text-gray-400 truncate max-w-[100px]">{teacher?.name}</span>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border shadow-sm ${isCompleted ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-indigo-500 text-white border-indigo-400'}`}>
                    {unit.title}
                </span>
            </div>
            <h4 className="text-base md:text-lg font-black text-gray-900 truncate group-hover:text-indigo-600 transition-colors leading-tight">{lesson.title}</h4>
        </div>

        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm border-2 transition-all duration-500 ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white border-gray-100 text-gray-300 group-hover:border-indigo-200 group-hover:text-indigo-400'}`}>
            {isCompleted ? <CheckCircleIcon className="w-5 h-5" /> : <ClockIcon className="w-5 h-5" />}
        </div>

        {/* Subtle Decorative element */}
        <div className={`absolute -bottom-6 -left-6 w-16 h-16 rounded-full blur-2xl opacity-20 pointer-events-none transition-all duration-700 ${isCompleted ? 'bg-emerald-400' : 'bg-indigo-400'}`}></div>
    </div>
);

const MovieCard: React.FC<{ movie: CartoonMovie, onClick: () => void }> = ({ movie, onClick }) => (
    <div onClick={onClick} className="w-40 md:w-52 shrink-0 group cursor-pointer snap-center mb-4">
        <div className="h-60 md:h-72 rounded-[2.5rem] overflow-hidden relative border-2 border-indigo-100/50 mb-4 shadow-xl transition-all duration-700 group-hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] group-hover:-translate-y-2 group-active:scale-95 group-hover:border-indigo-400">
            <img src={movie.posterUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" loading="lazy" />

            {/* Darker, defined overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Floating Play Button */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/30 shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500">
                    <PlaySolidIcon className="w-7 h-7 ml-0.5 text-white animate-pulse" />
                </div>
            </div>

            <div className="absolute top-4 right-4 z-20">
                <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl text-white backdrop-blur-xl border border-white/20 shadow-lg ${movie.type === 'movie' ? 'bg-red-600/60' : 'bg-blue-600/60'}`}>
                    {movie.type === 'movie' ? 'PREMIUM FILM' : 'SERIES'}
                </span>
            </div>

            {/* Title inside card for better clarity */}
            <div className="absolute bottom-6 left-6 right-6 z-20 transition-transform duration-500 group-hover:translate-y-[-4px]">
                <h4 className="text-base md:text-lg font-black text-white leading-tight drop-shadow-lg text-right">{movie.title}</h4>
            </div>
        </div>
    </div>
);

const SimpleFooter: React.FC = () => {
    const [settings, setSettings] = useState<any>(null);
    useEffect(() => { getPlatformSettings().then(setSettings); }, []);

    const links = [
        { icon: FacebookIcon, url: settings?.contactFacebookUrl, label: 'Facebook' },
        { icon: InstagramIcon, url: settings?.contactInstagramUrl, label: 'Instagram' },
        { icon: WhatsAppIcon, url: settings?.contactWhatsappUrl, label: 'WhatsApp' },
        { icon: YoutubeIcon, url: settings?.contactYoutubeUrl, label: 'YouTube' },
    ];

    return (
        <footer className="mt-10 pt-6 border-t border-[var(--border-primary)] flex flex-col items-center justify-center pb-6 animate-fade-in mx-4">
            <div className="flex items-center gap-4 mb-3">
                {links.map((link, idx) => link.url && (
                    <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors" title={link.label}>
                        <link.icon className="w-5 h-5" />
                    </a>
                ))}
            </div>
            <p className="text-sm font-bold text-[var(--text-secondary)] opacity-60">
                جميع الحقوق محفوظة © {new Date().getFullYear()} {settings?.platformName || 'Gstudent'}
            </p>
        </footer>
    );
};

const StoryRing: React.FC<{ story: Story; onClick: () => void; isSeen: boolean }> = ({ story, onClick, isSeen }) => {
    let previewContent;
    if (story.type === 'image') previewContent = <img src={story.content} className="w-full h-full object-cover" />;
    else if (story.type === 'movie' && story.movie_data) previewContent = <img src={story.movie_data.posterUrl} className="w-full h-full object-cover" />;
    else previewContent = <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white text-[8px] font-black p-1 text-center leading-tight overflow-hidden">{story.content.slice(0, 10)}</div>;

    return (
        <button onClick={onClick} className="flex flex-col items-center gap-1.5 group min-w-[72px] cursor-pointer transition-transform active:scale-95">
            <div className={`w-[68px] h-[68px] rounded-full p-[2px] transition-all duration-500 ${isSeen ? 'bg-gray-300 dark:bg-gray-700' : 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 animate-spin-slow'}`}>
                <div className="w-full h-full rounded-full border-2 border-[var(--bg-primary)] overflow-hidden bg-[var(--bg-tertiary)] relative">
                    {previewContent}
                    {story.category === 'movies' && (
                        <div className="absolute bottom-0 inset-x-0 bg-red-600 h-3 flex items-center justify-center">
                            <FilmIcon className="w-2 h-2 text-white" />
                        </div>
                    )}
                </div>
            </div>
            <span className="text-sm font-bold text-[var(--text-primary)] truncate w-[64px] text-center opacity-80">
                {story.category === 'movies' ? 'سينما' : 'إعلان'}
            </span>
        </button>
    );
};

const StudentHomeScreen: React.FC<StudentHomeScreenProps> = ({ user, onNavigate }) => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [movies, setMovies] = useState<CartoonMovie[]>([]);
    const [userProgress, setUserProgress] = useState<Record<string, boolean>>({});
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [stories, setStories] = useState<Story[]>([]);
    const [viewingStoryIndex, setViewingStoryIndex] = useState<number | null>(null);
    const { activeSubscriptions, isComprehensive } = useSubscription();

    const grade = useMemo(() => user ? getGradeByIdSync(user.grade) : null, [user]);
    const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);

    const aiSubjects: AISubject[] = [
        { id: 'biology', title: 'أحياء', icon: BulbIcon, color: 'red', gradient: 'bg-rose-500/5', systemRole: '...' },
        { id: 'physics', title: 'فيزياء', icon: AtomIcon, color: 'purple', gradient: 'bg-violet-500/5', systemRole: '...' },
        { id: 'math', title: 'رياضيات', icon: CalculateIcon, color: 'blue', gradient: 'bg-blue-500/5', systemRole: '...' },
        { id: 'chemistry', title: 'كيمياء', icon: FlaskIcon, color: 'green', gradient: 'bg-emerald-500/5', systemRole: '...' },
    ];

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            try {
                const [t, p, m, a, s_main, s_movies] = await Promise.all([
                    getAllTeachers(),
                    getStudentProgress(user.id),
                    getPublishedCartoonMovies(),
                    getActiveAnnouncements(),
                    getStories('main'),
                    getStories('movies')
                ]);
                if (!isMounted) return;
                setTeachers(t || []);
                if (p) setUserProgress(p.reduce((acc, i) => ({ ...acc, [i.lesson_id]: true }), {}));
                setMovies(m || []);
                setAnnouncements(a || []);
                const allStories = [...(s_main || []), ...(s_movies || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setStories(allStories);
            } catch (error) {
                console.error("Error loading home screen data:", error);
                // Fail gracefully so the screen doesn't freeze
                if (isMounted) {
                    setTeachers([]);
                    setMovies([]);
                    setAnnouncements([]);
                    setStories([]);
                }
            }
        };
        load();
        return () => { isMounted = false; };
    }, [user.id]);

    const { overallProgress, recentLessons, mySubjects } = useMemo(() => {
        if (!grade) return { overallProgress: 0, recentLessons: [], mySubjects: [] };

        const subIds = new Set(activeSubscriptions.map(s => s.teacherId));

        // جلب جميع الدروس التي يمكن للطالب الوصول إليها (المجانية + المدرسين المشترك لديهم)
        const allPotential = grade.semesters.flatMap(s => s.units.filter(u =>
            !u.track || u.track === 'All' || u.track === user.track
        ))
            .flatMap(u => (u.lessons || []).map(l => ({ lesson: l, unit: u })))
            .filter(i => i.lesson.publishedAt);

        // التصفية بناءً على الاشتراك أو كون الدرس مجانياً
        const accessible = allPotential.filter(i =>
            isComprehensive || i.lesson.isFree || subIds.has(i.unit.teacherId)
        );


        const prog = accessible.length > 0 ? (accessible.filter(l => userProgress[l.lesson.id]).length / accessible.length) * 100 : 0;

        // Get unique units for "My Subjects"
        const uniqueUnits = Array.from(new Set(accessible.map(i => i.unit.id)))
            .map(id => accessible.find(i => i.unit.id === id)?.unit)
            .filter(Boolean) as Unit[];

        return {
            overallProgress: prog,
            recentLessons: accessible.slice().reverse().slice(0, 8),
            mySubjects: uniqueUnits
        };
    }, [grade, user, userProgress, isComprehensive, activeSubscriptions]);

    const handleViewMovieFromStory = useCallback((movieId: string) => {
        setViewingStoryIndex(null);
        const movie = movies.find(m => m.id === movieId);
        if (movie) {
            onNavigate('cartoonMovies', { movie });
        } else {
            onNavigate('cartoonMovies');
        }
    }, [movies, onNavigate]);

    return (
        <div className="space-y-8 pb-20 animate-fade-in relative max-w-full overflow-x-hidden">
            {stories.length > 0 && (
                <div className="flex gap-4 overflow-x-auto pb-2 px-4 no-scrollbar mb-2 pt-2 scroll-smooth">
                    {stories.map((story, index) => {
                        const seenStories = JSON.parse(localStorage.getItem('seen_stories') || '[]');
                        return <StoryRing key={story.id} story={story} onClick={() => setViewingStoryIndex(index)} isSeen={seenStories.includes(story.id)} />;
                    })}
                </div>
            )}

            <WelcomeCard name={user.name} progress={overallProgress} onContinue={() => {
                if (recentLessons.length > 0) {
                    const { lesson, unit } = recentLessons[0];
                    onNavigate('grades', { unit, lesson });
                } else onNavigate('grades');
            }} />

            <AnnouncementCarousel items={announcements} />

            {/* --- MY SUBJECTS SECTION --- */}
            {mySubjects.length > 0 && (
                <section className="px-2 animate-slide-up stagger-1">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                            <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                            مناهجي الدراسية
                        </h3>
                        <button onClick={() => onNavigate('grades')} className="text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1">الكل <ArrowLeftIcon className="w-3 h-3" /></button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x md:grid md:grid-cols-4 lg:grid-cols-5 md:overflow-visible">
                        {mySubjects.map((unit) => (
                            <div key={unit.id} className="min-w-[120px] md:min-w-0 snap-center">
                                <SubjectCard
                                    title={unit.title}
                                    icon={BookOpenIcon}
                                    colorClass="text-indigo-600"
                                    borderColor="border-indigo-100"
                                    bgClass="bg-indigo-50"
                                    onClick={() => onNavigate('grades', { unit })}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* --- AI TUTOR SECTION --- */}
            <section className="px-2 animate-slide-up stagger-2">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                        <span className="w-1 h-6 bg-violet-600 rounded-full"></span>
                        المعلم الذكي
                    </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {aiSubjects.map((subject) => (
                        <button
                            key={subject.id}
                            onClick={() => onNavigate('chatbot', { aiSubject: subject })}
                            className={`group relative p-5 rounded-[2rem] border border-[var(--glass-border)] transition-all duration-300 hover:scale-[1.02] hover:shadow-xl overflow-hidden ${subject.gradient}`}
                        >
                            <div className="relative z-10 flex flex-col items-center gap-3">
                                <div className={`w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm text-${subject.color}-600 group-hover:scale-110 transition-transform`}>
                                    <subject.icon className="w-6 h-6" />
                                </div>
                                <span className="font-black text-[var(--text-primary)]">{subject.title}</span>
                            </div>
                            <div className={`absolute -bottom-4 -left-4 w-20 h-20 bg-${subject.color}-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform`} />
                        </button>
                    ))}
                </div>
            </section>

            <section className="px-2 animate-slide-up stagger-3">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2"><span className="w-1 h-6 bg-emerald-500 rounded-full"></span> استكمل دروسك</h3>
                    <button onClick={() => onNavigate('grades')} className="text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1">الكل <ArrowLeftIcon className="w-3 h-3" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recentLessons.map(({ lesson, unit }) => (
                        <LessonCard key={lesson.id} lesson={lesson} unit={unit} teacher={teacherMap.get(unit.teacherId)} onClick={() => onNavigate('grades', { unit, lesson })} isCompleted={!!userProgress[lesson.id]} />
                    ))}
                    {recentLessons.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-[var(--bg-secondary)] rounded-2xl border border-dashed border-[var(--border-primary)]"><p className="text-[var(--text-secondary)] opacity-50 text-sm font-bold">ابدأ رحلتك التعليمية الآن!</p></div>
                    )}
                </div>
            </section>

            {movies.length > 0 && (
                <section className="px-2 animate-slide-up stagger-2">
                    <div className="flex justify-between items-end mb-4 px-2">
                        <div><h2 className="text-2xl font-black italic tracking-tighter text-[var(--text-primary)]">MOVIE<span className="gradient-text">ZONE</span></h2><p className="text-sm text-[var(--text-secondary)] mt-0.5 font-bold">ترفيه تعليمي هادف</p></div>
                        <button onClick={() => onNavigate('cartoonMovies')} className="text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1">المكتبة <ArrowLeftIcon className="w-3 h-3" /></button>
                    </div>
                    {/* Improved Horizontal Scroller for Swipe Feel */}
                    <div className="flex gap-4 overflow-x-auto hide-scroll pb-4 -mx-4 px-4 snap-x snap-mandatory touch-pan-x">
                        {movies.slice(0, 6).map((movie) => <MovieCard key={movie.id} movie={movie} onClick={() => onNavigate('cartoonMovies', { movie })} />)}
                    </div>
                </section>
            )}

            <SimpleFooter />

            {viewingStoryIndex !== null && (
                <StoryViewer
                    stories={stories}
                    initialIndex={viewingStoryIndex}
                    onClose={() => setViewingStoryIndex(null)}
                    onViewMovie={handleViewMovieFromStory}
                />
            )}
        </div>
    );
};

export default memo(StudentHomeScreen);
