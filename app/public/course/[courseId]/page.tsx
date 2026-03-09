'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import PublicCourseView from '../../../../components/public/PublicCourseView';

export default function PublicCoursePage() {
    const params = useParams();
    const courseId = (params?.courseId as string) || '';

    return <PublicCourseView courseId={courseId} />;
}
