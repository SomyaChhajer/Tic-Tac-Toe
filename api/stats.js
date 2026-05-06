cat > api/stats.js << 'EOF'
import { createClient } from "@libsql/client";
import jwt from "jsonwebtoken";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Not logged in" });

  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid session" });
  }

  try {
    const rows = await db.execute({
      sql: `SELECT
              (SELECT COUNT(*) FROM game_results WHERE winner_id = ? AND is_draw = 0) as wins,
              (SELECT COUNT(*) FROM game_results WHERE loser_id = ?) as losses,
              (SELECT COUNT(*) FROM game_results WHERE winner_id = ? AND is_draw = 1) as draws
            `,
      args: [user.userId, user.userId, user.userId],
    });
    const { wins, losses, draws } = rows.rows[0];
    res.json({
      username: user.username,
      wins: Number(wins),
      losses: Number(losses),
      draws: Number(draws),
    });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch stats" });
  }
}
EOF