'use client';

// صفحة 404 - Not Found
import React from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
    const router = useRouter();

    return (
        <div
            className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]"
            dir="rtl"
        >
            <div className="text-center px-8 max-w-lg">
                <div className="relative mb-8">
                    <h1 className="text-[10rem] font-black leading-none select-none not-found-gradient">
                        404
                    </h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
                    </div>
                </div>

                {/* Message */}
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
                    عذراً! الصفحة غير موجودة
                </h2>
                <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
                    الصفحة التي تبحث عنها لا يمكن العثور عليها.
                    ربما تم تغيير عنوانها أو حذفها.
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-3 rounded-xl border border-white/20 text-[var(--text-primary)] hover:bg-white/5 transition-all duration-200 font-medium"
                    >
                        ← العودة للخلف
                    </button>
                    <button
                        onClick={() => router.replace('/')}
                        className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all duration-200 shadow-lg shadow-indigo-500/30"
                    >
                        🏠 الصفحة الرئيسية
                    </button>
                </div>

                {/* Decoration */}
                <div className="mt-12 flex justify-center gap-2">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="w-2 h-2 rounded-full bg-indigo-500/30"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
