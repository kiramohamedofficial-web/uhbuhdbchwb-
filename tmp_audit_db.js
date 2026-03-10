const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://csipsaucwcuserhfrehn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaXBzYXVjd2N1c2VyaGZyZWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTQwMTgsImV4cCI6MjA3Njg3MDAxOH0.FJu12ARvbqG0ny0D9d1Jje3BxXQ-q33gjx7JSH26j1w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tables = [
    'profiles', 'units', 'lessons', 'grades', 'semesters', 
    'student_progress', 'video_activity', 'quiz_attempts', 
    'courses', 'course_videos', 'featured_courses', 'books', 
    'reels', 'stories', 'student_questions', 'device_sessions', 
    'platform_settings'
];

async function auditTables() {
    console.log("Starting Full Database Audit...");
    for (const table of tables) {
        process.stdout.write(`Checking table ${table}... `);
        const { error } = await supabase.from(table).select('count').limit(1);
        if (error) {
            console.log("❌ FAILED:", error.message);
        } else {
            console.log("✅ OK");
        }
    }
}

auditTables();
