import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://csipsaucwcuserhfrehn.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'gstudentplatform@gmail.com';
const SENDER_NAME = process.env.SENDER_NAME || 'Gstudent';

function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
    try {
        const { email, name } = await req.json();

        if (!email || !name) {
            return NextResponse.json(
                { error: 'البريد الإلكتروني والاسم مطلوبان' },
                { status: 400 }
            );
        }

        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        // محاولة إرسال عبر Supabase Edge Function أولاً
        if (SUPABASE_URL && SUPABASE_ANON_KEY) {
            try {
                const edgeResponse = await fetch(
                    `${SUPABASE_URL}/functions/v1/send-verification-email`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email, name }),
                    }
                );

                if (edgeResponse.ok) {
                    const data = await edgeResponse.json();
                    return NextResponse.json(data, { status: 200 });
                }
            } catch (edgeError) {
                console.warn('Edge Function unavailable, falling back to direct Brevo:', edgeError);
            }
        }

        // Fallback: الإرسال المباشر عبر Brevo من Next.js API
        if (!BREVO_API_KEY) {
            // إذا لم يكن هناك Brevo Key، نرجع الكود فقط (وضع التطوير)
            console.warn('BREVO_API_KEY not set - returning code for development only');
            return NextResponse.json({ success: true, code, expiresAt, devMode: true });
        }

        const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                sender: { name: SENDER_NAME, email: SENDER_EMAIL },
                to: [{ email, name }],
                subject: 'كود التحقق الخاص بك - Gstudent',
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; background-color: #f9f9f9; padding: 20px;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 30px;">
                            <h1 style="color: #6366F1; text-align:center;">Gstudent</h1>
                            <h2>مرحباً ${name}،</h2>
                            <p>كود التحقق الخاص بك هو:</p>
                            <div style="text-align:center; margin: 24px 0;">
                                <span style="background: linear-gradient(135deg,#6366F1,#8B5CF6); color:#fff; padding: 16px 32px; font-size: 32px; font-weight: 900; letter-spacing: 8px; border-radius: 12px; font-family: monospace;">
                                    ${code}
                                </span>
                            </div>
                            <p style="color:#92400E; background:#FEF3C7; padding:12px; border-radius:8px;">⏰ الكود صالح لمدة 10 دقائق فقط</p>
                        </div>
                    </div>
                `,
            }),
        });

        if (!brevoResponse.ok) {
            const err = await brevoResponse.json();
            return NextResponse.json({ error: 'فشل إرسال البريد', details: err }, { status: 500 });
        }

        return NextResponse.json({ success: true, code, expiresAt });

    } catch (error) {
        console.error('API Route Error:', error);
        return NextResponse.json({ error: 'حدث خطأ داخلي' }, { status: 500 });
    }
}
