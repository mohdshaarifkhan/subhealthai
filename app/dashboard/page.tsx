"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SubHealthAIDashboard from "@/components/SubHealthAIDashboard";
import LoadingScreen from "@/components/LoadingScreen";
import { getCurrentAppUser } from "@/lib/getCurrentAppUser";

type MetricsRow = any;
type LabsRow = any;
type VitalsRow = any;

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [dataUserId, setDataUserId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MetricsRow[]>([]);
  const [labs, setLabs] = useState<LabsRow[]>([]);
  const [vitals, setVitals] = useState<VitalsRow[]>([]);
  const [clinicalSummary, setClinicalSummary] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);

      // 1) Check auth on client
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user?.email) {
        console.warn("No logged-in user, redirecting to /");
        router.push("/");
        return;
      }

      const email = userData.user.email;
      setCurrentEmail(email);

      // 2) Map email -> data user_id (your real profile UUID) from database
      try {
        const appUser = await getCurrentAppUser();
        const resolvedDataUserId = appUser.id;

        if (!resolvedDataUserId) {
          setErrorMsg("No data profile found for this account. Please contact support.");
          setLoading(false);
          return;
        }

        console.log("✅ Resolved user ID:", resolvedDataUserId, "for email:", email);
        setDataUserId(resolvedDataUserId);

        // 3) Load metrics / labs / vitals for that UUID
      const [metricsRes, labsRes, vitalsRes] = await Promise.all([
        supabase
          .from("metrics")
          .select("*")
          .eq("user_id", resolvedDataUserId)
          .order("day", { ascending: false })
          .limit(60),
        supabase
          .from("labs_core")
          .select("*")
          .eq("user_id", resolvedDataUserId)
          .order("date", { ascending: false })
          .limit(10),
        supabase
          .from("vitals")
          .select("*")
          .eq("user_id", resolvedDataUserId)
          .order("taken_at", { ascending: false })
          .limit(30),
      ]);

      if (metricsRes.error) console.error("metrics error:", metricsRes.error);
      if (labsRes.error) console.error("labs error:", labsRes.error);
      if (vitalsRes.error) console.error("vitals error:", vitalsRes.error);

      setMetrics(metricsRes.data ?? []);
      setLabs(labsRes.data ?? []);
      setVitals(vitalsRes.data ?? []);

      // 4) Fetch clinical summary data
      try {
        const clinicalRes = await fetch('/api/clinical-summary');
        if (clinicalRes.ok) {
          const clinicalData = await clinicalRes.json();
          setClinicalSummary(clinicalData);
        } else {
          console.warn('Clinical summary fetch failed:', clinicalRes.status);
        }
      } catch (err) {
        console.error('Error fetching clinical summary:', err);
      }

        setLoading(false);
      } catch (err) {
        console.error("Error resolving user or loading data:", err);
        setErrorMsg("Failed to load user data. Please try again.");
        setLoading(false);
      }
    };

    run();
  }, [router]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (errorMsg) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-neutral-300">
        <p>{errorMsg}</p>
        <button
          className="mt-2 rounded-md border border-neutral-600 px-3 py-1 text-sm"
          onClick={() => router.push("/")}
        >
          Back to login
        </button>
      </div>
    );
  }

  return (
    <SubHealthAIDashboard
      serverUserId={dataUserId!}
      serverEmail={currentEmail!}
      isRealUser={true}
      currentEmail={currentEmail!}
      isSyntheticDemo={false}
      metrics={metrics}
      labs={labs}
      vitals={vitals}
      dataUserId={dataUserId!}
      initialClinical={clinicalSummary}
    />
  );
}
