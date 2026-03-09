
import React from 'react';
import { useToast } from '../../useToast';
import { ToastMessage, ToastType } from '../../types';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, ShieldExclamationIcon } from './Icons';

const toastIcons: Record<ToastType, React.FC<{className?: string}>> = {
    [ToastType.SUCCESS]: CheckCircleIcon,
    [ToastType.ERROR]: XCircleIcon,
    [ToastType.INFO]: InformationCircleIcon,
    [ToastType.WARNING]: ShieldExclamationIcon,
};

const toastStyles: Record<ToastType, string> = {
    [ToastType.SUCCESS]: 'bg-green-600 text-white border-green-500',
    [ToastType.ERROR]: 'bg-red-600 text-white border-red-500',
    [ToastType.INFO]: 'bg-blue-600 text-white border-blue-500',
    [ToastType.WARNING]: 'bg-amber-500 text-white border-amber-400',
};

const Toast: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
    const Icon = toastIcons[toast.type];

    return (
        <div className={`flex items-start p-4 rounded-xl shadow-2xl border ${toastStyles[toast.type]} backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100`}>
            <div className="flex-shrink-0 pt-0.5">
                <Icon className="w-6 h-6" />
            </div>
            <div className="mr-3 ml-3 flex-1 text-right">
                <p className="text-sm font-bold whitespace-pre-wrap leading-relaxed">{toast.message}</p>
            </div>
            <div className="flex-shrink-0 flex">
                <button onClick={() => onDismiss(toast.id)} className="inline-flex rounded-full p-1 bg-white/20 hover:bg-white/30 text-white focus:outline-none transition-colors">
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToast();

    return (
        <div className="fixed top-4 left-0 right-0 z-[9999] flex flex-col items-center gap-3 pointer-events-none px-4">
            {toasts.map(toast => (
                <div key={toast.id} className="pointer-events-auto w-full max-w-md animate-slide-down">
                    <Toast toast={toast} onDismiss={removeToast} />
                </div>
            ))}
        </div>
    );
};
