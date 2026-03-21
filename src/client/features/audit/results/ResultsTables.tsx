import { ChevronDown, Download, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { generateAiAuditFix } from "@/serverFunctions/aiTools";
import {
  extractPathname,
  HttpStatusBadge,
  PsiScoreBadge,
} from "@/client/features/audit/shared";
import type { AuditResultsData } from "@/client/features/audit/results/types";

export function PagesTable({ pages }: { pages: AuditResultsData["pages"] }) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>URL</th>
            <th>Status</th>
            <th>Title</th>
            <th>Meta</th>
            <th>H1</th>
            <th>Words</th>
            <th>Images</th>
            <th>Speed</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <tr key={page.id}>
              <td className="max-w-[200px] truncate">
                <a
                  href={page.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-primary text-xs inline-flex items-center gap-1"
                >
                  {extractPathname(page.url)}
                  <ExternalLink className="size-3" />
                </a>
              </td>
              <td>
                <HttpStatusBadge code={page.statusCode} />
              </td>
              <td className="max-w-[180px] truncate" title={page.title ?? ""}>
                {page.title || (
                  <span className="text-error text-xs flex items-center">
                    missing
                    <AiFixButton auditPageId={page.id} issueType="missing_h1" />
                  </span>
                )}
              </td>
              <td className="max-w-[160px] truncate" title={page.metaDescription ?? ""}>
                {page.metaDescription || (
                  <span className="text-warning text-xs flex flex-row items-center">
                    missing
                    <AiFixButton auditPageId={page.id} issueType="missing_meta_description" />
                  </span>
                )}
              </td>
              <td>{page.h1Count}</td>
              <td>{page.wordCount}</td>
              <td>
                {page.imagesMissingAlt > 0 ? (
                  <span className="text-warning flex flex-col items-start">
                    <span>{page.imagesMissingAlt}/{page.imagesTotal} missing alt</span>
                    <AiFixButton auditPageId={page.id} issueType="missing_alt_text" />
                  </span>
                ) : (
                  page.imagesTotal
                )}
              </td>
              <td className="text-xs">
                {page.responseTimeMs ? `${page.responseTimeMs}ms` : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PerformanceTable({
  projectId,
  psi,
  pages,
}: {
  projectId: string;
  psi: AuditResultsData["psi"];
  pages: AuditResultsData["pages"];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>URL</th>
            <th>Device</th>
            <th>Status</th>
            <th>Perf</th>
            <th>A11y</th>
            <th>SEO</th>
            <th>LCP</th>
            <th>CLS</th>
            <th>INP</th>
            <th>TTFB</th>
            <th>Issues</th>
          </tr>
        </thead>
        <tbody>
          {psi.map((result) => (
            <PerformanceRow
              key={result.id}
              projectId={projectId}
              result={result}
              page={pages.find((candidate) => candidate.id === result.pageId)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PerformanceRow({
  projectId,
  result,
  page,
}: {
  projectId: string;
  result: AuditResultsData["psi"][number];
  page: AuditResultsData["pages"][number] | undefined;
}) {
  const isFailed = !!result.errorMessage;

  return (
    <tr>
      <td className="max-w-[160px] truncate text-xs">
        {page ? extractPathname(page.url) : "-"}
      </td>
      <td className="capitalize text-xs">{result.strategy}</td>
      <td>
        {isFailed ? (
          <span
            className="badge badge-error badge-outline text-xs"
            title={result.errorMessage ?? "PSI check failed"}
          >
            failed
          </span>
        ) : (
          <span className="badge badge-success badge-outline text-xs">ok</span>
        )}
      </td>
      <td>
        <PsiScoreBadge score={result.performanceScore} />
      </td>
      <td>
        <PsiScoreBadge score={result.accessibilityScore} />
      </td>
      <td>
        <PsiScoreBadge score={result.seoScore} />
      </td>
      <td className="text-xs">
        {result.lcpMs ? `${(result.lcpMs / 1000).toFixed(1)}s` : "-"}
      </td>
      <td className="text-xs">
        {result.cls != null ? result.cls.toFixed(3) : "-"}
      </td>
      <td className="text-xs">
        {result.inpMs ? `${Math.round(result.inpMs)}ms` : "-"}
      </td>
      <td className="text-xs">
        {result.ttfbMs ? `${Math.round(result.ttfbMs)}ms` : "-"}
      </td>
      <td>
        {result.r2Key ? (
          <a
            className="btn btn-primary btn-xs"
            href={`/p/${projectId}/audit/issues/${result.id}?source=site&category=performance`}
          >
            View issues
          </a>
        ) : (
          <span className="text-xs text-base-content/40">-</span>
        )}
      </td>
    </tr>
  );
}

export function ExportDropdown({
  onExport,
}: {
  onExport: (format: "csv" | "json") => void;
}) {
  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-sm btn-ghost gap-1">
        <Download className="size-4" />
        Export
        <ChevronDown className="size-3 opacity-60" />
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content z-10 menu p-2 shadow-lg bg-base-100 border border-base-300 rounded-box w-40"
      >
        <li>
          <button onClick={() => onExport("csv")}>CSV</button>
        </li>
        <li>
          <button onClick={() => onExport("json")}>JSON</button>
        </li>
      </ul>
    </div>
  );
}

function AiFixButton({
  auditPageId,
  issueType,
}: {
  auditPageId: string;
  issueType: "missing_meta_description" | "missing_alt_text" | "missing_h1";
}) {
  const [fixText, setFixText] = useState("");

  const fixMutation = useMutation({
    mutationFn: () => generateAiAuditFix({ data: { auditPageId, issueType } }),
    onSuccess: (res: any) => {
      if (res.error) {
        toast.error(`Fix Generation Failed: ${res.error}`);
      } else {
        setFixText(res.fix);
      }
    },
    onError: () => toast.error("Failed to generate AI fix"),
  });

  if (fixText) {
    return (
      <div className="mt-1 flex flex-col gap-1 items-start">
        <div className="text-[10px] leading-tight text-base-content/80 bg-base-200 p-1 rounded max-w-[140px] whitespace-normal break-words">
          {fixText}
        </div>
        <button
          className="btn btn-xs btn-outline h-5 min-h-0"
          onClick={() => {
            navigator.clipboard.writeText(fixText);
            toast.success("Copied to clipboard!");
          }}
        >
          Copy
        </button>
      </div>
    );
  }

  return (
    <button
      className="btn btn-xs btn-ghost text-info ml-1 px-1 h-5 min-h-0"
      onClick={() => fixMutation.mutate()}
      disabled={fixMutation.isPending}
      title="Generate with AI"
    >
      {fixMutation.isPending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        "✨ Fix"
      )}
    </button>
  );
}
