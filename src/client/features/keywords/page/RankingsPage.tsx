import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getRankHistory, 
  getProject, 
  getLatestProjectRankings 
} from "@/serverFunctions/keywords";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, RefreshCw, Calendar, Search, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";

export function RankingsPage({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject({ data: { projectId } }),
  });

  const { data: allRankings, isLoading: loadingRankings } = useQuery({
    queryKey: ["latestRankings", projectId],
    queryFn: () => getLatestProjectRankings({ data: { projectId } }),
  });

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ["rankHistory", projectId, selectedKeyword],
    queryFn: () => getRankHistory({ data: { projectId, keyword: selectedKeyword!, limit: 30 } }),
    enabled: !!selectedKeyword,
  });

  // Process unique keywords from the rankings table
  const keywordList = useMemo(() => {
    const map = new Map<string, any>();
    (allRankings || []).forEach(r => {
      // Very naive "latest" check: table is ordered desc by date
      if (!map.has(r.keyword)) {
        map.set(r.keyword, r);
      }
    });
    return Array.from(map.values())
      .filter(k => k.keyword.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allRankings, searchTerm]);

  // Use history data if available, otherwise fallback to empty
  const chartData = useMemo(() => {
    return (history || []).map(h => ({
      date: new Date(h.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      rank: h.rank === 0 ? null : h.rank,
      rawDate: h.date,
    })).sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
  }, [history]);

  // Set first keyword as default
  if (!selectedKeyword && keywordList.length > 0) {
    setSelectedKeyword(keywordList[0].keyword);
  }

  const top3 = keywordList.filter(k => k.rank > 0 && k.rank <= 3).length;
  const top10 = keywordList.filter(k => k.rank > 0 && k.rank <= 10).length;
  const avgRank = keywordList.length > 0 
    ? (keywordList.reduce((acc, k) => acc + (k.rank || 101), 0) / keywordList.length).toFixed(1)
    : "0";


  return (
    <div className="flex flex-col gap-6 p-6 pb-24 h-full overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="size-6 text-primary" /> Rank Tracking
          </h1>
          <p className="text-base-content/60 text-sm mt-1">
            Monitor your organic performance for {project?.domain || "your domain"}.
          </p>
        </div>
        <button className="btn btn-primary btn-sm gap-2">
          <RefreshCw className="size-4" /> Sync Rankings
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Keywords Table */}
        <div className="lg:col-span-1 card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/40" />
              <input 
                type="text" 
                placeholder="Search keywords..." 
                className="input input-bordered input-sm w-full pl-9"
              />
            </div>
            
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr>
                    <th>Keyword</th>
                    <th className="text-right">Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRankings ? (
                    <tr><td colSpan={2} className="text-center py-4"><span className="loading loading-spinner loading-sm" /></td></tr>
                  ) : keywordList.map((item) => (
                    <tr 
                      key={item.keyword} 
                      className={`cursor-pointer hover:bg-base-200 ${selectedKeyword === item.keyword ? 'bg-base-200 border-l-4 border-l-primary' : ''}`}
                      onClick={() => setSelectedKeyword(item.keyword)}
                    >
                      <td className="font-medium truncate max-w-[120px]">{item.keyword}</td>
                      <td className="text-right">
                        {item.rank === 0 ? (
                           <span className="text-base-content/30 italic">100+</span>
                        ) : (
                          <span className="font-mono">{item.rank}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Chart View */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body p-6">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {selectedKeyword ? `Trend: ${selectedKeyword}` : 'Global Visibility Trend'}
                  {selectedKeyword && (
                    <a 
                      href={`https://www.google.com/search?q=${encodeURIComponent(selectedKeyword)}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn btn-ghost btn-xs btn-circle"
                    >
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </h3>
                <div className="flex gap-2">
                   <div className="badge badge-outline gap-1 py-3 px-3">
                     <Calendar className="size-3" /> Last 30 Days
                   </div>
                </div>
              </div>

              <div className="h-64 w-full relative">
                {loadingHistory ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-base-100/50 z-10">
                    <span className="loading loading-spinner text-primary" />
                  </div>
                ) : null}
                
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(var(--b3))" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'oklch(var(--bc))', fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis 
                        reversed 
                        domain={[1, 'dataMax + 5']}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'oklch(var(--bc))', fontSize: 12 }}
                        dx={-10}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'oklch(var(--b1))', 
                          borderColor: 'oklch(var(--b3))',
                          borderRadius: '8px',
                          color: 'oklch(var(--bc))'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="rank" 
                        stroke="oklch(var(--p))" 
                        strokeWidth={3}
                        connectNulls={false}
                        dot={{ r: 4, fill: 'oklch(var(--p))' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-base-content/40 italic">
                    <TrendingUp className="size-12 mb-2 opacity-20" />
                    <p>No historical data for this keyword.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card bg-base-100 border border-base-300 shadow-sm p-4">
              <p className="text-xs text-base-content/60 uppercase font-bold">Top 3 Rankings</p>
              <h4 className="text-2xl font-bold mt-1">{top3}</h4>
            </div>
            <div className="card bg-base-100 border border-base-300 shadow-sm p-4">
              <p className="text-xs text-base-content/60 uppercase font-bold">Top 10 Rankings</p>
              <h4 className="text-2xl font-bold mt-1">{top10}</h4>
            </div>
            <div className="card bg-base-100 border border-base-300 shadow-sm p-4">
              <p className="text-xs text-base-content/60 uppercase font-bold">Avg Position</p>
              <h4 className="text-2xl font-bold mt-1">{avgRank}</h4>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
