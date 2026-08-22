# LifeTrack Production Database Management & Seeding Guide

This guide covers:
1. Accessing and managing the MySQL Database inside the Docker container on the GCP VM.
2. Promoting users to `ADMIN` role.
3. Seeding rich 7-day demo data matching the exact Spring Boot JPA schema.
4. Exporting and restoring database backups.

---

## 1. How to Open the Interactive MySQL Shell on the VM

Connect to your GCP VM terminal (via local CMD `ssh lifetrack` or GCP browser SSH), then run:

```bash
cd /opt/lifetrack
docker compose exec db mysql -u root -p"$(grep MYSQL_ROOT_PASSWORD .env | cut -d= -f2)" lifestyle_ai
```

*(This automatically reads your generated root password from `.env` and drops you directly into the `lifestyle_ai` database prompt).*

---

## 2. Common Quick Queries & Admin Management

### Check All Tables:
```sql
SHOW TABLES;
```

### List Registered Users:
```sql
SELECT id, email, full_name, role, created_at FROM users;
```

### Promote a User to `ADMIN` Role:
```sql
UPDATE users SET role = 'ADMIN' WHERE id = 4;
```
*(Replace `4` with the target user's ID. Note: Spring Security requires the uppercase string `'ADMIN'` or `'USER'`).*

### Check Record Counts Across All Tables:
```sql
SELECT 'daily_logs' AS table_name, COUNT(*) AS total_records FROM daily_logs
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'journal_entries', COUNT(*) FROM journal_entries
UNION ALL
SELECT 'user_habits', COUNT(*) FROM user_habits
UNION ALL
SELECT 'daily_habit_completions', COUNT(*) FROM daily_habit_completions
UNION ALL
SELECT 'user_settings', COUNT(*) FROM user_settings;
```

### Exit the MySQL Prompt:
```sql
EXIT;
```

---

## 3. How to Seed 7-Day Demo Data for Any User

Hibernate generates table columns based on the Java entity field names (e.g. `date`, `name`, `text`, `productivity_level`, `sleep_target_hours`).

To seed **7 days of continuous, realistic data** (Logs, Habits, Completions, Expenses, Journals, Settings) for a specific user:

1. Open MySQL shell using the command in Section 1.
2. Set `@target_user_id` to your user ID (e.g., `4`) and run the full block below:

```sql
USE lifestyle_ai;

-- ── Set Target User & Reference Date ───────────────────────────────────────
SET @target_user_id = 4;        -- CHANGE THIS TO YOUR TARGET USER ID
SET @demo_end_date = CURDATE();

-- 1. Insert/Update User Settings
INSERT INTO user_settings (
    user_id, monthly_budget, sleep_target_hours, step_target, water_target_ml,
    insight_period_days, min_paired_days, low_sleep_threshold, high_stress_threshold
)
VALUES (
    @target_user_id, 25000.0, 8.0, 10000, 3000.0, 7, 3, 6.0, 7
)
ON DUPLICATE KEY UPDATE
    monthly_budget = 25000.0,
    sleep_target_hours = 8.0,
    step_target = 10000,
    water_target_ml = 3000.0;

-- 2. Insert User Habits
INSERT INTO user_habits (user_id, name, active, created_at)
SELECT @target_user_id, 'Morning Workout', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM user_habits WHERE user_id = @target_user_id AND name = 'Morning Workout');

INSERT INTO user_habits (user_id, name, active, created_at)
SELECT @target_user_id, 'Read 20 Pages', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM user_habits WHERE user_id = @target_user_id AND name = 'Read 20 Pages');

INSERT INTO user_habits (user_id, name, active, created_at)
SELECT @target_user_id, 'Drink 3L Water', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM user_habits WHERE user_id = @target_user_id AND name = 'Drink 3L Water');

-- 3. Insert 7 Continuous Days of Daily Logs
INSERT INTO daily_logs (
    user_id, date, sleep_hours, sleep_quality, step_target, water_intake,
    stress_level, energy_level, productivity_level, day_type,
    morning_mood, afternoon_mood, evening_mood, meals, created_at, updated_at
)
VALUES
(@target_user_id, DATE_SUB(@demo_end_date, INTERVAL 6 DAY), 7.5, 8, 10000, 2.5, 3, 8, 8, 'WORKDAY', 'ENERGETIC', 'FOCUSED', 'CALM', '[{"mealName":"Breakfast","items":"Oatmeal & Berries"},{"mealName":"Lunch","items":"Quinoa Salad & Chicken"},{"mealName":"Dinner","items":"Grilled Fish & Vegetables"}]', NOW(), NOW()),
(@target_user_id, DATE_SUB(@demo_end_date, INTERVAL 5 DAY), 6.5, 6, 10000, 2.0, 6, 6, 5, 'WORKDAY', 'NEUTRAL', 'DISTRACTED', 'TIRED', '[{"mealName":"Breakfast","items":"Eggs & Toast"},{"mealName":"Lunch","items":"Rice & Curry"},{"mealName":"Dinner","items":"Soup & Salad"}]', NOW(), NOW()),
(@target_user_id, DATE_SUB(@demo_end_date, INTERVAL 4 DAY), 8.0, 9, 10000, 3.0, 2, 9, 9, 'WORKDAY', 'GREAT', 'PRODUCTIVE', 'HAPPY', '[{"mealName":"Breakfast","items":"Protein Smoothie"},{"mealName":"Lunch","items":"Chicken Wrap"},{"mealName":"Dinner","items":"Paneer Tikka"}]', NOW(), NOW()),
(@target_user_id, DATE_SUB(@demo_end_date, INTERVAL 3 DAY), 7.0, 7, 10000, 2.2, 4, 7, 7, 'WORKDAY', 'GOOD', 'NORMAL', 'RELAXED', '[{"mealName":"Breakfast","items":"Fruit Bowl"},{"mealName":"Lunch","items":"Dal Rice & Veggies"},{"mealName":"Dinner","items":"Sandwich"}]', NOW(), NOW()),
(@target_user_id, DATE_SUB(@demo_end_date, INTERVAL 2 DAY), 5.5, 4, 10000, 1.8, 8, 4, 4, 'WORKDAY', 'TIRED', 'STRESSED', 'DRAINED', '[{"mealName":"Breakfast","items":"Coffee & Croissant"},{"mealName":"Lunch","items":"Fast Food"},{"mealName":"Dinner","items":"Pasta"}]', NOW(), NOW()),
(@target_user_id, DATE_SUB(@demo_end_date, INTERVAL 1 DAY), 8.5, 9, 10000, 2.8, 1, 8, 8, 'WEEKEND', 'RESTED', 'CREATIVE', 'PEACEFUL', '[{"mealName":"Breakfast","items":"Pancakes & Juice"},{"mealName":"Lunch","items":"Biryani"},{"mealName":"Dinner","items":"Light Salad"}]', NOW(), NOW()),
(@target_user_id, @demo_end_date,                           7.5, 8, 10000, 2.5, 3, 8, 9, 'WORKDAY', 'ENERGETIC', 'FOCUSED', 'CONTENT', '[{"mealName":"Breakfast","items":"Oats & Almonds"},{"mealName":"Lunch","items":"Grilled Tofu & Brown Rice"},{"mealName":"Dinner","items":"Soup"}]', NOW(), NOW())
ON DUPLICATE KEY UPDATE
    sleep_hours = VALUES(sleep_hours),
    sleep_quality = VALUES(sleep_quality),
    step_target = VALUES(step_target),
    water_intake = VALUES(water_intake),
    stress_level = VALUES(stress_level),
    energy_level = VALUES(energy_level),
    productivity_level = VALUES(productivity_level),
    day_type = VALUES(day_type),
    morning_mood = VALUES(morning_mood),
    afternoon_mood = VALUES(afternoon_mood),
    evening_mood = VALUES(evening_mood),
    meals = VALUES(meals),
    updated_at = NOW();

-- 4. Insert Daily Habit Completions
INSERT INTO daily_habit_completions (habit_id, user_id, date, completed, created_at)
SELECT h.id, @target_user_id, DATE_SUB(@demo_end_date, INTERVAL d.offset DAY), true, NOW()
FROM user_habits h
CROSS JOIN (
    SELECT 0 AS offset UNION ALL SELECT 1 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 6
) d
WHERE h.user_id = @target_user_id
ON DUPLICATE KEY UPDATE completed = true;

-- 5. Insert Expenses
INSERT INTO expenses (user_id, amount, category, date, created_at)
VALUES
(@target_user_id, 450.00, 'Food', DATE_SUB(@demo_end_date, INTERVAL 6 DAY), NOW()),
(@target_user_id, 150.00, 'Travel', DATE_SUB(@demo_end_date, INTERVAL 5 DAY), NOW()),
(@target_user_id, 1200.00, 'Housing', DATE_SUB(@demo_end_date, INTERVAL 4 DAY), NOW()),
(@target_user_id, 320.00, 'Food', DATE_SUB(@demo_end_date, INTERVAL 3 DAY), NOW()),
(@target_user_id, 600.00, 'Wellness', DATE_SUB(@demo_end_date, INTERVAL 1 DAY), NOW()),
(@target_user_id, 280.00, 'Food', @demo_end_date, NOW());

-- 6. Insert Journal Entries
INSERT INTO journal_entries (user_id, mood, text, date, created_at)
VALUES
(@target_user_id, 'calm', 'Had a great start to the day. The morning workout was intense and set a positive tone for everything.', DATE_SUB(@demo_end_date, INTERVAL 6 DAY), NOW()),
(@target_user_id, 'grateful', 'Deep work session went smoothly. Made significant progress on our core project deliverables.', DATE_SUB(@demo_end_date, INTERVAL 4 DAY), NOW()),
(@target_user_id, 'happy', 'Spent quality time outdoors and rested well. Feeling recharged and ready for the week ahead.', DATE_SUB(@demo_end_date, INTERVAL 1 DAY), NOW());
```

---

## 4. Backups and Disaster Recovery

### Create a Database Backup Immediately:
From the VM shell (outside MySQL):
```bash
cd /opt/lifetrack
bash deploy/scripts/backup-db.sh
```
*(Creates a timestamped `.sql.gz` file in `/opt/lifetrack/backups/`).*

### Restore a Database Backup:
```bash
cd /opt/lifetrack
bash deploy/scripts/restore-db.sh backups/lifestyle_ai-YYYYMMDD-HHMMSS.sql.gz
```
