"use client";

const RINGTONE_URLS = {
  incoming: "/sounds/incoming-call.wav",
  outgoing: "/sounds/outgoing-ringback.wav",
};

const RINGTONE_VOLUMES = {
  incoming: 0.85,
  outgoing: 0.7,
};

let audioContext = null;
let listenersInstalled = false;
const decodedBuffers = new Map();
const bufferPromises = new Map();
const activeRingtones = new Map();
const pendingRingtones = new Map();

function getAudioContext() {
  if (typeof window === "undefined") return null;

  const AudioContextConstructor =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextConstructor) return null;

  if (!audioContext || audioContext.state === "closed") {
    try {
      audioContext = new AudioContextConstructor();
    } catch (error) {
      console.warn("[CallAudio] AudioContext is unavailable:", error);
      return null;
    }
  }

  return audioContext;
}

function emitRingtoneEvent(eventName, detail) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
    return;
  }

  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  } catch {
    // Audio playback should not fail because an optional UI event is unavailable.
  }
}

async function loadRingtoneBuffer(kind) {
  if (!RINGTONE_URLS[kind]) {
    throw new Error(`Unknown ringtone kind: ${kind}`);
  }

  if (decodedBuffers.has(kind)) return decodedBuffers.get(kind);
  if (bufferPromises.has(kind)) return bufferPromises.get(kind);

  const context = getAudioContext();
  if (!context) throw new Error("Web Audio is not supported by this browser.");

  const promise = fetch(RINGTONE_URLS[kind], { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Could not load ${RINGTONE_URLS[kind]} (${response.status}).`);
      }
      return response.arrayBuffer();
    })
    .then((data) => context.decodeAudioData(data.slice(0)))
    .then((buffer) => {
      decodedBuffers.set(kind, buffer);
      return buffer;
    })
    .finally(() => {
      bufferPromises.delete(kind);
    });

  bufferPromises.set(kind, promise);
  return promise;
}

function stopActiveRingtone(kind, callID = null) {
  const current = activeRingtones.get(kind);
  const normalizedID = callID ? String(callID) : null;

  if (!current || (normalizedID && current.callID !== normalizedID)) return false;

  activeRingtones.delete(kind);

  try {
    current.source.onended = null;
    current.source.stop(0);
  } catch {
    // A source may already have stopped.
  }

  try {
    current.source.disconnect();
    current.gain.disconnect();
  } catch {
    // A source may already be disconnected.
  }

  emitRingtoneEvent("call-ringtone-stopped", {
    kind,
    callID: current.callID,
  });

  return true;
}

async function startPendingRingtone(kind, request) {
  const context = getAudioContext();
  if (!context || context.state !== "running") return false;
  if (pendingRingtones.get(kind) !== request) return false;

  let buffer;
  try {
    buffer = await loadRingtoneBuffer(kind);
  } catch (error) {
    console.error(`[CallAudio] Failed to load ${kind} ringtone:`, error);
    if (pendingRingtones.get(kind) === request) pendingRingtones.delete(kind);
    emitRingtoneEvent("call-ringtone-error", {
      kind,
      callID: request.callID,
      message: error?.message || "Could not load ringtone.",
    });
    return false;
  }

  if (pendingRingtones.get(kind) !== request) return false;
  if (context.state !== "running") return false;

  const alreadyActive = activeRingtones.get(kind);
  if (alreadyActive?.callID === request.callID) {
    pendingRingtones.delete(kind);
    return true;
  }

  stopActiveRingtone(kind);

  try {
    const source = context.createBufferSource();
    const gain = context.createGain();

    source.buffer = buffer;
    source.loop = true;
    gain.gain.value = RINGTONE_VOLUMES[kind];

    source.connect(gain);
    gain.connect(context.destination);

    activeRingtones.set(kind, {
      source,
      gain,
      callID: request.callID,
    });
    pendingRingtones.delete(kind);

    source.onended = () => {
      const active = activeRingtones.get(kind);
      if (active?.source === source) activeRingtones.delete(kind);
    };

    source.start(0);

    emitRingtoneEvent("call-ringtone-started", {
      kind,
      callID: request.callID,
    });

    console.info(`[CallAudio] ${kind} ringtone started for call ${request.callID}.`);
    return true;
  } catch (error) {
    const active = activeRingtones.get(kind);
    if (active?.callID === request.callID) {
      activeRingtones.delete(kind);
      try { active.source.stop(0); } catch {}
      try { active.source.disconnect(); active.gain.disconnect(); } catch {}
    }
    if (pendingRingtones.get(kind) === request) pendingRingtones.delete(kind);
    console.warn(`[CallAudio] Could not start ${kind} ringtone:`, error);
    emitRingtoneEvent("call-ringtone-error", {
      kind,
      callID: request.callID,
      message: error?.message || "Could not start ringtone.",
    });
    return false;
  }
}

/**
 * Call once when the communication UI mounts. Ringtones use Web Audio rather
 * than a fresh HTMLAudioElement so a user gesture can unlock audio on iOS.
 */
export function initializeCallAudio() {
  if (typeof window === "undefined") return;

  getAudioContext();

  if (!listenersInstalled) {
    const handleUserGesture = () => {
      // resume() is invoked directly from the user gesture before any await.
      void unlockCallAudio();
    };

    document.addEventListener("pointerdown", handleUserGesture, true);
    document.addEventListener("touchstart", handleUserGesture, true);
    document.addEventListener("click", handleUserGesture, true);
    document.addEventListener("keydown", handleUserGesture, true);
    listenersInstalled = true;
  }

  // Preload while the app is open; the context itself stays silent until needed.
  void loadRingtoneBuffer("incoming").catch((error) => {
    console.warn("[CallAudio] Incoming ringtone preload failed:", error);
  });
  void loadRingtoneBuffer("outgoing").catch((error) => {
    console.warn("[CallAudio] Outgoing ringtone preload failed:", error);
  });
}

/** Resume the audio context from a click/touch/key gesture and start any pending rings. */
export async function unlockCallAudio() {
  const context = getAudioContext();
  if (!context) return false;

  try {
    if (context.state !== "running") {
      // This call must happen synchronously as part of a real user gesture on iOS.
      await context.resume();
    }
  } catch (error) {
    console.warn("[CallAudio] Browser has not unlocked audio yet:", error);
    return false;
  }

  if (context.state !== "running") return false;

  for (const [kind, request] of pendingRingtones.entries()) {
    void startPendingRingtone(kind, request);
  }

  return true;
}

/** Start a looping ringtone. If autoplay is blocked, preserve it as pending until audio is unlocked. */
export async function playCallRingtone(kind, callID) {
  if (typeof window === "undefined" || !callID || !RINGTONE_URLS[kind]) {
    return false;
  }

  initializeCallAudio();
  const normalizedID = String(callID);
  const active = activeRingtones.get(kind);

  if (active?.callID === normalizedID) return true;

  stopCallRingtone(kind);

  const request = { callID: normalizedID };
  pendingRingtones.set(kind, request);

  try {
    await loadRingtoneBuffer(kind);
  } catch (error) {
    console.error(`[CallAudio] Could not load ${kind} ringtone:`, error);
    return false;
  }

  const context = getAudioContext();
  if (!context || context.state !== "running") {
    // The call remains queued. A later gesture or the fallback button resumes it.
    return false;
  }

  return startPendingRingtone(kind, request);
}

/** Stop one ringtone. Passing a callID prevents stale events from stopping a newer call. */
export function stopCallRingtone(kind, callID = null) {
  if (!RINGTONE_URLS[kind]) return;
  const normalizedID = callID ? String(callID) : null;

  const pending = pendingRingtones.get(kind);
  if (pending && (!normalizedID || pending.callID === normalizedID)) {
    pendingRingtones.delete(kind);
  }

  stopActiveRingtone(kind, normalizedID);
}

export function stopAllCallRingtones() {
  stopCallRingtone("incoming");
  stopCallRingtone("outgoing");
}
