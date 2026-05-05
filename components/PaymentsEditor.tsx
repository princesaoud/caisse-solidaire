"use client";
import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

const MONTH_NAMES = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

type Profile = { id: string; full_name: string; username: string; group_name: string };
type Cotisation = { id: string; profile_id: string; year: number; month: number; amount: number | null; status: "pending"|"paid"|"exempt"; comment: string | null };

export default function PaymentsEditor({ profiles, cotisations: initial }: { profiles: Profile[]; cotisations: Cotisation[] }) {
  const [cotisations, setCotisations] = useState<Cotisation[]>(initial);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [groupFilter, setGroupFilter] = useState<"all"|"alhassane"|"youssouf">("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{msg: string; type: "success"|"error"} | null>(null);

  const showToast = (msg: string, type: "success"|"error" = "success") => {
    setToast({msg, type});
    setTimeout(() => setToast(null), 3000);
  };

  const filteredProfiles = useMemo(() =>
    profiles.filter(p =>
      (groupFilter === "all" || p.group_name === groupFilter) &&
      p.full_name.toLowerCase().includes(search.toLowerCase())
    ), [profiles, groupFilter, search]);

  const profileCots = useMemo(() =>
    selectedProfile
      ? cotisations
          .filter(c => c.profile_id === selectedProfile.id)
          .sort((a,b) => a.year !== b.year ? a.year-b.year : a.month-b.month)
      : [],
    [cotisations, selectedProfile]);

  // All available year-month combos across all cotisations
  const allPeriods = useMemo(() => {
    const periods = new Set<string>();
    cotisations.forEach(c => periods.add(`${c.year}-${c.month}`));
    return [...periods].sort().map(p => {
      const [yr,mo] = p.split("-").map(Number);
      return { year: yr, month: mo };
    });
  }, [cotisations]);

  async function updateCotisation(cot: Cotisation, field: "status"|"amount"|"comment", value: string | number | null) {
    setSaving(cot.id);
    const supabase = createClient();
    const update: Partial<Cotisation> = { [field]: value, updated_at: new Date().toISOString() } as never;
    if (field === "status" && value === "paid" && !cot.amount) update.amount = 2000;
    if (field === "status" && value !== "paid") update.amount = null;

    const { error } = await supabase.from("cotisations").update(update).eq("id", cot.id);
    if (error) { showToast("Erreur: " + error.message, "error"); }
    else {
      setCotisations(prev => prev.map(c => c.id === cot.id ? { ...c, ...update } : c));
      showToast("Enregistré !");
    }
    setSaving(null);
  }

  async function addPeriod(year: number, month: number) {
    if (!selectedProfile) return;
    setSaving("new");
    const supabase = createClient();
    const { data, error } = await supabase.from("cotisations").insert({
      profile_id: selectedProfile.id, year, month, status: "pending", amount: null
    }).select().single();
    if (error) showToast("Erreur: " + error.message, "error");
    else { setCotisations(prev => [...prev, data]); showToast("Période ajoutée !"); }
    setSaving(null);
  }

  function exportCSV() {
    if (!selectedProfile) return;
    const rows = [["Membre","Mois","Année","Statut","Montant (FCFA)","Commentaire"]];
    profileCots.forEach(c => {
      rows.push([
        selectedProfile.full_name,
        MONTH_NAMES[c.month-1],
        String(c.year),
        c.status === "paid" ? "Payé" : c.status === "exempt" ? "Exempté" : "En attente",
        c.amount ? String(c.amount) : "",
        c.comment || ""
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["﻿"+csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cotisations_${selectedProfile.username}.csv`;
    a.click();
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-80px)]">
      {/* Left: member list */}
      <div className="w-72 flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <div className="p-3 border-b border-gray-100 space-y-2">
          <input type="text" placeholder="Rechercher…" value={search} onChange={e=>setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="flex gap-1">
            {(["all","alhassane","youssouf"] as const).map(g => (
              <button key={g} onClick={() => setGroupFilter(g)}
                className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${groupFilter===g ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                {g==="all"?"Tous":g.charAt(0).toUpperCase()+g.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {filteredProfiles.map(p => {
            const cots = cotisations.filter(c => c.profile_id === p.id);
            const paid = cots.filter(c => c.status === "paid").length;
            const pending = cots.filter(c => c.status === "pending").length;
            return (
              <button key={p.id} onClick={() => setSelectedProfile(p)}
                className={`w-full text-left px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedProfile?.id===p.id ? "bg-brand-50 border-l-2 border-l-brand-500" : ""}`}>
                <div className="font-medium text-gray-900 text-sm">{p.full_name}</div>
                <div className="flex gap-2 mt-0.5">
                  <span className="text-xs text-green-600">{paid} payés</span>
                  {pending > 0 && <span className="text-xs text-red-500">{pending} en attente</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: payment editor */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        {!selectedProfile ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">👈</div>
              <p>Sélectionnez un membre</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{selectedProfile.full_name}</h2>
                <p className="text-xs text-gray-400">@{selectedProfile.username} · {selectedProfile.group_name}</p>
              </div>
              <button onClick={exportCSV}
                className="bg-brand-600 hover:bg-brand-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors">
                ⬇ Exporter CSV
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-gray-600 font-medium">Période</th>
                    <th className="text-left py-2 text-gray-600 font-medium">Statut</th>
                    <th className="text-left py-2 text-gray-600 font-medium">Montant (FCFA)</th>
                    <th className="text-left py-2 text-gray-600 font-medium">Commentaire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {profileCots.map(c => (
                    <tr key={c.id} className={saving===c.id ? "opacity-60" : ""}>
                      <td className="py-2 pr-3 font-medium text-gray-900 whitespace-nowrap">
                        {MONTH_NAMES[c.month-1]} {c.year}
                      </td>
                      <td className="py-2 pr-3">
                        <select value={c.status}
                          onChange={e => updateCotisation(c, "status", e.target.value)}
                          className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500">
                          <option value="pending">En attente</option>
                          <option value="paid">Payé</option>
                          <option value="exempt">Exempté</option>
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        {c.status === "paid" ? (
                          <input type="number" value={c.amount || ""} min={0}
                            onChange={e => updateCotisation(c, "amount", e.target.value ? Number(e.target.value) : null)}
                            className="border border-gray-200 rounded px-2 py-1 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-2">
                        <input type="text" value={c.comment || ""}
                          placeholder="Ajouter une note…"
                          onChange={e => updateCotisation(c, "comment", e.target.value || null)}
                          className="border border-gray-200 rounded px-2 py-1 text-xs w-full max-w-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Add period */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2 font-medium">Ajouter une période manquante</p>
                <div className="flex flex-wrap gap-2">
                  {allPeriods.filter(p => !profileCots.some(c => c.year===p.year && c.month===p.month)).slice(0,12).map(p => (
                    <button key={`${p.year}-${p.month}`}
                      onClick={() => addPeriod(p.year, p.month)}
                      disabled={saving==="new"}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-brand-100 hover:text-brand-700 text-gray-600 rounded text-xs transition-colors">
                      {MONTH_NAMES[p.month-1].slice(0,3)} {p.year}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2.5 rounded-lg shadow-lg text-white text-sm font-medium z-50 ${toast.type==="success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
