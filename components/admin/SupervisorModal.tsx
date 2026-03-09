
import React, { useState, useEffect } from 'react';
import { SupervisorProfile, Teacher, ToastType } from '../../types';
import { createSupervisorAccount, updateSupervisor } from '../../services/supervisorService';
import { useToast } from '../../useToast';
import Modal from '../common/Modal';
import { UserCircleIcon, EnvelopeIcon, PhoneIcon, KeyIcon, UsersIcon, CheckCircleIcon, ShieldExclamationIcon, SearchIcon } from '../common/Icons';

interface SupervisorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    supervisor: SupervisorProfile | null;
    allTeachers: Teacher[];
}

const SupervisorModal: React.FC<SupervisorModalProps> = ({ isOpen, onClose, onSaveSuccess, supervisor, allTeachers }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
    const [teacherSearch, setTeacherSearch] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    
    useEffect(() => {
        if (isOpen) {
            setError('');
            if (supervisor) {
                setFormData({
                    name: supervisor.name || '',
                    email: supervisor.email || '',
                    phone: supervisor.phone?.replace('+20', '') || '',
                    password: ''
                });
                setSelectedTeacherIds(supervisor.supervisor_teachers?.map(st => st.teachers.id) || []);
            } else {
                setFormData({ name: '', email: '', phone: '', password: '' });
                setSelectedTeacherIds([]);
            }
        }
    }, [supervisor, isOpen]);

    const handleTeacherToggle = (teacherId: string) => {
        setSelectedTeacherIds(prev => 
            prev.includes(teacherId) ? prev.filter(id => id !== teacherId) : [...prev, teacherId]
        );
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const filteredTeachers = allTeachers.filter(t => 
        t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
        t.subject.toLowerCase().includes(teacherSearch.toLowerCase())
    );
    
    const handleSave = async () => {
        setError('');
        if (!formData.name.trim() || !formData.email.trim()) {
            setError('الاسم والبريد الإلكتروني حقول مطلوبة.');
            return;
        }
        if (!supervisor && !formData.password.trim()) {
            setError('كلمة المرور مطلوبة للمشرف الجديد.');
            return;
        }

        setIsSaving(true);
        try {
            let result;
            if (supervisor) {
                result = await updateSupervisor(supervisor.id, { 
                    name: formData.name, 
                    email: formData.email, 
                    teacherIds: selectedTeacherIds,
                    password: formData.password
                });
            } else {
                result = await createSupervisorAccount({ 
                    ...formData, 
                    teacherIds: selectedTeacherIds 
                });
            }

            if (!result.success) throw result.error;

            addToast(supervisor ? 'تم تحديث بيانات المشرف!' : 'تم إنشاء حساب المشرف بنجاح!', ToastType.SUCCESS);
            onSaveSuccess();

        } catch (error: any) {
            setError(error.message);
            addToast(`حدث خطأ: ${error.message}`, ToastType.ERROR);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={supervisor ? 'تعديل بيانات المشرف' : 'إضافة مشرف جديد'} maxWidth="max-w-2xl">
            <div className="space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar p-1">
                
                {/* Basic Info Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-sm font-black uppercase tracking-widest text-[var(--text-secondary)] mr-2">الاسم الكامل</label>
                        <div className="relative">
                            <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-4 pr-12 bg-[var(--bg-tertiary)] border-2 border-transparent focus:border-purple-500 rounded-2xl font-bold transition-all outline-none" placeholder="أدخل اسم المشرف..." />
                            <UserCircleIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-60"/>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-black uppercase tracking-widest text-[var(--text-secondary)] mr-2">البريد الإلكتروني</label>
                        <div className="relative">
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-4 pr-12 bg-[var(--bg-tertiary)] border-2 border-transparent focus:border-purple-500 rounded-2xl font-bold transition-all outline-none dir-ltr" dir="ltr" placeholder="supervisor@school.com" />
                            <EnvelopeIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-60"/>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-black uppercase tracking-widest text-[var(--text-secondary)] mr-2">رقم الهاتف (اختياري)</label>
                        <div className="relative">
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-4 pr-12 bg-[var(--bg-tertiary)] border-2 border-transparent focus:border-purple-500 rounded-2xl font-bold transition-all outline-none dir-ltr" dir="ltr" placeholder="01XXXXXXXXX" />
                            <PhoneIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-60"/>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-black uppercase tracking-widest text-[var(--text-secondary)] mr-2">كلمة المرور {!supervisor && <span className="text-red-500">*</span>}</label>
                        <div className="relative">
                            <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder={supervisor ? "اتركها فارغة لعدم التغيير" : "كلمة المرور للمشرف"} className="w-full p-4 pr-12 bg-[var(--bg-tertiary)] border-2 border-transparent focus:border-purple-500 rounded-2xl font-bold transition-all outline-none" />
                            <KeyIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-60"/>
                        </div>
                    </div>
                </div>

                {/* Teacher Linking Section */}
                <div className="bg-[var(--bg-tertiary)] p-6 rounded-[2.5rem] border border-[var(--border-primary)]">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                        <h3 className="font-black text-sm uppercase tracking-widest text-purple-600 flex items-center gap-2">
                            <UsersIcon className="w-5 h-5"/> ربط المدرسين المشرف عليهم
                        </h3>
                        <div className="relative w-full sm:w-48">
                            <input 
                                type="text" 
                                placeholder="بحث..." 
                                value={teacherSearch}
                                onChange={e => setTeacherSearch(e.target.value)}
                                className="w-full py-1.5 pr-8 pl-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-sm font-bold outline-none"
                            />
                            <SearchIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-70" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {filteredTeachers.map(teacher => (
                            <button
                                key={teacher.id}
                                onClick={() => handleTeacherToggle(teacher.id)}
                                className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-right group ${
                                    selectedTeacherIds.includes(teacher.id) 
                                        ? 'bg-purple-600 border-purple-600 text-white shadow-md' 
                                        : 'bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-purple-300'
                                }`}
                            >
                                <div className={`w-10 h-10 rounded-xl overflow-hidden bg-[var(--bg-tertiary)] border-2 transition-all ${selectedTeacherIds.includes(teacher.id) ? 'border-white/20' : 'border-transparent'}`}>
                                    <img src={teacher.imageUrl || 'https://via.placeholder.com/40'} className="w-full h-full object-cover" alt="T" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-sm truncate leading-tight">{teacher.name}</p>
                                    <p className={`text-sm font-bold mt-0.5 ${selectedTeacherIds.includes(teacher.id) ? 'text-white/70' : 'text-[var(--text-secondary)] opacity-60'}`}>{teacher.subject}</p>
                                </div>
                                {selectedTeacherIds.includes(teacher.id) && <CheckCircleIcon className="w-5 h-5 text-white" />}
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

            {/* Footer */}
            <div className="flex justify-end pt-6 border-t border-[var(--border-primary)] mt-8">
                <button 
                    onClick={handleSave} 
                    disabled={isSaving} 
                    className="px-12 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-sm shadow-xl shadow-indigo-500/30 transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                    {isSaving ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircleIcon className="w-5 h-5"/>}
                    <span>{supervisor ? 'حفظ التعديلات' : 'تفعيل حساب المشرف'}</span>
                </button>
            </div>
        </Modal>
    );
};

export default SupervisorModal;
