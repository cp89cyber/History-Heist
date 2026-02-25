import React, { useEffect, useMemo, useRef, useState } from "react";

const ROUTES = {
  LOBBY: "/lobby",
  GALLERY: "/gallery",
  ARCHIVE: "/archive",
  WORKSHOP: "/workshop",
  EXIT: "/exit",
};

const ROUTE_GRAPH_ORDER = [
  ROUTES.LOBBY,
  ROUTES.GALLERY,
  ROUTES.ARCHIVE,
  ROUTES.WORKSHOP,
  ROUTES.EXIT,
];

const NON_EXIT_ROOMS = [ROUTES.LOBBY, ROUTES.GALLERY, ROUTES.ARCHIVE, ROUTES.WORKSHOP];

const DEFAULT_TIMELINE = {
  keyTaken: false,
  hasKey: false,
  stampedOnce: false,
};

const DEFAULT_PERSISTENT = {
  hasStamp: false,
  cachedKey: false,
};

function clampRoute(route) {
  const allowed = new Set(Object.values(ROUTES));
  return allowed.has(route) ? route : ROUTES.LOBBY;
}

function parseHashRoute() {
  const raw = (window.location.hash || "").replace(/^#/, "").trim();
  if (!raw) return ROUTES.LOBBY;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function mergeTimeline(partial) {
  const t = partial && typeof partial === "object" ? partial : {};
  return {
    keyTaken: Boolean(t.keyTaken),
    hasKey: Boolean(t.hasKey),
    stampedOnce: Boolean(t.stampedOnce),
  };
}

function safeHistoryState() {
  try {
    return window.history.state;
  } catch {
    return null;
  }
}

function createEmptyVisitedMap() {
  return {
    [ROUTES.LOBBY]: false,
    [ROUTES.GALLERY]: false,
    [ROUTES.ARCHIVE]: false,
    [ROUTES.WORKSHOP]: false,
  };
}

function markVisited(roomsVisited, route) {
  if (!NON_EXIT_ROOMS.includes(route)) {
    return roomsVisited;
  }
  if (roomsVisited[route]) {
    return roomsVisited;
  }
  return { ...roomsVisited, [route]: true };
}

function visitedAllNonExitRooms(roomsVisited) {
  return NON_EXIT_ROOMS.every((route) => Boolean(roomsVisited[route]));
}

function createInitialStats(startRoute) {
  return {
    steps: 0,
    invalidAttempts: 0,
    manualHintReveals: 0,
    completion: false,
    everTouchedKey: false,
    roomsVisited: markVisited(createEmptyVisitedMap(), startRoute),
  };
}

function computeScore(stats) {
  const base = 100;
  const efficiency = stats.steps <= 12 ? 40 : stats.steps <= 18 ? 20 : 0;
  const accuracy = stats.invalidAttempts <= 2 ? 20 : 0;
  const guidance =
    stats.manualHintReveals === 0 ? 20 : stats.manualHintReveals <= 2 ? 10 : 0;
  const exploration = visitedAllNonExitRooms(stats.roomsVisited) ? 20 : 0;

  const total = base + efficiency + accuracy + guidance + exploration;
  const stars = total >= 170 ? 3 : total >= 130 ? 2 : 1;

  const achievements = [
    {
      id: "first-escape",
      label: "First Escape",
      unlocked: stats.completion,
      detail: "Complete one run.",
    },
    {
      id: "clean-timeline",
      label: "Clean Timeline",
      unlocked: stats.completion && stats.invalidAttempts === 0,
      detail: "Finish with 0 invalid attempts.",
    },
    {
      id: "efficient-thief",
      label: "Efficient Thief",
      unlocked: stats.completion && stats.steps <= 12,
      detail: "Finish in 12 steps or fewer.",
    },
    {
      id: "curator",
      label: "Curator",
      unlocked: stats.completion && visitedAllNonExitRooms(stats.roomsVisited),
      detail: "Visit every non-exit room.",
    },
  ];

  return {
    base,
    efficiency,
    accuracy,
    guidance,
    exploration,
    total,
    stars,
    achievements,
  };
}

function toTitleCase(route) {
  return route.replace("/", "").replace(/^./, (x) => x.toUpperCase());
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm">
      {children}
    </span>
  );
}

function Button({ children, id, onClick, variant = "primary", disabled = false }) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500";
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : variant === "secondary"
        ? "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50"
        : "bg-slate-100 text-slate-900 hover:bg-slate-200";

  return (
    <button
      id={id}
      onClick={disabled ? undefined : onClick}
      className={`${base} ${styles} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      type="button"
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function RoomCard({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-3 text-slate-700 leading-relaxed">{children}</div>
    </section>
  );
}

function ChecklistItem({ done, label }) {
  return (
    <li className="flex items-start gap-2 text-sm text-slate-700">
      <span
        className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs font-semibold ${
          done
            ? "border-emerald-600 bg-emerald-50 text-emerald-700"
            : "border-slate-300 bg-white text-slate-500"
        }`}
      >
        {done ? "✓" : "•"}
      </span>
      <span>{label}</span>
    </li>
  );
}

function ScoreRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm text-slate-700">
      <span>{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function Log({ items }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-live="polite">
      <h3 className="text-sm font-semibold text-slate-900">Museum notes</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">No notes yet.</p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm text-slate-700">
          {items.slice(0, 10).map((item, index) => (
            <li key={`${index}-${item}`} className="flex gap-2">
              <span className="text-slate-400">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function HistoryHeist() {
  const initial = useMemo(() => {
    const st = safeHistoryState();
    const hashRoute = clampRoute(parseHashRoute());

    if (st && st.__historyHeist && typeof st.route === "string") {
      return {
        route: clampRoute(st.route),
        timeline: mergeTimeline(st.timeline),
      };
    }

    return {
      route: hashRoute,
      timeline: DEFAULT_TIMELINE,
    };
  }, []);

  const [mode, setMode] = useState("start");
  const [route, setRoute] = useState(initial.route);
  const [timeline, setTimeline] = useState(initial.timeline);
  const [persistent, setPersistent] = useState(DEFAULT_PERSISTENT);
  const [hintOpen, setHintOpen] = useState(false);
  const [log, setLog] = useState(() => [
    "Welcome to History Heist.",
    "Use Start Heist, then rely on browser Back/Forward as your time machine.",
  ]);
  const [stats, setStats] = useState(() => createInitialStats(initial.route));

  const modeRef = useRef(mode);
  const recommendedActionRef = useRef(null);
  const logicalTimeMs = useRef(0);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const canOpenParadoxDoor = persistent.cachedKey && !timeline.keyTaken;
  const timelineLabel = timeline.keyTaken ? "disturbed" : "untouched";

  const objectives = useMemo(
    () => ({
      stampCollected: persistent.hasStamp,
      keyTouched: stats.everTouchedKey,
      keyCached: persistent.cachedKey,
      doorOpened: mode === "won" || stats.completion,
    }),
    [mode, persistent.cachedKey, persistent.hasStamp, stats.completion, stats.everTouchedKey]
  );

  const scoring = useMemo(() => computeScore(stats), [stats]);

  function note(message) {
    setLog((items) => [message, ...items].slice(0, 12));
  }

  function markInvalidAttempt(message) {
    setStats((prev) => ({ ...prev, invalidAttempts: prev.invalidAttempts + 1 }));
    note(message);
  }

  function recordStep(nextRoute) {
    if (modeRef.current === "start") {
      return;
    }
    setStats((prev) => ({
      ...prev,
      steps: prev.steps + 1,
      roomsVisited: markVisited(prev.roomsVisited, nextRoute),
    }));
  }

  function pushState(nextRoute, nextTimeline) {
    const st = {
      __historyHeist: true,
      route: nextRoute,
      timeline: nextTimeline,
    };
    window.history.pushState(st, "", `#${nextRoute}`);
    setRoute(nextRoute);
    setTimeline(nextTimeline);
    recordStep(nextRoute);
  }

  function replaceState(nextRoute, nextTimeline) {
    const st = {
      __historyHeist: true,
      route: nextRoute,
      timeline: nextTimeline,
    };
    window.history.replaceState(st, "", `#${nextRoute}`);
    setRoute(nextRoute);
    setTimeline(nextTimeline);
  }

  function navigate(nextRoute) {
    pushState(nextRoute, timeline);
  }

  function mutateTimeline(updater) {
    const nextTimeline = updater(timeline);
    pushState(route, nextTimeline);
  }

  function initializeRun(nextMode) {
    setMode(nextMode);
    setPersistent(DEFAULT_PERSISTENT);
    setHintOpen(false);
    setStats(createInitialStats(ROUTES.LOBBY));
    setLog([
      "Fresh run. Same museum. Better plan.",
      "Mission: cache the key, rewind to untouched, then open the Paradox Door.",
      "Use browser Back/Forward (or Arrow keys) to time travel.",
    ]);
    logicalTimeMs.current = 0;
    replaceState(ROUTES.LOBBY, DEFAULT_TIMELINE);
  }

  function startHeist() {
    initializeRun("playing");
  }

  function resetRunToStart() {
    initializeRun("start");
  }

  function toggleHint() {
    setHintOpen((open) => {
      const next = !open;
      if (next) {
        setStats((prev) => ({ ...prev, manualHintReveals: prev.manualHintReveals + 1 }));
      }
      return next;
    });
  }

  function takeStamp() {
    if (persistent.hasStamp) {
      note("You already have the CACHE stamp.");
      return;
    }

    setPersistent((prev) => ({ ...prev, hasStamp: true }));
    note("You collected the CACHE stamp. Persistent inventory unlocked.");
  }

  function takeUnstableKey() {
    if (timeline.keyTaken) {
      markInvalidAttempt("This timeline already remembers touching the key. Rewind first.");
      return;
    }

    setStats((prev) => ({ ...prev, everTouchedKey: true }));
    mutateTimeline((prev) => ({ ...prev, keyTaken: true, hasKey: true }));
    note("Unstable key acquired. This timeline is now disturbed.");
  }

  function stampKeyIntoCache() {
    if (!persistent.hasStamp) {
      markInvalidAttempt("You need the CACHE stamp before using the workshop press.");
      return;
    }

    if (!timeline.hasKey) {
      markInvalidAttempt("No unstable key in hand. Grab one from the Archive first.");
      return;
    }

    if (persistent.cachedKey) {
      note("A cached key already exists in your persistent inventory.");
      return;
    }

    setPersistent((prev) => ({ ...prev, cachedKey: true }));
    mutateTimeline((prev) => ({ ...prev, hasKey: false, stampedOnce: true }));
    note("Workshop success. Cached key stored, original returned to the pedestal.");
  }

  function openParadoxDoor() {
    if (!canOpenParadoxDoor) {
      markInvalidAttempt("Door blocked: requires cached key + untouched timeline.");
      return;
    }

    pushState(ROUTES.EXIT, timeline);
    setMode("won");
    setStats((prev) => ({ ...prev, completion: true }));
    note("Door opened. You escaped through a legal paradox.");
  }

  const recommendedAction = useMemo(() => {
    if (mode === "start") {
      return {
        key: "start-heist",
        label: "Start Heist",
        summary: "Begin in the Lobby and follow the mission checklist.",
        run: startHeist,
      };
    }

    if (mode === "won") {
      return {
        key: "new-run",
        label: "New run",
        summary: "Try for a cleaner and faster escape.",
        run: resetRunToStart,
      };
    }

    if (!persistent.hasStamp) {
      if (route === ROUTES.GALLERY) {
        return {
          key: "take-stamp",
          label: "Take the CACHE stamp",
          summary: "Collect your first persistent item.",
          run: takeStamp,
        };
      }
      return {
        key: "go-gallery",
        label: "Go to the Gallery",
        summary: "The CACHE stamp is required before key caching.",
        run: () => navigate(ROUTES.GALLERY),
      };
    }

    if (!persistent.cachedKey) {
      if (timeline.hasKey) {
        if (route === ROUTES.WORKSHOP) {
          return {
            key: "stamp-key",
            label: "Stamp the key into cache",
            summary: "Convert the unstable key into persistent inventory.",
            run: stampKeyIntoCache,
          };
        }
        return {
          key: "go-workshop",
          label: "Go to the Workshop",
          summary: "Bring the key to the workshop press.",
          run: () => navigate(ROUTES.WORKSHOP),
        };
      }

      if (timeline.keyTaken) {
        return {
          key: "rewind-for-key",
          label: "Rewind with Back",
          summary: "Find a timeline where the key is available again.",
          run: () => window.history.back(),
        };
      }

      if (route === ROUTES.ARCHIVE) {
        return {
          key: "take-unstable-key",
          label: "Take the unstable key",
          summary: "Touching it disturbs this timeline (on purpose).",
          run: takeUnstableKey,
        };
      }

      return {
        key: "go-archive",
        label: "Go to the Archive",
        summary: "The unstable key is in the Archive.",
        run: () => navigate(ROUTES.ARCHIVE),
      };
    }

    if (timeline.keyTaken) {
      return {
        key: "rewind-untouched",
        label: "Rewind to untouched timeline",
        summary: "Use Back until the timeline status is untouched.",
        run: () => window.history.back(),
      };
    }

    if (route !== ROUTES.LOBBY) {
      return {
        key: "return-lobby",
        label: "Return to the Lobby",
        summary: "Open the Paradox Door from the Lobby.",
        run: () => navigate(ROUTES.LOBBY),
      };
    }

    return {
      key: "open-door",
      label: "Open the Paradox Door",
      summary: "All conditions met. Escape now.",
      run: openParadoxDoor,
    };
  }, [
    mode,
    persistent.hasStamp,
    persistent.cachedKey,
    route,
    timeline.hasKey,
    timeline.keyTaken,
  ]);

  useEffect(() => {
    recommendedActionRef.current = recommendedAction;
  }, [recommendedAction]);

  useEffect(() => {
    const st = safeHistoryState();
    if (!st || !st.__historyHeist) {
      replaceState(route, timeline);
    }

    const onPop = (event) => {
      const state = event.state;
      const nextRoute = clampRoute(state?.route || clampRoute(parseHashRoute()));
      const nextTimeline = mergeTimeline(state?.timeline);

      setRoute(nextRoute);
      setTimeline(nextTimeline);
      recordStep(nextRoute);
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const tagName = typeof target?.tagName === "string" ? target.tagName.toLowerCase() : "";
      const isTyping = tagName === "input" || tagName === "textarea" || target?.isContentEditable;
      if (isTyping) {
        return;
      }

      if (event.code === "KeyA") {
        event.preventDefault();
        resetRunToStart();
        return;
      }

      if (modeRef.current !== "playing") {
        return;
      }

      if (event.code === "ArrowLeft" || event.code === "KeyB") {
        event.preventDefault();
        window.history.back();
        return;
      }

      if (event.code === "ArrowRight") {
        event.preventDefault();
        window.history.forward();
        return;
      }

      if (event.code === "Enter") {
        event.preventDefault();
        recommendedActionRef.current?.run?.();
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        toggleHint();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const textState = useMemo(() => {
    const routeIndex = Math.max(0, ROUTE_GRAPH_ORDER.indexOf(route));
    return {
      mode,
      route,
      timeline,
      persistent,
      objectives,
      recommendedAction: {
        key: recommendedAction.key,
        label: recommendedAction.label,
        summary: recommendedAction.summary,
      },
      runStats: {
        steps: stats.steps,
        invalidAttempts: stats.invalidAttempts,
        manualHintReveals: stats.manualHintReveals,
        completion: stats.completion,
        everTouchedKey: stats.everTouchedKey,
        roomsVisited: stats.roomsVisited,
      },
      scoreProjection: {
        base: scoring.base,
        efficiency: scoring.efficiency,
        accuracy: scoring.accuracy,
        guidance: scoring.guidance,
        exploration: scoring.exploration,
        total: scoring.total,
        stars: scoring.stars,
      },
      achievementsUnlocked: scoring.achievements
        .filter((item) => item.unlocked)
        .map((item) => item.label),
      routeGraphCoordinates: {
        note: "origin=lobby; x increases by route order [lobby,gallery,archive,workshop,exit]; y is always 0",
        current: { x: routeIndex, y: 0 },
      },
    };
  }, [mode, objectives, persistent, recommendedAction, route, scoring, stats, timeline]);

  useEffect(() => {
    window.render_game_to_text = () => JSON.stringify(textState);
    window.advanceTime = (ms = 0) => {
      const delta = Number.isFinite(ms) ? Math.max(0, ms) : 0;
      logicalTimeMs.current += delta;
      return Promise.resolve(logicalTimeMs.current);
    };

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [textState]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">History Heist</h1>
              <p className="mt-1 text-sm text-slate-600">
                Escape by using browser history as a time machine. Collect persistent tools, rewind timelines, and unlock the
                paradox exit.
              </p>
            </div>

            {mode !== "start" && (
              <div className="flex flex-wrap items-center gap-2">
                <Button id="back-btn" variant="secondary" onClick={() => window.history.back()}>
                  Back
                </Button>
                <Button id="forward-btn" variant="secondary" onClick={() => window.history.forward()}>
                  Forward
                </Button>
                <Button id="new-run-btn" variant="tertiary" onClick={resetRunToStart}>
                  New run
                </Button>
              </div>
            )}
          </div>
        </header>

        {mode === "start" && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Start Briefing</h2>
            <p className="mt-2 text-sm text-slate-700">
              You will move between rooms as URLs. Going Back rewinds timeline state, while persistent inventory survives.
            </p>

            <ul className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              <li>• ← or B: Back in history</li>
              <li>• →: Forward in history</li>
              <li>• Enter: Run recommended action</li>
              <li>• Space: Toggle detailed hint</li>
              <li>• A: New run (return to briefing)</li>
            </ul>

            <div className="mt-5">
              <Button id="start-btn" onClick={startHeist}>
                Start Heist
              </Button>
            </div>
          </section>
        )}

        {mode !== "start" && (
          <main className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill>Mode: {mode}</Pill>
                    <Pill>Route: {route}</Pill>
                    <Pill>Timeline: {timelineLabel}</Pill>
                    <Pill>Steps: {stats.steps}</Pill>
                    <Pill>Invalid: {stats.invalidAttempts}</Pill>
                    <Pill>Projected score: {scoring.total}</Pill>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Recommended next action</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button id="primary-action-btn" onClick={recommendedAction.run}>
                        {recommendedAction.label}
                      </Button>
                      <span className="text-sm text-slate-700">{recommendedAction.summary}</span>
                    </div>
                  </div>
                </div>
              </div>

              {route === ROUTES.LOBBY && (
                <RoomCard title="Lobby">
                  <p>Open the Paradox Door only after caching the key and rewinding to an untouched timeline.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => navigate(ROUTES.GALLERY)}>
                      Go to Gallery
                    </Button>
                    <Button variant="secondary" onClick={() => navigate(ROUTES.ARCHIVE)}>
                      Go to Archive
                    </Button>
                    <Button variant="secondary" onClick={() => navigate(ROUTES.WORKSHOP)}>
                      Go to Workshop
                    </Button>
                    <Button onClick={openParadoxDoor}>Open Paradox Door</Button>
                  </div>

                  {!canOpenParadoxDoor && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      Blocked: requires a cached key and an untouched timeline.
                    </div>
                  )}
                </RoomCard>
              )}

              {route === ROUTES.GALLERY && (
                <RoomCard title="Gallery">
                  <p>The CACHE stamp makes selected items persist across timeline rewinds.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={takeStamp}>{persistent.hasStamp ? "Stamp already collected" : "Take CACHE stamp"}</Button>
                    <Button variant="secondary" onClick={() => navigate(ROUTES.WORKSHOP)}>
                      Go to Workshop
                    </Button>
                    <Button variant="secondary" onClick={() => navigate(ROUTES.LOBBY)}>
                      Return to Lobby
                    </Button>
                  </div>
                </RoomCard>
              )}

              {route === ROUTES.ARCHIVE && (
                <RoomCard title="Archive">
                  <p>The unstable key disturbs the current timeline when touched.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={takeUnstableKey}>Take unstable key</Button>
                    <Button variant="secondary" onClick={() => navigate(ROUTES.WORKSHOP)}>
                      Go to Workshop
                    </Button>
                    <Button variant="secondary" onClick={() => navigate(ROUTES.LOBBY)}>
                      Return to Lobby
                    </Button>
                  </div>

                  {timeline.keyTaken && !timeline.hasKey && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      Blocked: this timeline already logged key contact. Rewind to access the pedestal again.
                    </div>
                  )}
                </RoomCard>
              )}

              {route === ROUTES.WORKSHOP && (
                <RoomCard title="Workshop">
                  <p>Stamping copies an unstable item into persistent cache.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={stampKeyIntoCache}>Stamp key into cache</Button>
                    <Button variant="secondary" onClick={() => navigate(ROUTES.ARCHIVE)}>
                      Go to Archive
                    </Button>
                    <Button variant="secondary" onClick={() => navigate(ROUTES.LOBBY)}>
                      Return to Lobby
                    </Button>
                  </div>

                  {(!persistent.hasStamp || !timeline.hasKey) && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      Blocked: workshop needs stamp + unstable key in hand.
                    </div>
                  )}
                </RoomCard>
              )}

              {route === ROUTES.EXIT && (
                <RoomCard title="Exit">
                  <p>You slipped out through a timeline contradiction. Mission complete.</p>

                  <div className="mt-4 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <ScoreRow label="Base" value={`+${scoring.base}`} />
                    <ScoreRow label="Efficiency" value={`+${scoring.efficiency}`} />
                    <ScoreRow label="Accuracy" value={`+${scoring.accuracy}`} />
                    <ScoreRow label="Guidance" value={`+${scoring.guidance}`} />
                    <ScoreRow label="Exploration" value={`+${scoring.exploration}`} />
                    <div className="mt-1 border-t border-slate-300 pt-2 text-sm font-semibold text-slate-900">
                      Total: {scoring.total} ({"★".repeat(scoring.stars)})
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                    <h3 className="text-sm font-semibold text-slate-900">Achievements</h3>
                    <ul className="mt-2 space-y-1 text-sm text-slate-700">
                      {scoring.achievements.map((achievement) => (
                        <li key={achievement.id}>
                          {achievement.unlocked ? "✓" : "○"} {achievement.label} - {achievement.detail}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={resetRunToStart}>Play again</Button>
                    <Button variant="secondary" onClick={() => navigate(ROUTES.LOBBY)}>
                      Revisit Lobby
                    </Button>
                  </div>
                </RoomCard>
              )}
            </section>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Mission checklist</h3>
                <ul className="mt-3 space-y-2">
                  <ChecklistItem done={objectives.stampCollected} label="Collect the CACHE stamp" />
                  <ChecklistItem done={objectives.keyTouched} label="Touch the unstable key" />
                  <ChecklistItem done={objectives.keyCached} label="Cache the key in Workshop" />
                  <ChecklistItem
                    done={objectives.doorOpened}
                    label="Rewind to untouched timeline and open the Paradox Door"
                  />
                </ul>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">Guidance</h3>
                  <Button id="hint-toggle-btn" variant="tertiary" onClick={toggleHint}>
                    {hintOpen ? "Hide hint" : "Need more help"}
                  </Button>
                </div>

                {hintOpen && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    Fast route: Gallery stamp {"->"} Archive key {"->"} Workshop cache {"->"} Back until timeline says untouched {"->"}
                    Lobby door.
                  </div>
                )}

                <div className="mt-3 text-xs text-slate-600">
                  Manual hint reveals this run: {stats.manualHintReveals}
                </div>
              </section>

              <Log items={log} />

              <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
                <h3 className="font-semibold text-slate-900">Controls recap</h3>
                <ul className="mt-2 space-y-1">
                  <li>• Browser Back/Forward: core time machine</li>
                  <li>• ←/B and →: in-game shortcut keys</li>
                  <li>• Enter: run recommended action</li>
                  <li>• A: reset to briefing</li>
                </ul>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
                <h3 className="font-semibold text-slate-900">Room map</h3>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                  {ROUTE_GRAPH_ORDER.map((room) => (
                    <Pill key={room}>{toTitleCase(room)}</Pill>
                  ))}
                </div>
              </section>
            </aside>
          </main>
        )}
      </div>
    </div>
  );
}
