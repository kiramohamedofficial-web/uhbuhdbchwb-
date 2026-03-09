
import React, { useState, useEffect } from 'react';
import { Teacher, ToastType } from '../../types';
import { createTeacher, updateTeacher } from '../../services/teacherService';
import { useToast } from '../../useToast';
import Modal from '../common/Modal';
import ImageUpload from '../common/ImageUpload';
import { UserIcon, EnvelopeIcon, PhoneIcon, KeyIcon, BookOpenIcon, CheckCircleIcon, InformationCircleIcon, ShieldExclamationIcon } from '../common/Icons';

interface TeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    teacher: (Teacher & { email?: string, phone?: string }) | null;
    allGrades: { id: number; name: string; level: 'Middle' | 'Secondary' }[];
}

const TeacherModal: React.FC<TeacherModalProps> = ({ isOpen, onClose, onSaveSuccess, teacher, allGrades }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', password: '',
        subject: '', imageUrl: '',
        teachingLevels: [] as string[],
        teachingGrades: [] as number[],
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setError('');
            if (teacher) {
                setFormData({
                    name: teacher.name || '',
                    email: teacher.email || '',
                    phone: teacher.phone?.replace('+20', '') || '',
                    password: '',
                    subject: teacher.subject || '',
                    imageUrl: teacher.imageUrl || '',
                    teachingLevels: teacher.teachingLevels || [],
                    teachingGrades: teacher.teachingGrades || [],
                });
            } else {
                setFormData({
                    name: '', email: '', phone: '', password: '',
                    subject: '', imageUrl: '',
                    teachingLevels: [], teachingGrades: [],
                });
            }
        }
    }, [teacher, isOpen]);

    const handleGradeToggle = (gradeId: number) => {
        setFormData(prev => ({
            ...prev,
            teachingGrades: prev.teachingGrades.includes(gradeId)
                ? prev.teachingGrades.filter(id => id !== gradeId)
                : [...prev.teachingGrades, gradeId]
        }));
    };

    const handleLevelToggle = (level: string) => {
         setFormData(prev => ({
            ...prev,
            teachingLevels: prev.teachingLevels.includes(level)
                ? prev.teachingLevels.filter(l => l !== level)
                : [...prev.teachingLevels, level]
        }));
    };

    const handleSave = async () => {
        setError('');
        if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim()) {
            setError('الاسم والبريد والمادة حقول إجبارية.');
            return;
        }
        if (!teacher && !formData.password) {
            setError('كلمة المرور مطلوبة لإنشاء حساب جديد.');
            return;
        }

        setIsSaving(true);
        try {
            let res;
            if (teacher) {
                res = await updateTeacher(teacher.id, formData);
            } else {
                res = await createTeacher(formData);
            }

            if (res.success) {
                addToast(teacher ? "تم تحديث البيانات بنجاح" : "تم إضافة المدرس بنجاح", ToastType.SUCCESS);
                onSaveSuccess();
            } else {
                const errorMsg = res.error?.message || "فشلت عملية الحفظ. تأكد من البيانات.";
                setError(errorMsg);
                addToast(errorMsg, ToastType.ERROR);
            }
        } catch (e: any) {
            console.error("Save Error:", e);
            setError(e.message || "حدث خطأ غير متوقع أثناء الحفظ.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={teacher ? 'تعديل بيانات المدرس' : 'إضافة مدرس جديد'} maxWidth="max-w-4xl">
            <div className="flex flex-col lg:flex-row gap-8 max-h-[75vh] overflow-y-auto custom-scrollbar p-1">
                
                {/* Left Side: Avatar & Config */}
                <div className="lg:w-1/3 space-y-6">
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 text-center">
                        <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-white dark:border-slate-900 shadow-xl mb-4 bg-slate-200 dark:bg-slate-700">
                            {formData.imageUrl ? (
                                <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Profile" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <UserIcon className="w-12 h-12" />
                                </div>
                            )}
                        </div>
                        <ImageUpload label="تغيير الصورة" value={formData.imageUrl} onChange={v => setFormData({...formData, imageUrl: v})} />
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                            <BookOpenIcon className="w-4 h-4 text-indigo-500"/> المراحل الدراسية
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {['Preparatory', 'Secondary'].map(level => (
                                <button key={level} onClick={() => handleLevelToggle(level)} className={`py-3 rounded-xl text-sm font-black transition-all border-2 ${formData.teachingLevels.includes(level) ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'}`}>
                                    {level === 'Preparatory' ? 'إعدادي' : 'ثانوي'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side: Inputs & Grades */}
                <div className="lg:w-2/3 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-sm font-black uppercase tracking-widest text-slate-500 mr-2">الاسم بالكامل <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 pr-12 bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold transition-all outline-none" placeholder="أدخل اسم المدرس..." />
                                <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-60"/>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-black uppercase tracking-widest text-slate-500 mr-2">المادة <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <input type="text" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full p-4 pr-12 bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold transition-all outline-none" placeholder="مثال: الرياضيات" />
                                <BookOpenIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-60"/>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-black uppercase tracking-widest text-slate-500 mr-2">البريد الإلكتروني <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 pr-12 bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold transition-all outline-none text-left" dir="ltr" placeholder="teacher@gstudent.app" />
                                <EnvelopeIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-60"/>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-black uppercase tracking-widest text-slate-500 mr-2">رقم الهاتف (اختياري)</label>
                            <div className="relative">
                                <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-4 pr-12 bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold transition-all outline-none text-left" dir="ltr" placeholder="01XXXXXXXXX" />
                                <PhoneIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-60"/>
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-black uppercase tracking-widest text-slate-500 mr-2">كلمة المرور {!teacher && <span className="text-red-500">*</span>}</label>
                            <div className="relative">
                                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={teacher ? "اتركها فارغة لعدم التغيير" : "أدخل كلمة المرور..."} className="w-full p-4 pr-12 bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold transition-all outline-none" />
                                <KeyIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-60"/>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-inner">
                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">تعيين الصفوف الدراسية</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {allGrades.map(grade => (
                                <button key={grade.id} onClick={() => handleGradeToggle(grade.id)} className={`py-2 px-3 rounded-xl text-sm font-bold transition-all border-2 ${formData.teachingGrades.includes(grade.id) ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-purple-300'}`}>
                                    {grade.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 text-sm font-black text-center flex items-center justify-center gap-2 animate-shake">
                            <ShieldExclamationIcon className="w-5 h-5" />
                            {error}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-slate-100 dark:border-slate-800 mt-6 gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-400 font-bold">
                    <InformationCircleIcon className="w-4 h-4"/>
                    رقم الهاتف اختياري، سيتم استخدام بريد المدرس لتسجيل الدخول.
                </div>
                <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto px-12 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                    {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircleIcon className="w-5 h-5"/>}
                    <span>{teacher ? 'حفظ التعديلات' : 'إنشاء حساب المدرس'}</span>
                </button>
            </div>
        </Modal>
    );
};

export default TeacherModal;
