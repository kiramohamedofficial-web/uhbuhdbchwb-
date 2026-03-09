
import React, { useState, useMemo } from 'react';
import { CartoonMovie, CartoonEpisode, DownloadLink } from '../../types';
import { useSwipeBack } from '../../hooks/useSwipeBack';
import { 
    ArrowRightIcon, 
    StarIcon, 
    XIcon, 
    VideoCameraIcon, 
    PlaySolidIcon,
    PhotoIcon,
    SparklesIcon,
    MegaphoneIcon,
    DownloadIcon,
    ServerIcon
} from '../common/Icons';
import CustomYouTubePlayer from '../curriculum/CustomYouTubePlayer';
import SeriesView from './SeriesView';

const parseId = (url: string | undefined) => {
    if (!url) return null;
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
};

const DownloadLinkCard: React.FC<{ link: DownloadLink; index: number }> = ({ link, index }) => (
    <a 
        href={link.url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="group flex items-center justify-between p-4 md:p-5 rounded-2xl md:rounded-3xl bg-[#111] hover:bg-red-600/10 border border-white/5 hover:border-red-600/30 transition-all duration-300 shadow-lg hover:-translate-y-1"
    >
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-red-600 group-hover:text-white transition-colors border border-white/10">
                <ServerIcon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="text-right">
                <span className="block font-black text-white text-sm">سيرفر تحميل #{index + 1}</span>
                <span className="text-sm text-gray-500 font-black uppercase tracking-widest group-hover:text-red-500 transition-colors">
                    {link.quality || 'Full HD'} • Link {index + 1}
                </span>
            </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-gray-500 group-hover:bg-red-600 group-hover:text-white transition-all shadow-xl">
            <DownloadIcon className="w-5 h-5" />
        </div>
    </a>
);

interface MovieDetailProps {
    movie: CartoonMovie;
    allMovies: CartoonMovie[];
    onBack: () => void;
    onSelectEpisode: (ep: CartoonEpisode) => void;
    onSelectMovie: (movie: CartoonMovie) => void;
}

const MovieDetail: React.FC<MovieDetailProps> = ({ movie, allMovies, onBack, onSelectEpisode, onSelectMovie }) => {
    const [activeTab, setActiveTab] = useState<'episodes' | 'details' | 'gallery' | 'downloads'>(movie.type === 'series' ? 'episodes' : 'details');
    const [playingTrailer, setPlayingTrailer] = useState(false);
    
    useSwipeBack(onBack);

    const isSeries = movie.type === 'series';
    const trailerId = parseId(movie.trailerUrl);
    const hasDownloadLinks = movie.downloadLinks && movie.downloadLinks.length > 0;

    const suggestions = useMemo(() => {
        return allMovies
            .filter(m => m.id !== movie.id && (m.category === movie.category || m.type === movie.type))
            .sort(() => 0.5 - Math.random())
            .slice(0, 6);
    }, [allMovies, movie]);

    return (
        <div className="min-h-screen bg-[#050505] text-white relative font-cairo overflow-x-hidden animate-fade-in text-right pb-20 md:pb-32">
            {playingTrailer && trailerId && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-fade-in">
                    <button onClick={() => setPlayingTrailer(false)} className="absolute top-6 right-6 md:top-8 md:right-8 z-[110] w-12 h-12 md:w-14 md:h-14 bg-white/10 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors border border-white/20 backdrop-blur-3xl shadow-2xl"><XIcon className="w-6 h-6 md:w-7 md:h-7" /></button>
                    <div className="w-full h-full">
                        <CustomYouTubePlayer videoId={trailerId} onLessonComplete={() => {}} isDataSaverEnabled={false} showWatermark={false} />
                    </div>
                </div>
            )}

            <div className="relative h-[70vh] md:h-[90vh] w-full">
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[60s] ease-linear scale-105" style={{ backgroundImage: `url(${movie.posterUrl})` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/40 to-transparent"></div>
                </div>
                
                <div className="absolute top-0 left-0 right-0 p-4 md:p-6 z-50 flex justify-between items-start">
                     <button onClick={onBack} className="p-3 md:p-4 bg-black/40 hover:bg-red-600/80 backdrop-blur-xl rounded-full border border-white/10 transition-all shadow-2xl group"><ArrowRightIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform rotate-180" /></button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 lg:p-20 z-20 flex flex-col justify-end h-full items-end">
                    <div className="max-w-4xl animate-fade-in-up w-full">
                        <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3 mb-4">
                            <span className="text-gray-300 text-sm md:text-sm font-black border-r-2 border-red-600 pr-3 md:pr-4 mr-2">{movie.category}</span>
                            <span className="text-amber-400 font-black text-sm flex items-center gap-1.5 drop-shadow-lg"><StarIcon className="w-3.5 h-3.5 fill-current"/> {movie.rating || '8.5'}</span>
                            {movie.releaseYear && <span className="bg-white/5 px-3 py-1 rounded-full text-sm font-black border border-white/10 backdrop-blur-xl shadow-inner">{movie.releaseYear}</span>}
                            {movie.duration && <span className="bg-white/5 px-3 py-1 rounded-full text-sm font-black border border-white/10 backdrop-blur-xl shadow-inner">{movie.duration}</span>}
                            <span className={`px-3 py-1 rounded-full text-sm font-black uppercase tracking-wider text-white shadow-2xl border border-white/10 ${isSeries ? 'bg-blue-600' : 'bg-red-600'}`}>
                                {isSeries ? 'مسلسل' : 'فيلم'}
                            </span>
                        </div>
                        
                        <h1 className="text-4xl sm:text-6xl md:text-8xl font-black mb-6 md:mb-8 leading-none drop-shadow-[0_15px_35px_rgba(0,0,0,0.8)] tracking-tighter">{movie.title}</h1>
                        
                        <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 justify-end">
                            {!isSeries && movie.videoUrl && (
                                <button onClick={() => onSelectEpisode({ id: 'movie-ep', videoUrl: movie.videoUrl!, title: movie.title, episodeNumber: 1, seasonNumber: 1, season_id: '1' })} className="px-8 py-4 bg-white text-black hover:bg-red-600 hover:text-white rounded-2xl font-black text-sm md:text-base flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all">
                                    <PlaySolidIcon className="w-5 h-5" /> شاهد الفيلم
                                </button>
                            )}

                            {trailerId && (
                                <button onClick={() => setPlayingTrailer(true)} className="px-8 py-4 bg-red-600/20 text-white hover:bg-red-600 rounded-2xl font-black text-sm md:text-base flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 border border-red-600/30 backdrop-blur-xl">
                                    <VideoCameraIcon className="w-5 h-5" /> التريلر
                                </button>
                            )}

                            {movie.adUrl && (
                                <a href={movie.adUrl} target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-black rounded-2xl font-black text-sm md:text-base transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95">
                                    <MegaphoneIcon className="w-5 h-5" /> الإعلان
                                </a>
                            )}

                            {isSeries && (
                                <button onClick={() => document.getElementById('content-area')?.scrollIntoView({ behavior: 'smooth' })} className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl rounded-2xl font-black text-sm md:text-base shadow-xl active:scale-95 transition-all border border-white/10">
                                    عرض الحلقات
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div id="content-area" className="container mx-auto px-4 sm:px-6 md:px-12 py-12 md:py-16 max-w-7xl">
                <div className="flex items-center justify-center gap-2 md:gap-4 mb-12 md:mb-16 border-b border-white/10 pb-4 scrollbar-hide overflow-x-auto">
                    {isSeries && (
                        <button onClick={() => setActiveTab('episodes')} className={`py-3 px-4 md:px-8 text-sm md:text-base font-black transition-all relative whitespace-nowrap rounded-full ${activeTab === 'episodes' ? 'text-white bg-red-600' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>الحلقات</button>
                    )}
                    <button onClick={() => setActiveTab('details')} className={`py-3 px-4 md:px-8 text-sm md:text-base font-black transition-all relative whitespace-nowrap rounded-full ${activeTab === 'details' ? 'text-white bg-red-600' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>القصة</button>
                    {hasDownloadLinks && !isSeries && (
                        <button onClick={() => setActiveTab('downloads')} className={`py-3 px-4 md:px-8 text-sm md:text-base font-black transition-all relative whitespace-nowrap rounded-full ${activeTab === 'downloads' ? 'text-white bg-red-600' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>التحميل</button>
                    )}
                    <button onClick={() => setActiveTab('gallery')} className={`py-3 px-4 md:px-8 text-sm md:text-base font-black transition-all relative whitespace-nowrap rounded-full ${activeTab === 'gallery' ? 'text-white bg-red-600' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>الصور</button>
                </div>

                <div className="min-h-[300px]">
                    {activeTab === 'episodes' && isSeries && (
                        <SeriesView movie={movie} onSelectEpisode={onSelectEpisode} />
                    )}
                    
                    {activeTab === 'details' && (
                        <div className="bg-[#0a0a0a] p-8 md:p-12 rounded-[2.5rem] border border-white/5 shadow-2xl animate-fade-in relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 blur-[100px] pointer-events-none group-hover:bg-red-600/10 transition-colors"></div>
                            <h3 className="text-2xl md:text-3xl font-black text-white mb-6 border-r-4 md:border-r-8 border-red-600 pr-4 md:pr-6 tracking-tighter">قصة العمل</h3>
                            <p className="text-gray-300 leading-loose text-base md:text-lg font-medium opacity-90">{movie.story || 'لا يتوفر وصف مفصل لهذا العمل الفني حالياً.'}</p>
                        </div>
                    )}

                    {activeTab === 'downloads' && hasDownloadLinks && (
                        <div className="bg-[#0a0a0a] p-8 md:p-12 rounded-[2.5rem] border border-white/5 shadow-2xl animate-fade-in">
                             <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 md:mb-10 border-b border-white/5 pb-6">
                                <div className="text-center sm:text-right">
                                    <h3 className="text-2xl md:text-3xl font-black text-white">مركز التحميل</h3>
                                    <p className="text-gray-500 font-bold mt-2 text-sm md:text-sm">اختر الجودة المناسبة لجهازك للتحميل المباشر.</p>
                                </div>
                                <div className="w-14 h-14 md:w-16 md:h-16 bg-red-600/10 rounded-2xl md:rounded-3xl flex items-center justify-center text-red-600 border border-red-600/20 shrink-0">
                                    <DownloadIcon className="w-7 h-7 md:w-8 md:h-8" />
                                </div>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {movie.downloadLinks?.map((link, idx) => (
                                    <DownloadLinkCard key={idx} link={link} index={idx} />
                                ))}
                             </div>
                        </div>
                    )}

                    {activeTab === 'gallery' && (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 animate-fade-in">
                            {movie.galleryImages?.map((url, i) => (
                                <div key={i} className="aspect-video rounded-2xl md:rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl group cursor-zoom-in">
                                    <img src={url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                </div>
                            ))}
                            {(!movie.galleryImages || movie.galleryImages.length === 0) && <div className="col-span-full py-32 md:py-40 text-center opacity-20"><PhotoIcon className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-6" /><p className="text-lg md:text-xl font-black">لا توجد صور إضافية متاحة.</p></div>}
                        </div>
                    )}
                </div>

                {suggestions.length > 0 && (
                    <div className="mt-24 md:mt-32 space-y-8 md:space-y-12">
                         <h2 className="text-2xl md:text-3xl font-black flex items-center gap-4 tracking-tighter"><SparklesIcon className="w-7 h-7 md:w-8 md:h-8 text-red-600" /> أعمال مشابهة</h2>
                         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
                            {suggestions.map(m => (
                                <div key={m.id} onClick={() => { onSelectMovie(m); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="group relative aspect-[2/3] rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer border border-white/10 hover:border-red-500/50 hover:-translate-y-2 transition-all duration-300 shadow-xl">
                                    <img src={m.posterUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt={m.title} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                                    <div className="absolute bottom-4 left-4 right-4 text-right"><p className="text-sm md:text-sm font-black text-white truncate drop-shadow-lg">{m.title}</p></div>
                                </div>
                            ))}
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MovieDetail;
