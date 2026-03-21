import { db } from "@/db";
import { projects, savedKeywords, rankings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchLiveSerpItemsRaw } from "@/server/lib/dataforseo";
import { normalizeDomainInput } from "@/server/lib/dataforseo";

export class RankTrackingService {
  /**
   * Track rankings for all saved keywords in a specific project.
   */
  static async trackProjectRankings(projectId: string) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project || !project.domain) {
      console.log(`Skipping rank tracking for project ${projectId}: No domain set.`);
      return { success: false, message: "Project or domain not found." };
    }

    const keywords = await db
      .select()
      .from(savedKeywords)
      .where(eq(savedKeywords.projectId, projectId));

    if (keywords.length === 0) {
      return { success: true, tracked: 0 };
    }

    const targetDomain = normalizeDomainInput(project.domain, true);
    let trackedCount = 0;

    for (const kw of keywords) {
      try {
        const serpItems = await fetchLiveSerpItemsRaw(
          kw.keyword,
          kw.locationCode,
          kw.languageCode
        );

        // Find the best rank for the target domain
        const match = serpItems.find((item) => {
          if (item.type !== "organic") return false;
          try {
            const itemDomain = normalizeDomainInput(item.domain || "", true);
            return itemDomain === targetDomain;
          } catch {
            return false;
          }
        });

        if (match) {
          await db.insert(rankings).values({
            id: crypto.randomUUID(),
            projectId,
            keyword: kw.keyword,
            locationCode: kw.locationCode,
            languageCode: kw.languageCode,
            rank: match.rank_absolute ?? match.rank_group ?? 0,
            targetUrl: match.url,
          });
          trackedCount++;
        } else {
          // If not found in top 100, we record as 101 or similar, 
          // but for now let's only record found items or a specific marker.
          // Recording 0 or null might be better for "unranked".
          await db.insert(rankings).values({
            id: crypto.randomUUID(),
            projectId,
            keyword: kw.keyword,
            locationCode: kw.locationCode,
            languageCode: kw.languageCode,
            rank: 0, // 0 means unranked in top 100
          });
        }
      } catch (error) {
        console.error(`Failed to track rank for keyword "${kw.keyword}":`, error);
      }
    }

    return { success: true, tracked: trackedCount };
  }

  /**
   * Global runner for all projects (cron job).
   */
  static async trackAllProjectsRankings() {
    const allProjects = await db.select().from(projects);
    console.log(`Starting Daily Rank Tracking for ${allProjects.length} projects...`);

    for (const project of allProjects) {
      try {
        await this.trackProjectRankings(project.id);
      } catch (error) {
        console.error(`Global Rank Tracking failed for project ${project.id}:`, error);
      }
    }
  }
}
