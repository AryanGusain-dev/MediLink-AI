import { createFileRoute, notFound } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shared/coming-soon";
import { placeholderPages, type PlaceholderSlug } from "@/data/placeholders";

export const Route = createFileRoute("/dashboard/soon/$slug")({
  head: ({ params }) => {
    const page = placeholderPages[params.slug as PlaceholderSlug];
    const title = page ? `${page.title} — MediLink AI` : "Feature Under Development — MediLink AI";
    const description = page?.tagline ?? "This MediLink AI module is currently under development.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: PlaceholderPage,
});

function PlaceholderPage() {
  const { slug } = Route.useParams();
  const page = placeholderPages[slug as PlaceholderSlug];
  if (!page) throw notFound();
  return <ComingSoon {...page} />;
}
