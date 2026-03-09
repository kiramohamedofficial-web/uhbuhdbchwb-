import React, { useState, useEffect } from 'react';
import { CartoonMovie, CartoonSeason, CartoonEpisode } from '../../../types';
import Modal from '../../common/Modal';
import ImageUpload from '../../common/ImageUpload';
import { 
    InformationCircleIcon, LinkIcon, ListIcon, PhotoIcon, 
    VideoCameraIcon, MegaphoneIcon, DownloadIcon, PlusIcon, 
    TrashIcon, CollectionIcon, ChevronDownIcon, CheckCircleIcon, StarIcon 
} from '../../common/Icons';
import { addSeason, deleteSeason, addEpisode, deleteEpisode } from '../../../services/movieService';

interface MovieEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    movie: CartoonMovie | null;
    onSave: (data: Partial<CartoonMovie>) => Promise<void>;
}

const MovieEditorModal: React.FC<MovieEditorModalProps> = ({ isOpen, onClose, movie, onSave }) => {
    const [editingMovieData, setEditingMovieData] = useState<Partial<CartoonMovie>>({});
    const [activeModalTab, setActiveModalTab] = useState<'basic' | 'media' | 'seasons'>('basic');
    const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const initialData: Partial<CartoonMovie> = movie ? { ...movie } : { 
                isPublished: true, type: 'movie', rating: 8, category: 'أنيميشن',
                downloadLinks: [], seasons: [], galleryImages: [],
                releaseYear: new Date().getFullYear().toString()
            };
            setEditingMovieData(initialData);
            setActiveModalTab('basic');
        }
    }, [isOpen, movie]);

    const handleAddSeasonLocal = () => {
        const newSeason: Partial<CartoonSeason> = {
            id: `new-s-${Date.now()}`,
            season_number: (editingMovieData.seasons?.length || 0) + 1,
            title: `الموسم ${(editingMovieData.seasons?.length || 0) + 1}`,
            is_published: true,
            episodes: []
        };
        setEditingMovieData(prev => ({
            ...prev,
            seasons: [...(prev.seasons || []), newSeason as CartoonSeason]
        }));
        setActiveSeasonId(newSeason.id!);
    };

    const handleAddEpisodeLocal = (seasonId: string) => {
        setEditingMovieData(prev => {
            const seasons = [...(prev.seasons || [])];
            const seasonIdx = seasons.findIndex(s => s.id === seasonId);
            if (seasonIdx === -1) return prev;
            const newEp: Partial<CartoonEpisode> = {
                id: `new-e-${Date.now()}`,
                episodeNumber: (seasons[seasonIdx].episodes?.length || 0) + 1,
                title: `الحلقة ${(seasons[seasonIdx].episodes?.length || 0) + 1}`,
                videoUrl: '', 
                downloadLinks: []
            };
            seasons[seasonIdx] = {
                ...seasons[seasonIdx],
                episodes: [...(seasons[seasonIdx].episodes || []), newEp as CartoonEpisode]
            };
            return { ...prev, seasons };
        });
    };

    const handleDeleteSeasonLocal = async (seasonId: string) => {
         if (seasonId.startsWith('new-')) {
             setEditingMovieData(prev => ({
                ...prev,
                seasons: prev.seasons?.filter(s => s.id !== seasonId)
            }));
         } else {
             if(!confirm("حذف الموسم نهائياً؟")) return;
             // Note: In a real app, we might want to handle this deletion in the parent or service
             // But for now, we'll keep the logic here or assume the parent handles it if we pass the modified data
             // However, the original code called deleteSeason directly.
             // To keep it simple, we will call the service here as it was in the original code.
             await deleteSeason(seasonId);
             setEditingMovieData(prev => ({
                ...prev,
                seasons: prev.seasons?.filter(s => s.id !== seasonId)
            }));
         }
    };
    
    const handleDeleteEpisodeLocal = async (seasonId: string, episodeId: string) => {
         if (episodeId.startsWith('new-')) {
             setEditingMovieData(prev => {
                const seasons = [...(prev.seasons || [])];
                const sIdx = seasons.findIndex(s => s.id === seasonId);
                if (sIdx > -1) {
                    seasons[sIdx].episodes = seasons[sIdx].episodes?.filter(e => e.id !== episodeId);
                }
                return { ...prev, seasons };
             });
         } else {
             if(!confirm("حذف الحلقة نهائياً؟")) return;
             await deleteEpisode(episodeId);
             setEditingMovieData(prev => {
                const seasons = [...(prev.seasons || [])];
                const sIdx = seasons.findIndex(s => s.id === seasonId);
                if (sIdx > -1) {
                    seasons[sIdx].episodes = seasons[sIdx].episodes?.filter(e => e.id !== episodeId);
                }
                return { ...prev, seasons };
             });
         }
    };

    const handleAddDownloadLink = (seasonIdx: number, episodeIdx: number) => {
        setEditingMovieData(prev => {
            const seasons = [...(prev.seasons || [])];
            const ep = seasons[seasonIdx].episodes![episodeIdx];
            ep.downloadLinks = [...(ep.downloadLinks || []), { quality: '', url: '' }];
            return { ...prev, seasons };
        });
    };

    const handleUpdateDownloadLink = (seasonIdx: number, episodeIdx: number, linkIdx: number, field: 'quality' | 'url', value: string) => {
        setEditingMovieData(prev => {
            const seasons = [...(prev.seasons || [])];
            const ep = seasons[seasonIdx].episodes![episodeIdx];
            const links = [...(ep.downloadLinks || [])];
            links[linkIdx] = { ...links[linkIdx], [field]: value };
            ep.downloadLinks = links;
            return { ...prev, seasons };
        });
    };

    const handleDeleteDownloadLink = (seasonIdx: number, episodeIdx: number, linkIdx: number) => {
        setEditingMovieData(prev => {
             const seasons = [...(prev.seasons || [])];
             const ep = seasons[seasonIdx].episodes![episodeIdx];
             ep.downloadLinks = ep.downloadLinks?.filter((_, i) => i !== linkIdx);
             return { ...prev, seasons };
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={movie ? `تعديل العمل` : 'إضافة عمل جديد'} maxWidth="max-w-6xl">
             <div className="flex flex-col h-[80vh]">
                <div className="flex p-1.5 bg-[var(--bg-tertiary)] rounded-2xl mb-6 border border-[var(--border-primary)] w-full overflow-x-auto scrollbar-hide">
                    <div className="flex gap-1 min-w-max">
                        <button onClick={() => setActiveModalTab('basic')} className={`px-6 py-2.5 rounded-xl text-sm sm:text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap ${activeModalTab === 'basic' ? 'bg-indigo-600 text-white shadow-sm' : 'text-[var(--text-secondary)]'}`}>
                            <InformationCircleIcon className="w-4 h-4"/> البيانات العامة
                        </button>
                        <button onClick={() => setActiveModalTab('media')} className={`px-6 py-2.5 rounded-xl text-sm sm:text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap ${activeModalTab === 'media' ? 'bg-indigo-600 text-white shadow-sm' : 'text-[var(--text-secondary)]'}`}>
                            <LinkIcon className="w-4 h-4"/> الوسائط والمعرض
                            {editingMovieData.downloadLinks && editingMovieData.downloadLinks.length > 0 && (
                                <span className="bg-emerald-500 text-white text-sm px-1.5 py-0.5 rounded-full ml-1">{editingMovieData.downloadLinks.length}</span>
                            )}
                        </button>
                        {editingMovieData.type === 'series' && (
                            <button onClick={() => setActiveModalTab('seasons')} className={`px-6 py-2.5 rounded-xl text-sm sm:text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap ${activeModalTab === 'seasons' ? 'bg-indigo-600 text-white shadow-sm' : 'text-[var(--text-secondary)]'}`}>
                                <ListIcon className="w-4 h-4"/> المواسم والحلقات
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 -mr-3">
                    {activeModalTab === 'basic' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in pb-10">
                            <div className="lg:col-span-4 space-y-4">
                                <div className="p-4 bg-[var(--bg-tertiary)] rounded-[2rem] border border-[var(--border-primary)] text-center shadow-inner relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-600/10 transition-colors"></div>
                                    <label className="text-sm font-black uppercase tracking-widest text-indigo-600 block mb-3">البوستر الرئيسي</label>
                                    <div className="aspect-[2/3] w-32 mx-auto rounded-2xl overflow-hidden bg-black/10 mb-4 border-2 border-dashed border-[var(--border-primary)] relative shadow-xl group-hover:scale-105 transition-transform duration-500">
                                        {editingMovieData.posterUrl ? <img src={editingMovieData.posterUrl} className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center opacity-20"><PhotoIcon className="w-8 h-8"/></div>}
                                    </div>
                                    <ImageUpload label="" value={editingMovieData.posterUrl || ''} onChange={v => setEditingMovieData({...editingMovieData, posterUrl: v})} />
                                </div>
                                <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-xl border border-[var(--border-primary)] shadow-sm">
                                    {['movie', 'series'].map(t => (
                                        <button key={t} onClick={() => setEditingMovieData({...editingMovieData, type: t as any})} className={`flex-1 py-2.5 rounded-lg text-sm font-black transition-all uppercase tracking-widest ${editingMovieData.type === t ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-indigo-600'}`}>
                                            {t === 'movie' ? 'فيلم' : 'مسلسل'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="lg:col-span-8 space-y-6">
                                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="col-span-2 lg:col-span-3">
                                        <label className="block text-sm font-black text-indigo-600 uppercase tracking-widest mb-2 mr-2">العنوان</label>
                                        <input type="text" value={editingMovieData.title || ''} onChange={e => setEditingMovieData({...editingMovieData, title: e.target.value})} className="w-full px-5 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-2xl font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm text-sm" placeholder="اسم العمل..." />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 mr-2">التصنيف</label>
                                        <input type="text" value={editingMovieData.category || ''} onChange={e => setEditingMovieData({...editingMovieData, category: e.target.value})} className="w-full px-5 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="أكشن، دراما..." />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 mr-2">التقييم</label>
                                        <div className="relative">
                                            <input type="number" step="0.1" value={editingMovieData.rating || 0} onChange={e => setEditingMovieData({...editingMovieData, rating: parseFloat(e.target.value)})} className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all pl-8" />
                                            <StarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-amber-500 opacity-50" />
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 mr-2">السنة</label>
                                        <input type="text" value={editingMovieData.releaseYear || ''} onChange={e => setEditingMovieData({...editingMovieData, releaseYear: e.target.value})} className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="2024" />
                                    </div>
                                    <div className="col-span-1 sm:col-span-1">
                                        <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 mr-2">المدة</label>
                                        <input type="text" value={editingMovieData.duration || ''} onChange={e => setEditingMovieData({...editingMovieData, duration: e.target.value})} className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="1h 30m" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-black text-indigo-600 uppercase tracking-widest mb-2 mr-2">القصة</label>
                                    <textarea value={editingMovieData.story || ''} onChange={e => setEditingMovieData({...editingMovieData, story: e.target.value})} className="w-full px-5 py-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-inner" rows={4} placeholder="وصف العمل..."></textarea>
                                    <p className="text-sm text-[var(--text-secondary)] mt-2 mr-2 flex items-center gap-1">
                                        <InformationCircleIcon className="w-3 h-3"/>
                                        لإضافة روابط التحميل والجودة، انتقل إلى تبويب <strong>"الوسائط والروابط"</strong>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeModalTab === 'media' && (
                        <div className="space-y-6 animate-fade-in pb-10">
                            <div className="bg-indigo-600/5 border border-indigo-600/10 p-4 sm:p-6 rounded-[2rem] space-y-4">
                                <h3 className="font-black text-sm text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                    <VideoCameraIcon className="w-4 h-4"/> روابط المشاهدة
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mr-2">رابط الفيلم</label>
                                        <input type="text" value={editingMovieData.videoUrl || ''} onChange={e => setEditingMovieData({...editingMovieData, videoUrl: e.target.value})} className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl font-bold text-sm outline-none dir-ltr" dir="ltr" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mr-2">رابط التريلر</label>
                                        <input type="text" value={editingMovieData.trailerUrl || ''} onChange={e => setEditingMovieData({...editingMovieData, trailerUrl: e.target.value})} className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl font-bold text-sm outline-none dir-ltr" dir="ltr" />
                                    </div>
                                    <div className="sm:col-span-2 space-y-1.5">
                                        <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mr-2">رابط الإعلان</label>
                                        <div className="relative">
                                            <input type="text" value={editingMovieData.adUrl || ''} onChange={e => setEditingMovieData({...editingMovieData, adUrl: e.target.value})} className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl font-bold text-sm outline-none dir-ltr" dir="ltr" placeholder="رابط..." />
                                            <MegaphoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 opacity-60 text-amber-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-emerald-600/5 border border-emerald-600/10 p-4 sm:p-6 rounded-[2rem] space-y-6 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-600/5 blur-3xl -ml-16 -mt-16"></div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <h3 className="font-black text-sm text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                        <DownloadIcon className="w-4 h-4"/> روابط التحميل
                                    </h3>
                                    <button onClick={() => setEditingMovieData(prev => ({...prev, downloadLinks: [...(prev.downloadLinks || []), { quality: '', url: '' }]}))} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:scale-105 transition-transform active:scale-95 flex items-center gap-1 w-fit">
                                        <PlusIcon className="w-3 h-3" /> إضافة سيرفر
                                    </button>
                                </div>
                                
                                <div className="space-y-3">
                                    {(editingMovieData.downloadLinks || []).length === 0 ? (
                                        <div className="py-8 text-center border-2 border-dashed border-emerald-600/20 rounded-2xl bg-emerald-600/5">
                                            <p className="text-emerald-600/40 font-black text-sm uppercase tracking-widest">لا توجد روابط</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-3">
                                            {(editingMovieData.downloadLinks || []).map((link, idx) => (
                                                <div key={idx} className="flex flex-col sm:flex-row gap-3 items-center bg-white dark:bg-slate-900/50 p-3 rounded-2xl border border-emerald-600/10 shadow-sm group hover:border-emerald-600/30 transition-all">
                                                    <div className="w-full sm:w-1/4 space-y-1">
                                                        <label className="block text-[8px] font-black text-emerald-600 uppercase mr-1">الجودة</label>
                                                        <input 
                                                            value={link.quality} 
                                                            onChange={(e) => {
                                                                const newLinks = [...(editingMovieData.downloadLinks || [])];
                                                                newLinks[idx].quality = e.target.value;
                                                                setEditingMovieData({...editingMovieData, downloadLinks: newLinks});
                                                            }} 
                                                            placeholder="1080p" 
                                                            className="w-full p-2.5 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)] text-sm font-black outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                                        />
                                                    </div>
                                                    <div className="w-full sm:flex-1 space-y-1">
                                                        <label className="block text-[8px] font-black text-emerald-600 uppercase mr-1">الرابط</label>
                                                        <div className="relative">
                                                            <input 
                                                                value={link.url} 
                                                                onChange={(e) => {
                                                                    const newLinks = [...(editingMovieData.downloadLinks || [])];
                                                                    newLinks[idx].url = e.target.value;
                                                                    setEditingMovieData({...editingMovieData, downloadLinks: newLinks});
                                                                }} 
                                                                placeholder="URL..." 
                                                                className="w-full p-2.5 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)] text-sm dir-ltr outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                                                dir="ltr"
                                                            />
                                                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-600 opacity-60" />
                                                        </div>
                                                    </div>
                                                    <button onClick={() => {
                                                        const newLinks = editingMovieData.downloadLinks?.filter((_, i) => i !== idx);
                                                        setEditingMovieData({...editingMovieData, downloadLinks: newLinks});
                                                    }} className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-all self-end sm:self-center"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-purple-600/5 border border-purple-600/10 p-6 rounded-[2.5rem] space-y-6">
                                <h3 className="font-black text-sm text-purple-600 uppercase tracking-widest flex items-center gap-2">
                                    <CollectionIcon className="w-5 h-5"/> معرض الصور الإضافية (Gallery)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(editingMovieData.galleryImages || []).map((img, idx) => (
                                        <div key={idx} className="flex gap-4 items-center bg-white/5 p-4 rounded-3xl border border-white/5">
                                            <div className="flex-1">
                                                <ImageUpload label={`صورة المعرض ${idx + 1}`} value={img} onChange={(v) => {
                                                    const newGallery = [...(editingMovieData.galleryImages || [])];
                                                    newGallery[idx] = v;
                                                    setEditingMovieData({...editingMovieData, galleryImages: newGallery});
                                                }} />
                                            </div>
                                            <button onClick={() => {
                                                const newGallery = editingMovieData.galleryImages?.filter((_, i) => i !== idx);
                                                setEditingMovieData({...editingMovieData, galleryImages: newGallery});
                                            }} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><TrashIcon className="w-5 h-5" /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => setEditingMovieData(prev => ({...prev, galleryImages: [...(prev.galleryImages || []), '']}))} className="w-full py-6 border-2 border-dashed border-purple-300 text-purple-500 rounded-[2rem] font-black text-sm hover:bg-purple-50 transition-all">+ إضافة صورة للمعرض</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeModalTab === 'seasons' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-black text-lg text-indigo-600">إدارة المواسم</h3>
                                <button onClick={handleAddSeasonLocal} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-black shadow-lg shadow-indigo-500/20 transition-transform active:scale-95">+ إضافة موسم جديد</button>
                            </div>
                            <div className="space-y-6">
                                {(editingMovieData.seasons || []).map((season, sIdx) => (
                                    <div key={season.id} className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-[3rem] overflow-hidden shadow-sm">
                                        <div className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/5" onClick={() => setActiveSeasonId(activeSeasonId === season.id ? null : season.id)}>
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black">{season.season_number}</div>
                                                <div className="text-right">
                                                    <h4 className="font-black text-lg">{season.title}</h4>
                                                    <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">{season.episodes?.length || 0} Episodes</p>
                                                </div>
                                            </div>
                                            <ChevronDownIcon className={`w-6 h-6 transition-transform duration-300 ${activeSeasonId === season.id ? 'rotate-180' : ''}`} />
                                        </div>
                                        
                                        {activeSeasonId === season.id && (
                                            <div className="p-8 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]/50 space-y-8 animate-slide-up">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                                    <div className="space-y-3">
                                                        <label className="text-[11px] font-black uppercase text-indigo-600 mr-2">بوستر الموسم</label>
                                                        <ImageUpload 
                                                            label="" 
                                                            value={season.posterUrl || ''} 
                                                            onChange={(v) => {
                                                                const newSeasons = [...(editingMovieData.seasons || [])];
                                                                newSeasons[sIdx].posterUrl = v;
                                                                setEditingMovieData({...editingMovieData, seasons: newSeasons});
                                                            }} 
                                                        />
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-[11px] font-black uppercase text-indigo-600 mr-2">رابط إعلان الموسم</label>
                                                            <input type="text" value={season.adUrl || ''} onChange={(e) => {
                                                                const newSeasons = [...(editingMovieData.seasons || [])];
                                                                newSeasons[sIdx].adUrl = e.target.value;
                                                                setEditingMovieData({...editingMovieData, seasons: newSeasons});
                                                            }} className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-sm dir-ltr outline-none" dir="ltr" />
                                                        </div>
                                                        <button onClick={() => handleDeleteSeasonLocal(season.id)} className="w-full py-3 bg-red-500/10 text-red-500 rounded-xl text-sm font-black border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">حذف الموسم</button>
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <div className="flex justify-between items-center border-b border-[var(--border-primary)] pb-4">
                                                        <h5 className="font-black text-sm text-indigo-500 uppercase tracking-widest">قائمة الحلقات</h5>
                                                        <button onClick={() => handleAddEpisodeLocal(season.id)} className="bg-indigo-600/10 text-indigo-600 px-4 py-2 rounded-xl text-sm font-black">+ حلقة جديدة</button>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-4">
                                                        {(season.episodes || []).map((ep, epIdx) => (
                                                            <div key={ep.id} className="p-6 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-[2.5rem] animate-fade-in group relative">
                                                                <button onClick={() => handleDeleteEpisodeLocal(season.id, ep.id)} className="absolute top-4 left-4 p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-all z-10">
                                                                    <TrashIcon className="w-4 h-4"/>
                                                                </button>
                                                                
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                    <div className="md:col-span-1">
                                                                        <ImageUpload 
                                                                            label="صورة الحلقة" 
                                                                            value={ep.thumbnailUrl || ''} 
                                                                            onChange={(v) => {
                                                                                const newSeasons = [...(editingMovieData.seasons || [])];
                                                                                newSeasons[sIdx].episodes![epIdx].thumbnailUrl = v;
                                                                                setEditingMovieData({...editingMovieData, seasons: newSeasons});
                                                                            }} 
                                                                        />
                                                                    </div>
                                                                    <div className="md:col-span-2 space-y-3">
                                                                        <input value={ep.title} onChange={e => {
                                                                            const newSeasons = [...(editingMovieData.seasons || [])];
                                                                            newSeasons[sIdx].episodes![epIdx].title = e.target.value;
                                                                            setEditingMovieData({...editingMovieData, seasons: newSeasons});
                                                                        }} className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl border border-[var(--border-primary)] font-black text-sm outline-none" placeholder="عنوان الحلقة" />
                                                                        
                                                                        <input value={ep.videoUrl || ''} onChange={e => {
                                                                            const newSeasons = [...(editingMovieData.seasons || [])];
                                                                            newSeasons[sIdx].episodes![epIdx].videoUrl = e.target.value;
                                                                            setEditingMovieData({...editingMovieData, seasons: newSeasons});
                                                                        }} className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl border border-[var(--border-primary)] text-sm font-mono dir-ltr outline-none" dir="ltr" placeholder="رابط الفيديو (YouTube/MP4)" />
                                                                        
                                                                        <div className="space-y-2 mt-2">
                                                                            <p className="text-sm font-black uppercase text-indigo-500">روابط التحميل</p>
                                                                            {ep.downloadLinks?.map((link, linkIdx) => (
                                                                                <div key={linkIdx} className="flex gap-2">
                                                                                    <input 
                                                                                        value={link.quality} 
                                                                                        onChange={(e) => handleUpdateDownloadLink(sIdx, epIdx, linkIdx, 'quality', e.target.value)} 
                                                                                        placeholder="الدقة" 
                                                                                        className="w-1/3 p-2 bg-white dark:bg-slate-800 rounded-lg text-sm font-bold border border-[var(--border-primary)]"
                                                                                    />
                                                                                    <input 
                                                                                        value={link.url} 
                                                                                        onChange={(e) => handleUpdateDownloadLink(sIdx, epIdx, linkIdx, 'url', e.target.value)} 
                                                                                        placeholder="الرابط" 
                                                                                        className="flex-1 p-2 bg-white dark:bg-slate-800 rounded-lg text-sm dir-ltr border border-[var(--border-primary)]"
                                                                                        dir="ltr"
                                                                                    />
                                                                                    <button onClick={() => handleDeleteDownloadLink(sIdx, epIdx, linkIdx)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><TrashIcon className="w-4 h-4"/></button>
                                                                                </div>
                                                                            ))}
                                                                            <button onClick={() => handleAddDownloadLink(sIdx, epIdx)} className="text-sm text-indigo-500 font-bold hover:underline flex items-center gap-1">
                                                                                <PlusIcon className="w-3 h-3"/> إضافة رابط تحميل
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-6 border-t border-[var(--border-primary)] flex justify-between items-center mt-6">
                    <button onClick={() => onSave(editingMovieData)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-4 rounded-[2rem] font-black text-sm shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3 w-full">
                        <CheckCircleIcon className="w-6 h-6"/> حفظ العمل بالكامل
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default MovieEditorModal;
