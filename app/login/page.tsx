'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import AuthScreen from '../../components/auth/AuthScreen';
import { useRouter } from 'next/navigation';
import ErrorBoundary from '../../components/common/ErrorBoundary';

export default function LoginPage() {
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

    const toggleWelcomeAudio = useCallback(() => {
        if (audioRef.current) {
            if (isAudioPlaying) {
                audioRef.current.pause();
                setIsAudioPlaying(false);
            } else {
                audioRef.current.play().then(() => setIsAudioPlaying(true)).catch(console.error);
            }
        }
    }, [isAudioPlaying]);

    return (
        <ErrorBoundary>
            <AuthScreen
                initialView="login"
                onBack={() => { router.push('/welcome'); stopWelcomeAudio(); }}
                isAudioPlaying={isAudioPlaying}
                onToggleAudio={toggleWelcomeAudio}
            />
        </ErrorBoundary>
    );
}
