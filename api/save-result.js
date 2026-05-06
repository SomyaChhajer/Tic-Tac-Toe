import { createClient } from "@libsql/client";
import jwt from "jsonwebtoken";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Not logged in" });

  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid session" });
  }

  const { winnerUsername, loserUsername, isDraw } = req.body;

  try {
    if (isDraw) {
      const p1 = await db.execute({
        sql: "SELECT id FROM users WHERE username = ?",
        args: [winnerUsername],
      });
      if (p1.rows[0]) {
        await db.execute({
          sql: "INSERT INTO game_results (winner_id, is_draw) VALUES (?, 1)",
          args: [p1.rows[0].id],
        });
      }
    } else {
      const winnerRow = await db.execute({
        sql: "SELECT id FROM users WHERE username = ?",
        args: [winnerUsername],
      });
      const loserRow = await db.execute({
        sql: "SELECT id FROM users WHERE username = ?",
        args: [loserUsername],
      });
      if (!winnerRow.rows[0] || !loserRow.rows[0])
        return res.status(404).json({ error: "Player not found" });

      await db.execute({
        sql: "INSERT INTO game_results (winner_id, loser_id, is_draw) VALUES (?, ?, 0)",
        args: [winnerRow.rows[0].id, loserRow.rows[0].id],
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Could not save result" });
  }
}
