
import React, { useState } from 'react';
import { supabase } from '../../services/storageService';
import { 
    addCartoonMovie, 
    deleteCartoonMovie, 
    addSeason, 
    addEpisode,
} from '../../services/movieService';
import { useToast } from '../../useToast';
import { ToastType } from '../../types';
import { ArrowRightIcon, VideoCameraIcon, FilmIcon, SparklesIcon, ShieldCheckIcon, DatabaseIcon, PhotoIcon } from '../common/Icons';

const LogViewer: React.FC<{ logs: string[] }> = ({ logs }) => (
    <div className="mt-4 bg-[#0a0a0a] p-5 rounded-[2rem] h-96 overflow-y-auto font-mono text-[11px] border border-white/5 shadow-inner custom-scrollbar" dir="ltr">
        {logs.map((log, index) => (
            <p key={index} className={`mb-1.5 leading-relaxed ${log.includes('✅') ? 'text-emerald-400 font-bold' : log.includes('❌') ? 'text-red-400 font-bold' : log.includes('🔗') ? 'text-purple-400' : 'text-gray-500'}`}>
                <span className="opacity-60 mr-2">[{new Date().toLocaleTimeString('en-GB')}]</span>
                {log}
            </p>
        ))}
    </div>
);

const CartoonDiagnosticsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addToast } = useToast();
    const [logs, setLogs] = useState<string[]>(['جاهز لبدء الفحص الشامل لنظام MovieZone...']);
    const [isSimulating, setIsSimulating] = useState(false);
    const [progress, setProgress] = useState(0);

    const addLog = (log: string) => setLogs(prev => [log, ...prev]);

    const handleRunFullSimulation = async () => {
        setIsSimulating(true);
        setLogs([]);
        setProgress(0);
        
        let testIds: string[] = []; // Tracking all created items for cleanup

        const addTestId = (id: string) => { testIds.push(id); };

        try {
            addLog("🚀 بدء الفحص الشامل: أفلام، مسلسلات، وسلاسل مترابطة...");

            // --- TEST 1: MOVIE CREATION ---
            setProgress(20);
            addLog("🎬 المرحلة 1: اختبار إضافة فيلم سينمائي...");
            const moviePayload = {
                title: `Test Movie ${Date.now()}`,
                story: "Diagnostic Test Story Content",
                poster_url: "https://via.placeholder.com/600x900?text=Test+Movie",
                type: 'movie',
                category: 'Diagnostic',
                rating: 8.5,
                is_published: false
            };
            const { data: movieData, error: movieError } = await supabase.from('cartoon_movies').insert(moviePayload).select().single();
            if (movieError || !movieData) throw new Error(`فشل إنشاء الفيلم: ${movieError?.message}`);
            addTestId(movieData.id);
            addLog(`✅ نجاح: تم إنشاء الفيلم بنجاح (ID: ${movieData.id}).`);

            // --- TEST 2: SERIES & SEASONS ---
            setProgress(40);
            addLog("📺 المرحلة 2: اختبار إضافة مسلسل مع مواسم وحلقات...");
            const seriesPayload = {
                title: `Test Series ${Date.now()}`,
                story: "Diagnostic Series Content",
                poster_url: "https://via.placeholder.com/600x900?text=Test+Series",
                type: 'series',
                category: 'Diagnostic',
                rating: 9.0,
                is_published: false
            };
            const { data: seriesData, error: seriesError } = await supabase.from('cartoon_movies').insert(seriesPayload).select().single();
            if (seriesError || !seriesData) throw new Error(`فشل إنشاء المسلسل: ${seriesError?.message}`);
            addTestId(seriesData.id);
            addLog(`✅ نجاح: تم إنشاء المسلسل الأساسي.`);

            addLog("   - جاري إضافة موسم للمسلسل...");
            const { data: seasonData, error: seasonError } = await addSeason({
                series_id: seriesData.id,
                season_number: 1,
                title: "الموسم التجريبي",
                is_published: true
            });
            if (seasonError || !seasonData) throw new Error(`فشل إضافة الموسم: ${seasonError?.message}`);
            addLog(`✅ نجاح: تم إنشاء الموسم رقم 1.`);

            addLog("   - جاري إضافة حلقة للموسم...");
            const { error: epError } = await addEpisode({
                season_id: seasonData.id,
                title: "الحلقة التجريبية",
                videoUrl: "https://youtu.be/dQw4w9WgXcQ", // Fixed typo: video_url -> videoUrl
                episodeNumber: 1,
                seasonNumber: 1
            });
            if (epError) throw new Error(`فشل إضافة الحلقة: ${epError.message}`);
            addLog(`✅ نجاح: تم ربط الحلقة بالموسم بنجاح.`);

            // --- TEST 3: FRANCHISE LINKING ---
            setProgress(70);
            addLog("🔗 المرحلة 3: اختبار ربط سلسلة أفلام (Franchise)...");
            const franchiseName = `Diagnostic_Saga_${Date.now()}`;
            
            addLog(`   - إنشاء الجزء الأول من سلسلة: ${franchiseName}`);
            const { data: f1 } = await supabase.from('cartoon_movies').insert({
                title: `${franchiseName} - Part 1`,
                poster_url: "https://via.placeholder.com/600x900",
                type: 'movie',
                franchise: franchiseName,
                is_published: false
            }).select().single();
            if(f1) addTestId(f1.id);

            addLog(`   - إنشاء الجزء الثاني من نفس السلسلة...`);
            const { data: f2 } = await supabase.from('cartoon_movies').insert({
                title: `${franchiseName} - Part 2`,
                poster_url: "https://via.placeholder.com/600x900",
                type: 'movie',
                franchise: franchiseName,
                is_published: false
            }).select().single();
            if(f2) addTestId(f2.id);

            addLog("   - التحقق من الربط البرمجي بين الأجزاء...");
            const { data: linkedItems } = await supabase.from('cartoon_movies').select('id').eq('franchise', franchiseName);
            if (linkedItems && linkedItems.length === 2) {
                addLog(`✅ نجاح: تم ربط الفيلمين بالسلسلة واسترجاعهم معاً بنجاح.`);
            } else {
                addLog(`❌ فشل: لم يتم العثور على الربط بين الأجزاء.`);
                throw new Error("Franchise linking failed to query correctly.");
            }

            // --- CLEANUP ---
            setProgress(90);
            addLog("🧹 المرحلة الأخيرة: تنظيف بيانات الاختبار...");
            for (const id of testIds) {
                await deleteCartoonMovie(id);
            }
            addLog(`✅ نجاح: تم حذف ${testIds.length} عنصر اختبار بنجاح.`);

            setProgress(100);
            addLog("\n🏁 اكتمل الفحص الشامل بنجاح! جميع أنظمة الميديا تعمل بكفاءة.");
            addToast("اكتمل فحص السينما بنجاح!", ToastType.SUCCESS);

        } catch (error: any) {
            addLog(`❌ فشل الفحص: ${error.message}`);
            addToast("فشل الفحص. يرجى مراجعة السجلات.", ToastType.ERROR);
            // Emergency Cleanup
            for (const id of testIds) { await deleteCartoonMovie(id); }
        } finally {
            setIsSimulating(false);
        }
    };

    return (
        <div className="fade-in space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-red-500 transition-all shadow-sm active:scale-90">
                        <ArrowRightIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">مختبر MovieZone</h1>
                        <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">Cinema Lifecycle Diagnostics</p>
                    </div>
                </div>
                
                <button 
                    onClick={handleRunFullSimulation} 
                    disabled={isSimulating}
                    className="w-full md:w-auto px-10 py-4 bg-red-600 hover:bg-red-700 text-white rounded-[2rem] font-black text-sm shadow-xl shadow-red-500/30 transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                    {isSimulating ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <ShieldCheckIcon className="w-5 h-5" />}
                    <span>بدء الفحص السينمائي الشامل</span>
                </button>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Info Column */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[var(--bg-secondary)] p-8 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm">
                        <h2 className="text-xl font-black text-[var(--text-primary)] mb-6 flex items-center gap-3">
                            <FilmIcon className="w-6 h-6 text-red-500" /> مخرجات الفحص
                        </h2>
                        
                        <div className="space-y-4">
                            {[
                                { label: 'إضافة الأفلام والبوسترات', icon: PhotoIcon, color: 'text-blue-500' },
                                { label: 'هيكلة المسلسلات والحلقات', icon: VideoCameraIcon, color: 'text-purple-500' },
                                { label: 'ربط السلاسل (Franchise)', icon: FilmIcon, color: 'text-emerald-500' },
                                { label: 'سلامة قاعدة البيانات (FKs)', icon: DatabaseIcon, color: 'text-indigo-500' }
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
                                    <div className={`p-2 rounded-xl bg-white/10 ${item.color}`}>
                                        <item.icon className="w-5 h-5"/>
                                    </div>
                                    <span className="text-sm font-black text-[var(--text-primary)]">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-red-600 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <h3 className="text-lg font-black mb-2 relative z-10">إجراءات الحماية</h3>
                        <p className="text-sm font-bold opacity-80 leading-relaxed relative z-10">
                            يقوم الفحص الشامل بإنشاء بيانات اختبارية حقيقية للتحقق من سلامة كافة القيود (Constraints) في قاعدة البيانات، ثم يقوم بمسحها آلياً لضمان عدم استهلاك مساحة التخزين.
                        </p>
                        <SparklesIcon className="absolute bottom-4 left-4 w-12 h-12 opacity-20 rotate-12" />
                    </div>
                </div>

                {/* Logs Column */}
                <div className="lg:col-span-8">
                    <div className="bg-[var(--bg-secondary)] p-6 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-sm text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                                <DatabaseIcon className="w-5 h-5 opacity-70"/> تفاصيل العمليات
                            </h3>
                            {isSimulating && (
                                <div className="flex items-center gap-3">
                                    <div className="w-32 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                        <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <span className="text-sm font-black text-red-600">{progress}%</span>
                                </div>
                            )}
                        </div>
                        <LogViewer logs={logs} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartoonDiagnosticsView;
