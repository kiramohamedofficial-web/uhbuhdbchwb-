
import React, { useState, useEffect, useMemo } from 'react';
import {
    getPlatformSettings,
    getAllGrades,
    getAllStudentProgress,
    getAllQuizAttempts
} from '../../services/storageService';
import { getAllTeachers } from '../../services/teacherService';
import { getAllSubscriptions } from '../../services/subscriptionService';
import { Teacher, Subscription, Grade, PlatformSettings, QuizAttempt, Lesson } from '../../types';
import Loader from '../common/Loader';
import { ChartBarIcon, UsersIcon, VideoCameraIcon, BookOpenIcon, PencilIcon } from '../common/Icons';
import { TableWrapper, Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '../common/Table';

interface TeacherPerformance extends Teacher {
    studentCount: number;
    totalInteractions: number;
}

const FinancialReportsView: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [monthlyRevenue, setMonthlyRevenue] = useState<Record<string, number>>({});
    const [teacherPerformance, setTeacherPerformance] = useState<TeacherPerformance[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const [subs, settings, teachers, grades, progress, attempts] = await Promise.all([
                getAllSubscriptions(),
                getPlatformSettings(),
                getAllTeachers(),
                getAllGrades(),
                getAllStudentProgress(),
                getAllQuizAttempts()
            ]);

            // Calculate monthly revenue
            if (settings) {
                const prices: Record<string, number> = {
                    Monthly: settings.monthlyPrice,
                    Quarterly: settings.quarterlyPrice,
                    SemiAnnually: settings.semiAnnuallyPrice,
                    Annual: settings.annualPrice
                };
                const revenue: Record<string, number> = {};
                subs.forEach(sub => {
                    const date = new Date(sub.startDate);
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    const price = prices[sub.plan] || 0;
                    if (!revenue[monthKey]) revenue[monthKey] = 0;
                    revenue[monthKey] += price;
                });
                setMonthlyRevenue(revenue);
            }

            // Calculate teacher performance
            const lessonsByTeacher = new Map<string, string[]>();
            grades.flatMap(g => g.semesters.flatMap(s => s.units.flatMap(u => (u.lessons || []).map(l => ({ ...l, teacherId: u.teacherId })))))
                .forEach(lesson => {
                    if (!lessonsByTeacher.has(lesson.teacherId)) lessonsByTeacher.set(lesson.teacherId, []);
                    lessonsByTeacher.get(lesson.teacherId)!.push(lesson.id);
                });

            const performanceData = teachers.map(teacher => {
                const teacherSubs = subs.filter(s => s.teacherId === teacher.id);
                const studentCount = new Set(teacherSubs.map(s => s.userId)).size;

                const teacherLessonIds = new Set(lessonsByTeacher.get(teacher.id) || []);
                const progressCount = progress.filter(p => teacherLessonIds.has(p.lesson_id)).length;
                const attemptCount = attempts.filter(a => teacherLessonIds.has(a.lessonId)).length;
                const totalInteractions = progressCount + attemptCount;

                return {
                    ...teacher,
                    studentCount,
                    totalInteractions,
                };
            });

            performanceData.sort((a, b) => b.studentCount - a.studentCount || b.totalInteractions - a.totalInteractions);
            setTeacherPerformance(performanceData);

            setIsLoading(false);
        };

        fetchData();
    }, []);

    const sortedMonths = useMemo(() => Object.keys(monthlyRevenue).sort().reverse(), [monthlyRevenue]);
    const totalRevenue = useMemo(() => Object.values(monthlyRevenue).reduce((sum: number, rev: number) => sum + rev, 0), [monthlyRevenue]);


    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader /></div>;
    }

    return (
        <div className="fade-in space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">التقارير المالية والأداء</h1>
                <p className="text-[var(--text-secondary)] mt-1">نظرة شاملة على إيرادات المنصة وأداء المدرسين.</p>
            </div>

            <div className="bg-[var(--bg-secondary)] p-6 rounded-xl shadow-lg border border-[var(--border-primary)]">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-3">
                    <ChartBarIcon className="w-6 h-6 text-purple-400" />
                    تقرير الإيرادات الشهري
                </h2>
                <TableWrapper>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>الشهر</TableHead>
                                <TableHead>الإيرادات المحققة</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedMonths.map(monthKey => (
                                <TableRow key={monthKey}>
                                    <TableCell className="font-medium">{new Date(monthKey + '-02').toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}</TableCell>
                                    <TableCell className="font-bold text-lg text-emerald-500">{monthlyRevenue[monthKey].toLocaleString()} ج.م</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell className="font-black text-lg text-[var(--text-primary)]">الإجمالي</TableCell>
                                <TableCell className="font-black text-xl text-emerald-400">{totalRevenue.toLocaleString()} ج.م</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </TableWrapper>
            </div>

            <div className="bg-[var(--bg-secondary)] p-6 rounded-xl shadow-lg border border-[var(--border-primary)]">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-3">
                    <UsersIcon className="w-6 h-6 text-purple-400" />
                    تقرير أداء المدرسين
                </h2>
                <TableWrapper>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>المدرس</TableHead>
                                <TableHead>المادة</TableHead>
                                <TableHead>عدد الطلاب</TableHead>
                                <TableHead>التفاعلات (حصص + اختبارات)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teacherPerformance.map(teacher => (
                                <TableRow key={teacher.id}>
                                    <TableCell className="font-medium flex items-center gap-3">
                                        <img src={teacher.imageUrl || 'https://via.placeholder.com/40'} alt={teacher.name} className="w-8 h-8 rounded-full object-cover border border-[var(--border-primary)]" />
                                        {teacher.name}
                                    </TableCell>
                                    <TableCell className="text-[var(--text-secondary)]">{teacher.subject}</TableCell>
                                    <TableCell className="font-bold text-blue-400">{teacher.studentCount}</TableCell>
                                    <TableCell className="font-bold text-purple-400">{teacher.totalInteractions}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableWrapper>
            </div>
        </div>
    );
};

export default FinancialReportsView;
