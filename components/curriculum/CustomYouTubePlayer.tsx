
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlayIcon, PauseIcon, ArrowsExpandIcon, CogIcon, ClockIcon } from '../common/Icons';
import { trackVideoProgress } from '../../services/storageService';
import { useSession } from '../../hooks/useSession';

declare global { interface Window { YT: any; onYouTubeIframeAPIReady?: () => void; onYouTubeIframeAPIReadyCallbacks?: (() => void)[]; } }

let youtubeApiPromise: Promise<void> | null = null;
const loadYouTubeApi = (): Promise<void> => {
    if (youtubeApiPromise) return youtubeApiPromise;
    youtubeApiPromise = new Promise((resolve) => {
        if (window.YT && window.YT.Player) { resolve(); return; }
        if (!window.onYouTubeIframeAPIReadyCallbacks) window.onYouTubeIframeAPIReadyCallbacks = [];
        window.onYouTubeIframeAPIReadyCallbacks.push(resolve);
        if (window.onYouTubeIframeAPIReady) return;
        window.onYouTubeIframeAPIReady = () => { window.onYouTubeIframeAPIReadyCallbacks?.forEach(cb => cb()); window.onYouTubeIframeAPIReadyCallbacks = []; };
        const tag = document.createElement('script'); tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    });
    return youtubeApiPromise;
};

const formatTime = (seconds: number): string => {
    const date = new Date(0); date.setSeconds(seconds || 0);
    const timeString = date.toISOString().substring(11, 19);
    return timeString.startsWith('00:0') ? timeString.substring(4) : timeString.startsWith('00:') ? timeString.substring(3) : timeString;
};

const qualityLabels: Record<string, string> = { 
    highres: '4K+',
    hd2160: '4K',
    hd1440: '2K',
    hd1080: '1080p', 
    hd720: '720p', 
    large: '480p', 
    medium: '360p', 
    small: '240p', 
    tiny: '144p',
    auto: 'تلقائي' 
};

const WatermarkOverlay: React.FC = () => {
    const { currentUser } = useSession();
    const [position, setPosition] = useState({ top: 20, left: 20 });
    
    useEffect(() => {
        const interval = setInterval(() => {
            setPosition({ 
                top: Math.random() * 80 + 10, 
                left: Math.random() * 70 + 15 
            });
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    if (!currentUser) return null;
    const watermarkText = `${currentUser.name} • ${currentUser.phone || 'Gstudent'}`;

    return (
        <div 
            className="absolute z-[25] pointer-events-none select-none transition-all duration-[3000ms] ease-in-out opacity-[0.12] dark:opacity-[0.18]"
            style={{ top: `${position.top}%`, left: `${position.left}%` }}
        >
            <div className="bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 shadow-2xl">
                <span className="text-white font-black text-sm md:text-sm whitespace-nowrap tracking-widest uppercase">{watermarkText}</span>
            </div>
        </div>
    );
};

const CustomYouTubePlayer: React.FC<{ videoId: string; onLessonComplete: (v: string) => void; isDataSaverEnabled: boolean; lessonId?: string; showWatermark?: boolean; }> = ({ videoId, onLessonComplete, isDataSaverEnabled, lessonId, showWatermark = true }) => {
    const { currentUser } = useSession();
    // Optimization: depend only on ID to prevent recreation on shallow profile updates
    const userId = currentUser?.id;
    
    const playerRef = useRef<any>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [currentQuality, setCurrentQuality] = useState('auto');
    const [showControls, setShowControls] = useState(true);
    const hideTimeout = useRef<number | null>(null);
    
    // Refs for safe access in closures (intervals/cleanup)
    const isPlayingRef = useRef(false);
    const currentTimeRef = useRef(0);
    const durationRef = useRef(0);
    const lastTrackTimeRef = useRef<number>(0);

    const resetHideTimeout = useCallback(() => {
        if (hideTimeout.current) clearTimeout(hideTimeout.current);
        setShowControls(true);
        if (isPlaying) {
            hideTimeout.current = window.setTimeout(() => setShowControls(false), 3000);
        }
    }, [isPlaying]);

    const saveProgress = useCallback(async (time: number, totalDur: number) => {
        if (lessonId && userId) {
            try {
                if (isNaN(time) || isNaN(totalDur) || totalDur === 0) return;
                
                const { error } = await trackVideoProgress(userId, lessonId, time, totalDur);
                if (error) {
                    console.error("Failed to save video progress:", error.message);
                } else {
                    // console.log("Progress saved:", time);
                }
            } catch (err) {
                console.error("Exception saving video progress:", err);
            }
        }
    }, [lessonId, userId]);

    useEffect(() => {
        let isMounted = true;
        let ticker: NodeJS.Timeout | null = null;

        lastTrackTimeRef.current = 0;
        setCurrentTime(0);
        currentTimeRef.current = 0;
        durationRef.current = 0;
        
        loadYouTubeApi().then(() => {
            if (!isMounted) return;
            if (!playerContainerRef.current) return;
            
            const playerDiv = document.createElement('div');
            playerContainerRef.current.innerHTML = '';
            playerContainerRef.current.appendChild(playerDiv);

            playerRef.current = new window.YT.Player(playerDiv, {
                videoId,
                height: '100%',
                width: '100%',
                playerVars: { 
                    playsinline: 1, 
                    controls: 0, 
                    modestbranding: 1, 
                    autoplay: 1, 
                    rel: 0, 
                    iv_load_policy: 3, 
                    fs: 0, 
                    disablekb: 1, 
                    hl: 'ar'
                },
                events: {
                    onReady: (e: any) => {
                        if (!isMounted) return;
                        const d = e.target.getDuration();
                        setDuration(d);
                        durationRef.current = d;
                        
                        if (isDataSaverEnabled) {
                            e.target.setPlaybackQuality('small');
                        }
                        const startQual = e.target.getPlaybackQuality();
                        if (startQual) setCurrentQuality(startQual);
                    },
                    onStateChange: (e: any) => {
                        if (!isMounted) return;
                        const playing = e.data === 1;
                        setIsPlaying(playing);
                        isPlayingRef.current = playing;
                        
                        // Save on Pause (2) or End (0)
                        if (e.data === 2 || e.data === 0) {
                             const time = e.target.getCurrentTime();
                             const totalDur = e.target.getDuration();
                             saveProgress(time, totalDur);
                        }

                        if (e.data === 0) {
                            onLessonComplete(videoId);
                            if (lessonId && userId) {
                                saveProgress(e.target.getDuration(), e.target.getDuration());
                            }
                        }
                    },
                    onPlaybackQualityChange: (e: any) => {
                        if (!isMounted) return;
                        setCurrentQuality(e.data);
                    }
                }
            });

            ticker = setInterval(() => {
                if (!isMounted) return;
                if (playerRef.current?.getCurrentTime) {
                    const time = playerRef.current.getCurrentTime();
                    const totalDur = playerRef.current.getDuration();
                    
                    const realQuality = playerRef.current.getPlaybackQuality();
                    if (realQuality && realQuality !== currentQuality) {
                         setCurrentQuality(realQuality);
                    }
                    
                    setCurrentTime(time);
                    currentTimeRef.current = time;
                    
                    if (totalDur > 0) {
                        setDuration(totalDur);
                        durationRef.current = totalDur;
                    }

                    const now = Date.now();
                    // Save every 10 seconds if playing
                    if (isPlayingRef.current && (now - lastTrackTimeRef.current > 10000)) {
                        saveProgress(time, totalDur);
                        lastTrackTimeRef.current = now;
                    }
                }
            }, 1000);
        });

        return () => { 
            isMounted = false;
            if (ticker) clearInterval(ticker);
            
            // CRITICAL: Use refs here because state might be stale in cleanup
            if (playerRef.current?.getCurrentTime && currentTimeRef.current > 0) {
                saveProgress(currentTimeRef.current, durationRef.current);
            }
            try {
                playerRef.current?.destroy();
            } catch (e) {
                // Ignore destroy errors
            }
        };
    }, [videoId, lessonId, userId, isDataSaverEnabled, onLessonComplete, saveProgress]);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        playerRef.current?.seekTo(time, true);
        setCurrentTime(time);
        currentTimeRef.current = time;
    };
    
    const handleQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newQuality = e.target.value;
        playerRef.current?.setPlaybackQuality(newQuality);
        setCurrentQuality(newQuality);
    };

    const progressPercent = duration ? (currentTime / duration) * 100 : 0;

    return (
        <div ref={containerRef} className="relative w-full h-full bg-black group" onMouseMove={resetHideTimeout} onClick={resetHideTimeout}>
            <div ref={playerContainerRef} className="w-full h-full pointer-events-none" />
            {showWatermark && <WatermarkOverlay />}
            
            <div 
                className="absolute inset-0 z-10" 
                onClick={() => isPlaying ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo()}
            ></div>

            <div 
                dir="ltr"
                className={`absolute inset-x-0 bottom-0 z-30 transition-all duration-500 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 md:p-6 ${showControls || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
            >
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                         <span className="text-sm font-black text-white/80 font-mono w-10 text-right">{formatTime(currentTime)}</span>
                         <input 
                            type="range" 
                            min="0" 
                            max={duration} 
                            step="0.1" 
                            value={currentTime} 
                            onChange={handleSeek} 
                            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer transition-all hover:h-2 focus:outline-none"
                            style={{
                                background: `linear-gradient(to right, #A78BFA 0%, #A78BFA ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%, rgba(255,255,255,0.2) 100%)`
                            }}
                         />
                         <span className="text-sm font-black text-white/80 font-mono w-10">{formatTime(duration)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <button onClick={() => isPlaying ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo()} className="text-white hover:text-indigo-400 transition-colors">
                                {isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8 ml-1" />}
                            </button>
                            <div className="flex items-center gap-3">
                                <ClockIcon className="w-4 h-4 text-white/70" />
                                <div className="flex gap-1.5">
                                    {[1, 1.25, 1.5, 2].map(r => (
                                        <button key={r} onClick={() => { playerRef.current?.setPlaybackRate(r); setPlaybackRate(r); }} className={`px-2 py-0.5 rounded-md text-sm font-black border transition-all ${playbackRate === r ? 'bg-white text-black border-white' : 'bg-transparent text-white/70 border-white/10 hover:border-white/30'}`}>
                                            {r}x
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <CogIcon className={`w-4 h-4 ${currentQuality === 'auto' ? 'text-green-400' : 'text-white/70'}`} />
                                <select 
                                    value={currentQuality} 
                                    onChange={handleQualityChange} 
                                    className="bg-transparent text-white/80 text-sm font-bold outline-none border-none cursor-pointer max-w-[80px]"
                                >
                                    {!qualityLabels[currentQuality] && <option value={currentQuality} className="bg-gray-900">{currentQuality}</option>}
                                    {Object.entries(qualityLabels).map(([val, label]) => (
                                        <option key={val} value={val} className="bg-gray-900">{label}</option>
                                    ))}
                                </select>
                            </div>
                            <button onClick={() => document.fullscreenElement ? document.exitFullscreen() : containerRef.current?.requestFullscreen()} className="text-white/60 hover:text-white transition-colors">
                                <ArrowsExpandIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>{`
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 14px;
                    width: 14px;
                    border-radius: 50%;
                    background: #A78BFA;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(167, 139, 250, 0.6);
                    margin-top: 0px; 
                    transition: transform 0.1s;
                }
                input[type=range]:active::-webkit-slider-thumb { transform: scale(1.3); }
                input[type=range]::-moz-range-thumb {
                    height: 14px; width: 14px; border: none; border-radius: 50%; background: #A78BFA; cursor: pointer;
                }
            `}</style>
        </div>
    );
};

export default CustomYouTubePlayer;
