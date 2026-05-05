"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MONTH_NAMES = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"];

type Cotisation = {
  id: string;
  year: number;
  month: number;
  amount: number | null;
  status: "pending" | "paid" | "exempt";
  comment: string | null;
};

type Profile = {
  id: string;
  username: string;
  full_name: string;
  role: string;
  group_name: string;
};

export default function UserDashboard({ profile, cotisations }: { profile: Profile; cotisations: Cotisation[] }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const paid = cotisations.filter(c => c.status === "paid");
  const pending = cotisations.filter(c => c.status === "pending");
  const totalPaid = paid.reduce((s, c) => s + (c.amount || 0), 0);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function formatAmount(amount: number | null) {
    if (!amount) return "—";
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  }

  function getStatusBadge(status: string) {
    if (status === "paid") return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ Payé</span>;
    if (status === "exempt") return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">— Exempté</span>;
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">⏳ En attente</span>;
  }

  // Group by year
  const byYear: Record<number, Cotisation[]> = {};
  for (const c of cotisations) {
    if (!byYear[c.year]) byYear[c.year] = [];
    byYear[c.year].push(c);
  }

  const progressPct = cotisations.length > 0
    ? Math.round((paid.length / cotisations.filter(c => c.status !== "exempt").length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-brand-700 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Caisse Solidaire OnPoint</h1>
            <p className="text-brand-200 text-sm">Bienvenue, {profile.full_name}</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="bg-brand-800 hover:bg-brand-900 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {loggingOut ? "…" : "Déconnexion"}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total payé</p>
            <p className="text-2xl font-bold text-brand-700 mt-1">{new Intl.NumberFormat("fr-FR").format(totalPaid)}</p>
            <p className="text-xs text-gray-400">FCFA</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Mois payés</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{paid.length}</p>
            <p className="text-xs text-gray-400">sur {cotisations.filter(c => c.status !== "exempt").length} dûs</p>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">En attente</p>
            <p className="text-2xl font-bold text-red-500 mt-1">{pending.length}</p>
            <p className="text-xs text-gray-400">mois non payés</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Taux de recouvrement</span>
            <span className="text-sm font-bold text-brand-700">{progressPct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-brand-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Payment history by year */}
        {Object.entries(byYear).sort(([a],[b]) => Number(b)-Number(a)).map(([year, items]) => (
          <div key={year} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Année {year}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Mois</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Statut</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Montant</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.sort((a,b) => a.month - b.month).map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {MONTH_NAMES[c.month - 1]}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(c.status)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatAmount(c.amount)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{c.comment || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {cotisations.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400 border border-gray-100">
            Aucune cotisation enregistrée pour le moment.
          </div>
        )}
      </main>
    </div>
  );
}
