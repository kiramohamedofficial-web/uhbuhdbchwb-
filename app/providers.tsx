'use client';

import React from 'react';
import { ToastProvider } from '../ToastContext';
import { SessionProvider } from '../hooks/useSession';
import { SubscriptionProvider } from '../hooks/useSubscription';
import { IconProvider } from '../IconContext';

import { AppearanceProvider } from '../AppContext';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AppearanceProvider>
            <ToastProvider>
                <SessionProvider>
                    <SubscriptionProvider>
                        <IconProvider>
                            {children}
                        </IconProvider>
                    </SubscriptionProvider>
                </SessionProvider>
            </ToastProvider>
        </AppearanceProvider>
    );
}
