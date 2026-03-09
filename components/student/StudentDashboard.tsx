
import React, { useState, useMemo, useEffect, lazy, Suspense, useCallback } from 'react';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { Unit, Lesson, StudentView, Teacher, Course, ToastType, CartoonMovie, Mode, AISubject, Grade } from '../../types';
import StudentLayout from '../layout/StudentLayout';
import { SparklesIcon } from '../common/Icons';
import { useSession } from '../../hooks/useSession';
import Loader from '../common/Loader';
import { useToast } from '../../useToast';
import { useAppearance } from '../../AppContext';
import AiLearningView from './FrenchLearningView';
import { markLessonComplete } from '../../services/storageService';
import SpecialTeacherProfile from './SpecialTeacherProfile';

const CourseView = lazy(() => import('../curriculum/CourseView'));
const SubscriptionView = lazy(() => import('./Subscription'));
const Profile = lazy(() => import('./Profile'));
const SubjectSelectionScreen = lazy(() => import('./SubjectSelectionScreen'));
const StudentHomeScreen = lazy(() => import('./StudentHomeScreen'));
const TeachersView = lazy(() => import('./TeachersView'));
const TeacherProfileView = lazy(() => import('./TeacherProfileView'));
const CoursesStore = lazy(() => import('./CoursesStore'));
const SingleSubjectSubscription = lazy(() => import('./SingleSubjectSubscription'));
const ComprehensiveSubscription = lazy(() => import('./ComprehensiveSubscription'));
const ResultsView = lazy(() => import('../curriculum/ResultsView'));
const ChatbotView = lazy(() => import('./ChatbotView'));
const CartoonMoviesView = lazy(() => import('../movies/CartoonMoviesView'));
const CourseDetailView = lazy(() => import('../curriculum/CourseDetailView'));
const SmartPlanView = lazy(() => import('./SmartPlanView'));
const QuestionBankView = lazy(() => import('./QuestionBankView'));
const AskTeacherView = lazy(() => import('./AskTeacherView'));
const ReelsView = lazy(() => import('./ReelsView'));
const LessonDetailView = lazy(() => import('../curriculum/LessonDetailView'));
const VideoPlayerView = lazy(() => import('../curriculum/VideoPlayerView'));

// --- Route Helpers ---

const UnitRoute: React.FC<{ grade: Grade | null; user: any; onNavigate: (view: StudentView) => void; onPlayLesson: (lesson: Lesson) => void; isDataSaverEnabled: boolean }> = ({ grade, user, onNavigate, onPlayLesson, isDataSaverEnabled }) => {
    const params = useParams();
    const slug = (params?.slug as string[]) || [];
    const unitId = slug[0] === 'units' ? slug[1] : undefined;
    const router = useRouter();

    const unit = useMemo(() => {
        if (!grade) return null;
        for (const semester of grade.semesters) {
            const found = semester.units.find(u => u.id === unitId);
            if (found) return found;
        }
        return null;
    }, [grade, unitId]);

    if (!grade) return <Loader />;
    if (!unit) { router.replace('/student/grades'); return null; }

    return <CourseView grade={grade} unit={unit} user={user} onBack={() => router.push('/student/grades')} onNavigate={onNavigate} onPlayLesson={onPlayLesson} isDataSaverEnabled={isDataSaverEnabled} />;
};

const LessonRoute: React.FC<{ grade: Grade | null; onNavigate: (view: StudentView) => void }> = ({ grade, onNavigate }) => {
    const params = useParams();
    const slug = (params?.slug as string[]) || [];
    const lessonId = slug[0] === 'lessons' ? slug[1] : undefined;
    const router = useRouter();

    const { lesson, unit } = useMemo(() => {
        if (!grade) return { lesson: null, unit: null };
        for (const semester of grade.semesters) {
            for (const u of semester.units) {
                const l = u.lessons.find(l => l.id === lessonId);
                if (l) return { lesson: l, unit: u };
            }
        }
        return { lesson: null, unit: null };
    }, [grade, lessonId]);

    if (!grade) return <Loader />;
    if (!lesson || !unit) { router.replace('/student/grades'); return null; }

    return <LessonDetailView lesson={lesson} unit={unit} grade={grade} onBack={() => router.push(`/student/units/${unit.id}`)} onPlay={() => router.push(`/student/player/${lesson.id}`)} onNavigate={onNavigate} />;
};

const PlayerRoute: React.FC<{ grade: Grade | null; user: any; isDataSaverEnabled: boolean; addToast: any }> = ({ grade, user, isDataSaverEnabled, addToast }) => {
    const params = useParams();
    const slug = (params?.slug as string[]) || [];
    const lessonId = slug[0] === 'player' ? slug[1] : undefined;
    const router = useRouter();

    const { lesson, unit } = useMemo(() => {
        if (!grade) return { lesson: null, unit: null };
        for (const semester of grade.semesters) {
            for (const u of semester.units) {
                const l = u.lessons.find(l => l.id === lessonId);
                if (l) return { lesson: l, unit: u };
            }
        }
        return { lesson: null, unit: null };
    }, [grade, lessonId]);

    const handleNextLesson = (nextLesson: Lesson) => {
        router.push(`/student/lessons/${nextLesson.id}`);
    };

    if (!grade) return <Loader />;
    if (!lesson || !unit) { router.replace('/student/grades'); return null; }

    return <VideoPlayerView
        lesson={lesson}
        unit={unit}
        grade={grade}
        onBack={() => router.push(`/student/lessons/${lesson.id}`)}
        onLessonComplete={async (id) => { await markLessonComplete(user.id, id); addToast('رائع! أتممت هذا الجزء.', ToastType.SUCCESS); }}
        isDataSaverEnabled={isDataSaverEnabled}
        onNextLesson={handleNextLesson}
    />;
};

// --- Additional Wrappers ---
// Navigation state is passed via simple local storage or query params for now if using next/navigation
// we'll just try to parse from a custom global state or rely on the previous flow, 
// for simplicity if data is missing we just go back.

let inMemoryState: any = {};
export const setMemoryState = (state: any) => { inMemoryState = state; };

const TeacherProfileWrapper: React.FC<{ user: any; onNavigateToCourse: (u: Unit) => void; onBack: () => void }> = ({ user, onNavigateToCourse, onBack }) => {
    const router = useRouter();
    if (!inMemoryState?.teacher) { router.replace('/student/teachers'); return null; }
    return <TeacherProfileView teacher={inMemoryState.teacher} user={user} onBack={onBack} onNavigateToCourse={onNavigateToCourse} />;
};

const SpecialTeacherProfileWrapper: React.FC<{ user: any; onPlay: (lesson: Lesson, unit: Unit) => void; onBack: () => void }> = ({ user, onPlay, onBack }) => {
    const router = useRouter();
    if (!inMemoryState?.teacher) { router.replace('/student/teachers'); return null; }
    return <SpecialTeacherProfile teacher={inMemoryState.teacher} user={user} onBack={onBack} onPlay={onPlay} />;
};

const CourseDetailWrapper: React.FC<{ onBack: () => void; isDataSaverEnabled: boolean }> = ({ onBack, isDataSaverEnabled }) => {
    const router = useRouter();
    if (!inMemoryState?.course) { router.replace('/student/courses'); return null; }
    return <CourseDetailView course={inMemoryState.course} onBack={onBack} isDataSaverEnabled={isDataSaverEnabled} />;
};

const CartoonMoviesWrapper: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    return <CartoonMoviesView initialMovie={inMemoryState?.movie} onBack={onBack} />;
};

const AiLearningWrapper: React.FC<{ onNavigate: (view: StudentView) => void; onBack: () => void }> = ({ onNavigate, onBack }) => {
    const router = useRouter();
    if (!inMemoryState?.subject) { router.replace('/student/home'); return null; }
    return <AiLearningView subject={inMemoryState.subject} onNavigate={onNavigate} onBack={onBack} />;
};

// --- Main Component ---

const StudentDashboard: React.FC = () => {
    const { currentUser: user, isLoading } = useSession();
    const [isDataSaverEnabled, setIsDataSaverEnabled] = useState(false);
    const { addToast } = useToast();
    const router = useRouter();
    const pathname = usePathname();

    const studentGrade = useMemo(() => user?.gradeData ?? null, [user]);

    // Map URL to activeView for Layout
    const activeView = useMemo(() => {
        const path = pathname || '';
        if (path.includes('/grades')) return 'grades';
        if (path.includes('/units')) return 'units';
        if (path.includes('/lessons')) return 'lessonDetail';
        if (path.includes('/player')) return 'player';
        if (path.includes('/teachers')) return 'teachers';
        if (path.includes('/teacher/')) return 'teacherProfile';
        if (path.includes('/special-teacher/')) return 'teacherProfile';
        if (path.includes('/profile')) return 'profile';
        if (path.includes('/courses')) return 'courses';
        if (path.includes('/subscription')) return 'subscription';
        if (path.includes('/results')) return 'results';
        if (path.includes('/chatbot')) return 'chatbot';
        if (path.includes('/movies')) return 'cartoonMovies';
        if (path.includes('/smart-plan')) return 'smartPlan';
        if (path.includes('/question-bank')) return 'questionBank';
        if (path.includes('/ask-teacher')) return 'askTeacher';
        if (path.includes('/reels')) return 'reels';
        if (path.includes('/ai-learning')) return 'aiLearning';
        return 'home';
    }, [pathname]);

    const handleNavClick = useCallback((view: StudentView) => {
        if (user && user.grade === null && ['grades', 'smartPlan', 'questionBank', 'french', 'aiLearning'].includes(view)) {
            addToast("يجب تحديد صفك الدراسي أولاً من ملفك الشخصي.", ToastType.ERROR);
            router.push('/student/profile');
            return;
        }

        switch (view) {
            case 'home': router.push('/student/home'); break;
            case 'grades': router.push('/student/grades'); break;
            case 'teachers': router.push('/student/teachers'); break;
            case 'profile': router.push('/student/profile'); break;
            case 'courses': router.push('/student/courses'); break;
            case 'subscription': router.push('/student/subscription'); break;
            case 'results': router.push('/student/results'); break;
            case 'chatBot':
            case 'chatbot': router.push('/student/chatbot'); break;
            case 'cartoonMovies': router.push('/student/movies'); break;
            case 'smartPlan': router.push('/student/smart-plan'); break;
            case 'questionBank': router.push('/student/question-bank'); break;
            case 'askTeacher': router.push('/student/ask-teacher'); break;
            case 'reels': router.push('/student/reels'); break;
            case 'french':
            case 'aiLearning': router.push('/student/ai-learning'); break;
            case 'adhkar': router.push('/student/adhkar'); break;
            case 'quran': router.push('/student/quran'); break;
            default: router.push('/student/home');
        }
    }, [user, addToast, router]);

    const handleHomeNavigation = useCallback((view: StudentView, data?: { unit?: Unit; lesson?: Lesson; teacher?: Teacher; course?: Course; aiSubject?: AISubject; movie?: CartoonMovie }) => {
        if (view === 'teacherProfile' && data?.teacher) {
            setMemoryState({ teacher: data.teacher });
            if (data.teacher.isSpecial) {
                router.push(`/student/special-teacher/${data.teacher.id}`);
            } else {
                router.push(`/student/teacher/${data.teacher.id}`);
            }
        } else if (view === 'grades' && data?.unit) {
            if (data.lesson) {
                router.push(`/student/lessons/${data.lesson.id}`);
            } else {
                router.push(`/student/units/${data.unit.id}`);
            }
        } else if (view === 'aiLearning' && data?.aiSubject) {
            setMemoryState({ subject: data.aiSubject });
            router.push(`/student/ai-learning/${data.aiSubject.id}`);
        } else if (view === 'courseDetail' && data?.course) {
            setMemoryState({ course: data.course });
            router.push(`/student/course/${data.course.id}`);
        } else if (view === 'cartoonMovies' && data?.movie) {
            setMemoryState({ movie: data.movie });
            router.push(`/student/movies`);
        } else {
            handleNavClick(view);
        }
    }, [router, handleNavClick]);

    const handleLessonSelect = (lesson: Lesson) => {
        router.push(`/student/lessons/${lesson.id}`);
    };

    // Replace Routes with manual matching
    const renderContent = () => {
        const path = pathname || '';

        if (path.includes('/grades')) {
            if (!studentGrade && isLoading) return <div className="flex justify-center items-center h-[calc(100vh-200px)]"><Loader /></div>;
            if (!studentGrade) return <div className="text-center py-20 text-[var(--text-secondary)] font-bold">يرجى تحديد الصف الدراسي من الملف الشخصي أولاً.</div>;
            return <SubjectSelectionScreen user={user!} grade={studentGrade} onSubjectSelect={(u: Unit) => router.push(`/student/units/${u.id}`)} />;
        }
        if (path.includes('/units/')) return <UnitRoute grade={studentGrade} user={user} onNavigate={handleNavClick} onPlayLesson={handleLessonSelect} isDataSaverEnabled={isDataSaverEnabled} />;
        if (path.includes('/lessons/')) return <LessonRoute grade={studentGrade} onNavigate={handleNavClick} />;
        if (path.includes('/player/')) return <PlayerRoute grade={studentGrade} user={user} isDataSaverEnabled={isDataSaverEnabled} addToast={addToast} />;

        if (path.includes('/teachers')) return <TeachersView onSelectTeacher={(t: Teacher) => handleHomeNavigation('teacherProfile', { teacher: t })} />;
        if (path.includes('/teacher/')) return <TeacherProfileWrapper user={user!} onNavigateToCourse={(u: Unit) => router.push(`/student/units/${u.id}`)} onBack={() => router.push('/student/teachers')} />;
        if (path.includes('/special-teacher/')) return <SpecialTeacherProfileWrapper user={user!} onPlay={(lesson: Lesson, unit: Unit) => { router.push(`/student/player/${lesson.id}`); }} onBack={() => router.push('/student/teachers')} />;

        if (path.includes('/profile')) return <Profile onNavigate={handleNavClick} isDataSaverEnabled={isDataSaverEnabled} onDataSaverToggle={setIsDataSaverEnabled} />;
        if (path.includes('/courses')) return <CoursesStore onNavigate={handleHomeNavigation} />;
        if (path.includes('/course/')) return <CourseDetailWrapper onBack={() => router.push('/student/courses')} isDataSaverEnabled={isDataSaverEnabled} />;

        if (path.includes('/subscription/single')) return <SingleSubjectSubscription onBack={() => router.push('/student/subscription')} />;
        if (path.includes('/subscription/comprehensive')) return <ComprehensiveSubscription onBack={() => router.push('/student/subscription')} />;
        if (path.includes('/subscription')) return <SubscriptionView onNavigate={handleNavClick} />;

        if (path.includes('/results')) return <ResultsView />;
        if (path.includes('/chatbot')) return <ChatbotView onNavigate={handleNavClick} />;
        if (path.includes('/movies')) return <CartoonMoviesWrapper onBack={() => router.push('/student/home')} />;
        if (path.includes('/smart-plan')) return <SmartPlanView />;
        if (path.includes('/question-bank')) return <QuestionBankView />;
        if (path.includes('/ask-teacher')) return <AskTeacherView />;
        if (path.includes('/reels')) return <ReelsView onBack={() => router.push('/student/home')} />;

        if (path.includes('/ai-learning/')) return <AiLearningWrapper onNavigate={handleNavClick} onBack={() => router.push('/student/home')} />;
        if (path.includes('/ai-learning')) return <StudentHomeScreen user={user!} onNavigate={handleHomeNavigation} />;

        // Default to home
        return <StudentHomeScreen user={user!} onNavigate={handleHomeNavigation} />;
    };

    return (
        <StudentLayout activeView={activeView} onNavClick={handleNavClick} gradeName={studentGrade?.name}>
            <Suspense fallback={<div className="flex justify-center items-center h-[calc(100vh-200px)]"><Loader /></div>}>
                {renderContent()}
            </Suspense>
        </StudentLayout>
    );
};

export default StudentDashboard;