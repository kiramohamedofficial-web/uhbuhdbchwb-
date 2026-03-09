'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../hooks/useSession';
import { Role } from '../../types';
import Loader from '../../components/common/Loader';

/**
 * ✅ /settings - الإعدادات (Admin فقط)
 * تُعيد توجيه Admin تلقائياً إلى /admin مع فتح قسم الإعدادات
 */
export default function SettingsPage() {
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

        // Admin → /admin (قسم الإعدادات يُفتح داخل لوحة التحكم)
        router.replace('/admin?section=settings');
    }, [currentUser, isLoading, router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] gap-4">
            <Loader />
            <p className="text-[var(--text-secondary)] text-sm">جاري التوجيه للإعدادات...</p>
        </div>
    );
}
