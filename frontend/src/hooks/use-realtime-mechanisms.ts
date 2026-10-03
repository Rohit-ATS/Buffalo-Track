import * as React from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { listDiseases } from "@/lib/atlas-queries";
import type { DiseaseRef } from "@/lib/atlas-schema";

export type MechanismCluster = { id: string; name: string; pathway: string; color: string };
export type MechanismEdge = { from_id: string; to_id: string; confidence: number };

export type RealtimeMechanismsStatus = "unconfigured" | "loading" | "live" | "error";

export type RealtimeMechanisms = {
  status: RealtimeMechanismsStatus;
  error: string | null;
  clusters: MechanismCluster[];
  diseases: DiseaseRef[];
  edges: MechanismEdge[];
  /** disease ids linked to an organization of kind "patient group". */
  diseaseHasPatientGroup: Set<string>;
  assetCountByDisease: Map<string, number>;
  contactCountByDisease: Map<string, number>;
};

/**
 * What /mechanisms renders: clusters, mechanism units (via the shared
 * atlas-queries layer's listDiseases, so this never drifts from how the rest
 * of the app reads a disease), their evidence edges, and enough of
 * organizations/assets/contacts to reproduce its patient-group/asset/contact
 * counts. Loads once, then refetches on any change to the underlying tables
 * (Realtime: 20261003000003_atlas.sql + 20261003000004_atlas_realtime.sql) —
 * simpler than patching rows by hand, and it means the live view can never
 * compute a count differently than a one-off query would.
 */
export function useRealtimeMechanisms(): RealtimeMechanisms {
  const [clusters, setClusters] = React.useState<MechanismCluster[]>([]);
  const [diseases, setDiseases] = React.useState<DiseaseRef[]>([]);
  const [edges, setEdges] = React.useState<MechanismEdge[]>([]);
  const [diseaseHasPatientGroup, setDiseaseHasPatientGroup] = React.useState<Set<string>>(
    new Set(),
  );
  const [assetCountByDisease, setAssetCountByDisease] = React.useState<Map<string, number>>(
    new Map(),
  );
  const [contactCountByDisease, setContactCountByDisease] = React.useState<Map<string, number>>(
    new Map(),
  );
  const [status, setStatus] = React.useState<RealtimeMechanismsStatus>("loading");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const db = getSupabaseBrowser();
    if (!db) {
      setStatus("unconfigured");
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [clustersRes, diseaseRefs, edgesRes, diseaseOrgsRes, assetsRes, contactsRes] =
          await Promise.all([
            db!.from("atlas_clusters").select("id, name, pathway, color"),
            listDiseases(db!),
            db!.from("atlas_edges").select("from_id, to_id, confidence"),
            db!
              .from("atlas_disease_organizations")
              .select("disease_id, atlas_organizations ( kind )"),
            db!.from("atlas_assets").select("disease_id"),
            db!.from("atlas_contacts").select("disease_id"),
          ]);
        if (cancelled) return;

        const firstError = [clustersRes, edgesRes, diseaseOrgsRes, assetsRes, contactsRes].find(
          (r) => r.error,
        )?.error;
        if (firstError) throw new Error(firstError.message);

        const patientGroupDiseases = new Set<string>();
        for (const row of diseaseOrgsRes.data ?? []) {
          const embed = row["atlas_organizations"] as unknown;
          const org = (Array.isArray(embed) ? embed[0] : embed) as { kind: string } | undefined;
          if (org?.kind === "patient group") patientGroupDiseases.add(row["disease_id"] as string);
        }
        const assetCounts = new Map<string, number>();
        for (const row of assetsRes.data ?? []) {
          const id = row["disease_id"] as string;
          assetCounts.set(id, (assetCounts.get(id) ?? 0) + 1);
        }
        const contactCounts = new Map<string, number>();
        for (const row of contactsRes.data ?? []) {
          const id = row["disease_id"] as string;
          contactCounts.set(id, (contactCounts.get(id) ?? 0) + 1);
        }

        setClusters((clustersRes.data ?? []) as MechanismCluster[]);
        setDiseases(diseaseRefs);
        setEdges((edgesRes.data ?? []) as MechanismEdge[]);
        setDiseaseHasPatientGroup(patientGroupDiseases);
        setAssetCountByDisease(assetCounts);
        setContactCountByDisease(contactCounts);
        setStatus("live");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      }
    }

    void load();

    const watched = [
      "atlas_clusters",
      "atlas_diseases",
      "atlas_edges",
      "atlas_organizations",
      "atlas_disease_organizations",
      "atlas_assets",
      "atlas_contacts",
    ];
    let channel = db.channel("mechanisms");
    for (const table of watched) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => void load(),
      );
    }
    channel.subscribe((subStatus) => {
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
    clusters,
    diseases,
    edges,
    diseaseHasPatientGroup,
    assetCountByDisease,
    contactCountByDisease,
  };
}
