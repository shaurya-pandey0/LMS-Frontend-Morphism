-- LifeTrack Phase 3 demo data
-- Seeds the latest seven calendar days for the two existing users with IDs 1 and 2.
--
-- Run from the MySQL client while connected as a user that can write to
-- lifestyle_ai:
--
--   SOURCE C:/Users/PC/Desktop/V2/New folder/lms-frontend-backend-springboot/backend/scripts/seed-demo-7-days.sql;
--
-- Notes:
--   * The script does not create or modify login credentials in `users`.
--   * Users 1 and 2 must already exist.
--   * Dates are relative to CURDATE(), so the seven-day analytics window is
--     useful whenever the script is run.
--   * The script is rerunnable. Daily logs/settings use their unique keys, and
--     expense/journal/habit inserts check for an identical row first.

USE lifestyle_ai;

SET @demo_user_1 = 1;
SET @demo_user_2 = 2;
SET @demo_end_date = CURDATE();

-- Preflight: this should return exactly two rows before continuing.
SELECT id, email, full_name, role
FROM users
WHERE id IN (@demo_user_1, @demo_user_2)
ORDER BY id;

DROP TEMPORARY TABLE IF EXISTS demo_days;
CREATE TEMPORARY TABLE demo_days (
    day_offset INT NOT NULL PRIMARY KEY,
    log_date DATE NOT NULL,
    user1_sleep DOUBLE NOT NULL,
    user1_water DOUBLE NOT NULL,
    user1_morning VARCHAR(40) NOT NULL,
    user1_afternoon VARCHAR(40) NOT NULL,
    user1_evening VARCHAR(40) NOT NULL,
    user1_sleep_quality INT NOT NULL,
    user1_stress INT NOT NULL,
    user1_energy INT NOT NULL,
    user1_productivity INT NOT NULL,
    user1_day_type VARCHAR(30) NOT NULL,
    user2_sleep DOUBLE NOT NULL,
    user2_water DOUBLE NOT NULL,
    user2_morning VARCHAR(40) NOT NULL,
    user2_afternoon VARCHAR(40) NOT NULL,
    user2_evening VARCHAR(40) NOT NULL,
    user2_sleep_quality INT NOT NULL,
    user2_stress INT NOT NULL,
    user2_energy INT NOT NULL,
    user2_productivity INT NOT NULL,
    user2_day_type VARCHAR(30) NOT NULL
);

INSERT INTO demo_days (
    day_offset,
    log_date,
    user1_sleep,
    user1_water,
    user1_morning,
    user1_afternoon,
    user1_evening,
    user1_sleep_quality,
    user1_stress,
    user1_energy,
    user1_productivity,
    user1_day_type,
    user2_sleep,
    user2_water,
    user2_morning,
    user2_afternoon,
    user2_evening,
    user2_sleep_quality,
    user2_stress,
    user2_energy,
    user2_productivity,
    user2_day_type
)
VALUES
    (6, DATE_SUB(@demo_end_date, INTERVAL 6 DAY), 6.2, 1650, 'okay',  'good',  'okay',  2, 4, 2, 3, 'STUDY_WORK', 7.8, 2300, 'great', 'good',  'good',  4, 2, 4, 4, 'STUDY_WORK'),
    (5, DATE_SUB(@demo_end_date, INTERVAL 5 DAY), 6.8, 1900, 'good',  'good',  'good',  3, 3, 3, 3, 'STUDY_WORK', 7.5, 2150, 'good',  'good',  'okay',  4, 2, 4, 3, 'STUDY_WORK'),
    (4, DATE_SUB(@demo_end_date, INTERVAL 4 DAY), 7.1, 2100, 'good',  'great', 'good',  4, 2, 4, 4, 'STUDY_WORK', 7.2, 2000, 'good',  'okay',  'good',  3, 3, 3, 4, 'STUDY_WORK'),
    (3, DATE_SUB(@demo_end_date, INTERVAL 3 DAY), 7.4, 2250, 'great', 'good',  'great', 4, 2, 4, 4, 'STUDY_WORK', 6.9, 1850, 'okay',  'good',  'okay',  3, 4, 2, 3, 'STUDY_WORK'),
    (2, DATE_SUB(@demo_end_date, INTERVAL 2 DAY), 7.8, 2500, 'great', 'great', 'good',  5, 1, 5, 5, 'DAY_OFF',    7.7, 2400, 'great', 'great', 'good',  5, 1, 5, 4, 'DAY_OFF'),
    (1, DATE_SUB(@demo_end_date, INTERVAL 1 DAY), 8.0, 2600, 'great', 'good',  'great', 5, 1, 4, 4, 'DAY_OFF',    8.1, 2550, 'great', 'good',  'great', 5, 1, 5, 5, 'DAY_OFF'),
    (0, @demo_end_date,                         7.6, 2400, 'good',  'great', 'good',  4, 2, 4, 4, 'STUDY_WORK', 7.4, 2250, 'good',  'great', 'good',  4, 2, 4, 4, 'STUDY_WORK');

START TRANSACTION;

-- ---------------------------------------------------------------------------
-- Per-user settings
-- Existing settings are preserved. Defaults below are inserted only if a user
-- does not already have a settings row.
-- ---------------------------------------------------------------------------

INSERT INTO user_settings (
    monthly_budget,
    sleep_target_hours,
    step_target,
    user_id,
    water_target_ml
)
SELECT
    CASE WHEN u.id = @demo_user_1 THEN 5000.00 ELSE 4000.00 END,
    CASE WHEN u.id = @demo_user_1 THEN 7.5 ELSE 8.0 END,
    CASE WHEN u.id = @demo_user_1 THEN 8000 ELSE 10000 END,
    u.id,
    CASE WHEN u.id = @demo_user_1 THEN 2500.00 ELSE 2000.00 END
FROM users u
WHERE u.id IN (@demo_user_1, @demo_user_2)
  AND NOT EXISTS (
      SELECT 1
      FROM user_settings existing
      WHERE existing.user_id = u.id
  );

-- ---------------------------------------------------------------------------
-- Seven daily logs per user
-- The (user_id, date) unique constraint makes this an idempotent upsert.
-- ---------------------------------------------------------------------------

INSERT INTO daily_logs (
    user_id,
    date,
    sleep_hours,
    step_target,
    water_intake,
    sleep_quality,
    stress_level,
    energy_level,
    productivity_level,
    day_type,
    morning_mood,
    afternoon_mood,
    evening_mood,
    meals,
    created_at,
    updated_at
)
SELECT
    u.id,
    d.log_date,
    CASE WHEN u.id = @demo_user_1 THEN d.user1_sleep ELSE d.user2_sleep END,
    CASE WHEN u.id = @demo_user_1 THEN 8000 ELSE 10000 END,
    CASE WHEN u.id = @demo_user_1 THEN d.user1_water ELSE d.user2_water END,
    CASE WHEN u.id = @demo_user_1 THEN d.user1_sleep_quality ELSE d.user2_sleep_quality END,
    CASE WHEN u.id = @demo_user_1 THEN d.user1_stress ELSE d.user2_stress END,
    CASE WHEN u.id = @demo_user_1 THEN d.user1_energy ELSE d.user2_energy END,
    CASE WHEN u.id = @demo_user_1 THEN d.user1_productivity ELSE d.user2_productivity END,
    CASE WHEN u.id = @demo_user_1 THEN d.user1_day_type ELSE d.user2_day_type END,
    CASE WHEN u.id = @demo_user_1 THEN d.user1_morning ELSE d.user2_morning END,
    CASE WHEN u.id = @demo_user_1 THEN d.user1_afternoon ELSE d.user2_afternoon END,
    CASE WHEN u.id = @demo_user_1 THEN d.user1_evening ELSE d.user2_evening END,
    CASE
        WHEN u.id = @demo_user_1
            THEN '[{"name":"Breakfast","items":["Oats","Banana"]},{"name":"Dinner","items":["Rice","Vegetables"]}]'
        ELSE '[{"name":"Breakfast","items":["Eggs","Toast"]},{"name":"Dinner","items":["Dal","Rice"]}]'
    END,
    CURRENT_TIMESTAMP(6),
    CURRENT_TIMESTAMP(6)
FROM users u
CROSS JOIN demo_days d
WHERE u.id IN (@demo_user_1, @demo_user_2)
ON DUPLICATE KEY UPDATE
    sleep_hours = VALUES(sleep_hours),
    step_target = VALUES(step_target),
    water_intake = VALUES(water_intake),
    sleep_quality = VALUES(sleep_quality),
    stress_level = VALUES(stress_level),
    energy_level = VALUES(energy_level),
    productivity_level = VALUES(productivity_level),
    day_type = VALUES(day_type),
    morning_mood = VALUES(morning_mood),
    afternoon_mood = VALUES(afternoon_mood),
    evening_mood = VALUES(evening_mood),
    meals = VALUES(meals),
    updated_at = CURRENT_TIMESTAMP(6);

-- ---------------------------------------------------------------------------
-- Habit collection tables
-- ---------------------------------------------------------------------------

INSERT INTO daily_log_transactional_habits (daily_log_id, habit)
SELECT dl.id, h.habit
FROM daily_logs dl
JOIN demo_days d ON d.log_date = dl.date
CROSS JOIN (
    SELECT 'Drink Water Before Coffee' AS habit, 0 AS conditional
    UNION ALL
    SELECT 'Journal Entry Written', 0
    UNION ALL
    SELECT 'Steps Goal Met', 1
) h
WHERE dl.user_id IN (@demo_user_1, @demo_user_2)
  AND (h.conditional = 0 OR MOD(d.day_offset + dl.user_id, 2) = 0)
  AND NOT EXISTS (
      SELECT 1
      FROM daily_log_transactional_habits existing
      WHERE existing.daily_log_id = dl.id
        AND existing.habit = h.habit
  );

INSERT INTO daily_log_embedded_habits (daily_log_id, habit)
SELECT dl.id, h.habit
FROM daily_logs dl
JOIN demo_days d ON d.log_date = dl.date
CROSS JOIN (
    SELECT 'Meditation (10 min)' AS habit, 0 AS conditional
    UNION ALL
    SELECT 'Evening Stretch', 1
    UNION ALL
    SELECT 'Steps Goal Met', 2
) h
WHERE dl.user_id IN (@demo_user_1, @demo_user_2)
  AND (
      h.conditional = 0
      OR (h.conditional = 1 AND MOD(d.day_offset, 2) = 0)
      OR (h.conditional = 2 AND MOD(d.day_offset + dl.user_id, 3) = 0)
  )
  AND NOT EXISTS (
      SELECT 1
      FROM daily_log_embedded_habits existing
      WHERE existing.daily_log_id = dl.id
        AND existing.habit = h.habit
  );

-- ---------------------------------------------------------------------------
-- Expense rows across the seven-day window
-- ---------------------------------------------------------------------------

DROP TEMPORARY TABLE IF EXISTS demo_expenses;
CREATE TEMPORARY TABLE demo_expenses (
    user_id BIGINT NOT NULL,
    day_offset INT NOT NULL,
    category VARCHAR(40) NOT NULL,
    amount DOUBLE NOT NULL
);

INSERT INTO demo_expenses (user_id, day_offset, category, amount)
VALUES
    (@demo_user_1, 6, 'Food',      28.50),
    (@demo_user_1, 5, 'Travel',    18.00),
    (@demo_user_1, 4, 'Food',      35.25),
    (@demo_user_1, 3, 'Wellness',  45.00),
    (@demo_user_1, 2, 'Housing',  120.00),
    (@demo_user_1, 1, 'Food',      22.75),
    (@demo_user_1, 0, 'Misc',      15.50),
    (@demo_user_1, 0, 'Food',      31.00),
    (@demo_user_2, 6, 'Housing',   95.00),
    (@demo_user_2, 5, 'Food',      24.00),
    (@demo_user_2, 4, 'Travel',    32.50),
    (@demo_user_2, 3, 'Food',      29.75),
    (@demo_user_2, 2, 'Wellness',  55.00),
    (@demo_user_2, 1, 'Misc',      19.25),
    (@demo_user_2, 0, 'Food',      27.50),
    (@demo_user_2, 0, 'Travel',    14.00);

INSERT INTO expenses (
    amount,
    category,
    created_at,
    date,
    user_id
)
SELECT
    seed.amount,
    seed.category,
    CURRENT_TIMESTAMP(6),
    DATE_SUB(@demo_end_date, INTERVAL seed.day_offset DAY),
    seed.user_id
FROM demo_expenses seed
JOIN users u ON u.id = seed.user_id
WHERE NOT EXISTS (
    SELECT 1
    FROM expenses existing
    WHERE existing.user_id = seed.user_id
      AND existing.date = DATE_SUB(@demo_end_date, INTERVAL seed.day_offset DAY)
      AND existing.category = seed.category
      AND existing.amount = seed.amount
);

-- ---------------------------------------------------------------------------
-- One journal entry per user per day
-- ---------------------------------------------------------------------------

DROP TEMPORARY TABLE IF EXISTS demo_journals;
CREATE TEMPORARY TABLE demo_journals (
    user_id BIGINT NOT NULL,
    day_offset INT NOT NULL,
    mood VARCHAR(40) NOT NULL,
    entry_text TEXT NOT NULL
);

INSERT INTO demo_journals (user_id, day_offset, mood, entry_text)
VALUES
    (@demo_user_1, 6, 'tired',    'Started the week slowly, but completed the important tasks.'),
    (@demo_user_1, 5, 'calm',     'A quiet day with steady progress and a short evening walk.'),
    (@demo_user_1, 4, 'happy',    'Felt energetic after sleeping better and staying hydrated.'),
    (@demo_user_1, 3, 'anxious',  'Work was busy, so I used meditation to reset my focus.'),
    (@demo_user_1, 2, 'grateful', 'Good food, supportive people, and consistent habits today.'),
    (@demo_user_1, 1, 'calm',     'Finished the day on schedule and stretched before sleeping.'),
    (@demo_user_1, 0, 'happy',    'The weekly routine feels balanced and sustainable.'),
    (@demo_user_2, 6, 'happy',    'A productive beginning with enough sleep and a clear plan.'),
    (@demo_user_2, 5, 'grateful', 'Appreciated the calm morning and time to prepare meals.'),
    (@demo_user_2, 4, 'calm',     'Kept expenses controlled and completed the planned habits.'),
    (@demo_user_2, 3, 'tired',    'Energy dipped in the afternoon, so I rested and hydrated.'),
    (@demo_user_2, 2, 'happy',    'Exercise and meditation made the day feel focused.'),
    (@demo_user_2, 1, 'grateful', 'A strong day with good sleep and meaningful progress.'),
    (@demo_user_2, 0, 'calm',     'Reviewed the week and prepared realistic goals for tomorrow.');

INSERT INTO journal_entries (
    created_at,
    date,
    mood,
    text,
    updated_at,
    user_id
)
SELECT
    CURRENT_TIMESTAMP(6),
    DATE_SUB(@demo_end_date, INTERVAL seed.day_offset DAY),
    seed.mood,
    seed.entry_text,
    CURRENT_TIMESTAMP(6),
    seed.user_id
FROM demo_journals seed
JOIN users u ON u.id = seed.user_id
WHERE NOT EXISTS (
    SELECT 1
    FROM journal_entries existing
    WHERE existing.user_id = seed.user_id
      AND existing.date = DATE_SUB(@demo_end_date, INTERVAL seed.day_offset DAY)
      AND existing.mood = seed.mood
      AND existing.text = seed.entry_text
);

COMMIT;

-- ---------------------------------------------------------------------------
-- Verification summary
-- Expected minimums after a successful run:
--   daily logs: 7 per user in the current seven-day window
--   journals:   7 demo entries per user in the current seven-day window
--   expenses:   at least 8 demo rows per user in the current seven-day window
-- ---------------------------------------------------------------------------

SELECT user_id, COUNT(*) AS daily_log_count
FROM daily_logs
WHERE user_id IN (@demo_user_1, @demo_user_2)
  AND date BETWEEN DATE_SUB(@demo_end_date, INTERVAL 6 DAY) AND @demo_end_date
GROUP BY user_id
ORDER BY user_id;

SELECT user_id, COUNT(*) AS expense_count, ROUND(SUM(amount), 2) AS total_spend
FROM expenses
WHERE user_id IN (@demo_user_1, @demo_user_2)
  AND date BETWEEN DATE_SUB(@demo_end_date, INTERVAL 6 DAY) AND @demo_end_date
GROUP BY user_id
ORDER BY user_id;

SELECT user_id, COUNT(*) AS journal_count
FROM journal_entries
WHERE user_id IN (@demo_user_1, @demo_user_2)
  AND date BETWEEN DATE_SUB(@demo_end_date, INTERVAL 6 DAY) AND @demo_end_date
GROUP BY user_id
ORDER BY user_id;

SELECT user_id, monthly_budget, sleep_target_hours, step_target, water_target_ml
FROM user_settings
WHERE user_id IN (@demo_user_1, @demo_user_2)
ORDER BY user_id;

DROP TEMPORARY TABLE IF EXISTS demo_journals;
DROP TEMPORARY TABLE IF EXISTS demo_expenses;
DROP TEMPORARY TABLE IF EXISTS demo_days;
