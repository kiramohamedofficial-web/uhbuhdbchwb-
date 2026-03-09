
import React, { useState, useMemo } from 'react';
import { useSession } from '../../hooks/useSession';
import { Unit, Lesson, ToastType, QuizQuestion } from '../../types';
import { generatePracticeTest } from '../../services/geminiService';
import { useToast } from '../../useToast';
import { SparklesIcon, ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from '../common/Icons';
import CustomSelect, { SelectOption, OptionGroup } from '../common/CustomSelect';
import { useAppearance } from '../../AppContext';

const LoadingView: React.FC = () => (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white text-center p-4">
        <div className="w-16 h-16 border-4 border-t-purple-500 border-gray-600 rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold mb-2">جاري إعداد اختبارك الذكي...</h2>
        <p className="text-lg text-gray-300">يقوم مساعدنا الذكي باختيار أفضل الأسئلة لك.</p>
    </div>
);


const QuestionBankView: React.FC = () => {
    const { currentUser: user } = useSession();
    const grade = useMemo(() => user?.gradeData ?? null, [user]);
    const { addToast } = useToast();
    const { style } = useAppearance();

    const [step, setStep] = useState<'config' | 'taking' | 'result'>('config');
    const [isLoading, setIsLoading] = useState(false);

    // Config state
    const [selectedUnitId, setSelectedUnitId] = useState('');
    const [selectedLessonId, setSelectedLessonId] = useState('all');
    const [numQuestions, setNumQuestions] = useState(10);
    const [difficulty, setDifficulty] = useState<'سهل' | 'متوسط' | 'صعب'>('متوسط');

    // Test state
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [score, setScore] = useState(0);

    const units = useMemo(() => {
        if (!grade || !user) return [];
        return grade.semesters.flatMap(s => s.units.filter(u =>
            !u.track || u.track === 'All' || u.track === user.track
        ));
    }, [grade, user]);

    const lessons = useMemo(() => {
        if (!selectedUnitId) return [];
        const unit = units.find(u => u.id === selectedUnitId);
        return unit?.lessons || [];
    }, [selectedUnitId, units]);

    const unitOptions = useMemo((): OptionGroup[] => {
        if (!grade) return [];
        return grade.semesters.map(semester => ({
            label: semester.title,
            options: units.filter(u => u.semester_id === semester.id).map(u => ({ value: u.id, label: u.title }))
        }));
    }, [grade, units]);

    const lessonOptions = useMemo((): SelectOption[] => {
        return [
            { value: 'all', label: 'كل الدروس في الوحدة' },
            ...lessons.map(l => ({ value: l.id, label: l.title }))
        ];
    }, [lessons]);

    const handleGenerate = async () => {
        if (!selectedUnitId) {
            addToast('الرجاء اختيار المادة أولاً.', ToastType.ERROR);
            return;
        }
        setIsLoading(true);
        try {
            const unit = units.find(u => u.id === selectedUnitId);
            const lesson = lessons.find(l => l.id === selectedLessonId);
            const generatedQuestions = await generatePracticeTest(
                unit!.title,
                lesson ? lesson.title : 'جميع الدروس',
                grade!.name,
                difficulty,
                numQuestions,
                ['MCQ']
            );
            if (generatedQuestions.length === 0) {
                addToast('لم يتمكن المساعد الذكي من إنشاء أسئلة. حاول مرة أخرى بموضوع مختلف.', ToastType.INFO);
                setIsLoading(false);
                return;
            }
            setQuestions(generatedQuestions);
            setAnswers({});
            setStep('taking');
        } catch (e: any) {
            addToast(e.message, ToastType.ERROR);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = () => {
        const correctCount = questions.reduce((count, q, index) => {
            return count + (q.correctAnswerIndex === answers[index] ? 1 : 0);
        }, 0);
        setScore(Math.round((correctCount / questions.length) * 100));
        setStep('result');
    };

    const reset = () => {
        setStep('config');
        setQuestions([]);
        setAnswers({});
        setScore(0);
    };

    if (isLoading) return <LoadingView />;

    if (!grade) {
        return <div className="text-center p-8 rounded-xl premium-card">يجب تحديد صفك الدراسي أولاً.</div>;
    }

    if (step === 'config') {
        return (
            <div className="max-w-3xl mx-auto fade-in">
                <div className="text-center mb-10">
                    <SparklesIcon className="w-16 h-16 mx-auto text-purple-400 mb-4" />
                    <h1 className="text-4xl font-extrabold text-[var(--text-primary)]">بنك الأسئلة الذكي</h1>
                    <p className="text-lg text-[var(--text-secondary)] mt-2">أنشئ اختبارات مخصصة لتقييم مستواك في أي وقت.</p>
                </div>

                <div className="space-y-6 p-6 rounded-3xl premium-card">
                    <div>
                        <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">1. اختر المادة (الوحدة)</label>
                        <CustomSelect options={unitOptions} value={selectedUnitId} onChange={setSelectedUnitId} placeholder="-- اختر المادة --" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">2. حدد النطاق (الدرس)</label>
                        <CustomSelect options={lessonOptions} value={selectedLessonId} onChange={setSelectedLessonId} placeholder="-- اختر الدرس --" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">3. عدد الأسئلة ({numQuestions})</label>
                            <input type="range" min="5" max="25" step="5" value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))} className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-purple-500 premium-input bg-[var(--bg-tertiary)] border-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">4. مستوى الصعوبة</label>
                            <div className="flex items-center p-1 rounded-lg premium-input bg-[var(--bg-tertiary)] border-none">
                                {(['سهل', 'متوسط', 'صعب'] as const).map(d => (
                                    <button key={d} onClick={() => setDifficulty(d)} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${difficulty === d ? 'bg-purple-600 text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}>{d}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-10 text-center">
                    <button onClick={handleGenerate} className="w-full md:w-auto px-10 py-4 font-bold text-lg text-white rounded-lg transition-transform transform hover:scale-105 bg-gradient-to-r from-purple-600 to-blue-600 premium-btn shadow-lg border-none">
                        ابدأ الاختبار
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'taking') {
        return (
            <div className="max-w-3xl mx-auto fade-in">
                <h1 className="text-2xl font-bold mb-6">الاختبار</h1>
                <div className="space-y-8">
                    {questions.map((q, qIndex) => (
                        <div key={qIndex} className="p-6 rounded-xl premium-card">
                            <p className="font-semibold mb-4 text-lg">{qIndex + 1}. {q.questionText}</p>
                            <div className="space-y-3">
                                {q.options.map((opt, optIndex) => (
                                    <label key={optIndex} className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors border-2 ${answers[qIndex] === optIndex ? 'border-purple-500 bg-purple-500/10' : 'border-transparent premium-input bg-[var(--bg-tertiary)] border-none'}`}>
                                        <input type="radio" name={`q_${qIndex}`} checked={answers[qIndex] === optIndex} onChange={() => setAnswers(prev => ({ ...prev, [qIndex]: optIndex }))} className="w-5 h-5 text-purple-600 focus:ring-purple-500" />
                                        <span className="mr-3">{opt}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-8 text-center">
                    <button onClick={handleSubmit} className="px-8 py-3 font-bold text-white bg-green-600 rounded-lg shadow-lg hover:bg-green-700 transition-colors">تسليم الإجابات</button>
                </div>
            </div>
        );
    }

    if (step === 'result') {
        return (
            <div className="max-w-3xl mx-auto fade-in">
                <div className="text-center mb-8 p-8 rounded-3xl premium-card">
                    <h1 className="text-4xl font-bold">النتيجة</h1>
                    <p className={`text-6xl font-extrabold my-4 ${score >= 50 ? 'text-green-400' : 'text-red-400'}`}>{score}%</p>
                    <p className="text-lg text-[var(--text-secondary)]">{score >= 50 ? 'أداء رائع! استمر في التقدم.' : 'لا بأس، يمكنك تحسين مستواك بالمزيد من الممارسة.'}</p>
                </div>

                <div className="space-y-6">
                    <h2 className="text-xl font-bold">مراجعة الأسئلة:</h2>
                    {questions.map((q, qIndex) => {
                        const studentAnswerIndex = answers[qIndex];
                        const isCorrect = q.correctAnswerIndex === studentAnswerIndex;
                        return (
                            <div key={qIndex} className="p-4 rounded-xl premium-card bg-[var(--bg-secondary)] border-none shadow-sm">
                                <div className="flex justify-between items-start">
                                    <p className="font-semibold mb-3 flex-1">{qIndex + 1}. {q.questionText}</p>
                                    {isCorrect ? <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0" /> : <XCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0" />}
                                </div>
                                <div className="space-y-2">
                                    {q.options.map((opt, optIndex) => {
                                        const isSelected = studentAnswerIndex === optIndex;
                                        const isCorrectAnswer = q.correctAnswerIndex === optIndex;
                                        let stateStyle = 'premium-input bg-[var(--bg-tertiary)] border-none';

                                        if (isSelected && !isCorrect) stateStyle = 'border-2 border-red-500 bg-red-500/10 text-red-300';
                                        if (isCorrectAnswer) stateStyle = 'border-2 border-green-500 bg-green-500/10 text-green-300';

                                        return (
                                            <div key={optIndex} className={`flex items-center p-2 rounded-md ${stateStyle}`}>
                                                <span>{opt}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 p-3 bg-[var(--bg-tertiary)] rounded-lg border-l-4 border-blue-500">
                                    <p className="font-semibold text-sm text-blue-400">الشرح:</p>
                                    <p className="text-sm mt-1">{q.rationale}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 text-center">
                    <button onClick={reset} className="px-8 py-3 font-bold rounded-lg transition-colors premium-btn">إجراء اختبار جديد</button>
                </div>
            </div>
        );
    }

    return null;
};

export default QuestionBankView;
