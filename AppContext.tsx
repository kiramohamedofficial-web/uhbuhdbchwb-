'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Mode, Style, AppearanceSettings, CustomColors } from './types';

// =================================================================
// APPEARANCE CONTEXT
// =================================================================

const defaultColors: Record<string, CustomColors> = {
    'light': {
        '--bg-primary': '#F8FAFC',
        '--bg-secondary': '#FFFFFF',
        '--text-primary': '#0F172A',
        '--accent-primary': '#6366F1',
    },
    'dark': {
        '--bg-primary': '#020204',
        '--bg-secondary': '#0A0A0F',
        '--text-primary': '#FFFFFF',
        '--accent-primary': '#6366F1',
    }
};

const defaultAppearanceSettings: AppearanceSettings = {
    neon: {
        enabled: false,
        color: '#00ffff',
        intensity: 0.5,
    },
    customColors: defaultColors,
};

interface AppearanceContextType {
    mode: Mode;
    setMode: (mode: Mode) => void;
    style: Style;
    setStyle: (style: Style) => void;
    appearanceSettings: AppearanceSettings;
    setAppearanceSettings: React.Dispatch<React.SetStateAction<AppearanceSettings>>;
    profileHeaderColor: string;
    setProfileHeaderColor: (color: string) => void;
}

export const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

export const useAppearance = () => {
    const context = useContext(AppearanceContext);
    if (!context) throw new Error('useAppearance must be used within AppearanceProvider');
    return context;
};

// =================================================================
// APP LIFECYCLE CONTEXT
// =================================================================

export const AppLifecycleContext = createContext({
    setRefreshPaused: (paused: boolean) => { }
});

// =================================================================
// APPEARANCE PROVIDER (exported for use in page-level wrappers)
// =================================================================

export const AppearanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<Mode>('light');
    const [style, setStyle] = useState<Style>('R1');
    const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>(defaultAppearanceSettings);
    const [profileHeaderColor, setProfileHeaderColor] = useState<string>('#6366F1');

    useEffect(() => {
        const storedMode = localStorage.getItem('theme_mode') as Mode | null;
        const storedStyle = localStorage.getItem('theme_style') as Style | null;
        const storedSettings = localStorage.getItem('appearance_settings');
        const storedProfileColor = localStorage.getItem('profile_header_color');

        if (storedMode) setMode(storedMode);
        if (storedStyle) setStyle(storedStyle);
        if (storedProfileColor) setProfileHeaderColor(storedProfileColor);

        if (storedSettings) {
            try {
                const parsedSettings = JSON.parse(storedSettings) as any;
                setAppearanceSettings(prev => ({
                    ...prev,
                    ...parsedSettings,
                    customColors: { ...prev.customColors, ...parsedSettings.customColors }
                }));
            } catch (error: unknown) {
                console.error("Failed to parse appearance settings from localStorage");
            }
        }
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', mode);
        document.documentElement.setAttribute('data-style', style);

        if (mode === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        const colors = appearanceSettings.customColors[mode] || defaultColors[mode];
        if (colors) {
            for (const [key, value] of Object.entries(colors)) {
                document.documentElement.style.setProperty(key, value as string);
            }
        }

        localStorage.setItem('theme_mode', mode);
        localStorage.setItem('theme_style', style);
        localStorage.setItem('appearance_settings', JSON.stringify(appearanceSettings));
        localStorage.setItem('profile_header_color', profileHeaderColor);
    }, [mode, style, appearanceSettings, profileHeaderColor]);

    const value = useMemo(() => ({
        mode, setMode,
        style, setStyle,
        appearanceSettings, setAppearanceSettings,
        profileHeaderColor, setProfileHeaderColor
    }), [mode, style, appearanceSettings, profileHeaderColor]);

    return (
        <AppearanceContext.Provider value={value}>
            {children}
        </AppearanceContext.Provider>
    );
};
