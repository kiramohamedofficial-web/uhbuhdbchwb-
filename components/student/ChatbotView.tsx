
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, StudentView, ToastType, Grade } from '../../types';
import { getChatUsage, incrementChatUsage, getGradeByIdSync } from '../../services/storageService';
import { getChatbotResponseStream, ChatMode } from '../../services/geminiService';
import { 
    BrainIcon, PaperAirplaneIcon, SparklesIcon, TrashIcon, 
    ArrowRightIcon, BookOpenIcon, BeakerIcon, CalculatorIcon, 
    GlobeAltIcon, AtomIcon, ScaleIcon, ClockIcon, UserCircleIcon
} from '../common/Icons';
import { useToast } from '../../useToast';
import { useSession } from '../../hooks/useSession';
import { useSubscription } from '../../hooks/useSubscription';
import { motion, AnimatePresence } from 'framer-motion';

// --- Interfaces & Constants ---

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  createdAt: string;
}

interface SubjectOption {
    id: string;
    name: string;
    icon: React.FC<any>;
    color: string;
    keywords: string[]; // For AI Context
}

// قائمة المواد المتاحة
const SUBJECTS: SubjectOption[] = [
    { id: 'general', name: 'مساعد عام', icon: BrainIcon, color: 'from-gray-700 to-gray-900', keywords: [] },
    { id: 'arabic', name: 'لغة عربية', icon: BookOpenIcon, color: 'from-emerald-500 to-teal-600', keywords: ['نحو', 'صرف', 'بلاحقة', 'أدب'] },
    { id: 'english', name: 'English', icon: GlobeAltIcon, color: 'from-blue-500 to-indigo-600', keywords: ['grammar', 'vocabulary', 'translation'] },
    { id: 'math', name: 'رياضيات', icon: CalculatorIcon, color: 'from-orange-500 to-red-600', keywords: ['جبر', 'هندسة', 'تفاضل', 'حساب مثلثات'] },
    { id: 'physics', name: 'فيزياء', icon: AtomIcon, color: 'from-violet-600 to-purple-600', keywords: ['قوانين', 'مسائل', 'كهربية', 'حديثة'] },
    { id: 'chemistry', name: 'كيمياء', icon: BeakerIcon, color: 'from-green-500 to-emerald-600', keywords: ['معادلات', 'عضوية', 'تحليلية'] },
    { id: 'biology', name: 'أحياء', icon: SparklesIcon, color: 'from-pink-500 to-rose-600', keywords: ['جينات', 'تشريح', 'بيئة'] },
    { id: 'history', name: 'تاريخ', icon: BookOpenIcon, color: 'from-amber-600 to-yellow-600', keywords: ['أحداث', 'تواريخ', 'شخصيات'] },
];

const LockedChatView: React.FC<{ onNavigate: () => void }> = ({ onNavigate }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-primary)] shadow-sm animate-fade-in">
        <div className="w-24 h-24 bg-gradient-to-tr from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-purple-500/30 animate-pulse">
             <BrainIcon className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-black text-[var(--text-primary)] mb-3 tracking-tight">المعلم الذكي المقفل</h2>
        <p className="text-[var(--text-secondary)] mb-8 max-w-md text-sm font-medium leading-relaxed opacity-80">
            هذه الميزة حصرية للمشتركين. تتيح لك اختيار مدرس خاص لكل مادة يشرح لك الدروس ويحل معك المسائل فورياً.
        </p>
        <button onClick={onNavigate} className="flex items-center justify-center gap-3 px-10 py-4 font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-all transform active:scale-95 shadow-lg">
            <span>تفعيل الاشتراك الآن</span>
            <SparklesIcon className="w-5 h-5" />
        </button>
    </div>
);

// --- Sub Components ---

const ChatBubble: React.FC<{ message: ChatMessage; subjectColor?: string }> = ({ message, subjectColor = 'from-indigo-600 to-purple-600' }) => {
    const isUser = message.role === 'user';
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex items-end gap-2 w-full ${isUser ? 'justify-end' : 'justify-start'} mb-1`}
        >
            {!isUser && (
                <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br ${subjectColor} flex items-center justify-center flex-shrink-0 shadow-md border border-white/10 overflow-hidden mb-1`}>
                    <BrainIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
            )}
            
            <div className={`relative max-w-[88%] md:max-w-[80%] px-4 py-2.5 md:px-5 md:py-3 shadow-sm text-sm font-medium leading-relaxed
                ${isUser 
                    ? 'bg-gradient-to-l from-indigo-600 to-purple-600 text-white rounded-[20px] rounded-br-sm' 
                    : 'bg-white dark:bg-[#1E1E1E] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-[20px] rounded-bl-sm'
                }`}
            >
                <div className="whitespace-pre-wrap text-[13px] md:text-sm break-words" dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br/>') }} />
                
                {message.createdAt && (
                    <p className={`text-[8px] md:text-sm mt-1 text-right font-bold opacity-60 ${isUser ? 'text-indigo-100' : 'text-[var(--text-secondary)]'}`}>
                        {new Date(message.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                )}
            </div>
        </motion.div>
    );
};

const SubjectCard: React.FC<{ subject: SubjectOption; onClick: () => void; index: number }> = ({ subject, onClick, index }) => (
    <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={onClick}
        className="relative group overflow-hidden rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 text-right shadow-sm border border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:shadow-xl transition-all duration-300 hover:-translate-y-1 w-full"
    >
        <div className={`absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br ${subject.color} opacity-10 rounded-bl-[3rem] md:rounded-bl-[4rem] transition-all group-hover:scale-110`}></div>
        
        <div className="relative z-10 flex flex-col h-full justify-between items-start">
            <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br ${subject.color} flex items-center justify-center text-white shadow-lg mb-3 md:mb-4 group-hover:rotate-6 transition-transform`}>
                <subject.icon className="w-5 h-5 md:w-7 md:h-7" />
            </div>
            
            <div className="w-full">
                <h3 className="text-sm md:text-lg font-black text-[var(--text-primary)] mb-0.5 md:mb-1">{subject.name}</h3>
                <p className="text-[8px] md:text-sm text-[var(--text-secondary)] font-bold opacity-60">
                    {subject.id === 'general' ? 'مساعدك الشخصي' : 'شرح، حل مسائل، ومراجعة'}
                </p>
            </div>
            
            <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 w-6 h-6 md:w-8 md:h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                <ArrowRightIcon className="w-3 h-3 md:w-4 md:h-4 rotate-180" />
            </div>
        </div>
    </motion.button>
);

const ChatbotView: React.FC<{ onNavigate: (view: StudentView) => void }> = ({ onNavigate }) => {
    const { currentUser: user } = useSession();
    const { subscription } = useSubscription();
    const { addToast } = useToast();
    
    // State
    const [selectedSubject, setSelectedSubject] = useState<SubjectOption | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<ChatMode>('normal');
    const [remaining, setRemaining] = useState(50);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [gradeInfo, setGradeInfo] = useState<Grade | null>(null);

    // Initial Data Load
    useEffect(() => {
        if (user) {
            const usage = getChatUsage(user.id);
            setRemaining(usage.remaining);
            if (user.grade) {
                const g = getGradeByIdSync(user.grade);
                if (g) setGradeInfo(g);
            }
        }
    }, [user]);

    // Check Subscription
    const hasActiveSubscription = useMemo(() => {
        if (!subscription || subscription.status !== 'Active') return false;
        return new Date(subscription.endDate) >= new Date();
    }, [subscription]);

    // Filter Subjects based on Grade (Simple Logic)
    const availableSubjects = useMemo(() => {
        if (!gradeInfo) return SUBJECTS; 
        return SUBJECTS;
    }, [gradeInfo]);

    // Auto-scroll
    useEffect(() => {
        chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, isLoading]);

    // Handle Subject Selection
    const handleSelectSubject = (subject: SubjectOption) => {
        setSelectedSubject(subject);
        // Initialize chat with a greeting based on the subject
        const greeting = subject.id === 'general' 
            ? `أهلاً بك يا ${user?.name.split(' ')[0]}! 🌟\nأنا مساعدك الذكي، اسألني في أي شيء.`
            : `أهلاً يا بطل! 🎓\nجاهز نذاكر ${subject.name}؟ اسألني في أي درس أو مسألة في منهج ${gradeInfo?.name || ''}.`;
            
        setMessages([{
            id: 'init',
            role: 'model',
            content: greeting,
            createdAt: new Date().toISOString()
        }]);
    };

    const handleSendMessage = useCallback(async () => {
        if (!input.trim() || isLoading || !user || !selectedSubject) return;
        
        if (remaining <= 0) {
            addToast('لقد وصلت إلى الحد الأقصى للرسائل اليومية.', ToastType.ERROR);
            return;
        }

        const userMessage: ChatMessage = { 
            id: Date.now().toString(), 
            role: 'user', 
            content: input.trim(), 
            createdAt: new Date().toISOString() 
        };
        
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        
        const newUsage = incrementChatUsage(user.id);
        setRemaining(newUsage.remaining);

        // Prepare History & Persona
        const gradeText = gradeInfo?.name || 'الطالب';
        const personaInstruction = selectedSubject.id === 'general'
            ? `أنت مساعد تعليمي ذكي للطالب ${user.name}. ساعده في تنظيم وقته والإجابة على أسئلته العامة.`
            : `أنت مدرس خبير لمادة ${selectedSubject.name} للصف ${gradeText} في المنهج المصري.
               - اشرح بأسلوب مبسط وتفاعلي وجذاب.
               - استخدم أمثلة من الحياة اليومية لتقريب المعلومة.
               - إذا سألك عن مادة أخرى، أخبره بلطف أنك متخصص في ${selectedSubject.name} فقط.`;

        // Format history for API
        const apiHistory = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));

        const modelMessageId = (Date.now() + 1).toString();
        const modelMessage: ChatMessage = { id: modelMessageId, role: 'model', content: '', createdAt: new Date().toISOString() };
        setMessages(prev => [...prev, modelMessage]);

        try {
            // Send request with custom system instruction
            const stream = await getChatbotResponseStream(apiHistory, userMessage.content, mode, personaInstruction);
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk.text;
                setMessages(prev => prev.map(m => m.id === modelMessageId ? { ...m, content: fullResponse } : m));
            }
        } catch (error: any) {
            setMessages(prev => prev.map(m => m.id === modelMessageId ? { ...m, content: `عذراً، حدث خطأ: ${error.message}` } : m));
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, remaining, addToast, user, messages, mode, selectedSubject, gradeInfo]);

    if (!user) return null;

    if (!hasActiveSubscription) {
        return <LockedChatView onNavigate={() => onNavigate('subscription')} />;
    }

    // --- VIEW: SUBJECT SELECTION (LOBBY) ---
    if (!selectedSubject) {
        return (
            <div className="h-full flex flex-col bg-[var(--bg-primary)] p-4 md:p-6 overflow-y-auto custom-scrollbar animate-fade-in pb-32">
                
                <div className="text-center mb-6 md:mb-8 mt-2 md:mt-4">
                    <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] mb-2">المعلم الذكي 🤖</h1>
                    <p className="text-[var(--text-secondary)] font-bold text-sm md:text-sm max-w-md mx-auto px-4">
                        اختر المادة التي تريد مذاكرتها، وسيقوم الذكاء الاصطناعي بتقمص شخصية مدرس متخصص لشرحها لك.
                    </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {availableSubjects.map((subject, idx) => (
                        <SubjectCard 
                            key={subject.id} 
                            subject={subject} 
                            onClick={() => handleSelectSubject(subject)} 
                            index={idx}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // --- VIEW: CHAT INTERFACE (FULL SCREEN) ---
    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--bg-primary)] font-tajawal animate-slide-in-right">
            
            {/* Chat Header */}
            <header className="flex-shrink-0 px-3 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 md:px-4 md:py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] flex items-center justify-between z-20 shadow-sm">
                <div className="flex items-center gap-2 md:gap-3">
                    <button 
                        onClick={() => setSelectedSubject(null)} 
                        className="p-2 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <ArrowRightIcon className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br ${selectedSubject.color} flex items-center justify-center text-white shadow-md relative`}>
                             <selectedSubject.icon className="w-4 h-4 md:w-5 md:h-5" />
                             <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[var(--bg-secondary)] rounded-full"></span>
                        </div>
                        <div>
                            <h1 className="text-sm md:text-sm font-black text-[var(--text-primary)]">معلم {selectedSubject.name}</h1>
                            <p className="text-sm md:text-sm font-bold text-green-600 flex items-center gap-1">
                                متصل الآن <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            </p>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => { if(confirm('مسح المحادثة؟')) setMessages([]); }}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                    title="مسح"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </header>

            {/* Chat Messages */}
            <div ref={chatContainerRef} className="flex-1 p-3 md:p-4 space-y-3 md:space-y-4 overflow-y-auto custom-scrollbar scroll-smooth relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
                <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                        <ChatBubble key={msg.id} message={msg} subjectColor={selectedSubject.color} />
                    ))}
                    {isLoading && (
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="w-full flex justify-start"
                        >
                            <div className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-3 bg-[var(--bg-secondary)] rounded-[20px] rounded-bl-[4px] border border-[var(--border-primary)] shadow-sm">
                                <div className="flex gap-1">
                                    <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Input Area */}
            <footer className="p-2 md:p-3 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] pb-safe">
                {/* Mode Chips */}
                <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar px-1">
                     {(Object.keys({normal: 'متوازن', fast: 'سريع', thinking: 'عميق'}) as ChatMode[]).map(m => (
                        <button 
                            key={m} 
                            onClick={() => setMode(m)} 
                            className={`
                                px-2.5 py-1 text-sm md:text-sm font-bold rounded-full transition-all border whitespace-nowrap
                                ${mode === m 
                                    ? `bg-gradient-to-r ${selectedSubject.color} text-white border-transparent shadow-sm` 
                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-transparent hover:border-[var(--border-primary)]'}
                            `}
                        >
                            {m === 'normal' && '⚖️ متوازن'}
                            {m === 'fast' && '⚡ سريع'}
                            {m === 'thinking' && '🧠 تفكير عميق'}
                        </button>
                    ))}
                </div>

                <form 
                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} 
                    className="flex items-end gap-1.5 md:gap-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-[25px] px-2.5 py-1.5 md:px-3 md:py-2 shadow-inner focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all"
                >
                    <div className="p-1.5 md:p-2 text-[var(--text-secondary)] cursor-default h-9 md:h-10 flex items-center">
                        <SparklesIcon className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                        placeholder={`اسأل معلم ${selectedSubject.name}...`}
                        rows={1}
                        className="flex-1 bg-transparent border-none outline-none text-[13px] md:text-sm font-bold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] placeholder:opacity-70 resize-none max-h-24 py-2 md:py-2.5"
                        style={{ minHeight: '40px' }}
                    />

                    <button 
                        type="submit" 
                        disabled={isLoading || !input.trim()} 
                        className={`
                            w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-300 transform shadow-md
                            ${!input.trim() || isLoading 
                                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 scale-90' 
                                : `bg-gradient-to-tr ${selectedSubject.color} text-white hover:scale-110 active:scale-95`}
                        `}
                    >
                        <PaperAirplaneIcon className={`w-4 h-4 md:w-5 md:h-5 ${!input.trim() ? 'mr-0' : 'mr-0.5'}`} />
                    </button>
                </form>
                
                <div className="text-center mt-1.5">
                    <span className="text-[8px] md:text-sm font-bold text-[var(--text-secondary)] opacity-50">
                        متبقي {remaining} رسالة اليوم
                    </span>
                </div>
            </footer>
        </div>
    );
};

export default ChatbotView;
