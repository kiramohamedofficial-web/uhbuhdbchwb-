
import React, { useState } from 'react';
import { CartoonEpisode, DownloadLink } from '../../types';
import { useSwipeBack } from '../../hooks/useSwipeBack';
import { 
    ArrowRightIcon, 
    XIcon, 
    PlaySolidIcon,
    MegaphoneIcon,
    ServerIcon,
    DownloadIcon,
    VideoCameraIcon,
    InformationCircleIcon
} from '../common/Icons';
import CustomYouTubePlayer from '../curriculum/CustomYouTubePlayer';

const parseId = (url: string | undefined) => {
    if (!url) return null;
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
};

const parseDailymotionId = (url: string | undefined) => {
    if (!url) return null;
    const match = url.match(/(?:dailymotion\.com\/video\/|dai\.ly\/)([a-z0-9]+)/i);
    return match ? match[1] : null;
};

const getMegaEmbedUrl = (url: any): string | null => {
    if (typeof url !== 'string' || !url) return null;
    const regex = /mega\.nz\/(file|embed)\/([a-zA-Z0-9]+)#([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    if (match) {
        return `https://mega.nz/embed/${match[2]}#${match[3]}`;
    }
    return null;
};

const DownloadCard: React.FC<{ link: DownloadLink; index: number }> = ({ link, index }) => (
    <a 
        href={link.url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="group flex items-center justify-between p-5 rounded-3xl bg-[#111] hover:bg-red-600/10 border border-white/5 hover:border-red-600/30 transition-all duration-300 shadow-xl hover:-translate-y-1"
    >
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-red-600 group-hover:text-white transition-colors border border-white/10">
                <ServerIcon className="w-6 h-6" />
            </div>
            <div className="text-right">
                <span className="block font-black text-white text-sm">رابط التحميل #{index + 1}</span>
                <span className="text-sm text-gray-500 font-black uppercase tracking-widest group-hover:text-red-500 transition-colors">
                    {link.quality || 'FULL HD'} • SERVER {index + 1}
                </span>
            </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-gray-500 group-hover:bg-red-600 group-hover:text-white transition-all shadow-2xl">
            <DownloadIcon className="w-5 h-5" />
        </div>
    </a>
);

interface MoviePlayerProps {
    episode: CartoonEpisode;
    movieTitle: string;
    onBack: () => void;
}

const MoviePlayer: React.FC<MoviePlayerProps> = ({ episode, movieTitle, onBack }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const videoId = parseId(episode.videoUrl);
    const dailymotionId = parseDailymotionId(episode.videoUrl);
    const megaUrl = getMegaEmbedUrl(episode.videoUrl);
    const hasWatchLink = !!episode.videoUrl;

    // Enable swipe-to-back
    useSwipeBack(onBack);

    return (
        <div className="min-h-screen bg-[#050505] text-white relative font-cairo overflow-x-hidden animate-fade-in text-right pb-32">
            <div className="relative h-[50vh] md:h-[65vh] w-full bg-[#0a0a0a] group">
                {isPlaying && hasWatchLink ? (
                    <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col justify-center items-center">
                        <button onClick={() => setIsPlaying(false)} className="absolute top-8 right-8 z-[110] w-14 h-14 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-all border border-white/10 backdrop-blur-xl shadow-2xl active:scale-90"><XIcon className="w-7 h-7" /></button>
                        <div className="w-full h-full relative">
                            {videoId ? (
                                <CustomYouTubePlayer 
                                    videoId={videoId} 
                                    onLessonComplete={() => {}} 
                                    isDataSaverEnabled={false} 
                                    showWatermark={false} 
                                />
                            ) : dailymotionId ? (
                                <>
                                    <iframe 
                                        src={`https://www.dailymotion.com/embed/video/${dailymotionId}?autoplay=1&queue-enable=false&sharing-enable=false&ui-logo=false&ui-start-screen-info=false`}
                                        className="w-full h-full border-0" 
                                        allowFullScreen 
                                        allow="autoplay; encrypted-media"
                                        sandbox="allow-scripts allow-same-origin allow-presentation"
                                        title="Dailymotion Player"
                                    ></iframe>
                                    <div className="absolute top-0 left-0 right-0 h-24 z-20 bg-transparent"></div>
                                </>
                            ) : megaUrl ? (
                                <iframe 
                                    src={megaUrl} 
                                    className="w-full h-full border-0" 
                                    allowFullScreen 
                                    allow="autoplay; encrypted-media"
                                ></iframe>
                            ) : (
                                <iframe src={episode.videoUrl} className="w-full h-full border-0" allowFullScreen allow="autoplay; encrypted-media"></iframe>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50 blur-lg scale-110" style={{ backgroundImage: `url(${episode.thumbnailUrl || ''})` }}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent"></div>
                        <div className="absolute top-0 left-0 right-0 p-6 md:p-8 z-50 flex justify-between items-start">
                             <button onClick={onBack} className="flex items-center gap-3 px-6 py-3 bg-black/40 hover:bg-red-600/80 backdrop-blur-xl rounded-full border border-white/10 transition-all text-sm font-black group shadow-2xl"><ArrowRightIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform rotate-180" /><span>عودة للتفاصيل</span></button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-20 z-20 flex flex-col justify-end h-full pointer-events-none items-end">
                            <div className="max-w-4xl pointer-events-auto w-full">
                                <h4 className="text-red-500 font-black text-sm md:text-sm mb-3 uppercase tracking-[0.3em] flex items-center gap-4 justify-end">{movieTitle}<span className="w-12 h-1 bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]"></span></h4>
                                <h1 className="text-3xl md:text-7xl font-black mb-8 leading-tight drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] tracking-tighter">{episode.title || `الحلقة ${episode.episodeNumber}`}</h1>
                                
                                <div className="flex flex-wrap items-center justify-end gap-3 mb-10 text-sm font-black">
                                    <span className="bg-red-600 px-5 py-2 rounded-full text-white shadow-2xl border border-white/10">الموسم {episode.seasonNumber}</span>
                                    <span className="bg-white/5 px-5 py-2 rounded-full border border-white/10 backdrop-blur-2xl shadow-inner uppercase tracking-widest">Episode {episode.episodeNumber}</span>
                                </div>
                                
                                <div className="flex flex-wrap gap-4 justify-end">
                                    {hasWatchLink && (
                                        <button onClick={() => setIsPlaying(true)} className="px-12 py-5 bg-white text-black hover:bg-red-600 hover:text-white rounded-2xl font-black text-base flex items-center gap-3 transition-all active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.1)]">
                                            <PlaySolidIcon className="w-6 h-6" /> شاهد الآن
                                        </button>
                                    )}
                                    {episode.adUrl && (
                                        <a href={episode.adUrl} target="_blank" rel="noopener noreferrer" className="px-10 py-5 bg-amber-500 hover:bg-amber-600 text-black rounded-2xl font-black text-base transition-all flex items-center gap-3 shadow-2xl active:scale-95">
                                            <MegaphoneIcon className="w-6 h-6" /> الإعلان
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
            
            <div className="container mx-auto px-6 md:px-12 py-16 max-w-5xl">
                <div className="bg-[#0c0c0c] p-10 md:p-14 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 blur-[120px] pointer-events-none transition-colors group-hover:bg-red-600/10"></div>
                    
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 border-b border-white/5 pb-8 relative z-10">
                         <div className="text-center md:text-right">
                            <h3 className="text-3xl font-black text-white tracking-tighter">روابط التحميل المباشرة</h3>
                            <p className="text-gray-500 font-bold mt-2 text-sm">اختر الجودة والسيرفر المناسب لبدء التحميل فوراً.</p>
                         </div>
                         <div className="w-16 h-16 bg-red-600/10 rounded-3xl flex items-center justify-center text-red-600 border border-red-600/20 shadow-inner">
                            <DownloadIcon className="w-8 h-8" />
                         </div>
                    </div>

                    {episode.downloadLinks && episode.downloadLinks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                            {episode.downloadLinks.map((link, idx) => (
                                <DownloadCard key={idx} link={link} index={idx} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01] relative z-10">
                            <ServerIcon className="w-16 h-16 mx-auto mb-6 text-gray-800" />
                            <p className="text-gray-500 font-black text-sm italic tracking-widest uppercase">لا تتوفر روابط تحميل مباشرة حالياً</p>
                        </div>
                    )}

                    <div className="mt-12 p-6 bg-red-600/5 border border-red-600/10 rounded-3xl flex items-start gap-4 relative z-10">
                        <InformationCircleIcon className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                        <p className="text-sm font-bold text-gray-400 leading-relaxed">
                            نصيحة: للتحميل بأعلى سرعة، يرجى استخدام برنامج **Internet Download Manager** أو متصفح **UC Browser**، وتأكد من اختيار السيرفر الأقرب لمنطقتك.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MoviePlayer;
