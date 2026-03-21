import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getLlmQuerySets,
  getLlmCitationsForQuerySet,
  createLlmQuerySet,
  triggerLlmScanForQuerySet,
} from "@/serverFunctions/llmTracking";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Bot, RefreshCw, Plus, Sparkles } from "lucide-react";

export const Route = createFileRoute("/p/$projectId/ai")({
  component: AiMentionsPage,
});

function AiMentionsPage() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();

  const [selectedQuerySetId, setSelectedQuerySetId] = useState<string | null>(null);
  const [newSetName, setNewSetName] = useState("");
  const [newQueries, setNewQueries] = useState("");

  const { data: querySets, isLoading: loadingSets } = useQuery({
    queryKey: ["llmQuerySets", projectId],
    queryFn: () => getLlmQuerySets({ data: { projectId } }),
  });

  const { data: citations, isLoading: loadingCitations } = useQuery({
    queryKey: ["llmCitations", selectedQuerySetId],
    queryFn: () => getLlmCitationsForQuerySet({ data: { querySetId: selectedQuerySetId! } }),
    enabled: !!selectedQuerySetId,
  });

  const createSetMutation = useMutation({
    mutationFn: (args: { name: string; queries: string[] }) =>
      createLlmQuerySet({ data: { projectId, name: args.name, queries: args.queries } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["llmQuerySets", projectId] });
      setSelectedQuerySetId(res.querySetId);
      setNewSetName("");
      setNewQueries("");
    },
  });

  const scanMutation = useMutation({
    mutationFn: (querySetId: string) => triggerLlmScanForQuerySet({ data: { querySetId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["llmCitations", selectedQuerySetId] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetName || !newQueries) return;
    const items = newQueries.split("\n").map((q) => q.trim()).filter(Boolean);
    createSetMutation.mutate({ name: newSetName, queries: items });
  };

  // Group citations chronologically by Date for the AreaChart
  const dateMap = citations?.reduce((acc: Record<string, any>, cur) => {
    // Format "2023-11-20" from ISO/SQLite datetime
    const tempDate = cur.mentionedAt ? new Date(cur.mentionedAt) : new Date();
    // Quick formatting into MMM DD
    const dateStr = tempDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    
    if (!acc[dateStr]) {
      // Pre-fill zero arrays
      acc[dateStr] = { date: dateStr, chatgpt: 0, perplexity: 0, gemini: 0, timestamp: tempDate.getTime() };
    }
    acc[dateStr][cur.engine] += 1;
    return acc;
  }, {});

  // Sort earliest to latest
  const chartData = Object.values(dateMap || {}).sort((a: any, b: any) => a.timestamp - b.timestamp);

  return (
    <div className="px-4 py-4 md:px-6 md:py-6 pb-24 md:pb-8 overflow-auto h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Bot className="size-6 text-primary" /> AI Visibility & Mentions
          </h1>
          <p className="text-sm text-base-content/70 mt-1">
            Track how your brand is cited across ChatGPT, Perplexity, and Gemini.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-full">
        {/* Sidebar: Query Sets */}
        <div className="w-full md:w-1/3 flex flex-col gap-4">
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-4 gap-4">
              <h2 className="text-lg font-semibold">Query Sets</h2>
              
              {loadingSets ? (
                <div className="loading loading-spinner text-primary mx-auto" />
              ) : querySets?.length === 0 ? (
                <p className="text-sm text-base-content/50 italic">No query sets created.</p>
              ) : (
                <ul className="menu bg-base-200 rounded-box p-2 w-full">
                  {querySets?.map((qs) => (
                    <li key={qs.id}>
                      <a
                        className={selectedQuerySetId === qs.id ? "active" : ""}
                        onClick={() => setSelectedQuerySetId(qs.id)}
                      >
                        {qs.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              <div className="divider my-0"></div>
              
              <h3 className="text-sm font-medium">Create New Set</h3>
              <form onSubmit={handleCreate} className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Set Name (e.g. Brand Terms)"
                  className="input input-sm input-bordered w-full"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                />
                <textarea
                  placeholder="Queries (one per line)"
                  className="textarea textarea-sm textarea-bordered w-full"
                  rows={3}
                  value={newQueries}
                  onChange={(e) => setNewQueries(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-sm btn-primary mt-1"
                  disabled={createSetMutation.isPending}
                >
                  {createSetMutation.isPending ? "Creating..." : "Save Query Set"}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Main: Chart & Citations */}
        <div className="w-full md:w-2/3 flex flex-col gap-4">
          {selectedQuerySetId ? (
            <div className="card bg-base-100 border border-base-300 flex-1">
              <div className="card-body p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Performance Overview</h2>
                  <button
                    className="btn btn-sm btn-outline btn-primary"
                    onClick={() => scanMutation.mutate(selectedQuerySetId)}
                    disabled={scanMutation.isPending}
                  >
                    {scanMutation.isPending ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    Trigger Live Scan
                  </button>
                </div>

                {loadingCitations ? (
                  <div className="flex-1 flex justify-center items-center">
                    <span className="loading loading-bars loading-lg text-primary text-opacity-50" />
                  </div>
                ) : citations && citations.length > 0 ? (
                  <>
                    <div className="w-full h-64 mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <RechartsTooltip />
                          <Legend />
                          <Area type="monotone" dataKey="perplexity" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Perplexity" />
                          <Area type="monotone" dataKey="chatgpt" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="ChatGPT" />
                          <Area type="monotone" dataKey="gemini" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="Gemini" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <h3 className="text-md font-semibold mb-2">Recent Citations ({citations.length})</h3>
                    <div className="overflow-x-auto border border-base-300 rounded-lg">
                      <table className="table table-sm table-zebra">
                        <thead>
                          <tr>
                            <th>Engine</th>
                            <th>Query</th>
                            <th>Attribution</th>
                            <th>Result Target</th>
                          </tr>
                        </thead>
                        <tbody>
                          {citations.map((c, i) => (
                            <tr key={`${c.queryId}-${i}`}>
                              <td className="capitalize font-medium">{c.engine}</td>
                              <td>{c.queryText}</td>
                              <td>
                                <span className={`badge badge-sm ${c.attributionType === `url` ? `badge-success` : c.attributionType === `domain` ? `badge-info` : `badge-secondary`}`}>
                                  {c.attributionType}
                                </span>
                              </td>
                              <td className="truncate max-w-[200px]" title={c.targetMatch}>
                                {c.targetMatch}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col justify-center items-center text-center opacity-70">
                    <Sparkles className="size-12 mb-4 text-base-300" />
                    <p>No citations tracked yet for this query set.</p>
                    <p className="text-sm">Click <b>Trigger Live Scan</b> to pull data.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-base-300 rounded-xl bg-base-200/50 p-6 text-center">
              <Plus className="size-8 text-base-content/30 mb-2" />
              <h3 className="text-lg font-medium">Select or create a Query Set</h3>
              <p className="text-sm text-base-content/60 max-w-sm mt-1">
                A query set defines the specific keywords you want to monitor across AI engines to track your visibility over time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
