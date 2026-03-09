
import { useEffect, useCallback } from 'react';
import { supabase } from '../services/storageService';
import { useToast } from '../useToast';
import { useSubscription } from './useSubscription';
import { useSession } from './useSession';
import { ToastType } from '../types';
import { markNotificationRead } from '../services/notificationService';

export const useRealtimeNotifications = () => {
    const { addToast } = useToast();
    const { addNotification, checkUnseenMovieReplies } = useSubscription();
    const { currentUser } = useSession();

    // Helper to send browser notification
    const sendBrowserNotification = (title: string, body: string, icon?: string) => {
        if (!("Notification" in window)) return;
        if (Notification.permission === "granted") {
            try {
                new Notification(title, {
                    body,
                    icon: icon || 'https://j.top4top.io/p_3584uziv73.png',
                    dir: 'rtl',
                });
            } catch (e) {
                console.error("Browser notification failed", e);
            }
        }
    };

    useEffect(() => {
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

        const channel = supabase
            .channel('global-app-alerts')
            // 1. مراقبة الدروس الجديدة
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'lessons' },
                (payload) => {
                    const newLesson = payload.new;
                    // Only notify if published
                    if (newLesson.published_at) {
                        const title = `📚 درس جديد: ${newLesson.title}`;
                        addToast(title, ToastType.INFO);
                        addNotification({
                            id: `lesson-${newLesson.id}`,
                            text: title,
                            type: 'info',
                            createdAt: new Date().toISOString(),
                            link: 'grades'
                        });
                        sendBrowserNotification(title, 'تمت إضافة محتوى تعليمي جديد، تفقده الآن!');
                    }
                }
            )
            // 2. مراقبة الأفلام الجديدة
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'cartoon_movies' },
                (payload) => {
                    const newMovie = payload.new;
                    if (newMovie.is_published) {
                        const typeLabel = newMovie.type === 'movie' ? 'فيلم' : 'مسلسل';
                        const title = `🎬 ${typeLabel} جديد: ${newMovie.title}`;
                        addToast(title, ToastType.SUCCESS);
                        addNotification({
                            id: `movie-${newMovie.id}`,
                            text: title,
                            type: 'success',
                            createdAt: new Date().toISOString(),
                            link: 'cartoonMovies'
                        });
                        sendBrowserNotification(title, `تمت إضافة ${typeLabel} جديد في قسم الكرتون!`, newMovie.poster_url);
                    }
                }
            )
            // 3. مراقبة الحلقات الجديدة للمسلسلات
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'cartoon_episodes' },
                async (payload) => {
                    const newEp = payload.new;
                    const { data: movie } = await supabase.from('cartoon_movies').select('title').eq('id', newEp.movie_id).single();
                    const title = `📺 حلقة جديدة: ${movie?.title || ''}`;
                    const subText = `تمت إضافة الحلقة رقم ${newEp.episode_number}`;

                    addToast(`${title} - ${subText}`, ToastType.INFO);
                    addNotification({
                        id: `ep-${newEp.id}`,
                        text: `${title} (${subText})`,
                        type: 'info',
                        createdAt: new Date().toISOString(),
                        link: 'cartoonMovies'
                    });
                    sendBrowserNotification(title, subText, newEp.thumbnail_url);
                }
            )
            // 4. مراقبة طلبات الاشتراك الجديدة (للإدارة والمشرفين فقط)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'subscription_requests_temp' },
                (payload) => {
                    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'supervisor')) {
                        const msg = `🔔 طلب اشتراك جديد من: ${payload.new.user_name}`;
                        addToast(msg, ToastType.WARNING);
                        sendBrowserNotification('طلب اشتراك جديد', `قام ${payload.new.user_name} بطلب تفعيل باقة.`);
                    }
                }
            )
            // 5. مراقبة طلبات الأفلام الجديدة (للإدارة فقط)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'movie_requests' },
                (payload) => {
                    if (currentUser && currentUser.role === 'admin') {
                        const msg = `🎬 طلب فيلم جديد من: ${payload.new.student_name}`;
                        addToast(msg, ToastType.INFO);
                    }
                }
            )
            .subscribe();

        // 6. مراقبة الردود على طلبات الأفلام (خاصة بالمستخدم الطالب)
        let replyChannel: any = null;
        if (currentUser && currentUser.role === 'student') {
            replyChannel = supabase
                .channel(`movie-replies-student-${currentUser.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'movie_requests',
                        filter: `user_id=eq.${currentUser.id}`
                    },
                    (payload) => {
                        const updatedReq = payload.new;
                        if (updatedReq.status === 'done') {
                            addToast(`🔔 تم الرد على طلبك: ${updatedReq.movie_name}`, ToastType.SUCCESS);
                            addNotification({
                                id: `req-reply-${updatedReq.id}`,
                                text: `الإدارة ردت على طلبك بخصوص: ${updatedReq.movie_name}`,
                                type: 'success',
                                createdAt: new Date().toISOString(),
                                link: 'cartoonMovies'
                            });
                            checkUnseenMovieReplies();
                        }
                    }
                )
                .subscribe();
        }

        // 7. ✅ مراقبة رسائل البث الجديدة من المدير (broadcast_messages)
        const broadcastChannel = supabase
            .channel('admin-broadcasts')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'broadcast_messages' },
                (payload) => {
                    const msg = payload.new;
                    if (!msg.is_active) return;

                    const toastType: Record<string, ToastType> = {
                        info: ToastType.INFO,
                        warning: ToastType.WARNING,
                        success: ToastType.SUCCESS,
                        error: ToastType.ERROR,
                        urgent: ToastType.ERROR,
                    };

                    addToast(`📢 ${msg.title}: ${msg.body}`, toastType[msg.severity] || ToastType.INFO);
                    addNotification({
                        id: `broadcast-${msg.id}`,
                        text: `${msg.title} — ${msg.body}`,
                        type: msg.severity === 'urgent' ? 'error' : (msg.severity || 'info'),
                        createdAt: new Date().toISOString(),
                        link: msg.link || undefined,
                    });
                    sendBrowserNotification(
                        `📢 ${msg.title}`,
                        msg.body,
                        msg.image_url
                    );
                }
            )
            .subscribe();

        // 8. ✅ مراقبة الإشعارات الشخصية (user_notifications)
        let personalNotifChannel: any = null;
        if (currentUser) {
            personalNotifChannel = supabase
                .channel(`personal-notifs-${currentUser.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'user_notifications',
                        filter: `user_id=eq.${currentUser.id}`,
                    },
                    async (payload) => {
                        // جلب تفاصيل الرسالة
                        const { data: msg } = await supabase
                            .from('broadcast_messages')
                            .select('title, body, severity, link')
                            .eq('id', payload.new.message_id)
                            .single();

                        if (msg) {
                            const toastTypeMap: Record<string, ToastType> = {
                                info: ToastType.INFO, warning: ToastType.WARNING,
                                success: ToastType.SUCCESS, error: ToastType.ERROR, urgent: ToastType.ERROR,
                            };
                            addToast(`🔔 ${msg.title}`, toastTypeMap[msg.severity] || ToastType.INFO);
                            addNotification({
                                id: `notif-${payload.new.id}`,
                                text: `${msg.title}: ${msg.body}`,
                                type: msg.severity || 'info',
                                createdAt: new Date().toISOString(),
                                link: msg.link || undefined,
                            });
                            sendBrowserNotification(`🔔 ${msg.title}`, msg.body);
                        }
                    }
                )
                .subscribe();
        }

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(broadcastChannel);
            if (replyChannel) supabase.removeChannel(replyChannel);
            if (personalNotifChannel) supabase.removeChannel(personalNotifChannel);
        };
    }, [addToast, addNotification, currentUser, checkUnseenMovieReplies]);
};
