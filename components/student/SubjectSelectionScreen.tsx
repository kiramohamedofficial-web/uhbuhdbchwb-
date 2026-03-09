
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Grade, Unit, User, Teacher } from '../../types';
import { getStudentProgress } from '../../services/storageService';
import { getAllTeachers } from '../../services/teacherService';
import { SearchIcon, VideoCameraIcon, ChevronLeftIcon } from '../common/Icons';
import Loader from '../common/Loader';
import { motion } from 'framer-motion';

// --- Modern Subject Card (Matches Reference Image) ---
const SubjectCard: React.FC<{
    unit: Unit;
    teacher?: Teacher;
    onClick: () => void;
    progress: number;
    index: number
}> = ({ unit, teacher, onClick, progress, index }) => {
    const lessonCount = unit.lessons?.filter(l => l.type === 'Explanation').length || 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.6, ease: "easeOut" }}
            onClick={onClick}
            className="bg-white rounded-[2.5rem] p-6 mb-6 shadow-[0_12px_45px_-12px_rgba(0,0,0,0.08)] border-2 border-gray-100/80 cursor-pointer relative overflow-hidden group hover:shadow-2xl hover:border-amber-500/30 transition-all duration-500 transform hover:-translate-y-2 active:scale-[0.98]"
        >
            <div className="flex items-center gap-6 relative z-10">
                {/* Teacher Image with premium border */}
                <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-[2rem] overflow-hidden border-2 border-amber-50 shadow-inner bg-gradient-to-br from-amber-50 to-white relative group-hover:scale-105 transition-transform duration-500">
                        {teacher?.imageUrl ? (
                            <img src={teacher.imageUrl} className="w-full h-full object-cover" alt={teacher.name} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-amber-200 font-black text-2xl">
                                {teacher?.name?.charAt(0)}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-right">
                    <div className="inline-block px-3 py-1 bg-amber-50 rounded-xl text-amber-600 text-[10px] font-black uppercase tracking-widest mb-2 border border-amber-100">
                        مادة دراسية
                    </div>
                    <h3 className="font-black text-xl md:text-2xl text-gray-900 truncate mb-1.5 leading-tight group-hover:text-amber-600 transition-colors">
                        {unit.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm font-bold text-gray-500">
                        <span className="text-gray-900">أ. {teacher?.name || 'مدرس عام'}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-200"></span>
                        <div className="flex items-center gap-1.5 text-amber-500">
                            <VideoCameraIcon className="w-4 h-4" />
                            <span>{lessonCount} حصة HD</span>
                        </div>
                    </div>
                </div>

                {/* Modern Interactive Arrow */}
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-amber-600 group-hover:text-white group-hover:rotate-12 transition-all duration-500 shadow-sm border border-gray-100 group-hover:border-amber-500">
                    <ChevronLeftIcon className="w-7 h-7 transition-transform group-hover:-translate-x-1" />
                </div>
            </div>

            {/* Premium Progress Section */}
            <div className="mt-8 pt-6 border-t border-gray-50">
                <div className="flex justify-between items-center mb-3 px-1">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${progress >= 100 ? 'bg-emerald-500 animate-pulse' : progress > 0 ? 'bg-amber-500 animate-pulse' : 'bg-gray-300'}`}></div>
                        <span className="text-xs font-black text-gray-400 tracking-wider uppercase">{progress === 0 ? 'لم تبدأ بعد' : progress >= 100 ? 'أتممت المادة بنجاح' : 'جاري التقدم بالمادة'}</span>
                    </div>
                    <span className="text-lg font-black text-gray-900 tabular-nums">{Math.round(progress)}%</span>
                </div>
                <div className="h-3 w-full bg-gray-100/50 rounded-full overflow-hidden p-[2px] border border-gray-50 shadow-inner">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1.5, ease: "circOut" }}
                        className={`h-full rounded-full shadow-[0_0_15px_-4px_rgba(0,0,0,0.1)] ${progress >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-amber-500 to-yellow-600'}`}
                    ></motion.div>
                </div>
            </div>

            {/* Background Accent */}
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors"></div>
        </motion.div>
    );
};

interface SubjectSelectionScreenProps {
    grade: Grade;
    onSubjectSelect: (unit: Unit) => void;
    user: User;
}

const SubjectSelectionScreen: React.FC<SubjectSelectionScreenProps> = ({ grade, onSubjectSelect, user }) => {
    const sortedSemesters = useMemo(() => {
        return [...(grade.semesters || [])].sort((a, b) => a.title.localeCompare(b.title, 'ar-EG'));
    }, [grade.semesters]);

    // Default to first semester if available
    const [activeSemesterId, setActiveSemesterId] = useState<string>(sortedSemesters.length > 0 ? sortedSemesters[0].id : '');
    const [searchQuery, setSearchQuery] = useState('');
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [userProgress, setUserProgress] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [teacherData, progressData] = await Promise.all([
                    getAllTeachers(),
                    user ? getStudentProgress(user.id) : Promise.resolve([])
                ]);
                if (!isMounted) return;
                setTeachers(teacherData || []);
                if (progressData) {
                    setUserProgress(progressData.reduce((acc, item) => ({ ...acc, [item.lesson_id]: true }), {}));
                }
            } catch (error) {
                console.error("Error fetching subject selection data:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        fetchData();
        return () => { isMounted = false; };
    }, [user]);

    const activeSemester = useMemo(() => sortedSemesters.find(s => s.id === activeSemesterId), [sortedSemesters, activeSemesterId]);
    const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);

    const calculateProgress = useCallback((unit: Unit): number => {
        const lessons = unit.lessons || [];
        if (lessons.length === 0) return 0;
        const completed = lessons.filter(l => userProgress[l.id]).length;
        return (completed / lessons.length) * 100;
    }, [userProgress]);

    const displayUnits = useMemo(() => {
        if (!activeSemester) return [];
        let units = (activeSemester.units || []).filter(unit => {
            if (!user.track) return true;
            if (!unit.track || unit.track === 'All') return true;
            if (user.track === 'Scientific' && (unit.track === 'Scientific' || unit.track === 'Science' || unit.track === 'Math')) return true;
            return unit.track === user.track;
        });

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            units = units.filter(u =>
                u.title.toLowerCase().includes(query) ||
                teacherMap.get(u.teacherId)?.name.toLowerCase().includes(query)
            );
        }

        return units.sort((a, b) => a.title.localeCompare(b.title, 'ar-EG', { numeric: true }));
    }, [activeSemester, user.track, searchQuery, teacherMap]);

    return (
        <div className="min-h-screen bg-[#f0f4f8] font-tajawal pb-32">

            {/* Header Section */}
            <div className="pt-8 pb-4 px-6 text-center">
                <h1 className="text-3xl font-black text-[#1a1a1a] mb-2 drop-shadow-sm">مناهجك الدراسية</h1>
                <p className="text-gray-500 text-sm font-medium">اختر المادة للبدء في المذاكرة والمتابعة.</p>
            </div>

            {/* Controls Container */}
            <div className="px-5 mb-6 space-y-5">

                {/* 1. Semester Toggle (Pill Style) */}
                {sortedSemesters.length > 0 && (
                    <div className="bg-gray-200/60 p-1.5 rounded-full flex relative shadow-inner max-w-md mx-auto">
                        {sortedSemesters.map((semester) => {
                            const isActive = activeSemesterId === semester.id;
                            return (
                                <button
                                    key={semester.id}
                                    onClick={() => setActiveSemesterId(semester.id)}
                                    className={`relative z-10 flex-1 py-3 rounded-full text-sm font-bold transition-all duration-300 ${isActive
                                        ? 'text-white shadow-md'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="semester-pill"
                                            className="absolute inset-0 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-full"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            style={{ zIndex: -1 }}
                                        />
                                    )}
                                    {semester.title}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* 2. Search Bar */}
                <div className="relative max-w-xl mx-auto group">
                    <input
                        type="text"
                        placeholder="ابحث عن مادة، معلم، أو درس..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full py-5 pr-14 pl-8 bg-white border-2 border-gray-100 focus:border-amber-500 focus:ring-8 focus:ring-amber-500/5 rounded-[2.5rem] text-base font-bold text-gray-700 placeholder-gray-400 outline-none transition-all shadow-[0_15px_40px_-10px_rgba(0,0,0,0.05)] focus:shadow-2xl"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-amber-500 group-focus-within:scale-110 transition-all duration-300">
                        <SearchIcon className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Subjects List */}
            <div className="px-6 max-w-2xl mx-auto">
                {isLoading ? (
                    <div className="flex justify-center py-20"><Loader /></div>
                ) : (
                    <div className="space-y-4">
                        {displayUnits.length > 0 ? (
                            displayUnits.map((unit, index) => (
                                <SubjectCard
                                    key={unit.id}
                                    unit={unit}
                                    teacher={teacherMap.get(unit.teacherId)}
                                    onClick={() => onSubjectSelect(unit)}
                                    progress={calculateProgress(unit)}
                                    index={index}
                                />
                            ))
                        ) : (
                            <div className="text-center py-20 opacity-50">
                                <p className="text-gray-500 font-bold">لا توجد مواد مطابقة للبحث</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubjectSelectionScreen;
