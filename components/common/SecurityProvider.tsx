'use client';

import React from 'react';

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Screen protection has been completely disabled per user request
    return (
        <div className="relative min-h-screen">
            {children}
        </div>
    );
};
