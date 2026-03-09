import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { CartoonMovie, CartoonEpisode, ToastType, DownloadLink, CartoonSeason } from '../../types';
import {
    getAllCartoonMovies,
    addCartoonMovie,
    updateCartoonMovie,
    deleteCartoonMovie,
    addSeason,
    updateSeason,
    deleteSeason,
    addEpisode,
    updateEpisode,
    deleteEpisode,
    cleanExpiredMovieRequests,
    replyToMovieRequest
} from '../../services/movieService';
import { supabase } from '../../services/storageService';
import Modal from '../common/Modal';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    SearchIcon,
    VideoCameraIcon,
    PhotoIcon,
    StarIcon,
    SparklesIcon,
    ChevronDownIcon,
    TicketIcon,
    CheckCircleIcon,
    XIcon,
    InformationCircleIcon,
    LinkIcon,
    PlayIcon,
    ListIcon,
    MegaphoneIcon,
    PaperAirplaneIcon,
    CollectionIcon,
    ServerIcon,
    DownloadIcon,
    FilmIcon,
    ChatBubbleOvalLeftEllipsisIcon,
    ClockIcon,
    ArrowRightIcon,
    CheckIcon
} from '../common/Icons';
import { useToast } from '../../useToast';
import Loader from '../common/Loader';
import ImageUpload from '../common/ImageUpload';
import { AppLifecycleContext } from '../../AppContext';
import CustomYouTubePlayer from '../curriculum/CustomYouTubePlayer';

interface MovieRequest {
    id: string;
    user_id: string;
    student_name: string;
    movie_name: string;
    notes?: string;
    admin_reply?: string;
    status: 'pending' | 'done';
    created_at: string;
    updated_at: string;
}

const CMSCard: React.FC<{ movie: CartoonMovie; onEdit: () => void; onDelete: () => void; }> = ({ movie, onEdit, onDelete }) => (
    <div className="group relative bg-[var(--bg-secondary)] rounded-[2.5rem] overflow-hidden border border-[var(--border-primary)] shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
            <span className={`px-4 py-1.5 rounded-full text-sm font-black text-white shadow-xl backdrop-blur-md uppercase tracking-widest ${movie.type === 'movie' ? 'bg-red-600' : 'bg-blue-600'}`}>
                {movie.type === 'movie' ? 'Film' : 'Series'}
            </span>
        </div>
        <div className="relative aspect-[2/3] overflow-hidden">
            <img src={movie.posterUrl || 'https://via.placeholder.com/600x900'} alt={movie.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-80 group-hover:opacity-100" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80"></div>
            <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
                <button onClick={onEdit} className="w-12 h-12 rounded-2xl bg-white text-gray-900 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"><PencilIcon className="w-6 h-6" /></button>
                <button onClick={onDelete} className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"><TrashIcon className="w-6 h-6" /></button>
            </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 text-right">
            <div className="flex items-center justify-end gap-2 text-sm text-[#f5c518] font-black mb-1">
                <StarIcon className="w-3.5 h-3.5 fill-current" />
                {movie.rating} / 10
            </div>
            <h3 className="text-white font-black text-lg line-clamp-1 drop-shadow-xl">{movie.title}</h3>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">{movie.releaseYear} • {movie.category}</p>
        </div>
    </div>
);

const CartoonMoviesManagementView: React.FC = () => {
    const { addToast } = useToast();
    const { setRefreshPaused } = useContext(AppLifecycleContext);
    const [movies, setMovies] = useState<CartoonMovie[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'content' | 'requests'>('content');
    const [filter, setFilter] = useState<'all' | 'movie' | 'series'>('all');

    // Modal State
    const [modalState, setModalState] = useState<{ isOpen: boolean; movie: CartoonMovie | null }>({ isOpen: false, movie: null });
    const [editingMovieData, setEditingMovieData] = useState<Partial<CartoonMovie>>({});
    const [activeModalTab, setActiveModalTab] = useState<'basic' | 'media' | 'seasons'>('basic');
    const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);

    // Requests State
    const [requests, setRequests] = useState<MovieRequest[]>([]);
    const [replyingRequest, setReplyingRequest] = useState<MovieRequest | null>(null);
    const [adminReply, setAdminReply] = useState('');

    const fetchMovies = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getAllCartoonMovies();
            setMovies(data);
        } catch (error) {
            addToast("فشل تحميل الأفلام", ToastType.ERROR);
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    const fetchRequests = useCallback(async () => {
        setIsLoading(true);
        try {
            await cleanExpiredMovieRequests();
            const { data, error } = await supabase
                .from('movie_requests')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setRequests(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const channel = supabase
            .channel('admin-movie-requests-monitor')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'movie_requests' }, (payload) => {
                addToast(`🚨 طلب ميديا جديد من: ${payload.new.student_name}`, ToastType.INFO);
                fetchRequests();
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'movie_requests' }, () => fetchRequests())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchRequests, addToast]);

    useEffect(() => {
        if (activeTab === 'content') fetchMovies();
        else fetchRequests();
    }, [activeTab, fetchMovies, fetchRequests]);

    const filteredMovies = useMemo(() => {
        return movies.filter(m => {
            const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = filter === 'all' || m.type === filter;
            return matchesSearch && matchesFilter;
        });
    }, [movies, searchQuery, filter]);

    const openEditModal = (movie: CartoonMovie | null) => {
        setRefreshPaused(true);
        const initialData: Partial<CartoonMovie> = movie ? { ...movie } : {
            isPublished: true, type: 'movie', rating: 8, category: 'أنيميشن',
            downloadLinks: [], seasons: [], galleryImages: [],
            releaseYear: new Date().getFullYear().toString()
        };
        setEditingMovieData(initialData);
        setActiveModalTab('basic');
        setModalState({ isOpen: true, movie });
    };

    const handleCloseModal = () => {
        setRefreshPaused(false);
        setModalState({ isOpen: false, movie: null });
        fetchMovies();
    };

    const handleSaveMovie = async () => {
        try {
            const data = editingMovieData;
            let movieId = modalState.movie?.id;

            if (movieId) {
                await updateCartoonMovie(movieId, data);
            } else {
                const created = await addCartoonMovie(data as any);
                movieId = created.id;
            }

            if (movieId && data.type === 'series' && data.seasons) {
                for (const season of data.seasons) {
                    let seasonId = season.id;
                    const isNewSeason = season.id.startsWith('new-');

                    if (isNewSeason) {
                        const newS = await addSeason({ ...season, series_id: movieId });
                        seasonId = newS.id;
                    } else {
                        await updateSeason(seasonId, season);
                    }

                    if (season.episodes) {
                        for (const ep of season.episodes) {
                            const isNewEp = ep.id.startsWith('new-');
                            if (isNewEp) {
                                await addEpisode({ ...ep, season_id: seasonId, movie_id: movieId, seasonNumber: season.season_number });
                            } else {
                                await updateEpisode(ep.id, ep);
                            }
                        }
                    }
                }
            }

            addToast("تم الحفظ بنجاح", ToastType.SUCCESS);
            handleCloseModal();
        } catch (e: any) {
            addToast(`خطأ: ${e.message}`, ToastType.ERROR);
        }
    };

    const handleDeleteMovie = async (id: string, title: string) => {
        if (!confirm(`حذف "${title}" نهائياً؟`)) return;
        try {
            await deleteCartoonMovie(id);
            addToast("تم الحذف بنجاح", ToastType.SUCCESS);
            fetchMovies();
        } catch (e) {
            addToast("فشل الحذف", ToastType.ERROR);
        }
    };

    const handleSaveReply = async () => {
        if (!replyingRequest || !adminReply.trim()) return;
        try {
            const { error } = await replyToMovieRequest(replyingRequest.id, adminReply);
            if (error) throw error;
            addToast("تم إرسال الرد بنجاح.", ToastType.SUCCESS);
            setReplyingRequest(null);
            setAdminReply('');
            fetchRequests();
        } catch (e: any) {
            addToast(`فشل الرد: ${e.message}`, ToastType.ERROR);
        }
    };

    const handleDeleteRequest = async (id: string) => {
        if (!confirm('حذف هذا الطلب؟')) return;
        const { error } = await supabase.from('movie_requests').delete().eq('id', id);
        if (error) addToast('فشل الحذف', ToastType.ERROR);
        else {
            addToast('تم حذف الطلب', ToastType.SUCCESS);
            setRequests(prev => prev.filter(r => r.id !== id));
        }
    };

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
            if (!confirm("حذف الموسم نهائياً؟")) return;
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
            if (!confirm("حذف الحلقة نهائياً؟")) return;
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

    const handleAddMovieDownloadLink = () => {
        setEditingMovieData(prev => ({
            ...prev,
            downloadLinks: [...(prev.downloadLinks || []), { quality: '', url: '' }]
        }));
    };

    const handleUpdateMovieDownloadLink = (index: number, field: 'quality' | 'url', value: string) => {
        setEditingMovieData(prev => {
            const links = [...(prev.downloadLinks || [])];
            links[index] = { ...links[index], [field]: value };
            return { ...prev, downloadLinks: links };
        });
    };

    const handleDeleteMovieDownloadLink = (index: number) => {
        setEditingMovieData(prev => ({
            ...prev,
            downloadLinks: prev.downloadLinks?.filter((_, i) => i !== index)
        }));
    };

    const pendingCount = useMemo(() => requests.filter(r => r.status === 'pending').length, [requests]);

    return (
        <div className="fade-in space-y-8 pb-24 max-w-7xl mx-auto px-2">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#0F172A] p-8 rounded-[3rem] text-white relative overflow-hidden border border-white/5 shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none"></div>
                <div className="relative z-10">
                    <h1 className="text-4xl font-black tracking-tighter">إدارة MovieZone</h1>
                    <p className="text-indigo-200/60 font-bold mt-1">تنسيق المكتبة والرد على الطلبات.</p>
                </div>
                <div className="relative z-10 flex gap-3">
                    <button onClick={() => openEditModal(null)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-transform flex items-center gap-2">
                        <PlusIcon className="w-5 h-5" /> عمل جديد
                    </button>
                </div>
            </div>

            <div className="flex bg-[var(--bg-tertiary)] p-1.5 rounded-2xl border border-[var(--border-primary)] w-fit mb-6">
                <button
                    onClick={() => setActiveTab('content')}
                    className={`px-10 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'content' ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)]'}`}
                >
                    المكتبة
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-10 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 relative ${activeTab === 'requests' ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)]'}`}
                >
                    <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4" />
                    <span>طلبات الميديا</span>
                    {pendingCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-sm font-black text-white border-2 border-[var(--bg-primary)]">{pendingCount}</span>}
                </button>
            </div>

            {activeTab === 'content' && (
                <>
                    <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
                        <div className="relative group flex-1 w-full">
                            <input type="text" placeholder="ابحث..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[2rem] py-5 pr-14 pl-6 font-bold text-md focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" />
                            <SearchIcon className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-[var(--text-secondary)] opacity-70 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-2xl border border-[var(--border-primary)]">
                            {(['all', 'movie', 'series'] as const).map(f => (
                                <button key={f} onClick={() => setFilter(f)} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${filter === f ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>
                                    {{ all: 'الكل', movie: 'أفلام', series: 'مسلسلات' }[f]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {isLoading ? <div className="flex justify-center py-40"><Loader /></div> : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 md:gap-8">
                            {filteredMovies.map(movie => <CMSCard key={movie.id} movie={movie} onEdit={() => openEditModal(movie)} onDelete={() => handleDeleteMovie(movie.id, movie.title)} />)}
                        </div>
                    )}
                </>
            )}

            {activeTab === 'requests' && (
                <div className="animate-fade-in space-y-6">
                    {isLoading ? <div className="flex justify-center py-40"><Loader /></div> : requests.length === 0 ? (
                        <div className="text-center py-32 bg-[var(--bg-secondary)] rounded-[2.5rem] border-2 border-dashed border-[var(--border-primary)] opacity-60">
                            <ChatBubbleOvalLeftEllipsisIcon className="w-20 h-20 mx-auto text-[var(--text-secondary)] opacity-20 mb-6" />
                            <p className="font-black text-lg">لا توجد طلبات جديدة</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {requests.map(req => (
                                <div key={req.id} className={`p-6 rounded-3xl border transition-all ${req.status === 'done' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[var(--bg-secondary)] border-l-4 border-l-indigo-600 border-y-[var(--border-primary)] border-r-[var(--border-primary)] shadow-lg'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-black text-lg text-[var(--text-primary)]">{req.movie_name}</h4>
                                            <p className="text-sm text-[var(--text-secondary)] font-bold">الطالب: {req.student_name}</p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-lg text-sm font-black uppercase ${req.status === 'done' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white animate-pulse'}`}>
                                            {req.status === 'done' ? 'تم الرد' : 'بانتظار الرد'}
                                        </div>
                                    </div>
                                    {req.notes && (
                                        <div className="p-3 bg-[var(--bg-tertiary)] rounded-xl text-sm text-[var(--text-secondary)] mb-4 italic leading-relaxed border border-[var(--border-primary)]">
                                            "{req.notes}"
                                        </div>
                                    )}
                                    {req.admin_reply && (
                                        <div className="p-3 bg-indigo-500/10 rounded-xl text-sm text-indigo-600 mb-4 font-bold border border-indigo-500/20 relative">
                                            <div className="absolute -top-2 right-4 bg-indigo-600 text-white px-2 py-0.5 rounded text-[8px] font-black">تم الرد</div>
                                            {req.admin_reply}
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center pt-4 border-t border-[var(--border-primary)]/50">
                                        <span className="text-sm text-[var(--text-secondary)] opacity-60 flex items-center gap-1 font-mono"><ClockIcon className="w-3 h-3" /> {new Date(req.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                        <div className="flex gap-2">
                                            {req.status === 'pending' && (
                                                <button onClick={() => { setReplyingRequest(req); setAdminReply(''); }} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-all shadow-md active:scale-95">رد الآن</button>
                                            )}
                                            <button onClick={() => handleDeleteRequest(req.id)} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-500/10"><TrashIcon className="w-4.5 h-4.5" /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <Modal isOpen={modalState.isOpen} onClose={handleCloseModal} title={modalState.movie ? `تعديل العمل` : 'إضافة عمل جديد'} maxWidth="max-w-6xl">
                <div className="flex flex-col h-[80vh]">
                    <div className="flex p-1.5 bg-[var(--bg-tertiary)] rounded-2xl mb-6 border border-[var(--border-primary)] w-fit mx-auto sm:mx-0">
                        <button onClick={() => setActiveModalTab('basic')} className={`px-8 py-2.5 rounded-xl text-sm sm:text-sm font-black transition-all flex items-center gap-2 ${activeModalTab === 'basic' ? 'bg-indigo-600 text-white shadow-sm' : 'text-[var(--text-secondary)]'}`}>
                            <InformationCircleIcon className="w-4 h-4" /> البيانات العامة
                        </button>
                        <button onClick={() => setActiveModalTab('media')} className={`px-8 py-2.5 rounded-xl text-sm sm:text-sm font-black transition-all flex items-center gap-2 ${activeModalTab === 'media' ? 'bg-indigo-600 text-white shadow-sm' : 'text-[var(--text-secondary)]'}`}>
                            <LinkIcon className="w-4 h-4" /> الوسائط والمعرض
                        </button>
                        {editingMovieData.type === 'series' && (
                            <button onClick={() => setActiveModalTab('seasons')} className={`px-8 py-2.5 rounded-xl text-sm sm:text-sm font-black transition-all flex items-center gap-2 ${activeModalTab === 'seasons' ? 'bg-indigo-600 text-white shadow-sm' : 'text-[var(--text-secondary)]'}`}>
                                <ListIcon className="w-4 h-4" /> المواسم والحلقات
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 -mr-3">
                        {activeModalTab === 'basic' && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
                                <div className="lg:col-span-4 space-y-6">
                                    <div className="p-4 bg-[var(--bg-tertiary)] rounded-3xl border border-[var(--border-primary)] text-center shadow-inner">
                                        <label className="text-sm font-black uppercase tracking-widest text-[var(--text-secondary)] block mb-4">البوستر الرئيسي</label>
                                        <div className="aspect-[2/3] w-32 mx-auto rounded-2xl overflow-hidden bg-black/10 mb-4 border-2 border-dashed border-[var(--border-primary)] relative shadow-inner">
                                            {editingMovieData.posterUrl ? <img src={editingMovieData.posterUrl} className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center opacity-20"><PhotoIcon className="w-8 h-8" /></div>}
                                        </div>
                                        <ImageUpload label="" value={editingMovieData.posterUrl || ''} onChange={v => setEditingMovieData({ ...editingMovieData, posterUrl: v })} />
                                    </div>
                                    <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-2xl border border-[var(--border-primary)]">
                                        {['movie', 'series'].map(t => (
                                            <button key={t} onClick={() => setEditingMovieData({ ...editingMovieData, type: t as any })} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${editingMovieData.type === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-[var(--text-secondary)]'}`}>
                                                {t === 'movie' ? 'فيلم' : 'مسلسل'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="lg:col-span-8 space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 mr-2">العنوان</label>
                                            <input type="text" value={editingMovieData.title || ''} onChange={e => setEditingMovieData({ ...editingMovieData, title: e.target.value })} className="w-full px-5 py-3.5 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-2xl font-bold text-[var(--text-primary)] outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 mr-2">التصنيف</label>
                                            <input type="text" value={editingMovieData.category || ''} onChange={e => setEditingMovieData({ ...editingMovieData, category: e.target.value })} className="w-full px-5 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-2xl font-bold text-sm outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 mr-2">التقييم</label>
                                            <input type="number" step="0.1" value={editingMovieData.rating || 0} onChange={e => setEditingMovieData({ ...editingMovieData, rating: parseFloat(e.target.value) })} className="w-full px-5 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-2xl font-bold text-sm outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 mr-2">القصة</label>
                                        <textarea value={editingMovieData.story || ''} onChange={e => setEditingMovieData({ ...editingMovieData, story: e.target.value })} className="w-full px-5 py-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-2xl font-bold text-sm outline-none resize-none" rows={4}></textarea>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeModalTab === 'media' && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="bg-indigo-600/5 border border-indigo-600/10 p-6 rounded-[2.5rem] space-y-6">
                                    <h3 className="font-black text-sm text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                        <VideoCameraIcon className="w-5 h-5" /> روابط المشاهدة
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mr-2">رابط الفيلم (YouTube/Direct)</label>
                                            <input type="text" value={editingMovieData.videoUrl || ''} onChange={e => setEditingMovieData({ ...editingMovieData, videoUrl: e.target.value })} className="w-full px-5 py-3.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl font-bold text-sm outline-none dir-ltr" dir="ltr" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mr-2">رابط التريلر (Trailer)</label>
                                            <input type="text" value={editingMovieData.trailerUrl || ''} onChange={e => setEditingMovieData({ ...editingMovieData, trailerUrl: e.target.value })} className="w-full px-5 py-3.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl font-bold text-sm outline-none dir-ltr" dir="ltr" />
                                        </div>
                                        <div className="sm:col-span-2 space-y-2">
                                            <label className="block text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mr-2">رابط الإعلان (Ads Link)</label>
                                            <div className="relative">
                                                <input type="text" value={editingMovieData.adUrl || ''} onChange={e => setEditingMovieData({ ...editingMovieData, adUrl: e.target.value })} className="w-full px-5 py-3.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl font-bold text-sm outline-none dir-ltr" dir="ltr" placeholder="رابط الإعلان الخارجي..." />
                                                <MegaphoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60 text-amber-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-emerald-600/5 border border-emerald-600/10 p-6 rounded-[2.5rem] space-y-6">
                                    <h3 className="font-black text-sm text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                        <DownloadIcon className="w-5 h-5" /> روابط التحميل (Download Links)
                                    </h3>
                                    <div className="space-y-3">
                                        {(editingMovieData.downloadLinks || []).map((link, idx) => (
                                            <div key={idx} className="flex gap-4 items-center animate-fade-in">
                                                <input
                                                    value={link.quality}
                                                    onChange={(e) => handleUpdateMovieDownloadLink(idx, 'quality', e.target.value)}
                                                    placeholder="الدقة (e.g. 1080p)"
                                                    className="w-1/4 px-5 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl font-bold text-sm outline-none"
                                                />
                                                <input
                                                    value={link.url}
                                                    onChange={(e) => handleUpdateMovieDownloadLink(idx, 'url', e.target.value)}
                                                    placeholder="رابط التحميل"
                                                    className="flex-1 px-5 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl font-bold text-sm outline-none dir-ltr"
                                                    dir="ltr"
                                                />
                                                <button onClick={() => handleDeleteMovieDownloadLink(idx)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                        <button onClick={handleAddMovieDownloadLink} className="w-full py-4 border-2 border-dashed border-emerald-300 text-emerald-600 rounded-[2rem] font-black text-sm hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 active:scale-95">
                                            <PlusIcon className="w-4 h-4" /> إضافة رابط تحميل جديد
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-purple-600/5 border border-purple-600/10 p-6 rounded-[2.5rem] space-y-6">
                                    <h3 className="font-black text-sm text-purple-600 uppercase tracking-widest flex items-center gap-2">
                                        <CollectionIcon className="w-5 h-5" /> معرض الصور الإضافية (Gallery)
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {(editingMovieData.galleryImages || []).map((img, idx) => (
                                            <div key={idx} className="flex gap-4 items-center bg-white/5 p-4 rounded-3xl border border-white/5">
                                                <div className="flex-1">
                                                    <ImageUpload label={`صورة المعرض ${idx + 1}`} value={img} onChange={(v) => {
                                                        const newGallery = [...(editingMovieData.galleryImages || [])];
                                                        newGallery[idx] = v;
                                                        setEditingMovieData({ ...editingMovieData, galleryImages: newGallery });
                                                    }} />
                                                </div>
                                                <button onClick={() => {
                                                    const newGallery = editingMovieData.galleryImages?.filter((_, i) => i !== idx);
                                                    setEditingMovieData({ ...editingMovieData, galleryImages: newGallery });
                                                }} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><TrashIcon className="w-5 h-5" /></button>
                                            </div>
                                        ))}
                                        <button onClick={() => setEditingMovieData(prev => ({ ...prev, galleryImages: [...(prev.galleryImages || []), ''] }))} className="w-full py-6 border-2 border-dashed border-purple-300 text-purple-500 rounded-[2rem] font-black text-sm hover:bg-purple-50 transition-all">+ إضافة صورة للمعرض</button>
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
                                                                    setEditingMovieData({ ...editingMovieData, seasons: newSeasons });
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div>
                                                                <label className="text-[11px] font-black uppercase text-indigo-600 mr-2">رابط إعلان الموسم</label>
                                                                <input type="text" value={season.adUrl || ''} onChange={(e) => {
                                                                    const newSeasons = [...(editingMovieData.seasons || [])];
                                                                    newSeasons[sIdx].adUrl = e.target.value;
                                                                    setEditingMovieData({ ...editingMovieData, seasons: newSeasons });
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
                                                                        <TrashIcon className="w-4 h-4" />
                                                                    </button>

                                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                        <div className="md:col-span-1">
                                                                            <ImageUpload
                                                                                label="صورة الحلقة"
                                                                                value={ep.thumbnailUrl || ''}
                                                                                onChange={(v) => {
                                                                                    const newSeasons = [...(editingMovieData.seasons || [])];
                                                                                    newSeasons[sIdx].episodes![epIdx].thumbnailUrl = v;
                                                                                    setEditingMovieData({ ...editingMovieData, seasons: newSeasons });
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <div className="md:col-span-2 space-y-3">
                                                                            <input value={ep.title} onChange={e => {
                                                                                const newSeasons = [...(editingMovieData.seasons || [])];
                                                                                newSeasons[sIdx].episodes![epIdx].title = e.target.value;
                                                                                setEditingMovieData({ ...editingMovieData, seasons: newSeasons });
                                                                            }} className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl border border-[var(--border-primary)] font-black text-sm outline-none" placeholder="عنوان الحلقة" />

                                                                            <input value={ep.videoUrl || ''} onChange={e => {
                                                                                const newSeasons = [...(editingMovieData.seasons || [])];
                                                                                newSeasons[sIdx].episodes![epIdx].videoUrl = e.target.value;
                                                                                setEditingMovieData({ ...editingMovieData, seasons: newSeasons });
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
                                                                                        <button onClick={() => handleDeleteDownloadLink(sIdx, epIdx, linkIdx)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><TrashIcon className="w-4 h-4" /></button>
                                                                                    </div>
                                                                                ))}
                                                                                <button onClick={() => handleAddDownloadLink(sIdx, epIdx)} className="text-sm text-indigo-500 font-bold hover:underline flex items-center gap-1">
                                                                                    <PlusIcon className="w-3 h-3" /> إضافة رابط تحميل
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
                        <button onClick={handleSaveMovie} className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-4 rounded-[2rem] font-black text-sm shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3 w-full">
                            <CheckCircleIcon className="w-6 h-6" /> حفظ العمل بالكامل
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Request Reply Modal */}
            <Modal isOpen={!!replyingRequest} onClose={() => setReplyingRequest(null)} title="الرد على طلب الميديا">
                <div className="space-y-6 p-1">
                    <div className="bg-[var(--bg-tertiary)] p-4 rounded-2xl border border-[var(--border-primary)]">
                        <p className="text-sm font-black text-indigo-600 uppercase mb-1">الطلب:</p>
                        <p className="text-sm font-black text-[var(--text-primary)] mb-1">🎬 {replyingRequest?.movie_name}</p>
                        <p className="text-sm text-[var(--text-secondary)] font-bold italic">"{replyingRequest?.notes || 'بدون ملاحظات'}"</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-black uppercase tracking-widest text-[var(--text-secondary)] mr-2">الرد للطالب</label>
                        <textarea
                            value={adminReply}
                            onChange={e => setAdminReply(e.target.value)}
                            placeholder="تم توفير العمل في القسم المخصص..."
                            className="w-full p-5 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-[1.5rem] font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-inner"
                            rows={5}
                        />
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setReplyingRequest(null)} className="flex-1 py-4 rounded-2xl bg-[var(--bg-tertiary)] font-black text-sm transition-all hover:bg-[var(--border-primary)]">إلغاء</button>
                        <button
                            onClick={handleSaveReply}
                            disabled={!adminReply.trim()}
                            className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <PaperAirplaneIcon className="w-5 h-5" />
                            إرسال الرد
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CartoonMoviesManagementView;
