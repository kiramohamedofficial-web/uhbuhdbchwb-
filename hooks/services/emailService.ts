
const BREVO_API_KEY = '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';
const SENDER_EMAIL = 'gstudentplatform@gmail.com';
const SENDER_NAME = 'Gstudent';

export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendVerificationEmail = async (toEmail: string, toName: string, code: string): Promise<boolean> => {
  const url = 'https://api.brevo.com/v3/smtp/email';
  
  const data = {
    sender: {
      name: SENDER_NAME,
      email: SENDER_EMAIL
    },
    to: [
      {
        email: toEmail,
        name: toName
      }
    ],
    subject: "كود التحقق الخاص بك - Gstudent",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; background-color: #f9f9f9; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
          <h2 style="color: #6366F1; text-align: center;">مرحباً بك في Gstudent</h2>
          <p style="font-size: 16px; color: #333;">أهلاً ${toName}،</p>
          <p style="font-size: 16px; color: #333;">شكراً لتسجيلك معنا. لإكمال عملية إنشاء الحساب، يرجى استخدام كود التحقق التالي:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="background-color: #F3F4F6; color: #333; padding: 15px 30px; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 8px; border: 1px solid #E5E7EB;">
              ${code}
            </span>
          </div>
          <p style="font-size: 14px; color: #666;">هذا الكود صالح لمدة 10 دقائق.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">إذا لم تطلب هذا الكود، يمكنك تجاهل هذه الرسالة.</p>
        </div>
      </div>
    `
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Brevo API Error:', errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Network Error Sending Email:', error);
    return false;
  }
};

export const sendSubscriptionActivationEmail = async (toEmail: string, toName: string, planName: string, endDate: string): Promise<boolean> => {
  const url = 'https://api.brevo.com/v3/smtp/email';
  
  const data = {
    sender: {
      name: SENDER_NAME,
      email: SENDER_EMAIL
    },
    to: [
      {
        email: toEmail,
        name: toName
      }
    ],
    subject: "تم تفعيل اشتراكك بنجاح - Gstudent",
    htmlContent: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; text-align: right; background-color: #f3f4f6; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          <div style="background-color: #6366F1; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Gstudent</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #111827; font-size: 20px; margin-top: 0;">مرحباً ${toName}،</h2>
            <p style="color: #4B5563; font-size: 16px; line-height: 1.6;">يسعدنا إخبارك بأنه تم تفعيل اشتراكك بنجاح في منصة Gstudent.</p>
            
            <div style="background-color: #EEF2FF; border-radius: 12px; padding: 20px; margin: 25px 0;">
              <p style="margin: 0 0 10px 0; color: #4338ca; font-weight: bold;">تفاصيل الاشتراك:</p>
              <ul style="list-style: none; padding: 0; margin: 0; color: #374151;">
                <li style="padding: 5px 0;">📦 الباقة: <strong>${planName}</strong></li>
                <li style="padding: 5px 0;">📅 تاريخ الانتهاء: <strong>${endDate}</strong></li>
                <li style="padding: 5px 0;">✅ الحالة: <strong>نشط</strong></li>
              </ul>
            </div>

            <p style="color: #4B5563; font-size: 16px;">يمكنك الآن الدخول إلى المنصة والاستمتاع بكافة المحتويات التعليمية المتاحة لك.</p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://gstudent.app" style="background-color: #6366F1; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">الذهاب للمنصة</a>
            </div>
          </div>
          <div style="background-color: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
            <p style="color: #9CA3AF; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Gstudent. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </div>
    `
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Brevo API Error:', errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Network Error Sending Email:', error);
    return false;
  }
};