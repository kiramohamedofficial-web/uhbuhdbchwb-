'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../hooks/useSession';
import { Role } from '../types';
import Loader from '../components/common/Loader';

const STORAGE_KEY = 'last_visited_path';

export default function HomePage() {
    const { currentUser, isLoading } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        if (!currentUser) {
            router.replace('/welcome');
            return;
        }

        // Try to restore last visited path
        const lastPath = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;

        let isValidPath = false;
        if (lastPath) {
            if (currentUser.role === Role.ADMIN && lastPath.startsWith('/admin')) isValidPath = true;
            else if ((currentUser.role === Role.TEACHER || currentUser.role === Role.SUPERVISOR) && lastPath.startsWith('/teacher')) isValidPath = true;
            else if (currentUser.role === Role.STUDENT && lastPath.startsWith('/student')) isValidPath = true;
        }

        if (isValidPath && lastPath) {
            router.replace(lastPath);
            return;
        }

        // Default fallback by role
        if (currentUser.role === Role.ADMIN) router.replace('/admin');
        else if (currentUser.role === Role.TEACHER || currentUser.role === Role.SUPERVISOR) router.replace('/teacher');
        else router.replace('/student');
    }, [currentUser, isLoading, router]);

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-primary)]">
            <Loader />
        </div>
    );
}
