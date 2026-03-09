
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/storageService';
import { useToast } from '../../useToast';
import { ToastType, IconSettings } from '../../types';
import { ArrowRightIcon, PhotoIcon, ServerIcon, ShieldExclamationIcon, CheckCircleIcon, XCircleIcon, SearchIcon, DatabaseIcon, SparklesIcon, CogIcon } from '../common/Icons';
import Loader from '../common/Loader';
import Modal from '../common/Modal';

// Define structure for collected media items
interface MediaItem {
    id: string;
    sourceTable: string; // e.g. 'courses', 'teachers'
    sourceTitle: string; // e.g. Course Name or Teacher Name
    field: string; // e.g. 'cover_image'
    url: string;
    status: 'pending' | 'ok' | 'broken';
}

const MediaIntegrityView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addToast } = useToast();
    const [viewMode, setViewMode] = useState<'scan' | 'gallery' | 'repair'>('scan');
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [scanProgress, setScanProgress] = useState({ checked: 0, total: 0, broken: 0 });
    const [searchQuery, setSearchQuery] = useState('');
    
    // Repair State
    const [oldDomain, setOldDomain] = useState('csipsaucwcuserhfrehn');
    const [newDomain, setNewDomain] = useState('aqswsgzuimedmyzkexhc');
    const [isRepairing, setIsRepairing] = useState(false);
    const [repairLogs, setRepairLogs] = useState<string[]>([]);

    // Fetch all media URLs from DB
    const fetchMediaData = useCallback(async () => {
        setIsLoading(true);
        const items: MediaItem[] = [];

        try {
            // 1. Courses (Cover Images)
            const { data: courses } = await supabase.from('courses').select('id, title, cover_image');
            courses?.forEach(c => {
                if (c.cover_image) items.push({ id: c.id, sourceTable: 'courses', sourceTitle: c.title, field: 'cover_image', url: c.cover_image, status: 'pending' });
            });

            // 2. Teachers (Profile Images)
            const { data: teachers } = await supabase.from('teachers').select('id, name, image_url');
            teachers?.forEach(t => {
                if (t.image_url) items.push({ id: t.id, sourceTable: 'teachers', sourceTitle: t.name, field: 'image_url', url: t.image_url, status: 'pending' });
            });

            // 3. Books (Covers)
            const { data: books } = await supabase.from('books').select('id, title, cover_image');
            books?.forEach(b => {
                if (b.cover_image) items.push({ id: b.id, sourceTable: 'books', sourceTitle: b.title, field: 'cover_image', url: b.cover_image, status: 'pending' });
            });

            // 4. Cartoon Movies (Posters)
            const { data: cartoons } = await supabase.from('cartoon_movies').select('id, title, poster_url');
            cartoons?.forEach(c => {
                if (c.poster_url) items.push({ id: c.id, sourceTable: 'cartoon_movies', sourceTitle: c.title, field: 'poster_url', url: c.poster_url, status: 'pending' });
            });
            
            // 5. Lessons (Quiz Images)
             const { data: lessons } = await supabase.from('lessons').select('id, title, image_url').not('image_url', 'is', null);
            lessons?.forEach(l => {
                if (l.image_url) items.push({ id: l.id, sourceTable: 'lessons', sourceTitle: l.title, field: 'image_url', url: l.image_url, status: 'pending' });
            });

            // 6. Platform Settings (Icons & UI Images)
            const { data: settingsData } = await supabase.from('platform_settings').select('icon_settings').limit(1).single();
            if (settingsData?.icon_settings) {
                const icons = settingsData.icon_settings as Record<string, string>;
                
                // Labels mapping for cleaner display
                const labels: Record<string, string> = {
                    faviconUrl: 'أيقونة المتصفح (Favicon)',
                    mainLogoUrl: 'الشعار الرئيسي',
                    welcomeHeroImageUrl: 'صورة الواجهة الترحيبية',
                    authLoginIconUrl: 'أيقونة تسجيل الدخول',
                    authRegisterIconUrl: 'أيقونة إنشاء حساب',
                    studentNavHomeIconUrl: 'أيقونة القائمة الرئيسية',
                    // Add generic fallback
                };

                Object.entries(icons).forEach(([key, url]) => {
                    if (url && typeof url === 'string' && url.trim() !== '') {
                         items.push({
                            id: key,
                            sourceTable: 'platform_settings',
                            sourceTitle: labels[key] || key, // Use Arabic label or fallback to key name
                            field: key,
                            url: url,
                            status: 'pending'
                        });
                    }
                });
            }

            setMediaItems(items);
            setScanProgress({ checked: 0, total: items.length, broken: 0 });
            
        } catch (error) {
            console.error("Error fetching media:", error);
            addToast("فشل جلب بيانات الوسائط.", ToastType.ERROR);
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchMediaData();
    }, [fetchMediaData]);

    const runIntegrityCheck = async () => {
        setIsLoading(true);
        let brokenCount = 0;
        let checkedCount = 0;
        
        // Create a copy to update state
        const updatedItems = [...mediaItems];

        // Process in batches to avoid browser freeze
        const BATCH_SIZE = 10;
        for (let i = 0; i < updatedItems.length; i += BATCH_SIZE) {
            const batch = updatedItems.slice(i, i + BATCH_SIZE);
            
            await Promise.all(batch.map(async (item, index) => {
                const globalIndex = i + index;
                try {
                    // Use fetch with no-cors if possible, or simple Image load for images
                    // Image load is more reliable for "is it displayable?" check
                    await new Promise((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => resolve(true);
                        img.onerror = () => reject(false);
                        img.src = item.url;
                    });
                    updatedItems[globalIndex].status = 'ok';
                } catch (e) {
                    updatedItems[globalIndex].status = 'broken';
                    brokenCount++;
                }
                checkedCount++;
            }));
            
            setScanProgress({ checked: checkedCount, total: mediaItems.length, broken: brokenCount });
            setMediaItems([...updatedItems]); // Update UI progressively
        }
        
        setIsLoading(false);
        addToast(`اكتمل الفحص. تم العثور على ${brokenCount} ملف تالف.`, brokenCount > 0 ? ToastType.WARNING : ToastType.SUCCESS);
    };

    const handleRepair = async () => {
        if (!oldDomain || !newDomain) {
            addToast("الرجاء إدخال النطاق القديم والجديد.", ToastType.ERROR);
            return;
        }

        setIsRepairing(true);
        setRepairLogs([]);
        const addLog = (msg: string) => setRepairLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

        try {
            addLog(`بدء عملية الإصلاح: استبدال "${oldDomain}" بـ "${newDomain}"...`);

            const itemsToFix = mediaItems.filter(item => item.url.includes(oldDomain));
            addLog(`تم العثور على ${itemsToFix.length} عنصر يحتاج للتحديث في الذاكرة.`);

            let fixCount = 0;

            // Group by table to optimize updates
            const tablesToUpdate: Record<string, MediaItem[]> = {};
            itemsToFix.forEach(item => {
                if (!tablesToUpdate[item.sourceTable]) tablesToUpdate[item.sourceTable] = [];
                tablesToUpdate[item.sourceTable].push(item);
            });

            for (const [table, items] of Object.entries(tablesToUpdate)) {
                addLog(`جاري معالجة الجدول: ${table} (${items.length} عنصر)...`);
                
                if (table === 'platform_settings') {
                    // Special handling for JSONB
                    const { data: settingsData } = await supabase.from('platform_settings').select('id, icon_settings').limit(1).single();
                    if (settingsData) {
                        const icons = settingsData.icon_settings as Record<string, string>;
                        let changed = false;
                        
                        items.forEach(item => {
                            if (icons[item.field] && icons[item.field].includes(oldDomain)) {
                                icons[item.field] = icons[item.field].replace(oldDomain, newDomain);
                                changed = true;
                                fixCount++;
                            }
                        });

                        if (changed) {
                            const { error } = await supabase.from('platform_settings').update({ icon_settings: icons }).eq('id', settingsData.id);
                            if (error) addLog(`❌ فشل تحديث إعدادات الأيقونات: ${error.message}`);
                            else addLog(`✅ تم تحديث إعدادات الأيقونات بنجاح.`);
                        }
                    }
                } else {
                    // Standard Tables
                    for (const item of items) {
                        const newUrl = item.url.replace(oldDomain, newDomain);
                        const { error } = await supabase.from(table).update({ [item.field]: newUrl }).eq('id', item.id);
                        if (error) {
                            addLog(`❌ فشل تحديث ${item.sourceTitle} (ID: ${item.id}): ${error.message}`);
                        } else {
                            fixCount++;
                        }
                    }
                }
            }

            addLog(`✅ اكتملت العملية. تم إصلاح ${fixCount} رابط.`);
            addToast(`تم إصلاح ${fixCount} رابط بنجاح.`, ToastType.SUCCESS);
            fetchMediaData(); // Refresh list

        } catch (error: any) {
            addLog(`🚨 خطأ غير متوقع: ${error.message}`);
            addToast("حدث خطأ أثناء عملية الإصلاح.", ToastType.ERROR);
        } finally {
            setIsRepairing(false);
        }
    };

    const filteredItems = mediaItems.filter(item => 
        item.sourceTitle.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.sourceTable.includes(searchQuery.toLowerCase())
    );

    const brokenItems = mediaItems.filter(item => item.status === 'broken');

    return (
        <div className="fade-in pb-20">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <button onClick={onBack} className="flex items-center space-x-2 space-x-reverse mb-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        <ArrowRightIcon className="w-4 h-4" />
                        <span>العودة إلى فحص الأعطال</span>
                    </button>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">فحص سلامة الوسائط</h1>
                    <p className="text-[var(--text-secondary)] mt-1">كشف الملفات التالفة وإصلاح الروابط القديمة.</p>
                </div>
                
                <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-primary)] shadow-sm">
                     <button 
                        onClick={() => setViewMode('scan')} 
                        className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'scan' ? 'bg-[var(--accent-primary)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                    >
                        <ShieldExclamationIcon className="w-4 h-4" /> الفحص
                    </button>
                    <button 
                        onClick={() => setViewMode('gallery')} 
                        className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'gallery' ? 'bg-[var(--accent-primary)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                    >
                        <PhotoIcon className="w-4 h-4" /> المعرض
                    </button>
                    <button 
                        onClick={() => setViewMode('repair')} 
                        className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'repair' ? 'bg-purple-600 text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                    >
                        <SparklesIcon className="w-4 h-4" /> الإصلاح
                    </button>
                </div>
            </div>

            {viewMode === 'repair' && (
                <div className="animate-fade-in space-y-6">
                    <div className="bg-[var(--bg-secondary)] p-8 rounded-2xl shadow-lg border border-[var(--border-primary)]">
                        <div className="flex items-center gap-3 mb-6 border-b border-[var(--border-primary)] pb-4">
                            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600"><CogIcon className="w-6 h-6" /></div>
                            <div>
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">أداة إصلاح النطاق (Domain Fixer)</h2>
                                <p className="text-sm text-[var(--text-secondary)]">استبدال جزء من روابط الصور في قاعدة البيانات بشكل جماعي.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div>
                                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">النطاق القديم (للاستبدال)</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={oldDomain} 
                                        onChange={e => setOldDomain(e.target.value)} 
                                        className="w-full p-3 bg-[var(--bg-tertiary)] border border-red-500/30 rounded-xl text-[var(--text-primary)] dir-ltr font-mono text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                                        dir="ltr"
                                    />
                                    <div className="absolute top-1/2 right-3 -translate-y-1/2 text-red-500"><XCircleIcon className="w-5 h-5"/></div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">النطاق الجديد (الصحيح)</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={newDomain} 
                                        onChange={e => setNewDomain(e.target.value)} 
                                        className="w-full p-3 bg-[var(--bg-tertiary)] border border-green-500/30 rounded-xl text-[var(--text-primary)] dir-ltr font-mono text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                                        dir="ltr"
                                    />
                                    <div className="absolute top-1/2 right-3 -translate-y-1/2 text-green-500"><CheckCircleIcon className="w-5 h-5"/></div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl mb-6 text-sm text-yellow-700 dark:text-yellow-400">
                            <strong>تنبيه:</strong> سيقوم هذا الإجراء بالبحث في جميع جداول الوسائط (الكورسات، المدرسين، الإعدادات، إلخ) واستبدال النص القديم بالجديد داخل روابط الصور. هذه العملية لا يمكن التراجع عنها.
                        </div>

                        <button 
                            onClick={handleRepair} 
                            disabled={isRepairing}
                            className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-3"
                        >
                            {isRepairing ? <Loader /> : <><SparklesIcon className="w-5 h-5"/> بدء عملية الإصلاح</>}
                        </button>
                    </div>

                    <div className="bg-[var(--bg-tertiary)] p-6 rounded-2xl border border-[var(--border-primary)] h-64 overflow-y-auto font-mono text-sm">
                        <p className="text-[var(--text-secondary)] mb-2 font-bold uppercase tracking-widest border-b border-[var(--border-primary)] pb-2">سجل العمليات (Logs)</p>
                        {repairLogs.length === 0 ? (
                            <p className="text-gray-500 italic">بانتظار بدء العملية...</p>
                        ) : (
                            repairLogs.map((log, idx) => (
                                <div key={idx} className="mb-1 text-[var(--text-primary)]">{log}</div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {viewMode === 'scan' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-[var(--bg-secondary)] p-8 rounded-2xl shadow-lg border border-[var(--border-primary)] text-center">
                        <ServerIcon className="w-20 h-20 mx-auto text-purple-500 mb-6 opacity-80" />
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">فحص الروابط المعطلة</h2>
                        <p className="text-[var(--text-secondary)] mb-8 max-w-lg mx-auto">
                            سيقوم النظام بالتحقق من {mediaItems.length} رابط صورة مسجل في قاعدة البيانات (شاملة أيقونات المنصة وصور الكورسات والمدرسين) للتأكد من أنها تعمل بشكل صحيح.
                        </p>
                        
                        <div className="flex justify-center mb-8">
                            <div className="grid grid-cols-3 gap-8 text-center">
                                <div>
                                    <p className="text-3xl font-black text-[var(--text-primary)]">{mediaItems.length}</p>
                                    <p className="text-sm font-bold text-[var(--text-secondary)] uppercase">إجمالي الملفات</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-green-500">{scanProgress.checked}</p>
                                    <p className="text-sm font-bold text-[var(--text-secondary)] uppercase">تم فحصه</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-red-500">{scanProgress.broken}</p>
                                    <p className="text-sm font-bold text-[var(--text-secondary)] uppercase">تالف / مفقود</p>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={runIntegrityCheck} 
                            disabled={isLoading}
                            className="px-10 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-wait flex items-center gap-3 mx-auto"
                        >
                            {isLoading ? <Loader /> : <><ShieldExclamationIcon className="w-5 h-5"/> بدء الفحص الآلي</>}
                        </button>
                    </div>

                    {brokenItems.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
                                <XCircleIcon className="w-5 h-5" /> الملفات التالفة ({brokenItems.length})
                            </h3>
                            <div className="grid gap-3">
                                {brokenItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-black/20 rounded-lg border border-red-100 dark:border-red-800/30">
                                        <div>
                                            <p className="font-bold text-sm text-[var(--text-primary)]">{item.sourceTitle}</p>
                                            <p className="text-sm text-[var(--text-secondary)] font-mono mt-1">Table: {item.sourceTable} | ID: {item.id}</p>
                                        </div>
                                        <a href={item.url} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline truncate max-w-[200px]">{item.url}</a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {viewMode === 'gallery' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Search Bar */}
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="ابحث باسم الكورس، المدرس، الأيقونة..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-4 pr-12 py-4 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all text-[var(--text-primary)] font-medium"
                        />
                        <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-[var(--text-secondary)] opacity-50" />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredItems.map((item, idx) => (
                            <div key={idx} className="group relative bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
                                <div className="aspect-square bg-[var(--bg-tertiary)] relative overflow-hidden flex items-center justify-center p-2">
                                    <img 
                                        src={item.url} 
                                        alt={item.sourceTitle} 
                                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                                        loading="lazy"
                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400?text=Broken+Image'; }}
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <a href={item.url} target="_blank" rel="noreferrer" className="text-white bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-sm font-bold hover:bg-white/40 transition-colors">عرض الصورة</a>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <p className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1 bg-[var(--bg-tertiary)] inline-block px-1.5 py-0.5 rounded">{item.sourceTable}</p>
                                    <h4 className="font-bold text-sm text-[var(--text-primary)] truncate" title={item.sourceTitle}>{item.sourceTitle}</h4>
                                </div>
                                {item.status === 'broken' && (
                                    <div className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg" title="صورة تالفة">
                                        <XCircleIcon className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    
                    {filteredItems.length === 0 && (
                        <div className="text-center py-20">
                            <DatabaseIcon className="w-16 h-16 mx-auto text-[var(--text-secondary)] opacity-20 mb-4" />
                            <p className="text-[var(--text-secondary)]">لم يتم العثور على صور مطابقة.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MediaIntegrityView;
