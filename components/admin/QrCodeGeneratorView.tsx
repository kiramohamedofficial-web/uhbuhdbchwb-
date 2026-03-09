
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { generateSubscriptionCodes, getAllSubscriptionCodes, deleteSubscriptionCode, deleteAllSubscriptionCodes, deleteUsedSubscriptionCodes } from '../../services/subscriptionService';
import { getAllTeachers } from '../../services/teacherService';
import { getPlatformSettings } from '../../services/storageService';
import { Teacher, ToastType, SubscriptionCode, DurationType, durationLabels, PlatformSettings } from '../../types';
import { useToast } from '../../useToast';
import { QrcodeIcon, CheckCircleIcon, UsersIcon, SparklesIcon, ListIcon, TrashIcon, ClipboardIcon, ClockIcon, SearchIcon, ArrowRightIcon, CheckIcon, XIcon, ShieldExclamationIcon, ChartBarIcon, ChevronLeftIcon, ChevronRightIcon, PrinterIcon } from '../common/Icons';
import Loader from '../common/Loader';
import Modal from '../common/Modal';
import { useIcons } from '../../IconContext';

// --- Redesigned Card Component ---
const CodeCard: React.FC<{ 
    code: SubscriptionCode; 
    teacherMap: Map<string, string>; 
    onDelete?: (code: string) => void; 
    onCopy: (code: string) => void;
    isDeleting?: boolean;
}> = ({ code, teacherMap, onDelete, onCopy, isDeleting }) => {
    const isUsed = code.timesUsed >= code.maxUses;
    
    return (
        <div className={`relative overflow-hidden bg-[var(--bg-secondary)] rounded-xl border-l-4 shadow-sm transition-all duration-300 hover:translate-x-1 hover:shadow-md group ${isUsed ? 'border-red-500 opacity-80' : 'border-green-500'}`}>
            <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                
                {/* Left: Info */}
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shadow-inner ${isUsed ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                        {code.teacherId ? <UsersIcon className="w-6 h-6"/> : <SparklesIcon className="w-6 h-6"/>}
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-black text-xl text-[var(--text-primary)] tracking-widest truncate select-all">{code.code}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium text-[var(--text-secondary)]">
                            <span className="flex items-center gap-1">
                                <ClockIcon className="w-3 h-3"/> {code.durationDays} يوم
                            </span>
                            <span className="w-px h-3 bg-[var(--border-primary)]"></span>
                            <span>{code.teacherId ? teacherMap.get(code.teacherId) || 'مدرس غير معروف' : 'باقة شاملة'}</span>
                        </div>
                    </div>
                </div>

                {/* Right: Status & Actions */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-[var(--border-primary)] pt-3 sm:pt-0">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${isUsed ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                        {isUsed ? 'مستخدم' : 'متاح'}
                    </span>

                    <div className="flex gap-2">
                        <button 
                            onClick={() => onCopy(code.code)} 
                            className="p-2 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--accent-primary)] hover:text-white text-[var(--text-secondary)] transition-colors active:scale-95 border border-[var(--border-primary)] group/btn"
                            title="نسخ"
                        >
                            <ClipboardIcon className="w-4 h-4" />
                        </button>
                        {onDelete && (
                            <button 
                                onClick={() => onDelete(code.code)} 
                                disabled={isDeleting}
                                className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors active:scale-95 border border-transparent hover:border-red-500"
                                title="حذف"
                            >
                                {isDeleting ? <div className="simple-loader w-4 h-4 border-current border-t-transparent"></div> : <TrashIcon className="w-4 h-4" />}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const QrCodeGeneratorView: React.FC = () => {
    const [viewMode, setViewMode] = useState<'generate' | 'list'>('generate'); // Controls Main View vs Full List
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const icons = useIcons();
    
    // Generator State
    const [generationMode, setGenerationMode] = useState<'comprehensive' | 'teacher'>('comprehensive');
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>(''); 
    const [codeCount, setCodeCount] = useState(1);
    const [durationType, setDurationType] = useState<DurationType>('monthly');
    const [customDays, setCustomDays] = useState(30);
    const [isGenerating, setIsGenerating] = useState(false);
    const [recentlyGeneratedCodes, setRecentlyGeneratedCodes] = useState<SubscriptionCode[]>([]);
    
    // Management/List State
    const [existingCodes, setExistingCodes] = useState<SubscriptionCode[]>([]);
    const [filteredCodes, setFilteredCodes] = useState<SubscriptionCode[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'used'>('all');
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [deletingCode, setDeletingCode] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // Bulk Delete State
    const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
    const [isDeleteUsedModalOpen, setIsDeleteUsedModalOpen] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    
    // Export State
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const { addToast } = useToast();

    // Init
    useEffect(() => {
        getAllTeachers().then(data => {
            setTeachers(data);
            if (data.length > 0) {
                setSelectedTeacherId(data[0].id);
            }
        });
    }, []);

    const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);

    // Fetch Codes Logic
    const fetchCodes = useCallback(async () => {
        setIsLoadingList(true);
        try {
            const codes = await getAllSubscriptionCodes();
            setExistingCodes(codes);
            setFilteredCodes(codes);
        } catch (error) {
            console.error(error);
            addToast('فشل تحميل قائمة الأكواد.', ToastType.ERROR);
        } finally {
            setIsLoadingList(false);
        }
    }, [addToast]);

    // Switch View Handler
    const handleSwitchToManage = () => {
        setViewMode('list');
        fetchCodes();
    };

    // Calculate Stats
    const codeStats = useMemo(() => {
        const total = existingCodes.length;
        const used = existingCodes.filter(c => c.timesUsed >= c.maxUses).length;
        const available = total - used;
        return { total, used, available };
    }, [existingCodes]);

    // Filter Logic
    useEffect(() => {
        let result = existingCodes;

        // 1. Text Search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(c => 
                c.code.toLowerCase().includes(query) || 
                (c.teacherId && teacherMap.get(c.teacherId)?.toLowerCase().includes(query))
            );
        }

        // 2. Status Filter
        if (statusFilter !== 'all') {
            result = result.filter(c => {
                const isUsed = c.timesUsed >= c.maxUses;
                return statusFilter === 'active' ? !isUsed : isUsed;
            });
        }

        setFilteredCodes(result);
        setCurrentPage(1); // Reset to first page on filter change
    }, [searchQuery, statusFilter, existingCodes, teacherMap]);

    // Actions
    const handleGenerate = async () => {
        if (codeCount < 1) { addToast('الرجاء تحديد عدد الأكواد المطلوبة.', ToastType.ERROR); return; }
        if (generationMode === 'teacher' && !selectedTeacherId) { addToast('الرجاء اختيار المدرس.', ToastType.ERROR); return; }
        if (durationType === 'custom' && (!customDays || customDays < 1)) { addToast('الرجاء تحديد عدد الأيام.', ToastType.ERROR); return; }

        setIsGenerating(true);
        try {
            const finalTeacherId = generationMode === 'teacher' ? selectedTeacherId : null;
            const { data: codes, error } = await generateSubscriptionCodes({
                teacherId: finalTeacherId,
                durationType: durationType,
                customDays: durationType === 'custom' ? customDays : undefined,
                count: codeCount,
                maxUses: 1,
            });
            
            if (error) {
                addToast(`فشل توليد الأكواد: ${error.message}`, ToastType.ERROR);
            } else if (codes && codes.length > 0) {
                setRecentlyGeneratedCodes(codes);
                // Also update full list if in background
                setExistingCodes(prev => [...codes, ...prev]); 
                addToast(`تم توليد ${codes.length} كود بنجاح.`, ToastType.SUCCESS);
            } else {
                addToast('فشل توليد الأكواد.', ToastType.ERROR);
            }
        } catch (error: any) {
            addToast(`خطأ: ${error.message}`, ToastType.ERROR);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDelete = async (code: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا الكود نهائياً؟')) return;
        
        setDeletingCode(code);
        try {
            const { error } = await deleteSubscriptionCode(code);
            if (error) {
                addToast('فشل حذف الكود.', ToastType.ERROR);
            } else {
                addToast('تم حذف الكود بنجاح.', ToastType.SUCCESS);
                setExistingCodes(prev => prev.filter(c => c.code !== code));
                setRecentlyGeneratedCodes(prev => prev.filter(c => c.code !== code));
            }
        } catch (err) {
            addToast('حدث خطأ أثناء الحذف.', ToastType.ERROR);
        } finally {
            setDeletingCode(null);
        }
    };

    const handleDeleteAllCodes = async () => {
        setIsBulkDeleting(true);
        const { error } = await deleteAllSubscriptionCodes();
        if (error) {
            addToast(`فشل الحذف: ${error.message}`, ToastType.ERROR);
        } else {
            addToast('تم حذف جميع الأكواد بنجاح.', ToastType.SUCCESS);
            setExistingCodes([]);
            setRecentlyGeneratedCodes([]);
        }
        setIsBulkDeleting(false);
        setIsDeleteAllModalOpen(false);
    };

    const handleDeleteUsedCodes = async () => {
        setIsBulkDeleting(true);
        const { error, count } = await deleteUsedSubscriptionCodes();
        if (error) {
            addToast(`فشل الحذف: ${error.message}`, ToastType.ERROR);
        } else {
            addToast(`تم حذف ${count} كود مستخدم بنجاح.`, ToastType.SUCCESS);
            fetchCodes(); // Refresh to remove used ones
        }
        setIsBulkDeleting(false);
        setIsDeleteUsedModalOpen(false);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast('تم نسخ الكود.', ToastType.SUCCESS);
    };

    const copyAllGenerated = () => {
        if (recentlyGeneratedCodes.length === 0) return;
        const text = recentlyGeneratedCodes.map(c => {
            const type = c.teacherId ? `مدرس: ${teacherMap.get(c.teacherId) || 'غير معروف'}` : 'شامل';
            return `${c.code} - ${type} (${c.durationDays} يوم)`;
        }).join('\n');
        navigator.clipboard.writeText(text);
        addToast('تم نسخ الأكواد للحافظة.', ToastType.SUCCESS);
    };

    const handleExportUnusedPdf = async () => {
        setIsExportingPdf(true);
        
        // Filter only unused codes
        const unusedCodes = existingCodes.filter(c => c.timesUsed < c.maxUses);
        
        if (unusedCodes.length === 0) {
            addToast("لا توجد أكواد غير مستخدمة للتصدير.", ToastType.WARNING);
            setIsExportingPdf(false);
            return;
        }

        try {
            const settings = await getPlatformSettings();
            const platformName = settings?.platformName || "Gstudent";
            const logoUrl = icons.mainLogoUrl;

            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                addToast("يرجى السماح بالنوافذ المنبثقة للطباعة.", ToastType.ERROR);
                setIsExportingPdf(false);
                return;
            }

            const cardsHtml = unusedCodes.map(code => {
                const type = code.teacherId ? (teacherMap.get(code.teacherId) || "مادة محددة") : "الباقة الشاملة";
                return `
                    <div class="card">
                        <div class="card-header">
                            <div class="brand-section">
                                <img src="${logoUrl}" class="card-logo" alt="logo" />
                                <span class="platform-name">${platformName}</span>
                            </div>
                            <span class="duration">${code.durationDays} يوم</span>
                        </div>
                        <div class="card-body">
                            <div class="code-box">${code.code}</div>
                            <div class="type-badge">${type}</div>
                        </div>
                        <div class="card-footer">
                            <span>صالحة للاستخدام مرة واحدة</span>
                        </div>
                    </div>
                `;
            }).join('');

            printWindow.document.write(`
                <!DOCTYPE html>
                <html lang="ar" dir="rtl">
                <head>
                    <title>أكواد التفعيل - ${platformName}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
                        body { font-family: 'Cairo', sans-serif; background: #fff; padding: 20px; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                        .page-logo { height: 60px; object-fit: contain; margin-bottom: 10px; }
                        .title { font-size: 24px; font-weight: 900; color: #333; margin: 0; }
                        .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
                        
                        .grid {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 15px;
                        }
                        
                        .card {
                            border: 2px dashed #ccc;
                            border-radius: 12px;
                            padding: 12px;
                            background: #fafafa;
                            break-inside: avoid;
                            page-break-inside: avoid;
                            display: flex;
                            flex-direction: column;
                            justify-content: space-between;
                            min-height: 140px;
                        }
                        
                        .card-header { 
                            display: flex; 
                            justify-content: space-between; 
                            align-items: center; 
                            margin-bottom: 10px;
                            border-bottom: 1px solid #eee;
                            padding-bottom: 5px;
                        }
                        
                        .brand-section {
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        }
                        
                        .card-logo {
                            width: 20px;
                            height: 20px;
                            object-fit: contain;
                        }
                        
                        .platform-name { font-weight: 900; font-size: 12px; color: #4F46E5; }
                        .duration { font-size: 10px; font-weight: bold; background: #eee; padding: 2px 6px; rounded: 4px; color: #555; }
                        
                        .card-body { text-align: center; margin: 5px 0; }
                        
                        .code-box { 
                            font-family: monospace; 
                            font-size: 18px; 
                            font-weight: 900; 
                            letter-spacing: 2px; 
                            background: #fff; 
                            border: 1px solid #ddd; 
                            padding: 8px; 
                            border-radius: 6px;
                            color: #333;
                            margin-bottom: 5px;
                        }
                        
                        .type-badge {
                            display: inline-block;
                            font-size: 9px;
                            font-weight: 700;
                            color: #fff;
                            background: #4F46E5;
                            padding: 2px 8px;
                            border-radius: 10px;
                        }
                        
                        .card-footer { text-align: center; margin-top: 5px; font-size: 7px; color: #999; }
                        
                        @media print {
                            body { padding: 0; }
                            .card { border: 1px dashed #999; }
                            button { display: none; }
                            .grid { grid-template-columns: repeat(3, 1fr); gap: 10px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        ${logoUrl ? `<img src="${logoUrl}" class="page-logo" />` : ''}
                        <h1 class="title">أكواد تفعيل الاشتراكات</h1>
                        <p class="subtitle">تم التوليد بتاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
                    </div>
                    <div class="grid">
                        ${cardsHtml}
                    </div>
                    <script>
                        window.onload = () => { setTimeout(() => window.print(), 500); };
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
            
        } catch (e: any) {
            addToast(`خطأ في التصدير: ${e.message}`, ToastType.ERROR);
        } finally {
            setIsExportingPdf(false);
        }
    };

    // --- RENDER: LIST VIEW (FULL PAGE) ---
    if (viewMode === 'list') {
        const totalPages = Math.ceil(filteredCodes.length / itemsPerPage);
        const paginatedCodes = filteredCodes.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        );

        return (
            <div className="fade-in space-y-6 pb-20">
                {/* Header & Back Button */}
                <div className="flex items-center justify-between flex-shrink-0">
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)]">إدارة الأكواد</h1>
                        <p className="text-[var(--text-secondary)] mt-1">عرض وإدارة جميع أكواد الاشتراك في المنصة.</p>
                    </div>
                    <div className="flex gap-2">
                         <button 
                            onClick={handleExportUnusedPdf} 
                            disabled={isExportingPdf}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all font-bold shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                        >
                            {isExportingPdf ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <PrinterIcon className="w-5 h-5" />}
                            <span>تحميل الأكواد (PDF)</span>
                        </button>
                        <button 
                            onClick={() => setViewMode('generate')} 
                            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-[var(--text-primary)] rounded-xl transition-all font-bold"
                        >
                            <ArrowRightIcon className="w-5 h-5" />
                            <span>عودة للتوليد</span>
                        </button>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up">
                    <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-primary)] shadow-sm flex flex-col items-center justify-center">
                         <span className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">إجمالي الأكواد</span>
                         <span className="text-2xl font-black text-[var(--text-primary)]">{codeStats.total}</span>
                    </div>
                    <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20 flex flex-col items-center justify-center">
                         <span className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-1">متاح للاستخدام</span>
                         <span className="text-2xl font-black text-emerald-600">{codeStats.available}</span>
                    </div>
                    <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/20 flex flex-col items-center justify-center">
                         <span className="text-sm font-bold text-red-600 uppercase tracking-wider mb-1">مستهلك</span>
                         <span className="text-2xl font-black text-red-600">{codeStats.used}</span>
                    </div>
                    <button 
                        onClick={fetchCodes} 
                        disabled={isLoadingList}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl shadow-lg shadow-indigo-500/20 flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-50 group"
                    >
                        <ClockIcon className={`w-6 h-6 mb-1 ${isLoadingList ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} />
                        <span className="text-sm font-bold">تحديث البيانات</span>
                    </button>
                </div>

                {/* Bulk Actions Bar */}
                <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/20 flex flex-wrap gap-4 items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2 text-red-600">
                        <ShieldExclamationIcon className="w-6 h-6" />
                        <span className="font-bold text-sm">منطقة الخطر</span>
                    </div>
                    <div className="flex gap-3">
                         <button 
                            onClick={() => setIsDeleteUsedModalOpen(true)}
                            className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-bold transition-colors"
                        >
                            حذف الأكواد المستعملة
                        </button>
                        <button 
                            onClick={() => setIsDeleteAllModalOpen(true)}
                            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-bold transition-colors shadow-sm"
                        >
                            حذف جميع الأكواد
                        </button>
                    </div>
                </div>

                {/* Toolbar (Search & Filter) */}
                <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-primary)] shadow-sm flex flex-col md:flex-row gap-4 items-center flex-shrink-0">
                    <div className="relative flex-1 w-full">
                        <input 
                            type="text" 
                            placeholder="بحث عن كود، اسم المدرس..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-4 pr-12 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--accent-primary)] outline-none transition-all"
                        />
                        <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] opacity-70" />
                    </div>
                    
                    <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-xl w-full md:w-auto">
                        {(['all', 'active', 'used'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${statusFilter === f ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                            >
                                {{all: 'الكل', active: 'متاح', used: 'مستخدم'}[f]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List Content */}
                <div>
                    {isLoadingList ? (
                        <div className="flex justify-center p-20"><Loader /></div>
                    ) : paginatedCodes.length === 0 ? (
                        <div className="text-center py-32 bg-[var(--bg-tertiary)] rounded-2xl border-2 border-dashed border-[var(--border-primary)] flex flex-col items-center">
                            <QrcodeIcon className="w-20 h-20 text-[var(--text-secondary)] opacity-60 mb-6" />
                            <h3 className="text-xl font-bold text-[var(--text-primary)]">لا توجد أكواد</h3>
                            <p className="text-[var(--text-secondary)] mt-2">لم يتم العثور على نتائج مطابقة للبحث.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {paginatedCodes.map((code) => (
                                <CodeCard 
                                    key={code.code} 
                                    code={code} 
                                    teacherMap={teacherMap} 
                                    onCopy={copyToClipboard}
                                    onDelete={() => handleDelete(code.code)}
                                    isDeleting={deletingCode === code.code}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-6">
                        <button 
                            onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={currentPage === 1}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] disabled:opacity-50 transition-all hover:bg-[var(--bg-tertiary)]"
                        >
                            <ChevronRightIcon className="w-5 h-5 text-[var(--text-secondary)]" />
                        </button>
                        
                        <span className="text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-tertiary)] px-4 py-2 rounded-xl border border-[var(--border-primary)]">
                            صفحة {currentPage} من {totalPages}
                        </span>

                        <button 
                            onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={currentPage === totalPages}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] disabled:opacity-50 transition-all hover:bg-[var(--bg-tertiary)]"
                        >
                            <ChevronLeftIcon className="w-5 h-5 text-[var(--text-secondary)]" />
                        </button>
                    </div>
                )}

                {/* Delete All Modal */}
                <Modal isOpen={isDeleteAllModalOpen} onClose={() => setIsDeleteAllModalOpen(false)} title="تأكيد الحذف الشامل">
                    <div className="text-center p-4">
                        <TrashIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">هل أنت متأكد تماماً؟</h3>
                        <p className="text-[var(--text-secondary)] mb-6 text-sm">
                            أنت على وشك حذف <strong>جميع أكواد الاشتراك</strong> من قاعدة البيانات. هذا الإجراء لا يمكن التراجع عنه.
                        </p>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setIsDeleteAllModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] font-bold text-[var(--text-secondary)]">إلغاء</button>
                            <button onClick={handleDeleteAllCodes} disabled={isBulkDeleting} className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50">
                                {isBulkDeleting ? 'جاري الحذف...' : 'نعم، احذف الكل'}
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* Delete Used Modal */}
                <Modal isOpen={isDeleteUsedModalOpen} onClose={() => setIsDeleteUsedModalOpen(false)} title="تأكيد تنظيف الأكواد">
                    <div className="text-center p-4">
                        <CheckIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">تنظيف الأكواد المستعملة</h3>
                        <p className="text-[var(--text-secondary)] mb-6 text-sm">
                            سيتم حذف جميع الأكواد التي تم استخدامها بالكامل فقط. الأكواد المتاحة لن تتأثر.
                        </p>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setIsDeleteUsedModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] font-bold text-[var(--text-secondary)]">إلغاء</button>
                            <button onClick={handleDeleteUsedCodes} disabled={isBulkDeleting} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50">
                                {isBulkDeleting ? 'جاري التنظيف...' : 'تأكيد التنظيف'}
                            </button>
                        </div>
                    </div>
                </Modal>

            </div>
        );
    }

    // --- RENDER: GENERATOR VIEW ---
    return (
        <div className="fade-in max-w-5xl mx-auto space-y-8 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-center md:text-right">
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">توليد أكواد الاشتراك</h1>
                    <p className="text-[var(--text-secondary)]">أنشئ أكواد تفعيل جديدة للطلاب (شامل أو لمادة محددة).</p>
                </div>
                <button 
                    onClick={handleSwitchToManage}
                    className="flex items-center gap-2 px-6 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-bold rounded-xl border border-[var(--border-primary)] transition-all shadow-sm hover:shadow-md"
                >
                    <ListIcon className="w-5 h-5"/>
                    <span>إدارة الأكواد ({existingCodes.length > 0 ? existingCodes.length : 'عرض الكل'})</span>
                </button>
            </div>

            <div className="bg-[var(--bg-secondary)] p-6 md:p-8 rounded-3xl shadow-xl border border-[var(--border-primary)] space-y-8">
                {/* 1. Subscription Type Selection */}
                <div>
                    <label className="block text-sm font-bold text-[var(--text-secondary)] mb-4">نوع الصلاحية</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={() => setGenerationMode('comprehensive')}
                            className={`relative p-5 rounded-2xl border-2 transition-all flex items-center gap-4 overflow-hidden group ${
                                generationMode === 'comprehensive'
                                    ? 'border-green-500 bg-green-500/5 text-green-600 shadow-md'
                                    : 'border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'
                            }`}
                        >
                            <div className={`p-3 rounded-xl ${generationMode === 'comprehensive' ? 'bg-green-100 text-green-600' : 'bg-[var(--bg-secondary)]'}`}>
                                <SparklesIcon className="w-6 h-6" />
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-lg">اشتراك شامل</span>
                                <span className="text-sm opacity-80">يفتح جميع المواد والمدرسين</span>
                            </div>
                            {generationMode === 'comprehensive' && <CheckCircleIcon className="absolute top-4 left-4 w-6 h-6 text-green-500" />}
                        </button>

                        <button
                            onClick={() => setGenerationMode('teacher')}
                            className={`relative p-5 rounded-2xl border-2 transition-all flex items-center gap-4 overflow-hidden group ${
                                generationMode === 'teacher'
                                    ? 'border-purple-500 bg-purple-500/5 text-purple-600 shadow-md'
                                    : 'border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'
                            }`}
                        >
                            <div className={`p-3 rounded-xl ${generationMode === 'teacher' ? 'bg-purple-100 text-purple-600' : 'bg-[var(--bg-secondary)]'}`}>
                                <UsersIcon className="w-6 h-6" />
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-lg">مدرس محدد</span>
                                <span className="text-sm opacity-80">يفتح محتوى مدرس واحد فقط</span>
                            </div>
                            {generationMode === 'teacher' && <CheckCircleIcon className="absolute top-4 left-4 w-6 h-6 text-purple-500" />}
                        </button>
                    </div>
                </div>

                {/* 2. Teacher Selector */}
                {generationMode === 'teacher' && (
                    <div className="animate-slide-down">
                        <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">اختر المدرس</label>
                        <select 
                            value={selectedTeacherId} 
                            onChange={(e) => setSelectedTeacherId(e.target.value)} 
                            className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] font-bold focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                        >
                            {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.name} - {t.subject}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="h-px bg-[var(--border-primary)]"></div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">مدة الاشتراك</label>
                        <select 
                            value={durationType} 
                            onChange={(e) => setDurationType(e.target.value as DurationType)} 
                            className="w-full p-3.5 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] font-medium outline-none focus:border-[var(--accent-primary)]"
                        >
                            {Object.entries(durationLabels).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {durationType === 'custom' && (
                        <div className="md:col-span-1 animate-fade-in">
                            <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">عدد الأيام</label>
                            <input 
                                type="number" 
                                min="1" 
                                value={customDays} 
                                onChange={(e) => setCustomDays(parseInt(e.target.value))} 
                                className="w-full p-3.5 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] font-bold outline-none focus:border-[var(--accent-primary)] text-center"
                            />
                        </div>
                    )}

                    <div className="md:col-span-1">
                        <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">عدد الأكواد</label>
                        <input 
                            type="number" 
                            min="1" 
                            max="100"
                            value={codeCount} 
                            onChange={(e) => setCodeCount(parseInt(e.target.value))} 
                            className="w-full p-3.5 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] font-bold outline-none focus:border-[var(--accent-primary)] text-center"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button 
                        onClick={handleGenerate} 
                        disabled={isGenerating} 
                        className="w-full md:w-auto px-10 py-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white font-bold rounded-xl shadow-lg shadow-[var(--accent-primary)]/30 disabled:opacity-50 transition-all transform active:scale-95 flex items-center justify-center gap-3"
                    >
                        {isGenerating ? <Loader /> : <><QrcodeIcon className="w-6 h-6"/> إنشاء الأكواد</>}
                    </button>
                </div>
            </div>

            {recentlyGeneratedCodes.length > 0 && (
                <div className="bg-[var(--bg-secondary)] p-6 rounded-3xl shadow-xl border border-[var(--border-primary)] animate-slide-up">
                    <div className="flex justify-between items-center mb-6 border-b border-[var(--border-primary)] pb-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <CheckCircleIcon className="w-6 h-6 text-green-500" />
                            تم إنشاء {recentlyGeneratedCodes.length} كود بنجاح
                        </h3>
                        <button 
                            onClick={copyAllGenerated}
                            className="text-sm font-bold text-[var(--accent-primary)] hover:underline flex items-center gap-1"
                        >
                            <ClipboardIcon className="w-4 h-4" /> نسخ الكل
                        </button>
                    </div>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                        {recentlyGeneratedCodes.map((c, i) => (
                            <CodeCard 
                                key={c.code} 
                                code={c} 
                                teacherMap={teacherMap} 
                                onCopy={copyToClipboard}
                                onDelete={() => handleDelete(c.code)}
                                isDeleting={deletingCode === c.code}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QrCodeGeneratorView;
