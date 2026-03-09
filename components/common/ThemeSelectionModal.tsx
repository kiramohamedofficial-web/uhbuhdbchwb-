
import React from 'react';
import { THEMES } from '../../constants';
import { Mode, Style } from '../../types';
import { CheckCircleIcon, XIcon, SparklesIcon } from './Icons';

interface ThemeCardProps {
  theme: typeof THEMES[0];
  isActive: boolean;
  onClick: () => void;
}

const ThemeCard: React.FC<ThemeCardProps> = ({ theme, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full h-32 rounded-2xl overflow-hidden transition-all duration-300 transform hover:scale-[1.02] focus:outline-none 
      ${isActive ? 'ring-4 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-primary)] shadow-xl' : 'hover:shadow-lg'}`}
    >
      {/* Background Preview */}
      <div className="absolute inset-0 transition-opacity duration-300" style={{ background: theme.colors.gradient }}></div>
      
      {/* Texture/Pattern Overlay */}
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity"></div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 z-10">
        <span className="text-3xl mb-2 filter drop-shadow-md">
            {theme.id.includes('dark') ? '🌑' : '☀️'}
        </span>
        <span className="font-bold text-lg md:text-xl drop-shadow-md tracking-wide">
          {theme.name}
        </span>
        {theme.id === 'R1' && <span className="text-sm bg-[var(--accent-primary)] px-3 py-0.5 rounded-full mt-1 shadow-lg border border-white/20">Premium Clay</span>}
        {theme.id === 'R2' && <span className="text-sm bg-white/20 px-2 py-0.5 rounded-full mt-1 backdrop-blur-sm">Soft UI</span>}
      </div>

      {/* Active Checkmark */}
      {isActive && (
        <div className="absolute top-2 right-2 bg-white text-[var(--accent-primary)] rounded-full p-1 shadow-lg z-20 animate-fade-in-up">
          <CheckCircleIcon className="w-5 h-5" />
        </div>
      )}
    </button>
  );
};

interface ThemeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: Mode;
  currentStyle: Style;
  setMode: (mode: Mode) => void;
  setStyle: (style: Style) => void;
}

const ThemeSelectionModal: React.FC<ThemeSelectionModalProps> = ({ isOpen, onClose, currentMode, currentStyle, setMode, setStyle }) => {
  if (!isOpen) return null;

  const handleThemeSelect = (themeId: string) => {
    if (themeId === 'R1') {
        setStyle('R1');
    } else if (themeId === 'R2') {
        setStyle('R2');
    }
    // Small delay to show selection before closing
    setTimeout(onClose, 200);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div
        className="relative w-full max-w-4xl p-6 md:p-8 mx-4 rounded-3xl shadow-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] fade-in-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background decorative blob */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-primary)] opacity-5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

        <div className="relative z-10 flex justify-between items-center pb-6 border-b border-[var(--border-primary)] mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--bg-tertiary)] rounded-xl">
                <SparklesIcon className="w-6 h-6 text-[var(--accent-primary)]" />
            </div>
            <div>
                <h3 className="text-2xl font-black tracking-tight">مظهر التطبيق</h3>
                <p className="text-sm text-[var(--text-secondary)]">اختر النمط الذي يناسب ذوقك</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors">
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
          {THEMES.map(theme => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              isActive={currentStyle === theme.id}
              onClick={() => handleThemeSelect(theme.id)}
            />
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-[var(--border-primary)] text-center text-sm text-[var(--text-secondary)] relative z-10">
            يتم حفظ تفضيلاتك تلقائيًا لهذا الجهاز. يمكنك التبديل بين الوضع الليلي والنهاري من القائمة الجانبية.
        </div>
      </div>
    </div>
  );
};

export default ThemeSelectionModal;
