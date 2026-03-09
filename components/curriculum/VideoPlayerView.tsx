
import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { Lesson, LessonType, Grade, Unit, ToastType, LessonVideo } from '../../types';
import CustomYouTubePlayer from './CustomYouTubePlayer';
import { getLatestQuizAttemptForLesson, markLessonComplete } from '../../services/storageService';
import { useSwipeBack } from '../../hooks/useSwipeBack';
import {
    ArrowRightIcon, ChevronLeftIcon, LockClosedIcon,
    XIcon, CheckCircleIcon, PlaySolidIcon, ListIcon,
    ChevronDownIcon, ArrowLeftIcon, ShieldExclamationIcon,
    ClockIcon, CreditCardIcon
} from '../common/Icons';
import { useSession } from '../../hooks/useSession';
import { useSubscription } from '../../hooks/useSubscription';
import { useToast } from '../../useToast';
import Modal from '../common/Modal';
import QuizTaker from './QuizTaker';
import { AppLifecycleContext } from '../../AppContext';

const parseYouTubeVideoId = (url: any): string | null => {
    if (typeof url !== 'string' || !url) return null;
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

const VideoPlayerView: React.FC<{
    lesson: Lesson; unit: Unit; grade: Grade;
    onBack: () => void;
    onLessonComplete: (lessonId: string) => Promise<void>;
    isDataSaverEnabled: boolean;
    onNextLesson: (lesson: Lesson) => void;
}> = ({ lesson, unit, grade, onBack, onLessonComplete, isDataSaverEnabled, onNextLesson }) => {
    const { currentUser: user } = useSession();
    const { activeSubscriptions, isComprehensive } = useSubscription();
    const { addToast } = useToast();
    const { setRefreshPaused } = useContext(AppLifecycleContext);

    const [isQuizCompleted, setIsQuizCompleted] = useState(false);
    const [isGatekeeperModalOpen, setIsGatekeeperModalOpen] = useState(false);
    const [showPlaylist, setShowPlaylist] = useState(true);

    useSwipeBack(onBack);

    // Stop global auto-refresh while video player is active
    useEffect(() => {
        setRefreshPaused(true);
        return () => setRefreshPaused(false);
    }, [setRefreshPaused]);

    // Playlist State
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

    const playlist = useMemo(() => {
        const explanations = unit.lessons.filter(l => l.type === LessonType.EXPLANATION);
        return explanations.sort((a, b) => a.title.localeCompare(b.title, 'ar-EG', { numeric: true }));
    }, [unit]);

    const currentIndex = playlist.findIndex(l => l.id === lesson.id);
    const nextLesson = currentIndex < playlist.length - 1 ? playlist[currentIndex + 1] : null;

    // --- SECURITY CHECK ---
    const canAccess = useMemo(() => {
        if (lesson.isFree) return true;
        if (isComprehensive) return true;
        // Check if user has a subscription for this specific teacher
        return activeSubscriptions.some(sub => sub.teacherId === unit.teacherId);
    }, [lesson.isFree, isComprehensive, activeSubscriptions, unit.teacherId]);

    useEffect(() => {
        const check = async () => {
            if (!user) return;
            const attempt = await getLatestQuizAttemptForLesson(user.id, lesson.id);
            setIsQuizCompleted(!!attempt && attempt.score >= (lesson.passingScore || 50));
        };
        check();
    }, [user, lesson.id, lesson.passingScore]);

    // Handle Videos List
    const videos: LessonVideo[] = useMemo(() => {
        if (lesson.videos && lesson.videos.length > 0) return lesson.videos;
        if (lesson.content) return [{ title: lesson.title, url: lesson.content }];
        return [];
    }, [lesson]);

    const currentVideo = videos[currentVideoIndex];
    const videoId = currentVideo ? parseYouTubeVideoId(currentVideo.url) : null;

    const handleVideoEnd = () => {
        if (currentVideoIndex < videos.length - 1) {
            setCurrentVideoIndex(prev => prev + 1);
            addToast(`انتقال للجزء ${currentVideoIndex + 2}`, ToastType.INFO);
        } else {
            onLessonComplete(lesson.id);
            if (nextLesson && isQuizCompleted) {
                // Option for auto-play could go here
            }
        }
    };

    // --- SECURITY RENDER ---
    if (!canAccess) {
        return (
            <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-fade-in text-white font-tajawal">
                <div className="bg-[#1a1a1a] p-8 rounded-[3rem] border border-red-500/20 shadow-2xl max-w-md text-center mx-4">
                    <div className="w-20 h-20 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <LockClosedIcon className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black mb-3">محتوى حصري</h2>
                    <p className="text-gray-400 font-medium mb-8 text-sm leading-relaxed">
                        عفواً، هذه الحصة متاحة فقط للمشتركين. يرجى تفعيل اشتراكك لمتابعة المشاهدة.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button onClick={onBack} className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm hover:bg-gray-200 transition-all">
                            العودة للقائمة
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in overflow-hidden font-tajawal">

            {/* Matte Cinema Header */}
            <div className="flex items-center justify-between p-4 md:p-6 bg-gradient-to-b from-black/90 to-transparent z-50">
                <div className="flex items-center gap-5">
                    <button onClick={onBack} className="p-3.5 rounded-2xl bg-white/10 text-white hover:bg-red-600 transition-all active:scale-90 group backdrop-blur-xl border border-white/10">
                        <ArrowRightIcon className="w-6 h-6 transition-transform group-hover:translate-x-1" />
                    </button>
                    <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-red-600 text-white text-[8px] font-black uppercase rounded shadow-lg">Premium Video</span>
                            <span className="text-white/30 text-sm font-black uppercase tracking-widest">{unit.title}</span>
                        </div>
                        <h2 className="text-white font-black text-base md:text-xl truncate max-w-[200px] sm:max-w-xl drop-shadow-xl">{lesson.title}</h2>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowPlaylist(!showPlaylist)}
                        className={`hidden md:flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all border font-black text-sm ${showPlaylist ? 'bg-white text-black border-white' : 'bg-white/5 text-white/60 border-white/10'}`}
                    >
                        <ListIcon className="w-4 h-4" />
                        قائمة الأجزاء
                    </button>
                    <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
                        <CheckCircleIcon className={`w-5 h-5 ${isQuizCompleted ? 'text-emerald-500' : 'text-gray-600'}`} />
                        <span className="text-white/80 text-sm font-black uppercase hidden sm:inline">{isQuizCompleted ? 'تم اجتياز التحدي' : 'قيد الدراسة'}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 relative flex flex-col md:flex-row bg-black">
                {/* Main Content Area */}
                <div className={`flex-1 relative transition-all duration-700 ease-in-out ${showPlaylist && videos.length > 1 ? 'md:mr-0' : ''}`}>
                    <div className="w-full h-full">
                        {videoId ? (
                            <CustomYouTubePlayer
                                videoId={videoId}
                                onLessonComplete={handleVideoEnd}
                                isDataSaverEnabled={isDataSaverEnabled}
                                lessonId={lesson.id}
                                showWatermark={true}
                            />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-white/20 p-10 text-center">
                                <ShieldExclamationIcon className="w-20 h-20 mb-6 opacity-10" />
                                <p className="text-xl font-black italic">Video Content Not Available</p>
                            </div>
                        )}
                    </div>

                    {/* Mobile Playlist Toggle Overlay */}
                    {videos.length > 1 && (
                        <button
                            onClick={() => setShowPlaylist(!showPlaylist)}
                            className="md:hidden absolute bottom-24 right-6 z-50 w-12 h-12 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90"
                        >
                            <ListIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>

                {/* Cinema Playlist Sidebar (Glass) */}
                {videos.length > 1 && showPlaylist && (
                    <div className="w-full md:w-[380px] bg-[#0a0a0a] md:bg-transparent md:backdrop-blur-3xl border-t md:border-t-0 md:border-r border-white/5 overflow-hidden flex flex-col z-40 transition-all duration-500 animate-slide-in-right">
                        <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-white font-black text-lg tracking-tight">محتوى الحصة</h3>
                                <p className="text-gray-500 text-sm font-black uppercase tracking-widest mt-1">Playlist • {videos.length} Parts</p>
                            </div>
                            <button onClick={() => setShowPlaylist(false)} className="p-2 text-white/30 hover:text-white transition-colors hidden md:block">
                                <ArrowLeftIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                            {videos.map((v, idx) => {
                                const isActive = currentVideoIndex === idx;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentVideoIndex(idx)}
                                        className={`w-full p-4 rounded-3xl text-right flex items-center gap-4 transition-all duration-300 group ${isActive ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-900/40' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 transition-all ${isActive ? 'bg-white/20' : 'bg-black/40 border border-white/10 group-hover:scale-110'}`}>
                                            {isActive ? <PlaySolidIcon className="w-4 h-4 ml-0.5" /> : (idx + 1)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-black text-sm truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>{v.title || `الجزء رقم ${idx + 1}`}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <ClockIcon className="w-3 h-3 opacity-70" />
                                                <span className="text-sm font-bold opacity-60 uppercase tracking-tighter">HD Content</span>
                                            </div>
                                        </div>
                                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Smart Transition Footer */}
            {nextLesson && (
                <div className="p-5 md:p-8 bg-black/95 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6 z-50">
                    <div className="text-center sm:text-right flex-1 min-w-0">
                        <div className="flex items-center justify-center sm:justify-start gap-3 mb-1.5 opacity-70">
                            <div className="w-8 h-0.5 bg-indigo-500 rounded-full"></div>
                            <p className="text-sm font-black uppercase tracking-[0.3em] text-white">المحاضرة التالية</p>
                        </div>
                        <h4 className="text-white font-black text-lg md:text-2xl truncate tracking-tight">{nextLesson.title}</h4>
                    </div>

                    <button
                        onClick={() => !isQuizCompleted ? setIsGatekeeperModalOpen(true) : onNextLesson(nextLesson)}
                        className={`group px-10 py-4 rounded-[1.5rem] font-black text-sm transition-all duration-500 flex items-center justify-center gap-4 shadow-2xl relative overflow-hidden active:scale-95 ${isQuizCompleted ? 'bg-indigo-600 text-white shadow-indigo-900/40 border-b-4 border-indigo-800' : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10'}`}
                    >
                        <span>{isQuizCompleted ? 'تشغيل الحصة التالية' : 'الحصة التالية مقفولة'}</span>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isQuizCompleted ? 'bg-white/20 group-hover:rotate-12' : 'bg-white/5'}`}>
                            {isQuizCompleted ? <ChevronLeftIcon className="w-5 h-5" /> : <LockClosedIcon className="w-5 h-5" />}
                        </div>
                    </button>
                </div>
            )}

            {/* Locked Content Modal */}
            <Modal isOpen={isGatekeeperModalOpen} onClose={() => setIsGatekeeperModalOpen(false)} title="تحدي الاستيعاب المطلوب" maxWidth="max-w-xl">
                <div className="text-center p-2">
                    <div className="w-24 h-24 bg-rose-500/10 rounded-[2.5rem] border-2 border-dashed border-rose-500/20 flex items-center justify-center mx-auto mb-8 text-rose-500 animate-pulse">
                        <LockClosedIcon className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black mb-4">التالي مقيد باجتياز الاختبار</h3>
                    <p className="text-sm font-bold text-[var(--text-secondary)] mb-10 leading-relaxed max-w-sm mx-auto">
                        لضمان جودة تحصيلك الدراسي، يرجى إنهاء اختبار الدرس الحالي بنسبة <strong>{lesson.passingScore || 50}%</strong> أو أكثر قبل الانتقال للمحاضرة التالية.
                    </p>
                    <div className="bg-[var(--bg-tertiary)] rounded-3xl p-2">
                        <QuizTaker lesson={lesson} onComplete={async (id) => { setIsQuizCompleted(true); setIsGatekeeperModalOpen(false); addToast("رائع! تم فتح المحتوى التالي بنجاح.", ToastType.SUCCESS); }} />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default VideoPlayerView;
