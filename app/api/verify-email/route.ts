import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://csipsaucwcuserhfrehn.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, code, storedCode, expiresAt } = body;

        if (!email || !code) {
            return NextResponse.json(
                { error: 'البريد الإلكتروني والكود مطلوبان' },
                { status: 400 }
            );
        }

        // ✅ التحقق المحلي (بدون DB) إذا توفر الكود المخزّن
        if (storedCode && expiresAt) {
            const now = new Date();
            const expiry = new Date(expiresAt);

            if (now > expiry) {
                return NextResponse.json({
                    success: false,
                    error: 'انتهت صلاحية الكود. يرجى طلب كود جديد.',
                });
            }

            if (code.trim() !== storedCode.trim()) {
                return NextResponse.json({
                    success: false,
                    error: 'الكود غير صحيح. يرجى التأكد والمحاولة مرة أخرى.',
                });
            }

            return NextResponse.json({
                success: true,
                message: 'تم التحقق من البريد الإلكتروني بنجاح!',
            });
        }

        // ✅ التحقق عبر Edge Function
        if (SUPABASE_URL && SUPABASE_ANON_KEY) {
            try {
                const edgeResponse = await fetch(
                    `${SUPABASE_URL}/functions/v1/verify-email-code`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email, code }),
                    }
                );

                if (edgeResponse.ok) {
                    const data = await edgeResponse.json();
                    return NextResponse.json(data, { status: 200 });
                }
            } catch (edgeError) {
                console.warn('Edge Function unavailable:', edgeError);
            }
        }

        return NextResponse.json({
            success: false,
            error: 'خدمة التحقق غير متاحة حالياً. يرجى المحاولة لاحقاً.',
        });

    } catch (error) {
        console.error('Verify Email API Error:', error);
        return NextResponse.json({ error: 'حدث خطأ داخلي' }, { status: 500 });
    }
}
