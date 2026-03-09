import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSession } from '../../hooks/useSession';
import { useSubscription } from '../../hooks/useSubscription';
import { supabase } from '../../services/storageService';
import { getAllTeachers } from '../../services/teacherService';
import { Teacher, ToastType, User } from '../../types';
import { ArrowRightIcon, InformationCircleIcon, PaperAirplaneIcon, SearchIcon, CheckCircleIcon, ClockIcon } from '../common/Icons';
import Loader from '../common/Loader';
import { useToast } from '../../useToast';

interface TeacherChatMessage {
  id: string;
  created_at: string;
  student_id: string;
  teacher_id: string;
  sender_id: string;
  content: string;
}

// --- Matte 3D Utility Classes (Custom for this view to ensure no glare) ---
const matteCardClass = "bg-[var(--bg-secondary)] border-b-4 border-[var(--border-primary)] rounded-2xl shadow-sm transition-all active:border-b-0 active:translate-y-1 active:border-t-4 active:border-transparent";
const messageBubbleUser = "relative bg-[#005c4b] text-white p-3 px-4 rounded-2xl rounded-tr-none border-b-[3px] border-[#004033] shadow-sm";
const messageBubbleTeacher = "relative bg-[#202c33] text-[#e9edef] p-3 px-4 rounded-2xl rounded-tl-none border-b-[3px] border-[#131b20] shadow-sm dark:bg-[#202c33] bg-white dark:text-[#e9edef] text-gray-800 dark:border-[#131b20] border-gray-200";

// --- Background Pattern (WhatsApp-like Doodles) ---
const ChatBackground = () => (
    <div className="absolute inset-0 z-0 opacity-[0.06] pointer-events-none" 
         style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='64' height='64' viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M8 16c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0-2c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6 2.686 6 6 6zm33.414-6l5.95-5.95L45.95.636 40 6.586 34.05.636 32.636 2.05 38.586 8l-5.95 5.95 1.414 1.414L40 9.414l5.95 5.95 1.414-1.414L41.414 8zM40 48c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0-2c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6 2.686 6 6 6zM9.414 40l5.95-5.95-1.414-1.414L8 38.586l-5.95-5.95L.636 34.05 6.586 40l-5.95 5.95 1.414 1.414L8 41.414l5.95 5.95 1.414-1.414L9.414 40z' fill='%239C92AC' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`
         }}>
    </div>
);

const TeacherChatInterface: React.FC<{ student: User, teacher: Teacher, onBack: () => void }> = ({ student, teacher, onBack }) => {
    const [messages, setMessages] = useState<TeacherChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const { addToast } = useToast();

    const fetchMessages = useCallback(async () => {
        // Fetch last 3 days of messages for better context
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
            .from('teacher_chats')
            .select('*')
            .eq('student_id', student.id)
            .eq('teacher_id', teacher.id)
            .gte('created_at', threeDaysAgo)
            .order('created_at', { ascending: true });
        
        if (data) setMessages(data);
        setIsLoading(false);
    }, [student.id, teacher.id]);

    useEffect(() => {
        fetchMessages();
        const channel = supabase
            .channel(`teacher-chat-${student.id}-${teacher.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'teacher_chats',
                filter: `student_id=eq.${student.id},teacher_id=eq.${teacher.id}`
            }, payload => {
                const newMessage = payload.new as TeacherChatMessage;
                setMessages(prev => {
                    // Optimistic update handler
                    if (newMessage.sender_id === student.id) {
                        const tempMessageIndex = prev.findIndex(m => m.id.startsWith('temp-') && m.content === newMessage.content);
                        if (tempMessageIndex > -1) {
                            const newMessages = [...prev];
                            newMessages[tempMessageIndex] = newMessage;
                            return newMessages;
                        }
                    }
                    if (!prev.some(m => m.id === newMessage.id)) {
                        return [...prev, newMessage];
                    }
                    return prev;
                });
            })
            .subscribe();
        
        return () => { supabase.removeChannel(channel); };
    }, [fetchMessages, student.id, teacher.id]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = useCallback(async () => {
        const content = newMessage.trim();
        if (!content) return;

        const optimisticMessage: TeacherChatMessage = {
            id: `temp-${Date.now()}`,
            created_at: new Date().toISOString(),
            student_id: student.id,
            teacher_id: teacher.id,
            sender_id: student.id,
            content: content,
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');

        const { error } = await supabase.from('teacher_chats').insert({
            student_id: student.id,
            teacher_id: teacher.id,
            sender_id: student.id,
            content: content,
        });
        
        if (error) {
            addToast('فشل إرسال الرسالة.', ToastType.ERROR);
            setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
            setNewMessage(content);
        }
    }, [newMessage, student.id, teacher.id, addToast]);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#efeae2] dark:bg-[#0b141a] font-tajawal">
            <ChatBackground />
            
            {/* Header (Matte 3D) */}
            <header className="relative z-10 flex items-center justify-between px-3 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 md:p-3 bg-[#f0f2f5] dark:bg-[#202c33] border-b-2 border-gray-300 dark:border-gray-700 shadow-md">
                <div className="flex items-center gap-2 md:gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-600 dark:text-gray-300">
                        <ArrowRightIcon className="w-5 h-5 md:w-6 md:h-6"/>
                    </button>
                    <div className="relative">
                        <img src={teacher.imageUrl || 'https://i.ibb.co/k5y5nJg/imgbb-com-image-not-found.png'} alt={teacher.name} className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover border-2 border-white dark:border-gray-600 shadow-sm" />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#f0f2f5] dark:border-[#202c33] rounded-full"></span>
                    </div>
                    <div className="flex flex-col">
                        <h2 className="font-bold text-sm md:text-base text-gray-800 dark:text-white leading-tight">{teacher.name}</h2>
                        <p className="text-sm md:text-sm text-gray-500 dark:text-gray-400 font-medium">{teacher.subject}</p>
                    </div>
                </div>
                <div className="px-2">
                    <InformationCircleIcon className="w-5 h-5 md:w-6 md:h-6 text-gray-500 dark:text-gray-400 opacity-60" />
                </div>
            </header>
            
            {/* Disclaimer */}
            <div className="relative z-10 flex justify-center py-3 md:py-4">
                <div className="bg-[#ffeba0] dark:bg-[#2a3942] text-[#5c4b12] dark:text-[#ffd279] text-sm md:text-sm px-4 py-1.5 md:py-2 rounded-lg shadow-sm border-b-2 border-[#ffe082] dark:border-[#1e2a30] text-center max-w-[92%] font-medium">
                    🔒 الرسائل مؤقتة ومحفوظة لمدة 3 أيام فقط لضمان الخصوصية.
                </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 relative z-10 scrollbar-hide">
                {isLoading && <div className="flex justify-center pt-10"><Loader /></div>}
                
                {!isLoading && messages.map(msg => {
                    const isMe = msg.sender_id === student.id;
                    return (
                        <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} fade-in`}>
                            <div className={`max-w-[88%] sm:max-w-[75%] ${isMe ? messageBubbleUser : messageBubbleTeacher}`}>
                                {/* Tail SVG */}
                                <div className={`absolute top-0 w-0 h-0 border-[8px] border-transparent 
                                    ${isMe ? 'right-[-8px] border-t-[#005c4b]' : 'left-[-8px] border-t-white dark:border-t-[#202c33]'}`}>
                                </div>

                                <p className="text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap pb-2 font-medium break-words">{msg.content}</p>
                                
                                <div className="flex items-center justify-end gap-1 mt-[-6px] opacity-70">
                                    <span className="text-sm md:text-sm font-bold min-w-fit">
                                        {new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                    </span>
                                    {isMe && <CheckCircleIcon className="w-3 h-3 text-white/90" />}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </div>
            
            {/* Input Area (Floating 3D) */}
            <footer className="relative z-20 p-2 md:p-3 bg-[#f0f2f5] dark:bg-[#202c33] flex items-end gap-2 pb-safe">
                <form 
                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} 
                    className="flex-1 flex items-end gap-2 bg-white dark:bg-[#2a3942] rounded-3xl px-3 md:px-4 py-1.5 md:py-2 shadow-md border-b-2 border-gray-200 dark:border-gray-700"
                >
                    <textarea 
                        value={newMessage} 
                        onChange={e => setNewMessage(e.target.value)} 
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                        placeholder="اكتب رسالة..."
                        rows={1}
                        className="flex-1 max-h-32 min-h-[24px] py-2 bg-transparent border-none outline-none text-gray-800 dark:text-white placeholder-gray-500 resize-none text-[13px] md:text-sm font-medium"
                        style={{ height: 'auto', overflow: 'hidden' }}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                        }}
                    />
                </form>
                <button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()} 
                    className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-[#005c4b] hover:bg-[#004033] text-white rounded-full shadow-lg border-b-4 border-[#003025] active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 disabled:border-b-0 disabled:scale-95 mb-0.5 md:mb-1"
                >
                    <PaperAirplaneIcon className="w-4 h-4 md:w-5 md:h-5 ml-0.5"/>
                </button>
            </footer>
        </div>
    );
};

const AskTeacherView: React.FC = () => {
    const { currentUser } = useSession();
    const { activeSubscriptions, isComprehensive } = useSubscription();
    const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        getAllTeachers().then(data => {
            setAllTeachers(data);
            setIsLoading(false);
        });
    }, []);

    const subscribedTeachers = useMemo(() => {
        let teachers = allTeachers;
        if (!isComprehensive) {
            const subscribedIds = new Set(activeSubscriptions.map(s => s.teacherId).filter(Boolean));
            teachers = allTeachers.filter(t => subscribedIds.has(t.id));
        }
        if (searchQuery.trim()) {
            teachers = teachers.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return teachers;
    }, [activeSubscriptions, allTeachers, isComprehensive, searchQuery]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader /></div>;
    }
    
    if (selectedTeacher && currentUser) {
        return <TeacherChatInterface student={currentUser} teacher={selectedTeacher} onBack={() => setSelectedTeacher(null)} />;
    }

    return (
        <div className="fade-in max-w-2xl mx-auto pb-20">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-[var(--text-primary)] mb-2">غرفة المحادثة</h1>
                <p className="text-[var(--text-secondary)] font-medium">تواصل مباشرة مع مدرسيك للاستفسارات السريعة.</p>
            </div>

            {/* Recessed Search Bar */}
            <div className="relative mb-6">
                <input 
                    type="text" 
                    placeholder="ابحث عن مدرس..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] border-none rounded-2xl py-4 px-12 text-[var(--text-primary)] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1),inset_-2px_-2px_5px_rgba(255,255,255,0.7)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)] outline-none transition-all font-medium placeholder:text-[var(--text-secondary)]"
                />
                <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] opacity-70" />
            </div>
            
            {subscribedTeachers.length > 0 ? (
                <div className="space-y-4">
                    {subscribedTeachers.map(teacher => (
                        <button 
                            key={teacher.id} 
                            onClick={() => setSelectedTeacher(teacher)} 
                            className={`w-full text-right p-3 md:p-4 flex items-center gap-3 md:gap-4 ${matteCardClass} group`}
                        >
                            <div className="relative">
                                <img src={teacher.imageUrl || 'https://i.ibb.co/k5y5nJg/imgbb-com-image-not-found.png'} alt={teacher.name} className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-4 border-[var(--bg-tertiary)] shadow-sm" />
                                <div className="absolute bottom-0 right-0 w-3 h-3 md:w-4 md:h-4 bg-green-500 border-2 border-[var(--bg-secondary)] rounded-full shadow-sm"></div>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-0.5 md:mb-1">
                                    <h3 className="font-bold text-sm md:text-lg text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">{teacher.name}</h3>
                                    <span className="text-[8px] md:text-sm font-bold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-2 py-0.5 md:py-1 rounded-lg border border-[var(--border-primary)]">{teacher.subject}</span>
                                </div>
                                <p className="text-[11px] md:text-sm text-[var(--text-secondary)] line-clamp-1 font-medium opacity-80 flex items-center gap-1">
                                    <ClockIcon className="w-3 h-3"/> اضغط لبدء المحادثة...
                                </p>
                            </div>
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] group-hover:bg-[#005c4b] group-hover:text-white transition-all shadow-inner group-hover:shadow-lg border border-[var(--border-primary)]">
                                <PaperAirplaneIcon className="w-4 h-4 md:w-5 md:h-5 ml-0.5" />
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="text-center p-12 bg-[var(--bg-secondary)] rounded-3xl border-2 border-dashed border-[var(--border-primary)]">
                    <InformationCircleIcon className="w-16 h-16 mx-auto text-[var(--text-secondary)] opacity-60 mb-4"/>
                    <h3 className="font-bold text-lg text-[var(--text-primary)] mb-2">لا توجد محادثات متاحة</h3>
                    <p className="text-sm text-[var(--text-secondary)] font-medium">يجب أن تكون مشتركاً مع مدرس لتتمكن من مراسلته.</p>
                </div>
            )}
        </div>
    );
};

export default AskTeacherView;