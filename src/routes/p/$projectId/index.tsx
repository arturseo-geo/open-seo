import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/p/$projectId/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/p/$projectId/keywords",
      params: { projectId: params.projectId },
    });
  },
});
