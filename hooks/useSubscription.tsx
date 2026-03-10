'use client';

import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { supabase } from '../services/storageService';
import { getSubscriptionsByUserId, getUserSubscriptionRequests } from '../services/subscriptionService';
import { Subscription, AppNotification, ToastType, SubscriptionRequest } from '../types';
import { useSession } from './useSession';
import { useToast } from '../useToast';

interface SubscriptionContextType {
    subscriptions: Subscription[];
    subscription: Subscription | null;
    isLoading: boolean;
    refetchSubscription: () => void;
    notifications: AppNotification[];
    addNotification: (notification: AppNotification) => void;
    activeSubscriptions: Subscription[];
    isComprehensive: boolean;
    hasPendingRequest: boolean;
    pendingRequests: SubscriptionRequest[];
    hasUnseenMovieReplies: boolean; // New state
    checkUnseenMovieReplies: () => Promise<void>; // New action
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useSession();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [pendingRequests, setPendingRequests] = useState<SubscriptionRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [subscriptionNotifications, setSubscriptionNotifications] = useState<AppNotification[]>([]);
    const [manualNotifications, setManualNotifications] = useState<AppNotification[]>([]);
    const [hasUnseenMovieReplies, setHasUnseenMovieReplies] = useState(false);

    const { addToast } = useToast();
    const [prevSubscriptions, setPrevSubscriptions] = useState<Subscription[]>([]);

    // Function to check for unseen movie replies
    const checkUnseenMovieReplies = useCallback(async () => {
        if (!currentUser) return;
        const { data } = await supabase
            .from('movie_requests')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('status', 'done');

        if (data) {
            // Check if any done request ID is NOT in local storage
            const hasUnseen = data.some(req => !localStorage.getItem(`seen_reply_${req.id}`));
            setHasUnseenMovieReplies(hasUnseen);
        }
    }, [currentUser]);

    const fetchSubscription = useCallback(async () => {
        if (currentUser) {
            setIsLoading(true);
            try {
                // Fetch Subscriptions
                const subsData = await getSubscriptionsByUserId(currentUser.id);
                const mappedSubs = subsData.map((sub: any) => ({
                    id: sub.id,
                    userId: sub.user_id,
                    plan: sub.plan,
                    startDate: sub.start_date,
                    endDate: sub.end_date,
                    status: sub.status,
                    teacherId: sub.teacher_id,
                }));
                setSubscriptions(mappedSubs);

                // Fetch Pending Requests
                const requests = await getUserSubscriptionRequests(currentUser.id);
                setPendingRequests(requests);

                // Check Movie Replies
                await checkUnseenMovieReplies();

            } catch (error) {
                console.error("Failed to fetch subscriptions:", error);
                setSubscriptions([]);
                setPendingRequests([]);
            } finally {
                setIsLoading(false);
            }
        } else {
            setSubscriptions([]);
            setPendingRequests([]);
            setIsLoading(false);
        }
    }, [currentUser, checkUnseenMovieReplies]);

    useEffect(() => {
        fetchSubscription();
    }, [fetchSubscription]);

    useEffect(() => {
        if (!currentUser) return;

        // Listen for changes in Subscriptions
        const subscriptionChannel = supabase
            .channel(`user-subscriptions-${currentUser.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'subscriptions',
                filter: `user_id=eq.${currentUser.id}`
            }, payload => {
                addToast('تم تحديث حالة اشتراكك!', ToastType.INFO);
                fetchSubscription();
            })
            .subscribe();

        // Listen for changes in Requests (e.g. if Admin rejects/approves)
        const requestChannel = supabase
            .channel(`user-requests-${currentUser.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'subscription_requests_temp',
                filter: `user_id=eq.${currentUser.id}`
            }, payload => {
                fetchSubscription();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscriptionChannel);
            supabase.removeChannel(requestChannel);
        };
    }, [currentUser, fetchSubscription, addToast]);

    useEffect(() => {
        const newSubNotifications: AppNotification[] = [];
        const now = new Date();

        if (subscriptions.length === 0) {
            newSubNotifications.push({
                id: 'welcome-notify',
                text: 'أهلاً بك في Gstudent! استكشف الباقات المتاحة وابدأ رحلة التفوق.',
                type: 'info',
                createdAt: new Date().toISOString(),
                link: 'subscription'
            });
        }

        subscriptions.forEach(sub => {
            const prevSub = prevSubscriptions.find(p => p.id === sub.id);
            const wasActive = prevSub?.status === 'Active';
            const isActive = sub.status === 'Active';
            const isRecentStart = new Date(sub.startDate).toDateString() === now.toDateString();

            if (isActive && (!prevSub || !wasActive) && isRecentStart) {
                newSubNotifications.push({
                    id: `sub-active-${sub.id}`,
                    text: `تم تفعيل اشتراكك (الباقة ${sub.plan === 'Monthly' ? 'الشهرية' : 'السنوية'}) بنجاح! استمتع بالتعلم.`,
                    type: 'success',
                    createdAt: new Date().toISOString(),
                    link: 'grades'
                });
            }

            if (isActive) {
                const endDate = new Date(sub.endDate);
                const diffTime = endDate.getTime() - now.getTime();
                const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (daysRemaining <= 5 && daysRemaining >= 0) {
                    let remainingText: string;
                    if (daysRemaining === 0) {
                        remainingText = 'اشتراكك ينتهي اليوم! جدده الآن للاستمرار في الوصول للمحتوى.';
                    } else {
                        const dayWord = daysRemaining === 1 ? 'يوم واحد' : daysRemaining === 2 ? 'يومان' : `${daysRemaining} أيام`;
                        remainingText = `⚠️ تنبيه: اشتراكك الحالي سينتهي بعد ${dayWord}. لا تنسَ التجديد لضمان استمرار الوصول إلى محتواك!`;
                    }

                    newSubNotifications.push({
                        id: `sub-expire-${sub.id}`,
                        text: remainingText,
                        type: 'warning',
                        createdAt: new Date().toISOString(),
                        link: 'subscription'
                    });
                }
            }
        });

        if (JSON.stringify(subscriptions) !== JSON.stringify(prevSubscriptions)) {
            setPrevSubscriptions(subscriptions);
        }

        setSubscriptionNotifications(newSubNotifications.reverse());

    }, [subscriptions]);

    const addNotification = useCallback((notification: AppNotification) => {
        setManualNotifications(prev => [notification, ...prev]);
    }, []);

    // STRICT FILTERING: Only return subscriptions that are 'Active' AND not expired
    const activeSubscriptions = useMemo(() => {
        const now = new Date();
        return subscriptions.filter(s => {
            if (s.status !== 'Active') return false;

            // Be generous with expiry: Expire at the END of the end date day
            const expiry = new Date(s.endDate);
            expiry.setHours(23, 59, 59, 999);

            return expiry >= now;
        });
    }, [subscriptions]);

    const isComprehensive = useMemo(() => {
        return activeSubscriptions.some(s => !s.teacherId);
    }, [activeSubscriptions]);

    const primarySubscription = useMemo(() => {
        if (subscriptions.length === 0) return null;
        // Prioritize active ones for the main "subscription" object
        if (activeSubscriptions.length > 0) {
            const comprehensive = activeSubscriptions.find(s => !s.teacherId);
            return comprehensive || activeSubscriptions[0];
        }
        return null;
    }, [subscriptions, activeSubscriptions]);

    const hasPendingRequest = useMemo(() => pendingRequests.length > 0, [pendingRequests]);

    const notifications = useMemo(() => {
        return [...manualNotifications, ...subscriptionNotifications].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [manualNotifications, subscriptionNotifications]);

    const value = useMemo(() => ({
        subscriptions,
        subscription: primarySubscription,
        isLoading,
        refetchSubscription: fetchSubscription,
        notifications,
        addNotification,
        activeSubscriptions,
        isComprehensive,
        hasPendingRequest,
        pendingRequests,
        hasUnseenMovieReplies,
        checkUnseenMovieReplies
    }), [
        subscriptions,
        primarySubscription,
        isLoading,
        fetchSubscription,
        notifications,
        addNotification,
        activeSubscriptions,
        isComprehensive,
        hasPendingRequest,
        pendingRequests,
        hasUnseenMovieReplies,
        checkUnseenMovieReplies
    ]);

    return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};
