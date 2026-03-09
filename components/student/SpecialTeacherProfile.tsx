
import React, { useState, useEffect, useMemo } from 'react';
import { Teacher, Unit, Lesson, ToastType, User, LessonType } from '../../types';
/* Updated import name to match the exported member in specialService */
import { getPremiumCurriculum, activateSpecialAccess } from '../../services/specialService';
import { ArrowRightIcon, StarIcon, LockClosedIcon, PlayIcon, CheckCircleIcon, QrcodeIcon, VideoCameraIcon, ShieldCheckIcon, DocumentTextIcon } from '../common/Icons';
import Loader from '../common/Loader';
import { useToast } from '../../useToast';
import { useSubscription } from '../../hooks/useSubscription';

interface SpecialTeacherProfileProps {
    teacher: Teacher;
    user: User;
    onBack: () => void;
    onPlay: (lesson: Lesson, unit: Unit) => void;
}

const SpecialTeacherProfile: React.FC<SpecialTeacherProfileProps> = ({ teacher, user, onBack, onPlay }) => {
    const [units, setUnits] = useState<Unit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [code, setCode] = useState('');
    const [isActivating, setIsActivating] = useState(false);
    const { addToast } = useToast();
    const { activeSubscriptions, refetchSubscription } = useSubscription();

    const isSubscribed = useMemo(() => {
        return activeSubscriptions.some(s => s.teacherId === teacher.id);
    }, [activeSubscriptions, teacher.id]);

    useEffect(() => {
        getPremiumCurriculum(teacher.id).then(data => {
            setUnits(data);
            setIsLoading(false);
        });
    }, [teacher.id]);

    const handleActivate = async () => {
        if (!code.trim()) return;
        setIsActivating(true);
        /* Updated usage to use activateSpecialAccess as exported by the service */
        const result = await activateSpecialAccess(user.id, code);
        if (result.success) {
            addToast('🎉 تم تفعيل محتوى المدرس المميز بنجاح!', ToastType.SUCCESS);
            await refetchSubscription();
            setCode('');
        } else {
            addToast(result.error || 'الكود غير صحيح', ToastType.ERROR);
        }
        setIsActivating(false);
    };

    if (isLoading) return <div className="flex justify-center items-center h-screen bg-[#050505]"><Loader /></div>;

    return (
        <div className="fade-in min-h-screen bg-[#050505] text-white -m-4 md:-m-6 pb-40">
            {/* Cinematic Header */}
            <div className="relative h-[40vh] md:h-[50vh] w-full overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center opacity-70 blur-sm" style={{ backgroundImage: `url(${teacher.imageUrl})` }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent"></div>
                
                <div className="absolute top-8 right-8 z-20">
                    <button onClick={onBack} className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-red-600 transition-all group">
                        <ArrowRightIcon className="w-6 h-6 rotate-180" />
                    </button>
                </div>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] border-4 border-amber-500 shadow-2xl overflow-hidden mb-4">
                        <img src={teacher.imageUrl} className="w-full h-full object-cover" />
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500 text-black rounded-full text-sm font-black uppercase mb-3 shadow-xl">
                        <StarIcon className="w-3.5 h-3.5 fill-current" /> مدرس مميز
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black mb-2 tracking-tighter">{teacher.name}</h1>
                    <p className="text-amber-200/60 font-bold">{teacher.subject}</p>
                </div>
            </div>

            {/* Registration Section */}
            <div className="max-w-4xl mx-auto px-6 -mt-10 relative z-20">
                {!isSubscribed ? (
                    <div className="bg-[#111] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl text-center">
                        <h2 className="text-xl font-bold mb-4">فتح محتوى المدرس</h2>
                        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                            <input 
                                type="text" 
                                value={code} 
                                onChange={e => setCode(e.target.value.toUpperCase())}
                                placeholder="أدخل كود المدرس المميز..." 
                                className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-center font-black outline-none focus:border-amber-500 transition-all placeholder:text-white/20"
                            />
                            <button 
                                onClick={handleActivate}
                                disabled={isActivating || !code}
                                className="px-10 py-4 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isActivating ? 'جاري الفتح...' : 'تفعيل الكود'}
                            </button>
                        </div>
                        <p className="mt-4 text-sm text-gray-500 font-bold">بمجرد إدخال الكود الصحيح، سيفتح لك المنهج والحصص فوراً.</p>
                    </div>
                ) : (
                    <div className="bg-emerald-600/10 border border-emerald-500/20 p-6 rounded-[2.5rem] flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                            <ShieldCheckIcon className="w-6 h-6" />
                        </div>
                        <span className="font-black text-emerald-500">أنت مسجل بالفعل في منهج هذا المدرس</span>
                    </div>
                )}
            </div>

            {/* Curriculum Body */}
            <div className="max-w-6xl mx-auto px-6 py-16">
                <div className="flex items-center justify-between mb-10 border-r-4 border-amber-500 pr-4">
                    <h2 className="text-2xl font-black">الحصص والمناهج المفتوحة</h2>
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">{units.length} وحدات دراسية</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {units.map(unit => (
                        <div key={unit.id} className="bg-[#111] rounded-[2.5rem] p-6 border border-white/5">
                            <h3 className="text-xl font-black mb-6 text-amber-500 flex items-center gap-2">
                                <VideoCameraIcon className="w-6 h-6" />
                                {unit.title}
                            </h3>
                            <div className="space-y-3">
                                {unit.lessons.map(lesson => (
                                    <button 
                                        key={lesson.id} 
                                        onClick={() => (isSubscribed || lesson.isFree) && onPlay(lesson, unit)}
                                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                                            isSubscribed || lesson.isFree 
                                                ? 'bg-white/5 border-white/5 hover:border-amber-500/50 hover:bg-white/10' 
                                                : 'bg-black/40 border-transparent opacity-70 grayscale cursor-not-allowed'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-amber-500">
                                                {/* Fixed missing DocumentTextIcon by adding it to imports */}
                                                {lesson.type === LessonType.EXPLANATION ? <PlayIcon className="w-5 h-5 fill-current" /> : <DocumentTextIcon className="w-5 h-5" />}
                                            </div>
                                            <span className="font-bold text-sm text-right">{lesson.title}</span>
                                        </div>
                                        {isSubscribed || lesson.isFree ? (
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center"><CheckCircleIcon className="w-5 h-5" /></div>
                                        ) : (
                                            <LockClosedIcon className="w-4 h-4 text-gray-600" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SpecialTeacherProfile;
