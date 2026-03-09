'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../hooks/useSession';
import { Role } from '../../types';
import Loader from '../../components/common/Loader';

/**
 * ✅ /dashboard - لوحة التحكم (Admin فقط)
 * تُعيد توجيه الـ Admin إلى /admin تلقائياً
 */
export default function DashboardPage() {
    const { currentUser, isLoading } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        if (!currentUser) {
            router.replace('/login');
            return;
        }

        if (currentUser.role !== Role.ADMIN) {
            router.replace('/');
            return;
        }

        // Admin → /admin (لوحة التحكم الكاملة)
        router.replace('/admin');
    }, [currentUser, isLoading, router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] gap-4">
            <Loader />
            <p className="text-[var(--text-secondary)] text-sm">جاري التوجيه للوحة التحكم...</p>
        </div>
    );
}
