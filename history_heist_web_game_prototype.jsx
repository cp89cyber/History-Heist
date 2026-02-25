import React, { useEffect, useMemo, useRef, useState } from "react";

const ROUTES = {
  LOBBY: "/lobby",
  GALLERY: "/gallery",
  ARCHIVE: "/archive",
  WORKSHOP: "/workshop",
  EXIT: "/exit",
};

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

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm">
      {children}
    </span>
  );
}

function Button({ children, onClick, variant = "primary", disabled = false }) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition active:scale-[0.99]";
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : variant === "secondary"
        ? "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50"
        : "bg-slate-100 text-slate-900 hover:bg-slate-200";

  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`${base} ${styles} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      type="button"
    >
      {children}
    </button>
  );
}

function RoomCard({ title, children }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
      <div className="text-lg font-semibold text-slate-900">{title}</div>
      <div className="mt-3 text-slate-700 leading-relaxed">{children}</div>
    </div>
  );
}

function Log({ items }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
      <div className="text-sm font-semibold text-slate-900">Museum notes</div>
      {items.length === 0 ? (
        <div className="mt-2 text-sm text-slate-600">No notes yet. The museum is judging you silently.</div>
      ) : (
        <ul className="mt-2 space-y-2 text-sm text-slate-700">
          {items.slice(0, 8).map((x, i) => (
            <li key={`${i}-${x}`} className="flex gap-2">
              <span className="text-slate-400">•</span>
              <span>{x}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
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

  const [route, setRoute] = useState(initial.route);
  const [timeline, setTimeline] = useState(initial.timeline);
  const [persistent, setPersistent] = useState(DEFAULT_PERSISTENT);
  const [steps, setSteps] = useState(0);
  const [hintOpen, setHintOpen] = useState(false);
  const [log, setLog] = useState(() => [
    "Tip: this game treats your browser back and forward buttons like a time machine.",
  ]);

  const stepsRef = useRef(0);
  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  const canOpenParadoxDoor = persistent.cachedKey && !timeline.keyTaken;

  function pushState(nextRoute, nextTimeline) {
    const st = {
      __historyHeist: true,
      route: nextRoute,
      timeline: nextTimeline,
    };
    window.history.pushState(st, "", `#${nextRoute}`);
    setRoute(nextRoute);
    setTimeline(nextTimeline);
    setSteps((s) => s + 1);
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

  function note(message) {
    setLog((items) => [message, ...items].slice(0, 12));
  }

  useEffect(() => {
    const st = safeHistoryState();
    if (!st || !st.__historyHeist) {
      replaceState(route, timeline);
    }

    const onPop = (e) => {
      const state = e.state;
      const nextRoute = clampRoute(state?.route || clampRoute(parseHashRoute()));
      const nextTimeline = mergeTimeline(state?.timeline);
      setRoute(nextRoute);
      setTimeline(nextTimeline);
      setSteps((s) => s + 1);
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetRun() {
    setPersistent(DEFAULT_PERSISTENT);
    setSteps(0);
    setHintOpen(false);
    setLog([
      "Fresh run. Same museum. Slightly less forgiving carpets.",
      "Tip: this game treats your browser back and forward buttons like a time machine.",
    ]);
    replaceState(ROUTES.LOBBY, DEFAULT_TIMELINE);
  }

  // Room actions
  function takeStamp() {
    if (persistent.hasStamp) return;
    setPersistent((p) => ({ ...p, hasStamp: true }));
    note("You pocketed the CACHE stamp. It feels like a tiny loophole.");
  }

  function takeUnstableKey() {
    if (timeline.keyTaken) {
      note("This timeline already remembers you touching the key. The velvet rope is not impressed.");
      return;
    }

    mutateTimeline((t) => ({ ...t, keyTaken: true, hasKey: true }));
    note("You grabbed the unstable key. The timeline now has opinions.");
  }

  function stampKeyIntoCache() {
    if (!persistent.hasStamp) {
      note("You need the stamp before you can cache anything.");
      return;
    }

    if (!timeline.hasKey) {
      note("No key in hand. No paradox. No fun.");
      return;
    }

    if (persistent.cachedKey) {
      note("You already cached a key. The museum is filing duplicate tickets.");
      return;
    }

    setPersistent((p) => ({ ...p, cachedKey: true }));
    mutateTimeline((t) => ({ ...t, hasKey: false, stampedOnce: true }));
    note("Thunk. A perfect copy of the key is now in cache. Your original key goes back on the pedestal.");
  }

  function openParadoxDoor() {
    if (!canOpenParadoxDoor) {
      note("The Paradox Door stays shut. It only opens if you have a cached key and this timeline is still untouched.");
      return;
    }

    pushState(ROUTES.EXIT, timeline);
    note("The Paradox Door clicked open like a browser tab you did not mean to close.");
  }

  const timelineLabel = !timeline.keyTaken ? "untouched" : "disturbed";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xl font-semibold">History Heist</div>
              <div className="text-sm text-slate-600">
                A web puzzle where the browser back button is your time machine.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => window.history.back()}>
                Back
              </Button>
              <Button variant="secondary" onClick={() => window.history.forward()}>
                Forward
              </Button>
              <Button variant="tertiary" onClick={resetRun}>
                New run
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Pill>Route: {route}</Pill>
            <Pill>Timeline: {timelineLabel}</Pill>
            <Pill>Steps: {steps}</Pill>
            <Pill>
              Persistent: {persistent.hasStamp ? "stamp" : "no stamp"}
              {" · "}
              {persistent.cachedKey ? "cached key" : "no cached key"}
            </Pill>
            <Pill>
              In hand: {timeline.hasKey ? "unstable key" : "empty"}
            </Pill>
          </div>

          <div className="text-sm text-slate-600">
            Use links to move. Use Back to time travel. Persistent items survive time travel.
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            {route === ROUTES.LOBBY && (
              <RoomCard title="Lobby">
                <p>
                  Every door in this museum is a URL. The Paradox Door only opens if you have the cached key in your pocket,
                  and you have never touched the original key in this timeline.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => navigate(ROUTES.GALLERY)}>
                    Walk to the Gallery
                  </Button>
                  <Button variant="secondary" onClick={() => navigate(ROUTES.ARCHIVE)}>
                    Walk to the Archive
                  </Button>
                  <Button onClick={openParadoxDoor} disabled={!canOpenParadoxDoor}>
                    Open the Paradox Door
                  </Button>
                </div>

                {!canOpenParadoxDoor && (
                  <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">What the door wants</div>
                    <ul className="mt-2 space-y-1">
                      <li>1) A cached key (it survives time travel)</li>
                      <li>2) A timeline where the key is still untouched</li>
                    </ul>
                  </div>
                )}

                <div className="mt-4">
                  <Button variant="tertiary" onClick={() => setHintOpen((v) => !v)}>
                    {hintOpen ? "Hide hint" : "Need a hint"}
                  </Button>
                  {hintOpen && (
                    <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">Hint</div>
                      <div className="mt-2">
                        Get the stamp, take the unstable key, cache it in the Workshop, then use Back until the timeline is
                        untouched again and try the Paradox Door.
                      </div>
                    </div>
                  )}
                </div>
              </RoomCard>
            )}

            {route === ROUTES.GALLERY && (
              <RoomCard title="Gallery">
                <p>
                  A quiet hallway of framed browser history. On a pedestal sits a rubber stamp that reads CACHE. It looks
                  like it belongs to a developer who got tired of losing progress.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={takeStamp} disabled={persistent.hasStamp}>
                    {persistent.hasStamp ? "Stamp acquired" : "Take the CACHE stamp"}
                  </Button>
                  <Button variant="secondary" onClick={() => navigate(ROUTES.WORKSHOP)}>
                    Head to the Workshop
                  </Button>
                  <Button variant="secondary" onClick={() => navigate(ROUTES.LOBBY)}>
                    Back to the Lobby
                  </Button>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
                  Persistent items are special. Once you have them, Back will not take them away.
                </div>
              </RoomCard>
            )}

            {route === ROUTES.ARCHIVE && (
              <RoomCard title="Archive">
                <p>
                  The unstable key is here, behind a velvet rope. Touching it stains the current timeline forever. The museum
                  really prefers keys that behave.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={takeUnstableKey} disabled={timeline.keyTaken}>
                    {timeline.keyTaken ? "Key already touched in this timeline" : "Take the unstable key"}
                  </Button>
                  <Button variant="secondary" onClick={() => navigate(ROUTES.WORKSHOP)}>
                    Go to the Workshop
                  </Button>
                  <Button variant="secondary" onClick={() => navigate(ROUTES.LOBBY)}>
                    Back to the Lobby
                  </Button>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
                  The key in your hand is unstable, meaning it belongs to this timeline. A cached copy would survive Back.
                </div>
              </RoomCard>
            )}

            {route === ROUTES.WORKSHOP && (
              <RoomCard title="Workshop">
                <p>
                  A stamping press thumps softly. It can copy an object into cache. Copies persist across time travel, even
                  when you rewind past the moment you picked them up.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    onClick={stampKeyIntoCache}
                    disabled={!persistent.hasStamp || !timeline.hasKey || persistent.cachedKey}
                  >
                    Stamp the key into cache
                  </Button>
                  <Button variant="secondary" onClick={() => navigate(ROUTES.ARCHIVE)}>
                    Return to the Archive
                  </Button>
                  <Button variant="secondary" onClick={() => navigate(ROUTES.LOBBY)}>
                    Back to the Lobby
                  </Button>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
                  Requirements: stamp + key in hand. Result: cached key stays with you, but this timeline will still remember
                  you touched the original.
                </div>
              </RoomCard>
            )}

            {route === ROUTES.EXIT && (
              <RoomCard title="Exit">
                <p>
                  You slipped out through a door that technically should not exist in your personal timeline. The museum will
                  recover. Eventually.
                </p>

                <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">Your run</div>
                  <div className="mt-1">Steps taken: {stepsRef.current}</div>
                  <div className="mt-1">Paradox rating: tasteful</div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={resetRun}>Play again</Button>
                  <Button variant="secondary" onClick={() => navigate(ROUTES.LOBBY)}>
                    Visit the Lobby
                  </Button>
                </div>
              </RoomCard>
            )}
          </div>

          <div className="space-y-4">
            <Log items={log} />

            <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
              <div className="text-sm font-semibold text-slate-900">Why this is a web game</div>
              <div className="mt-2 text-sm text-slate-700 leading-relaxed">
                The core mechanic is your browser history. Moving forward creates new timeline entries. Going back rewinds the
                timeline state, while persistent items remain. It is a puzzle built for the address bar.
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
              <div className="text-sm font-semibold text-slate-900">If you want to expand it</div>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                <li>• Add more rooms that only unlock in specific timeline states</li>
                <li>• Introduce a second persistent tool, like a bookmark that pins one timeline fact</li>
                <li>• Add a daily challenge seed so everyone gets the same museum layout each day</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-slate-500">
          Pro tip: the real browser Back button is the intended control. The on screen buttons are just training wheels.
        </div>
      </div>
    </div>
  );
}
