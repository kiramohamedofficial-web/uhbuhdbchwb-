
import { Type } from "@google/genai";

// Standard Uthmani Text API
const QURAN_API_BASE = 'https://api.alquran.cloud/v1';

export interface Surah {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    numberOfAyahs: number;
    revelationType: string;
}

export interface Ayah {
    number: number;
    text: string;
    numberInSurah: number;
    juz: number;
    manzil: number;
    page: number;
    ruku: number;
    hizbQuarter: number;
    sajda: boolean;
}

export interface Reciter {
    id: string;
    name: string;
    server: string; // The base URL for the reciter's audio files
    rewaya?: string;
}

export interface RadioStation {
    id: string;
    name: string;
    url: string;
}

export interface Dhikr {
    id: number;
    text: string;
    count: number;
    category: 'morning' | 'evening' | 'exam' | 'travel';
}

// --- CONSTANTS ---
// Using High Quality MP3Quran Servers

export const RECITERS: Reciter[] = [
    { id: 'alafasy', name: 'مشاري راشد العفاسي', server: 'https://server8.mp3quran.net/alafasy', rewaya: 'حفص عن عاصم' },
    { id: 'sudais', name: 'عبد الرحمن السديس', server: 'https://server11.mp3quran.net/sds', rewaya: 'حفص عن عاصم' },
    { id: 'maher', name: 'ماهر المعيقلي', server: 'https://server12.mp3quran.net/maher', rewaya: 'حفص عن عاصم' },
    { id: 'shuraim', name: 'سعود الشريم', server: 'https://server7.mp3quran.net/shur', rewaya: 'حفص عن عاصم' },
    { id: 'ajamy', name: 'أحمد بن علي العجمي', server: 'https://server10.mp3quran.net/ajm', rewaya: 'حفص عن عاصم' },
    { id: 'abdulbasit_murattal', name: 'عبد الباسط عبد الصمد (مرتل)', server: 'https://server7.mp3quran.net/basit', rewaya: 'حفص عن عاصم' },
    { id: 'abdulbasit_mujawwad', name: 'عبد الباسط عبد الصمد (مجود)', server: 'https://server7.mp3quran.net/basit/Al-Mushaf-Al-Mujawwad', rewaya: 'حفص عن عاصم' },
    { id: 'minshawi_murattal', name: 'محمد صديق المنشاوي (مرتل)', server: 'https://server10.mp3quran.net/minsh', rewaya: 'حفص عن عاصم' },
    { id: 'minshawi_mujawwad', name: 'محمد صديق المنشاوي (مجود)', server: 'https://server11.mp3quran.net/minsh_mjwd', rewaya: 'حفص عن عاصم' },
    { id: 'husary_murattal', name: 'محمود خليل الحصري (مرتل)', server: 'https://server13.mp3quran.net/husr', rewaya: 'حفص عن عاصم' },
    { id: 'fares', name: 'فارس عباد', server: 'https://server8.mp3quran.net/frs_a', rewaya: 'حفص عن عاصم' },
    { id: 'nasser', name: 'ناصر القطامي', server: 'https://server6.mp3quran.net/qtm', rewaya: 'حفص عن عاصم' },
    { id: 'yasser', name: 'ياسر الدوسري', server: 'https://server11.mp3quran.net/yasser', rewaya: 'حفص عن عاصم' },
    { id: 'hudhaifi', name: 'علي بن عبدالرحمن الحذيفي', server: 'https://server9.mp3quran.net/hthfi', rewaya: 'حفص عن عاصم' },
    { id: 'juhany', name: 'عبدالله الجهني', server: 'https://server13.mp3quran.net/jhn', rewaya: 'حفص عن عاصم' },
    { id: 'basfar', name: 'عبد الله بصفر', server: 'https://server6.mp3quran.net/bsfr', rewaya: 'حفص عن عاصم' },
    { id: 'shatri', name: 'أبو بكر الشاطري', server: 'https://server11.mp3quran.net/shatri', rewaya: 'حفص عن عاصم' },
    { id: 'tablawi', name: 'محمد محمود الطبلاوي', server: 'https://server12.mp3quran.net/tblawi', rewaya: 'حفص عن عاصم' },
    { id: 'ghamdi', name: 'سعد الغامدي', server: 'https://server7.mp3quran.net/s_gmd', rewaya: 'حفص عن عاصم' },
    { id: 'jibreel', name: 'محمد جبريل', server: 'https://server8.mp3quran.net/jbrl', rewaya: 'حفص عن عاصم' }
];

export const RADIO_STATIONS: RadioStation[] = [
    { id: 'radio_cairo', name: 'إذاعة القرآن الكريم - القاهرة', url: 'https://stream.radiojar.com/8s5u5tpdtwzuv' },
    { id: 'radio_mp3quran', name: 'إذاعة MP3Quran العامة', url: 'https://live.mp3quran.net:9702/;' },
    { id: 'radio_makkah', name: 'إذاعة الحرم المكي', url: 'https://live.mp3quran.net:9992/;' },
    { id: 'radio_alafasy', name: 'إذاعة العفاسي', url: 'https://live.mp3quran.net:9852/;' },
    { id: 'radio_abdulbasit', name: 'إذاعة عبدالباسط عبدالصمد', url: 'https://live.mp3quran.net:9958/;' },
    { id: 'radio_minshawi', name: 'إذاعة محمد صديق المنشاوي', url: 'https://live.mp3quran.net:9968/;' },
    { id: 'radio_maher', name: 'إذاعة ماهر المعيقلي', url: 'https://live.mp3quran.net:9990/;' },
];

export const ADHKAR_DATA: Dhikr[] = [
    // Morning
    { id: 1, category: 'morning', text: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.', count: 1 },
    { id: 2, category: 'morning', text: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ.', count: 1 },
    { id: 3, category: 'morning', text: 'آيَةُ الكُرْسِيِّ: ﴿اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...﴾', count: 1 },
    { id: 4, category: 'morning', text: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ، قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ، قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ.', count: 3 },
    
    // Evening
    { id: 5, category: 'evening', text: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا.', count: 1 },
    { id: 6, category: 'evening', text: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ.', count: 1 },
    { id: 7, category: 'evening', text: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ.', count: 3 },
    
    // Exam
    { id: 8, category: 'exam', text: 'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا، وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلًا.', count: 7 },
    { id: 9, category: 'exam', text: 'رَبِّ اشْرَحْ لِي صَدْرِي، وَيَسِّرْ لِي أَمْرِي، وَاحْلُلْ عُقْدَةً مِنْ لِسَانِي يَفْقَهُوا قَوْلِي.', count: 3 },
    { id: 10, category: 'exam', text: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ.', count: 3 },
    
    // Travel
    { id: 11, category: 'travel', text: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ.', count: 1 },
    { id: 12, category: 'travel', text: 'اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى.', count: 1 },
];

let cachedSurahs: Surah[] = [];

export const getSurahList = async (): Promise<Surah[]> => {
    // 1. Try In-Memory Cache
    if (cachedSurahs.length > 0) return cachedSurahs;

    // 2. Try Local Storage Cache
    try {
        const stored = localStorage.getItem('quran_surahs_cache');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                cachedSurahs = parsed;
                return parsed;
            }
        }
    } catch (e) {
        console.error("Failed to read from local storage", e);
    }

    // 3. Fetch from API
    try {
        const response = await fetch(`${QURAN_API_BASE}/surah`);
        const data = await response.json();
        if (data.code === 200) {
            cachedSurahs = data.data;
            // Save to Local Storage
            try {
                localStorage.setItem('quran_surahs_cache', JSON.stringify(data.data));
            } catch (e) {
                console.error("Failed to save to local storage", e);
            }
            return data.data;
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch Surah list:", error);
        return [];
    }
};

export const getSurahText = async (surahNumber: number): Promise<Ayah[]> => {
    // Check Cache first
    const cacheKey = `quran_text_${surahNumber}`;
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (e) {}

    try {
        // Fetch Uthmani script
        const response = await fetch(`${QURAN_API_BASE}/surah/${surahNumber}/quran-uthmani`);
        const data = await response.json();
        if (data.code === 200) {
            // Save to Cache
            try {
                localStorage.setItem(cacheKey, JSON.stringify(data.data.ayahs));
            } catch (e) {
                console.warn("LocalStorage quota exceeded or write failed for Quran text");
            }
            return data.data.ayahs;
        }
        return [];
    } catch (error) {
        console.error(`Failed to fetch Surah ${surahNumber}:`, error);
        return [];
    }
};

export const getSurahAudioUrl = (surahNumber: number, reciterId: string = 'alafasy'): string => {
    const reciter = RECITERS.find(r => r.id === reciterId) || RECITERS[0];
    const formattedNumber = surahNumber.toString().padStart(3, '0');
    return `${reciter.server}/${formattedNumber}.mp3`;
};
