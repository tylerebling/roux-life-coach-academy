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
  let pauseTimer = 0;

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

  const cancelPrewarm = async () => {
    if (!requested || requesting) return;
    requesting = true;
    try {
      const cloud = window.rouxAcademyCloud;
      if (!cloud?.session || !cloud?.client) return;
      const { data, error } = await cloud.client.functions.invoke("academy-lauren", {
        body: { action: "cancel-prewarm", checkpointId: checkpoint.id },
      });
      if (error) throw error;
      if (data?.cancelled !== true) return;
      requested = false;
      sessionStorage.removeItem(storageKey);
      sessionStorage.removeItem(`${storageKey}:reservation`);
    } catch {
      // The simulator's ten-minute server TTL is the final cost backstop.
    } finally {
      requesting = false;
    }
  };

  const cancelOnExit = () => {
    const cloud = window.rouxAcademyCloud;
    const token = cloud?.session?.access_token;
    const url = cloud?.client?.supabaseUrl;
    const key = cloud?.client?.supabaseKey;
    if (!token || !url || !key) return;
    void fetch(`${url}/functions/v1/academy-lauren`, {
      method: "POST",
      keepalive: true,
      headers: { authorization: `Bearer ${token}`, apikey: key, "content-type": "application/json" },
      body: JSON.stringify({ action: "cancel-prewarm", checkpointId: checkpoint.id }),
    });
  };

  const armPauseCancellation = () => {
    clearTimeout(pauseTimer);
    if (!requested) return;
    pauseTimer = window.setTimeout(() => void cancelPrewarm(), 60_000);
  };
  const resumeWarmup = () => {
    clearTimeout(pauseTimer);
    const sceneIndex = Number(window.rouxLessonSceneIndex?.() ?? -1);
    if (config.shouldRequestPrewarm({ checkpoint, sceneIndex, sceneTime: audio.currentTime, alreadyRequested: requested })) {
      void requestPrewarm();
    }
  };

  audio.addEventListener("pause", armPauseCancellation);
  audio.addEventListener("play", resumeWarmup);
  document.addEventListener("visibilitychange", () => document.hidden ? armPauseCancellation() : resumeWarmup());
  window.addEventListener("pagehide", () => {
    const presentationFinished = localStorage.getItem(`rouxLesson${lessonNumber}PresentationComplete`) === "true";
    if (requested && !presentationFinished) cancelOnExit();
  });

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

