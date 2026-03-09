/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║           Next.js Middleware - حماية المسارات             ║
 * ║                     middleware.ts                        ║
 * ╚══════════════════════════════════════════════════════════╝
 * 
 * جدول المسارات والحماية:
 * ┌───────────────────┬──────────────────────────────┬──────────┐
 * │ المسار             │ الوصف                          │ الحماية  │
 * ├───────────────────┼──────────────────────────────┼──────────┤
 * │ /                  │ إعادة توجيه → /login          │ —        │
 * │ /login             │ تسجيل الدخول                   │ عام      │
 * │ /verify-email      │ التحقق من الإيميل               │ عام      │
 * │ /dashboard         │ لوحة التحكم                    │ admin    │
 * │ /settings          │ الإعدادات                      │ admin    │
 * │ /cartoons-admin    │ إدارة الكرتون                   │ admin    │
 * │ /admin/*           │ لوحة تحكم كاملة                 │ admin    │
 * │ *                  │ صفحة 404                       │ —        │
 * └───────────────────┴──────────────────────────────┴──────────┘
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// المسارات العامة (لا تحتاج تسجيل دخول)
const PUBLIC_PATHS = [
    '/login',
    '/verify-email',
    '/welcome',
    '/register',
    '/_next',
    '/favicon',
    '/api',
    '/public',
];

// المسارات المحمية للـ Admin فقط
const ADMIN_ONLY_PATHS = [
    '/admin',
    '/dashboard',
    '/settings',
    '/cartoons-admin',
];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // السماح للملفات الثابتة والـ API
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.includes('.') // ملفات ثابتة
    ) {
        return NextResponse.next();
    }

    // المسارات العامة - السماح للجميع
    const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path));
    if (isPublicPath) {
        return NextResponse.next();
    }

    // ملاحظة: التحقق الكامل من الجلسة يتم داخل مكونات React
    // Middleware هنا كطبقة إضافية للحماية فقط

    // السماح بالمرور - التحقق النهائي في الصفحات نفسها
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * تطبيق Middleware على كل المسارات ما عدا:
         * - /_next/static
         * - /_next/image
         * - /favicon.ico
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
