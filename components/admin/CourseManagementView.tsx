
import React, { useState, useEffect, useMemo, useCallback, useContext, memo } from 'react';
import { Course, Teacher, ToastType } from '../../types';
import { getAllCourses, deleteCourse } from '../../services/storageService';
import { getAllTeachers } from '../../services/teacherService';
import { useToast } from '../../useToast';
import { PlusIcon, PencilIcon, TrashIcon, BookOpenIcon, ShareIcon, UserCircleIcon, CheckCircleIcon } from '../common/Icons';
import Loader from '../common/Loader';
import CourseModal from './CourseModal';
import Modal from '../common/Modal';
import { AppLifecycleContext } from '../../AppContext';

// Memoized CourseCard
const CourseCard = memo(({ course, teacher, onEdit, onDelete, onShare }: { course: Course; teacher?: Teacher; onEdit: () => void; onDelete: () => void; onShare: () => void; }) => (
    <div className="bg-[var(--bg-secondary)] rounded-[2.5rem] shadow-sm border border-[var(--border-primary)] flex flex-col overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative isolate">
        <div className="h-56 overflow-hidden relative">
            <img
                src={course.coverImage}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80"></div>

            <div className="absolute top-5 right-5 px-4 py-2 text-xs font-black rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 border border-indigo-500/20">
                {course.isFree ? 'إصدار مجاني' : `${course.price} ج.م`}
            </div>

            {course.videos?.length && (
                <div className="absolute bottom-5 right-5 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-xl text-white/90 text-[10px] font-black border border-white/10">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    {course.videos.length} فيديو تعليمي
                </div>
            )}
        </div>

        <div className="p-6 flex flex-col flex-grow relative">
            {/* Teacher Badge Overlap */}
            <div className="absolute -top-10 left-6 flex items-center gap-3 bg-[var(--bg-secondary)] pr-4 pl-1.5 py-1.5 rounded-2xl border border-[var(--border-primary)] shadow-2xl group-hover:border-indigo-500/30 transition-colors">
                <span className="text-xs font-black text-[var(--text-primary)]">{teacher?.name || 'مدرس المنصة'}</span>
                <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[var(--bg-tertiary)] bg-[var(--bg-tertiary)] shadow-inner">
                    {teacher?.imageUrl ? <img src={teacher.imageUrl} className="w-full h-full object-cover" /> : <UserCircleIcon className="w-full h-full text-[var(--text-secondary)] scale-75" />}
                </div>
            </div>

            <div className="mt-6 mb-4">
                <h3 className="font-black text-xl text-[var(--text-primary)] leading-tight line-clamp-2 h-14" title={course.title}>{course.title}</h3>
                <div className="flex items-center gap-2 mt-2 opacity-50">
                    <BookOpenIcon className="w-4 h-4" />
                    <span className="text-xs font-bold text-[var(--text-secondary)]">إدارة المحتوى التعليمي</span>
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-auto pt-5 border-t border-[var(--border-primary)]">
                <button onClick={onShare} className="w-11 h-11 flex items-center justify-center text-blue-500 hover:text-white bg-blue-500/10 hover:bg-blue-600 rounded-2xl transition-all active:scale-95 shadow-sm" title="مشاركة">
                    <ShareIcon className="w-5 h-5" />
                </button>
                <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-2 px-4 h-11 bg-indigo-600/10 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-2xl font-black text-xs transition-all active:scale-95 border border-indigo-500/10" title="تعديل">
                    <PencilIcon className="w-4 h-4" />
                    <span>تعديل</span>
                </button>
                <button onClick={onDelete} className="w-11 h-11 flex items-center justify-center text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-600 rounded-2xl transition-all active:scale-95 shadow-sm" title="حذف">
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
));



const CourseManagementView: React.FC = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);

    const { addToast } = useToast();
    const { setRefreshPaused } = useContext(AppLifecycleContext);

    const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const [courseData, teacherData] = await Promise.all([getAllCourses(), getAllTeachers()]);
        setCourses(courseData);
        setTeachers(teacherData);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = () => {
        setRefreshPaused(true);
        setEditingCourse(null);
        setIsModalOpen(true);
    };

    const handleEdit = (course: Course) => {
        setRefreshPaused(true);
        setEditingCourse(course);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setRefreshPaused(false);
        setIsModalOpen(false);
    }

    const handleDelete = async () => {
        if (!deletingCourse) return;
        const { error } = await deleteCourse(deletingCourse.id);
        if (error) {
            addToast(`فشل حذف الكورس: ${error.message}`, ToastType.ERROR);
        } else {
            addToast('تم حذف الكورس بنجاح.', ToastType.SUCCESS);
            fetchData();
        }
        setDeletingCourse(null);
    };

    const handleShare = (course: Course) => {
        const shareLink = `${window.location.origin}/?courseShareId=${course.id}`;
        navigator.clipboard.writeText(shareLink).then(() => {
            addToast('تم نسخ رابط الكورس المجاني للحافظة!', ToastType.SUCCESS);
        }).catch(() => {
            addToast('فشل نسخ الرابط.', ToastType.ERROR);
        });
    };

    return (
        <div className="fade-in space-y-8 pb-20">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6 bg-[var(--bg-secondary)] p-8 rounded-[3rem] border border-[var(--border-primary)] shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-primary)]">إدارة الكورسات</h1>
                    <p className="text-[var(--text-secondary)] mt-2 font-bold text-sm">إنشاء وتعيين الكورسات للمدرسين بشكل مباشر.</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center justify-center gap-3 px-8 py-4 font-black bg-indigo-600 hover:bg-indigo-700 rounded-2xl text-white transition-all shadow-xl shadow-indigo-500/20 transform hover:scale-105 active:scale-95 text-sm"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>إضافة كورس جديد</span>
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20"><Loader /></div>
            ) : courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {courses.map(course => (
                        <CourseCard
                            key={course.id}
                            course={course}
                            teacher={teacherMap.get(course.teacherId)}
                            onEdit={() => handleEdit(course)}
                            onDelete={() => setDeletingCourse(course)}
                            onShare={() => handleShare(course)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-32 bg-[var(--bg-secondary)] rounded-[3rem] border-2 border-[var(--border-primary)] shadow-sm">
                    <BookOpenIcon className="w-20 h-20 mx-auto text-[var(--text-secondary)] mb-6 opacity-50" />
                    <h3 className="font-black text-xl text-[var(--text-primary)]">المكتبة فارغة</h3>
                    <p className="text-sm font-bold text-[var(--text-secondary)] mt-2">لم يتم إضافة أي كورسات للمنصة بعد.</p>
                    <button onClick={handleAdd} className="mt-6 text-indigo-500 font-bold hover:underline">إضافة أول كورس</button>
                </div>
            )}

            {isModalOpen && (
                <CourseModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={() => { handleCloseModal(); fetchData(); }}
                    course={editingCourse}
                    teachers={teachers}
                />
            )}

            {deletingCourse && (
                <Modal isOpen={true} onClose={() => setDeletingCourse(null)} title="تأكيد الحذف">
                    <div className="text-center p-4">
                        <TrashIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <p className="text-[var(--text-primary)] font-bold text-lg mb-2">حذف الكورس نهائياً؟</p>
                        <p className="text-[var(--text-secondary)] text-sm mb-6">هل أنت متأكد من حذف كورس <span className="text-red-500 font-black">"{deletingCourse.title}"</span>؟</p>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setDeletingCourse(null)} className="px-6 py-3 rounded-xl bg-[var(--bg-tertiary)] font-bold text-[var(--text-secondary)] hover:bg-[var(--border-primary)] transition-colors">إلغاء</button>
                            <button onClick={handleDelete} className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-white transition-colors shadow-lg">نعم، حذف</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default CourseManagementView;
