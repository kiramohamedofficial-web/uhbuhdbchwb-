
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Story } from '../../types';
import { XIcon, FilmIcon, PlaySolidIcon, ChevronLeftIcon } from './Icons';

interface StoryViewerProps {
    stories: Story[];
    initialIndex: number;
    onClose: () => void;
    onViewMovie?: (movieId: string) => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ stories, initialIndex, onClose, onViewMovie }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [progress, setProgress] = useState(0);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    
    const STORY_DURATION = 5000;
    const startTimeRef = useRef<number>(0);
    const isPausedRef = useRef(false);
    const animationFrameRef = useRef<number>(0);

    const currentStory = stories[currentIndex];

    const getTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diff < 60) return 'الآن';
        if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
        if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
        return `منذ ${Math.floor(diff / 86400)} ي`;
    };

    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setProgress(0);
            setIsImageLoaded(false);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setProgress(0);
            setIsImageLoaded(false);
        }
    };

    useEffect(() => {
        setProgress(0);
        isPausedRef.current = false;
        
        if (currentStory.type !== 'text' && !isImageLoaded) return;

        startTimeRef.current = Date.now();
        const animate = () => {
            if (isPausedRef.current) {
                startTimeRef.current = Date.now() - (progress / 100) * STORY_DURATION;
                animationFrameRef.current = requestAnimationFrame(animate);
                return;
            }

            const elapsed = Date.now() - startTimeRef.current;
            const newProgress = (elapsed / STORY_DURATION) * 100;

            if (newProgress >= 100) {
                handleNext();
            } else {
                setProgress(newProgress);
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameRef.current);
    }, [currentIndex, isImageLoaded]);

    const handlePause = () => { isPausedRef.current = true; };
    const handleResume = () => { isPausedRef.current = false; };

    const renderContent = () => {
        if (currentStory.type === 'text') {
            return (
                <div className="w-full h-full flex items-center justify-center p-10 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-center">
                    <p className="text-3xl md:text-5xl font-black text-white leading-tight drop-shadow-2xl animate-fade-in">
                        {currentStory.content}
                    </p>
                </div>
            );
        }

        const imgSrc = currentStory.type === 'movie' ? currentStory.movie_data?.posterUrl : currentStory.content;

        return (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
                {/* Blurred Background */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <img src={imgSrc} className="w-full h-full object-cover blur-3xl opacity-70 scale-110" alt="bg" />
                    <div className="absolute inset-0 bg-black/30" />
                </div>
                
                {/* Main Content */}
                <img 
                    src={imgSrc} 
                    alt="Story" 
                    className={`relative z-10 max-h-full max-w-full object-contain transition-opacity duration-500 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setIsImageLoaded(true)}
                />
                
                {!isImageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                    </div>
                )}
            </div>
        );
    };

    const StoryUI = (
        <div className="fixed inset-0 z-[100000] bg-black h-[100dvh] w-screen overflow-hidden flex flex-col touch-none select-none font-tajawal">
            
            {/* Top Bar with Progress */}
            <div className="absolute top-0 left-0 right-0 z-50 p-3 pt-[max(12px,env(safe-area-inset-top))] bg-gradient-to-b from-black/80 via-black/40 to-transparent">
                <div className="flex gap-1.5 h-1 mb-4">
                    {stories.map((s, idx) => (
                        <div key={s.id} className="flex-1 bg-white/20 rounded-full overflow-hidden h-full">
                            <div 
                                className="h-full bg-white transition-all duration-100 ease-linear"
                                style={{ width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' }}
                            />
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border-2 border-white/30 p-0.5 shadow-lg overflow-hidden">
                            <div className="w-full h-full rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-sm">GS</div>
                        </div>
                        <div className="flex flex-col text-right">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-white drop-shadow-md">Gstudent</span>
                                {currentStory.category === 'movies' && (
                                    <span className="bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded font-black flex items-center gap-1">
                                        <FilmIcon className="w-2.5 h-2.5"/> سينما
                                    </span>
                                )}
                            </div>
                            <span className="text-sm text-white/70 font-bold">{getTimeAgo(currentStory.created_at)}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-white/10 backdrop-blur-xl rounded-full text-white/80 hover:bg-red-600 hover:text-white transition-all active:scale-90">
                        <XIcon className="w-6 h-6"/>
                    </button>
                </div>
            </div>

            {/* Main Interactive Content */}
            <div className="flex-1 relative flex items-center justify-center">
                {renderContent()}

                {/* Left/Right Tap Zones */}
                <div className="absolute inset-0 z-40 flex">
                    <div className="w-1/3 h-full" onClick={handlePrev} onMouseDown={handlePause} onMouseUp={handleResume} onTouchStart={handlePause} onTouchEnd={handleResume}></div>
                    <div className="w-1/3 h-full" onMouseDown={handlePause} onMouseUp={handleResume} onTouchStart={handlePause} onTouchEnd={handleResume}></div>
                    <div className="w-1/3 h-full" onClick={handleNext} onMouseDown={handlePause} onMouseUp={handleResume} onTouchStart={handlePause} onTouchEnd={handleResume}></div>
                </div>

                {/* Movie CTA Button */}
                {currentStory.type === 'movie' && (
                    <div className="absolute bottom-[max(80px,env(safe-area-inset-bottom)+40px)] left-0 right-0 z-[60] px-10 animate-slide-up">
                         <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (currentStory.content && onViewMovie) onViewMovie(currentStory.content);
                            }}
                            className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:scale-105 active:scale-95 transition-all"
                         >
                             <PlaySolidIcon className="w-5 h-5" /> 
                             مشاهدة الفيلم الآن
                             <ChevronLeftIcon className="w-4 h-4 mr-2" />
                         </button>
                    </div>
                )}
            </div>
            
            {/* Bottom Gradient Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10"></div>
        </div>
    );

    return createPortal(StoryUI, document.body);
};

export default StoryViewer;
