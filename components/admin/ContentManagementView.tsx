
import React, { useState, useMemo, useCallback, useEffect, useRef, useContext, memo } from 'react';
import { Grade, Semester, Unit, Lesson, LessonType, ToastType, Teacher, QuizType, QuizQuestion, LessonVideo } from '../../types';
import {
    getAllGrades, addLessonToUnit, updateLesson, deleteLesson,
    addUnitToSemester, updateUnit, deleteUnit, getUnitsForSemester,
    getLessonsByUnit
} from '../../services/storageService';
import { getAllTeachers } from '../../services/teacherService';
import Modal from '../common/Modal';
import { PlusIcon, PencilIcon, TrashIcon, DotsVerticalIcon, BookOpenIcon, VideoCameraIcon, DocumentTextIcon, ChevronDownIcon, SparklesIcon, XIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon, PlayIcon, LockClosedIcon } from '../common/Icons';
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

const ConfirmationModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; }> = ({ isOpen, onClose, onConfirm, title, message }) => (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
        <div className="text-center p-4 sm:p-6">
            <TrashIcon className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mx-auto mb-3 sm:mb-4 opacity-80" />
            <p className="text-sm sm:text-base text-[var(--text-secondary)] mb-5 sm:mb-6 font-bold">{message}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3">
                <button onClick={onClose} className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--bg-tertiary)] font-bold text-[var(--text-secondary)] hover:bg-[var(--border-primary)] transition-colors">إلغاء</button>
                <button onClick={onConfirm} className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 transition-colors text-white font-bold shadow-lg shadow-red-500/20">تأكيد الحذف</button>
            </div>
        </div>
    </Modal>
);

const UnitModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Unit>, gradeId?: string, semesterId?: string) => void;
    unit: Unit | null;
    teachers: Teacher[];
    grades: Grade[];
    initialGradeId?: string;
    initialSemesterId?: string;
}> = ({ isOpen, onClose, onSave, unit, teachers, grades, initialGradeId, initialSemesterId }) => {
    const [formData, setFormData] = useState<{ title: string, track: Unit['track'], teacherId: string, gradeId: string, semesterId: string }>({
        title: '', track: 'All', teacherId: '', gradeId: '', semesterId: ''
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                title: unit?.title || '',
                track: unit?.track || 'All',
                teacherId: unit?.teacherId || '',
                gradeId: initialGradeId || (grades.length > 0 ? grades[0].id.toString() : ''),
                semesterId: initialSemesterId || ''
            });
        }
    }, [unit, isOpen, initialGradeId, initialSemesterId, grades]);

    useEffect(() => {
        if (formData.gradeId && !formData.semesterId) {
            const selectedGrade = grades.find(g => g.id.toString() === formData.gradeId);
            if (selectedGrade && selectedGrade.semesters.length > 0) {
                setFormData(p => ({ ...p, semesterId: selectedGrade.semesters[0].id }));
            }
        }
    }, [formData.gradeId, grades, formData.semesterId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.title.trim() && formData.teacherId && formData.gradeId && formData.semesterId) {
            onSave(
                { title: formData.title, track: formData.track, teacherId: formData.teacherId },
                formData.gradeId,
                formData.semesterId
            );
        }
    };

    const selectedTeacher = teachers.find(t => t.id === formData.teacherId);
    const selectedGrade = grades.find(g => g.id.toString() === formData.gradeId);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={unit ? 'تعديل المنهج' : 'إضافة منهج جديد'}>
            <form onSubmit={handleSubmit} className="space-y-5 p-2">

                {/* Teacher Selection */}
                <div>
                    <label className="block text-sm font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">المدرس</label>
                    <div className="relative">
                        <select
                            value={formData.teacherId}
                            onChange={(e) => setFormData(p => ({ ...p, teacherId: e.target.value }))}
                            className="w-full p-4 pl-12 bg-[var(--bg-tertiary)] border-2 border-transparent focus:border-[var(--accent-primary)] rounded-2xl font-bold text-[var(--text-primary)] outline-none appearance-none cursor-pointer transition-all"
                            required
                        >
                            <option value="">اختر المدرس...</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>)}
                        </select>
                        {selectedTeacher ? (
                            <img src={selectedTeacher.imageUrl || 'https://i.ibb.co/k5y5nJg/imgbb-com-image-not-found.png'} alt="Teacher" className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full object-cover border border-[var(--border-primary)]" />
                        ) : (
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center justify-center">
                                <span className="text-sm">👤</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Grade and Semester Selection (Only for new units) */}
                {!unit && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">الصف الدراسي</label>
                            <select
                                value={formData.gradeId}
                                onChange={(e) => {
                                    const newGradeId = e.target.value;
                                    const newGrade = grades.find(g => g.id.toString() === newGradeId);
                                    setFormData(p => ({
                                        ...p,
                                        gradeId: newGradeId,
                                        semesterId: newGrade?.semesters[0]?.id || ''
                                    }));
                                }}
                                className="w-full p-4 bg-[var(--bg-tertiary)] border-2 border-transparent focus:border-[var(--accent-primary)] rounded-2xl font-bold text-[var(--text-primary)] outline-none appearance-none cursor-pointer transition-all"
                                required
                            >
                                <option value="">اختر الصف...</option>
                                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">الفصل الدراسي</label>
                            <select
                                value={formData.semesterId}
                                onChange={(e) => setFormData(p => ({ ...p, semesterId: e.target.value }))}
                                disabled={!selectedGrade}
                                className="w-full p-4 bg-[var(--bg-tertiary)] border-2 border-transparent focus:border-[var(--accent-primary)] rounded-2xl font-bold text-[var(--text-primary)] outline-none appearance-none cursor-pointer transition-all disabled:opacity-50"
                                required
                            >
                                <option value="">اختر الترم...</option>
                                {selectedGrade?.semesters.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                {/* Curriculum Title */}
                <div>
                    <label className="block text-sm font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">اسم المنهج</label>
                    <input
                        type="text"
                        placeholder="مثال: منهج اللغة العربية - الترم الأول"
                        value={formData.title}
                        onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                        className="w-full p-4 bg-[var(--bg-tertiary)] border-2 border-transparent focus:border-[var(--accent-primary)] rounded-2xl font-bold text-[var(--text-primary)] outline-none transition-all"
                        required
                    />
                </div>

                {/* Track Selection (Secondary only) */}
                {selectedGrade?.level === 'Secondary' && (
                    <div>
                        <label className="block text-sm font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">التخصص</label>
                        <select
                            value={formData.track}
                            onChange={(e) => setFormData(p => ({ ...p, track: e.target.value as Unit['track'] }))}
                            className="w-full p-4 bg-[var(--bg-tertiary)] border-2 border-transparent focus:border-[var(--accent-primary)] rounded-2xl font-bold text-[var(--text-primary)] outline-none appearance-none cursor-pointer transition-all"
                        >
                            <option value="All">الكل (عام)</option>
                            <option value="Scientific">علمي</option>
                            <option value="Literary">أدبي</option>
                        </select>
                    </div>
                )}

                <div className="pt-4 border-t border-[var(--border-primary)] flex justify-end">
                    <button type="submit" className="w-full sm:w-auto px-8 py-3 bg-[var(--accent-primary)] hover:bg-indigo-600 text-white rounded-2xl font-black shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2">
                        <CheckCircleIcon className="w-5 h-5" /> {unit ? 'حفظ التعديلات' : 'إضافة المنهج'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const LessonModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (data: Lesson | Omit<Lesson, 'id'>) => void; lesson: Partial<Lesson> | null; gradeName: string }> = ({ isOpen, onClose, onSave, lesson, gradeName }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState<Partial<Lesson>>({});
    const [activeTab, setActiveTab] = useState<'videos' | 'homework' | 'exam' | 'note'>('videos');
    const [quizEditorMode, setQuizEditorMode] = useState<'image' | 'mcq'>('image');
    const [aiSettings, setAiSettings] = useState({ topic: '', difficulty: 'متوسط' as 'سهل' | 'متوسط' | 'صعب', numQuestions: 5 });
    const [isGenerating, setIsGenerating] = useState(false);
    const [isVideoGenerating, setIsVideoGenerating] = useState(false);

    // Video List State
    const [videoList, setVideoList] = useState<LessonVideo[]>([]);

    useEffect(() => {
        if (isOpen) {
            const initialData = lesson ? { ...lesson } : {
                type: LessonType.EXPLANATION,
                correctAnswers: [],
                isFree: false,
                videoQuestions: [],
                videos: [],
                hasHomework: false,
                hasExam: false,
                hasSummary: false,
                isVisible: true
            };
            setFormData(initialData);
            setQuizEditorMode(initialData.quizType === QuizType.MCQ ? 'mcq' : 'image');

            if (initialData.videos && initialData.videos.length > 0) {
                setVideoList(initialData.videos);
            } else if (initialData.content && !initialData.hasSummary) {
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

    const handleAddVideo = () => setVideoList(prev => [...prev, { title: '', url: '' }]);
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
        if (!topicToUse) { addToast('الرجاء إدخال موضوع الأسئلة أو عنوان الدرس.', ToastType.ERROR); return; }
        setIsGenerating(true);
        try {
            const questions = await generateQuiz(topicToUse, gradeName, aiSettings.difficulty, aiSettings.numQuestions);
            setFormData(prev => ({ ...prev, homeworkQuestions: questions, hasHomework: true }));
            addToast(`تم توليد ${questions.length} أسئلة بنجاح.`, ToastType.SUCCESS);
        } catch (error: any) { addToast(error.message, ToastType.ERROR); } finally { setIsGenerating(false); }
    };

    const handleQuestionChange = (qIndex: number, field: keyof QuizQuestion, value: any, optIndex?: number, listKey: 'homeworkQuestions' | 'examQuestions' = 'homeworkQuestions') => {
        setFormData(prev => {
            if (!prev) return prev;
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

    const removeQuestion = (qIndex: number, listKey: 'homeworkQuestions' | 'examQuestions' = 'homeworkQuestions') => {
        setFormData(prev => ({ ...prev, [listKey]: (prev[listKey] || []).filter((_, i) => i !== qIndex) }));
    };

    const addBlankQuestion = (listKey: 'homeworkQuestions' | 'examQuestions' = 'homeworkQuestions') => {
        setFormData(prev => {
            const newQuestion: QuizQuestion = { questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0, imageUrl: '' };
            return { ...prev, [listKey]: [...(prev[listKey] || []), newQuestion] };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title?.trim()) { addToast('الرجاء إدخال عنوان الحصة.', ToastType.ERROR); return; }

        const dataToSave: Partial<Lesson> = {
            ...formData,
            videos: videoList.filter(v => v.url.trim() !== ""),
            content: videoList.length > 0 ? videoList[0].url : formData.content,
            isFree: !!formData.isFree,
            isVisible: formData.isVisible !== false,
            publishedAt: formData.publishedAt || new Date().toISOString()
        };

        onSave(dataToSave as Lesson | Omit<Lesson, 'id'>);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={formData.id ? 'تعديل الحصة' : 'إضافة حصة جديدة'} maxWidth="max-w-5xl">
            <form onSubmit={handleSubmit} className="flex flex-col h-[85vh]">
                {/* Header Info */}
                <div className="p-4 sm:p-6 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                        <div className="flex-1 space-y-2 w-full">
                            <label className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest">عنوان الحصة</label>
                            <input
                                type="text"
                                placeholder="مثال: الحصة الأولى - مقدمة في النحو"
                                value={formData.title || ''}
                                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                                className="w-full p-3 sm:p-4 bg-[var(--bg-tertiary)] rounded-2xl font-black text-base sm:text-lg outline-none border-2 border-transparent focus:border-[var(--accent-primary)] transition-all"
                                required
                            />
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 bg-[var(--bg-tertiary)] p-1.5 sm:p-2 rounded-2xl border border-[var(--border-primary)] w-full md:w-auto justify-center">
                            <button
                                type="button"
                                onClick={() => setFormData(p => ({ ...p, isFree: !p.isFree }))}
                                className={`flex-1 md:flex-none px-3 sm:px-4 py-2 rounded-xl text-sm font-black transition-all ${formData.isFree ? 'bg-amber-500 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}
                            >
                                {formData.isFree ? 'حصة مجانية' : 'حصة مدفوعة'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData(p => ({ ...p, isVisible: p.isVisible !== false ? false : true }))}
                                className={`flex-1 md:flex-none px-3 sm:px-4 py-2 rounded-xl text-sm font-black transition-all ${formData.isVisible !== false ? 'bg-emerald-500 text-white shadow-lg' : 'bg-red-500 text-white shadow-lg'}`}
                            >
                                {formData.isVisible !== false ? 'منشورة' : 'مخفية'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]/50 p-1.5 sm:p-2 gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'videos', label: 'الفيديوهات', icon: VideoCameraIcon, color: 'text-blue-500' },
                        { id: 'homework', label: 'الواجب', icon: PencilIcon, color: 'text-orange-500' },
                        { id: 'exam', label: 'الامتحان', icon: SparklesIcon, color: 'text-red-500' },
                        { id: 'note', label: 'المذكرة', icon: DocumentTextIcon, color: 'text-emerald-500' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-[11px] sm:text-sm font-black transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-[var(--bg-secondary)] text-[var(--accent-primary)] shadow-sm border border-[var(--border-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]/50'}`}
                        >
                            <tab.icon className={`w-3.5 h-3.5 sm:w-4 h-4 ${activeTab === tab.id ? 'text-[var(--accent-primary)]' : tab.color}`} />
                            {tab.label}
                            {tab.id === 'videos' && videoList.length > 0 && <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-500 text-white text-sm sm:text-sm flex items-center justify-center">{videoList.length}</span>}
                            {tab.id === 'homework' && formData.hasHomework && <CheckCircleIcon className="w-3.5 h-3.5 sm:w-4 h-4 text-emerald-500" />}
                            {tab.id === 'exam' && formData.hasExam && <CheckCircleIcon className="w-3.5 h-3.5 sm:w-4 h-4 text-emerald-500" />}
                            {tab.id === 'note' && formData.hasSummary && <CheckCircleIcon className="w-3.5 h-3.5 sm:w-4 h-4 text-emerald-500" />}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-[var(--bg-secondary)]/30">
                    {activeTab === 'videos' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                <h3 className="font-black text-[var(--text-primary)] flex items-center gap-2">فيديوهات الحصة</h3>
                                <button type="button" onClick={handleAddVideo} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                                    <PlusIcon className="w-4 h-4" /> إضافة فيديو جديد
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {videoList.map((video, idx) => (
                                    <div key={idx} className="p-3 sm:p-4 bg-[var(--bg-secondary)] rounded-2xl sm:rounded-3xl border border-[var(--border-primary)] flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center group">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm sm:text-sm shrink-0">{idx + 1}</div>
                                        <input
                                            placeholder="عنوان الفيديو (مثال: الجزء الأول)"
                                            value={video.title}
                                            onChange={e => handleVideoChange(idx, 'title', e.target.value)}
                                            className="w-full sm:flex-1 p-3 bg-[var(--bg-tertiary)] rounded-xl font-bold text-sm sm:text-sm outline-none border-2 border-transparent focus:border-blue-500"
                                        />
                                        <input
                                            placeholder="رابط الفيديو (YouTube, Mega)"
                                            value={video.url}
                                            onChange={e => handleVideoChange(idx, 'url', e.target.value)}
                                            className="w-full sm:flex-[2] p-3 bg-[var(--bg-tertiary)] rounded-xl font-mono text-sm outline-none border-2 border-transparent focus:border-blue-500"
                                            dir="ltr"
                                        />
                                        <button type="button" onClick={() => handleRemoveVideo(idx)} className="w-full sm:w-auto p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors flex justify-center"><TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'homework' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between bg-orange-500/5 p-4 rounded-3xl border border-orange-500/10">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${formData.hasHomework ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-500'}`}>
                                        <PencilIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-black text-sm text-orange-900 dark:text-orange-100">تفعيل الواجب</p>
                                        <p className="text-sm font-bold text-orange-600">سيظهر قسم الواجب للطالب في هذه الحصة.</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, hasHomework: !p.hasHomework }))}
                                    className={`w-14 h-8 rounded-full transition-all relative ${formData.hasHomework ? 'bg-orange-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${formData.hasHomework ? 'right-7' : 'right-1'}`} />
                                </button>
                            </div>

                            {formData.hasHomework && (
                                <div className="space-y-6">
                                    <div className="bg-purple-600/5 p-6 rounded-[2rem] border border-purple-600/10">
                                        <h4 className="font-black text-purple-600 mb-4 flex items-center gap-2"><SparklesIcon className="w-5 h-5" /> توليد واجب بالذكاء الاصطناعي</h4>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <input type="text" value={aiSettings.topic} onChange={e => setAiSettings(p => ({ ...p, topic: e.target.value }))} placeholder="موضوع الواجب..." className="w-full sm:flex-1 p-3 sm:p-4 bg-white dark:bg-black/20 rounded-2xl font-bold text-sm outline-none" />
                                            <button type="button" onClick={handleGenerateQuestions} disabled={isGenerating} className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-0 bg-purple-600 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-purple-700 transition-all disabled:opacity-50">{isGenerating ? 'جاري التوليد...' : 'توليد الآن'}</button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {(formData.homeworkQuestions || []).map((q, qIndex) => (
                                            <div key={qIndex} className="p-5 bg-[var(--bg-secondary)] rounded-[2rem] border border-[var(--border-primary)] relative group">
                                                <button type="button" onClick={() => removeQuestion(qIndex, 'homeworkQuestions')} className="absolute top-3 sm:top-5 left-3 sm:left-5 p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><TrashIcon className="w-4 h-4" /></button>
                                                <p className="text-sm font-black text-[var(--text-secondary)] mb-3 uppercase tracking-widest">سؤال {qIndex + 1}</p>
                                                <textarea value={q.questionText} onChange={e => handleQuestionChange(qIndex, 'questionText', e.target.value, undefined, 'homeworkQuestions')} placeholder="نص السؤال..." className="w-full p-3 sm:p-4 mb-4 bg-[var(--bg-tertiary)] rounded-2xl font-bold text-sm sm:text-sm outline-none border-2 border-transparent focus:border-orange-500" rows={2} />
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {(q.options || ['', '', '', '']).map((opt, optIndex) => (
                                                        <div key={optIndex} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${q.correctAnswerIndex === optIndex ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-[var(--bg-tertiary)]'}`}>
                                                            <input type="radio" name={`hw_q_${qIndex}`} checked={q.correctAnswerIndex === optIndex} onChange={() => handleQuestionChange(qIndex, 'correctAnswerIndex', optIndex, undefined, 'homeworkQuestions')} className="w-4 h-4 accent-emerald-500" />
                                                            <input value={opt} onChange={e => handleQuestionChange(qIndex, 'options', e.target.value, optIndex, 'homeworkQuestions')} placeholder={`خيار ${optIndex + 1}`} className="flex-1 bg-transparent text-sm font-bold outline-none" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => addBlankQuestion('homeworkQuestions')} className="w-full py-6 border-2 border-dashed border-[var(--border-primary)] rounded-[2rem] text-[var(--text-secondary)] font-black text-sm hover:bg-[var(--bg-tertiary)] transition-colors">+ إضافة سؤال يدوي</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'exam' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between bg-red-500/5 p-4 rounded-3xl border border-red-500/10">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${formData.hasExam ? 'bg-red-500 text-white' : 'bg-red-100 text-red-500'}`}>
                                        <SparklesIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-black text-sm text-red-900 dark:text-red-100">تفعيل الامتحان</p>
                                        <p className="text-sm font-bold text-red-600">سيظهر قسم الامتحان للطالب في هذه الحصة.</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, hasExam: !p.hasExam }))}
                                    className={`w-14 h-8 rounded-full transition-all relative ${formData.hasExam ? 'bg-red-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${formData.hasExam ? 'right-7' : 'right-1'}`} />
                                </button>
                            </div>

                            {formData.hasExam && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mr-2">وقت الامتحان (بالدقائق)</label>
                                            <input type="number" value={formData.timeLimit || ''} onChange={e => setFormData(p => ({ ...p, timeLimit: Number(e.target.value) }))} className="w-full p-3 sm:p-4 bg-[var(--bg-tertiary)] rounded-2xl font-black text-center outline-none border-2 border-transparent focus:border-red-500" placeholder="بلا وقت" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mr-2">درجة النجاح (%)</label>
                                            <input type="number" value={formData.passingScore || ''} onChange={e => setFormData(p => ({ ...p, passingScore: Number(e.target.value) }))} className="w-full p-3 sm:p-4 bg-[var(--bg-tertiary)] rounded-2xl font-black text-center outline-none border-2 border-transparent focus:border-red-500" placeholder="50" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {(formData.examQuestions || []).map((q, qIndex) => (
                                            <div key={qIndex} className="p-5 bg-[var(--bg-secondary)] rounded-[2rem] border border-[var(--border-primary)] relative group">
                                                <button type="button" onClick={() => removeQuestion(qIndex, 'examQuestions')} className="absolute top-3 sm:top-5 left-3 sm:left-5 p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><TrashIcon className="w-4 h-4" /></button>
                                                <p className="text-sm font-black text-[var(--text-secondary)] mb-3 uppercase tracking-widest">سؤال {qIndex + 1}</p>
                                                <textarea value={q.questionText} onChange={e => handleQuestionChange(qIndex, 'questionText', e.target.value, undefined, 'examQuestions')} placeholder="نص السؤال..." className="w-full p-3 sm:p-4 mb-4 bg-[var(--bg-tertiary)] rounded-2xl font-bold text-sm sm:text-sm outline-none border-2 border-transparent focus:border-red-500" rows={2} />
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {(q.options || ['', '', '', '']).map((opt, optIndex) => (
                                                        <div key={optIndex} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${q.correctAnswerIndex === optIndex ? 'bg-red-500/10 border border-red-500/20' : 'bg-[var(--bg-tertiary)]'}`}>
                                                            <input type="radio" name={`ex_q_${qIndex}`} checked={q.correctAnswerIndex === optIndex} onChange={() => handleQuestionChange(qIndex, 'correctAnswerIndex', optIndex, undefined, 'examQuestions')} className="w-4 h-4 accent-red-500" />
                                                            <input value={opt} onChange={e => handleQuestionChange(qIndex, 'options', e.target.value, optIndex, 'examQuestions')} placeholder={`خيار ${optIndex + 1}`} className="flex-1 bg-transparent text-sm font-bold outline-none" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => addBlankQuestion('examQuestions')} className="w-full py-6 border-2 border-dashed border-[var(--border-primary)] rounded-[2rem] text-[var(--text-secondary)] font-black text-sm hover:bg-[var(--bg-tertiary)] transition-colors">+ إضافة سؤال امتحان</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'note' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between bg-emerald-500/5 p-4 rounded-3xl border border-emerald-500/10">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${formData.hasSummary ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-500'}`}>
                                        <DocumentTextIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-black text-sm text-emerald-900 dark:text-emerald-100">تفعيل المذكرة</p>
                                        <p className="text-sm font-bold text-emerald-600">سيتمكن الطالب من تحميل أو عرض المذكرة.</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, hasSummary: !p.hasSummary }))}
                                    className={`w-14 h-8 rounded-full transition-all relative ${formData.hasSummary ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${formData.hasSummary ? 'right-7' : 'right-1'}`} />
                                </button>
                            </div>

                            {formData.hasSummary && (
                                <div className="space-y-4">
                                    <ImageUpload label="رابط ملف المذكرة (PDF)" value={formData.summaryContent || ''} onChange={url => setFormData(p => ({ ...p, summaryContent: url }))} />
                                    <div className="p-6 bg-blue-500/5 rounded-[2rem] border border-blue-500/10 text-blue-600 text-sm font-bold text-center">
                                        يفضل رفع الملف على Google Drive أو أي خدمة سحابية ووضع الرابط هنا.
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 sm:p-6 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm font-bold text-[var(--text-secondary)] text-center sm:text-right">
                        سيتم حفظ جميع التغييرات في الحصة عند الضغط على "حفظ الحصة".
                    </div>
                    <div className="flex w-full sm:w-auto gap-2 sm:gap-3">
                        <button type="button" onClick={onClose} className="flex-1 sm:flex-none px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-black text-sm sm:text-sm hover:bg-[var(--border-primary)] transition-all">إلغاء</button>
                        <button type="submit" className="flex-[2] sm:flex-none px-6 sm:px-12 py-3 sm:py-4 bg-[var(--accent-primary)] text-white rounded-xl sm:rounded-2xl font-black text-sm sm:text-sm shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 transition-all transform active:scale-95 flex items-center justify-center gap-2 sm:gap-3">
                            <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" /> حفظ الحصة
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

const getLessonIcon = (type: LessonType) => {
    switch (type) {
        case LessonType.EXPLANATION: return VideoCameraIcon;
        case LessonType.HOMEWORK: return PencilIcon;
        case LessonType.EXAM: return BookOpenIcon;
        case LessonType.SUMMARY: return DocumentTextIcon;
        default: return BookOpenIcon;
    }
}

// Memoized Lesson Item
const LessonPartItem = memo(({
    lesson,
    onEdit,
    onDelete,
    onToggleVisibility
}: {
    lesson: Lesson,
    onEdit: () => void,
    onDelete: () => void,
    onToggleVisibility: () => void
}) => {
    const isVisible = lesson.isVisible !== false;
    const videoCount = lesson.videos?.length || 0;
    const hasHomework = !!lesson.hasHomework || (lesson.type === LessonType.HOMEWORK);
    const hasExam = !!lesson.hasExam || (lesson.type === LessonType.EXAM);
    const hasSummary = !!lesson.hasSummary || (lesson.type === LessonType.SUMMARY);
    const hasVideos = !!(videoCount > 0) || (lesson.type === LessonType.EXPLANATION);

    return (
        <div className={`
            group flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border-2 transition-all duration-500 gap-4
            ${isVisible
                ? 'bg-[var(--bg-secondary)] border-[var(--border-primary)] hover:border-[var(--accent-primary)] shadow-sm hover:shadow-xl'
                : 'bg-red-500/5 border-red-500/20 opacity-80'}
        `}>
            <div className="flex items-center gap-4 sm:gap-5">
                <div className={`
                    w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner transition-all duration-500 shrink-0
                    ${isVisible
                        ? 'bg-[var(--bg-tertiary)] text-[var(--accent-primary)] group-hover:scale-110'
                        : 'bg-red-100 text-red-500'}
                `}>
                    <BookOpenIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className={`font-black text-sm sm:text-base truncate ${isVisible ? 'text-[var(--text-primary)]' : 'text-red-600'}`}>{lesson.title}</h4>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                        {hasVideos && (
                            <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-blue-500/10 text-blue-600 text-[8px] sm:text-sm font-black">
                                <VideoCameraIcon className="w-2.5 h-2.5 sm:w-3 h-3" /> {videoCount || 1} فيديو
                            </div>
                        )}
                        {hasHomework && (
                            <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-orange-500/10 text-orange-600 text-[8px] sm:text-sm font-black">
                                <PencilIcon className="w-2.5 h-2.5 sm:w-3 h-3" /> واجب
                            </div>
                        )}
                        {hasExam && (
                            <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-red-500/10 text-red-600 text-[8px] sm:text-sm font-black">
                                <SparklesIcon className="w-2.5 h-2.5 sm:w-3 h-3" /> امتحان
                            </div>
                        )}
                        {hasSummary && (
                            <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-[8px] sm:text-sm font-black">
                                <DocumentTextIcon className="w-2.5 h-2.5 sm:w-3 h-3" /> مذكرة
                            </div>
                        )}
                        {lesson.isFree && <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-amber-500/10 text-amber-600 text-[8px] sm:text-sm font-black">مجاني</span>}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-2 sm:gap-2">
                <button
                    onClick={onToggleVisibility}
                    className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all duration-300 shadow-sm ${isVisible ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white' : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'}`}
                    title={isVisible ? 'إغلاق الحصة' : 'فتح الحصة'}
                >
                    {isVisible ? <EyeIcon className="w-4 h-4 sm:w-5 h-5" /> : <EyeSlashIcon className="w-4 h-4 sm:w-5 h-5" />}
                </button>
                <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 sm:translate-x-2 sm:group-hover:translate-x-0">
                    <button onClick={onEdit} className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-amber-500 hover:text-white transition-all shadow-sm">
                        <PencilIcon className="w-4 h-4 sm:w-5 h-5" />
                    </button>
                    <button onClick={onDelete} className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-red-500 hover:text-white transition-all shadow-sm">
                        <TrashIcon className="w-4 h-4 sm:w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
});

// Memoized Unit Item
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

    // Use simple grouping
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

    const totalCount = lessonsForUnit.length;

    return (
        <div className={`
            bg-[var(--bg-secondary)] rounded-[2rem] sm:rounded-[2.5rem] border transition-all duration-500 overflow-hidden
            ${expanded ? 'border-[var(--accent-primary)] shadow-2xl scale-[1.01]' : 'border-[var(--border-primary)] shadow-sm hover:shadow-md'}
        `}>
            <header onClick={onToggle} className="p-4 sm:p-6 cursor-pointer select-none flex justify-between items-center group">
                <div className="flex items-center gap-4 sm:gap-5">
                    <div className={`
                        w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shadow-lg transition-all duration-500 shrink-0
                        ${expanded ? 'bg-[var(--accent-primary)] text-white rotate-6' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] group-hover:bg-indigo-50 group-hover:text-indigo-600'}
                    `}>
                        {totalCount}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl font-black text-[var(--text-primary)] mb-0.5 sm:mb-1 truncate">{unit.title}</h3>
                        <p className="text-sm sm:text-sm font-bold text-[var(--text-secondary)] opacity-60 uppercase tracking-widest">{expanded ? 'عرض الحصص' : 'اضغط لعرض محتوى المنهج'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {isAdmin && (
                        <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setOptionsMenuUnitId(p => p === unit.id ? null : unit.id); }} className="p-3 rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors active:scale-90"><DotsVerticalIcon className="w-6 h-6" /></button>
                            {optionsMenuUnitId === unit.id && (
                                <div ref={optionsMenuRef} className="absolute top-full left-0 mt-2 w-48 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl z-30 overflow-hidden animate-slide-up">
                                    <button onClick={() => { openModal('edit-unit', { unit }); setOptionsMenuUnitId(null); }} className="w-full text-right px-5 py-4 text-sm font-bold hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2">
                                        <PencilIcon className="w-4 h-4" /> تعديل المنهج
                                    </button>
                                    <div className="h-px bg-[var(--border-primary)]"></div>
                                    <button onClick={() => { openModal('delete-unit', { unit }); setOptionsMenuUnitId(null); }} className="w-full text-right px-5 py-4 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2">
                                        <TrashIcon className="w-4 h-4" /> حذف المنهج
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    <ChevronDownIcon className={`w-6 h-6 text-[var(--text-secondary)] transition-transform duration-500 ${expanded ? 'rotate-180' : ''}`} />
                </div>
            </header>

            <div className={`transition-all duration-500 ease-in-out ${expanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-4 sm:p-6 pt-0 border-t border-[var(--border-primary)] border-dashed">
                    {isLoadingLessons ? (
                        <div className="flex justify-center py-10"><Loader /></div>
                    ) : lessonsForUnit.length === 0 ? (
                        <div className="text-center py-10 sm:py-12 bg-[var(--bg-tertiary)] rounded-2xl border-2 border-dashed border-[var(--border-primary)] opacity-60 my-4 sm:my-6">
                            <BookOpenIcon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-[var(--text-secondary)] mb-3 sm:mb-4" />
                            <p className="font-bold text-[var(--text-secondary)] text-sm sm:text-base">لا توجد حصص مضافة بعد.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:gap-4 py-4 sm:py-6">
                            {lessonsForUnit
                                .sort((a, b) => a.title.localeCompare(b.title, 'ar'))
                                .map(l => (
                                    <LessonPartItem
                                        key={l.id} lesson={l}
                                        onEdit={() => openModal('edit-lesson', { unit, lesson: l })}
                                        onDelete={() => openModal('delete-lesson', { unit, lesson: l })}
                                        onToggleVisibility={() => onToggleLessonVisibility(l)}
                                    />
                                ))}
                        </div>
                    )}

                    <button
                        onClick={() => openModal('add-lesson', { unit, lesson: { type: LessonType.EXPLANATION } })}
                        className="w-full py-3.5 sm:py-4 rounded-2xl border-2 border-dashed border-indigo-400 text-indigo-500 font-black text-sm sm:text-sm hover:bg-indigo-50 hover:border-solid transition-all flex items-center justify-center gap-2 group mt-2 sm:mt-4"
                    >
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                            <PlusIcon className="w-4 h-4 sm:w-5 h-5" />
                        </div>
                        <span>إضافة درس جديد</span>
                    </button>
                </div>
            </div>
        </div>
    );
});

const ContentManagementView: React.FC = () => {
    const [dataVersion, setDataVersion] = useState(0);
    const { addToast } = useToast();
    const { setRefreshPaused } = useContext(AppLifecycleContext);
    const { currentUser } = useSession();
    const isAdmin = currentUser?.role === Role.ADMIN;
    const [modalState, setModalState] = useState<{ type: string | null; data: any }>({ type: null, data: {} });
    const [grades, setGrades] = useState<Grade[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [selectedGradeId, setSelectedGradeId] = useState<string>('');
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
    const [units, setUnits] = useState<Unit[]>([]);
    const [lessonsMap, setLessonsMap] = useState<Record<string, Lesson[]>>({});
    const [isLoadingUnits, setIsLoadingUnits] = useState(false);
    const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
    const [loadingLessons, setLoadingLessons] = useState<Set<string>>(new Set());
    const [optionsMenuUnitId, setOptionsMenuUnitId] = useState<string | null>(null);
    const optionsMenuRef = useRef<HTMLDivElement>(null);

    const refreshData = useCallback(() => setDataVersion(v => v + 1), []);

    const closeModal = useCallback(() => {
        setRefreshPaused(false);
        setModalState({ type: null, data: {} });
    }, [setRefreshPaused]);

    const openModal = useCallback((type: string, data = {}) => {
        setRefreshPaused(true);
        setModalState({ type, data });
    }, [setRefreshPaused]);

    useEffect(() => {
        const fetchData = async () => {
            const [gradesData, teachersData] = await Promise.all([getAllGrades(), getAllTeachers()]);
            setGrades(gradesData);
            setTeachers(teachersData);
            if (gradesData.length > 0) {
                if (!selectedGradeId) setSelectedGradeId(gradesData[0].id.toString());
                if (!selectedSemesterId) setSelectedSemesterId(gradesData[0].semesters[0]?.id || '');
            }
        };
        fetchData();
    }, [dataVersion]);

    useEffect(() => {
        if (selectedGradeId && selectedSemesterId) {
            const fetchUnits = async () => {
                setIsLoadingUnits(true);
                const fetchedUnits = await getUnitsForSemester(parseInt(selectedGradeId), selectedSemesterId);
                setUnits(fetchedUnits);
                setIsLoadingUnits(false);

                // If we have an expanded unit, refetch its lessons to keep UI fresh
                if (expandedUnitId) {
                    const fetchedLessons = await getLessonsByUnit(expandedUnitId);
                    setLessonsMap(prev => ({ ...prev, [expandedUnitId]: fetchedLessons }));
                }
            };
            fetchUnits();
        } else {
            setUnits([]);
        }
    }, [selectedGradeId, selectedSemesterId, dataVersion, expandedUnitId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
                setOptionsMenuUnitId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedGrade = useMemo(() => grades.find(g => g.id.toString() === selectedGradeId), [grades, selectedGradeId]);
    const selectedSemester = useMemo(() => selectedGrade?.semesters.find(s => s.id === selectedSemesterId), [selectedGrade, selectedSemesterId]);
    const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);

    const handleToggleExpand = useCallback(async (unitId: string) => {
        const newExpandedId = expandedUnitId === unitId ? null : unitId;
        setExpandedUnitId(newExpandedId);
        if (newExpandedId && selectedGradeId && selectedSemesterId) {
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
    }, [expandedUnitId, selectedGradeId, selectedSemesterId, addToast]);

    const handleSaveUnit = useCallback(async (unitData: Partial<Unit>, gradeId?: string, semesterId?: string) => {
        const targetGradeId = gradeId ? parseInt(gradeId) : selectedGrade?.id;
        const targetSemesterId = semesterId || selectedSemester?.id;

        if (targetGradeId && targetSemesterId) {
            try {
                if (modalState.data.unit?.id) {
                    await updateUnit(targetGradeId, targetSemesterId, { ...modalState.data.unit, ...unitData } as Unit);
                    addToast('تم تعديل المنهج!', ToastType.SUCCESS);
                } else {
                    await addUnitToSemester(targetGradeId, targetSemesterId, { ...unitData, teacherId: unitData.teacherId! } as Omit<Unit, 'id' | 'lessons'>);
                    addToast('تمت إضافة المنهج بنجاح!', ToastType.SUCCESS);
                }
                refreshData();
                closeModal();
            } catch (error: any) {
                addToast(`فشل حفظ المنهج: ${error.message}`, ToastType.ERROR);
            }
        }
    }, [addToast, closeModal, modalState.data, refreshData, selectedGrade, selectedSemester]);

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
                    const { error } = await addLessonToUnit(selectedGrade.id, selectedSemester.id, unit.id, lessonData, unit.teacherId);
                    if (error) throw error;
                    addToast('تمت إضافة الدرس', ToastType.SUCCESS);
                }
                refreshData();
                closeModal();
            } catch (error: any) {
                addToast(`فشل حفظ الدرس: ${error.message}`, ToastType.ERROR);
            }
        }
    }, [addToast, closeModal, modalState.data, refreshData, selectedGrade, selectedSemester]);

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
        if (!selectedGrade || !selectedSemester) return;

        const newVisibility = lesson.isVisible !== false ? false : true;
        const newLessonState: Lesson = { ...lesson, isVisible: newVisibility };

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

            addToast(newVisibility ? 'تم فتح الحصة للطلاب' : 'تم إغلاق الحصة', ToastType.SUCCESS);
        } catch (error: any) {
            addToast(`فشل تغيير حالة الحصة: ${error.message}`, ToastType.ERROR);
        }
    }, [selectedGrade, selectedSemester, addToast]);

    return (
        <div className="space-y-6 sm:space-y-8 fade-in pb-20">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 sm:mb-6 gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">إدارة المنهج</h1>
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-1 font-bold">تنظيم الوحدات والدروس لجميع المراحل.</p>
                </div>
            </div>
            <div className="bg-[var(--bg-secondary)] p-4 sm:p-6 rounded-[2rem] sm:rounded-3xl border border-[var(--border-primary)] shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm sm:text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 mr-2">الصف الدراسي</label>
                        <div className="relative">
                            <select
                                value={selectedGradeId}
                                onChange={(e) => {
                                    const newGradeId = e.target.value;
                                    setSelectedGradeId(newGradeId);
                                    const newGrade = grades.find(g => g.id.toString() === newGradeId);
                                    setSelectedSemesterId(newGrade?.semesters[0]?.id || '');
                                    setExpandedUnitId(null);
                                }}
                                className="w-full p-3.5 sm:p-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-2xl font-bold text-sm sm:text-base text-[var(--text-primary)] focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
                            >
                                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                            <ChevronDownIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 h-5 opacity-70 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm sm:text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 mr-2">الفصل الدراسي</label>
                        <div className="relative">
                            <select
                                value={selectedSemesterId}
                                onChange={(e) => { setSelectedSemesterId(e.target.value); setExpandedUnitId(null); }}
                                disabled={!selectedGrade}
                                className="w-full p-3.5 sm:p-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-2xl font-bold text-sm sm:text-base text-[var(--text-primary)] focus:ring-2 focus:ring-purple-500 outline-none appearance-none disabled:opacity-50"
                            >
                                {selectedGrade?.semesters.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                            <ChevronDownIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 h-5 opacity-70 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="space-y-4">
                {isLoadingUnits ? (
                    <div className="flex justify-center items-center py-20"><Loader /></div>
                ) : units.length > 0 ? (
                    units.map(unit => (
                        <UnitItem
                            key={unit.id}
                            unit={unit}
                            teacherName={teacherMap.get(unit.teacherId) || 'غير محدد'}
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
                    <div className="text-center py-20 sm:py-32 bg-[var(--bg-secondary)] rounded-[2rem] sm:rounded-[3rem] border-2 border-dashed border-[var(--border-primary)] opacity-60">
                        <BookOpenIcon className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-[var(--text-secondary)]" />
                        <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">لا توجد مناهج</h3>
                        <p className="text-sm sm:text-sm font-bold text-[var(--text-secondary)]">لم يتم إضافة أي مناهج دراسية لهذا الصف بعد.</p>
                    </div>
                )}
            </div>
            {isAdmin && !isLoadingUnits && (
                <button
                    onClick={() => openModal('add-unit', { grade: selectedGrade, semester: selectedSemester })}
                    className="w-full p-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl font-black text-base sm:text-lg shadow-xl shadow-purple-500/30 transition-all transform hover:scale-[1.01] flex items-center justify-center gap-3 active:scale-95"
                >
                    <PlusIcon className="w-5 h-5 sm:w-6 h-6" />
                    <span>إضافة منهج جديد</span>
                </button>
            )}
            <UnitModal
                isOpen={['add-unit', 'edit-unit'].includes(modalState.type || '')}
                onClose={closeModal}
                onSave={handleSaveUnit}
                unit={modalState.data.unit}
                teachers={teachers}
                grades={grades}
                initialGradeId={selectedGradeId}
                initialSemesterId={selectedSemesterId}
            />
            <LessonModal isOpen={['add-lesson', 'edit-lesson'].includes(modalState.type || '')} onClose={closeModal} onSave={handleSaveLesson} lesson={modalState.data.lesson} gradeName={selectedGrade?.name || ''} />
            <ConfirmationModal isOpen={modalState.type === 'delete-unit'} onClose={closeModal} onConfirm={handleDeleteUnit} title="تأكيد حذف المنهج" message={`هل أنت متأكد من حذف منهج "${modalState.data.unit?.title}" وكل دروسه؟`} />
            <ConfirmationModal isOpen={modalState.type === 'delete-lesson'} onClose={closeModal} onConfirm={handleDeleteLesson} title="تأكيد حذف الدرس" message={`هل أنت متأكد من حذف درس "${modalState.data.lesson?.title}"؟`} />
        </div>
    );
};

export default ContentManagementView;
