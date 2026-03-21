import handler from "@tanstack/react-start/server-entry";
import { db } from "@/db";
import { llmQuerySets } from "@/db/schema";
import { LlmTrackingService } from "@/server/lib/llmTrackingService";
import { RankTrackingService } from "@/server/features/keywords/services/RankTrackingService";

// Export Workflow classes as named exports
export { SiteAuditWorkflow } from "./server/workflows/SiteAuditWorkflow";

export default {
  fetch: handler.fetch,
  async scheduled(event: any, env: any, ctx: any) {
    ctx.waitUntil(
      (async () => {
        console.log("Running Daily OpenSEO Automation...");
        
        // 1. LLM Mentions Tracking
        console.log("Phase 1: LLM Mentions Tracking...");
        const allSets = await db.select().from(llmQuerySets);
        for (const set of allSets) {
          try {
            await LlmTrackingService.runLlmScan(set.id);
          } catch (e) {
            console.error(`Failed scheduled scan for LLM Query Set ${set.id}`, e);
          }
        }

        // 2. Rank Tracking
        console.log("Phase 2: Daily Rank Tracking...");
        try {
          await RankTrackingService.trackAllProjectsRankings();
        } catch (e) {
          console.error("Global Rank Tracking CRON failed:", e);
        }
        
        // Dispatch Discord Alerts if Hook is attached
        const hookUrl = env.DISCORD_WEBHOOK_URL;
        if (hookUrl) {
          try {
             await fetch(hookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  content: `🤖 **OpenSEO Daily Alert**\nThe background CRON job just completed scans for LLM Mentions (ChatGPT/Perplexity/Gemini) AND Daily Rank Tracking across all your projects.\nCheck your dashboard to see the latest performance data! \n[Open Tracker](http://localhost:3001/)`
                })
             });
          } catch(e) {
             console.error("Discord CRON Alert Failed:", e);
          }
        }
        
        console.log("Daily OpenSEO Automation complete.");
      })()
    );
  },
};

