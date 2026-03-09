'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Role, User } from '../../types';

const STORAGE_KEY = 'last_visited_path';

export const RouteTracker: React.FC = () => {
    const pathname = usePathname();

    useEffect(() => {
        if (!pathname) return;
        // Only save dashboard paths, ignore auth/welcome paths
        if (pathname.startsWith('/student') || pathname.startsWith('/admin') || pathname.startsWith('/teacher')) {
            localStorage.setItem(STORAGE_KEY, pathname);
        }
    }, [pathname]);

    return null;
};

interface RedirectToLastPathProps {
    user: User | null;
}

export const RedirectToLastPath: React.FC<RedirectToLastPathProps> = ({ user }) => {
    const router = useRouter();

    useEffect(() => {
        if (!user) {
            router.replace('/welcome');
            return;
        }

        const lastPath = localStorage.getItem(STORAGE_KEY);

        // Validate if the last path matches the user's role
        let isValidPath = false;
        if (lastPath) {
            if (user.role === Role.ADMIN && lastPath.startsWith('/admin')) isValidPath = true;
            else if ((user.role === Role.TEACHER || user.role === Role.SUPERVISOR) && lastPath.startsWith('/teacher')) isValidPath = true;
            else if (user.role === Role.STUDENT && lastPath.startsWith('/student')) isValidPath = true;
        }

        if (isValidPath && lastPath) {
            router.replace(lastPath);
            return;
        }

        // Default Fallback
        if (user.role === Role.ADMIN) router.replace('/admin');
        else if (user.role === Role.TEACHER || user.role === Role.SUPERVISOR) router.replace('/teacher');
        else router.replace('/student');
    }, [user, router]);

    return null;
};
