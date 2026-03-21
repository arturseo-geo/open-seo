import { db } from "@/db";
import { rankings } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function getRankHistory(input: {
  projectId: string;
  keyword: string;
  limit?: number;
}) {
  const history = await db
    .select()
    .from(rankings)
    .where(
      and(
        eq(rankings.projectId, input.projectId),
        eq(rankings.keyword, input.keyword)
      )
    )
    .orderBy(desc(rankings.date))
    .limit(input.limit ?? 30);

  return history.reverse(); // Return in chronological order for charts
}

export async function getLatestProjectRankings(projectId: string) {
  // Simple version: get all rankings for this project in the last 24h or just latest per keyword
  // For now, let's just return all for simplicity in the UI
  return db
    .select()
    .from(rankings)
    .where(eq(rankings.projectId, projectId))
    .orderBy(desc(rankings.date));
}
