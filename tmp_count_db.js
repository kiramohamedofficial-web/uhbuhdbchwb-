const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://csipsaucwcuserhfrehn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaXBzYXVjd2N1c2VyaGZyZWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTQwMTgsImV4cCI6MjA3Njg3MDAxOH0.FJu12ARvbqG0ny0D9d1Jje3BxXQ-q33gjx7JSH26j1w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tables = [
    'profiles', 'units', 'lessons', 'grades', 'semesters', 
    'student_progress', 'video_activity', 'quiz_attempts', 
    'courses', 'course_videos', 'featured_courses', 
    'reels', 'stories', 'student_questions', 'device_sessions', 
    'platform_settings'
];

async function countRows() {
    console.log("Database Row Count Audit:");
    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`${table}: ERROR (${error.message})`);
        } else {
            console.log(`${table}: ${count} rows`);
        }
    }
}

countRows();
