(() => {
  // Administrator review must never rent capacity in the background.
  if (new URLSearchParams(location.search).get("adminPreview") === "1") return;
  const config = window.rouxLaurenCheckpoints;
  const lessonNumber = Number(document.documentElement.dataset.lessonNumber);
  const checkpoint = config?.checkpointForLesson(lessonNumber);
  const audio = document.getElementById("voice");
  if (!checkpoint || !(audio instanceof HTMLMediaElement)) return;

  const storageKey = `roux-lauren-prewarm:${checkpoint.id}`;
  let requested = sessionStorage.getItem(storageKey) === "requested";
  let requesting = false;

  const requestPrewarm = async () => {
    if (requested || requesting) return;
    const cloud = window.rouxAcademyCloud;
    if (!cloud?.session || !cloud?.client) return;
    requesting = true;
    try {
      const { data, error } = await cloud.client.functions.invoke("academy-lauren", {
        body: { action: "prewarm", checkpointId: checkpoint.id },
      });
      if (error || data?.error) throw error ?? new Error(data.error);
      requested = true;
      sessionStorage.setItem(storageKey, "requested");
      if (typeof data?.reservationId === "string") {
        sessionStorage.setItem(`${storageKey}:reservation`, data.reservationId);
      }
      window.dispatchEvent(new CustomEvent("roux-lauren-prewarm", { detail: { checkpointId: checkpoint.id } }));
    } catch {
      // A failed background warm-up must never stop the lesson. The checkpoint
      // screen retries visibly and can fall back to a normal cold preparation.
    } finally {
      requesting = false;
    }
  };

  audio.addEventListener("timeupdate", () => {
    const sceneIndex = Number(window.rouxLessonSceneIndex?.() ?? -1);
    if (config.shouldRequestPrewarm({
      checkpoint,
      sceneIndex,
      sceneTime: audio.currentTime,
      alreadyRequested: requested,
    })) void requestPrewarm();
  });
})();

