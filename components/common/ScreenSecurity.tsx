
import React, { useEffect, useState } from 'react';
import { ShieldCheckIcon } from './Icons';
import { useSession } from '../../hooks/useSession';
import { Role } from '../../types';

const ScreenSecurity: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useSession();
  const [isBlocked, setIsBlocked] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const warningText = 'لأسباب تتعلق بحقوق الملكية الفكرية وحماية المحتوى، تم تعطيل تصوير الشاشة والنسخ والطباعة.';

  // Check if user is an admin to bypass security
  const isAdmin = currentUser?.role === Role.ADMIN;

  useEffect(() => {
    // 1. Prevent Context Menu (Right Click)
    const handleContextMenu = (e: MouseEvent) => {
      if (isAdmin) return; // Bypass for Admin
      e.preventDefault();
    };

    // 2. Prevent Copy / Cut / Print
    const handleCopy = (e: ClipboardEvent) => {
      if (isAdmin) return; // Bypass for Admin
      e.preventDefault();
    };
    const handleCut = (e: ClipboardEvent) => {
      if (isAdmin) return;
      e.preventDefault();
    };
    const handleBeforePrint = (e: Event) => {
      if (isAdmin) return;
      e.preventDefault();
      setIsBlocked(true);
      setTimeout(() => setIsBlocked(false), 3000);
    };

    // 3. Detect Screenshot Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAdmin) return; // Bypass for Admin

      // PrintScreen Key
      if (e.key === 'PrintScreen') {
        try {
          navigator.clipboard.writeText('');
        } catch (err) { }
        e.preventDefault();
        setIsBlocked(true);
        setTimeout(() => setIsBlocked(false), 3000);
      }

      // Common Mac/Windows combos (Cmd+Shift+3/4, Win+Shift+S)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        try {
          navigator.clipboard.writeText('');
        } catch (err) { }
        setIsBlocked(true);
        setTimeout(() => setIsBlocked(false), 3000);
      }
    };

    // 4. Privacy Curtain (App Switch/Inactive)
    const handleVisibilityChange = () => {
      if (isAdmin) return; // Bypass for Admin
      if (document.hidden) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopy);
    window.addEventListener('cut', handleCut);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('cut', handleCut);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAdmin]);

  return (
    <div className={`relative secure-content h-full w-full ${isAdmin ? '' : 'select-none'}`}>
      {/* Background watermark removed for better visual experience */}

      {/* Action Blocked Overlay (Triggered by Keys) */}
      {isBlocked && !isAdmin && (
        <div
          className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-md flex items-center justify-center text-white text-center p-8 fade-in"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md">
            <ShieldCheckIcon className="w-20 h-20 text-red-500 mx-auto mb-6 animate-pulse" />
            <h2 className="text-3xl font-bold mb-4">تم حظر الإجراء</h2>
            <p className="text-lg text-gray-300">{warningText}</p>
          </div>
        </div>
      )}

      {/* Privacy Curtain (App Switch/Inactive) */}
      {isHidden && !isAdmin && (
        <div className="fixed inset-0 z-[10001] bg-black flex items-center justify-center">
          <div className="text-center">
            <ShieldCheckIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 font-bold">Gstudent Security Protection</p>
          </div>
        </div>
      )}

      {children}
    </div>
  );
};

export default ScreenSecurity;
