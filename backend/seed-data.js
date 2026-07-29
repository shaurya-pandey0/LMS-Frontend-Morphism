// LifeTrack seed data — 3 demo users with daily logs, expenses, and journals.
//
// Run against a local MongoDB:
//   mongosh "mongodb://127.0.0.1:27017/lifetrack" seed-data.js
//
// All three users share the password:  Password123!
//   - alex@example.com   (USER)  healthy patterns  -> positive insights
//   - priya@example.com  (USER)  poor patterns     -> warning insights
//   - sam@example.com    (ADMIN) mixed patterns
//
// Safe to re-run: it only removes/re-creates these three users and their data,
// leaving any other documents untouched.

const dbx = db.getSiblingDB("lifetrack");

// Pre-computed BCrypt ($2a$10) hashes of "Password123!".
const PWD = {
  alex: "$2a$10$kfFu9g0K8P2yO30jPx5L0uAgR4m4mH0mF/nuxktC8G0IdVjlyT.s.",
  priya: "$2a$10$5dCUhXxYuXcHTH2pVYJEduA1q9J9TEbAl94MYWeen6CYcvPj2GDsO",
  sam: "$2a$10$wV/438sKbgF.cWCcYXsQZek.f.YQqIb16sk6yxtN9ncRI.h2.PSkK",
};

const EMAILS = ["alex@example.com", "priya@example.com", "sam@example.com"];

// ---- Clean up any previous run (scoped to these users only) ----------------
const previous = dbx.users.find({ email: { $in: EMAILS } }).toArray();
const oldIds = previous.map((u) => u._id.toHexString());
if (oldIds.length) {
  dbx.daily_logs.deleteMany({ userId: { $in: oldIds } });
  dbx.expenses.deleteMany({ userId: { $in: oldIds } });
  dbx.journal_entries.deleteMany({ userId: { $in: oldIds } });
  dbx.users.deleteMany({ email: { $in: EMAILS } });
}
// Remove any orphaned docs from an earlier broken run (userId never set).
dbx.daily_logs.deleteMany({ userId: { $in: [null, undefined] } });
dbx.expenses.deleteMany({ userId: { $in: [null, undefined] } });
dbx.journal_entries.deleteMany({ userId: { $in: [null, undefined] } });

// ---- Helpers ----------------------------------------------------------------
const NOW = new Date();

// Midnight (UTC) `n` days before today. Stored as a BSON Date, which Spring
// Data maps back to the entity's LocalDate field.
function dayOffset(n) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function meal(name, items) {
  return { name: name, items: items };
}

// ---- Users ------------------------------------------------------------------
const usersRes = dbx.users.insertMany([
  { fullName: "Alex Morgan", email: "alex@example.com", password: PWD.alex, role: "USER", createdAt: NOW },
  { fullName: "Priya Sharma", email: "priya@example.com", password: PWD.priya, role: "USER", createdAt: NOW },
  { fullName: "Sam Lee", email: "sam@example.com", password: PWD.sam, role: "ADMIN", createdAt: NOW },
]);

const alexId = usersRes.insertedIds[0].toHexString();
const priyaId = usersRes.insertedIds[1].toHexString();
const samId = usersRes.insertedIds[2].toHexString();

// ---- Per-user generators ----------------------------------------------------
const dailyLogs = [];
const expenses = [];
const journals = [];

// Alex: healthy, consistent — should surface positive insights.
const alexMoods = ["happy", "calm", "grateful", "good", "great", "happy", "calm"];
for (let i = 6; i >= 0; i--) {
  const date = dayOffset(i);
  dailyLogs.push({
    userId: alexId,
    date: date,
    sleepHours: 7.6 + (i % 3) * 0.2,
    stepTarget: 10000,
    waterIntake: 2400 + (i % 2) * 200,
    transactionalHabits: ["Meditation (10 min)", "Reading (20 min)"],
    embeddedHabits: ["Morning walk", "No screens after 10pm"],
    meals: [
      meal("Breakfast", ["Oatmeal", "Berries"]),
      meal("Lunch", ["Grilled chicken", "Quinoa salad"]),
      meal("Dinner", ["Salmon", "Steamed veggies"]),
    ],
    morningMood: alexMoods[i],
    afternoonMood: "calm",
    eveningMood: "grateful",
    createdAt: date,
    updatedAt: date,
  });
}
[
  ["Food", 18.5], ["Travel", 12.0], ["Wellness", 25.0], ["Food", 22.0],
  ["Misc", 9.5], ["Food", 16.0], ["Housing", 40.0],
].forEach((e, idx) => {
  expenses.push({ userId: alexId, date: dayOffset(idx), category: e[0], amount: e[1], createdAt: dayOffset(idx) });
});
[
  ["grateful", "Great workout this morning and slept well. Feeling on top of things."],
  ["happy", "Productive day at work, finished the project ahead of schedule."],
  ["calm", "Quiet evening with a good book."],
].forEach((j, idx) => {
  journals.push({ userId: alexId, date: dayOffset(idx), mood: j[0], text: j[1], createdAt: dayOffset(idx), updatedAt: dayOffset(idx) });
});

// Priya: poor sleep, low hydration, low consistency, overspending, low mood.
const priyaMoods = ["tired", "anxious", "stressed", "tired", "anxious", "sad", "tired"];
for (let i = 6; i >= 0; i--) {
  const date = dayOffset(i);
  const loggedHabits = i % 3 === 0; // habits only roughly 1 in 3 days
  dailyLogs.push({
    userId: priyaId,
    date: date,
    sleepHours: 4.8 + (i % 2) * 0.4,
    stepTarget: 8000,
    waterIntake: 1300 + (i % 2) * 200,
    transactionalHabits: loggedHabits ? ["Journaling"] : [],
    embeddedHabits: loggedHabits ? ["Stretching"] : [],
    meals: [
      meal("Breakfast", ["Coffee"]),
      meal("Dinner", ["Takeout pizza"]),
    ],
    morningMood: priyaMoods[i],
    afternoonMood: "stressed",
    eveningMood: "tired",
    createdAt: date,
    updatedAt: date,
  });
}
[
  ["Food", 120.0], ["Travel", 260.0], ["Misc", 340.0], ["Wellness", 180.0],
  ["Food", 95.0], ["Housing", 420.0], ["Misc", 150.0],
].forEach((e, idx) => {
  expenses.push({ userId: priyaId, date: dayOffset(idx), category: e[0], amount: e[1], createdAt: dayOffset(idx) });
});
[
  ["anxious", "Swamped with deadlines, barely slept. Need to slow down."],
  ["tired", "Skipped the gym again. Low energy all day."],
  ["stressed", "Spent way more than planned this week."],
].forEach((j, idx) => {
  journals.push({ userId: priyaId, date: dayOffset(idx), mood: j[0], text: j[1], createdAt: dayOffset(idx), updatedAt: dayOffset(idx) });
});

// Sam: admin, middle-of-the-road patterns.
const samMoods = ["good", "calm", "tired", "happy", "okay", "calm", "good"];
for (let i = 6; i >= 0; i--) {
  const date = dayOffset(i);
  dailyLogs.push({
    userId: samId,
    date: date,
    sleepHours: 6.4 + (i % 3) * 0.3,
    stepTarget: 9000,
    waterIntake: 2000 + (i % 2) * 150,
    transactionalHabits: ["Standup notes"],
    embeddedHabits: i % 2 === 0 ? ["Evening walk"] : [],
    meals: [
      meal("Breakfast", ["Eggs", "Toast"]),
      meal("Lunch", ["Sandwich"]),
      meal("Dinner", ["Pasta"]),
    ],
    morningMood: samMoods[i],
    afternoonMood: "calm",
    eveningMood: "good",
    createdAt: date,
    updatedAt: date,
  });
}
[
  ["Food", 45.0], ["Travel", 30.0], ["Housing", 60.0], ["Wellness", 35.0],
  ["Food", 28.0], ["Misc", 22.0], ["Food", 33.0],
].forEach((e, idx) => {
  expenses.push({ userId: samId, date: dayOffset(idx), category: e[0], amount: e[1], createdAt: dayOffset(idx) });
});
[
  ["good", "Balanced day. Reviewed the team's metrics."],
  ["calm", "Caught up on admin tasks."],
].forEach((j, idx) => {
  journals.push({ userId: samId, date: dayOffset(idx), mood: j[0], text: j[1], createdAt: dayOffset(idx), updatedAt: dayOffset(idx) });
});

// ---- Insert -----------------------------------------------------------------
dbx.daily_logs.insertMany(dailyLogs);
dbx.expenses.insertMany(expenses);
dbx.journal_entries.insertMany(journals);

print("Seed complete:");
print("  users:        " + dbx.users.countDocuments({ email: { $in: EMAILS } }));
print("  daily_logs:   " + dailyLogs.length);
print("  expenses:     " + expenses.length);
print("  journals:     " + journals.length);
print("");
print("Login with password 'Password123!' as:");
print("  alex@example.com (USER), priya@example.com (USER), sam@example.com (ADMIN)");
