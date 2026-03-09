import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { SecurityProvider } from '../components/common/SecurityProvider';


export const metadata: Metadata = {
    title: 'Gstudent - المنصة التعليمية الأولى لطلاب الإعدادي والثانوي',
    description: 'Gstudent منصة تعليمية متكاملة تقدم محتوى تعليمي احترافي لطلاب المرحلة الإعدادية والثانوية والجامعية.',
    icons: {
        icon: 'https://h.top4top.io/p_3583m5j8t0.png',
        apple: 'https://h.top4top.io/p_3583m5j8t0.png',
    },
    other: {
        'google-site-verification': '6RQeaMqec0z3vIKsUpHFJxCF3o-kaAxrI27MTayoNXY',
    },
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ar" dir="rtl">
            <head>
                <link rel="dns-prefetch" href="https://csipsaucwcuserhfrehn.supabase.co" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Tajawal:wght@400;500;700;800;900&display=swap"
                    rel="stylesheet"
                />
                <link
                    rel="stylesheet"
                    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
                />
            </head>
            <body className="noise">
                <Providers>
                    <SecurityProvider>
                        {children}
                    </SecurityProvider>
                </Providers>
            </body>
        </html>
    );
}
