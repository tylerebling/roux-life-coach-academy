(() => {
  const PREWARM_REMAINING_SECONDS = 8 * 60;

  const checkpoints = Object.freeze([
    Object.freeze({
      id: "block-03-06",
      lessons: Object.freeze([3, 4, 5, 6]),
      triggerLesson: 6,
      assignmentId: "sim-career-change",
      scenarioSlug: "confidence-career-change",
      durationSeconds: 300,
      prewarmSceneIndex: 25,
      prewarmAtSeconds: 1,
      capstone: false,
    }),
    Object.freeze({
      id: "block-07-10",
      lessons: Object.freeze([7, 8, 9, 10]),
      triggerLesson: 10,
      assignmentId: "sim-relationship-disconnection",
      scenarioSlug: "relationship-disconnection",
      durationSeconds: 300,
      prewarmSceneIndex: 19,
      prewarmAtSeconds: 11,
      capstone: false,
    }),
    Object.freeze({
      id: "block-11-14",
      lessons: Object.freeze([11, 12, 13, 14]),
      triggerLesson: 14,
      assignmentId: "sim-life-transition",
      scenarioSlug: "life-transition-identity",
      durationSeconds: 300,
      prewarmSceneIndex: 16,
      prewarmAtSeconds: 11,
      capstone: false,
    }),
    Object.freeze({
      id: "block-15-18",
      lessons: Object.freeze([15, 16, 17, 18]),
      triggerLesson: 18,
      assignmentId: "sim-workplace-burnout",
      scenarioSlug: "workplace-burnout-identity",
      durationSeconds: 300,
      prewarmSceneIndex: 14,
      prewarmAtSeconds: 14,
      capstone: false,
    }),
    Object.freeze({
      id: "lesson-19-capstone",
      lessons: Object.freeze([19]),
      triggerLesson: 19,
      assignmentId: "sim-capstone",
      scenarioSlug: null,
      durationSeconds: 600,
      prewarmSceneIndex: 16,
      prewarmAtSeconds: 9,
      capstone: true,
    }),
  ]);

  const byTriggerLesson = new Map(checkpoints.map((checkpoint) => [checkpoint.triggerLesson, checkpoint]));
  const byId = new Map(checkpoints.map((checkpoint) => [checkpoint.id, checkpoint]));

  const checkpointForLesson = (lessonNumber) => byTriggerLesson.get(Number(lessonNumber)) ?? null;
  const checkpointById = (id) => byId.get(String(id)) ?? null;

  const shouldRequestPrewarm = ({ checkpoint, sceneIndex, sceneTime, alreadyRequested = false }) => {
    if (!checkpoint || alreadyRequested) return false;
    if (!Number.isFinite(sceneIndex) || !Number.isFinite(sceneTime)) return false;
    if (sceneIndex > checkpoint.prewarmSceneIndex) return true;
    return sceneIndex === checkpoint.prewarmSceneIndex && sceneTime >= checkpoint.prewarmAtSeconds;
  };

  /**
   * True only at the first crossing into the eight-minute window.
   * Rewinds, repeated timeupdate events, and reload restoration must not create
   * another reservation; the caller also persists the checkpoint id once sent.
   */
  const crossedPrewarmThreshold = ({ previousRemaining, remaining, alreadyRequested = false }) => {
    if (alreadyRequested) return false;
    if (!Number.isFinite(previousRemaining) || !Number.isFinite(remaining)) return false;
    return previousRemaining > PREWARM_REMAINING_SECONDS && remaining <= PREWARM_REMAINING_SECONDS;
  };

  window.rouxLaurenCheckpoints = Object.freeze({
    PREWARM_REMAINING_SECONDS,
    checkpoints,
    checkpointForLesson,
    checkpointById,
    shouldRequestPrewarm,
    crossedPrewarmThreshold,
  });
})();

