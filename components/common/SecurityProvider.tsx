'use client';

import React, { useEffect, useState } from 'react';

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isBlocked, setIsBlocked] = useState(false);

    useEffect(() => {
        // 1. Block Context Menu (Right Click)
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        // 2. Block Keyboard Shortcuts (F12, PrintScreen, Ctrl+Shift+I, etc.)
        const handleKeyDown = (e: KeyboardEvent) => {
            // Block F12
            if (e.key === 'F12') {
                e.preventDefault();
            }
            // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
            if (e.ctrlKey && (e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase()) || e.key.toUpperCase() === 'U')) {
                e.preventDefault();
            }
            // Block PrintScreen (Limited success on web, but good practice)
            if (e.key === 'PrintScreen') {
                navigator.clipboard.writeText(""); // Clear clipboard
                alert("Screenshots are not allowed on this platform.");
            }
        };

        // 3. Detect Blur (Focus Loss) to hide content
        const handleBlur = () => {
            setIsBlocked(true);
        };
        const handleFocus = () => {
            setIsBlocked(false);
        };

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    return (
        <div className="relative min-h-screen">
            <div className={`transition-all duration-500 ${isBlocked ? 'blur-[50px] grayscale opacity-50' : ''}`}>
                {children}
            </div>
            {isBlocked && (
                <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl animate-fade-in text-white font-tajawal p-6 text-center">
                    <div className="w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center mb-6 border border-red-500/30">
                        <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-3V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-7z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-black mb-2">تم حماية المحتوى</h2>
                    <p className="text-gray-400 font-bold max-w-sm">سياسة المنصة تمنع تصوير الشاشة أو تسجيل المحتوى. يرجى التركيز داخل الصفحة.</p>
                </div>
            )}
        </div>
    );
};
