
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  alignTop?: boolean;
  noShadow?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth, alignTop = false, noShadow = false }) => {
  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-[110] flex ${alignTop ? 'items-start pt-10' : 'items-center'} justify-center bg-black/60 backdrop-blur-md animate-fade-in`} 
      onClick={onClose}
    >
      <div 
        className={`relative w-full ${maxWidth || 'max-w-lg'} m-4 p-6 sm:p-8 rounded-[2.5rem] ${noShadow ? '' : 'shadow-2xl'} bg-white dark:bg-slate-900 border border-white/20 dark:border-slate-800 text-[var(--text-primary)] animate-slide-up max-h-[92dvh] overflow-y-auto custom-scrollbar`} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative elements for Modal */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10 flex justify-between items-center pb-5 mb-5 border-b border-gray-100 dark:border-slate-800">
          <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
