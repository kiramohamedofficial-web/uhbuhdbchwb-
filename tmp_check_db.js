const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://csipsaucwcuserhfrehn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaXBzYXVjd2N1c2VyaGZyZWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTQwMTgsImV4cCI6MjA3Njg3MDAxOH0.FJu12ARvbqG0ny0D9d1Jje3BxXQ-q33gjx7JSH26j1w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabase() {
    console.log("Testing grades...");
    const { data: grades, error: gError } = await supabase.from('grades').select('*').limit(1);
    console.log("Grades:", gError ? gError.message : "OK");

    console.log("Testing semesters...");
    const { data: sem, error: sError } = await supabase.from('semesters').select('*').limit(1);
    console.log("Semesters:", sError ? sError.message : "OK");

    console.log("Testing units...");
    const { data: units, error: uError } = await supabase.from('units').select('*').limit(1);
    console.log("Units:", uError ? uError.message : "OK");

    console.log("Testing lessons...");
    const { data: lessons, error: lError } = await supabase.from('lessons').select('*').limit(1);
    console.log("Lessons:", lError ? lError.message : "OK");
}

testDatabase();
