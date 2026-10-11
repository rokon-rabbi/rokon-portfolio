import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import type { Project } from "@/schemas/portfolio";
export function GalleryTabs() {
  return (
    <Tabs
      label="Design principles"
      items={[
        {
          id: "structure",
          label: "Structure",
          content: (
            <p>
              Clear hierarchy, a consistent grid, and a comfortable reading
              measure give each section a purpose.
            </p>
          ),
        },
        {
          id: "interaction",
          label: "Interaction",
          content: (
            <p>
              Visible focus, named controls, and immediate feedback make
              interactions predictable.
            </p>
          ),
        },
        {
          id: "motion",
          label: "Motion",
          content: (
            <p>
              Motion supports the interface. Reduced-motion preferences remove
              nonessential transitions.
            </p>
          ),
        },
        {
          id: "future",
          label: "Coming later",
          content: <p>Future patterns.</p>,
          disabled: true,
        },
      ]}
    />
  );
}
export function GalleryFilters({ projects }: { projects: readonly Project[] }) {
  const [selected, setSelected] = useState("all");
  const filters = [
    { id: "all", label: "All projects" },
    { id: "web", label: "Web" },
    { id: "desktop", label: "Desktop" },
  ];
  const shown = projects.filter(
    (project) =>
      selected === "all" ||
      (selected === "desktop"
        ? project.technologies.includes("Swing")
        : !project.technologies.includes("Swing")),
  );
  return (
    <div>
      <div
        className="filter-controls"
        role="group"
        aria-label="Filter projects by platform"
      >
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className="button button-outline filter-control"
            aria-pressed={selected === filter.id}
            onClick={() => setSelected(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <p className="metadata mt-4" role="status" aria-live="polite">
        {shown.length} {shown.length === 1 ? "project" : "projects"}
      </p>
      <ul className="mt-3 space-y-2">
        {shown.map((project) => (
          <li key={project.id} className="text-sm">
            {project.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
