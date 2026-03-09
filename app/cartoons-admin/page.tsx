'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../hooks/useSession';
import { Role } from '../../types';
import Loader from '../../components/common/Loader';

/**
 * ✅ /cartoons-admin - إدارة الكرتون (Admin فقط)
 * تُعيد التوجيه إلى /admin مع الوصول لقسم الكرتون
 */
export default function CartoonsAdminPage() {
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

        // Admin → /admin مع تحديد قسم الكرتون
        router.replace('/admin?section=cartoons');
    }, [currentUser, isLoading, router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] gap-4">
            <Loader />
            <p className="text-[var(--text-secondary)] text-sm">جاري التوجيه لإدارة الكرتون...</p>
        </div>
    );
}
