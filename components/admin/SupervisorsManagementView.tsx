
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SupervisorProfile, Teacher, ToastType } from '../../types';
import { fetchAllSupervisors, deleteSupervisor, getStaffStats } from '../../services/supervisorService';
import { getAllTeachers } from '../../services/teacherService';
import { useToast } from '../../useToast';
import {
    PlusIcon, UsersSolidIcon, SearchIcon, TrashIcon, PencilIcon,
    ShieldCheckIcon, UserCircleIcon, ShieldExclamationIcon,
    ChevronLeftIcon, ClockIcon, StarIcon, BookOpenIcon, UserIcon
} from '../common/Icons';
import Loader from '../common/Loader';
import SupervisorModal from './SupervisorModal';
import Modal from '../common/Modal';

const SupervisorCard: React.FC<{
    supervisor: SupervisorProfile;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ supervisor, onEdit, onDelete }) => {
    const teacherCount = (supervisor.supervisor_teachers || []).length;

    return (
        <div className="group bg-[var(--bg-secondary)] rounded-[2.5rem] shadow-sm border border-[var(--border-primary)] p-7 transition-all duration-500 hover:shadow-2xl hover:border-indigo-400 animate-slide-up relative overflow-hidden h-full flex flex-col justify-between isolate">
            {/* Background Decoration */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-[80px] group-hover:bg-indigo-500/10 transition-colors -z-10"></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-xl shadow-indigo-600/20 border border-white/10 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                            <span className="text-xl font-black">{supervisor.name.charAt(0)}</span>
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-black text-xl text-[var(--text-primary)] truncate max-w-[180px] tracking-tight">{supervisor.name}</h3>
                            <div className="flex items-center gap-1.5 mt-1 opacity-60">
                                <ShieldCheckIcon className="w-3.5 h-3.5 text-indigo-500" />
                                <p className="text-xs font-bold text-[var(--text-secondary)] truncate max-w-[160px]" dir="ltr">{supervisor.email}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--bg-tertiary)]/30 rounded-[2rem] p-5 border border-[var(--border-primary)] mb-6 hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">المدرسين المسؤول عنهم</p>

                    <div className="flex items-center justify-between">
                        <div className="flex -space-x-3 space-x-reverse">
                            {supervisor.supervisor_teachers && supervisor.supervisor_teachers.length > 0 ? (
                                supervisor.supervisor_teachers.slice(0, 4).map((st, i) => (
                                    <div key={i} className="w-10 h-10 rounded-xl border-2 border-[var(--bg-secondary)] bg-[var(--bg-tertiary)] overflow-hidden shadow-lg transform hover:-translate-y-1 hover:z-10 transition-transform">
                                        <img src={st.teachers.imageUrl || 'https://via.placeholder.com/40'} className="w-full h-full object-cover" alt="T" />
                                    </div>
                                ))
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] border-2 border-dashed border-[var(--border-primary)] flex items-center justify-center">
                                    <UserCircleIcon className="w-4 h-4 opacity-20" />
                                </div>
                            )}
                            {teacherCount > 4 && (
                                <div className="w-10 h-10 rounded-xl border-2 border-[var(--bg-secondary)] bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-lg">
                                    +{teacherCount - 4}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-lg font-black text-[var(--text-primary)]">{teacherCount}</span>
                            <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-50 uppercase">كادر تعليمي</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-[var(--border-primary)]/50 flex items-center justify-between">
                <div className="flex gap-2">
                    <button onClick={onEdit} className="px-5 py-2.5 rounded-xl bg-indigo-600/10 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all font-black text-xs active:scale-95 border border-indigo-500/10" title="تعديل المدرسين المسؤول عنهم">تعديل الصلاحيات</button>
                    <button onClick={onDelete} className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all active:scale-90" title="حذف المشرف">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="text-[10px] font-mono text-[var(--text-secondary)] opacity-30 uppercase tracking-widest">ID:{supervisor.id.slice(0, 8)}</div>
            </div>
            <div className="absolute top-0 right-0 w-2 h-0 bg-indigo-500 group-hover:h-full transition-all duration-700 opacity-20"></div>
        </div>
    );
};

const SupervisorsManagementView: React.FC = () => {
    const [supervisors, setSupervisors] = useState<SupervisorProfile[]>([]);
    const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
    const [stats, setStats] = useState({ totalSupervisors: 0, totalLinks: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [modalState, setModalState] = useState<{ type: 'add' | 'edit' | null, supervisor: SupervisorProfile | null }>({ type: null, supervisor: null });
    const [deletingSupervisor, setDeletingSupervisor] = useState<SupervisorProfile | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { addToast } = useToast();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [supervisorsData, teachersData, staffStats] = await Promise.all([
                fetchAllSupervisors(),
                getAllTeachers(),
                getStaffStats()
            ]);
            setSupervisors(supervisorsData);
            setAllTeachers(teachersData);
            setStats({ totalSupervisors: staffStats.totalSupervisors, totalLinks: staffStats.totalLinks });
        } catch (e: any) {
            console.error("Error in supervisors view:", e);
            addToast(`فشل جلب البيانات: ${e.message}`, ToastType.ERROR);
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredSupervisors = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return supervisors;
        return supervisors.filter(s =>
            (s.name || '').toLowerCase().includes(query) ||
            (s.email || '').toLowerCase().includes(query)
        );
    }, [supervisors, searchQuery]);

    const handleDelete = async () => {
        if (!deletingSupervisor) return;
        setIsActionLoading(true);
        try {
            const { success, error } = await deleteSupervisor(deletingSupervisor.id);
            if (success) {
                addToast('تم حذف المشرف بنجاح.', ToastType.SUCCESS);
                fetchData();
            } else {
                throw error;
            }
        } catch (e: any) {
            addToast(`فشل حذف المشرف: ${e.message}`, ToastType.ERROR);
        } finally {
            setDeletingSupervisor(null);
            setIsActionLoading(false);
        }
    };

    return (
        <div className="fade-in space-y-8 pb-32">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-[#0f172a] p-8 rounded-[3rem] text-white relative overflow-hidden shadow-2xl border border-white/5 isolate">
                <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-purple-500/20 to-transparent pointer-events-none z-0"></div>
                <div className="relative z-10 text-right">
                    <h1 className="text-4xl font-black tracking-tight">إدارة المشرفين</h1>
                    <p className="text-indigo-200/60 font-bold mt-2">لديك {stats.totalSupervisors} مشرفين يراقبون {stats.totalLinks} مدرسين.</p>
                </div>
                <button
                    onClick={() => setModalState({ type: 'add', supervisor: null })}
                    className="relative z-10 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center gap-3"
                >
                    <PlusIcon className="w-6 h-6" /> إضافة مشرف جديد
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative group flex-1 w-full">
                    <input
                        type="text"
                        placeholder="ابحث بالاسم أو البريد الإلكتروني..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-[var(--bg-secondary)] border-2 border-[var(--border-primary)] rounded-[2rem] py-4 pr-14 pl-6 font-bold text-md focus:border-purple-500 outline-none transition-all shadow-sm"
                    />
                    <SearchIcon className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-[var(--text-secondary)] opacity-70 group-focus-within:text-purple-500 transition-colors" />
                </div>
                <button
                    onClick={fetchData}
                    className="p-4 bg-[var(--bg-secondary)] border-2 border-[var(--border-primary)] rounded-full text-[var(--text-secondary)] hover:text-purple-500 transition-colors active:scale-90 shadow-sm"
                    title="تحديث البيانات"
                >
                    <UsersSolidIcon className={`w-6 h-6 ${isLoading ? 'animate-pulse' : ''}`} />
                </button>
            </div>

            {/* List */}
            {isLoading && supervisors.length === 0 ? (
                <div className="flex justify-center py-40"><Loader /></div>
            ) : filteredSupervisors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSupervisors.map(supervisor => (
                        <SupervisorCard
                            key={supervisor.id}
                            supervisor={supervisor}
                            onEdit={() => setModalState({ type: 'edit', supervisor })}
                            onDelete={() => setDeletingSupervisor(supervisor)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-40 bg-[var(--bg-secondary)] rounded-[3rem] border-2 border-dashed border-[var(--border-primary)] animate-fade-in">
                    <UsersSolidIcon className="w-20 h-20 mx-auto text-[var(--text-secondary)] opacity-20 mb-6" />
                    <h3 className="text-2xl font-black text-[var(--text-secondary)]">لم يتم العثور على مشرفين</h3>
                    <p className="text-sm font-bold text-[var(--text-secondary)] opacity-50 mt-2">جرّب البحث بكلمة أخرى أو أضف مشرفاً جديداً.</p>
                </div>
            )}

            {/* Modals */}
            {(modalState.type === 'add' || modalState.type === 'edit') && (
                <SupervisorModal
                    isOpen={true}
                    onClose={() => setModalState({ type: null, supervisor: null })}
                    onSaveSuccess={() => {
                        setModalState({ type: null, supervisor: null });
                        fetchData();
                    }}
                    supervisor={modalState.supervisor}
                    allTeachers={allTeachers}
                />
            )}

            {deletingSupervisor && (
                <Modal isOpen={true} onClose={() => setDeletingSupervisor(null)} title="حذف حساب المشرف">
                    <div className="text-center p-4">
                        <ShieldExclamationIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">تأكيد الحذف النهائي</h3>
                        <p className="text-[var(--text-secondary)] mb-6 text-sm">
                            سيتم حذف حساب المشرف <span className="font-bold text-[var(--text-primary)]">"{deletingSupervisor.name}"</span> نهائياً من قاعدة البيانات ونظام المصادقة. لا يمكن التراجع عن هذا الإجراء.
                        </p>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setDeletingSupervisor(null)} className="px-6 py-3 rounded-xl bg-[var(--bg-tertiary)] font-black text-sm text-[var(--text-secondary)]">إلغاء</button>
                            <button onClick={handleDelete} disabled={isActionLoading} className="px-8 py-3 rounded-xl bg-red-600 text-white font-black text-sm shadow-lg shadow-red-500/30 active:scale-95 transition-all">
                                {isActionLoading ? 'جاري الحذف...' : 'نعم، حذف الحساب'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default SupervisorsManagementView;
