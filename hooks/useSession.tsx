'use client';

import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { User, Grade, ToastType } from '../types';
import {
    signIn,
    signUp,
    signOut,
    onAuthStateChange,
    getSession,
    updateUser,
    sendPasswordResetEmail,
    updateUserPassword,
    supabase,
    getGradeByIdSync,
    initData,
} from '../services/storageService';
import { registerAndRedeemCode } from '../services/subscriptionService';
import { useToast } from '../useToast';
import { useDeviceSessions, signOutWithDeviceRelease } from './useDeviceSessions';

type AuthView = 'welcome' | 'auth' | 'reset-password' | 'update-password';

interface SessionContextType {
    currentUser: User | null;
    isLoading: boolean;
    authError: string;
    clearAuthError: () => void;
    authView: AuthView;
    setAuthView: React.Dispatch<React.SetStateAction<AuthView>>;
    handleLogin: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
    handleRegister: (userData: any, codeToRegister: string | null) => Promise<{ success: boolean; error?: string }>;
    handleLogout: () => Promise<void>;
    handleSendPasswordReset: (email: string) => Promise<void>;
    handleUpdatePassword: (password: string) => Promise<void>;
    isPostRegistrationModalOpen: boolean;
    closePostRegistrationModal: () => void;
    refetchUser: (shouldRefetchCurriculum?: boolean) => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authError, setAuthError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [authView, setAuthView] = useState<AuthView>('welcome');
    const [isPostRegistrationModalOpen, setIsPostRegistrationModalOpen] = useState(false);
    const { addToast } = useToast();

    useDeviceSessions((msg) => {
        addToast(msg, ToastType.ERROR);
        handleLogout();
    });

    useEffect(() => {
        const { data: { subscription } } = onAuthStateChange(async (event, session) => {
            await initData();

            if (event === 'PASSWORD_RECOVERY') {
                setAuthView('update-password');
                addToast('مرحباً بك مجدداً. الرجاء إدخال كلمة المرور الجديدة.', ToastType.INFO);
                setIsLoading(false);
                return;
            }

            if (event === 'SIGNED_OUT') {
                setCurrentUser(null);
                setAuthView('welcome');
                setIsLoading(false);
            }

            if (session) {
                if (!currentUser || currentUser.id !== session.user.id) {
                    let profile: any = null;
                    let attempts = 0;
                    while (!profile && attempts < 5) {
                        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                        profile = profileData;
                        if (!profile) {
                            attempts++;
                            await new Promise(res => setTimeout(res, 500 * attempts));
                        }
                    }

                    if (profile) {
                        const gradeData = getGradeByIdSync(profile.grade_id);
                        const mergedUser: User = {
                            id: session.user.id,
                            name: profile.name,
                            email: session.user.email || profile.email,
                            phone: profile.phone,
                            guardianPhone: profile.guardian_phone,
                            grade: profile.grade_id,
                            track: profile.track,
                            role: profile.role,
                            subscriptionId: profile.subscription_id,
                            teacherId: profile.teacher_id,
                            imageUrl: profile.profile_image_url,
                            gradeData: gradeData,
                        };
                        setCurrentUser(mergedUser);
                    } else {
                        console.error("User is logged in but profile data is missing.");
                    }
                }
            } else {
                setCurrentUser(null);
            }
            setIsLoading(false);
        });

        (async () => {
            await initData();
            const session = await getSession();
            if (!session) {
                setIsLoading(false);
            }
        })();

        return () => {
            subscription?.unsubscribe();
        };
    }, [addToast, currentUser]);

    const refetchUserAndGradeData = useCallback(async (shouldRefetchCurriculum = false) => {
        await initData();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return;
        }

        if (shouldRefetchCurriculum) {
            await initData();
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (profile) {
            const gradeData = getGradeByIdSync(profile.grade_id);
            const mergedUser: User = {
                id: session.user.id,
                name: profile.name,
                email: session.user.email || profile.email,
                phone: profile.phone,
                guardianPhone: profile.guardian_phone,
                grade: profile.grade_id,
                track: profile.track,
                role: profile.role,
                subscriptionId: profile.subscription_id,
                teacherId: profile.teacher_id,
                imageUrl: profile.profile_image_url,
                gradeData: gradeData,
            };
            setCurrentUser(mergedUser);
        }
    }, []);

    useEffect(() => {
        if (!currentUser) return;

        const profileChannel = supabase
            .channel(`profile-update-${currentUser.id}`)
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${currentUser.id}`
            }, (payload) => {
                refetchUserAndGradeData(false);
            }).subscribe();

        const curriculumChannel = supabase
            .channel('curriculum-updates')
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'units'
            }, payload => {
                refetchUserAndGradeData(true);
            })
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'lessons'
            }, payload => {
                refetchUserAndGradeData(true);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(profileChannel);
            supabase.removeChannel(curriculumChannel);
        };
    }, [currentUser, refetchUserAndGradeData]);

    const closePostRegistrationModal = useCallback(() => {
        setIsPostRegistrationModalOpen(false);
    }, []);

    const handleLogin = useCallback(async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
        setAuthError('');
        try {
            const { data, error } = await signIn(identifier, password);

            if (error) {
                let msg = error.message;
                if (msg.includes('Invalid login credentials')) msg = 'رقم الهاتف أو كلمة المرور غير صحيحة.';
                setAuthError(msg);
                return { success: false, error: msg };
            }

            if (data.user) {
                await refetchUserAndGradeData(true);
            }

            return { success: true };
        } catch (err) {
            return { success: false, error: 'Unknown error' };
        }
    }, [refetchUserAndGradeData]);

    const handleRegister = useCallback(async (userData: any, codeToRegister: string | null): Promise<{ success: boolean; error?: string }> => {
        setAuthError('');

        try {
            const postSignUpUpdate = async (userId: string) => {
                let profileExists = false;
                for (let i = 0; i < 8; i++) {
                    const { data } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
                    if (data) {
                        profileExists = true;
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, 800));
                }

                if (!profileExists) {
                    console.warn("Profile not found after sign up (Trigger slow/failed). Attempting update anyway.");
                }

                const { error: updateError } = await updateUser(userId, {
                    name: userData.name,
                    phone: userData.phone,
                    guardianPhone: userData.guardianPhone,
                    grade: userData.grade,
                    track: userData.track,
                });

                if (updateError) {
                    console.error("Post-registration update failed:", updateError.message);
                    addToast('تم إنشاء الحساب، ولكن قد تحتاج إلى تحديث بياناتك (مثل الصف الدراسي) يدويًا من ملفك الشخصي.', ToastType.WARNING);
                } else {
                    await refetchUserAndGradeData(false);
                }
            };

            if (codeToRegister) {
                const { data, error } = await registerAndRedeemCode(userData, codeToRegister);
                if (error && !data?.userId) {
                    setAuthError(error);
                    return { success: false, error };
                } else if (data?.userId) {
                    await postSignUpUpdate(data.userId);
                    if (error) {
                        setAuthError(error);
                        return { success: true };
                    } else {
                        addToast(`مرحباً بك ${userData.name}! تم إنشاء حسابك وتفعيل اشتراكك.`, ToastType.SUCCESS);
                        setIsPostRegistrationModalOpen(true);
                        return { success: true };
                    }
                }
            } else {
                const { data, error } = await signUp(userData);
                if (error) {
                    let msg = error.message;
                    if (msg.includes('User already registered') || msg.includes('unique constraint')) {
                        msg = 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.';
                    }
                    setAuthError(msg);
                    return { success: false, error: msg };
                } else if (data.user) {
                    await postSignUpUpdate(data.user.id);
                    addToast(`تم إنشاء حسابك بنجاح! مرحباً بك.`, ToastType.SUCCESS);
                    setIsPostRegistrationModalOpen(true);
                    return { success: true };
                }
            }
            return { success: false, error: 'Unknown registration error' };
        } catch (e) {
            return { success: false, error: 'Failed to process registration' };
        }
    }, [addToast, refetchUserAndGradeData]);

    const handleLogout = useCallback(async (): Promise<void> => {
        setIsLoading(true);
        const userId = currentUser?.id;

        // Immediate UI feedback
        setCurrentUser(null);
        setAuthView('welcome');

        try {
            if (userId) {
                // Attempt to clean up session in DB but don't block the UI if it's slow/fails
                signOutWithDeviceRelease(userId).catch(err => {
                    console.warn("signOutWithDeviceRelease failed:", err);
                    supabase.auth.signOut();
                });
            } else {
                await signOut();
            }
        } catch (err) {
            console.error("Logout process error, force local cleanup:", err);
            await supabase.auth.signOut();
        } finally {
            // Thorough local cleanup
            localStorage.removeItem('device_session_id');
            // Clear any Supabase specific storage items if possible
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('auth-token') || key.includes('supabase.auth'))) {
                    localStorage.removeItem(key);
                }
            }

            setIsLoading(false);
            addToast('تم تسجيل خروجك بنجاح.', ToastType.INFO);
        }
    }, [addToast, currentUser]);

    const handleSendPasswordReset = useCallback(async (email: string): Promise<void> => {
        setAuthError('');
        const { error } = await sendPasswordResetEmail(email);
        if (error) {
            setAuthError(error.message);
            addToast('حدث خطأ أثناء إرسال الرابط. تأكد من البريد الإلكتروني.', ToastType.ERROR);
        } else {
            addToast('إذا كان الحساب موجودًا، فسيتم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني.', ToastType.SUCCESS);
            setAuthView('auth');
        }
    }, [addToast]);

    const handleUpdatePassword = useCallback(async (password: string): Promise<void> => {
        setAuthError('');
        const { error } = await updateUserPassword(password);
        if (error) {
            setAuthError(error.message);
            addToast('فشل تحديث كلمة المرور. قد يكون الرابط منتهي الصلاحية أو كلمة المرور ضعيفة.', ToastType.ERROR);
        } else {
            addToast('تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.', ToastType.SUCCESS);
            await handleLogout();
        }
    }, [addToast, handleLogout]);

    const clearAuthError = () => setAuthError('');

    const value = {
        currentUser,
        isLoading,
        authError,
        clearAuthError,
        authView,
        setAuthView,
        handleLogin,
        handleRegister,
        handleLogout,
        handleSendPasswordReset,
        handleUpdatePassword,
        isPostRegistrationModalOpen,
        closePostRegistrationModal,
        refetchUser: refetchUserAndGradeData,
    };

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
    const context = useContext(SessionContext);
    if (context === undefined) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
};
