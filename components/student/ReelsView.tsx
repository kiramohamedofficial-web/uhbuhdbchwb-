
import React, { useState, useEffect, useRef } from 'react';
import { Reel } from '../../types';
import { getPublishedReels } from '../../services/storageService';
import Loader from '../common/Loader';
import { ReelsIcon, HeartIcon, ShareIcon, VolumeUpIcon, VolumeOffIcon, ArrowRightIcon } from '../common/Icons';

const parseYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

const ReelItem: React.FC<{ 
    reel: Reel; 
    isActive: boolean; 
    isMuted: boolean; 
    toggleMute: () => void; 
}> = ({ reel, isActive, isMuted, toggleMute }) => {
    const videoId = parseYouTubeVideoId(reel.youtubeUrl);
    const [isLiked, setIsLiked] = useState(false);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    if (!videoId) return null;

    return (
        <div className="relative w-full h-full snap-center flex items-center justify-center bg-black overflow-hidden group">
            <div className="relative w-full h-full md:w-[450px] md:aspect-[9/16] flex items-center justify-center bg-[#0a0a0a] shadow-[0_0_100px_rgba(0,0,0,0.8)]">
                {isActive && (
                    <div className="absolute inset-0 animate-fade-in z-0">
                        <iframe
                            className="w-full h-full object-cover"
                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&enablejsapi=1&origin=${origin}`}
                            title={reel.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ border: 'none' }}
                        ></iframe>
                    </div>
                )}
                
                {!isActive && (
                    <div className="w-full h-full relative">
                        <img 
                            src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} 
                            alt={reel.title}
                            className="w-full h-full object-cover opacity-70 blur-sm"
                        />
                    </div>
                )}

                <div className={`absolute inset-0 z-10 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] flex flex-col justify-between transition-all duration-700 pointer-events-none ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                    <div className="flex justify-end pt-[calc(1rem+env(safe-area-inset-top))] pointer-events-auto">
                        <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="p-3 bg-black/40 backdrop-blur-xl rounded-full text-white border border-white/10 active:scale-90 transition-all hover:bg-black/60 shadow-lg">
                            {isMuted ? <VolumeOffIcon className="w-6 h-6" /> : <VolumeUpIcon className="w-6 h-6" />}
                        </button>
                    </div>

                    <div className="flex items-end justify-between gap-4 pointer-events-auto">
                        <div className="flex-1 text-right">
                            <h3 className="text-white font-black text-2xl mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight line-clamp-2">{reel.title}</h3>
                            <div className="flex items-center gap-2 justify-end">
                                <span className="text-gray-300 text-sm font-bold tracking-widest uppercase opacity-70 drop-shadow-md">Gstudent Academy</span>
                                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-black text-white shadow-lg border border-white/20">GS</div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-5 items-center">
                            <button onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); }} className="flex flex-col items-center gap-1 group">
                                <div className={`p-4 rounded-full backdrop-blur-xl transition-all duration-300 ${isLiked ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] scale-110' : 'bg-black/40 text-white hover:bg-white/10'}`}>
                                    <HeartIcon className={`w-8 h-8 ${isLiked ? 'fill-current' : ''}`} />
                                </div>
                                <span className="text-sm font-black text-white uppercase drop-shadow-md">Like</span>
                            </button>
                            <button className="flex flex-col items-center gap-1 group">
                                <div className="p-4 rounded-full bg-black/40 backdrop-blur-xl text-white hover:bg-white/10 transition-all">
                                    <ShareIcon className="w-8 h-8" />
                                </div>
                                <span className="text-sm font-black text-white uppercase drop-shadow-md">Share</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                 <div 
                    className="absolute inset-0 z-0" 
                    onClick={toggleMute}
                ></div>
            </div>
        </div>
    );
};

interface ReelsViewProps {
    onBack: () => void;
}

const ReelsView: React.FC<ReelsViewProps> = ({ onBack }) => {
    const [reels, setReels] = useState<Reel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeReelIndex, setActiveReelIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        getPublishedReels().then(data => {
            setReels(data);
            setIsLoading(false);
        });
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || reels.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = Number(entry.target.getAttribute('data-index'));
                        if (!isNaN(index)) {
                            setActiveReelIndex(index);
                        }
                    }
                });
            },
            { 
                root: container, 
                threshold: 0.5 
            } 
        );

        const items = container.querySelectorAll('.reel-item');
        items.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [reels.length, isLoading]); 

    if (isLoading) return <div className="h-full flex items-center justify-center bg-black"><Loader /></div>;
    
    return (
        <div className="h-full overflow-hidden bg-black relative">
            {/* Floating Back Button - Positioned specifically to avoid device notches */}
            <div className="absolute top-[calc(1.5rem+env(safe-area-inset-top))] left-[calc(1.5rem+env(safe-area-inset-left))] z-[60] animate-fade-in">
                <button 
                    onClick={onBack}
                    className="p-4 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white shadow-2xl hover:bg-red-600 transition-all active:scale-90 group pointer-events-auto"
                    title="الخروج من الريلز"
                >
                    <ArrowRightIcon className="w-6 h-6 rotate-180" />
                </button>
            </div>

            {reels.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center p-8">
                    <ReelsIcon className="w-20 h-20 text-gray-800 mb-6" />
                    <h3 className="text-xl font-black text-gray-500">لا توجد ريلز حالياً</h3>
                </div>
            ) : (
                <div 
                    ref={containerRef}
                    className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide touch-pan-y custom-scrollbar"
                    style={{ scrollBehavior: 'smooth' }}
                >
                    {reels.map((reel, index) => (
                        <div key={reel.id} data-index={index} className="w-full h-full snap-center reel-item">
                            <ReelItem 
                                reel={reel} 
                                isActive={index === activeReelIndex} 
                                isMuted={isMuted} 
                                toggleMute={() => setIsMuted(!isMuted)} 
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReelsView;
