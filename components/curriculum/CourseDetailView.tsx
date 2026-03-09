
import React, { useState, useEffect, useMemo } from 'react';
import { Course, CourseVideo, Teacher, ToastType } from '../../types';
import { checkCoursePurchase, purchaseCourse } from '../../services/storageService';
import { getAllTeachers } from '../../services/teacherService';
import { ArrowRightIcon, BookOpenIcon, LockClosedIcon, PlayIcon, ShieldExclamationIcon, UserCircleIcon, VideoCameraIcon } from '../common/Icons';
import Loader from '../common/Loader';
import CustomYouTubePlayer from './CustomYouTubePlayer';
import { useSession } from '../../hooks/useSession';
import { useToast } from '../../useToast';

interface CourseDetailViewProps {
  course: Course;
  onBack: () => void;
  isDataSaverEnabled: boolean;
}

const parseYouTubeVideoId = (url: any): string | null => {
    if (typeof url !== 'string' || !url) return null;
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    if (match) {
        return match[1];
    }
    if (url.length === 11 && /^[a-zA-Z0-9_-]+$/.test(url)) {
        return url;
    }
    return null;
};

const CourseDetailView: React.FC<CourseDetailViewProps> = ({ course, onBack, isDataSaverEnabled }) => {
    const { currentUser: user } = useSession();
    const { addToast } = useToast();
    const [teacher, setTeacher] = useState<Teacher | null>(null);
    const [isPurchased, setIsPurchased] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [playingVideo, setPlayingVideo] = useState<CourseVideo | null>(null);
    const [isPurchasing, setIsPurchasing] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            const teachers = await getAllTeachers();
            const foundTeacher = teachers.find(t => t.id === course.teacherId);
            setTeacher(foundTeacher || null);

            if (user) {
                const purchased = await checkCoursePurchase(user.id, course.id);
                setIsPurchased(purchased);
            }
            setIsLoading(false);
        };
        loadData();
    }, [course, user]);

    const handlePurchase = async () => {
        if (!user) return;
        setIsPurchasing(true);
        // Simulate purchase for now or integrate with real payment
        // For this demo, we'll just add it to purchased
        await purchaseCourse(user.id, course.id);
        setIsPurchased(true);
        addToast('تم شراء الكورس بنجاح!', ToastType.SUCCESS);
        setIsPurchasing(false);
    };
    
    const canWatch = (video: CourseVideo) => {
        return course.isFree || isPurchased || video.isFree;
    };

    if (isLoading) return <div className="flex justify-center items-center h-64"><Loader /></div>;

    const videoId = playingVideo?.videoUrl ? parseYouTubeVideoId(playingVideo.videoUrl) : null;

    return (
        <div className="pb-20 fade-in">
            <button onClick={onBack} className="flex items-center space-x-2 space-x-reverse mb-6 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <ArrowRightIcon className="w-4 h-4" />
                <span>العودة للمتجر</span>
            </button>

            {playingVideo ? (
                <div className="animate-fade-in space-y-6">
                    <button onClick={() => setPlayingVideo(null)} className="flex items-center space-x-2 space-x-reverse text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors w-fit">
                        <ArrowRightIcon className="w-4 h-4" />
                        <span>العودة لمحتوى الكورس</span>
                    </button>
                    
                    <div className="bg-black rounded-2xl overflow-hidden shadow-2xl aspect-video border border-[var(--border-primary)]">
                        {videoId ? (
                            <CustomYouTubePlayer 
                                videoId={videoId} 
                                onLessonComplete={() => {}} 
                                isDataSaverEnabled={isDataSaverEnabled} 
                                // No lessonId passed here as these are course videos, not curriculum lessons
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
                                <ShieldExclamationIcon className="w-16 h-16 text-red-500 mb-4" />
                                <h3 className="text-white font-bold text-xl">فيديو غير متاح</h3>
                                <p className="text-gray-400 mt-2">رابط الفيديو غير صالح.</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl shadow-lg border border-[var(--border-primary)]">
                        <h2 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">{playingVideo.title}</h2>
                        <p className="text-[var(--text-secondary)] text-sm">{canWatch(playingVideo) ? 'مشاهدة ممتعة!' : 'هذا الفيديو مقفول.'}</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Course Info Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl shadow-lg border border-[var(--border-primary)] text-center relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[var(--accent-primary)]/20 to-transparent"></div>
                            <img 
                                src={course.coverImage} 
                                alt={course.title} 
                                className="w-40 h-40 object-cover rounded-xl mx-auto mb-4 border-4 border-[var(--bg-tertiary)] shadow-lg relative z-10 group-hover:scale-105 transition-transform duration-500" 
                            />
                            <h1 className="text-2xl font-black text-[var(--text-primary)] mb-2 leading-tight">{course.title}</h1>
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">{course.description}</p>
                            
                            <div className="flex items-center justify-center gap-3 bg-[var(--bg-tertiary)] p-3 rounded-xl mb-6">
                                <img src={teacher?.imageUrl || 'https://via.placeholder.com/150'} alt={teacher?.name} className="w-10 h-10 rounded-full object-cover" />
                                <div className="text-right">
                                    <p className="text-sm text-[var(--text-secondary)]">مقدم الكورس</p>
                                    <p className="text-sm font-bold text-[var(--text-primary)]">{teacher?.name}</p>
                                </div>
                            </div>

                            {!isPurchased && !course.isFree && (
                                <button 
                                    onClick={handlePurchase} 
                                    disabled={isPurchasing}
                                    className="w-full py-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white rounded-xl font-bold text-lg shadow-lg transform hover:scale-105 transition-all disabled:opacity-70 disabled:transform-none"
                                >
                                    {isPurchasing ? 'جاري الشراء...' : `شراء الكورس (${course.price} ج.م)`}
                                </button>
                            )}
                            {isPurchased && (
                                <div className="w-full py-3 bg-green-500/10 text-green-600 rounded-xl font-bold border border-green-500/20 flex items-center justify-center gap-2">
                                    <LockClosedIcon className="w-5 h-5" />
                                    تم الشراء (مفتوح)
                                </div>
                            )}
                        </div>
                        
                         {course.pdfUrl && (canWatch({isFree: true} as any)) && (
                            <a 
                                href={course.pdfUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="block text-center p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-all font-bold shadow-sm"
                            >
                                <BookOpenIcon className="w-5 h-5 inline-block ml-2 text-[var(--accent-primary)]" />
                                تحميل ملفات الكورس (PDF)
                            </a>
                        )}
                    </div>

                    {/* Content List */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <VideoCameraIcon className="w-6 h-6 text-[var(--accent-primary)]" />
                                محتوى الكورس
                            </h2>
                            <span className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-3 py-1 rounded-full text-sm font-bold">
                                {course.videos.length} فيديو
                            </span>
                        </div>

                        {course.videos.map((video, index) => {
                            const available = canWatch(video);
                            return (
                                <button 
                                    key={video.id} 
                                    onClick={() => available && setPlayingVideo(video)} 
                                    disabled={!available}
                                    className={`w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] p-4 rounded-xl flex items-center justify-between group transition-all duration-300 ${available ? 'hover:shadow-md hover:translate-x-1 cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-inner ${available ? 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] group-hover:bg-[var(--accent-primary)] group-hover:text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>
                                            {index + 1}
                                        </div>
                                        <div className="text-right">
                                            <h3 className={`font-bold transition-colors ${available ? 'text-[var(--text-primary)] group-hover:text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}`}>{video.title}</h3>
                                            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                                                {video.isFree ? 'معاينة مجانية' : 'محمية'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${available ? 'border-[var(--border-primary)] group-hover:border-[var(--accent-primary)]' : 'border-transparent bg-[var(--bg-tertiary)]'}`}>
                                        {available ? <PlayIcon className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] ml-0.5" /> : <LockClosedIcon className="w-4 h-4 text-[var(--text-secondary)]" />}
                                    </div>
                                </button>
                            );
                        })}

                        {course.videos.length === 0 && (
                            <div className="text-center py-12 bg-[var(--bg-secondary)] rounded-2xl border-2 border-dashed border-[var(--border-primary)]">
                                <p className="text-[var(--text-secondary)]">لا توجد فيديوهات متاحة في هذا الكورس حالياً.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseDetailView;
