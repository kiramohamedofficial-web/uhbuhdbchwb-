
import { useState, useEffect } from 'react';

/**
 * useScreen Hook
 * المركز الموحد للتحكم في أحجام الشاشة واستجابة التصميم.
 * يحدد نوع الجهاز (موبايل، تابلت، ديسكتوب) ويوفر حالة القائمة الجانبية.
 */

type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface ScreenState {
    width: number;
    height: number;
    device: DeviceType;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    setSidebarOpen: (isOpen: boolean) => void;
    isLandscape: boolean;
}

export const useScreen = (): ScreenState => {
    // Initial state based on window (if available)
    const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
    const [height, setHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            setWidth(window.innerWidth);
            setHeight(window.innerHeight);
            
            // Auto close sidebar on mobile when resizing from desktop
            if (window.innerWidth < 768) {
                // Keep sidebar state but logic can be extended here
            } else {
                setIsSidebarOpen(false); // Reset mobile sidebar on desktop
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Determine device type based on breakpoints
    // Mobile: < 768px
    // Tablet: 768px - 1024px
    // Desktop: > 1024px
    let device: DeviceType = 'desktop';
    if (width < 768) device = 'mobile';
    else if (width < 1024) device = 'tablet';

    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
    const setSidebarOpen = (isOpen: boolean) => setIsSidebarOpen(isOpen);

    return {
        width,
        height,
        device,
        isMobile: device === 'mobile',
        isTablet: device === 'tablet',
        isDesktop: device === 'desktop',
        isSidebarOpen,
        toggleSidebar,
        setSidebarOpen,
        isLandscape: width > height
    };
};
