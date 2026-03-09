
import React, { useState, useEffect, useCallback } from 'react';
import { Teacher, Unit, SubscriptionCode, ToastType } from '../../types';
import { getPremiumTeachers, getPremiumCurriculum, getPremiumCodes } from '../../services/specialService';
import { generateSubscriptionCodes, deleteSubscriptionCode } from '../../services/subscriptionService';
import { getAllTeachers, deleteTeacher } from '../../services/teacherService';
import { getAllGrades } from '../../services/storageService';
import { useToast } from '../../useToast';
import Modal from '../common/Modal';
import TeacherModal from './TeacherModal';
import Loader from '../common/Loader';
import { 
    StarIcon, UsersIcon, BookOpenIcon, QrcodeIcon, PlusIcon, PencilIcon, TrashIcon, 
    ClipboardIcon, XIcon, ArrowRightIcon
} from '../common/Icons';

const SpecialContentManagementView: React.FC = () => {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'teachers_premium' | 'curriculum_premium' | 'codes_premium'>('teachers_premium');
    const [specialTeachers, setSpecialTeachers] = useState<Teacher[]>([]);
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [curriculum, setCurriculum] = useState<Unit[]>([]);
    const [codes, setCodes] = useState<SubscriptionCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [allGrades, setAllGrades] = useState<any[]>([]);
    const [genCount, setGenCount] = useState(10);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const [teachersData, gradesData] = await Promise.all([
            getPremiumTeachers(),
            getAllGrades()
        ]);
        setSpecialTeachers(teachersData);
        setAllGrades(gradesData.map(g => ({ id: g.id, name: g.name, level: g.level })));

        if (selectedTeacher) {
            const [curr, c] = await Promise.all([
                getPremiumCurriculum(selectedTeacher.id),
                getPremiumCodes(selectedTeacher.id)
            ]);
            setCurriculum(curr);
            setCodes(c);
        }
        setIsLoading(false);
    }, [selectedTeacher]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleGenerate = async () => {
        if (!selectedTeacher) return;
        setIsLoading(true);
        const { error } = await generateSubscriptionCodes({
            count: genCount,
            durationType: 'monthly',
            maxUses: 1,
            teacherId: selectedTeacher.id
        });
        if (error) addToast(error.message, ToastType.ERROR);
        else {
            addToast(`تم إنشاء ${genCount} كود خاص للمدرس بنجاح`, ToastType.SUCCESS);
            fetchData();
        }
    };

    return (
        <div className="fade-in space-y-6 pb-24 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a] p-8 rounded-[3rem] text-white relative overflow-hidden border border-amber-500/20 shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-full bg-amber-500/5 blur-3xl pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-center md:text-right">
                        <h1 className="text-4xl font-black flex items-center gap-3">
                            <StarIcon className="w-10 h-10 text-amber-500" /> إدارة المنهج المميز
                        </h1>
                        <p className="text-amber-200/50 font-bold mt-2">نظام مستقل لإدارة النخبة من المدرسين والطلاب.</p>
                    </div>
                    <button onClick={() => { setSelectedTeacher(null); setIsModalOpen(true); }} className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-2xl shadow-xl transition-all flex items-center gap-3">
                        <PlusIcon className="w-6 h-6"/> إضافة مدرس مميز
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-[var(--bg-secondary)] p-1.5 rounded-2xl border border-[var(--border-primary)] w-full md:w-fit shadow-sm">
                <button onClick={() => setActiveTab('teachers_premium')} className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'teachers_premium' ? 'bg-amber-500 text-black shadow-md' : 'text-[var(--text-secondary)]'}`}>
                    المدرسين (teachers_premium)
                </button>
                <button disabled={!selectedTeacher} onClick={() => setActiveTab('curriculum_premium')} className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'curriculum_premium' ? 'bg-amber-500 text-black shadow-md' : 'text-[var(--text-secondary)] opacity-50'}`}>
                    المناهج (curriculum_premium)
                </button>
                <button disabled={!selectedTeacher} onClick={() => setActiveTab('codes_premium')} className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'codes_premium' ? 'bg-amber-500 text-black shadow-md' : 'text-[var(--text-secondary)] opacity-50'}`}>
                    الأكواد (codes_premium)
                </button>
            </div>

            {selectedTeacher && (
                <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl flex justify-between items-center animate-fade-in">
                    <div className="flex items-center gap-4">
                        <img src={selectedTeacher.imageUrl} className="w-12 h-12 rounded-xl object-cover border border-amber-500/30" />
                        <div>
                            <p className="font-black text-amber-600">أنت تدير الآن: {selectedTeacher.name}</p>
                            <p className="text-sm text-gray-500 uppercase font-black">نظام تحكم مستقل لهذا المدرس</p>
                        </div>
                    </div>
                    <button onClick={() => { setSelectedTeacher(null); setActiveTab('teachers_premium'); }} className="p-2 bg-amber-500/10 text-amber-600 rounded-lg hover:bg-amber-500 hover:text-black transition-all"><XIcon className="w-5 h-5"/></button>
                </div>
            )}

            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[3rem] p-6 shadow-lg min-h-[500px]">
                {isLoading ? <div className="flex justify-center items-center py-40"><Loader /></div> : (
                    <>
                        {activeTab === 'teachers_premium' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
                                {specialTeachers.map(t => (
                                    <div key={t.id} onClick={() => setSelectedTeacher(t)} className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer group ${selectedTeacher?.id === t.id ? 'border-amber-500 bg-amber-500/5' : 'border-[var(--border-primary)] hover:border-amber-500/30'}`}>
                                        <img src={t.imageUrl} className="w-20 h-20 rounded-2xl object-cover mb-4 shadow-md group-hover:scale-105 transition-transform" />
                                        <h3 className="font-black text-lg mb-1">{t.name}</h3>
                                        <p className="text-sm text-[var(--text-secondary)] font-bold">{t.subject}</p>
                                    </div>
                                ))}
                                {specialTeachers.length === 0 && <div className="col-span-full py-20 text-center opacity-70 font-bold">لا يوجد مدرسين مميزين بعد.</div>}
                            </div>
                        )}

                        {activeTab === 'curriculum_premium' && selectedTeacher && (
                            <div className="space-y-4 animate-fade-in">
                                <h3 className="text-xl font-black text-amber-600 mb-6">هيكلة منهج المدرس المميز</h3>
                                {curriculum.map(unit => (
                                    <div key={unit.id} className="p-5 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--border-primary)] flex justify-between items-center hover:shadow-md transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-amber-500 text-black flex items-center justify-center font-black">{unit.lessons?.length || 0}</div>
                                            <span className="font-black text-lg">{unit.title}</span>
                                        </div>
                                        <button className="p-2.5 bg-[var(--bg-secondary)] rounded-xl text-indigo-500 shadow-sm"><PencilIcon className="w-5 h-5"/></button>
                                    </div>
                                ))}
                                {curriculum.length === 0 && <div className="py-20 text-center opacity-70 font-bold">لم يتم رفع منهج لهذا المدرس بعد.</div>}
                            </div>
                        )}

                        {activeTab === 'codes_premium' && selectedTeacher && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="bg-amber-500/5 p-8 rounded-[2.5rem] border border-amber-500/10 flex flex-col sm:flex-row items-end gap-4">
                                    <div className="flex-1 w-full">
                                        <label className="block text-sm font-black uppercase text-amber-600 mb-2 mr-2">توليد أكواد (خاص بهذا المدرس):</label>
                                        <input type="number" value={genCount} onChange={e => setGenCount(parseInt(e.target.value))} className="w-full p-4 rounded-2xl bg-white dark:bg-black/20 font-black text-center text-xl outline-none focus:ring-2 focus:ring-amber-500" />
                                    </div>
                                    <button onClick={handleGenerate} className="w-full sm:w-auto bg-amber-500 text-black px-12 py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all">بدء التوليد</button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {codes.map(c => (
                                        <div key={c.code} className="p-4 bg-[var(--bg-tertiary)] rounded-2xl flex justify-between items-center border border-[var(--border-primary)]">
                                            <div className="text-right">
                                                <span className="font-mono font-black text-lg text-amber-600 block">{c.code}</span>
                                                <span className="text-sm font-bold text-gray-500">صلاحية: {c.durationDays} يوم</span>
                                            </div>
                                            <button onClick={() => { navigator.clipboard.writeText(c.code); addToast('تم النسخ', ToastType.SUCCESS); }} className="p-2.5 bg-[var(--bg-secondary)] rounded-xl text-gray-400 hover:text-amber-500 transition-all"><ClipboardIcon className="w-4 h-4"/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            {isModalOpen && <TeacherModal isOpen={true} onClose={() => setIsModalOpen(false)} onSaveSuccess={fetchData} teacher={{ isSpecial: true } as any} allGrades={allGrades} />}
        </div>
    );
};

export default SpecialContentManagementView;
