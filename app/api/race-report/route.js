const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-haiku-4-5-20251001";

// ─── DNF CAUSE NARRATIVES ─────────────────────────────────────────────────
const DNF_NARRATIVES = {
  "engine failure":    [
    "suffered a catastrophic engine failure, smoke billowing from the rear of the car as they coasted to the gravel.",
    "was forced to park up after the power unit gave up spectacularly, ending what had been a promising afternoon.",
    "lost drive on the main straight, the engine letting go in a plume of white smoke.",
  ],
  "hydraulics":        [
    "was in contention before hydraulic failure brought a premature end to their race.",
    "pulled off with a hydraulics issue, the car undriveable with no steering assistance.",
    "parked the car at Turn 3 after a hydraulics warning proved terminal.",
  ],
  "gearbox":           [
    "was stuck in gear and forced to retire, a gearbox failure ruining an otherwise solid afternoon.",
    "lost the ability to change gear mid-race, limping back to the pits before stepping out of the car.",
    "suffered a sudden gearbox failure that left the team with no option but to retire the car.",
  ],
  "collision":         [
    "was punted into a spin by a rival and could not continue, the front wing folding into the tyre.",
    "made contact with another car and suffered terminal suspension damage, retiring on the spot.",
    "was collected in a multi-car incident and their race was over before the dust had settled.",
  ],
  "puncture":          [
    "suffered a dramatic tyre failure at high speed, limping back to the pits with a destroyed rim.",
    "had a front-left blow out at the worst possible moment, losing several positions before recovering to the garage.",
    "was unlucky with a puncture that ended their race — a blowout at speed that destroyed the floor.",
  ],
  "suspension":        [
    "hit the kerbs too aggressively and broke the front suspension, bringing the car to a stop.",
    "returned to the pits with terminal suspension damage after an off at the high-speed chicane.",
    "suffered a suspension failure, likely caused by debris earlier in the race.",
  ],
  "brakes":            [
    "overran the chicane under braking and retired with brake failure — a dramatic end to their afternoon.",
    "had no brakes into Turn 1 and was forced to take to the run-off, retiring shortly after.",
    "suffered brake problems that progressively worsened before the team called them in for good.",
  ],
  "electrical":        [
    "ground to a halt with an electrical issue, the team unable to diagnose the fault remotely.",
    "had a mysterious electrical failure mid-race, losing all power and coasting to a standstill.",
    "retired with an electrical gremlin — a frustrating end after a strong qualifying performance.",
  ],
};

function getDnfNarrative(reason, driverName) {
  const key = reason ? Object.keys(DNF_NARRATIVES).find((k) => reason.toLowerCase().includes(k)) : null;
  const pool = key ? DNF_NARRATIVES[key] : [
    "retired from the race, the team opting not to risk further damage.",
    "was forced to park the car — a disappointing retirement that leaves points on the table.",
    "pulled into the garage and did not return, the cause under investigation.",
  ];
  const line = pool[Math.floor(Math.random() * pool.length)];
  return driverName + " " + line;
}

// ─── PICK ONE FROM ARRAY ──────────────────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── WEATHER OPENERS ─────────────────────────────────────────────────────
const WEATHER_OPENERS = {
  wet:   [
    "Rain transformed the race into a lottery, with strategy and nerve separating the contenders from the pretenders.",
    "A wet track from lights-out meant tyre strategy was the name of the game, and not everyone got it right.",
    "The heavens opened over the circuit and with it came chaos — exactly the kind of race that rewrites the championship order.",
  ],
  mixed: [
    "A drying circuit caught several teams out on tyre strategy, the timing of the switch to slicks proving decisive.",
    "Mixed conditions created a strategic minefield, with some teams reading the track perfectly and others caught completely wrong-footed.",
    "The changeable weather kept every engineer guessing — timing the move to intermediates was everything today.",
  ],
  dry:   [
    "Under blue skies, it was as close to a pure test of pace as Formula 1 allows — and the result tells its own story.",
    "Dry conditions meant strategy was always going to play a role, but it was outright pace that ultimately decided the podium.",
    "Perfect racing conditions greeted the drivers, but perfection on track was far harder to come by.",
  ],
};

// ─── SAFETY CAR LINES ────────────────────────────────────────────────────
const SC_LINES = [
  "The safety car proved a pivotal moment — it reshuffled the pack and handed some a lifeline while ending the hopes of others.",
  "A safety car period compressed the field and handed the strategists a headache, with several teams forced into snap decisions.",
  "The virtual safety car intervention changed the complexion of the race entirely, gifting track position to those who hadn't yet pitted.",
];

// ─── BUILD THE FALLBACK REPORT ────────────────────────────────────────────
function buildFallbackReport(body) {
  const {
    raceResult,
    qualifyingOrder = [],
    season,
    round,
    totalRounds = 24,
    driverStandings = [],
    previousRaceWinner,
    focusDriverId,
    drivers = [],
    teams = [],
  } = body;

  const getDriver = (id) => drivers.find((d) => d.id === id);
  const getTeam   = (id) => teams.find((t)   => t.id === id);

  const results  = (raceResult && raceResult.results) || [];
  const weather  = (raceResult && raceResult.weather) || "dry";
  const hasSC    = raceResult && raceResult.safetyCarDeployed;
  const raceName = (raceResult && (raceResult.name || raceResult.raceName)) || ("Round " + round);

  const winner      = results[0];
  const p2          = results[1];
  const p3          = results[2];
  const winnerName  = winner ? (getDriver(winner.driverId) || {}).name || "The winner" : "The winner";
  const winnerTeam  = winner ? (getTeam(winner.teamId)     || {}).name || ""           : "";
  const p2Name      = p2     ? (getDriver(p2.driverId)     || {}).name || ""           : "";
  const p3Name      = p3     ? (getDriver(p3.driverId)     || {}).name || ""           : "";
  const qualiPosWinner = winner ? qualifyingOrder.indexOf(winner.driverId) + 1 : 0;

  const dnfDrivers = results.filter((r) => r.dnf);
  const biggestMoverId = raceResult && raceResult.biggestMover;
  const overtakeCount  = (raceResult && raceResult.overtakeCount) || {};
  const driverOfDayId  = (raceResult && raceResult.driverOfDay) || biggestMoverId;
  const driverOfDayName = driverOfDayId ? (getDriver(driverOfDayId) || {}).name || null : null;
  const driverOfDayGain = driverOfDayId ? (overtakeCount[driverOfDayId] || 0) : 0;
  const driverOfDayStartPos = driverOfDayId ? qualifyingOrder.indexOf(driverOfDayId) + 1 : 0;
  const driverOfDayFinish   = driverOfDayId ? (results.find((r) => r.driverId === driverOfDayId) || {}).position : null;

  const focusResult   = focusDriverId ? results.find((r) => r.driverId === focusDriverId) : null;
  const focusName     = focusDriverId ? (getDriver(focusDriverId) || {}).name || null : null;
  const focusQualiPos = focusDriverId ? qualifyingOrder.indexOf(focusDriverId) + 1 : 0;
  const focusFinish   = focusResult   ? focusResult.position : null;
  const focusDnf      = focusResult   ? focusResult.dnf      : false;

  const champLeader    = driverStandings[0];
  const champP2        = driverStandings[1];
  const champLeaderName = champLeader ? (getDriver(champLeader.driverId) || {}).name || null : null;
  const champLeaderPts  = champLeader ? champLeader.points || 0 : 0;
  const champP2Name     = champP2     ? (getDriver(champP2.driverId)     || {}).name || null : null;
  const champGap        = champLeader && champP2 ? champLeaderPts - (champP2.points || 0) : 0;

  // ── PARAGRAPH 1: race opener + winner story ──────────────────────────
  let p1 = pick(WEATHER_OPENERS[weather] || WEATHER_OPENERS.dry) + " ";

  if (qualiPosWinner === 1) {
    p1 += winnerName + " converted pole into victory with a controlled drive";
    p1 += winnerTeam ? " for " + winnerTeam : "";
    p1 += p2Name ? ", keeping " + p2Name + " at arm's length throughout." : ".";
  } else if (qualiPosWinner > 1 && qualiPosWinner <= 5) {
    p1 += "Starting from P" + qualiPosWinner + ", " + winnerName + " produced a masterful drive to claim the win";
    p1 += winnerTeam ? " for " + winnerTeam : "";
    p1 += p2Name && p3Name
      ? " — " + p2Name + " and " + p3Name + " completing a closely-fought podium."
      : ".";
  } else if (qualiPosWinner > 5) {
    p1 += "Few would have predicted a win for " + winnerName + " from P" + qualiPosWinner + " on the grid";
    p1 += winnerTeam ? ", but " + winnerTeam + " executed a flawless race strategy" : "";
    p1 += p2Name ? " to head " + p2Name + " at the chequered flag." : ".";
  } else {
    p1 += winnerName + " took a dominant victory" + (winnerTeam ? " for " + winnerTeam : "") + ".";
  }

  if (hasSC) p1 += " " + pick(SC_LINES);

  // ── PARAGRAPH 2: incidents, mover, focus driver, championship ────────
  const sentences = [];

  // DNFs
  if (dnfDrivers.length === 1) {
    sentences.push(getDnfNarrative(dnfDrivers[0].dnfReason, (getDriver(dnfDrivers[0].driverId) || {}).name || "One driver"));
  } else if (dnfDrivers.length >= 2) {
    const first  = getDnfNarrative(dnfDrivers[0].dnfReason, (getDriver(dnfDrivers[0].driverId) || {}).name || "One driver");
    const others = dnfDrivers.slice(1).map((r) => (getDriver(r.driverId) || {}).name || "another driver").join(" and ");
    sentences.push(first + " " + others + (dnfDrivers.length === 2 ? " also failed to see the flag." : " and others also retired from the race."));
  }

  // Driver of the day / biggest mover
  if (driverOfDayName && driverOfDayGain > 2 && driverOfDayStartPos > 0 && driverOfDayFinish) {
    sentences.push(
      driverOfDayName + " was the standout performer of the afternoon, charging from P" +
      driverOfDayStartPos + " to P" + driverOfDayFinish + " and picking up Driver of the Day honours."
    );
  } else if (driverOfDayName && driverOfDayFinish) {
    sentences.push(driverOfDayName + " earned the Driver of the Day award with an energetic display.");
  }

  // Focus driver (if not winner and not already mentioned)
  if (focusName && focusDriverId !== (winner && winner.driverId)) {
    if (focusDnf) {
      const focusDnfResult = results.find((r) => r.driverId === focusDriverId);
      sentences.push(getDnfNarrative(focusDnfResult && focusDnfResult.dnfReason, focusName));
    } else if (focusFinish && focusQualiPos) {
      const moved = focusQualiPos - focusFinish;
      if (moved > 2) {
        sentences.push(focusName + " delivered a strong drive, moving from P" + focusQualiPos + " in qualifying to finish P" + focusFinish + " in the race.");
      } else if (moved < -2) {
        sentences.push(focusName + " struggled to replicate their qualifying pace, slipping from P" + focusQualiPos + " to finish P" + focusFinish + ".");
      } else {
        sentences.push(focusName + " finished P" + focusFinish + " having started from P" + focusQualiPos + " on the grid.");
      }
    }
  }

  // Championship update
  if (champLeaderName) {
    if (champGap <= 10 && champP2Name) {
      sentences.push(
        "The championship battle remains knife-edge — " + champLeaderName + " leads " + champP2Name +
        " by just " + champGap + " point" + (champGap === 1 ? "" : "s") + " with " +
        (totalRounds - round) + " round" + (totalRounds - round === 1 ? "" : "s") + " remaining."
      );
    } else if (champLeaderName && champP2Name) {
      sentences.push(
        champLeaderName + " extends their championship advantage to " + champGap + " points over " +
        champP2Name + " as the season heads into its " +
        (round < totalRounds / 2 ? "early phase." : round < totalRounds * 0.75 ? "crucial middle stretch." : "final stages.")
      );
    }
  }

  const p2Text = sentences.join(" ");

  return p1.trim() + "\n\n" + p2Text.trim();
}

// ─── BUILD AI PROMPT (unchanged) ─────────────────────────────────────────
function buildUserMessage(body) {
  const {
    raceResult,
    qualifyingOrder = [],
    season,
    round,
    totalRounds = 24,
    driverStandings = [],
    focusDriverId,
    drivers = [],
    teams = [],
  } = body;

  const getDriver = (id) => drivers.find((d) => d.id === id);
  const getTeam   = (id) => teams.find((t)   => t.id === id);
  const raceName  = (raceResult && (raceResult.name || raceResult.raceName)) || ("Round " + round);

  const top5Quali = qualifyingOrder.slice(0, 5).map((id, i) => (i + 1) + ". " + ((getDriver(id) || {}).name || id)).join(", ") || "—";

  const winner       = raceResult && raceResult.results && raceResult.results[0];
  const winnerName   = winner ? (getDriver(winner.driverId) || {}).name || null : null;
  const winnerTeam   = winner ? (getTeam(winner.teamId)     || {}).name || null : null;
  const qualiPosWinner = winner ? qualifyingOrder.indexOf(winner.driverId) + 1 : "—";

  const results = (raceResult && raceResult.results) || [];
  const p1Name  = results[0] ? (getDriver(results[0].driverId) || {}).name || "—" : "—";
  const p2Name  = results[1] ? (getDriver(results[1].driverId) || {}).name || "—" : "—";
  const p3Name  = results[2] ? (getDriver(results[2].driverId) || {}).name || "—" : "—";
  const top10   = results.slice(0, 10).map((r, i) => (i + 1) + ". " + ((getDriver(r.driverId) || {}).name || r.driverId) + " (" + ((getTeam(r.teamId) || {}).name || "") + ")").join("; ") || "—";
  const dnfs    = results.filter((r) => r.dnf).map((r) => ((getDriver(r.driverId) || {}).name || r.driverId) + (r.dnfReason ? " (" + r.dnfReason + ")" : "")).join("; ") || "None";

  const weather  = raceResult && raceResult.weather ? raceResult.weather.charAt(0).toUpperCase() + raceResult.weather.slice(1) : "Dry";
  const safetyCar = raceResult && raceResult.safetyCarDeployed ? "yes" : "no";

  const biggestMoverId   = raceResult && raceResult.biggestMover;
  const biggestMoverName = biggestMoverId ? (getDriver(biggestMoverId) || {}).name || "—" : "—";
  const overtakeCount    = (raceResult && raceResult.overtakeCount) || {};
  const biggestMoverGain = biggestMoverId ? (overtakeCount[biggestMoverId] || 0) : 0;
  const driverOfDayId    = (raceResult && raceResult.driverOfDay) || biggestMoverId;
  const driverOfDayName  = driverOfDayId ? (getDriver(driverOfDayId) || {}).name || "—" : "—";

  const focusResult    = focusDriverId ? results.find((r) => r.driverId === focusDriverId) : null;
  const focusName      = focusDriverId ? (getDriver(focusDriverId) || {}).name || "—" : "—";
  const focusQualiPos  = focusDriverId ? qualifyingOrder.indexOf(focusDriverId) + 1 : "—";
  const focusFinishPos = focusResult   ? focusResult.position : "—";

  const leader       = driverStandings[0];
  const leaderName   = leader ? (getDriver(leader.driverId) || {}).name || "—" : "—";
  const leaderPts    = leader ? leader.points || 0 : 0;
  const p2standing   = driverStandings[1];
  const p2standingName = p2standing ? (getDriver(p2standing.driverId) || {}).name || "—" : "—";
  const p2standingPts  = p2standing ? p2standing.points || 0 : 0;

  return "Write a race report for the " + raceName + ", Round " + round + " of " + totalRounds + ", " + season + " season.\n\n" +
    "Qualifying: " + top5Quali + "\n" +
    "Race winner: " + (winnerName || "—") + " (" + (winnerTeam || "—") + ") from P" + qualiPosWinner + "\n" +
    "Podium: P1 " + p1Name + ", P2 " + p2Name + ", P3 " + p3Name + "\n" +
    "Top 10: " + top10 + "\n" +
    "DNFs: " + dnfs + "\n" +
    "Weather: " + weather + "\n" +
    "Safety car: " + safetyCar + "\n" +
    "Biggest mover: " + biggestMoverName + " (+" + biggestMoverGain + " positions)\n" +
    "Driver of the day: " + driverOfDayName + "\n" +
    "Focus driver " + focusName + ": started P" + focusQualiPos + ", finished P" + focusFinishPos + "\n" +
    "Championship after round " + round + ": " + leaderName + " leads on " + leaderPts + "pts, " + p2standingName + " on " + p2standingPts + "pts\n\n" +
    "Write exactly 2 paragraphs, max 180 words total. Include specific details about DNF causes, key overtakes, and championship implications.";
}

// ─── HANDLER ─────────────────────────────────────────────────────────────
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ commentary: "Race report unavailable." }, { status: 200 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return Response.json({ commentary: buildFallbackReport(body) }, { status: 200 });
  }

  const systemPrompt = "You are an F1 race commentator writing for a simulator app in the style of Sky Sports F1. Be dramatic, specific, and engaging. Reference real F1 storytelling tropes. Always mention the race winner, key battles, DNF causes, and championship implications.";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: "user", content: buildUserMessage(body) }],
      }),
    });

    if (!res.ok) {
      return Response.json({ commentary: buildFallbackReport(body) }, { status: 200 });
    }

    const data     = await res.json();
    const textBlock = data.content && data.content.find((c) => c.type === "text");
    const text      = textBlock && textBlock.text;
    const commentary = typeof text === "string" && text.trim() ? text.trim() : buildFallbackReport(body);
    return Response.json({ commentary });
  } catch {
    return Response.json({ commentary: buildFallbackReport(body) }, { status: 200 });
  }
}
