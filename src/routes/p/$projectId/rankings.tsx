import { createFileRoute } from "@tanstack/react-router";
import { RankingsPage } from "@/client/features/keywords/page/RankingsPage";

export const Route = createFileRoute("/p/$projectId/rankings")({
  component: RankingsRoute,
});

function RankingsRoute() {
  const { projectId } = Route.useParams();
  return <RankingsPage projectId={projectId} />;
}
