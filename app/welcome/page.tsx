'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import WelcomeScreen from '../../components/welcome/WelcomeScreen';
import { useRouter } from 'next/navigation';

export default function WelcomePage() {
    const router = useRouter();
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio('https://files.catbox.moe/wvpyw8.wav');
        audioRef.current.onended = () => setIsAudioPlaying(false);
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const stopWelcomeAudio = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsAudioPlaying(false);
        }
    }, []);

    const playWelcomeAudio = useCallback(() => {
        if (audioRef.current?.paused) {
            audioRef.current.play().then(() => setIsAudioPlaying(true)).catch(console.error);
        }
    }, []);

    return (
        <WelcomeScreen
            onNavigateToLogin={() => { router.push('/login'); stopWelcomeAudio(); }}
            onNavigateToRegister={() => { router.push('/register'); stopWelcomeAudio(); }}
            onPlayAudio={playWelcomeAudio}
        />
    );
}
