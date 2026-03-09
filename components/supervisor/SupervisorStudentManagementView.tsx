
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Teacher, User, Subscription, Grade } from '../../types';
import { getUsersByIds, getAllGrades } from '../../services/storageService';
import { getSubscriptionsByTeacherIds } from '../../services/subscriptionService';
import { 
    SearchIcon, ChevronLeftIcon, UsersIcon, FilterIcon, 
    ClipboardIcon, PhoneIcon, TrashIcon, CheckCircleIcon, XCircleIcon 
} from '../common/Icons';
import Loader from '../common/Loader';
import { useIcons } from '../../IconContext';
import { useToast } from '../../useToast';
import { ToastType } from '../../types';

// --- Helper Functions ---
const detectGender = (name: string): 'male' | 'female' => {
    const firstName = name.trim().split(' ')[0].toLowerCase();
    if (firstName.endsWith('ة') || firstName.endsWith('ه') || firstName.endsWith('ى') || firstName.endsWith('اء')) return 'female';
    const femaleExceptions = ['مريم', 'نور', 'شهد', 'ملك', 'يارا', 'ريماس', 'جنى', 'حبيبة', 'بسملة', 'فاطمة', 'عائشة', 'سلمى', 'آية', 'فريدة', 'مكة', 'خلود', 'رانيا', 'دعاء', 'إيمان', 'هدير', 'نسمة', 'نهى', 'رضوى', 'ياسمين', 'أمل', 'أماني', 'سعاد', 'زينب', 'هند'];
    if (femaleExceptions.includes(firstName)) return 'female';
    return 'male';
};

const StudentCard: React.FC<{
    student: User;
    subscription: Subscription | undefined;
    teacherName: string;
    gradeName: string;
    onViewDetails: () => void;
}> = ({ student, subscription, teacherName, gradeName, onViewDetails }) => {
    const { addToast } = useToast();
    const icons = useIcons();
    const hasActiveSub = subscription?.endDate && new Date(subscription.endDate) >= new Date();

    const displayImage = useMemo(() => {
        if (student.imageUrl) return student.imageUrl;
        const gender = detectGender(student.name);
        if (gender === 'female') return icons.studentAvatar4Url || 'https://cdn-icons-png.flaticon.com/512/6997/6997662.png';
        return icons.studentAvatar1Url || 'https://cdn-icons-png.flaticon.com/512/2922/2922510.png';
    }, [student.imageUrl, student.name, icons]);

    const handleCopy = (e: React.MouseEvent, text: string, type: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        addToast(`تم نسخ ${type}`, ToastType.SUCCESS);
    };

    return (
        <div 
            onClick={onViewDetails}
            className={`group relative bg-[var(--bg-secondary)] rounded-3xl border transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-xl hover:-translate-y-1 ${hasActiveSub ? 'border-[var(--border-primary)] hover:border-purple-400' : 'border-red-500/20 hover:border-red-500/40'}`}
        >
            <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden border-2 ${hasActiveSub ? 'border-purple-500/20' : 'border-gray-200'}`}>
                            <img src={displayImage} className="w-full h-full object-cover" alt={student.name} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-[var(--text-primary)] leading-tight line-clamp-1 max-w-[150px]">{student.name}</h3>
                            <p className="text-sm text-[var(--text-secondary)] font-bold mt-0.5">{gradeName}</p>
                            
                            {/* Student ID */}
                            <div 
                                onClick={(e) => handleCopy(e, student.id, 'كود الطالب')}
                                className="flex items-center gap-1 mt-1 text-sm text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded cursor-copy hover:text-purple-500 w-fit"
                                title="نسخ كود الطالب"
                            >
                                <span className="font-mono">#{student.id.slice(0, 6)}...</span>
                                <ClipboardIcon className="w-2.5 h-2.5" />
                            </div>
                        </div>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-sm font-black uppercase ${hasActiveSub ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
                        {hasActiveSub ? 'مشترك' : 'غير مشترك'}
                    </div>
                </div>

                <div className="px-4 pb-3 pt-3 border-t border-[var(--border-primary)] flex justify-between items-center text-sm">
                    <span className="text-[var(--text-secondary)]">المدرس: <span className="font-black text-[var(--text-primary)]">{teacherName}</span></span>
                    {student.phone && (
                        <button 
                            onClick={(e) => handleCopy(e, student.phone, 'الهاتف')} 
                            className="text-[var(--text-secondary)] hover:text-purple-500 transition-colors"
                        >
                            <PhoneIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

interface SupervisorStudentManagementViewProps {
    supervisedTeachers: Teacher[];
    onViewDetails: (user: User) => void;
}

const SupervisorStudentManagementView: React.FC<SupervisorStudentManagementViewProps> = ({ supervisedTeachers, onViewDetails }) => {
    const [students, setStudents] = useState<User[]>([]);
    const [subscriptions, setSubscriptions] = useState<Map<string, Subscription>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    
    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [teacherFilter, setTeacherFilter] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    
    const [allGrades, setAllGrades] = useState<Grade[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const teacherIds = supervisedTeachers.map(t => t.id);
            if (teacherIds.length === 0) {
                setStudents([]);
                setSubscriptions(new Map());
                setIsLoading(false);
                return;
            }

            try {
                const [subs, grades] = await Promise.all([
                    getSubscriptionsByTeacherIds(teacherIds),
                    getAllGrades()
                ]);
                
                setAllGrades(grades);

                // Get Unique student IDs
                const studentIds = [...new Set((subs as any[]).map((s: any) => s.userId as string))];
                
                if (studentIds.length > 0) {
                    const studentData = await getUsersByIds(studentIds);
                    setStudents(studentData.filter(u => u.role === 'student'));
                } else {
                    setStudents([]);
                }
                
                const subMap = new Map();
                subs.forEach((s: any) => {
                    if (teacherIds.includes(s.teacherId)) {
                        if (!subMap.has(s.userId) || s.status === 'Active') {
                            subMap.set(s.userId, s);
                        }
                    }
                });
                setSubscriptions(subMap);
                
            } catch (error) {
                console.error("Failed to fetch supervisor students:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [supervisedTeachers]);

    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const subscription = subscriptions.get(student.id);
            const hasActiveSub = subscription?.endDate && new Date(subscription.endDate) >= new Date();

            // Search Filter
            const searchMatch = 
                student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                student.phone?.includes(searchQuery) ||
                student.id.toLowerCase().includes(searchQuery.toLowerCase());

            // Dropdown Filters
            const teacherMatch = teacherFilter ? subscription?.teacherId === teacherFilter : true;
            const gradeMatch = gradeFilter ? student.grade?.toString() === gradeFilter : true;
            const statusMatch = statusFilter === 'all' ? true : 
                                statusFilter === 'active' ? hasActiveSub : !hasActiveSub;
            
            // Only show students who actually have a subscription related to one of the supervised teachers
            const hasRelevantSub = subscription && supervisedTeachers.some(t => t.id === subscription.teacherId);
            
            return searchMatch && teacherMatch && gradeMatch && statusMatch && hasRelevantSub;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [students, subscriptions, searchQuery, teacherFilter, gradeFilter, statusFilter, supervisedTeachers]);

    const teacherMap = useMemo(() => new Map(supervisedTeachers.map(t => [t.id, t.name])), [supervisedTeachers]);
    const gradeMap = useMemo(() => new Map(allGrades.map(g => [g.id, g.name])), [allGrades]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader /></div>;
    }
    
    if (supervisedTeachers.length === 0) {
        return (
            <div className="text-center p-12 bg-[var(--bg-secondary)] rounded-xl border-2 border-dashed border-[var(--border-primary)]">
                <UsersIcon className="w-16 h-16 mx-auto text-[var(--text-secondary)] opacity-20 mb-4" />
                <p className="text-[var(--text-secondary)]">لم يتم ربط أي مدرسين بحسابك كمشرف بعد. يرجى التواصل مع الإدارة.</p>
            </div>
        );
    }

    return (
        <div className="fade-in pb-20">
            <h1 className="text-3xl font-black mb-6 text-[var(--text-primary)]">إدارة الطلاب ({filteredStudents.length})</h1>
            
            {/* Premium Search Bar */}
            <div className="mb-8 sticky top-0 z-30 pt-2 pb-2 bg-[var(--bg-primary)]/90 backdrop-blur-xl">
                 <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-xl rounded-[2rem] p-3 flex flex-col gap-3">
                    
                    <div className="flex gap-2">
                        <div className="relative flex-1 group">
                            <input
                                type="text"
                                placeholder="ابحث بالاسم، الهاتف، كود الطالب..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-14 bg-[var(--bg-tertiary)] border-2 border-transparent focus:border-purple-500 rounded-2xl pr-4 pl-12 text-sm font-bold text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-secondary)] shadow-inner"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none">
                                <SearchIcon className="w-6 h-6" />
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                            className={`px-5 rounded-2xl transition-all font-bold text-sm flex items-center gap-2 border-2 ${showAdvancedSearch ? 'bg-purple-600 text-white border-purple-600' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--border-primary)]'}`}
                        >
                            <FilterIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">بحث تفصيلي</span>
                        </button>
                    </div>

                    {/* Advanced Filters */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showAdvancedSearch ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="flex flex-wrap gap-3 pb-2 pt-1 border-t border-[var(--border-primary)] mt-1">
                             <div className="relative h-10 min-w-[140px]">
                                <select
                                    value={teacherFilter}
                                    onChange={(e) => setTeacherFilter(e.target.value)}
                                    className="w-full h-full pl-8 pr-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-sm font-bold text-[var(--text-primary)] outline-none appearance-none cursor-pointer"
                                >
                                    <option value="">كل المدرسين</option>
                                    {supervisedTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>

                            <div className="relative h-10 min-w-[140px]">
                                <select
                                    value={gradeFilter}
                                    onChange={(e) => setGradeFilter(e.target.value)}
                                    className="w-full h-full pl-8 pr-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-sm font-bold text-[var(--text-primary)] outline-none appearance-none cursor-pointer"
                                >
                                    <option value="">كل الصفوف</option>
                                    {allGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>

                            <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-xl border border-[var(--border-primary)] h-10">
                                {(['all', 'active', 'inactive'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setStatusFilter(f)}
                                        className={`px-4 h-full rounded-lg text-sm font-black transition-all whitespace-nowrap ${statusFilter === f ? 'bg-[var(--bg-secondary)] text-purple-600 shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                    >
                                        {{all: 'الكل', active: 'نشط', inactive: 'منتهي'}[f]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                 </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredStudents.length > 0 ? (
                    filteredStudents.map(student => {
                        const subscription = subscriptions.get(student.id);
                        return (
                            <StudentCard
                                key={student.id}
                                student={student}
                                subscription={subscription}
                                teacherName={teacherMap.get(subscription?.teacherId || '') || 'غير معروف'}
                                gradeName={gradeMap.get(student.grade as number) || 'غير محدد'}
                                onViewDetails={() => onViewDetails(student)}
                            />
                        );
                    })
                ) : (
                    <div className="col-span-full text-center p-12 bg-[var(--bg-secondary)] rounded-3xl border-2 border-dashed border-[var(--border-primary)] opacity-60">
                        <UsersIcon className="w-16 h-16 mx-auto text-[var(--text-secondary)] opacity-50 mb-4" />
                        <p className="text-[var(--text-secondary)] font-bold">لا توجد نتائج مطابقة للبحث.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SupervisorStudentManagementView;
