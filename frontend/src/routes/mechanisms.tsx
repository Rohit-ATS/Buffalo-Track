import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AtlasShell, StateMessage } from "@/components/atlas-ui";
import { useRealtimeMechanisms } from "@/hooks/use-realtime-mechanisms";

const SITE = "https://gleam-artistic-page.lovable.app";
export const Route = createFileRoute("/mechanisms")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Mechanism search — Rare Disease Atlas" },
      {
        name: "description",
        content:
          "Pick a mechanism and pathway to rank rare-disease clusters by evidence, patient groups, assets, and contacts.",
      },
      { property: "og:title", content: "Mechanism search — Rare Disease Atlas" },
      {
        property: "og:description",
        content: "Rank rare-disease clusters that share a biological mechanism.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE}/mechanisms` },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${SITE}/mechanisms` }],
  }),
  component: Mechanisms,
});

function Mechanisms() {
  const navigate = useNavigate();
  const [mech, setMech] = useState<"any" | "loss of function" | "gain of function">("any");
  const [pathway, setPathway] = useState("any");
  const {
    status,
    error,
    clusters,
    diseases,
    edges,
    organizations,
    diseaseOrganizations,
    assets,
    contacts,
  } = useRealtimeMechanisms();

  const orgKindById = useMemo(
    () => new Map(organizations.map((o) => [o.id, o.kind])),
    [organizations],
  );
  // A mechanism unit "has a patient group" when it's linked to an org of that kind —
  // the live equivalent of the static dataset's `disease.patientGroup` field.
  const diseaseHasPatientGroup = useMemo(() => {
    const set = new Set<string>();
    for (const link of diseaseOrganizations) {
      if (orgKindById.get(link.organization_id) === "patient group") set.add(link.disease_id);
    }
    return set;
  }, [diseaseOrganizations, orgKindById]);
  const assetCountByDisease = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of assets) counts.set(a.disease_id, (counts.get(a.disease_id) ?? 0) + 1);
    return counts;
  }, [assets]);
  const contactCountByDisease = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of contacts) counts.set(c.disease_id, (counts.get(c.disease_id) ?? 0) + 1);
    return counts;
  }, [contacts]);

  const rows = useMemo(
    () =>
      clusters
        .filter((c) => pathway === "any" || c.pathway === pathway)
        .map((c) => {
          const ds = diseases.filter(
            (d) => d.cluster_id === c.id && (mech === "any" || d.effect_class === mech),
          );
          const ids = new Set(ds.map((d) => d.id));
          const es = edges.filter((e) => ids.has(e.from_id) || ids.has(e.to_id));
          const strength = es.length ? es.reduce((s, e) => s + e.confidence, 0) / es.length : 0;
          return {
            c,
            ds,
            strength,
            groups: ds.filter((d) => diseaseHasPatientGroup.has(d.id)).length,
            assets: ds.reduce((s, d) => s + (assetCountByDisease.get(d.id) ?? 0), 0),
            contacts: ds.reduce((s, d) => s + (contactCountByDisease.get(d.id) ?? 0), 0),
          };
        })
        .filter((r) => r.ds.length)
        .sort((a, b) => b.strength * b.ds.length - a.strength * a.ds.length),
    [
      clusters,
      diseases,
      edges,
      pathway,
      mech,
      diseaseHasPatientGroup,
      assetCountByDisease,
      contactCountByDisease,
    ],
  );

  return (
    <AtlasShell>
      <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-8">
        <p className="font-sketch text-2xl text-primary">Priya's view</p>
        <h1 className="font-display text-4xl md:text-5xl">Search by mechanism</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Live from the database — ranks update as mechanism units, edges, or evidence change.
        </p>

        {status === "unconfigured" && (
          <StateMessage kind="empty" title="Live data not connected">
            This build has no VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, so mechanism rankings
            can't reach the database. Fill in frontend/.env and reload.
          </StateMessage>
        )}
        {status === "loading" && <StateMessage kind="loading" title="Loading mechanisms…" />}
        {status === "error" && (
          <StateMessage kind="error" title="Couldn't load mechanism data">
            {error}
          </StateMessage>
        )}

        {status === "live" && (
          <>
            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              <select
                value={mech}
                onChange={(e) => setMech(e.target.value as typeof mech)}
                className="h-10 rounded-full border border-border bg-background px-4"
                aria-label="Mechanism type"
              >
                <option value="any">Any mechanism type</option>
                <option>loss of function</option>
                <option>gain of function</option>
              </select>
              <select
                value={pathway}
                onChange={(e) => setPathway(e.target.value)}
                className="h-10 rounded-full border border-border bg-background px-4"
                aria-label="Pathway"
              >
                <option value="any">Any pathway</option>
                {clusters.map((c) => (
                  <option key={c.id}>{c.pathway}</option>
                ))}
              </select>
            </div>
            {rows.length === 0 ? (
              <StateMessage kind="empty" title="No clusters match">
                Try "Any pathway" or switch mechanism type.
              </StateMessage>
            ) : (
              <div className="mt-6 overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-surface text-left text-xs text-muted-foreground">
                    <tr>
                      {[
                        "#",
                        "Cluster",
                        "Diseases",
                        "Evidence strength",
                        "Patient groups",
                        "Assets",
                        "Contacts",
                      ].map((h) => (
                        <th key={h} className="px-4 py-2.5 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr
                        key={r.c.id}
                        onClick={() =>
                          navigate({
                            to: "/disease/$id",
                            params: { id: r.ds[0]!.id },
                            search: { tab: "map" },
                          })
                        }
                        className="cursor-pointer border-t border-border hover:bg-surface"
                        title="Open this cluster on the map"
                      >
                        <td className="px-4 py-3 font-display text-xl">{i + 1}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2 font-semibold">
                            <span
                              className="size-3 rounded-full"
                              style={{ background: r.c.color }}
                            />
                            {r.c.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">{r.ds.map((d) => d.gene).join(", ")}</td>
                        <td className="px-4 py-3">
                          <div className="h-2 w-24 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${r.strength * 100}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">{r.groups}</td>
                        <td className="px-4 py-3">{r.assets}</td>
                        <td className="px-4 py-3">{r.contacts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Click a row to open that cluster's first disease. That detail page still uses the
              curated sample write-up, not the live database.
            </p>
          </>
        )}
      </div>
    </AtlasShell>
  );
}
