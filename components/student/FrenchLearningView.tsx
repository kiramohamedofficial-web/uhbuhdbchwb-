
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useSession } from '../../hooks/useSession';
import { useSubscription } from '../../hooks/useSubscription';
import { StudentView, AISubject, ToastType } from '../../types';
import { ArrowRightIcon, SparklesIcon, BookOpenIcon, VideoCameraIcon, ChatBubbleOvalLeftEllipsisIcon, CreditCardIcon, XIcon } from '../common/Icons';
import { useToast } from '../../useToast';

interface AiLearningViewProps {
    onNavigate: (view: StudentView) => void;
    onBack: () => void;
    subject: AISubject;
}

type ModuleType = 'intro' | 'vocab' | 'grammar' | 'conversation';

interface AICard {
    id: string;
    title: string;
    content: string; // HTML content for rich text
    type: 'explanation' | 'quiz' | 'dialogue';
    isStreaming?: boolean;
}

const AiLearningView: React.FC<AiLearningViewProps> = ({ onNavigate, onBack, subject }) => {
    const { currentUser: user } = useSession();
    const { subscription } = useSubscription();
    const { addToast } = useToast();
    
    const [currentModule, setCurrentModule] = useState<ModuleType | null>(null);
    const [history, setHistory] = useState<AICard[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const hasAccess = useMemo(() => {
        if (!subscription || subscription.status !== 'Active') return false;
        // Simple logic: Any active subscription grants access
        const now = new Date();
        return new Date(subscription.endDate) >= now;
    }, [subscription]);

    const gradeName = user?.gradeData?.name || 'الصف الثالث الثانوي'; 

    const promptAI = async (promptType: string, context?: string) => {
        if (!process.env.API_KEY) {
            addToast('مفتاح API غير متوفر.', ToastType.ERROR);
            return;
        }
        setIsLoading(true);
        const tempId = Date.now().toString();

        try {
            // Correct initialization with named parameter
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const systemInstruction = `
                ${subject.systemRole}
                المرحلة: ${gradeName}.
                
                التعليمات:
                1. ابدأ الشرح فوراً بدون أي مقدمات أو ترحيب.
                2. ممنوع استخدام عبارات مثل (مرحباً، إليك الشرح، دعنا نبدأ).
                3. اشرح بوضوح واختصار.
                4. استخدم HTML للتنسيق.
            `;

            let userPrompt = "";
            
            if (promptType === 'start_module') {
                if (currentModule === 'intro') userPrompt = "ابدأ معي مقدمة بسيطة عن هذه المادة، وماذا سنتعلم فيها، وأساسيات بسيطة.";
                if (currentModule === 'vocab') userPrompt = "علمني أهم 5 مصطلحات أو كلمات أساسية في هذه المادة تناسب مستواي الدراسي، مع توضيح المعنى.";
                if (currentModule === 'grammar') userPrompt = "اشرح لي قاعدة أساسية أو قانون مهم في هذه المادة بشكل مبسط جداً.";
                if (currentModule === 'conversation') userPrompt = "لنبدأ نقاشاً أو محادثة بسيطة (أو تطبيق عملي) حول موضوع في المادة. ابدأ أنت.";
            } else if (promptType === 'explain_again') {
                userPrompt = "لم أفهم البطاقة السابقة جيداً. اشرحها لي بطريقة أبسط أو بمثال من الحياة اليومية.";
            } else if (promptType === 'next') {
                userPrompt = "فهمت. انتقل للنقطة التالية أو المفهوم التالي المرتبط.";
            } else if (promptType === 'custom') {
                userPrompt = context || "";
            }

            // Filter out empty cards or streaming placeholders from previous errors
            const validHistory = history.filter(h => h.content && !h.isStreaming);

            // Construct history for context
            const historyForChat = validHistory.flatMap((h, i) => [
                { role: 'user', parts: [{ text: i === 0 ? 'ابدأ الدرس' : 'التالي' }] },
                { role: 'model', parts: [{ text: h.content }] }
            ]);
            
            // Correct chat initialization
            const chat = ai.chats.create({
                // Use compliant model name
                model: 'gemini-3-flash-preview', 
                config: { systemInstruction },
                history: historyForChat
            });

            // Create temp card for streaming
            const newCard: AICard = {
                id: tempId,
                title: currentModule === 'intro' ? 'أساسيات' : currentModule === 'vocab' ? 'مصطلحات' : 'قواعد',
                content: '',
                type: 'explanation',
                isStreaming: true
            };
            
            setHistory(prev => [...prev, newCard]);

            const resultStream = await chat.sendMessageStream({ message: userPrompt });
            
            let accumulatedText = '';
            for await (const chunk of resultStream) {
                // Correct text extraction (property access, not method call)
                const text = chunk.text;
                if (text) {
                    accumulatedText += text;
                    setHistory(prev => prev.map(c => c.id === tempId ? { ...c, content: accumulatedText } : c));
                }
            }
            
            // Mark streaming as done
            setHistory(prev => prev.map(c => c.id === tempId ? { ...c, isStreaming: false } : c));

        } catch (error) {
            console.error(error);
            // Remove the temp card if it failed
            setHistory(prev => prev.filter(c => c.id !== tempId));
            addToast('حدث خطأ أثناء الاتصال بالمعلم الذكي.', ToastType.ERROR);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-scroll to bottom when new content is added
    useEffect(() => {
        if (scrollRef.current) {
            requestAnimationFrame(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            });
        }
    }, [history, isLoading]);

    const handleStartModule = (mod: ModuleType) => {
        setCurrentModule(mod);
        setHistory([]);
        // Trigger first AI response
        setTimeout(() => promptAI('start_module'), 100);
    };

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;
        promptAI('custom', inputValue);
        setInputValue('');
    };

    if (!hasAccess) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-primary)] p-4">
                 <button onClick={onBack} className="absolute top-6 right-6 p-2 rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-[var(--text-primary)]">
                    <XIcon className="w-6 h-6" />
                </button>
                <div className="flex flex-col items-center justify-center text-center p-8 bg-[var(--bg-secondary)] rounded-[2.5rem] border border-[var(--border-primary)] shadow-2xl max-w-sm w-full">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-xl text-white text-4xl font-black bg-gradient-to-br ${subject.gradient}`}>
                        <subject.icon />
                    </div>
                    <h2 className="text-3xl font-black text-[var(--text-primary)] mb-4">المحتوى حصري</h2>
                    <p className="text-[var(--text-secondary)] mb-8 text-lg font-medium">
                        خدمة المعلم الذكي متاحة للمشتركين فقط.
                    </p>
                    <button onClick={() => onNavigate('subscription')} className="w-full flex items-center justify-center px-8 py-4 font-bold text-white bg-blue-600 rounded-2xl shadow-lg active:scale-95 transition-all">
                        <span>اشترك الآن</span>
                        <CreditCardIcon className="w-6 h-6 mr-2" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col font-cairo bg-[var(--bg-primary)] h-[100dvh] overflow-hidden">
            
            {/* Header - Full Width, Clean */}
            <div className="flex-shrink-0 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] p-4 flex items-center justify-between shadow-sm z-20">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onBack} 
                        className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-full transition-colors flex items-center gap-2"
                        title="خروج"
                    >
                        <XIcon className="w-5 h-5" />
                        <span className="text-sm font-bold hidden sm:inline">خروج</span>
                    </button>
                    <div className="h-8 w-px bg-[var(--border-primary)] mx-1"></div>
                    <div className="flex items-center gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white bg-gradient-to-br ${subject.gradient} shadow-sm`}>
                            <subject.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-[var(--text-primary)] leading-tight">
                                معلم {subject.title}
                            </h1>
                            <p className="text-sm text-[var(--text-secondary)] font-bold">{gradeName}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                
                {/* Module Selector */}
                <div className="md:w-64 flex-shrink-0 flex md:flex-col gap-2 p-3 overflow-x-auto md:overflow-y-auto no-scrollbar bg-[var(--bg-secondary)] border-b md:border-b-0 md:border-l border-[var(--border-primary)] z-10 sticky top-0">
                    {[
                        { id: 'intro', label: 'مقدمة', icon: SparklesIcon, color: 'blue' },
                        { id: 'vocab', label: 'مصطلحات', icon: BookOpenIcon, color: 'red' },
                        { id: 'grammar', label: 'قواعد', icon: VideoCameraIcon, color: 'purple' },
                        { id: 'conversation', label: 'تطبيق', icon: ChatBubbleOvalLeftEllipsisIcon, color: 'green' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleStartModule(item.id as ModuleType)}
                            className={`
                                flex items-center gap-2 px-4 py-2.5 rounded-full md:rounded-xl transition-all duration-300 flex-shrink-0 whitespace-nowrap
                                ${currentModule === item.id 
                                    ? `bg-gradient-to-r from-${item.color}-500 to-${item.color}-600 text-white shadow-md transform scale-105` 
                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-primary)] border border-[var(--border-primary)]'}
                            `}
                        >
                            <item.icon className={`w-4 h-4 ${currentModule === item.id ? 'text-white' : ''}`} />
                            <span className="font-bold text-sm">{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col relative bg-[var(--bg-primary)] min-h-0">
                    
                    {!currentModule ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                            <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-2xl border-4 border-[var(--border-primary)] bg-gradient-to-br ${subject.gradient} text-white animate-pulse`}>
                                <subject.icon className="text-6xl" />
                            </div>
                            <h3 className="text-2xl font-black text-[var(--text-primary)] mb-2">مرحباً بك!</h3>
                            <p className="text-[var(--text-secondary)] font-medium">اختر موضوعاً من القائمة لتبدأ الشرح.</p>
                        </div>
                    ) : (
                        <>
                            {/* Chat Stream */}
                            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-40 scroll-smooth">
                                {history.map((card, index) => (
                                    <div key={card.id} className="w-full max-w-3xl mx-auto animate-slide-up">
                                        <div className={`bg-[var(--bg-secondary)] border-b-4 border-[var(--border-primary)] rounded-[2rem] p-6 shadow-sm relative group hover:border-[var(--accent-primary)] transition-colors ${card.isStreaming ? 'border-b-[var(--accent-primary)]' : ''}`}>
                                            {/* Badge */}
                                            <div className="absolute top-4 left-4 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-3 py-1 rounded-full text-sm font-bold border border-[var(--border-primary)]">
                                                بطاقة #{index + 1}
                                            </div>
                                            
                                            {/* Content */}
                                            <div 
                                                className="prose prose-lg dark:prose-invert text-[var(--text-primary)] font-medium leading-relaxed mt-4"
                                                dangerouslySetInnerHTML={{ __html: card.content }}
                                            />
                                            {card.isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-[var(--accent-primary)] animate-pulse align-middle"></span>}
                                        </div>
                                    </div>
                                ))}
                                
                                {isLoading && !history.some(h => h.isStreaming) && (
                                    <div className="w-full max-w-3xl mx-auto bg-[var(--bg-secondary)] border-2 border-dashed border-[var(--border-primary)] rounded-[2rem] p-8 flex justify-center">
                                        <div className="flex gap-2">
                                            <span className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></span>
                                            <span className="w-3 h-3 bg-white border-2 border-red-500 rounded-full animate-bounce delay-75"></span>
                                            <span className="w-3 h-3 bg-blue-500 rounded-full animate-bounce delay-150"></span>
                                        </div>
                                    </div>
                                )}
                                {/* Spacer to ensure last item is visible above controls */}
                                <div className="h-4 w-full"></div>
                            </div>

                            {/* Floating Controls (Bottom) */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[var(--bg-secondary)] via-[var(--bg-secondary)]/95 to-transparent z-20" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                                <div className="max-w-3xl mx-auto flex flex-col gap-3">
                                    {/* Quick Actions */}
                                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                        <button onClick={() => promptAI('next')} disabled={isLoading} className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-xl font-bold border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 whitespace-nowrap shadow-lg">
                                            👍 فهمت، التالي
                                        </button>
                                        <button onClick={() => promptAI('explain_again')} disabled={isLoading} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-4 py-3 rounded-xl font-bold border-b-4 border-yellow-600 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 whitespace-nowrap shadow-lg">
                                            🤔 لم أفهم، بسطها
                                        </button>
                                    </div>

                                    {/* Custom Input */}
                                    <form onSubmit={handleCustomSubmit} className="relative">
                                        <input 
                                            type="text" 
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            placeholder="اسأل المعلم سؤالاً محدداً..."
                                            className="w-full pl-4 pr-14 py-4 bg-[var(--bg-tertiary)] rounded-2xl border-2 border-[var(--border-primary)] focus:bg-[var(--bg-secondary)] focus:border-[var(--accent-primary)] outline-none transition-all font-bold text-[var(--text-primary)] placeholder:font-medium shadow-inner"
                                        />
                                        <button 
                                            type="submit" 
                                            disabled={isLoading || !inputValue.trim()}
                                            className="absolute left-2 top-2 bottom-2 w-10 bg-[var(--accent-primary)] hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-colors disabled:bg-gray-400 shadow-md"
                                        >
                                            <ArrowRightIcon className="w-5 h-5 rotate-180" />
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AiLearningView;
