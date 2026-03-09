'use client';

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { getPlatformSettings, supabase } from './services/storageService';
import { IconSettings } from './types';

// 1. Define Default Icons (The Source of Truth) - Exported for use in Admin Panel
export const defaultIcons: IconSettings = {
    faviconUrl: 'https://h.top4top.io/p_3583m5j8t0.png',
    mainLogoUrl: 'https://h.top4top.io/p_3583m5j8t0.png',
    welcomeHeroImageUrl: 'https://d.top4top.io/p_3584t5zwf3.png',
    welcomeStatStudentIconUrl: 'https://k.top4top.io/p_3583inhay3.png',
    welcomeStatLessonIconUrl: 'https://j.top4top.io/p_3583kuzn32.png',
    welcomeStatSatisfactionIconUrl: 'https://h.top4top.io/p_3583croib0.png',
    welcomeStatSupportIconUrl: 'https://i.ibb.co/L1pDcnv/support.png',
    welcomeFeatureStatsIconUrl: 'https://f.top4top.io/p_3583e5jv00.png',
    welcomeFeaturePlayerIconUrl: 'https://h.top4top.io/p_3583a5wke2.png',
    welcomeFeatureAiIconUrl: 'https://g.top4top.io/p_358376lzw1.png',
    welcomeFeatureCinemaIconUrl: 'https://h.top4top.io/p_3584kk8d71.png',
    authLoginIconUrl: 'https://h.top4top.io/p_3583m5j8t0.png',
    authRegisterIconUrl: 'https://h.top4top.io/p_3583m5j8t0.png',
    studentNavHomeIconUrl: 'https://k.top4top.io/p_3591rrrv00.png',
    studentNavCurriculumIconUrl: 'https://j.top4top.io/p_3583qcfj42.png',
    studentNavReelsIconUrl: 'https://f.top4top.io/p_3597znq510.png',
    studentNavSubscriptionIconUrl: 'https://k.top4top.io/p_35830gaoq2.png',
    studentNavProfileIconUrl: 'https://l.top4top.io/p_3583el7rr0.png',
    studentNavResultsIconUrl: 'https://www2.0zz0.com/2025/11/02/17/240318741.png',
    studentNavChatbotIconUrl: 'https://b.top4top.io/p_3583ycfjf2.png',
    studentNavCartoonIconUrl: 'https://h.top4top.io/p_3584kk8d71.png',
    studentNavQuestionBankIconUrl: 'https://www2.0zz0.com/2025/11/02/17/635761079.png',
    studentAvatar1Url: "https://k.top4top.io/p_359873dvt0.png",
    studentAvatar2Url: "https://l.top4top.io/p_359858i061.png",
    studentAvatar3Url: "https://a.top4top.io/p_3598lyf3w2.png",
    studentAvatar4Url: "https://b.top4top.io/p_3598yozk03.png",
    studentAvatar5Url: "https://c.top4top.io/p_3598n64m84.png",
    studentAvatar6Url: "https://d.top4top.io/p_3598i9l4m5.png",
    adminNavContentIconUrl: 'https://a.top4top.io/p_3591fcsm53.png',
    adminNavTeacherIconUrl: 'https://l.top4top.io/p_3591st8vz2.png',
    adminNavStudentIconUrl: 'https://l.top4top.io/p_3591vsc7c1.png',
    adminNavHealthIconUrl: 'https://g.top4top.io/p_3584g68tl0.png',
    adminNavCartoonIconUrl: 'https://h.top4top.io/p_3584kk8d71.png',
};

const IconContext = createContext<IconSettings>(defaultIcons);

export const IconProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [icons, setIcons] = useState<IconSettings>(defaultIcons);

    const loadIcons = useCallback(async () => {
        const settings = await getPlatformSettings();
        if (settings?.iconSettings) {
            const mergedIcons = { ...defaultIcons };
            Object.keys(defaultIcons).forEach((key) => {
                const k = key as keyof IconSettings;
                const dbValue = settings.iconSettings![k];
                // Only use DB value if it's a non-empty string
                if (dbValue && typeof dbValue === 'string' && dbValue.trim().length > 0) {
                    mergedIcons[k] = dbValue;
                }
            });
            setIcons(mergedIcons);
        } else {
            setIcons(defaultIcons);
        }
    }, []);

    useEffect(() => {
        loadIcons();

        const channel = supabase
            .channel('icon-realtime-listener')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'platform_settings'
            }, () => {
                loadIcons();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [loadIcons]);

    return <IconContext.Provider value={icons}>{children}</IconContext.Provider>;
};

export const useIcons = () => useContext(IconContext);
