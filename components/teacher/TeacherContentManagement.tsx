'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef, useContext, memo } from 'react';
import { Grade, Semester, Unit, Lesson, LessonType, ToastType, Teacher, QuizType, QuizQuestion, LessonVideo } from '../../types';
import {
    getAllGrades, addLessonToUnit, updateLesson, deleteLesson,
    addUnitToSemester, updateUnit, deleteUnit, getUnitsForSemester,
    getLessonsByUnit
} from '../../services/storageService';
import Modal from '../common/Modal';
import {
    PlusIcon, PencilIcon, TrashIcon, DotsVerticalIcon, BookOpenIcon,
    VideoCameraIcon, DocumentTextIcon, ChevronDownIcon, SparklesIcon,
    XIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon, PlayIcon, LockClosedIcon,
    ClipboardIcon, UserCircleIcon
} from '../common/Icons';
import { useToast } from '../../useToast';
import ImageUpload from '../common/ImageUpload';
import { generateQuiz, generateVideoQuestions } from '../../services/geminiService';
import Loader from '../common/Loader';
import { AppLifecycleContext } from '../../AppContext';
import { useSession } from '../../hooks/useSession';
import { Role } from '../../types';

interface TeacherContentManagementProps {
    teacher: Teacher;
    isReadOnly: boolean;
}

// --- Icons Helper ---
const getLessonIcon = (type: LessonType) => {
    switch (type) {
        case LessonType.EXPLANATION: return VideoCameraIcon;
        case LessonType.HOMEWORK: return PencilIcon;
        case LessonType.EXAM: return BookOpenIcon;
        case LessonType.SUMMARY: return DocumentTextIcon;
        default: return BookOpenIcon;
    }
}

const ConfirmationModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; }> = ({ isOpen, onClose, onConfirm, title, message }) => (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
        <div className="text-center p-4">
            <TrashIcon className="w-16 h-16 text-red-500 mx-auto mb-4 opacity-80" />
            <p className="text-[var(--text-secondary)] mb-6 font-bold">{message}</p>
            <div className="flex justify-center gap-3">
                <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-[var(--bg-tertiary)] font-bold text-[var(--text-secondary)] hover:bg-[var(--border-primary)] transition-colors">إلغاء</button>
                <button onClick={onConfirm} className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 transition-colors text-white font-bold shadow-lg shadow-red-500/20">تأكيد الحذف</button>
            </div>
        </div>
    </Modal>
);

const UnitModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (data: Partial<Unit>) => void; unit: Unit | null; selectedGrade: Grade | null | undefined }> = ({ isOpen, onClose, onSave, unit, selectedGrade }) => {
    const [formData, setFormData] = useState<{ title: string, track: Unit['track'] }>({ title: '', track: 'All' });
    useEffect(() => {
        if (isOpen) {
            setFormData({
                title: unit?.title || '',
                track: unit?.track || 'All'
            });
        }
    }, [unit, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.title.trim()) {
            onSave(formData);
        }
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={unit ? 'تعديل الوحدة' : 'إضافة وحدة جديدة'}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">عنوان الوحدة</label>
                    <input type="text" placeholder="مثال: الوحدة الأولى - الميكانيكا" value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} className="w-full p-4 rounded-2xl bg-[var(--bg-tertiary)] border-2 border-transparent focus:border-[var(--accent-primary)] outline-none font-bold text-[var(--text-primary)] transition-all" required />
                </div>
                {selectedGrade?.level === 'Secondary' && (
                    <div>
                        <label className="block text-sm font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">المسار (للمرحلة الثانوية)</label>
                        <select value={formData.track} onChange={(e) => setFormData(p => ({ ...p, track: e.target.value as Unit['track'] }))} className="w-full p-4 rounded-2xl bg-[var(--bg-tertiary)] border-2 border-transparent focus:border-[var(--accent-primary)] outline-none font-bold text-[var(--text-primary)]">
                            <option value="All">عام (الكل)</option>
                            <option value="Scientific">علمي</option>
                            <option value="Literary">أدبي</option>
                        </select>
                    </div>
                )}
                <div className="flex justify-end mt-4">
                    <button type="submit" className="px-8 py-3 text-sm font-black text-white bg-[var(--accent-primary)] rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 active:scale-95">حفظ البيانات</button>
                </div>
            </form>
        </Modal>
    );
};

const LessonModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (data: Lesson | Omit<Lesson, 'id'>) => void; lesson: Partial<Lesson> | null; gradeName: string }> = ({ isOpen, onClose, onSave, lesson, gradeName }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState<Partial<Lesson>>({});
    const [quizEditorMode, setQuizEditorMode] = useState<'image' | 'mcq'>('image');
    const [aiSettings, setAiSettings] = useState({ topic: '', difficulty: 'متوسط' as 'سهل' | 'متوسط' | 'صعب', numQuestions: 5 });
    const [isGenerating, setIsGenerating] = useState(false);
    const [isVideoGenerating, setIsVideoGenerating] = useState(false);

    // Video List State
    const [videoList, setVideoList] = useState<LessonVideo[]>([]);

    useEffect(() => {
        if (isOpen) {
            const initialData = lesson ? { ...lesson } : { type: LessonType.EXPLANATION, correctAnswers: [], isFree: false, videoQuestions: [], videos: [] };
            if (!initialData.type) initialData.type = LessonType.EXPLANATION;
            initialData.isFree = !!initialData.isFree;
            setFormData(initialData);
            setQuizEditorMode(initialData.quizType === QuizType.MCQ ? 'mcq' : 'image');

            // Initialize video list
            if (initialData.videos && initialData.videos.length > 0) {
                setVideoList(initialData.videos);
            } else if (initialData.content && initialData.type === LessonType.EXPLANATION) {
                // Backwards compatibility: If content exists but no videos array, create one from content
                setVideoList([{ title: 'الجزء الرئيسي', url: initialData.content }]);
            } else {
                setVideoList([]);
            }
        }
    }, [lesson, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const isNumber = e.target.type === 'number';
        setFormData(prev => ({ ...prev, [name]: isNumber ? Number(value) : value }));
    };

    // Video Management
    const handleAddVideo = () => {
        setVideoList(prev => [...prev, { title: '', url: '' }]);
    };

    const handleVideoChange = (index: number, field: 'title' | 'url', value: string) => {
        const updatedList = [...videoList];
        updatedList[index] = { ...updatedList[index], [field]: value };
        setVideoList(updatedList);
    };

    const handleRemoveVideo = (index: number) => {
        const updatedList = [...videoList];
        updatedList.splice(index, 1);
        setVideoList(updatedList);
    };


    const handleGenerateQuestions = async () => {
        const topicToUse = aiSettings.topic.trim() || formData.title || "";
        if (!topicToUse) {
            addToast('الرجاء إدخال موضوع الأسئلة أو عنوان الدرس.', ToastType.ERROR);
            return;
        }
        setIsGenerating(true);
        try {
            const questions = await generateQuiz(topicToUse, gradeName, aiSettings.difficulty, aiSettings.numQuestions);
            setFormData(prev => ({ ...prev, questions, quizType: QuizType.MCQ }));
            addToast(`تم توليد ${questions.length} أسئلة بنجاح بناءً على مستوى ${gradeName}.`, ToastType.SUCCESS);
        } catch (error: any) {
            addToast(error.message, ToastType.ERROR);
        } finally {
            setIsGenerating(false);
        }
    };
    const handleGenerateVideoQuestions = async () => {
        if (!formData.description?.trim()) {
            addToast('الرجاء إدخال وصف الدرس أولاً لتوليد الأسئلة.', ToastType.ERROR);
            return;
        }
        setIsVideoGenerating(true);
        try {
            const questions = await generateVideoQuestions(formData.description, gradeName, formData.title || 'درس');
            setFormData(prev => ({ ...prev, videoQuestions: questions }));
            addToast(`تم توليد ${questions.length} أسئلة بنجاح بناءً على مستوى ${gradeName}.`, ToastType.SUCCESS);
        } catch (error: any) {
            addToast(error.message, ToastType.ERROR);
        } finally {
            setIsVideoGenerating(false);
        }
    };
    const handleQuestionChange = (qIndex: number, field: keyof QuizQuestion, value: any, optIndex?: number, isVideoQ: boolean = false) => {
        setFormData(prev => {
            const listKey = isVideoQ ? 'videoQuestions' : 'questions';
            if (!prev || !prev[listKey]) return prev;
            const newQuestions = [...(prev[listKey] || [])];
            const questionToUpdate = { ...newQuestions[qIndex] };
            if (field === 'options' && typeof optIndex === 'number' && Array.isArray(questionToUpdate.options)) {
                const newOptions = [...questionToUpdate.options];
                newOptions[optIndex] = value;
                questionToUpdate.options = newOptions;
            } else if (field === 'correctAnswerIndex') {
                questionToUpdate.correctAnswerIndex = Number(value);
            } else if (field === 'questionText' || field === 'imageUrl') {
                questionToUpdate[field] = value;
            }
            newQuestions[qIndex] = questionToUpdate;
            return { ...prev, [listKey]: newQuestions };
        });
    };
    const removeQuestion = (qIndex: number, isVideoQ: boolean = false) => {
        setFormData(prev => {
            const listKey = isVideoQ ? 'videoQuestions' : 'questions';
            return { ...prev, [listKey]: (prev[listKey] || []).filter((_, i) => i !== qIndex) };
        });
    };
    const addBlankQuestion = (isVideoQ: boolean = false) => {
        setFormData(prev => {
            const listKey = isVideoQ ? 'videoQuestions' : 'questions';
            const newQuestion: QuizQuestion = {
                questionText: '',
                options: ['', '', '', ''],
                correctAnswerIndex: 0,
                imageUrl: ''
            };
            return {
                ...prev,
                [listKey]: [...(prev[listKey] || []), newQuestion]
            };
        });
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let contentToSave = formData.content;

        // Handle Videos List
        if (formData.type === LessonType.EXPLANATION) {
            // Basic validation: ensure titles and URLs are present
            if (videoList.length > 0) {
                const validVideos = videoList.filter(v => v.url.trim() !== "");
                if (validVideos.length === 0) {
                    addToast('الرجاء إضافة فيديو واحد على الأقل.', ToastType.ERROR);
                    return;
                }
                // Set main content to first video for backward compatibility
                contentToSave = validVideos[0].url;
            } else {
                // If somehow empty, and no content is set
                if (!contentToSave) {
                    addToast('الرجاء إضافة فيديو الشرح.', ToastType.ERROR);
                    return;
                }
                // If content exists but list empty (shouldn't happen with init logic), sync list
                if (contentToSave && videoList.length === 0) {
                    // Keep content as is
                }
            }
        }

        let dataToSave: Partial<Lesson> = {
            ...formData,
            content: contentToSave,
            videos: videoList.filter(v => v.url.trim() !== ""), // Save the list
            isFree: !!formData.isFree,
            publishedAt: formData.publishedAt !== undefined ? formData.publishedAt : new Date().toISOString()
        };

        if (dataToSave.type === LessonType.HOMEWORK || dataToSave.type === LessonType.EXAM) {
            dataToSave.quizType = quizEditorMode === 'mcq' ? QuizType.MCQ : QuizType.IMAGE;
            if (quizEditorMode === 'image') {
                if (typeof dataToSave.correctAnswers === 'string') {
                    dataToSave.correctAnswers = (dataToSave.correctAnswers as string).split('\n').filter(Boolean);
                }
                dataToSave.questions = undefined;
            } else {
                dataToSave.imageUrl = undefined;
                dataToSave.correctAnswers = undefined;
            }
        } else if (dataToSave.type === LessonType.EXPLANATION) {
            if (!dataToSave.videoQuestions) dataToSave.videoQuestions = [];
        } else {
            // Summary etc
            dataToSave.quizType = undefined;
            dataToSave.questions = undefined;
            dataToSave.imageUrl = undefined;
            dataToSave.correctAnswers = undefined;
            dataToSave.timeLimit = undefined;
            dataToSave.passingScore = undefined;
            dataToSave.videoQuestions = undefined;
        }
        onSave(dataToSave as Lesson | Omit<Lesson, 'id'>);
    };

    const type = formData.type || LessonType.EXPLANATION;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={formData.id ? 'تعديل الدرس' : 'إضافة درس جديد'} maxWidth="max-w-4xl">
            <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto p-2 custom-scrollbar">

                {/* AI Banner */}
                <div className="bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-2xl flex items-center gap-3">
                    <SparklesIcon className="w-5 h-5 text-indigo-500" />
                    <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">يتم تخصيص المحتوى بناءً على مستوى: {gradeName}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">عنوان الدرس</label>
                        <input type="text" placeholder="عنوان الدرس" name="title" value={formData.title || ''} onChange={handleChange} className="w-full p-4 bg-[var(--bg-tertiary)] border-2 border-transparent focus:border-[var(--accent-primary)] rounded-2xl font-bold text-[var(--text-primary)] outline-none transition-all" required />
                    </div>
                    <div>
                        <label className="block text-sm font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">نوع المحتوى</label>
                        <select name="type" value={formData.type} onChange={handleChange} className="w-full p-4 bg-[var(--bg-tertiary)] border-2 border-transparent focus:border-[var(--accent-primary)] rounded-2xl font-bold text-[var(--text-primary)] outline-none transition-all cursor-pointer">
                            {Object.values(LessonType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                <div
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.isFree ? 'border-green-500 bg-green-500/5' : 'border-[var(--border-primary)] bg-[var(--bg-tertiary)]'}`}
                    onClick={() => setFormData(prev => ({ ...prev, isFree: !prev.isFree }))}
                >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${formData.isFree ? 'bg-green-500 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
                        {formData.isFree ? <CheckCircleIcon className="w-6 h-6" /> : <LockClosedIcon className="w-6 h-6" />}
                    </div>
                    <div>
                        <p className={`font-black text-sm ${formData.isFree ? 'text-green-600' : 'text-[var(--text-primary)]'}`}>
                            {formData.isFree ? 'محتوى مجاني (Free Preview)' : 'محتوى مدفوع'}
                        </p>
                        <p className="text-sm font-bold text-[var(--text-secondary)] opacity-70">
                            {formData.isFree ? 'يمكن لجميع الطلاب الوصول لهذا الدرس بدون اشتراك.' : 'يتطلب اشتراكاً فعالاً للوصول.'}
                        </p>
                    </div>
                </div>

                {type === LessonType.EXPLANATION && (
                    <div className="space-y-6 animate-fade-in">

                        {/* Multi-Video Management Section */}
                        <div className="bg-[var(--bg-tertiary)] p-6 rounded-[2rem] border border-[var(--border-primary)]">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-black text-[var(--text-primary)] flex items-center gap-2">
                                    <VideoCameraIcon className="w-5 h-5" /> فيديوهات الشرح
                                </h4>
                                <button
                                    type="button"
                                    onClick={handleAddVideo}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black flex items-center gap-2 hover:bg-indigo-700 transition-all"
                                >
                                    <PlusIcon className="w-4 h-4" /> إضافة فيديو
                                </button>
                            </div>

                            <div className="space-y-3">
                                {videoList.map((video, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row gap-3 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] items-start sm:items-center">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 w-full sm:w-auto space-y-2 sm:space-y-0 sm:flex sm:gap-2">
                                            <input
                                                type="text"
                                                placeholder="عنوان الفيديو (مثال: الجزء الأول)"
                                                value={video.title}
                                                onChange={(e) => handleVideoChange(idx, 'title', e.target.value)}
                                                className="w-full sm:w-1/3 p-3 bg-[var(--bg-tertiary)] border-2 border-transparent focus:border-[var(--accent-primary)] rounded-xl font-bold text-sm outline-none"
                                            />
                                            <input
                                                type="text"
                                                placeholder="رابط الفيديو (YouTube)"
                                                value={video.url}
                                                onChange={(e) => handleVideoChange(idx, 'url', e.target.value)}
                                                className="w-full sm:flex-1 p-3 bg-[var(--bg-tertiary)] border-2 border-transparent focus:border-[var(--accent-primary)] rounded-xl font-mono text-sm outline-none text-left"
                                                dir="ltr"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveVideo(idx)}
                                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                                {videoList.length === 0 && (
                                    <div className="text-center py-6 text-[var(--text-secondary)] opacity-50 text-sm font-bold">
                                        لا توجد فيديوهات مضافة. اضغط على زر الإضافة للبدء.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-[var(--bg-tertiary)] p-6 rounded-[2rem] border border-[var(--border-primary)]">
                            <h4 className="font-black text-[var(--text-primary)] mb-3 flex items-center gap-2"><DocumentTextIcon className="w-5 h-5" /> وصف الدرس (للمعلم الذكي)</h4>
                            <textarea name="description" placeholder="اكتب ملخصاً شاملاً للنقاط الأساسية في الدرس..." value={formData.description || ''} onChange={handleChange} rows={5} className="w-full p-4 bg-[var(--bg-secondary)] border-2 border-transparent focus:border-[var(--accent-primary)] rounded-2xl font-medium outline-none resize-none leading-relaxed" />
                        </div>

                        {/* Video Gatekeeper Questions UI */}
                        <div className="bg-gradient-to-br from-indigo-900/10 to-purple-900/10 p-6 rounded-[2.5rem] border border-indigo-500/20">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h4 className="font-black text-[var(--text-primary)] flex items-center gap-2">
                                        <SparklesIcon className="w-5 h-5 text-indigo-500" />
                                        أسئلة التخطي الذكية
                                    </h4>
                                    <p className="text-sm font-bold text-[var(--text-secondary)] mt-1">أسئلة تظهر بعد الفيديو للتأكد من المشاهدة.</p>
                                </div>
                                <button type="button" onClick={handleGenerateVideoQuestions} disabled={isVideoGenerating} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50">
                                    {isVideoGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <SparklesIcon className="w-4 h-4" />}
                                    توليد تلقائي
                                </button>
                            </div>

                            <div className="space-y-4">
                                {(formData.videoQuestions || []).map((q, qIndex) => (
                                    <div key={qIndex} className="p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] relative group">
                                        <button type="button" onClick={() => removeQuestion(qIndex, true)} className="absolute top-4 left-4 p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"><TrashIcon className="w-4 h-4" /></button>
                                        <p className="text-sm font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">سؤال {qIndex + 1}</p>
                                        <input value={q.questionText} onChange={e => handleQuestionChange(qIndex, 'questionText', e.target.value, undefined, true)} placeholder="نص السؤال" className="w-full p-3 mb-3 bg-[var(--bg-tertiary)] rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[var(--accent-primary)]" />
                                        <div className="grid grid-cols-1 gap-2">
                                            {(q.options || ['', '', '', '']).map((opt, optIndex) => (
                                                <div key={optIndex} className={`flex items-center gap-3 p-2 rounded-xl transition-all ${q.correctAnswerIndex === optIndex ? 'bg-green-500/10 border border-green-500/20' : 'bg-[var(--bg-tertiary)]'}`}>
                                                    <input type="radio" name={`video_q_${qIndex}`} checked={q.correctAnswerIndex === optIndex} onChange={() => handleQuestionChange(qIndex, 'correctAnswerIndex', optIndex, undefined, true)} className="w-4 h-4 accent-green-500" />
                                                    <input value={opt} onChange={e => handleQuestionChange(qIndex, 'options', e.target.value, optIndex, true)} placeholder={`خيار ${optIndex + 1}`} className="flex-1 bg-transparent text-sm font-bold outline-none" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={() => addBlankQuestion(true)} className="w-full py-4 border-2 border-dashed border-[var(--border-primary)] rounded-2xl text-[var(--text-secondary)] font-bold text-sm hover:bg-[var(--bg-tertiary)] transition-colors">+ إضافة سؤال يدوي</button>
                            </div>
                        </div>
                    </div>
                )}

                {type === LessonType.SUMMARY && (
                    <div className="space-y-4 animate-fade-in">
                        <ImageUpload label="رابط ملف PDF" value={formData.content || ''} onChange={url => setFormData(p => ({ ...p, content: url }))} />
                        <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-600 text-sm font-bold text-center">
                            سيتم فتح الملف في نافذة جديدة عند ضغط الطالب.
                        </div>
                    </div>
                )}

                {(type === LessonType.HOMEWORK || type === LessonType.EXAM) && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Simplified Quiz Type Switcher */}
                        <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-2xl">
                            <button type="button" onClick={() => setQuizEditorMode('image')} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${quizEditorMode === 'image' ? 'bg-[var(--bg-secondary)] text-[var(--accent-primary)] shadow-md' : 'text-[var(--text-secondary)]'}`}>امتحان من صورة</button>
                            <button type="button" onClick={() => setQuizEditorMode('mcq')} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${quizEditorMode === 'mcq' ? 'bg-[var(--bg-secondary)] text-[var(--accent-primary)] shadow-md' : 'text-[var(--text-secondary)]'}`}>نصي (MCQ)</button>
                        </div>

                        {quizEditorMode === 'image' ? (
                            <div className="space-y-4">
                                <ImageUpload label="صورة الأسئلة" value={formData.imageUrl || ''} onChange={url => setFormData(p => ({ ...p, imageUrl: url }))} />
                                <div className="p-4 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--border-primary)]">
                                    <label className="block text-sm font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">نموذج الإجابة</label>
                                    <textarea placeholder="اكتب الإجابات الصحيحة (كل إجابة في سطر منفصل)" name="correctAnswers" value={Array.isArray(formData.correctAnswers) ? formData.correctAnswers.join('\n') : formData.correctAnswers || ''} onChange={handleChange} rows={6} className="w-full p-4 bg-[var(--bg-secondary)] rounded-xl font-mono text-sm font-bold outline-none border-2 border-transparent focus:border-[var(--accent-primary)]" />
                                </div>
                            </div>
                        ) : (
                            // ... MCQ Editor Reuse ...
                            <div className="space-y-4">
                                {/* AI Gen Block */}
                                <div className="bg-purple-600/5 p-6 rounded-3xl border border-purple-600/10">
                                    <h4 className="font-black text-purple-600 mb-4 flex items-center gap-2"><SparklesIcon className="w-5 h-5" /> توليد أسئلة بالذكاء الاصطناعي</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <input type="text" value={aiSettings.topic} onChange={e => setAiSettings(p => ({ ...p, topic: e.target.value }))} placeholder="موضوع الأسئلة..." className="w-full p-3 bg-white dark:bg-black/20 rounded-xl font-bold text-sm outline-none" />
                                        <div className="flex gap-2">
                                            <select value={aiSettings.difficulty} onChange={e => setAiSettings(p => ({ ...p, difficulty: e.target.value as any }))} className="flex-1 p-3 bg-white dark:bg-black/20 rounded-xl font-bold text-sm outline-none"><option>سهل</option><option>متوسط</option><option>صعب</option></select>
                                            <input type="number" value={aiSettings.numQuestions} onChange={e => setAiSettings(p => ({ ...p, numQuestions: parseInt(e.target.value) }))} className="w-20 p-3 bg-white dark:bg-black/20 rounded-xl font-bold text-sm outline-none text-center" />
                                        </div>
                                    </div>
                                    <button type="button" onClick={handleGenerateQuestions} disabled={isGenerating} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-purple-700 transition-all">{isGenerating ? 'جاري التوليد...' : 'توليد الأسئلة الآن'}</button>
                                </div>

                                {/* Manual MCQ List */}
                                <div className="space-y-4">
                                    {(formData.questions || []).map((q, qIndex) => (
                                        <div key={qIndex} className="p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] relative group">
                                            <button type="button" onClick={() => removeQuestion(qIndex)} className="absolute top-4 left-4 p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"><TrashIcon className="w-4 h-4" /></button>
                                            <p className="text-sm font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">سؤال {qIndex + 1}</p>
                                            <textarea value={q.questionText} onChange={e => handleQuestionChange(qIndex, 'questionText', e.target.value)} placeholder="نص السؤال..." className="w-full p-3 mb-3 bg-[var(--bg-tertiary)] rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-[var(--accent-primary)]" rows={2} />

                                            <div className="grid grid-cols-1 gap-2">
                                                {(q.options || ['', '', '', '']).map((opt, optIndex) => (
                                                    <div key={optIndex} className={`flex items-center gap-3 p-2 rounded-xl transition-all ${q.correctAnswerIndex === optIndex ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-[var(--bg-tertiary)]'}`}>
                                                        <input type="radio" name={`quiz_q_${qIndex}`} checked={q.correctAnswerIndex === optIndex} onChange={() => handleQuestionChange(qIndex, 'correctAnswerIndex', optIndex)} className="w-4 h-4 accent-purple-500" />
                                                        <input value={opt} onChange={e => handleQuestionChange(qIndex, 'options', e.target.value, optIndex)} placeholder={`خيار ${optIndex + 1}`} className="flex-1 bg-transparent text-sm font-bold outline-none" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => addBlankQuestion()} className="w-full py-4 border-2 border-dashed border-[var(--border-primary)] rounded-2xl text-[var(--text-secondary)] font-bold text-sm hover:bg-[var(--bg-tertiary)] transition-colors">+ إضافة سؤال جديد</button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">درجة النجاح (%)</label>
                                <input type="number" name="passingScore" value={formData.passingScore || ''} onChange={handleChange} className="w-full p-4 bg-[var(--bg-tertiary)] rounded-2xl font-bold text-center outline-none border-2 border-transparent focus:border-[var(--accent-primary)]" placeholder="50" />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">الوقت (دقائق)</label>
                                <input type="number" name="timeLimit" value={formData.timeLimit || ''} onChange={handleChange} className="w-full p-4 bg-[var(--bg-tertiary)] rounded-2xl font-bold text-center outline-none border-2 border-transparent focus:border-[var(--accent-primary)]" placeholder="بلا وقت" />
                            </div>
                        </div>
                    </div>
                )}

                <div className="pt-6 border-t border-[var(--border-primary)] flex justify-end">
                    <button type="submit" className="px-10 py-4 bg-[var(--accent-primary)] hover:bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl transition-all transform active:scale-95 text-sm flex items-center gap-3">
                        <CheckCircleIcon className="w-5 h-5" /> حفظ الدرس
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// --- LessonPartItem Component ---
const LessonPartItem: React.FC<{
    lesson: Lesson,
    onEdit: () => void,
    onDelete: () => void,
    onToggleVisibility: () => void
}> = memo(({ lesson, onEdit, onDelete, onToggleVisibility }) => {
    const Icon = getLessonIcon(lesson.type);
    const isVisible = !!lesson.publishedAt;
    const videoCount = lesson.videos?.length || 0;

    return (
        <div className={`
            group flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300
            ${isVisible
                ? 'bg-[var(--bg-secondary)] border-[var(--border-primary)] hover:border-[var(--accent-primary)]/40 hover:shadow-md'
                : 'bg-red-500/5 border-red-500/20 opacity-80'}
        `}>
            <div className="flex items-center gap-4">
                <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center shadow-inner
                    ${isVisible
                        ? 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)]'
                        : 'bg-red-100 text-red-500'}
                `}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <h4 className={`font-bold text-sm ${isVisible ? 'text-[var(--text-primary)]' : 'text-red-600 line-through'}`}>{lesson.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">{lesson.type}</span>
                        {lesson.isFree && <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-600 text-sm font-black">مجاني</span>}
                        {videoCount > 1 && lesson.type === LessonType.EXPLANATION && <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 text-sm font-black">{videoCount} فيديوهات</span>}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300">
                <button onClick={onToggleVisibility} className="p-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-indigo-600 transition-colors" title={isVisible ? 'إخفاء' : 'نشر'}>
                    {isVisible ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
                </button>
                <button onClick={onEdit} className="p-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-amber-500 transition-colors">
                    <PencilIcon className="w-5 h-5" />
                </button>
                <button onClick={onDelete} className="p-2 rounded-xl text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-500 transition-colors">
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
});

// --- Unit Item Component (The Core Fix) ---
const UnitItem: React.FC<{
    unit: Unit;
    teacherName: string;
    lessonsForUnit: Lesson[];
    expanded: boolean;
    onToggle: () => void;
    isLoadingLessons: boolean;
    optionsMenuUnitId: string | null;
    setOptionsMenuUnitId: React.Dispatch<React.SetStateAction<string | null>>;
    optionsMenuRef: React.RefObject<HTMLDivElement>;
    openModal: (type: string, data?: any) => void;
    onToggleLessonVisibility: (lesson: Lesson) => void;
    isAdmin: boolean;
}> = memo(({ unit, teacherName, lessonsForUnit, expanded, onToggle, isLoadingLessons, optionsMenuUnitId, setOptionsMenuUnitId, optionsMenuRef, openModal, onToggleLessonVisibility, isAdmin }) => {

    // Group lessons by type for cleaner display
    const groupedLessons = useMemo(() => {
        const groups: Record<LessonType, Lesson[]> = {
            [LessonType.EXPLANATION]: [],
            [LessonType.HOMEWORK]: [],
            [LessonType.EXAM]: [],
            [LessonType.SUMMARY]: []
        };

        if (!lessonsForUnit) return groups;

        // Sort and group
        [...lessonsForUnit]
            .sort((a, b) => a.title.localeCompare(b.title, 'ar'))
            .forEach((l: Lesson) => {
                if (groups[l.type]) groups[l.type].push(l);
                else groups[LessonType.EXPLANATION].push(l); // Fallback
            });

        return groups;
    }, [lessonsForUnit]);

    // Count badges
    const totalCount = lessonsForUnit.length;

    return (
        <div className={`
            bg-[var(--bg-secondary)] rounded-[2.5rem] border transition-all duration-500 overflow-hidden
            ${expanded ? 'border-[var(--accent-primary)] shadow-2xl scale-[1.01]' : 'border-[var(--border-primary)] shadow-sm hover:shadow-md'}
        `}>
            <header
                onClick={onToggle}
                className="p-6 cursor-pointer select-none flex justify-between items-center group"
            >
                <div className="flex items-center gap-5">
                    <div className={`
                        w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg transition-all duration-500
                        ${expanded ? 'bg-[var(--accent-primary)] text-white rotate-6' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] group-hover:bg-indigo-50 group-hover:text-indigo-600'}
                    `}>
                        {totalCount}
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-[var(--text-primary)] mb-1">{unit.title}</h3>
                        <p className="text-sm font-bold text-[var(--text-secondary)] opacity-60 uppercase tracking-widest">{expanded ? 'Expanded View' : 'Click to view content'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {isAdmin && (
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setOptionsMenuUnitId(p => p === unit.id ? null : unit.id); }}
                                className="p-3 rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors active:scale-90"
                            >
                                <DotsVerticalIcon className="w-6 h-6" />
                            </button>

                            {/* Premium Dropdown Menu */}
                            {optionsMenuUnitId === unit.id && (
                                <div ref={optionsMenuRef} className="absolute top-full left-0 mt-2 w-48 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl z-30 overflow-hidden animate-slide-up">
                                    <button onClick={() => { openModal('edit-unit', { unit }); setOptionsMenuUnitId(null); }} className="w-full text-right px-5 py-4 text-sm font-bold hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2">
                                        <PencilIcon className="w-4 h-4" /> تعديل الوحدة
                                    </button>
                                    <div className="h-px bg-[var(--border-primary)]"></div>
                                    <button onClick={() => { openModal('delete-unit', { unit }); setOptionsMenuUnitId(null); }} className="w-full text-right px-5 py-4 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2">
                                        <TrashIcon className="w-4 h-4" /> حذف الوحدة
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    <ChevronDownIcon className={`w-6 h-6 text-[var(--text-secondary)] transition-transform duration-500 ${expanded ? 'rotate-180' : ''}`} />
                </div>
            </header>

            {/* Expanded Content - Redesigned Grid */}
            <div className={`transition-all duration-500 ease-in-out ${expanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-6 pt-0 border-t border-[var(--border-primary)] border-dashed">
                    {isLoadingLessons ? (
                        <div className="flex justify-center py-10"><Loader /></div>
                    ) : lessonsForUnit.length === 0 ? (
                        <div className="text-center py-12 bg-[var(--bg-tertiary)] rounded-2xl border-2 border-dashed border-[var(--border-primary)] opacity-60 my-6">
                            <BookOpenIcon className="w-16 h-16 mx-auto text-[var(--text-secondary)] mb-4" />
                            <p className="font-bold text-[var(--text-secondary)]">لا توجد دروس مضافة بعد.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 py-6">
                            {/* Explanations Column */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-black uppercase text-indigo-600 mb-2 flex items-center gap-2"><VideoCameraIcon className="w-4 h-4" /> شروحات ({groupedLessons[LessonType.EXPLANATION].length})</h4>
                                {groupedLessons[LessonType.EXPLANATION].map(l => (
                                    <LessonPartItem
                                        key={l.id} lesson={l}
                                        onEdit={() => openModal('edit-lesson', { unit, lesson: l })}
                                        onDelete={() => openModal('delete-lesson', { unit, lesson: l })}
                                        onToggleVisibility={() => onToggleLessonVisibility(l)}
                                    />
                                ))}
                                {groupedLessons[LessonType.EXPLANATION].length === 0 && <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] opacity-50 text-sm text-center font-bold">لا توجد شروحات</div>}
                            </div>

                            {/* Others Column (Homework/Exam/Summary) */}
                            <div className="space-y-6">
                                {/* Homeworks */}
                                <div className="space-y-2">
                                    <h4 className="text-sm font-black uppercase text-orange-600 mb-2 flex items-center gap-2"><PencilIcon className="w-4 h-4" /> واجبات ({groupedLessons[LessonType.HOMEWORK].length})</h4>
                                    {groupedLessons[LessonType.HOMEWORK].map(l => (
                                        <LessonPartItem key={l.id} lesson={l} onEdit={() => openModal('edit-lesson', { unit, lesson: l })} onDelete={() => openModal('delete-lesson', { unit, lesson: l })} onToggleVisibility={() => onToggleLessonVisibility(l)} />
                                    ))}
                                </div>
                                {/* Exams */}
                                <div className="space-y-2">
                                    <h4 className="text-sm font-black uppercase text-red-600 mb-2 flex items-center gap-2"><BookOpenIcon className="w-4 h-4" /> امتحانات ({groupedLessons[LessonType.EXAM].length})</h4>
                                    {groupedLessons[LessonType.EXAM].map(l => (
                                        <LessonPartItem key={l.id} lesson={l} onEdit={() => openModal('edit-lesson', { unit, lesson: l })} onDelete={() => openModal('delete-lesson', { unit, lesson: l })} onToggleVisibility={() => onToggleLessonVisibility(l)} />
                                    ))}
                                </div>
                                {/* Summaries */}
                                <div className="space-y-2">
                                    <h4 className="text-sm font-black uppercase text-emerald-600 mb-2 flex items-center gap-2"><DocumentTextIcon className="w-4 h-4" /> ملخصات ({groupedLessons[LessonType.SUMMARY].length})</h4>
                                    {groupedLessons[LessonType.SUMMARY].map(l => (
                                        <LessonPartItem key={l.id} lesson={l} onEdit={() => openModal('edit-lesson', { unit, lesson: l })} onDelete={() => openModal('delete-lesson', { unit, lesson: l })} onToggleVisibility={() => onToggleLessonVisibility(l)} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => openModal('add-lesson', { unit, lesson: { type: LessonType.EXPLANATION } })}
                        className="w-full py-4 rounded-2xl border-2 border-dashed border-indigo-400 text-indigo-500 font-black text-sm hover:bg-indigo-50 hover:border-solid transition-all flex items-center justify-center gap-2 group mt-4"
                    >
                        <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                            <PlusIcon className="w-5 h-5" />
                        </div>
                        <span>إضافة حصة جديدة</span>
                    </button>
                </div>
            </div>
        </div>
    );
});


const TeacherContentManagement: React.FC<TeacherContentManagementProps> = ({ teacher, isReadOnly }) => {
    const { currentUser } = useSession();
    const isAdmin = currentUser?.role === Role.ADMIN;
    const [dataVersion, setDataVersion] = useState(0);
    const { addToast } = useToast();
    const { setRefreshPaused } = useContext(AppLifecycleContext);

    // --- State ---
    const [modalState, setModalState] = useState<{ type: string | null; data: any }>({ type: null, data: {} });
    const [grades, setGrades] = useState<Grade[]>([]);
    const [selectedGradeId, setSelectedGradeId] = useState<string>('');
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
    const [units, setUnits] = useState<Unit[]>([]);
    const [lessonsMap, setLessonsMap] = useState<Record<string, Lesson[]>>({});
    const [isLoadingUnits, setIsLoadingUnits] = useState(false);
    const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
    const [loadingLessons, setLoadingLessons] = useState<Set<string>>(new Set());
    const [optionsMenuUnitId, setOptionsMenuUnitId] = useState<string | null>(null);
    const optionsMenuRef = useRef<HTMLDivElement>(null);

    // --- Lifecycle ---
    const refreshData = useCallback(() => setDataVersion(v => v + 1), []);

    const closeModal = useCallback(() => {
        setRefreshPaused(false);
        setModalState({ type: null, data: {} });
    }, [setRefreshPaused]);

    const openModal = useCallback((type: string, data = {}) => {
        if (isReadOnly) {
            addToast('لا تملك صلاحية التعديل.', ToastType.WARNING);
            return;
        }
        setRefreshPaused(true);
        setModalState({ type, data });
    }, [isReadOnly, addToast, setRefreshPaused]);

    // --- Data Fetching ---
    useEffect(() => {
        const fetchData = async () => {
            const gradesData = await getAllGrades();
            const teacherGrades = gradesData.filter(g => teacher.teachingGrades?.includes(g.id));
            setGrades(teacherGrades);
            if (teacherGrades.length > 0) {
                if (!selectedGradeId || !teacherGrades.some(g => g.id.toString() === selectedGradeId)) {
                    setSelectedGradeId(teacherGrades[0].id.toString());
                    setSelectedSemesterId(teacherGrades[0].semesters[0]?.id || '');
                }
            }
        };
        fetchData();
    }, [dataVersion, teacher.teachingGrades, selectedGradeId, teacher.id]);

    useEffect(() => {
        if (selectedGradeId && selectedSemesterId) {
            const fetchUnits = async () => {
                setIsLoadingUnits(true);
                const fetchedUnits = await getUnitsForSemester(parseInt(selectedGradeId), selectedSemesterId);
                setUnits(fetchedUnits.filter(u => u.teacherId === teacher.id));
                setIsLoadingUnits(false);

                // If a unit is already expanded, refresh its content too
                if (expandedUnitId) {
                    const fetchedLessons = await getLessonsByUnit(expandedUnitId);
                    setLessonsMap(prev => ({ ...prev, [expandedUnitId]: fetchedLessons }));
                }
            };
            fetchUnits();
        } else {
            setUnits([]);
        }
    }, [selectedGradeId, selectedSemesterId, dataVersion, teacher.id, expandedUnitId]);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) setOptionsMenuUnitId(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedGrade = useMemo(() => grades.find(g => g.id.toString() === selectedGradeId), [grades, selectedGradeId]);
    const selectedSemester = useMemo(() => selectedGrade?.semesters.find(s => s.id === selectedSemesterId), [selectedGrade, selectedSemesterId]);

    const handleToggleExpand = useCallback(async (unitId: string) => {
        const newExpandedId = expandedUnitId === unitId ? null : unitId;
        setExpandedUnitId(newExpandedId);
        if (newExpandedId) {
            setLoadingLessons(prev => new Set(prev).add(unitId));
            try {
                const fetchedLessons = await getLessonsByUnit(newExpandedId);
                setLessonsMap(prevMap => ({ ...prevMap, [newExpandedId]: fetchedLessons }));
            } catch (error) {
                addToast('فشل تحميل الدروس لهذه الوحدة.', ToastType.ERROR);
            } finally {
                setLoadingLessons(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(unitId);
                    return newSet;
                });
            }
        }
    }, [expandedUnitId, addToast]);

    // --- Action Handlers ---
    const handleSaveUnit = useCallback(async (unitData: Partial<Unit>) => {
        if (selectedGrade && selectedSemester) {
            try {
                if (modalState.data.unit?.id) {
                    await updateUnit(selectedGrade.id, selectedSemester.id, { ...modalState.data.unit, ...unitData });
                    addToast('تم تعديل الوحدة!', ToastType.SUCCESS);
                } else {
                    await addUnitToSemester(selectedGrade.id, selectedSemester.id, { ...unitData, teacherId: teacher.id } as Omit<Unit, 'id' | 'lessons'>);
                    addToast('تمت إضافة الوحدة!', ToastType.SUCCESS);
                }
                refreshData();
                closeModal();
            } catch (error: any) {
                addToast(`فشل حفظ الوحدة: ${error.message}`, ToastType.ERROR);
            }
        }
    }, [addToast, closeModal, modalState.data, refreshData, selectedGrade, selectedSemester, teacher.id]);

    const handleDeleteUnit = useCallback(async () => {
        const { unit } = modalState.data;
        if (selectedGrade && selectedSemester && unit) {
            try {
                await deleteUnit(selectedGrade.id, selectedSemester.id, unit.id);
                addToast('تم حذف الوحدة.', ToastType.SUCCESS);
                refreshData();
                closeModal();
            } catch (error: any) {
                addToast(`فشل حذف الوحدة: ${error.message}`, ToastType.ERROR);
            }
        }
    }, [addToast, closeModal, modalState.data, refreshData, selectedGrade, selectedSemester]);

    const handleSaveLesson = useCallback(async (lessonData: Lesson | Omit<Lesson, 'id'>) => {
        const { unit } = modalState.data;
        if (selectedGrade && selectedSemester && unit) {
            try {
                if ('id' in lessonData && lessonData.id) {
                    const { error } = await updateLesson(selectedGrade.id, selectedSemester.id, unit.id, lessonData as Lesson);
                    if (error) throw error;
                    addToast('تم تحديث الدرس', ToastType.SUCCESS);
                } else {
                    const { error } = await addLessonToUnit(selectedGrade.id, selectedSemester.id, unit.id, lessonData, teacher.id);
                    if (error) throw error;
                    addToast('تمت إضافة الدرس', ToastType.SUCCESS);
                }
                refreshData();
                closeModal();
            } catch (error: any) {
                addToast(`فشل حفظ الدرس: ${error.message}`, ToastType.ERROR);
            }
        }
    }, [addToast, closeModal, modalState.data, refreshData, selectedGrade, selectedSemester, teacher.id]);

    const handleDeleteLesson = useCallback(async () => {
        const { unit, lesson } = modalState.data;
        if (selectedGrade && selectedSemester && unit && lesson) {
            try {
                await deleteLesson(selectedGrade.id, selectedSemester.id, unit.id, lesson.id);
                addToast('تم حذف الدرس.', ToastType.SUCCESS);
                refreshData();
                closeModal();
            } catch (error: any) {
                addToast(`فشل حذف الدرس: ${error.message}`, ToastType.ERROR);
            }
        }
    }, [addToast, closeModal, modalState.data, refreshData, selectedGrade, selectedSemester]);

    const toggleLessonVisibility = useCallback(async (lesson: Lesson) => {
        if (isReadOnly || !selectedGrade || !selectedSemester) return;

        const newPublishedAt = lesson.publishedAt ? undefined : new Date().toISOString();
        const newLessonState: Lesson = { ...lesson, publishedAt: newPublishedAt };

        try {
            const { error } = await updateLesson(selectedGrade.id, selectedSemester.id, lesson.unitId || '', newLessonState);
            if (error) throw error;

            // Optimistic update
            setLessonsMap(prev => {
                const unitId = lesson.unitId || '';
                if (!prev[unitId]) return prev;
                return {
                    ...prev,
                    [unitId]: prev[unitId].map(l => l.id === lesson.id ? newLessonState : l)
                };
            });

            addToast(newPublishedAt ? 'تم إظهار الدرس للطلاب' : 'تم إخفاء الدرس عن الطلاب', ToastType.INFO);
        } catch (error: any) {
            addToast(`فشل تغيير حالة العرض: ${error.message}`, ToastType.ERROR);
        }
    }, [isReadOnly, selectedGrade, selectedSemester, addToast]);

    return (
        <div className="space-y-8 fade-in pb-24">

            {/* Header */}
            <div className="bg-[var(--bg-secondary)] p-8 rounded-[3rem] border border-[var(--border-primary)] shadow-lg relative overflow-hidden flex items-center gap-6">
                <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[var(--accent-primary)]/10 to-transparent pointer-events-none"></div>

                {/* Added Image Section */}
                <div className="relative z-10 shrink-0">
                    <img
                        src={teacher.imageUrl || 'https://via.placeholder.com/150'}
                        alt={teacher.name}
                        className="w-24 h-24 rounded-[2rem] object-cover border-4 border-[var(--bg-tertiary)] shadow-xl"
                        onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150'}
                    />
                </div>

                <div className="relative z-10">
                    <h1 className="text-3xl font-black text-[var(--text-primary)]">منهج: {teacher.name}</h1>
                    <p className="text-[var(--text-secondary)] font-bold mt-2 max-w-xl">
                        قم بإدارة الوحدات الدراسية، رفع الفيديوهات، وإنشاء الاختبارات لطلابك بسهولة.
                    </p>
                </div>
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative group">
                    <select
                        value={selectedGradeId}
                        onChange={(e) => {
                            const newGradeId = e.target.value;
                            setSelectedGradeId(newGradeId);
                            const newGrade = grades.find(g => g.id.toString() === newGradeId);
                            setSelectedSemesterId(newGrade?.semesters[0]?.id || '');
                            setExpandedUnitId(null);
                        }}
                        className="w-full p-4 bg-[var(--bg-secondary)] border-2 border-[var(--border-primary)] rounded-2xl font-bold text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none appearance-none transition-all shadow-sm"
                    >
                        {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <ChevronDownIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
                </div>

                <div className="relative group">
                    <select
                        value={selectedSemesterId}
                        onChange={(e) => { setSelectedSemesterId(e.target.value); setExpandedUnitId(null); }}
                        disabled={!selectedGrade}
                        className="w-full p-4 bg-[var(--bg-secondary)] border-2 border-[var(--border-primary)] rounded-2xl font-bold text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none appearance-none transition-all shadow-sm disabled:opacity-50"
                    >
                        {selectedGrade?.semesters.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                    <ChevronDownIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
                </div>
            </div>

            {/* Content List */}
            <div className="space-y-4 min-h-[400px]">
                {isLoadingUnits ? (
                    <div className="flex justify-center items-center py-20"><Loader /></div>
                ) : units.length > 0 ? (
                    units.map(unit => (
                        <UnitItem
                            key={unit.id}
                            unit={unit}
                            teacherName={teacher.name}
                            lessonsForUnit={lessonsMap[unit.id] || []}
                            expanded={expandedUnitId === unit.id}
                            onToggle={() => handleToggleExpand(unit.id)}
                            isLoadingLessons={loadingLessons.has(unit.id)}
                            optionsMenuUnitId={optionsMenuUnitId}
                            setOptionsMenuUnitId={setOptionsMenuUnitId}
                            optionsMenuRef={optionsMenuRef}
                            openModal={openModal}
                            onToggleLessonVisibility={toggleLessonVisibility}
                            isAdmin={isAdmin}
                        />
                    ))
                ) : (
                    <div className="text-center py-20 bg-[var(--bg-secondary)] rounded-[3rem] border-2 border-dashed border-[var(--border-primary)] opacity-60">
                        <BookOpenIcon className="w-20 h-20 mx-auto opacity-20 mb-4 text-[var(--text-secondary)]" />
                        <h3 className="text-xl font-bold text-[var(--text-primary)]">القائمة فارغة</h3>
                        <p className="text-sm font-bold text-[var(--text-secondary)] mt-2">ابدأ بإضافة وحدات دراسية لهذا الفصل.</p>
                    </div>
                )}
            </div>

            {/* Add Unit Button */}
            {selectedSemester && !isLoadingUnits && !isReadOnly && isAdmin && (
                <button
                    onClick={() => openModal('add-unit', { grade: selectedGrade, semester: selectedSemester })}
                    className="w-full p-5 bg-gradient-to-r from-[var(--accent-primary)] to-indigo-600 hover:to-indigo-700 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-3"
                >
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <PlusIcon className="w-5 h-5" />
                    </div>
                    <span>إضافة منهج دراسي جديد</span>
                </button>
            )}

            {/* Modals */}
            <UnitModal
                isOpen={['add-unit', 'edit-unit'].includes(modalState.type || '')}
                onClose={closeModal}
                onSave={handleSaveUnit}
                unit={modalState.data.unit}
                selectedGrade={selectedGrade}
            />

            <LessonModal
                isOpen={['add-lesson', 'edit-lesson'].includes(modalState.type || '')}
                onClose={closeModal}
                onSave={handleSaveLesson}
                lesson={modalState.data.lesson}
                gradeName={selectedGrade?.name || ''}
            />

            <ConfirmationModal
                isOpen={modalState.type === 'delete-unit'}
                onClose={closeModal}
                onConfirm={handleDeleteUnit}
                title="تأكيد حذف الوحدة"
                message={`هل أنت متأكد من حذف وحدة "${modalState.data.unit?.title}"؟ سيتم حذف جميع الدروس بداخلها نهائياً.`}
            />

            <ConfirmationModal
                isOpen={modalState.type === 'delete-lesson'}
                onClose={closeModal}
                onConfirm={handleDeleteLesson}
                title="تأكيد حذف الدرس"
                message={`هل أنت متأكد من حذف درس "${modalState.data.lesson?.title}"؟`}
            />
        </div>
    );
};

export default TeacherContentManagement;
