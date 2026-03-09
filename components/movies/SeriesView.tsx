
import React, { useState, useMemo } from 'react';
import { CartoonMovie, CartoonEpisode } from '../../types';
import { VideoCameraIcon, PlaySolidIcon, ChevronLeftIcon } from '../common/Icons';

interface SeriesViewProps {
    movie: CartoonMovie;
    onSelectEpisode: (ep: CartoonEpisode) => void;
}

const SeriesView: React.FC<SeriesViewProps> = ({ movie, onSelectEpisode }) => {
    const seasons = useMemo(() => (movie.seasons || []).map(s => s.season_number).sort((a, b) => a - b), [movie]);
    const [selectedSeason, setSelectedSeason] = useState<number>(seasons.length > 0 ? seasons[0] : 1);
    
    const episodesForSeason = useMemo(() => {
        const seasonData = movie.seasons?.find(s => s.season_number === selectedSeason);
        return seasonData?.episodes?.sort((a, b) => a.episodeNumber - b.episodeNumber) || [];
    }, [movie, selectedSeason]);

    return (
        <div className="animate-fade-in space-y-10">
            {/* Season Selector Chips */}
            {seasons.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-4 justify-end">
                    {seasons.map(s => (
                        <button 
                            key={s} 
                            onClick={() => setSelectedSeason(s)} 
                            className={`px-8 py-3 rounded-2xl font-black text-sm whitespace-nowrap transition-all duration-300 border-2 ${selectedSeason === s ? 'bg-red-600 text-white border-red-600 shadow-2xl shadow-red-900/40 transform scale-105' : 'bg-[#0f0f0f] text-gray-500 border-white/5 hover:border-white/20 hover:text-white'}`}
                        >
                            الموسم {s}
                        </button>
                    ))}
                </div>
            )}

            {/* Episode Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {episodesForSeason.map(ep => (
                    <button 
                        key={ep.id} 
                        onClick={() => onSelectEpisode(ep)} 
                        className="group bg-[#0a0a0a] rounded-[2rem] overflow-hidden border border-white/5 text-right flex flex-col hover:border-red-600/40 hover:shadow-[0_20px_50px_rgba(220,38,38,0.15)] transition-all duration-500 hover:-translate-y-2"
                    >
                        <div className="aspect-video relative overflow-hidden bg-black/40">
                            {ep.thumbnailUrl ? (
                                <img src={ep.thumbnailUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000" alt={ep.title} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-10">
                                    <VideoCameraIcon className="w-12 h-12"/>
                                </div>
                            )}
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-red-600/10 backdrop-blur-[2px]">
                                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-2xl transform scale-50 group-hover:scale-100 transition-all duration-300 border-4 border-white/20">
                                    <PlaySolidIcon className="w-5 h-5 text-white ml-0.5"/>
                                </div>
                            </div>
                            {/* Duration Badge */}
                            <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-xl px-3 py-1 rounded-full text-sm font-black text-white border border-white/10 uppercase tracking-widest shadow-xl">
                                {ep.duration || `EP ${ep.episodeNumber}`}
                            </div>
                        </div>
                        <div className="p-6 text-right">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-black text-white text-sm md:text-base truncate group-hover:text-red-500 transition-colors">الحلقة {ep.episodeNumber}: {ep.title}</h4>
                            </div>
                            <p className="text-[11px] text-gray-500 font-bold line-clamp-2 leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity">
                                {ep.description || 'شاهد هذه الحلقة المميزة الآن بدقة عالية وحصرياً على منصتنا التعليمية والترفيهية.'}
                            </p>
                            <div className="mt-5 flex items-center justify-end gap-2 text-sm font-black text-red-600 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                <span>شاهد الآن</span>
                                <ChevronLeftIcon className="w-3 h-3" />
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Empty State */}
            {episodesForSeason.length === 0 && (
                <div className="py-32 text-center opacity-20 bg-[#111] rounded-[3rem] border border-dashed border-white/10">
                    <VideoCameraIcon className="w-20 h-20 mx-auto mb-6 text-gray-400" />
                    <p className="text-xl font-black tracking-tighter uppercase">No Episodes Available Yet</p>
                </div>
            )}
        </div>
    );
};

export default SeriesView;
