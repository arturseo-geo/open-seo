import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { llmQuerySets, llmTrackedQueries, llmCitations } from "@/db/schema";
import { fetchLlmMentionsRaw } from "@/server/lib/dataforseo";
import { env } from "cloudflare:workers";

export class LlmTrackingService {
  static async runLlmScan(querySetId: string) {
    const queries = await db
      .select()
      .from(llmTrackedQueries)
      .where(eq(llmTrackedQueries.querySetId, querySetId));

    if (!queries.length) {
      return { success: false, message: "No queries found in this set." };
    }

    const engines = ["chatgpt", "perplexity", "gemini"] as const;

    for (const query of queries) {
      const scanPromises = engines.map(async (engine) => {
        const items = await fetchLlmMentionsRaw(query.queryText, engine);
        
        const annotations: any[] = [];
        for (const item of items) {
          if (Array.isArray(item.annotations)) {
            annotations.push(...item.annotations);
          }
          if (Array.isArray(item.sections)) {
            for (const s of item.sections) {
              if (Array.isArray(s.annotations)) {
                annotations.push(...s.annotations);
              }
            }
          }
        }
        
        // Fallback: If OpenAI or Gemini returned text but strictly refused to provide external URL web annotations
        if (annotations.length === 0 && items.length > 0) {
           const fallbackText = items[0].text || items[0].content || items[0].answer || "AI Generative Response";
           annotations.push({
             title: "Raw Text Output",
             domain: null,
             url: null,
             fallbackText: String(fallbackText).substring(0, 150)
           });
        }

        for (const ann of annotations) {
          let attributionType: "domain" | "url" | "brand" = "brand";
          let targetMatch = ann.title || "Unknown";
          
          if (ann.domain || ann.url) {
            attributionType = ann.url ? "url" : "domain";
            targetMatch = ann.url || ann.domain;
          }

          const responseText = ann.fallbackText || ann.title || "Mentioned in Source Citation";
          let sentiment = "neutral";
          
          try {
            const ai = env.AI;
            if (ai) {
              const aiResp = (await ai.run("@cf/meta/llama-3.1-8b-instruct" as any, {
                messages: [
                  { role: "system", content: "Analyze the sentiment of the provided snippet toward the core brand identity. Reply with only one raw word: positive, negative, or neutral." },
                  { role: "user", content: responseText }
                ]
              })) as any;
              const cleanResult = (aiResp?.response || "").toLowerCase();
              if (cleanResult.includes("positive")) sentiment = "positive";
              else if (cleanResult.includes("negative")) sentiment = "negative";
            }
          } catch (authError) {
            console.log("Sentiment AI Classification Skipped/Failed:", authError);
          }

          await db.insert(llmCitations).values({
            id: crypto.randomUUID(),
            queryId: query.id,
            engine,
            attributionType,
            targetMatch,
            llmResponseText: responseText,
            sentiment
          });
        }
      });

      // Execute scans concurrently for this query
      const results = await Promise.allSettled(scanPromises);
      for (const res of results) {
        if (res.status === "rejected") {
          console.error(`Failed concurrent LLM scan for ${query.queryText}:`, res.reason);
        }
      }
    }

    return { success: true };
  }
}
