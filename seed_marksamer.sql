-- ─────────────────────────────────────────────────────────────
-- SCRIPT: CREATE USER & SEED DATA (100% FOOLPROOF, NO CONFLICT ERRORS)
-- Paste and run this script in Supabase SQL Editor: https://supabase.com/dashboard
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- 1. Create account marksamer010@gmail.com if it does not exist (Password: 12345678)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'marksamer010@gmail.com') THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'marksamer010@gmail.com',
            crypt('ch222ch222', gen_salt('bf')), -- كلمة المرور الإفتراضية: 12345678
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Mark"}',
            NOW(),
            NOW()
        );
    END IF;

    -- 2. Fetch the target user_id
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'marksamer010@gmail.com';

    -- 3. Delete old entries for this user to avoid any ON CONFLICT errors
    DELETE FROM public.schedule_data 
    WHERE user_id = target_user_id 
       OR (user_id IS NULL AND id IN ('columns','template','week-2026-09-12','lt-teachers','lt-lectures','subjects'));

    -- 4. Insert Columns
    INSERT INTO public.schedule_data (id, user_id, data, updated_at)
    VALUES (
        'columns',
        target_user_id,
        '[
            {"key": "school", "label": "SCHOOL", "icon": "fa-school"},
            {"key": "center", "label": "CENTER", "icon": "fa-building-columns"},
            {"key": "online", "label": "ONLINE", "icon": "fa-laptop"}
        ]'::jsonb,
        NOW()
    );

    -- 5. Insert Weekly Template
    INSERT INTO public.schedule_data (id, user_id, data, updated_at)
    VALUES (
        'template',
        target_user_id,
        '{
            "Sat": {
                "school": [{"id": "sat-s1", "text": "English", "teacher": "Mr. Sameh", "time": "11-1", "color": "green", "pinned": true, "icon": "book"}],
                "center": [],
                "online": [{"id": "sat-o1", "text": "Arabic", "teacher": "Mr. Salah", "time": "10 AM", "color": "red", "pinned": true, "icon": "laptop"}]
            },
            "Sun": {
                "school": [],
                "center": [],
                "online": [
                    {"id": "sun-o1", "text": "English", "teacher": "Mr. Ahmen Tariq", "time": "", "color": "green", "pinned": true, "icon": "laptop"},
                    {"id": "sun-o2", "text": "History", "teacher": "Mr. Tolba", "time": "", "color": "red", "pinned": true, "icon": "laptop"}
                ]
            },
            "Mon": {
                "school": [{"id": "mon-s1", "text": "Arabic", "teacher": "Mr. Said", "time": "8-11", "color": "red", "pinned": true, "icon": "book"}],
                "center": [{"id": "mon-c1", "text": "History", "teacher": "Mr. Bassem", "time": "2-4:30", "color": "orange", "pinned": true, "icon": "building-columns"}],
                "online": []
            },
            "Tue": {
                "school": [{"id": "tue-s1", "text": "History", "teacher": "Mr. Bassem", "time": "8-11", "color": "orange", "pinned": true, "icon": "book"}],
                "center": [],
                "online": [{"id": "tue-o1", "text": "Arabic ( HW )", "teacher": "Mr. Salah", "time": "10 AM", "color": "red", "pinned": true, "icon": "laptop"}]
            },
            "Wed": {
                "school": [],
                "center": [],
                "online": [{"id": "wed-o1", "text": "English ( Skills / HW )", "teacher": "Mr. Ahmed Tariq", "time": "", "color": "green", "pinned": true, "icon": "laptop"}]
            },
            "Thu": {
                "school": [{"id": "thu-s1", "text": "Computer", "teacher": "Mrs. Mary", "time": "11-1", "color": "orange", "pinned": true, "icon": "laptop"}],
                "center": [{"id": "thu-c1", "text": "History", "teacher": "Mr. Bassem", "time": "2-4:30", "color": "orange", "pinned": true, "icon": "building-columns"}],
                "online": [{"id": "thu-o1", "text": "Computer", "teacher": "Mr. Mohamemd", "time": "6 PM", "color": "orange", "pinned": true, "icon": "laptop"}]
            },
            "Fri": {
                "school": [],
                "center": [],
                "online": []
            }
        }'::jsonb,
        NOW()
    );

    -- 6. Insert Current Week States
    INSERT INTO public.schedule_data (id, user_id, data, updated_at)
    VALUES (
        'week-2026-09-12',
        target_user_id,
        '{
            "items": {
                "sat-s1": true,
                "sat-o1": false,
                "sun-o1": false,
                "sun-o2": false,
                "mon-s1": true,
                "mon-c1": true,
                "tue-s1": false,
                "tue-o1": false,
                "wed-o1": false,
                "thu-s1": false,
                "thu-c1": false,
                "thu-o1": false
            },
            "goals": { "Sat": [], "Sun": [], "Mon": [], "Tue": [], "Wed": [], "Thu": [], "Fri": [] }
        }'::jsonb,
        NOW()
    );

    -- 7. Insert Teachers
    INSERT INTO public.schedule_data (id, user_id, data, updated_at)
    VALUES (
        'lt-teachers',
        target_user_id,
        '[
            {"id": "t1", "name": "ا. محمد صلاح", "subject": "عربي", "platform": "يستوك", "link": "", "time": "10:00", "days": ["Sat"], "emoji": "📚", "color": "#3b82f6"},
            {"id": "t2", "name": "ا. محمد طلبه", "subject": "تاريخ", "platform": "Smart accedmy", "link": "", "time": "00:00", "days": ["Sun"], "emoji": "📊", "color": "#22c55e"},
            {"id": "t3", "name": "ا. محمد عبدالمجيد", "subject": "برمجه", "platform": "Smart accedmy", "link": "", "time": "18:00", "days": ["Thu"], "emoji": "💻", "color": "#6366f1"},
            {"id": "t4", "name": "ا. احمد طارق", "subject": "انجليزي", "platform": "احمد طارق", "link": "", "time": "00:00", "days": ["Sun"], "emoji": "✏️", "color": "#06b6d4"}
        ]'::jsonb,
        NOW()
    );

    -- 8. Insert Lectures
    INSERT INTO public.schedule_data (id, user_id, data, updated_at)
    VALUES (
        'lt-lectures',
        target_user_id,
        '[
            {"id": "l1", "teacherId": "t1", "title": "محاضرة أسبوع 1", "weekNum": 1, "date": "2026-09-12", "watched": false, "link": "", "notes": ""},
            {"id": "l2", "teacherId": "t2", "title": "محاضرة أسبوع 2", "weekNum": 2, "date": "2026-09-13", "watched": false, "link": "", "notes": ""},
            {"id": "l3", "teacherId": "t2", "title": "محاضرة أسبوع 1", "weekNum": 1, "date": "2026-09-06", "watched": true, "link": "", "notes": ""},
            {"id": "l4", "teacherId": "t3", "title": "محاضرة أسبوع 2", "weekNum": 2, "date": "2026-09-10", "watched": false, "link": "", "notes": ""},
            {"id": "l5", "teacherId": "t3", "title": "محاضرة أسبوع 1", "weekNum": 1, "date": "2026-09-03", "watched": true, "link": "", "notes": ""},
            {"id": "l6", "teacherId": "t4", "title": "محاضرة أسبوع 1", "weekNum": 1, "date": "2026-09-13", "watched": false, "link": "", "notes": ""}
        ]'::jsonb,
        NOW()
    );

    -- 9. Insert Subjects
    INSERT INTO public.schedule_data (id, user_id, data, updated_at)
    VALUES (
        'subjects',
        target_user_id,
        '[
            {"id": "sub-1", "name": "عربي", "color": "red", "totalLessons": 20, "coveredLessons": 5},
            {"id": "sub-2", "name": "انجليزي", "color": "green", "totalLessons": 20, "coveredLessons": 4},
            {"id": "sub-3", "name": "تاريخ", "color": "amber", "totalLessons": 25, "coveredLessons": 8},
            {"id": "sub-4", "name": "برمجه", "color": "blue", "totalLessons": 15, "coveredLessons": 3}
        ]'::jsonb,
        NOW()
    );

    RAISE NOTICE '✅ تم إنشاء الحساب ومزامنة كافة البيانات بنجاح! كلمة المرور: 12345678 🎉';
END $$;
