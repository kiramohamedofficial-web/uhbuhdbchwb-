// Supabase Edge Function: send-verification-email
// إرسال كود التحقق بالإيميل للمستخدم
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') || '';
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'gstudentplatform@gmail.com';
const SENDER_NAME = Deno.env.get('SENDER_NAME') || 'Gstudent';

// ✅ توليد كود تحقق مكوّن من 6 أرقام
function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req: Request) => {
    // CORS Headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Content-Type': 'application/json',
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
    }

    try {
        const { email, name } = await req.json();

        if (!email || !name) {
            return new Response(
                JSON.stringify({ error: 'البريد الإلكتروني والاسم مطلوبان' }),
                { status: 400, headers }
            );
        }

        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 دقائق

        // إرسال الإيميل عبر Brevo
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
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 30px; box-shadow: 0 4px 15px rgba(99,102,241,0.15);">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #6366F1; margin: 0; font-size: 28px;">Gstudent</h1>
                <p style="color: #64748b; font-size: 14px; margin-top: 4px;">منصة التعليم الأولى</p>
              </div>
              <h2 style="color: #0F172A; font-size: 20px;">مرحباً ${name}،</h2>
              <p style="font-size: 16px; color: #374151; line-height: 1.7;">
                شكراً لتسجيلك في منصة Gstudent. لإكمال التحقق من بريدك الإلكتروني، يرجى استخدام الكود أدناه:
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <div style="background: linear-gradient(135deg, #6366F1, #8B5CF6); border-radius: 12px; padding: 24px; display: inline-block;">
                  <span style="color: #ffffff; font-size: 36px; font-weight: 900; letter-spacing: 10px; font-family: monospace;">
                    ${code}
                  </span>
                </div>
              </div>
              <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 12px 16px; margin: 20px 0;">
                <p style="margin: 0; color: #92400E; font-size: 14px;">⏰ هذا الكود صالح لمدة <strong>10 دقائق</strong> فقط.</p>
              </div>
              <hr style="border: 0; border-top: 1px solid #E5E7EB; margin: 24px 0;">
              <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
                إذا لم تطلب هذا الكود، يمكنك تجاهل هذه الرسالة بأمان.
                <br>© ${new Date().getFullYear()} Gstudent. جميع الحقوق محفوظة.
              </p>
            </div>
          </div>
        `,
            }),
        });

        if (!brevoResponse.ok) {
            const errorData = await brevoResponse.json();
            console.error('Brevo API Error:', errorData);
            return new Response(
                JSON.stringify({ error: 'فشل إرسال البريد الإلكتروني', details: errorData }),
                { status: 500, headers }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                code,            // الكود يُعاد للـ client ليخزّنه مؤقتاً (أو يُخزَّن في DB)
                expiresAt,
                message: 'تم إرسال كود التحقق بنجاح',
            }),
            { status: 200, headers }
        );

    } catch (error) {
        console.error('Edge Function Error:', error);
        return new Response(
            JSON.stringify({ error: 'حدث خطأ داخلي', details: String(error) }),
            { status: 500, headers }
        );
    }
});
