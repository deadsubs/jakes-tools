const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-haiku-4-5-20251001";

function fallbackCommentary(raceName, season, winnerName) {
  return raceName + " " + season + " delivered another chapter of the season. " + (winnerName || "The winner") + " took the chequered flag after a competitive race. The result shakes up the championship order as the calendar moves on.";
}

function buildUserMessage(body) {
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
  const getTeam = (id) => teams.find((t) => t.id === id);
  const raceName = (raceResult && (raceResult.name || raceResult.raceName)) || ("Round " + round);

  const top5Quali = qualifyingOrder.slice(0, 5).map((id, i) => (i + 1) + ". " + ((getDriver(id) || {}).name || id)).join(", ") || "—";

  const winner = raceResult && raceResult.results && raceResult.results[0];
  const winnerName = winner ? (getDriver(winner.driverId) || {}).name || null : null;
  const winnerTeam = winner ? (getTeam(winner.teamId) || {}).name || null : null;
  const qualiPosWinner = winner ? qualifyingOrder.indexOf(winner.driverId) + 1 : "—";

  const results = (raceResult && raceResult.results) || [];
  const p1Name = results[0] ? (getDriver(results[0].driverId) || {}).name || "—" : "—";
  const p2Name = results[1] ? (getDriver(results[1].driverId) || {}).name || "—" : "—";
  const p3Name = results[2] ? (getDriver(results[2].driverId) || {}).name || "—" : "—";

  const top10 = results.slice(0, 10).map((r, i) => (i + 1) + ". " + ((getDriver(r.driverId) || {}).name || r.driverId) + " (" + ((getTeam(r.teamId) || {}).name || "") + ")").join("; ") || "—";
  const dnfs = results.filter((r) => r.dnf).map((r) => ((getDriver(r.driverId) || {}).name || r.driverId) + (r.dnfReason ? " (" + r.dnfReason + ")" : "")).join("; ") || "None";

  const weather = raceResult && raceResult.weather ? raceResult.weather.charAt(0).toUpperCase() + raceResult.weather.slice(1) : "Dry";
  const safetyCar = raceResult && raceResult.safetyCarDeployed ? "yes" : "no";

  const biggestMoverId = raceResult && raceResult.biggestMover;
  const biggestMoverName = biggestMoverId ? (getDriver(biggestMoverId) || {}).name || "—" : "—";
  const overtakeCount = (raceResult && raceResult.overtakeCount) || {};
  const biggestMoverGain = biggestMoverId ? (overtakeCount[biggestMoverId] || 0) : 0;

  const driverOfDayId = (raceResult && raceResult.driverOfDay) || biggestMoverId;
  const driverOfDayName = driverOfDayId ? (getDriver(driverOfDayId) || {}).name || "—" : "—";

  const focusResult = focusDriverId ? results.find((r) => r.driverId === focusDriverId) : null;
  const focusName = focusDriverId ? (getDriver(focusDriverId) || {}).name || "—" : "—";
  const focusQualiPos = focusDriverId ? qualifyingOrder.indexOf(focusDriverId) + 1 : "—";
  const focusFinishPos = focusResult ? focusResult.position : "—";

  const leader = driverStandings[0];
  const leaderName = leader ? (getDriver(leader.driverId) || {}).name || "—" : "—";
  const leaderPts = leader ? leader.points || 0 : 0;
  const p2standing = driverStandings[1];
  const p2standingName = p2standing ? (getDriver(p2standing.driverId) || {}).name || "—" : "—";
  const p2standingPts = p2standing ? p2standing.points || 0 : 0;

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
    "Write exactly 2 paragraphs, max 180 words total.";
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ commentary: fallbackCommentary("Race", new Date().getFullYear(), null) }, { status: 200 });
  }

  const systemPrompt = "You are an F1 race commentator writing for a simulator app in the style of Sky Sports F1. Be dramatic, specific, and engaging. Reference real F1 storytelling tropes. Always mention the race winner, key battles, and championship implications.";

  const userContent = buildUserMessage(body);
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const raceName = (body.raceResult && (body.raceResult.name || body.raceResult.raceName)) || ("Round " + (body.round || "?"));
  const winnerRaw = body.raceResult && body.raceResult.results && body.raceResult.results[0];
  const winnerName = winnerRaw ? ((body.drivers || []).find((d) => d.id === winnerRaw.driverId) || {}).name || null : null;

  if (!apiKey) {
    return Response.json({ commentary: fallbackCommentary(raceName, body.season || new Date().getFullYear(), winnerName) }, { status: 200 });
  }

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
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) {
      return Response.json({ commentary: fallbackCommentary(raceName, body.season || new Date().getFullYear(), winnerName) }, { status: 200 });
    }

    const data = await res.json();
    const textBlock = data.content && data.content.find((c) => c.type === "text");
    const text = textBlock && textBlock.text;
    const commentary = typeof text === "string" && text.trim() ? text.trim() : fallbackCommentary(raceName, body.season || new Date().getFullYear(), winnerName);
    return Response.json({ commentary });
  } catch {
    return Response.json({ commentary: fallbackCommentary(raceName, (body && body.season) || new Date().getFullYear(), winnerName) }, { status: 200 });
  }
}