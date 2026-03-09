
import { supabase } from './storageService';
import { CartoonMovie, CartoonSeason, CartoonEpisode } from '../types';

// ═══════════════════════════════════════════════════════════
// Helper: Map DB structure to Frontend Types
// ═══════════════════════════════════════════════════════════
const mapMovie = (m: any): CartoonMovie => ({
    id: m.id,
    title: m.title_ar || m.title, 
    story: m.description_ar || m.description || m.story, 
    posterUrl: m.poster_url || m.image_url,
    videoUrl: m.video_url,
    trailerUrl: m.trailer_url,
    adUrl: m.ad_url,
    downloadLinks: m.download_links, 
    downloadUrl: m.download_url,
    downloadInstructions: m.download_instructions,
    showInstructions: m.show_instructions,
    isPublished: m.is_published,
    type: m.type || 'movie',
    category: m.category,
    rating: m.rating,
    duration: m.duration || (m.duration_minutes ? `${m.duration_minutes} min` : undefined),
    releaseYear: m.release_year?.toString(),
    franchise: m.franchise,
    galleryImages: m.gallery_images || [],
    createdAt: m.created_at,
    loadInstructions: '',
    instructionsThumbnailUrl: '',
    seasons: (m.seasons || []).map((s: any) => ({
        id: s.id,
        series_id: s.series_id,
        season_number: s.season_number,
        title: s.title,
        description: s.description,
        posterUrl: s.poster_url,
        trailerUrl: s.trailer_url,
        adUrl: s.ad_url,
        is_published: s.is_published,
        createdAt: s.created_at,
        episodes: (s.episodes || []).map((e: any) => ({
            id: e.id,
            season_id: e.season_id,
            seasonNumber: e.season_number,
            episodeNumber: e.episode_number,
            title: e.title,
            description: e.description,
            videoUrl: e.video_url, 
            thumbnailUrl: e.thumbnail_url,
            downloadLinks: e.download_links, 
            adUrl: e.ad_url,
            duration: e.duration,
            releaseDate: e.release_date
        })).sort((a: any, b: any) => a.episodeNumber - b.episodeNumber)
    })).sort((a: any, b: any) => a.season_number - b.season_number)
});

// ═══════════════════════════════════════════════════════════
// 1️⃣ Movie/Series Management
// ═══════════════════════════════════════════════════════════

export const fetchAllMovies = async () => {
  const { data, error } = await supabase
    .from("cartoon_movies")
    .select(`*, seasons:cartoon_seasons (*, episodes:cartoon_episodes (*))`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapMovie);
};

export const fetchPublishedMovies = async () => {
    const { data, error } = await supabase
        .from('cartoon_movies')
        .select(`*, seasons:cartoon_seasons (*, episodes:cartoon_episodes (*))`)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(mapMovie);
};

export const createMovie = async (movieData: Partial<CartoonMovie>) => {
  const dbMovie = {
      title: movieData.title,
      title_ar: movieData.title, 
      description: movieData.story,
      poster_url: movieData.posterUrl,
      video_url: movieData.videoUrl,
      trailer_url: movieData.trailerUrl,
      ad_url: movieData.adUrl,
      download_url: movieData.downloadUrl,
      download_links: movieData.downloadLinks,
      type: movieData.type || 'movie',
      category: movieData.category || 'عام',
      rating: movieData.rating || 0,
      duration: movieData.duration || null,
      release_year: movieData.releaseYear ? parseInt(movieData.releaseYear) : new Date().getFullYear(),
      is_published: movieData.isPublished ?? false,
      franchise: movieData.franchise || null,
      gallery_images: movieData.galleryImages || [],
  };

  const { data, error } = await supabase
    .from("cartoon_movies")
    .insert(dbMovie)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateMovie = async (movieId: string, updates: Partial<CartoonMovie>) => {
  const dbUpdates: any = {};
  if (updates.title !== undefined) { dbUpdates.title = updates.title; dbUpdates.title_ar = updates.title; }
  if (updates.story !== undefined) { dbUpdates.description = updates.story; }
  if (updates.posterUrl !== undefined) { dbUpdates.poster_url = updates.posterUrl; }
  if (updates.videoUrl !== undefined) { dbUpdates.video_url = updates.videoUrl; }
  if (updates.trailerUrl !== undefined) { dbUpdates.trailer_url = updates.trailerUrl; }
  if (updates.adUrl !== undefined) { dbUpdates.ad_url = updates.adUrl; }
  if (updates.downloadUrl !== undefined) { dbUpdates.download_url = updates.downloadUrl; }
  if (updates.downloadLinks !== undefined) { dbUpdates.download_links = updates.downloadLinks; }
  if (updates.type !== undefined) { dbUpdates.type = updates.type; }
  if (updates.category !== undefined) { dbUpdates.category = updates.category; }
  if (updates.rating !== undefined) { dbUpdates.rating = updates.rating; }
  if (updates.duration !== undefined) { dbUpdates.duration = updates.duration; }
  if (updates.releaseYear !== undefined) { dbUpdates.release_year = parseInt(updates.releaseYear); }
  if (updates.isPublished !== undefined) { dbUpdates.is_published = updates.isPublished; }
  if (updates.franchise !== undefined) { dbUpdates.franchise = updates.franchise; }
  if (updates.galleryImages !== undefined) { dbUpdates.gallery_images = updates.galleryImages; }

  const { data, error } = await supabase
    .from("cartoon_movies")
    .update(dbUpdates)
    .eq("id", movieId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteMovie = async (movieId: string) => {
  await supabase.from("cartoon_episodes").delete().eq("movie_id", movieId);
  await supabase.from("cartoon_seasons").delete().eq("series_id", movieId);
  const { error } = await supabase.from("cartoon_movies").delete().eq("id", movieId);
  if (error) throw error;
};

// ═══════════════════════════════════════════════════════════
// 2️⃣ Season & Episode Management
// ═══════════════════════════════════════════════════════════

export const createSeason = async (seasonData: Partial<CartoonSeason>) => {
  const { data, error } = await supabase
    .from("cartoon_seasons")
    .insert({
      series_id: seasonData.series_id,
      season_number: seasonData.season_number,
      title: seasonData.title || `الموسم ${seasonData.season_number}`,
      poster_url: seasonData.posterUrl || null,
      trailer_url: seasonData.trailerUrl || null,
      ad_url: seasonData.adUrl || null,
      description: seasonData.description || null,
      is_published: seasonData.is_published ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateSeason = async (seasonId: string, updates: Partial<CartoonSeason>) => {
  const dbUpdates: any = {};
  if (updates.season_number !== undefined) dbUpdates.season_number = updates.season_number;
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.posterUrl !== undefined) dbUpdates.poster_url = updates.posterUrl;
  if (updates.trailerUrl !== undefined) dbUpdates.trailer_url = updates.trailerUrl;
  if (updates.adUrl !== undefined) dbUpdates.ad_url = updates.adUrl;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.is_published !== undefined) dbUpdates.is_published = updates.is_published;

  const { data, error } = await supabase.from("cartoon_seasons").update(dbUpdates).eq("id", seasonId).select().single();
  if (error) throw error;
  return data;
};

export const deleteSeason = async (seasonId: string) => {
  await supabase.from("cartoon_episodes").delete().eq("season_id", seasonId);
  const { error } = await supabase.from("cartoon_seasons").delete().eq("id", seasonId);
  if (error) throw error;
};

export const createEpisode = async (episodeData: Partial<CartoonEpisode> & { movie_id?: string, season_id?: string }) => {
  const { data, error } = await supabase
    .from("cartoon_episodes")
    .insert({
      movie_id: episodeData.movie_id,
      season_id: episodeData.season_id,
      season_number: episodeData.seasonNumber || 1,
      episode_number: episodeData.episodeNumber,
      title: episodeData.title,
      video_url: episodeData.videoUrl, 
      thumbnail_url: episodeData.thumbnailUrl || null,
      description: episodeData.description || null,
      duration: episodeData.duration || null,
      ad_url: episodeData.adUrl || null,
      download_links: episodeData.downloadLinks || [], 
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateEpisode = async (episodeId: string, updates: Partial<CartoonEpisode>) => {
  const dbUpdates: any = {};
  if (updates.episodeNumber !== undefined) dbUpdates.episode_number = updates.episodeNumber;
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.videoUrl !== undefined) dbUpdates.video_url = updates.videoUrl;
  if (updates.thumbnailUrl !== undefined) dbUpdates.thumbnail_url = updates.thumbnailUrl;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
  if (updates.adUrl !== undefined) dbUpdates.ad_url = updates.adUrl;
  if (updates.downloadLinks !== undefined) dbUpdates.download_links = updates.downloadLinks;

  const { data, error } = await supabase.from("cartoon_episodes").update(dbUpdates).eq("id", episodeId).select().single();
  if (error) throw error;
  return data;
};

export const deleteEpisode = async (episodeId: string) => {
  const { error } = await supabase.from("cartoon_episodes").delete().eq("id", episodeId);
  if (error) throw error;
};

// ═══════════════════════════════════════════════════════════
// 3️⃣ Movie Requests Logic (Auto-cleanup after 3 days)
// ═══════════════════════════════════════════════════════════

export const cleanExpiredMovieRequests = async () => {
    // 3 days ago in ISO format
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    
    // Delete requests that are 'done' and were updated more than 3 days ago
    const { data, error } = await supabase
        .from('movie_requests')
        .delete()
        .eq('status', 'done')
        .lt('updated_at', threeDaysAgo);
        
    if (error) console.error("Auto-cleanup movie requests failed:", error);
    return { data, error };
};

export const replyToMovieRequest = async (requestId: string, reply: string) => {
    return await supabase
        .from('movie_requests')
        .update({ 
            admin_reply: reply, 
            status: 'done',
            updated_at: new Date().toISOString()
        })
        .eq('id', requestId);
};

export const getPublishedCartoonMovies = fetchPublishedMovies;
export const getAllCartoonMovies = fetchAllMovies;
export const addCartoonMovie = createMovie;
export const updateCartoonMovie = updateMovie;
export const deleteCartoonMovie = deleteMovie;
export const addSeason = createSeason;
export const addEpisode = createEpisode;
