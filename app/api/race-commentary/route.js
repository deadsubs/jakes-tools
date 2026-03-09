const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-haiku-4-5-20251001";

function fallbackCommentary(raceName, season, winnerName) {
  return raceName + " " + season + " delivered another chapter of the season. " + (winnerName || "The winner") + " took the chequered flag after a competitive race. The result shakes up the championship order as the calendar moves on.";
}

function buildUserMessage(body) {
  const { raceResult, season, round, driverStandings, previousRaceWinner, focusDriverId, drivers, teams } = body;
  const raceName = (raceResult && (raceResult.name || raceResult.raceName)) || ("Round " + round);
  const getDriver = (id) => (drivers || []).find((d) => d.id === id);
  const getTeam = (id) => (teams || []).find((t) => t.id === id);

  const winner = raceResult && raceResult.results && raceResult.results[0];
  const winnerName = winner ? (getDriver(winner.driverId) || {}).name || null : null;
  const winnerTeam = winner ? (getTeam(winner.teamId) || {}).name || null : null;
  const podium = (raceResult && raceResult.results || []).slice(0, 3).map((r) => (getDriver(r.driverId) || {}).name || r.driverId).join(", ");
  const top10 = (raceResult && raceResult.results || []).slice(0, 10).map((r, i) => (i + 1) + ". " + ((getDriver(r.driverId) || {}).name || r.driverId)).join("; ");
  const dnfs = (raceResult && raceResult.results || []).filter((r) => r.dnf).map((r) => ((getDriver(r.driverId) || {}).name || r.driverId) + (r.dnfReason ? " (" + r.dnfReason + ")" : "")).join("; ") || "None";
  const weather = raceResult && raceResult.weather ? raceResult.weather.charAt(0).toUpperCase() + raceResult.weather.slice(1) : "Dry";
  const safetyCar = raceResult && raceResult.safetyCarDeployed ? "yes" : "no";

  const focusResult = focusDriverId ? (raceResult && raceResult.results || []).find((r) => r.driverId === focusDriverId) : null;
  const focusName = focusDriverId ? (getDriver(focusDriverId) || {}).name || null : null;
  const focusPosition = focusResult ? focusResult.position : "—";

  const leader = driverStandings && driverStandings[0];
  const leaderName = leader ? (getDriver(leader.driverId) || {}).name || "—" : "—";
  const leaderPts = leader ? leader.points || 0 : 0;

  return "Write a race report for the " + raceName + " " + season + ".\n" +
    "Winner: " + (winnerName || "—") + " (" + (winnerTeam || "—") + ").\n" +
    "Podium: " + (podium || "—") + ".\n" +
    "Full top 10: " + (top10 || "—") + ".\n" +
    "DNFs: " + dnfs + ".\n" +
    "Weather: " + weather + ".\n" +
    "Safety car deployed: " + safetyCar + ".\n" +
    "Focus driver " + (focusName || "—") + " finished " + focusPosition + ".\n" +
    "Championship leader after this race: " + leaderName + " on " + leaderPts + " pts.\n" +
    "Previous race winner: " + (previousRaceWinner || "N/A") + ".";
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ commentary: fallbackCommentary("Race", new Date().getFullYear(), null) }, { status: 200 });
  }

  const systemPrompt = "You are an F1 race commentator writing a race report in the style of a Sky Sports F1 broadcast summary. Write exactly 2 paragraphs. First paragraph covers the race narrative — what happened at the front, key battles, safety cars, weather. Second paragraph covers the championship implications and any notable storylines. Be specific about positions, gaps, and driver names. Keep total length under 200 words. Do not use bullet points.";

  const userContent = buildUserMessage(body);
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const raceName = (body.raceResult && (body.raceResult.name || body.raceResult.raceName)) || ("Round " + (body.round || "?"));
    const winner = body.raceResult && body.raceResult.results && body.raceResult.results[0];
    const drivers = body.drivers || [];
    const winnerName = winner ? (drivers.find((d) => d.id === winner.driverId) || {}).name || null : null;
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

    const raceName = (body.raceResult && (body.raceResult.name || body.raceResult.raceName)) || "Race";
    const winner = body.raceResult && body.raceResult.results && body.raceResult.results[0];
    const drivers = body.drivers || [];
    const winnerName = winner ? (drivers.find((d) => d.id === winner.driverId) || {}).name || null : null;

    if (!res.ok) {
      return Response.json({ commentary: fallbackCommentary(raceName, body.season || new Date().getFullYear(), winnerName) }, { status: 200 });
    }

    const data = await res.json();
    const text = data.content && data.content.find((c) => c.type === "text") && data.content.find((c) => c.type === "text").text;
    const commentary = typeof text === "string" && text.trim() ? text.trim() : fallbackCommentary(raceName, body.season || new Date().getFullYear(), winnerName);
    return Response.json({ commentary });
  } catch {
    const raceName = (body && body.raceResult && (body.raceResult.name || body.raceResult.raceName)) || "Race";
    const season = (body && body.season) || new Date().getFullYear();
    const winner = body && body.raceResult && body.raceResult.results && body.raceResult.results[0];
    const winnerName = winner && body.drivers ? (body.drivers.find((d) => d.id === winner.driverId) || {}).name || null : null;
    return Response.json({ commentary: fallbackCommentary(raceName, season, winnerName) }, { status: 200 });
  }
}