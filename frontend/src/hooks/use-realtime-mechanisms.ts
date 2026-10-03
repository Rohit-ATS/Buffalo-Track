import * as React from "react";
import type { RealtimePostgresChangesPayload, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export type AtlasCluster = { id: string; name: string; pathway: string; color: string };
export type AtlasDisease = {
  id: string;
  name: string;
  gene: string;
  effect_class: string;
  pathway: string;
  cluster_id: string | null;
  importance: number;
  no_route: boolean;
};
export type AtlasEdge = {
  id: string;
  from_id: string;
  to_id: string;
  type: string;
  tier: string;
  confidence: number;
};
export type AtlasOrganization = { id: string; kind: string };
export type AtlasDiseaseOrganization = { disease_id: string; organization_id: string };
export type AtlasAsset = { id: string; disease_id: string };
export type AtlasContact = { id: number; disease_id: string };

export type RealtimeMechanismsStatus = "unconfigured" | "loading" | "live" | "error";

export type RealtimeMechanisms = {
  status: RealtimeMechanismsStatus;
  error: string | null;
  clusters: AtlasCluster[];
  diseases: AtlasDisease[];
  edges: AtlasEdge[];
  organizations: AtlasOrganization[];
  diseaseOrganizations: AtlasDiseaseOrganization[];
  assets: AtlasAsset[];
  contacts: AtlasContact[];
};

function upsert<T>(rows: Map<string, T>, key: string, row: T): Map<string, T> {
  const next = new Map(rows);
  next.set(key, row);
  return next;
}

function remove<T>(rows: Map<string, T>, key: string): Map<string, T> {
  if (!rows.has(key)) return rows;
  const next = new Map(rows);
  next.delete(key);
  return next;
}

/**
 * The typed atlas schema (supabase/migrations/20261003000003_atlas.sql) that
 * /mechanisms renders: clusters, mechanism units (diseases), their evidence
 * edges, and enough of organizations/assets/contacts to reproduce the
 * patient-group / asset / contact counts the table shows. Loads each table
 * once, then keeps them live via Realtime (enabled in
 * 20261003000004_atlas_realtime.sql).
 *
 * Not included: atlas_synonyms, atlas_symptoms, atlas_open_questions (read by
 * the per-disease detail page, which still uses the static sample data —
 * see AGENTS.md), and atlas_trials/atlas_researchers/atlas_metrics/
 * atlas_similarity (no live view reads them yet).
 */
export function useRealtimeMechanisms(): RealtimeMechanisms {
  const [clusters, setClusters] = React.useState<Map<string, AtlasCluster>>(new Map());
  const [diseases, setDiseases] = React.useState<Map<string, AtlasDisease>>(new Map());
  const [edges, setEdges] = React.useState<Map<string, AtlasEdge>>(new Map());
  const [organizations, setOrganizations] = React.useState<Map<string, AtlasOrganization>>(
    new Map(),
  );
  const [diseaseOrganizations, setDiseaseOrganizations] = React.useState<
    Map<string, AtlasDiseaseOrganization>
  >(new Map());
  const [assets, setAssets] = React.useState<Map<string, AtlasAsset>>(new Map());
  const [contacts, setContacts] = React.useState<Map<string, AtlasContact>>(new Map());
  const [status, setStatus] = React.useState<RealtimeMechanismsStatus>("loading");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const db = getSupabaseBrowser();
    if (!db) {
      setStatus("unconfigured");
      return;
    }

    let cancelled = false;

    async function loadInitial() {
      const [
        clustersRes,
        diseasesRes,
        edgesRes,
        organizationsRes,
        diseaseOrgsRes,
        assetsRes,
        contactsRes,
      ] = await Promise.all([
        db!.from("atlas_clusters").select("id, name, pathway, color"),
        db!
          .from("atlas_diseases")
          .select("id, name, gene, effect_class, pathway, cluster_id, importance, no_route"),
        db!.from("atlas_edges").select("id, from_id, to_id, type, tier, confidence"),
        db!.from("atlas_organizations").select("id, kind"),
        db!.from("atlas_disease_organizations").select("disease_id, organization_id"),
        db!.from("atlas_assets").select("id, disease_id"),
        db!.from("atlas_contacts").select("id, disease_id"),
      ]);
      if (cancelled) return;

      const firstError = [
        clustersRes,
        diseasesRes,
        edgesRes,
        organizationsRes,
        diseaseOrgsRes,
        assetsRes,
        contactsRes,
      ].find((r) => r.error)?.error;
      if (firstError) {
        setError(firstError.message);
        setStatus("error");
        return;
      }

      setClusters(new Map((clustersRes.data as AtlasCluster[]).map((c) => [c.id, c])));
      setDiseases(new Map((diseasesRes.data as AtlasDisease[]).map((d) => [d.id, d])));
      setEdges(new Map((edgesRes.data as AtlasEdge[]).map((e) => [e.id, e])));
      setOrganizations(
        new Map((organizationsRes.data as AtlasOrganization[]).map((o) => [o.id, o])),
      );
      setDiseaseOrganizations(
        new Map(
          (diseaseOrgsRes.data as AtlasDiseaseOrganization[]).map((r) => [
            `${r.disease_id}:${r.organization_id}`,
            r,
          ]),
        ),
      );
      setAssets(new Map((assetsRes.data as AtlasAsset[]).map((a) => [a.id, a])));
      setContacts(new Map((contactsRes.data as AtlasContact[]).map((c) => [String(c.id), c])));
      setStatus("live");
    }

    void loadInitial();

    function onChange<T extends { [key: string]: unknown }>(
      setter: React.Dispatch<React.SetStateAction<Map<string, T>>>,
      keyOf: (row: T) => string,
    ) {
      return (payload: RealtimePostgresChangesPayload<T>) => {
        if (payload.eventType === "DELETE") {
          const old = payload.old as Partial<T>;
          const key = keyOf(old as T);
          if (key) setter((prev) => remove(prev, key));
          return;
        }
        const row = payload.new as T;
        setter((prev) => upsert(prev, keyOf(row), row));
      };
    }

    const channel = (db as SupabaseClient)
      .channel("mechanisms")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atlas_clusters" },
        onChange<AtlasCluster>(setClusters, (c) => c.id),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atlas_diseases" },
        onChange<AtlasDisease>(setDiseases, (d) => d.id),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atlas_edges" },
        onChange<AtlasEdge>(setEdges, (e) => e.id),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atlas_organizations" },
        onChange<AtlasOrganization>(setOrganizations, (o) => o.id),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atlas_disease_organizations" },
        onChange<AtlasDiseaseOrganization>(
          setDiseaseOrganizations,
          (r) => `${r.disease_id}:${r.organization_id}`,
        ),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atlas_assets" },
        onChange<AtlasAsset>(setAssets, (a) => a.id),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atlas_contacts" },
        onChange<AtlasContact>(setContacts, (c) => String(c.id)),
      )
      .subscribe((subStatus) => {
        if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT") {
          setError(`Realtime subscription failed: ${subStatus}`);
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
      void db.removeChannel(channel);
    };
  }, []);

  return {
    status,
    error,
    clusters: Array.from(clusters.values()),
    diseases: Array.from(diseases.values()),
    edges: Array.from(edges.values()),
    organizations: Array.from(organizations.values()),
    diseaseOrganizations: Array.from(diseaseOrganizations.values()),
    assets: Array.from(assets.values()),
    contacts: Array.from(contacts.values()),
  };
}
