
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Course, CourseVideo, Teacher, ToastType } from '../../types';
import { supabase } from '../../services/storageService';
import { getAllTeachers } from '../../services/teacherService';
import { PlayIcon, LockClosedIcon, ShieldExclamationIcon, VideoCameraIcon, ArrowRightIcon, UserCircleIcon, BookOpenIcon } from '../common/Icons';
import Loader from '../common/Loader';
import CustomYouTubePlayer from '../curriculum/CustomYouTubePlayer';
import { useToast } from '../../useToast';
import { useIcons } from '../../IconContext';

interface PublicCourseViewProps {
    courseId?: string;
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

const getDirectDownloadUrl = (url: string | undefined): string | undefined => {
    if (!url || url.trim() === '') return undefined;
    if (url.includes('drive.google.com')) {
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        const idMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
        const id = (match && match[1]) || (idMatch && idMatch[1]);
        if (id) {
            return `https://drive.google.com/uc?export=download&id=${id}`;
        }
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `https://${url}`;
    }
    return url;
};

const PublicCourseView: React.FC<PublicCourseViewProps> = ({ courseId: propCourseId }) => {
    const { courseId: paramCourseId } = useParams();
    const courseId = propCourseId || paramCourseId;

    const [course, setCourse] = useState<Course | null>(null);
    const [teacher, setTeacher] = useState<Teacher | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [playingVideo, setPlayingVideo] = useState<CourseVideo | null>(null);
    const { addToast } = useToast();
    const icons = useIcons();

    useEffect(() => {
        if (!courseId) {
            setIsLoading(false);
            return;
        }

        const fetchCourse = async () => {
            setIsLoading(true);
            // Fetch specific course data, bypassing standard bulk fetching to be efficient
            const { data: courseData, error } = await supabase
                .from('courses')
                .select('*, course_videos(*)')
                .eq('id', courseId)
                .single();

            if (error || !courseData) {
                console.error("Error fetching shared course:", error);
                addToast("لم يتم العثور على الكورس أو الرابط غير صالح.", ToastType.ERROR);
                setIsLoading(false);
                return;
            }

            // Map to Course type
            const mappedCourse: Course = {
                id: courseData.id,
                title: courseData.title,
                description: courseData.description,
                teacherId: courseData.teacher_id,
                coverImage: courseData.cover_image,
                price: courseData.price,
                isFree: true, // Force free in public view as requested
                pdfUrl: courseData.pdf_url,
                videos: (courseData.course_videos || []).map((v: any) => ({
                    id: v.id,
                    title: v.title,
                    videoUrl: v.video_url,
                    isFree: true // Force free in public view
                }))
            };

            setCourse(mappedCourse);

            // Fetch Teacher
            const teachers = await getAllTeachers();
            const courseTeacher = teachers.find(t => t.id === mappedCourse.teacherId);
            setTeacher(courseTeacher || null);

            setIsLoading(false);
        };

        fetchCourse();
    }, [courseId, addToast]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center">
                <img src={icons.mainLogoUrl} alt="Logo" className="w-32 h-32 object-contain mb-6 animate-pulse" />
                <Loader />
            </div>
        );
    }

    if (!course || !courseId) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center text-center p-6">
                <div className="bg-[var(--bg-secondary)] p-8 rounded-3xl shadow-xl border border-[var(--border-primary)]">
                    <ShieldExclamationIcon className="w-20 h-20 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">الكورس غير موجود</h2>
                    <p className="text-[var(--text-secondary)] mt-2">رابط الكورس الذي تحاول الوصول إليه غير صالح أو تم حذفه.</p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="mt-6 px-6 py-3 bg-[var(--accent-primary)] text-white rounded-xl font-bold"
                    >
                        العودة للرئيسية
                    </button>
                </div>
            </div>
        );
    }

    const videoId = playingVideo?.videoUrl ? parseYouTubeVideoId(playingVideo.videoUrl) : null;
    const pdfDownloadUrl = getDirectDownloadUrl(course.pdfUrl);

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">

            {/* Header */}
            <header className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] py-4 px-6 sticky top-0 z-50 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <img src={icons.mainLogoUrl} alt="Logo" className="w-10 h-10 object-contain" />
                    <div className="hidden sm:block">
                        <h1 className="font-bold text-lg text-[var(--text-primary)]">Gstudent Platform</h1>
                        <p className="text-sm text-[var(--text-secondary)]">مشاهدة مجانية</p>
                    </div>
                </div>
                <button
                    onClick={() => window.location.href = window.location.origin}
                    className="px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                >
                    <span>دخول المنصة</span>
                    <ArrowRightIcon className="w-4 h-4 rotate-180" />
                </button>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-6xl">

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
                                    onLessonComplete={() => { }}
                                    isDataSaverEnabled={false}
                                    showWatermark={false}
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
                            <p className="text-[var(--text-secondary)] text-sm">أنت تشاهد نسخة مجانية من هذا الدرس.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
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

                                {teacher && (
                                    <div className="flex items-center justify-center gap-3 bg-[var(--bg-tertiary)] p-3 rounded-xl">
                                        <img src={teacher.imageUrl || 'https://via.placeholder.com/150'} alt={teacher.name} className="w-10 h-10 rounded-full object-cover" />
                                        <div className="text-right">
                                            <p className="text-sm text-[var(--text-secondary)]">مقدم الكورس</p>
                                            <p className="text-sm font-bold text-[var(--text-primary)]">{teacher.name}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {pdfDownloadUrl && (
                                <a
                                    href={pdfDownloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    referrerPolicy="no-referrer"
                                    className="block text-center p-4 rounded-xl bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-secondary)] transition-colors font-bold shadow-lg transform active:scale-95"
                                >
                                    <BookOpenIcon className="w-5 h-5 inline-block ml-2" />
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

                            {course.videos.map((video, index) => (
                                <button
                                    key={video.id}
                                    onClick={() => setPlayingVideo(video)}
                                    className="w-full bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)] p-4 rounded-xl flex items-center justify-between group transition-all duration-300 hover:shadow-md hover:translate-x-1"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] group-hover:bg-[var(--accent-primary)] group-hover:text-white flex items-center justify-center text-[var(--text-secondary)] font-bold transition-colors shadow-inner">
                                            {index + 1}
                                        </div>
                                        <div className="text-right">
                                            <h3 className="font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">{video.title}</h3>
                                            <p className="text-sm text-[var(--text-secondary)] mt-0.5">مشاهدة مجانية</p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full border-2 border-[var(--border-primary)] flex items-center justify-center group-hover:border-[var(--accent-primary)]">
                                        <PlayIcon className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] ml-0.5" />
                                    </div>
                                </button>
                            ))}

                            {course.videos.length === 0 && (
                                <div className="text-center py-12 bg-[var(--bg-secondary)] rounded-2xl border-2 border-dashed border-[var(--border-primary)]">
                                    <p className="text-[var(--text-secondary)]">لا توجد فيديوهات متاحة في هذا الكورس حالياً.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PublicCourseView;
