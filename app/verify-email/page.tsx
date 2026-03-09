'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ErrorBoundary from '../../components/common/ErrorBoundary';

// ✅ صفحة التحقق من البريد الإلكتروني
export default function VerifyEmailPage() {
    const router = useRouter();
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [email, setEmail] = useState('');
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        // جلب الإيميل من الحالة المحفوظة
        const savedEmail = sessionStorage.getItem('verification_email') || localStorage.getItem('pending_verification_email') || '';
        setEmail(savedEmail);
        if (!savedEmail) {
            router.replace('/login');
        }
    }, [router]);

    // ✅ مؤقت Cooldown لإعادة الإرسال
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleInputChange = (index: number, value: string) => {
        if (!/^[0-9]*$/.test(value)) return;
        const newCode = [...code];
        newCode[index] = value.slice(-1);
        setCode(newCode);
        setError('');

        // الانتقال للحقل التالي
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // تحقق تلقائي عند اكتمال الكود
        if (newCode.every(c => c !== '') && newCode.join('').length === 6) {
            setTimeout(() => handleVerify(newCode.join('')), 100);
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setCode(pasted.split(''));
            setTimeout(() => handleVerify(pasted), 100);
        }
    };

    const handleVerify = useCallback(async (fullCode?: string) => {
        const codeToVerify = fullCode || code.join('');
        if (codeToVerify.length !== 6) {
            setError('يرجى إدخال الكود المكوّن من 6 أرقام كاملاً');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const storedCode = sessionStorage.getItem('verification_code');
            const expiresAt = sessionStorage.getItem('verification_expires_at');

            const response = await fetch('/api/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    code: codeToVerify,
                    storedCode,
                    expiresAt,
                }),
            });

            const result = await response.json();

            if (result.success) {
                setSuccess(true);
                sessionStorage.removeItem('verification_code');
                sessionStorage.removeItem('verification_expires_at');
                sessionStorage.removeItem('verification_email');
                localStorage.removeItem('pending_verification_email');

                setTimeout(() => router.replace('/login'), 2500);
            } else {
                setError(result.error || 'الكود غير صحيح أو منتهي الصلاحية');
                setCode(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            }
        } catch (err) {
            setError('حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.');
        } finally {
            setIsLoading(false);
        }
    }, [code, email, router]);

    const handleResend = async () => {
        if (resendCooldown > 0 || !email) return;
        setIsLoading(true);
        setError('');

        try {
            const name = localStorage.getItem('pending_verification_name') || 'مستخدم';
            const response = await fetch('/api/send-verification-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name }),
            });

            const result = await response.json();
            if (result.success) {
                sessionStorage.setItem('verification_code', result.code);
                sessionStorage.setItem('verification_expires_at', result.expiresAt);
                setResendCooldown(60);
                setCode(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            } else {
                setError('فشل إرسال الكود. يرجى المحاولة لاحقاً.');
            }
        } catch {
            setError('حدث خطأ في الاتصال.');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="text-center p-8 rounded-2xl bg-[var(--bg-secondary)] shadow-2xl max-w-md w-full mx-4">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">تم التحقق بنجاح! 🎉</h2>
                    <p className="text-[var(--text-secondary)]">جاري تحويلك لصفحة تسجيل الدخول...</p>
                </div>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4" dir="rtl">
                <div className="w-full max-w-md">
                    <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-white/10 p-8">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">التحقق من البريد الإلكتروني</h1>
                            <p className="text-[var(--text-secondary)] text-sm">
                                تم إرسال كود التحقق إلى
                                <br />
                                <span className="text-indigo-400 font-medium">{email}</span>
                            </p>
                        </div>

                        {/* Code Input */}
                        <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
                            {code.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={el => { inputRefs.current[index] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    title={`رقم التحقق ${index + 1}`}
                                    aria-label={`الرقم ${index + 1} من كود التحقق`}
                                    placeholder="•"
                                    onChange={e => handleInputChange(index, e.target.value)}
                                    onKeyDown={e => handleKeyDown(index, e)}
                                    disabled={isLoading}
                                    className={`
                                        w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-200
                                        bg-[var(--bg-primary)] text-[var(--text-primary)]
                                        ${digit ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-white/20'}
                                        ${error ? 'border-red-500' : ''}
                                        focus:outline-none focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-500/20
                                        disabled:opacity-50
                                    `}
                                />
                            ))}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 text-center">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Verify Button */}
                        <button
                            onClick={() => handleVerify()}
                            disabled={isLoading || code.join('').length !== 6}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />جاري التحقق...</>
                            ) : 'تحقق من الكود'}
                        </button>

                        {/* Resend */}
                        <div className="text-center mt-4">
                            <p className="text-[var(--text-secondary)] text-sm mb-2">لم تستلم الكود؟</p>
                            <button
                                onClick={handleResend}
                                disabled={resendCooldown > 0 || isLoading}
                                className="text-indigo-400 hover:text-indigo-300 disabled:text-gray-500 disabled:cursor-not-allowed font-medium text-sm transition-colors"
                            >
                                {resendCooldown > 0 ? `إعادة الإرسال بعد ${resendCooldown}s` : 'إعادة إرسال الكود'}
                            </button>
                        </div>

                        {/* Back */}
                        <div className="text-center mt-4">
                            <button
                                onClick={() => router.replace('/login')}
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors"
                            >
                                ← العودة لتسجيل الدخول
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
}
