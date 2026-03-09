
import React, { useMemo, useState, useEffect } from 'react';
import { getAllTeachers } from '../../services/teacherService';
import { Teacher } from '../../types';
import Loader from '../common/Loader';
import { useSubscription } from '../../hooks/useSubscription';
import { useSession } from '../../hooks/useSession';
import { SearchIcon } from '../common/Icons';
import { motion } from "framer-motion";

interface TeachersViewProps {
    onSelectTeacher: (teacher: Teacher) => void;
}

const TeachersView: React.FC<TeachersViewProps> = ({ onSelectTeacher }) => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTerm, setActiveTerm] = useState(1);
    
    const { isComprehensive, activeSubscriptions } = useSubscription();
    const { currentUser } = useSession();

    useEffect(() => {
        const fetchTeachers = async () => {
            const data = await getAllTeachers();
            setTeachers(data);
            setIsLoading(false);
        };
        fetchTeachers();
    }, []);

    const filteredTeachers = useMemo(() => {
        let displayTeachers = teachers;
        
        // Filter by student's grade
        if (currentUser?.grade) {
            displayTeachers = displayTeachers.filter(t => 
                t.teachingGrades?.includes(currentUser.grade!)
            );
        }

        if (isComprehensive || activeSubscriptions.length === 0) {
             // Show all available
        } else {
             const subscribedTeacherIds = new Set(activeSubscriptions.map(s => s.teacherId));
             displayTeachers = displayTeachers.filter(t => subscribedTeacherIds.has(t.id));
        }
        
        if (searchTerm) {
            displayTeachers = displayTeachers.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.subject.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        return displayTeachers;
    }, [teachers, isComprehensive, activeSubscriptions, currentUser, searchTerm]);

    // Generate a consistent pseudo-random progress for demo purposes
    // In a real app, this would come from the backend
    const getProgress = (id: string) => {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash % 100); 
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader />
            </div>
        );
    }

    const featuredTeacher = filteredTeachers.length > 0 ? filteredTeachers[0] : null;

    return (
        <div className="min-h-screen bg-[#f0f4f8] pb-24 font-tajawal">
            
            {/* Sticky Header */}
            <div className="bg-white/95 backdrop-blur-2xl p-5 rounded-b-3xl shadow-md sticky top-0 z-50 border-b border-gray-100 -mx-3 md:-mx-5 -mt-3 md:-mt-5 mb-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex bg-[#e0e5ec] rounded-full p-1 shadow-inner">
                    <button
                      onClick={() => setActiveTerm(1)}
                      className={`flex-1 py-3 rounded-full font-bold text-sm transition-all ${
                        activeTerm === 1 
                          ? "bg-gradient-to-r from-[#2196F3] to-[#1976D2] text-white shadow-lg" 
                          : "text-gray-500"
                      }`}
                    >
                      الفصل الأول
                    </button>
                    <button
                      onClick={() => setActiveTerm(2)}
                      className={`flex-1 py-3 rounded-full font-bold text-sm transition-all ${
                        activeTerm === 2 
                          ? "bg-gradient-to-r from-[#2196F3] to-[#1976D2] text-white shadow-lg" 
                          : "text-gray-500"
                      }`}
                    >
                      الفصل الثاني
                    </button>
                  </div>
                </div>
                <div className="relative w-16 h-16">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform rotate-[-90deg]">
                    <path 
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                      fill="none"
                      stroke="#e0e0e0"
                      strokeWidth="3"
                    />
                    <path 
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                      fill="none"
                      stroke="#2196F3"
                      strokeWidth="3"
                      strokeDasharray="75, 100"
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-bold text-[#2196F3] text-sm">
                    75%
                  </span>
                </div>
              </div>
              
              <div className="relative mb-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث عن مادة أو معلم..."
                  className="w-full py-4 pr-12 pl-5 bg-white rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-[#2196F3]/20 focus:shadow-lg transition-all text-right text-gray-700"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                  <SearchIcon className="w-5 h-5"/>
                </div>
              </div>
            </div>

            {/* Featured Teacher */}
            {featuredTeacher && !searchTerm && (
                <div 
                    onClick={() => onSelectTeacher(featuredTeacher)}
                    className="bg-gradient-to-r from-[#fff9e6] to-[#ffe0b2] border-2 border-[#FF9800] rounded-3xl p-5 flex items-center gap-4 mb-6 shadow-md cursor-pointer transform transition-transform hover:scale-[1.01]"
                >
                    <img 
                        src={featuredTeacher.imageUrl || 'https://i.ibb.co/k5y5nJg/imgbb-com-image-not-found.png'} 
                        alt={featuredTeacher.name} 
                        className="w-16 h-16 rounded-xl object-cover border-4 border-white shadow bg-white"
                    />
                    <div className="flex-1 text-right">
                        <h3 className="font-bold text-lg text-gray-900">{featuredTeacher.subject}</h3>
                        <p className="text-gray-600 text-sm font-semibold">أ. {featuredTeacher.name}</p>
                        <span className="inline-block mt-2 px-3 py-1 bg-[#FF9800] text-white rounded-full text-sm font-bold">
                        معلم متميز
                        </span>
                    </div>
                    <div className="text-center">
                        <div className="font-black text-3xl text-[#FF9800]">{getProgress(featuredTeacher.id)}%</div>
                        <div className="text-sm text-gray-600 font-bold">التقدم</div>
                    </div>
                </div>
            )}

            {/* Teachers Grid */}
            {filteredTeachers.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                    {filteredTeachers.map((teacher, index) => {
                        const progress = getProgress(teacher.id);
                        return (
                            <motion.div
                                key={teacher.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ y: -5 }}
                                onClick={() => onSelectTeacher(teacher)}
                                className="bg-white border-2 border-[#2196F3] rounded-3xl p-4 text-center cursor-pointer relative overflow-hidden shadow-[10px_10px_20px_#bebebe,-10px_-10px_20px_#ffffff] transition-all"
                            >
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2196F3] to-[#9C27B0] transform scale-x-0 transition-transform group-hover:scale-x-100"></div>
                                <img 
                                    src={teacher.imageUrl || 'https://i.ibb.co/k5y5nJg/imgbb-com-image-not-found.png'} 
                                    alt={teacher.name} 
                                    className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-4 border-[#f0f7ff] shadow bg-gray-50"
                                />
                                <div className="font-bold text-gray-800 text-sm mb-1 line-clamp-1">{teacher.name}</div>
                                <div className="text-[#2196F3] font-bold text-sm mb-2">{teacher.subject}</div>
                                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                    className="h-full bg-gradient-to-r from-[#2196F3] to-[#9C27B0] rounded-full transition-all duration-500" 
                                    style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                 <div className="text-center py-20 opacity-50">
                    <p className="text-gray-500 font-bold">لا يوجد مدرسين مطابقين</p>
                </div>
            )}
        </div>
    );
};

export default TeachersView;
