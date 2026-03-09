
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Teacher, ToastType } from '../../types';
import { getAllTeachers, deleteTeacher } from '../../services/teacherService';
import { getAllGrades, getUserByTeacherId } from '../../services/storageService';
import { useToast } from '../../useToast';
import { PlusIcon, UsersSolidIcon, SearchIcon, PencilIcon, TrashIcon, BookOpenIcon, UserCircleIcon, CheckCircleIcon, SmartphoneIcon } from '../common/Icons';
import Loader from '../common/Loader';
import TeacherModal from './TeacherModal';
import Modal from '../common/Modal';

const TeacherCard: React.FC<{ teacher: Teacher; onEdit: () => void; onDelete: () => void; }> = ({ teacher, onEdit, onDelete }) => {
    return (
        <div className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-indigo-500/30 overflow-hidden">
            {/* Matte Gradient Background Shape */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-[5rem] transition-all duration-700 group-hover:bg-indigo-500/10"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
                <div className="relative mb-4">
                    <div className="w-24 h-24 rounded-[2rem] p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner group-hover:rotate-3 transition-transform duration-500">
                        <div className="w-full h-full rounded-[1.8rem] overflow-hidden bg-white dark:bg-slate-900">
                            {teacher.imageUrl ? (
                                <img src={teacher.imageUrl} alt={teacher.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <UserCircleIcon className="w-12 h-12" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900">
                        <CheckCircleIcon className="w-4 h-4" />
                    </div>
                </div>

                <h3 className="font-black text-lg text-slate-800 dark:text-white mb-1 line-clamp-1">{teacher.name}</h3>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 rounded-full text-sm font-black text-indigo-600 uppercase tracking-widest border border-indigo-500/10 mb-6">
                    <BookOpenIcon className="w-3 h-3" />
                    {teacher.subject}
                </div>

                <div className="w-full grid grid-cols-2 gap-3 mb-6">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">الصفوف</span>
                        <span className="text-sm font-black text-indigo-600">{teacher.teachingGrades?.length || 0}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">المراحل</span>
                        <span className="text-sm font-black text-indigo-600">{teacher.teachingLevels?.length || 0}</span>
                    </div>
                </div>

                {teacher.phone && (
                    <div className="flex items-center gap-2 mb-6 text-sm font-bold text-slate-500 opacity-60">
                        <SmartphoneIcon className="w-3 h-3"/>
                        <span dir="ltr">{teacher.phone}</span>
                    </div>
                )}

                <div className="flex gap-2 w-full pt-5 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={onEdit} className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white transition-all text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 text-slate-600 dark:text-slate-300">
                        <PencilIcon className="w-3.5 h-3.5"/> تعديل
                    </button>
                    <button onClick={onDelete} className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-500/10">
                        <TrashIcon className="w-5 h-5"/>
                    </button>
                </div>
            </div>
        </div>
    );
};

const TeacherManagementView: React.FC = () => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [allGrades, setAllGrades] = useState<{ id: number; name: string; level: 'Middle' | 'Secondary' }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalState, setModalState] = useState<{ type: 'add' | 'edit' | null, teacher: any | null }>({ type: null, teacher: null });
    const [searchQuery, setSearchQuery] = useState('');
    const { addToast } = useToast();
    
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [teachersData, gradesData] = await Promise.all([
                getAllTeachers(),
                getAllGrades()
            ]);
            setTeachers(teachersData);
            setAllGrades(gradesData.map(g => ({ id: g.id, name: g.name, level: g.level })));
        } catch (error) {
            console.error("Error fetching teachers:", error);
            addToast("فشل تحميل قائمة المدرسين.", ToastType.ERROR);
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredTeachers = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return teachers.filter(t => 
            t.name.toLowerCase().includes(query) || 
            t.subject.toLowerCase().includes(query) ||
            t.email?.toLowerCase().includes(query)
        );
    }, [teachers, searchQuery]);

    const handleEdit = async (teacher: Teacher) => {
        setIsLoading(true);
        try {
            const userProfile = await getUserByTeacherId(teacher.id);
            // Fix: Prioritize data from teacher object (from DB) if profile is missing
            setModalState({ 
                type: 'edit', 
                teacher: { 
                    ...teacher, 
                    email: userProfile?.email || teacher.email, 
                    phone: userProfile?.phone || teacher.phone 
                } 
            });
        } catch (e) {
            setModalState({ type: 'edit', teacher });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fade-in space-y-8 pb-32 max-w-7xl mx-auto px-2">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900 p-8 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none"></div>
                <div className="relative z-10">
                    <h1 className="text-4xl font-black tracking-tight">إدارة الهيئة التعليمية</h1>
                    <p className="text-indigo-200/60 font-bold mt-2">إجمالي الكادر: {teachers.length} مدرس</p>
                </div>
                <button 
                    onClick={() => setModalState({ type: 'add', teacher: null })} 
                    className="relative z-10 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-[2rem] font-black text-sm shadow-xl active:scale-95 transition-all flex items-center gap-3"
                >
                    <PlusIcon className="w-6 h-6"/> إضافة مدرس للمنصة
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative group max-w-2xl mx-auto">
                <input 
                    type="text" 
                    placeholder="ابحث باسم المدرس، المادة أو البريد..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[2rem] py-5 pr-14 pl-6 font-bold text-md focus:border-indigo-500 outline-none transition-all shadow-sm placeholder:text-slate-400" 
                />
                <SearchIcon className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>

            {/* Content Area */}
            {isLoading && teachers.length === 0 ? (
                <div className="flex justify-center py-40"><Loader /></div>
            ) : filteredTeachers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredTeachers.map(t => (
                        <TeacherCard 
                            key={t.id} 
                            teacher={t} 
                            onEdit={() => handleEdit(t)} 
                            onDelete={async () => {
                                if(confirm(`هل أنت متأكد من حذف حساب المدرس "${t.name}" نهائياً؟`)) {
                                    await deleteTeacher(t.id);
                                    addToast("تم حذف المدرس.", ToastType.SUCCESS);
                                    fetchData();
                                }
                            }} 
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-40 bg-slate-50 dark:bg-slate-900/50 rounded-[3.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <UsersSolidIcon className="w-20 h-20 mx-auto text-slate-300 mb-6" />
                    <h3 className="text-2xl font-black text-slate-400">لا توجد نتائج مطابقة</h3>
                </div>
            )}

            {modalState.type && (
                <TeacherModal 
                    isOpen={true} 
                    onClose={() => setModalState({ type: null, teacher: null })} 
                    onSaveSuccess={() => { 
                        setModalState({ type: null, teacher: null }); 
                        fetchData(); 
                    }}
                    teacher={modalState.teacher}
                    allGrades={allGrades}
                />
            )}
        </div>
    );
};

export default TeacherManagementView;
