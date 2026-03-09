
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getSurahList, getSurahText, getSurahAudioUrl, Surah, Ayah, RECITERS, RADIO_STATIONS, Reciter, RadioStation } from '../../services/quranService';
import { PlayIcon, PauseIcon, ArrowRightIcon, SearchIcon, BookOpenIcon, MegaphoneIcon, WaveIcon, ChevronRightIcon, CheckIcon, XIcon, ChevronLeftIcon, ArrowLeftIcon, PlaySolidIcon } from '../common/Icons';
import { useToast } from '../../useToast';
import { ToastType } from '../../types';
import Loader from '../common/Loader';

// --- Components ---

const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const CircularPlayer: React.FC<{ 
    isPlaying: boolean; 
    progress: number; 
    onToggle: () => void; 
    onNext: () => void; 
    onPrev: () => void;
    isBuffering: boolean;
    currentTime: number;
    duration: number;
    isLive: boolean;
}> = ({ isPlaying, progress, onToggle, onNext, onPrev, isBuffering, currentTime, duration, isLive }) => {
    const radius = 70; // Slightly smaller for better mobile fit
    const stroke = 6;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center py-6">
            <div className="relative flex items-center justify-center mb-4">
                {/* Outer Glow/Shadow Container */}
                <div className="relative z-10 w-40 h-40 rounded-full bg-[var(--bg-secondary)] shadow-[inset_5px_5px_10px_rgba(0,0,0,0.1),inset_-5px_-5px_10px_rgba(255,255,255,0.5)] dark:shadow-[inset_5px_5px_10px_rgba(0,0,0,0.3),inset_-5px_-5px_10px_rgba(255,255,255,0.05)] flex items-center justify-center border border-[var(--border-primary)]">
                    <svg height={radius * 2.3} width={radius * 2.3} className="transform -rotate-90 absolute">
                        {!isLive && (
                            <circle
                                stroke="var(--text-secondary)"
                                strokeOpacity="0.1"
                                strokeWidth={stroke}
                                fill="transparent"
                                r={normalizedRadius}
                                cx={radius * 1.15}
                                cy={radius * 1.15}
                            />
                        )}
                        {!isLive && (
                            <circle
                                stroke="var(--accent-primary)"
                                fill="transparent"
                                strokeWidth={stroke}
                                strokeDasharray={circumference + ' ' + circumference}
                                style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s linear' }}
                                strokeLinecap="round"
                                r={normalizedRadius}
                                cx={radius * 1.15}
                                cy={radius * 1.15}
                            />
                        )}
                    </svg>

                    {/* Controls Inside Circle */}
                    <div className="absolute inset-0 flex items-center justify-center gap-3 z-20">
                        {!isLive && (
                            <button onClick={onPrev} className="text-[var(--text-secondary)] hover:text-purple-600 transition-colors p-1 active:scale-95">
                                <ChevronRightIcon className="w-6 h-6" />
                            </button>
                        )}

                        <button 
                            onClick={onToggle}
                            disabled={isBuffering}
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 transform active:scale-95 transition-all"
                        >
                            {isBuffering ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : isPlaying ? (
                                <PauseIcon className="w-8 h-8" />
                            ) : (
                                <PlayIcon className="w-8 h-8 ml-1" />
                            )}
                        </button>

                        {!isLive && (
                            <button onClick={onNext} className="text-[var(--text-secondary)] hover:text-purple-600 transition-colors p-1 active:scale-95">
                                <ChevronLeftIcon className="w-6 h-6" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Time or Live Badge */}
            {isLive ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 rounded-full border border-red-500/20 animate-pulse">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-red-500 font-bold text-sm">بث مباشر (Live)</span>
                </div>
            ) : (
                <div className="flex items-center gap-2 text-md font-mono text-[var(--text-secondary)] font-bold bg-[var(--bg-tertiary)] px-4 py-1 rounded-full shadow-inner" dir="ltr">
                    <span>{formatTime(currentTime)}</span>
                    <span className="opacity-60">/</span>
                    <span>{formatTime(duration)}</span>
                </div>
            )}
        </div>
    );
};

const BottomSheet: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    title: string;
    children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="w-full max-w-lg bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] rounded-t-[2rem] shadow-2xl flex flex-col max-h-[70vh] animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center sticky top-0 bg-[var(--bg-secondary)] z-10 rounded-t-[2rem]">
                    <h3 className="font-bold text-lg text-[var(--text-primary)]">{title}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        <XIcon className="w-5 h-5"/>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
};

const ReciterItem: React.FC<{ reciter: Reciter; isSelected: boolean; onClick: () => void }> = ({ reciter, isSelected, onClick }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center justify-between p-3 mb-2 rounded-xl transition-all border ${isSelected ? 'bg-[var(--accent-primary)] text-white shadow-md border-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-transparent hover:bg-[var(--border-primary)]'}`}
    >
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${isSelected ? 'bg-white/20' : 'bg-[var(--bg-secondary)] text-[var(--accent-primary)]'}`}>
                <MegaphoneIcon className="w-5 h-5" />
            </div>
            <div className="text-right">
                <p className={`font-bold text-sm`}>{reciter.name}</p>
                {reciter.rewaya && <p className={`text-sm ${isSelected ? 'text-white/80' : 'text-[var(--text-secondary)]'}`}>{reciter.rewaya}</p>}
            </div>
        </div>
        {isSelected && <CheckIcon className="w-5 h-5"/>}
    </button>
);

const SurahListItem: React.FC<{ surah: Surah; onClick: () => void; isActive: boolean }> = ({ surah, onClick, isActive }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center justify-between p-3 mb-2 rounded-xl transition-all border ${isActive ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-md transform scale-[1.01]' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-primary)] hover:border-[var(--accent-primary)]'}`}
    >
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-inner ${isActive ? 'bg-white text-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>
                {surah.number}
            </div>
            <div className="text-right">
                <p className="font-bold text-md font-quran">{surah.name}</p>
                <p className={`text-sm ${isActive ? 'text-white/80' : 'text-[var(--text-secondary)]'}`}>{surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} • {surah.numberOfAyahs} آية</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
             <span className={`text-sm ${isActive ? 'text-white/90' : 'text-[var(--text-secondary)]'}`}>{isActive ? 'جاري التشغيل' : ''}</span>
             {isActive ? <WaveIcon className="w-4 h-4 text-white animate-pulse" /> : <PlaySolidIcon className="w-3 h-3 text-[var(--text-secondary)]" />}
        </div>
    </button>
);

// --- Text Reader Component ---
const TextReader: React.FC<{ surah: Surah; onBack: () => void }> = ({ surah, onBack }) => {
    const [ayahs, setAyahs] = useState<Ayah[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getSurahText(surah.number).then(data => {
            setAyahs(data);
            setLoading(false);
        });
    }, [surah]);

    const isTawbah = surah.number === 9;

    return (
        <div className="flex flex-col h-full bg-[var(--bg-primary)] animate-slide-in-right absolute inset-0 z-50">
            {/* Reader Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] sticky top-0 z-20 shadow-sm">
                <button onClick={onBack} className="p-2 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--border-primary)] transition-colors">
                    <ArrowRightIcon className="w-5 h-5" />
                </button>
                <div className="text-center">
                    <h2 className="text-xl font-bold font-quran text-[var(--text-primary)]">{surah.name}</h2>
                    <p className="text-sm text-[var(--text-secondary)]">{surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} • {surah.numberOfAyahs} آية</p>
                </div>
                <div className="w-9"></div> {/* Spacer */}
            </div>

            {/* Reader Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-[var(--bg-tertiary)]/30">
                {loading ? (
                    <div className="flex justify-center items-center h-64"><Loader /></div>
                ) : (
                    <div className="max-w-3xl mx-auto bg-[var(--bg-secondary)] p-6 md:p-10 rounded-[1.5rem] shadow-sm border border-[var(--border-primary)]">
                        {/* Basmalah */}
                        {!isTawbah && (
                            <div className="text-center mb-8 font-quran text-2xl md:text-3xl text-[var(--text-primary)] leading-loose opacity-80">
                                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                            </div>
                        )}
                        
                        <div className="font-quran text-2xl md:text-3xl leading-[2.2] text-justify text-[var(--text-primary)]" dir="rtl">
                            {ayahs.map((ayah) => (
                                <span key={ayah.number}>
                                    {ayah.text.replace('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', '').trim()} 
                                    <span className="inline-flex items-center justify-center w-8 h-8 mx-1 text-sm font-sans border border-[var(--accent-primary)]/50 rounded-full text-[var(--accent-primary)] align-middle bg-[var(--bg-tertiary)] shadow-sm">
                                        {ayah.numberInSurah}
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main View ---

const QuranView: React.FC = () => {
    // Data State
    const [surahs, setSurahs] = useState<Surah[]>([]);
    const [currentSurah, setCurrentSurah] = useState<Surah | null>(null);
    const [selectedReciter, setSelectedReciter] = useState<Reciter>(RECITERS[0]);
    const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
    
    // Playback State
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [playMode, setPlayMode] = useState<'surah' | 'radio'>('surah');

    // UI State
    const [appMode, setAppMode] = useState<'listen' | 'read'>('listen');
    const [activeView, setActiveView] = useState<'player' | 'list'>('list');
    const [isReciterSheetOpen, setIsReciterSheetOpen] = useState(false);
    const [isRadioSheetOpen, setIsRadioSheetOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [readingSurah, setReadingSurah] = useState<Surah | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { addToast } = useToast();

    // Load Data & Restore State on Mount
    useEffect(() => {
        const loadState = async () => {
            const list = await getSurahList();
            setSurahs(list);

            // Restore Last Played from LocalStorage
            try {
                const lastPlayed = localStorage.getItem('quran_last_played');
                if (lastPlayed) {
                    const parsed = JSON.parse(lastPlayed);
                    if (parsed.surahNumber) {
                        const surah = list.find(s => s.number === parsed.surahNumber);
                        if (surah) {
                            setCurrentSurah(surah);
                        }
                    }
                    if (parsed.reciterId) {
                        const reciter = RECITERS.find(r => r.id === parsed.reciterId);
                        if (reciter) setSelectedReciter(reciter);
                    }
                }
            } catch (e) {
                console.error("Failed to restore last played state", e);
            }
        };
        loadState();
    }, []);

    // Save State on Change
    useEffect(() => {
        if (currentSurah && selectedReciter && playMode === 'surah') {
            localStorage.setItem('quran_last_played', JSON.stringify({
                surahNumber: currentSurah.number,
                reciterId: selectedReciter.id
            }));
        }
    }, [currentSurah, selectedReciter, playMode]);

    // Audio Control
    const playAudio = useCallback((url: string) => {
        const audio = audioRef.current;
        if (!audio) return;
        
        setIsBuffering(true);
        setIsPlaying(false);
        
        // Proper way to reset and load a new source
        audio.pause();
        
        if (!url) {
            setIsBuffering(false);
            return;
        }

        audio.src = url;
        audio.load();
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                setIsPlaying(true);
            }).catch(error => {
                if (error.name !== 'AbortError') {
                    console.error("Playback failed:", error.message);
                }
            }).finally(() => {
                 setIsBuffering(false);
            });
        }
    }, []);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        
        // Ensure source is set if it was restored but not loaded
        const currentSrc = audio.src;
        const isSrcEmpty = !currentSrc || currentSrc === window.location.href;

        if (isSrcEmpty) {
            let url = '';
            if (playMode === 'surah' && currentSurah) {
                url = getSurahAudioUrl(currentSurah.number, selectedReciter.id);
            } else if (playMode === 'radio' && currentStation) {
                url = currentStation.url;
            }
            
            if (url) {
                audio.src = url;
                audio.load();
            } else {
                addToast("الرجاء اختيار سورة أو إذاعة أولاً", ToastType.INFO);
                return;
            }
        }

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
             const playPromise = audio.play();
             if (playPromise !== undefined) {
                 playPromise.then(() => setIsPlaying(true)).catch((e) => {
                     if (e.name !== 'AbortError') {
                         console.error("Play failed:", e.message);
                     }
                     setIsPlaying(false);
                 });
             }
        }
    };

    const handleSurahPlay = (surah: Surah) => {
        setPlayMode('surah');
        setCurrentSurah(surah);
        setActiveView('player');
        const url = getSurahAudioUrl(surah.number, selectedReciter.id);
        playAudio(url);
    };

    const handleSurahRead = (surah: Surah) => {
        setReadingSurah(surah);
    };

    const handleReciterSelect = (reciter: Reciter) => {
        setSelectedReciter(reciter);
        setIsReciterSheetOpen(false);
        if (playMode === 'surah' && currentSurah) {
            const url = getSurahAudioUrl(currentSurah.number, reciter.id);
            if (isPlaying) playAudio(url);
        }
    };

    const handleRadioSelect = (station: RadioStation) => {
        setPlayMode('radio');
        setCurrentStation(station);
        setIsRadioSheetOpen(false);
        setActiveView('player');
        playAudio(station.url);
    };

    const handleNext = () => {
        if (playMode === 'surah' && currentSurah) {
            const nextIndex = surahs.findIndex(s => s.number === currentSurah.number) + 1;
            if (nextIndex < surahs.length) handleSurahPlay(surahs[nextIndex]);
        }
    };

    const handlePrev = () => {
        if (playMode === 'surah' && currentSurah) {
            const prevIndex = surahs.findIndex(s => s.number === currentSurah.number) - 1;
            if (prevIndex >= 0) handleSurahPlay(surahs[prevIndex]);
        }
    };

    const filteredSurahs = surahs.filter(s => s.name.includes(searchQuery) || s.number.toString().includes(searchQuery));
    const filteredReciters = RECITERS.filter(r => r.name.includes(searchQuery));

    // Render Text Reader if reading
    if (appMode === 'read' && readingSurah) {
        return <TextReader surah={readingSurah} onBack={() => setReadingSurah(null)} />;
    }

    return (
        <div className="flex flex-col h-full bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans transition-colors duration-300 relative">
            {/* Audio Element */}
            <audio 
                ref={audioRef}
                preload="auto"
                autoPlay={false}
                onTimeUpdate={(e) => {
                    if (playMode === 'radio') return; // Don't track time for radio
                    setCurrentTime(e.currentTarget.currentTime);
                    setDuration(e.currentTarget.duration || 0);
                    setProgress((e.currentTarget.currentTime / (e.currentTarget.duration || 1)) * 100);
                }}
                onEnded={() => { setIsPlaying(false); if(playMode==='surah') handleNext(); }}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }}
                onPause={() => setIsPlaying(false)}
                onError={(e) => { 
                    const errorCode = (e.target as HTMLAudioElement).error?.code;
                    const errorMessage = (e.target as HTMLAudioElement).error?.message;
                    console.error(`Audio error code: ${errorCode}, message: ${errorMessage}`);
                    setIsPlaying(false); 
                    setIsBuffering(false); 
                }}
            />

            {/* Header with Tabs */}
            <div className="flex flex-col p-4 pb-0 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] shadow-sm z-20">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-2">
                        <BookOpenIcon className="w-6 h-6 text-[var(--accent-primary)]"/>
                        القرآن الكريم
                    </h1>
                    {activeView === 'player' && appMode === 'listen' && (
                        <button onClick={() => setActiveView('list')} className="p-2 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-primary)] transition-colors">
                            <ArrowLeftIcon className="w-5 h-5"/>
                        </button>
                    )}
                </div>

                {/* Tab Switcher */}
                <div className="flex p-1 bg-[var(--bg-tertiary)] rounded-xl mb-4">
                    <button 
                        onClick={() => { setAppMode('listen'); setActiveView('list'); }} 
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${appMode === 'listen' ? 'bg-[var(--bg-secondary)] text-[var(--accent-primary)] shadow-sm' : 'text-[var(--text-secondary)]'}`}
                    >
                        استماع
                    </button>
                    <button 
                        onClick={() => { setAppMode('read'); setReadingSurah(null); }} 
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${appMode === 'read' ? 'bg-[var(--bg-secondary)] text-[var(--accent-primary)] shadow-sm' : 'text-[var(--text-secondary)]'}`}
                    >
                        قراءة
                    </button>
                </div>

                {appMode === 'listen' && activeView === 'list' && (
                    <div className="relative mb-4">
                        <input 
                            type="text" 
                            placeholder="بحث عن سورة..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl py-3 px-4 pr-10 text-sm focus:ring-2 focus:ring-[var(--accent-primary)] transition-all outline-none text-[var(--text-primary)]"
                        />
                        <SearchIcon className="w-4 h-4 text-[var(--text-secondary)] absolute right-3 top-3.5 pointer-events-none" />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                
                {/* List View (Surahs) */}
                {(activeView === 'list' || appMode === 'read') && (
                    <div className="h-full overflow-y-auto custom-scrollbar p-4 animate-fade-in pb-24">
                        {appMode === 'listen' && (
                            <button 
                                onClick={() => setIsRadioSheetOpen(true)}
                                className="w-full p-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-between shadow-lg mb-6 hover:scale-[1.01] transition-transform text-white group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm"><WaveIcon className="w-5 h-5 text-white"/></div>
                                    <div className="text-right">
                                        <h3 className="font-bold text-md">الإذاعات المباشرة</h3>
                                        <p className="text-sm text-indigo-100 opacity-90">استمع للبث المباشر 24/7</p>
                                    </div>
                                </div>
                                <ChevronLeftIcon className="w-4 h-4 text-white/80 group-hover:-translate-x-1 transition-transform"/>
                            </button>
                        )}
                        
                        <div className="space-y-1">
                            {filteredSurahs.map(s => (
                                <SurahListItem 
                                    key={s.number} 
                                    surah={s} 
                                    onClick={() => appMode === 'listen' ? handleSurahPlay(s) : handleSurahRead(s)}
                                    isActive={appMode === 'listen' && playMode === 'surah' && currentSurah?.number === s.number && isPlaying}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Player View (Only for Listen Mode) */}
                {appMode === 'listen' && activeView === 'player' && (
                    <div className="h-full flex flex-col items-center justify-center p-6 animate-slide-up bg-[var(--bg-primary)]">
                        
                        {/* Info Section */}
                        <div className="text-center mb-2">
                            <h2 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] mb-1 tracking-tight font-quran">
                                {playMode === 'surah' ? (currentSurah?.name || 'اختر سورة') : currentStation?.name}
                            </h2>
                            <p className="text-[var(--accent-primary)] font-bold text-sm">
                                {playMode === 'surah' ? (currentSurah ? `الآية ${currentSurah.numberOfAyahs}` : '') : 'بث مباشر'}
                            </p>
                            {playMode === 'surah' && (
                                <p className="text-[var(--text-secondary)] text-sm mt-1">{selectedReciter.name}</p>
                            )}
                        </div>

                        {/* Circular Player */}
                        <CircularPlayer 
                            isPlaying={isPlaying}
                            isBuffering={isBuffering}
                            progress={playMode === 'radio' ? 100 : progress}
                            currentTime={currentTime}
                            duration={duration}
                            onToggle={togglePlay}
                            onNext={handleNext}
                            onPrev={handlePrev}
                            isLive={playMode === 'radio'}
                        />

                        {/* Action Buttons Row */}
                        <div className="flex gap-3 w-full max-w-sm mt-2">
                            <button 
                                onClick={() => { setSearchQuery(''); setIsRadioSheetOpen(true); }}
                                className="flex-1 py-3 rounded-2xl bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] border border-[var(--border-primary)] text-[var(--text-primary)] font-bold flex flex-col items-center gap-1 transition-all active:scale-95 shadow-sm"
                            >
                                <WaveIcon className="w-5 h-5 text-red-500" />
                                <span className="text-sm">بث مباشر</span>
                            </button>
                            
                            <button 
                                onClick={() => { setSearchQuery(''); setIsReciterSheetOpen(true); }}
                                className="flex-1 py-3 rounded-2xl bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] border border-[var(--border-primary)] text-[var(--text-primary)] font-bold flex flex-col items-center gap-1 transition-all active:scale-95 shadow-sm"
                            >
                                <MegaphoneIcon className="w-5 h-5 text-[var(--accent-primary)]" />
                                <span className="text-sm">تغيير القارئ</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Reciter Sheet */}
            <BottomSheet isOpen={isReciterSheetOpen} onClose={() => setIsReciterSheetOpen(false)} title="اختر القارئ">
                 <div className="mb-4 sticky top-0 bg-[var(--bg-secondary)] pt-2 pb-2 z-20">
                    <input 
                        type="text" 
                        placeholder="بحث عن قارئ..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full p-3 bg-[var(--bg-tertiary)] rounded-xl text-[var(--text-primary)] border-none focus:ring-2 focus:ring-[var(--accent-primary)] outline-none text-sm"
                    />
                </div>
                <div className="space-y-1">
                    {filteredReciters.map(r => (
                        <ReciterItem key={r.id} reciter={r} isSelected={selectedReciter.id === r.id} onClick={() => handleReciterSelect(r)} />
                    ))}
                </div>
            </BottomSheet>

            {/* Radio Sheet */}
            <BottomSheet isOpen={isRadioSheetOpen} onClose={() => setIsRadioSheetOpen(false)} title="إذاعات القرآن الكريم">
                <div className="space-y-2">
                    {RADIO_STATIONS.map(station => (
                        <button 
                            key={station.id}
                            onClick={() => handleRadioSelect(station)}
                            className={`w-full text-right p-4 rounded-xl border transition-all ${currentStation?.id === station.id ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)] border-transparent text-[var(--text-primary)] hover:bg-[var(--border-primary)]'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${currentStation?.id === station.id ? 'bg-white/20' : 'bg-[var(--bg-secondary)]'}`}><WaveIcon className="w-5 h-5"/></div>
                                <span className="font-bold text-sm">{station.name}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </BottomSheet>

        </div>
    );
};

export default QuranView;
