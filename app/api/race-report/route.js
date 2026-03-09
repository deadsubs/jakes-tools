const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-haiku-4-5-20251001";

// ─── DNF NARRATIVES — keyed to exact strings from simulationEngine.js ────
// Keys: "Power unit" | "Hydraulics" | "Collision" | "Brake failure" | "Suspension" | "Gearbox"
const DNF_NARRATIVES = {
  "Power unit": [
    "{name} was cruising when the power unit let go on lap {lap}, smoke pouring from the back of the car as they coasted to a halt.",
    "A catastrophic power unit failure ended {name}'s race on lap {lap}, the engine giving up in a cloud of white smoke.",
    "{name} lost drive on lap {lap} — the power unit had reached its limit and there was nothing the team could do.",
  ],
  "Hydraulics": [
    "{name} reported a hydraulics warning over the radio before parking on lap {lap}, the car undriveable without steering assistance.",
    "Hydraulic failure on lap {lap} brought {name}'s race to a premature end, the car losing all assistance mid-corner.",
    "{name} was forced to retire on lap {lap} after hydraulics failure — a cruel blow after a strong opening stint.",
  ],
  "Collision": [
    "{name} was involved in a collision on lap {lap} that left terminal damage to the front suspension, ending their afternoon.",
    "Contact with a rival on lap {lap} sent {name} into the barriers — the race over on the spot.",
    "{name} was punted into a spin on lap {lap}, the resulting damage too severe to continue.",
  ],
  "Brake failure": [
    "{name} overshot the braking zone on lap {lap} — the brakes had failed completely, leaving them no option but to retire.",
    "Brake failure on lap {lap} ended {name}'s race dramatically, the car struggling to slow through the chicane.",
    "{name} reported fading brakes before retiring on lap {lap}, the team unable to resolve the issue remotely.",
  ],
  "Suspension": [
    "{name} hit a kerb too aggressively on lap {lap} and broke the front suspension, bringing the car to a standstill.",
    "Suspension failure on lap {lap} ended {name}'s race — likely caused by debris picked up earlier in the grand prix.",
    "{name} limped back to the pits on lap {lap} with terminal suspension damage after a snap moment through the high-speed section.",
  ],
  "Gearbox": [
    "{name} was stuck in gear on lap {lap} and had no choice but to retire, the gearbox giving up without warning.",
    "A gearbox failure on lap {lap} ruined what had been a solid afternoon for {name}.",
    "{name} reported an inability to change gear on lap {lap} before pulling off — a frustrating retirement from a points-paying position.",
  ],
};

function getDnfNarrative(reason, driverName, lap) {
  const pool = DNF_NARRATIVES[reason];
  const lapStr = lap ? String(lap) : "an early";
  if (!pool) {
    return driverName + " was forced to retire on lap " + lapStr + ", the team opting not to risk further damage to the car.";
  }
  const template = pool[Math.floor(Math.random() * pool.length)];
  return template.replace("{name}", driverName).replace("{lap}", lapStr);
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── WEATHER OPENERS ─────────────────────────────────────────────────────
const WEATHER_OPENERS = {
  wet: [
    "Rain transformed the race into a lottery, with tyre strategy and nerve separating the contenders from the pretenders.",
    "The heavens opened over the circuit and with it came chaos — exactly the kind of race that rewrites the championship order.",
    "A soaking wet track from lights-out meant the timing of the switch to slicks would prove everything today.",
  ],
  mixed: [
    "A drying circuit caught several teams completely wrong-footed on tyre strategy, the timing of the switch to slicks proving decisive.",
    "Mixed conditions created a strategic minefield — reading the track was everything, and not everyone got it right.",
    "The changeable weather kept every engineer guessing, and it was those who committed to slicks earliest who emerged on top.",
  ],
  dry: [
    "Under blue skies, it was as close to a pure test of pace as Formula 1 allows — and the result tells its own story.",
    "Dry conditions placed the emphasis squarely on strategy and tyre management, and the teams who executed perfectly were rewarded.",
    "Perfect racing conditions greeted the drivers, but perfection on the track itself proved far harder to come by.",
  ],
};

const SC_LINES = [
  "The safety car deployment on lap {lap} proved pivotal — compressing the field and handing some a lifeline while ending the hopes of others.",
  "A safety car on lap {lap} reshuffled the pack entirely, forcing snap tyre decisions that would shape the rest of the race.",
  "The virtual safety car intervention on lap {lap} gifted track position to those who had not yet pitted, turning the strategy on its head.",
];

// ─── BUILD FALLBACK REPORT ────────────────────────────────────────────────
function buildFallbackReport(body) {
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
  const getTeam   = (id) => teams.find((t) => t.id === id);

  const results    = (raceResult && raceResult.results) || [];
  const weather    = (raceResult && raceResult.weather) || "dry";
  const hasSC      = raceResult && raceResult.safetyCarDeployed;
  const totalLaps  = (raceResult && raceResult.totalLaps) || 57;
  // dnfLapByDriver may or may not be serialised — fall back gracefully
  const dnfLapByDriver = (raceResult && raceResult.dnfLapByDriver) || {};

  const winner         = results[0];
  const p2             = results[1];
  const p3             = results[2];
  const winnerName     = winner ? (getDriver(winner.driverId) || {}).name || "The winner" : "The winner";
  const winnerTeam     = winner ? (getTeam(winner.teamId)     || {}).name || "" : "";
  const p2Name         = p2     ? (getDriver(p2.driverId)     || {}).name || "" : "";
  const p3Name         = p3     ? (getDriver(p3.driverId)     || {}).name || "" : "";
  const qualiPosWinner = winner  ? qualifyingOrder.indexOf(winner.driverId) + 1 : 0;

  const dnfDrivers     = results.filter((r) => r.dnf);
  const overtakeCount  = (raceResult && raceResult.overtakeCount) || {};
  const driverOfDayId  = (raceResult && raceResult.driverOfDay) || (raceResult && raceResult.biggestMover);
  const driverOfDayName      = driverOfDayId ? (getDriver(driverOfDayId) || {}).name || null : null;
  const driverOfDayGain      = driverOfDayId ? (overtakeCount[driverOfDayId] || 0) : 0;
  const driverOfDayStartPos  = driverOfDayId ? qualifyingOrder.indexOf(driverOfDayId) + 1 : 0;
  const driverOfDayFinish    = driverOfDayId ? (results.find((r) => r.driverId === driverOfDayId) || {}).position : null;

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

  // Estimate a plausible safety car lap (roughly 1/3 into the race)
  const scLap = Math.round(totalLaps * (0.25 + Math.random() * 0.25));

  // ── Sentence list — each becomes its own line with icon in the UI ──────
  const sentences = [];

  // Weather opener
  sentences.push(pick(WEATHER_OPENERS[weather] || WEATHER_OPENERS.dry));

  // Winner story
  if (qualiPosWinner === 1) {
    sentences.push(
      winnerName + " converted pole position into victory with a controlled drive" +
      (winnerTeam ? " for " + winnerTeam : "") +
      (p2Name ? ", keeping " + p2Name + " at arm's length throughout." : ".")
    );
  } else if (qualiPosWinner >= 2 && qualiPosWinner <= 5) {
    sentences.push(
      "Starting from P" + qualiPosWinner + ", " + winnerName + " produced a masterful drive to claim the win" +
      (winnerTeam ? " for " + winnerTeam : "") +
      (p2Name && p3Name ? " — " + p2Name + " and " + p3Name + " completing a closely-fought podium." : ".")
    );
  } else if (qualiPosWinner > 5) {
    sentences.push(
      "Few would have predicted a win for " + winnerName + " from P" + qualiPosWinner + " on the grid" +
      (winnerTeam ? ", but " + winnerTeam + " executed a flawless race strategy" : "") +
      (p2Name ? " to head " + p2Name + " at the chequered flag." : ".")
    );
  } else {
    sentences.push(winnerName + " took victory" + (winnerTeam ? " for " + winnerTeam : "") + ".");
  }

  // Safety car
  if (hasSC) {
    const scTemplate = pick(SC_LINES);
    sentences.push(scTemplate.replace("{lap}", String(scLap)));
  }

  // DNFs — one sentence per retirement with lap number
  for (const dnfResult of dnfDrivers) {
    const dnfDriverName = (getDriver(dnfResult.driverId) || {}).name;
    if (!dnfDriverName) continue;
    const lap = dnfLapByDriver[dnfResult.driverId] || null;
    sentences.push(getDnfNarrative(dnfResult.dnfReason, dnfDriverName, lap));
  }

  // Driver of the day
  if (driverOfDayName && driverOfDayGain > 2 && driverOfDayStartPos > 0 && driverOfDayFinish) {
    sentences.push(
      driverOfDayName + " was the standout performer, charging from P" +
      driverOfDayStartPos + " to P" + driverOfDayFinish +
      " to earn Driver of the Day honours."
    );
  } else if (driverOfDayName && driverOfDayFinish) {
    sentences.push(driverOfDayName + " earned the Driver of the Day award with an energetic and consistent display.");
  }

  // Focus driver (if not the winner)
  if (focusName && winner && focusDriverId !== winner.driverId) {
    if (focusDnf) {
      const focusDnfResult = results.find((r) => r.driverId === focusDriverId);
      const lap = dnfLapByDriver[focusDriverId] || null;
      sentences.push(getDnfNarrative(focusDnfResult && focusDnfResult.dnfReason, focusName, lap));
    } else if (focusFinish && focusQualiPos) {
      const moved = focusQualiPos - focusFinish;
      if (moved > 2) {
        sentences.push(
          focusName + " delivered a strong race, moving from P" + focusQualiPos +
          " in qualifying to cross the line P" + focusFinish + "."
        );
      } else if (moved < -2) {
        sentences.push(
          focusName + " struggled to match their qualifying pace, slipping from P" +
          focusQualiPos + " to finish P" + focusFinish + "."
        );
      } else {
        sentences.push(
          focusName + " finished P" + focusFinish +
          " having started from P" + focusQualiPos + " on the grid."
        );
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
    } else if (champP2Name) {
      sentences.push(
        champLeaderName + " extends their championship lead to " + champGap + " points over " +
        champP2Name + " as the season heads into its " +
        (round < totalRounds / 2 ? "early phase." : round < totalRounds * 0.75 ? "crucial middle stretch." : "final stages.")
      );
    }
  }

  // Join with double newline so the UI can split on \n\n OR sentence boundaries
  return sentences.join("\n\n");
}

// ─── AI PROMPT ────────────────────────────────────────────────────────────
function buildUserMessage(body) {
  const {
    raceResult, qualifyingOrder = [], season, round, totalRounds = 24,
    driverStandings = [], focusDriverId, drivers = [], teams = [],
  } = body;

  const getDriver = (id) => drivers.find((d) => d.id === id);
  const getTeam   = (id) => teams.find((t) => t.id === id);
  const raceName  = (raceResult && (raceResult.name || raceResult.raceName)) || ("Round " + round);
  const totalLaps = (raceResult && raceResult.totalLaps) || 57;
  const dnfLapByDriver = (raceResult && raceResult.dnfLapByDriver) || {};

  const top5Quali = qualifyingOrder.slice(0, 5).map((id, i) => (i + 1) + ". " + ((getDriver(id) || {}).name || id)).join(", ") || "—";

  const winner         = raceResult && raceResult.results && raceResult.results[0];
  const winnerName     = winner ? (getDriver(winner.driverId) || {}).name || null : null;
  const winnerTeam     = winner ? (getTeam(winner.teamId)     || {}).name || null : null;
  const qualiPosWinner = winner ? qualifyingOrder.indexOf(winner.driverId) + 1 : "—";

  const results = (raceResult && raceResult.results) || [];
  const top10   = results.slice(0, 10).map((r, i) => (i + 1) + ". " + ((getDriver(r.driverId) || {}).name || r.driverId) + " (" + ((getTeam(r.teamId) || {}).name || "") + ")").join("; ") || "—";
  const dnfs    = results.filter((r) => r.dnf).map((r) => {
    const name = (getDriver(r.driverId) || {}).name || r.driverId;
    const lap  = dnfLapByDriver[r.driverId] ? " on lap " + dnfLapByDriver[r.driverId] : "";
    return name + (r.dnfReason ? " — " + r.dnfReason + lap : lap);
  }).join("; ") || "None";

  const weather   = raceResult && raceResult.weather ? raceResult.weather.charAt(0).toUpperCase() + raceResult.weather.slice(1) : "Dry";
  const safetyCar = raceResult && raceResult.safetyCarDeployed ? "yes" : "no";

  const overtakeCount    = (raceResult && raceResult.overtakeCount) || {};
  const biggestMoverId   = raceResult && raceResult.biggestMover;
  const biggestMoverName = biggestMoverId ? (getDriver(biggestMoverId) || {}).name || "—" : "—";
  const biggestMoverGain = biggestMoverId ? (overtakeCount[biggestMoverId] || 0) : 0;
  const driverOfDayId    = (raceResult && raceResult.driverOfDay) || biggestMoverId;
  const driverOfDayName  = driverOfDayId ? (getDriver(driverOfDayId) || {}).name || "—" : "—";

  const focusResult    = focusDriverId ? results.find((r) => r.driverId === focusDriverId) : null;
  const focusName      = focusDriverId ? (getDriver(focusDriverId) || {}).name || "—" : "—";
  const focusQualiPos  = focusDriverId ? qualifyingOrder.indexOf(focusDriverId) + 1 : "—";
  const focusFinishPos = focusResult   ? focusResult.position : "—";

  const leader         = driverStandings[0];
  const leaderName     = leader ? (getDriver(leader.driverId) || {}).name || "—" : "—";
  const leaderPts      = leader ? leader.points || 0 : 0;
  const p2standing     = driverStandings[1];
  const p2standingName = p2standing ? (getDriver(p2standing.driverId) || {}).name || "—" : "—";
  const p2standingPts  = p2standing ? p2standing.points || 0 : 0;

  return "Write a race report for the " + raceName + ", Round " + round + " of " + totalRounds + ", " + season + " F1 season.\n\n" +
    "Total race laps: " + totalLaps + "\n" +
    "Qualifying top 5: " + top5Quali + "\n" +
    "Race winner: " + (winnerName || "—") + " (" + (winnerTeam || "—") + ") from P" + qualiPosWinner + "\n" +
    "Top 10: " + top10 + "\n" +
    "DNFs (with lap and reason): " + dnfs + "\n" +
    "Weather: " + weather + "\n" +
    "Safety car deployed: " + safetyCar + "\n" +
    "Biggest mover: " + biggestMoverName + " (+" + biggestMoverGain + " positions)\n" +
    "Driver of the day: " + driverOfDayName + "\n" +
    "Focus driver " + focusName + ": started P" + focusQualiPos + ", finished P" + focusFinishPos + "\n" +
    "Championship: " + leaderName + " leads on " + leaderPts + "pts, " + p2standingName + " on " + p2standingPts + "pts\n\n" +
    "Write 5-7 short punchy sentences. Each sentence on its own line separated by a blank line. " +
    "Cover: race opening, winner story, each DNF with its cause and lap number, biggest mover, focus driver result, championship implication. " +
    "Do not use italics. Do not use bullet points. No preamble.";
}

// ─── HANDLER ─────────────────────────────────────────────────────────────
export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ commentary: "Race report unavailable." }, { status: 200 }); }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return Response.json({ commentary: buildFallbackReport(body) }, { status: 200 });
  }

  const systemPrompt = "You are an F1 race commentator writing for a simulator app in the style of Sky Sports F1. Be dramatic, specific, and concise. Each sentence should be its own paragraph. Reference the exact DNF causes, lap numbers, and championship gaps provided. No italics, no bullet points.";

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
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: "user", content: buildUserMessage(body) }],
      }),
    });

    if (!res.ok) return Response.json({ commentary: buildFallbackReport(body) }, { status: 200 });

    const data      = await res.json();
    const textBlock = data.content && data.content.find((c) => c.type === "text");
    const text      = textBlock && textBlock.text;
    const commentary = typeof text === "string" && text.trim() ? text.trim() : buildFallbackReport(body);
    return Response.json({ commentary });
  } catch {
    return Response.json({ commentary: buildFallbackReport(body) }, { status: 200 });
  }
}
