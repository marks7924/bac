-- ─────────────────────────────────────────────────────────────
-- AUTOMATIC TRIGGER FOR marksamer010@gmail.com (EXACT REAL DATA & URLS)
-- Run this script ONCE in Supabase SQL Editor: https://supabase.com/dashboard
-- ─────────────────────────────────────────────────────────────

-- 1. Reset old incomplete user entries so user can register cleanly from UI
DELETE FROM auth.users WHERE email = 'marksamer010@gmail.com';

-- 2. Create Trigger function that automatically populates all data on Sign Up
CREATE OR REPLACE FUNCTION public.seed_marksamer_data()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'marksamer010@gmail.com' THEN
    -- Delete any old schedule_data
    DELETE FROM public.schedule_data WHERE user_id = NEW.id;

    -- Columns
    INSERT INTO public.schedule_data (id, user_id, data, updated_at)
    VALUES ('columns', NEW.id, '[{"key": "school", "label": "SCHOOL", "icon": "fa-school"}, {"key": "center", "label": "CENTER", "icon": "fa-building-columns"}, {"key": "online", "label": "ONLINE", "icon": "fa-laptop"}]'::jsonb, NOW());

    -- Template
    INSERT INTO public.schedule_data (id, user_id, data, updated_at)
    VALUES ('template', NEW.id, '{
        "Sat": {"school": [{"id": "sat-s1", "text": "English", "teacher": "Mr. Sameh", "time": "11-1", "color": "green", "pinned": true, "icon": "book"}], "center": [], "online": [{"id": "sat-o1", "text": "Arabic", "teacher": "Mr. Salah", "time": "10 AM", "color": "red", "pinned": true, "icon": "laptop"}]},
        "Sun": {"school": [], "center": [], "online": [{"id": "sun-o1", "text": "English", "teacher": "Mr. Ahmen Tariq", "time": "", "color": "green", "pinned": true, "icon": "laptop"}, {"id": "sun-o2", "text": "History", "teacher": "Mr. Tolba", "time": "", "color": "red", "pinned": true, "icon": "laptop"}]},
        "Mon": {"school": [{"id": "mon-s1", "text": "Arabic", "teacher": "Mr. Said", "time": "8-11", "color": "red", "pinned": true, "icon": "book"}], "center": [{"id": "mon-c1", "text": "History", "teacher": "Mr. Bassem", "time": "2-4:30", "color": "orange", "pinned": true, "icon": "building-columns"}], "online": []},
        "Tue": {"school": [{"id": "tue-s1", "text": "History", "teacher": "Mr. Bassem", "time": "8-11", "color": "orange", "pinned": true, "icon": "book"}], "center": [], "online": [{"id": "tue-o1", "text": "Arabic ( HW )", "teacher": "Mr. Salah", "time": "10 AM", "color": "red", "pinned": true, "icon": "laptop"}]},
        "Wed": {"school": [], "center": [], "online": [{"id": "wed-o1", "text": "English ( Skills / HW )", "teacher": "Mr. Ahmed Tariq", "time": "", "color": "green", "pinned": true, "icon": "laptop"}]},
        "Thu": {"school": [{"id": "thu-s1", "text": "Computer", "teacher": "Mrs. Mary", "time": "11-1", "color": "orange", "pinned": true, "icon": "laptop"}], "center": [{"id": "thu-c1", "text": "History", "teacher": "Mr. Bassem", "time": "2-4:30", "color": "orange", "pinned": true, "icon": "building-columns"}], "online": [{"id": "thu-o1", "text": "Computer", "teacher": "Mr. Mohamemd", "time": "6 PM", "color": "orange", "pinned": true, "icon": "laptop"}]},
        "Fri": {"school": [], "center": [], "online": []}
    }'::jsonb, NOW());

    -- Week 2026-09-12
    INSERT INTO public.schedule_data (id, user_id, data, updated_at)
    VALUES ('week-2026-09-12', NEW.id, '{"items": {"sat-s1": true, "sat-o1": false, "sun-o1": false, "sun-o2": false, "mon-s1": true, "mon-c1": true, "tue-s1": false, "tue-o1": false, "wed-o1": false, "thu-s1": false, "thu-c1": false, "thu-o1": false}, "goals": {"Sat": [], "Sun": [], "Mon": [], "Tue": [], "Wed": [], "Thu": [], "Fri": []}}'::jsonb, NOW());

    -- Teachers (lt-teachers with exact IDs and URLs)
    INSERT INTO public.schedule_data (id, user_id, data, updated_at)
    VALUES ('lt-teachers', NEW.id, '[
        {"id": "xmu42m0ld9cr4", "name": "ا. محمد صلاح", "subject": "عربي", "platform": "بسطهالك", "link": "https://bassthalk.com/userprofile/courses/course/1731", "time": "10:00", "days": ["Sat"], "emoji": "📚", "color": "#3b82f6"},
        {"id": "xmu42p9ddigcu", "name": "ا. محمد طلبه", "subject": "تاريخ", "platform": "Smart accedmy", "link": "https://smartacademy-eg.com/packages-details/141", "time": "00:00", "days": ["Sun"], "emoji": "🧮", "color": "#22c55e"},
        {"id": "xmu42r5yo9dhu", "name": "ا. محمد عبالحميد", "subject": "برمجه", "platform": "Smart accedmy", "link": "https://smartacademy-eg.com/packages-details/144", "time": "18:00", "days": ["Thu"], "emoji": "📚", "color": "#3b82f6"},
        {"id": "xmu42u6qlglvj", "name": "ا. احمد طارق", "subject": "انجليزي", "platform": "احمد طارق", "link": "https://ahmed-tarek.net/userprofile/courses/course/12", "time": "00:00", "days": ["Sun"], "emoji": "✏️", "color": "#06b6d4"}
    ]'::jsonb, NOW());

    -- Lectures (lt-lectures with exact IDs and URLs)
    INSERT INTO public.schedule_data (id, user_id, data, updated_at)
    VALUES ('lt-lectures', NEW.id, '[
        {"id": "xmu42mxkd4rm9", "teacherId": "xmu42m0ld9cr4", "title": "محاضرة أسبوع 1", "weekNum": 1, "date": "2026-09-12", "watched": false, "link": "https://bassthalk.com/userprofile/courses/course/1731", "notes": ""},
        {"id": "xmu42pe2wftua", "teacherId": "xmu42p9ddigcu", "title": "محاضرة أسبوع 2", "weekNum": 2, "date": "2026-09-13", "watched": false, "link": "https://smartacademy-eg.com/packages-details/141", "notes": ""},
        {"id": "xmu42pbdow4y1", "teacherId": "xmu42p9ddigcu", "title": "محاضرة أسبوع 1", "weekNum": 1, "date": "2026-09-06", "watched": true, "link": "https://smartacademy-eg.com/packages-details/141", "notes": ""},
        {"id": "xmu42r9rsvtym", "teacherId": "xmu42r5yo9dhu", "title": "محاضرة أسبوع 2", "weekNum": 2, "date": "2026-09-10", "watched": false, "link": "https://smartacademy-eg.com/packages-details/144", "notes": ""},
        {"id": "xmu42r890k49h", "teacherId": "xmu42r5yo9dhu", "title": "محاضرة أسبوع 1", "weekNum": 1, "date": "2026-09-03", "watched": true, "link": "https://smartacademy-eg.com/packages-details/144", "notes": ""},
        {"id": "xmu42ud1g0n98", "teacherId": "xmu42u6qlglvj", "title": "محاضرة أسبوع 1", "weekNum": 1, "date": "2026-09-13", "watched": false, "link": "https://ahmed-tarek.net/userprofile/courses/course/12", "notes": ""}
    ]'::jsonb, NOW());

    -- Subjects
    INSERT INTO public.schedule_data (id, user_id, data, updated_at)
    VALUES ('subjects', NEW.id, '[{"id": "sub-1", "name": "عربي", "color": "red", "totalLessons": 20, "coveredLessons": 5}, {"id": "sub-2", "name": "انجليزي", "color": "green", "totalLessons": 20, "coveredLessons": 4}, {"id": "sub-3", "name": "تاريخ", "color": "amber", "totalLessons": 25, "coveredLessons": 8}, {"id": "sub-4", "name": "برمجه", "color": "blue", "totalLessons": 15, "coveredLessons": 3}]'::jsonb, NOW());

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Trigger
DROP TRIGGER IF EXISTS trigger_seed_marksamer ON auth.users;
CREATE TRIGGER trigger_seed_marksamer
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.seed_marksamer_data();
