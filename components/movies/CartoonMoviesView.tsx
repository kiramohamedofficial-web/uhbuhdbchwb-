import React, { useState, useEffect, useCallback } from 'react';
import { CartoonMovie, CartoonEpisode, ToastType } from '../../types';
import { getPublishedCartoonMovies, cleanExpiredMovieRequests } from '../../services/movieService';
import { supabase } from '../../services/storageService';
import { ArrowRightIcon, ChatBubbleOvalLeftEllipsisIcon } from '../common/Icons';
import Loader from '../common/Loader';
import { useSession } from '../../hooks/useSession';
import { useToast } from '../../useToast';
import { useSubscription } from '../../hooks/useSubscription';
import MovieLibrary from './MovieLibrary';
import MovieDetail from './MovieDetail';
import MoviePlayer from './MoviePlayer';
import RequestModal from './RequestModal';

const CartoonMoviesView: React.FC<{ onBack: () => void; initialMovie?: CartoonMovie }> = ({ onBack, initialMovie }) => {
    const { addToast } = useToast();
    const { currentUser: user } = useSession();
    const { checkUnseenMovieReplies, hasUnseenMovieReplies } = useSubscription();

    const [movies, setMovies] = useState<CartoonMovie[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'movie' | 'series'>('all');
    
    const [selectedMovie, setSelectedMovie] = useState<CartoonMovie | null>(initialMovie || null);
    const [selectedEpisode, setSelectedEpisode] = useState<CartoonEpisode | null>(null);
    const [featuredMovie, setFeaturedMovie] = useState<CartoonMovie | null>(null);
    
    // Request State
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

    const fetchMovies = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getPublishedCartoonMovies();
            setMovies(data);
            if (data.length > 0) setFeaturedMovie(data[0]);
        } catch (error) {
            addToast("فشل تحميل المكتبة", ToastType.ERROR);
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchMovies();
        cleanExpiredMovieRequests();
        if (user) {
            checkUnseenMovieReplies();
        }
    }, [fetchMovies, user, checkUnseenMovieReplies]);

    if (selectedEpisode && selectedMovie) {
        return (
            <MoviePlayer 
                episode={selectedEpisode} 
                movieTitle={selectedMovie.title} 
                onBack={() => setSelectedEpisode(null)} 
            />
        );
    }

    if (selectedMovie) {
        return (
            <MovieDetail 
                movie={selectedMovie} 
                allMovies={movies} 
                onBack={() => setSelectedMovie(null)} 
                onSelectEpisode={setSelectedEpisode}
                onSelectMovie={setSelectedMovie}
            />
        );
    }

    if (isLoading) return <div className="flex justify-center items-center h-screen bg-[#050505]"><Loader /></div>;

    const filteredMovies = movies.filter(m => {
        const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filter === 'all' || m.type === filter;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="min-h-screen bg-[#050505] text-white font-cairo pb-20 animate-fade-in relative">
            
            {/* Header Fixed Nav */}
            <div className="flex items-center justify-between p-6 sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
                <button onClick={onBack} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all border border-white/10 group">
                    <ArrowRightIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform rotate-180" />
                </button>
                <div className="flex gap-2 p-1 bg-white/5 rounded-full border border-white/5 backdrop-blur-md">
                    {(['all', 'movie', 'series'] as const).map((f) => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-5 py-2 rounded-full text-sm md:text-sm font-bold transition-all ${filter === f ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                            {{all: 'الكل', movie: 'أفلام', series: 'مسلسلات'}[f]}
                        </button>
                    ))}
                </div>
            </div>

            {/* زر الشات العائم المطور */}
            <button 
                onClick={() => setIsRequestModalOpen(true)} 
                className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-50 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all hover:scale-110 active:scale-95 flex items-center justify-center border-2 border-white/10"
            >
                <ChatBubbleOvalLeftEllipsisIcon className="w-7 h-7" />
                {hasUnseenMovieReplies && (
                    <span className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 rounded-full animate-bounce border-2 border-[#050505]"></span>
                )}
            </button>

            <MovieLibrary 
                movies={filteredMovies}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filter={filter}
                setFilter={setFilter}
                onSelectMovie={setSelectedMovie}
                featuredMovie={featuredMovie}
            />

            {user && (
                <RequestModal 
                    isOpen={isRequestModalOpen}
                    onClose={() => setIsRequestModalOpen(false)}
                    userId={user.id}
                    studentName={user.name}
                />
            )}
        </div>
    );
};

export default CartoonMoviesView;