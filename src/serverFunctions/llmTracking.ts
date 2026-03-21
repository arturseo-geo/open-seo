import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedServerFunctionMiddleware } from "@/serverFunctions/middleware";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { llmQuerySets, llmTrackedQueries, llmCitations } from "@/db/schema";
import { LlmTrackingService } from "@/server/lib/llmTrackingService";

// ---------------------------------------------------------------------------
// Trigger LLM Scan
// ---------------------------------------------------------------------------

export const triggerLlmScanForQuerySet = createServerFn({ method: "POST" })
  .middleware(authenticatedServerFunctionMiddleware)
  .inputValidator(z.object({ querySetId: z.string() }))
  .handler(async ({ data }) => {
    return LlmTrackingService.runLlmScan(data.querySetId);
  });

// ---------------------------------------------------------------------------
// Get Citations
// ---------------------------------------------------------------------------
export const getLlmCitationsForQuerySet = createServerFn({ method: "POST" })
  .middleware(authenticatedServerFunctionMiddleware)
  .inputValidator(z.object({ querySetId: z.string() }))
  .handler(async ({ data }) => {
    return await db
      .select({
        queryId: llmCitations.queryId,
        queryText: llmTrackedQueries.queryText,
        engine: llmCitations.engine,
        attributionType: llmCitations.attributionType,
        targetMatch: llmCitations.targetMatch,
        mentionedAt: llmCitations.mentionedAt,
      })
      .from(llmCitations)
      .innerJoin(llmTrackedQueries, eq(llmTrackedQueries.id, llmCitations.queryId))
      .where(eq(llmTrackedQueries.querySetId, data.querySetId))
      .orderBy(desc(llmCitations.mentionedAt));
  });

// ---------------------------------------------------------------------------
// Manage Query Sets
// ---------------------------------------------------------------------------
export const getLlmQuerySets = createServerFn({ method: "POST" })
  .middleware(authenticatedServerFunctionMiddleware)
  .inputValidator(z.object({ projectId: z.string() }))
  .handler(async ({ data }) => {
    return await db
      .select()
      .from(llmQuerySets)
      .where(eq(llmQuerySets.projectId, data.projectId))
      .orderBy(desc(llmQuerySets.createdAt));
  });

export const createLlmQuerySet = createServerFn({ method: "POST" })
  .middleware(authenticatedServerFunctionMiddleware)
  .inputValidator(z.object({
    projectId: z.string(),
    name: z.string(),
    queries: z.array(z.string()),
  }))
  .handler(async ({ data }) => {
    const querySetId = crypto.randomUUID();
    
    await db.insert(llmQuerySets).values({
      id: querySetId,
      projectId: data.projectId,
      name: data.name,
    });

    for (const query of data.queries) {
      await db.insert(llmTrackedQueries).values({
        id: crypto.randomUUID(),
        querySetId,
        queryText: query,
      });
    }

    return { success: true, querySetId };
  });
