
import { useEffect, useRef } from 'react';

/**
 * Custom hook to handle swipe-to-back navigation gestures.
 * Optimized for RTL (Arabic) layouts.
 */
export const useSwipeBack = (onBack: () => void, active: boolean = true) => {
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);

    useEffect(() => {
        if (!active) return;

        const handleTouchStart = (e: TouchEvent) => {
            // Store starting coordinates
            touchStartX.current = e.touches[0].clientX;
            touchStartY.current = e.touches[0].clientY;
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (touchStartX.current === null || touchStartY.current === null) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const deltaX = touchEndX - touchStartX.current;
            const deltaY = touchEndY - touchStartY.current;

            // Gesture thresholds
            const swipeThreshold = 100; // Minimum horizontal distance
            const verticalThreshold = 50; // Maximum allowed vertical deviation

            /**
             * In RTL layouts:
             * Swipe from left to right (deltaX > 0) is usually the "back" gesture.
             */
            if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaY) < verticalThreshold) {
                if (deltaX > 0) {
                    onBack();
                }
            }

            // Reset
            touchStartX.current = null;
            touchStartY.current = null;
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [onBack, active]);
};
