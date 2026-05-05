"use client";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const MONTH_NAMES = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"];

type Profile = { id: string; full_name: string; username: string; group_name: string; role: string };
type Cotisation = { id: string; profile_id: string; year: number; month: number; amount: number | null; status: "pending"|"paid"|"exempt" };

function fmt(n: number) { return new Intl.NumberFormat("fr-FR").format(n) + " F"; }

export default function AdminDashboardClient({ profiles, cotisations }: { profiles: Profile[]; cotisations: Cotisation[] }) {
  const [groupFilter, setGroupFilter] = useState<"all"|"alhassane"|"youssouf">("all");
  const [search, setSearch] = useState("");

  const profileMap = useMemo(() => {
    const m: Record<string, Profile> = {};
    profiles.forEach(p => m[p.id] = p);
    return m;
  }, [profiles]);

  const filteredProfiles = useMemo(() =>
    profiles.filter(p =>
      (groupFilter === "all" || p.group_name === groupFilter) &&
      p.full_name.toLowerCase().includes(search.toLowerCase())
    ), [profiles, groupFilter, search]);

  // Per-member stats
  const memberStats = useMemo(() => filteredProfiles.map(p => {
    const cots = cotisations.filter(c => c.profile_id === p.id);
    const paid = cots.filter(c => c.status === "paid");
    const pending = cots.filter(c => c.status === "pending");
    const exempt = cots.filter(c => c.status === "exempt");
    const due = cots.filter(c => c.status !== "exempt");
    const totalPaid = paid.reduce((s,c) => s+(c.amount||0), 0);
    const pct = due.length > 0 ? Math.round(paid.length/due.length*100) : 100;
    return { profile: p, paid: paid.length, pending: pending.length, exempt: exempt.length, due: due.length, totalPaid, pct };
  }), [filteredProfiles, cotisations]);

  // Global stats
  const globalStats = useMemo(() => {
    const relevant = cotisations.filter(c => {
      const p = profileMap[c.profile_id];
      return p && (groupFilter === "all" || p.group_name === groupFilter);
    });
    const paid = relevant.filter(c => c.status === "paid");
    const pending = relevant.filter(c => c.status === "pending");
    const totalCollected = paid.reduce((s,c) => s+(c.amount||0), 0);
    const due = relevant.filter(c => c.status !== "exempt");
    const globalPct = due.length > 0 ? Math.round(paid.length/due.length*100) : 0;
    return { total: relevant.length, paid: paid.length, pending: pending.length, totalCollected, globalPct };
  }, [cotisations, profileMap, groupFilter]);

  // Monthly chart data (last 12 months)
  const monthlyData = useMemo(() => {
    const months: {label: string; collected: number; pending: number}[] = [];
    const allYears = Array.from(new Set(cotisations.map(c=>c.year))).sort();
    const pairs: {year:number;month:number}[] = [];
    for (const yr of allYears) {
      for (let mo=1; mo<=12; mo++) {
        if (cotisations.some(c=>c.year===yr && c.month===mo)) pairs.push({year:yr,month:mo});
      }
    }
    const last = pairs.slice(-12);
    for (const {year, month} of last) {
      const relevant = cotisations.filter(c => {
        const p = profileMap[c.profile_id];
        return p && c.year===year && c.month===month && (groupFilter==="all" || p.group_name===groupFilter);
      });
      const collected = relevant.filter(c=>c.status==="paid").reduce((s,c)=>s+(c.amount||0),0);
      const pending = relevant.filter(c=>c.status==="pending").length;
      months.push({ label: `${MONTH_NAMES[month-1]} ${String(year).slice(2)}`, collected, pending });
    }
    return months;
  }, [cotisations, profileMap, groupFilter]);

  function exportCSV() {
    const rows = [["Nom","Groupe","Mois payés","Mois en attente","Montant total (FCFA)","Taux (%)"]];
    memberStats.forEach(({ profile: p, paid, pending, totalPaid, pct }) => {
      rows.push([p.full_name, p.group_name, String(paid), String(pending), String(totalPaid), String(pct)]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["﻿"+csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="cotisations_export.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Global KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total collecté", value: fmt(globalStats.totalCollected), sub: "FCFA", color: "text-brand-700" },
          { label: "Taux global", value: `${globalStats.globalPct}%`, sub: "de recouvrement", color: "text-green-600" },
          { label: "Mois payés", value: globalStats.paid, sub: "entrées", color: "text-blue-600" },
          { label: "En attente", value: globalStats.pending, sub: "non payés", color: "text-red-500" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            <p className="text-xs text-gray-400">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Monthly chart */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
        <h2 className="font-semibold text-gray-800 mb-4">Collecte mensuelle (FCFA)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
            <Tooltip formatter={(v: number) => [fmt(v), "Collecté"]} />
            <Bar dataKey="collected" radius={[4,4,0,0]}>
              {monthlyData.map((_, i) => <Cell key={i} fill="#16a34a" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters + table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <h2 className="font-semibold text-gray-800">Progression par membre</h2>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-40"
            />
            {(["all","alhassane","youssouf"] as const).map(g => (
              <button key={g} onClick={() => setGroupFilter(g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${groupFilter===g ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {g === "all" ? "Tous" : g.charAt(0).toUpperCase()+g.slice(1)}
              </button>
            ))}
            <button onClick={exportCSV}
              className="bg-brand-600 hover:bg-brand-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1">
              ⬇ Exporter CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Membre</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium hidden sm:table-cell">Groupe</th>
                <th className="text-center px-4 py-3 text-gray-600 font-medium">Progression</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Payés</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium hidden sm:table-cell">En attente</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Total FCFA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {memberStats.map(({ profile: p, paid, pending, totalPaid, due, pct }) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{p.full_name}</div>
                    <div className="text-xs text-gray-400">@{p.username}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{p.group_name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
                        <div className={`h-2 rounded-full ${pct >= 75 ? "bg-green-500" : pct >= 40 ? "bg-yellow-400" : "bg-red-400"}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-600 w-9 text-right">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-green-700 font-medium">{paid}<span className="text-gray-400 font-normal">/{due}</span></td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    {pending > 0 ? <span className="text-red-500">{pending}</span> : <span className="text-gray-300">0</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{new Intl.NumberFormat("fr-FR").format(totalPaid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
