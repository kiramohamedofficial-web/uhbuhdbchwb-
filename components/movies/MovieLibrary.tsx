
import React, { memo } from 'react';
import { CartoonMovie } from '../../types';
import { StarIcon, SearchIcon, PlaySolidIcon, FilmIcon, ChevronLeftIcon } from '../common/Icons';

const MovieCard = memo(({ movie, onClick, index }: { movie: CartoonMovie; onClick: () => void; index: number }) => (
    <div 
        onClick={onClick}
        className="group relative w-full aspect-[2/3] rounded-3xl md:rounded-[2rem] overflow-hidden cursor-pointer bg-[#111] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_-15px_rgba(220,38,38,0.4)] border border-white/10 hover:border-red-500/50"
        style={{ animationDelay: `${(index % 12) * 50}ms` }}
    >
        <img 
            src={movie.posterUrl} 
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            alt={movie.title} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
        
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
             <span className={`text-sm font-black px-3 py-1 rounded-full text-white shadow-xl backdrop-blur-md border border-white/10 ${movie.type === 'movie' ? 'bg-red-600/80' : 'bg-blue-600/80'}`}>
                {movie.type === 'movie' ? 'فيلم' : 'مسلسل'}
            </span>
             {movie.rating > 0 && (
                <span className="text-sm font-black px-3 py-1 rounded-full bg-amber-400/90 text-black shadow-xl flex items-center gap-1 backdrop-blur-md border border-white/10">
                    <StarIcon className="w-3 h-3 fill-black"/> {movie.rating}
                </span>
            )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100">
            <div className="w-16 h-16 rounded-full bg-red-600/90 backdrop-blur-xl flex items-center justify-center text-white shadow-2xl border-2 border-white/30">
                <PlaySolidIcon className="w-7 h-7 ml-1" />
            </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 text-right">
            <h3 className="text-white font-black text-base md:text-lg line-clamp-1 mb-1 drop-shadow-xl">{movie.title}</h3>
            <div className="flex items-center justify-end gap-2 text-sm text-gray-400 font-bold uppercase tracking-wider">
                <span className="truncate max-w-[90px]">{movie.category}</span>
                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                <span>{movie.releaseYear || 'N/A'}</span>
            </div>
        </div>
    </div>
));

const FeaturedHero = memo(({ movie, onPlay }: { movie: CartoonMovie; onPlay: () => void }) => (
    <div className="relative w-full h-[70vh] md:h-[85vh] rounded-b-[3rem] md:rounded-b-[4rem] overflow-hidden group cursor-pointer border-b border-white/10 -mt-8 mb-12 md:mb-20" onClick={onPlay}>
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-linear group-hover:scale-105" style={{ backgroundImage: `url(${movie.posterUrl})` }}>
             <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/50 to-transparent"></div>
             <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-transparent"></div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 lg:p-20 flex flex-col items-end text-right z-10">
             <div className="flex items-center gap-3 mb-4 md:mb-6 animate-fade-in">
                 <span className="px-4 py-1.5 bg-red-600 text-white text-sm font-black uppercase rounded-full tracking-[0.2em] shadow-2xl shadow-red-900/40 border border-red-500/50">حصرياً</span>
                 <span className="px-4 py-1.5 bg-black/40 backdrop-blur-xl border border-white/10 text-white text-sm font-black uppercase rounded-full flex items-center gap-2 shadow-2xl"><StarIcon className="w-4 h-4 text-amber-400 fill-current" /> {movie.rating}</span>
             </div>
             <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-white leading-tight mb-4 md:mb-6 drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] animate-slide-up" style={{ animationDelay: '100ms' }}>{movie.title}</h1>
             <p className="text-gray-300 text-sm md:text-base font-bold line-clamp-2 md:line-clamp-3 mb-8 md:mb-10 leading-relaxed max-w-2xl drop-shadow-2xl animate-slide-up ml-auto opacity-90" style={{ animationDelay: '200ms' }}>{movie.story}</p>
             <button className="group px-8 md:px-12 py-4 md:py-5 bg-white text-black rounded-full font-black text-sm md:text-base flex items-center gap-3 hover:bg-red-600 hover:text-white transition-all duration-300 shadow-[0_10px_40px_rgba(255,255,255,0.2)] hover:shadow-[0_10px_40px_rgba(220,38,38,0.4)] active:scale-95 animate-slide-up" style={{ animationDelay: '300ms' }}>
                <PlaySolidIcon className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:scale-110" /> 
                <span>شاهد الآن</span>
             </button>
        </div>
    </div>
));

interface MovieLibraryProps {
    movies: CartoonMovie[];
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    filter: 'all' | 'movie' | 'series';
    setFilter: (f: 'all' | 'movie' | 'series') => void;
    onSelectMovie: (movie: CartoonMovie) => void;
    featuredMovie: CartoonMovie | null;
}

const MovieLibrary: React.FC<MovieLibraryProps> = ({ 
    movies, searchQuery, setSearchQuery, filter, setFilter, onSelectMovie, featuredMovie 
}) => {
    return (
        <div className="container mx-auto px-4 md:px-8 py-8">
            {featuredMovie && !searchQuery && filter === 'all' && (
                <FeaturedHero movie={featuredMovie} onPlay={() => onSelectMovie(featuredMovie)} />
            )}

            <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-10 md:mb-16 items-center sticky top-14 z-30 p-4 bg-[#1a1a1a]/80 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl">
                 <div className="relative flex-1 w-full group">
                    <input 
                        type="text" 
                        placeholder="ابحث عن فيلم أو مسلسل..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#222] border-2 border-transparent focus:border-red-500 rounded-full py-4 pr-14 pl-6 text-white placeholder-gray-500 outline-none transition-all shadow-inner text-base"
                    />
                    <SearchIcon className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500 group-focus-within:text-red-500 transition-colors" />
                </div>
                
                <div className="flex bg-[#222] p-1.5 rounded-full border border-white/10 shadow-inner w-full md:w-auto">
                    {(['all', 'movie', 'series'] as const).map((f) => (
                        <button 
                            key={f} 
                            onClick={() => setFilter(f)} 
                            className={`flex-1 md:flex-none px-6 sm:px-10 py-3 rounded-full text-sm sm:text-sm font-black transition-all duration-300 ${filter === f ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'text-gray-400 hover:text-white'}`}
                        >
                            {{all: 'الكل', movie: 'أفلام', series: 'مسلسلات'}[f]}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-8">
                {movies.map((movie, idx) => (
                    <MovieCard key={movie.id} movie={movie} onClick={() => onSelectMovie(movie)} index={idx} />
                ))}
            </div>

            {movies.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 md:py-48 opacity-70 text-center">
                    <FilmIcon className="w-24 h-24 md:w-32 md:h-32 mb-8 text-gray-600" />
                    <h3 className="text-xl md:text-2xl font-black text-white">لا توجد نتائج مطابقة</h3>
                    <p className="text-sm font-bold mt-3 text-gray-400">حاول البحث بكلمة أخرى أو اطلب العمل من الإدارة.</p>
                </div>
            )}
        </div>
    );
};

export default MovieLibrary;
