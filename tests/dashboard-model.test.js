const assert = require("node:assert/strict");
const model = require("../academy/academy/dashboard-model.js");
const lessons = [{ number: 1, title: "One", minutes: 30 }, { number: 2, title: "Two", minutes: 30 }, { number: 3, title: "Three", minutes: 30 }];
const storage = values => ({ getItem: key => values[key] || null });
assert.equal(model.nextIncompleteActivity({ presentationComplete: true }), "workbook");
assert.equal(model.nextIncompleteActivity({ presentationComplete: true, workbookComplete: true, practiceComplete: true, quizPassed: true }), "review");
assert.equal(model.lessonDestination(2, "quiz"), "lessons/lesson-02/LEARNING_LAB.html#quiz");
assert.equal(model.activityPercent({ presentationComplete: true, workbookComplete: true }), 50);
const active = model.buildDashboard(lessons, storage({ rouxAcademyLesson1Record: JSON.stringify({ complete: true }), rouxAcademyLesson2Record: JSON.stringify({ presentationComplete: true }) }));
assert.equal(active.current.number, 2); assert.equal(active.resumeActivity, "workbook"); assert.equal(active.completed, 1); assert.equal(active.nextUnlocked, false);
assert.equal(active.lessonPercent, 25);
const unlocked = model.buildDashboard(lessons, storage({ rouxAcademyLesson1Record: JSON.stringify({ complete: true }), rouxAcademyLesson2Record: JSON.stringify({ complete: true }) }));
assert.equal(unlocked.current.number, 3); assert.equal(unlocked.completed, 2); assert.equal(unlocked.hours, "1.0");
console.log("dashboard-model: 12 assertions passed");

