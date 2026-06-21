import { createFileRoute } from "@tanstack/react-router";
import { MarginDashboard } from "@/components/MarginDashboard";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Lucido — Quali clienti ti fanno guadagnare" },
      {
        name: "description",
        content:
          "Primo margine per cliente e commessa, spiegato. Vista titolare in sola lettura.",
      },
    ],
  }),
  component: MarginDashboard,
});
