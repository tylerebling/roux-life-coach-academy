(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.RouxDashboardModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const activityOrder = ["presentation", "workbook", "practice", "quiz"];
  function readRecord(storage, lessonNumber) { try { return JSON.parse(storage.getItem(`rouxAcademyLesson${lessonNumber}Record`) || "{}"); } catch { return {}; } }
  function activityState(record) { return { presentation: !!record.presentationComplete, workbook: !!record.workbookComplete, practice: !!record.practiceComplete, quiz: !!record.quizPassed }; }
  function nextIncompleteActivity(record) { const status = activityState(record); return activityOrder.find(key => !status[key]) || "review"; }
  function lessonDestination(lessonNumber, activity) { const base = `lessons/lesson-${String(lessonNumber).padStart(2, "0")}`; return lessonNumber === 1 || activity === "presentation" || activity === "review" ? `${base}/index.html` : `${base}/LEARNING_LAB.html#${activity}`; }
  function buildDashboard(lessons, storage) {
    const records = lessons.map(lesson => readRecord(storage, lesson.number));
    const completed = records.filter(record => record.complete).length;
    const firstIncomplete = records.findIndex(record => !record.complete);
    const currentIndex = Math.min(firstIncomplete < 0 ? lessons.length - 1 : firstIncomplete, lessons.length - 1);
    const current = lessons[currentIndex], currentRecord = records[currentIndex] || {}, activity = nextIncompleteActivity(currentRecord), next = lessons[currentIndex + 1] || null;
    const earnedMinutes = lessons.reduce((sum, lesson, index) => sum + (records[index].complete ? lesson.minutes : 0), 0);
    return { completed, total: lessons.length, percent: Math.round(completed / lessons.length * 100), hours: (earnedMinutes / 60).toFixed(1), current, currentRecord, activities: activityState(currentRecord), resumeActivity: activity, resumeUrl: lessonDestination(current.number, activity), next, nextUnlocked: !!next && !!currentRecord.complete, nextUrl: next && currentRecord.complete ? lessonDestination(next.number, "presentation") : "" };
  }
  return { activityState, nextIncompleteActivity, lessonDestination, buildDashboard };
});

