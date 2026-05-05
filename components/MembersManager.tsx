"use client";
import { useState, useMemo } from "react";

type Profile = {
  id: string; user_id: string; username: string; full_name: string;
  role: string; group_name: string; is_first_login: boolean;
};

export default function MembersManager({ profiles }: { profiles: Profile[] }) {
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<"all"|"alhassane"|"youssouf">("all");
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{msg: string; type: "success"|"error"} | null>(null);
  const [confirmReset, setConfirmReset] = useState<Profile | null>(null);

  const showToast = (msg: string, type: "success"|"error" = "success") => {
    setToast({msg, type});
    setTimeout(() => setToast(null), 4000);
  };

  const filtered = useMemo(() =>
    profiles.filter(p =>
      (groupFilter==="all" || p.group_name===groupFilter) &&
      (p.full_name.toLowerCase().includes(search.toLowerCase()) ||
       p.username.toLowerCase().includes(search.toLowerCase()))
    ), [profiles, groupFilter, search]);

  async function resetPassword(profile: Profile) {
    setResettingId(profile.id);
    setConfirmReset(null);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profile.id }),
      });
      const data = await res.json();
      if (!res.ok) showToast("Erreur: " + data.error, "error");
      else showToast(`Mot de passe réinitialisé pour ${profile.full_name}. Nouveau MDP: Cotisation2025!`);
    } catch {
      showToast("Erreur réseau", "error");
    } finally {
      setResettingId(null);
    }
  }

  const admins = profiles.filter(p => p.role === "admin");
  const users = profiles.filter(p => p.role !== "admin");
  const firstLogins = profiles.filter(p => p.is_first_login);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total membres", value: profiles.length, color: "text-gray-900" },
          { label: "Admins", value: admins.length, color: "text-amber-600" },
          { label: "Jamais connectés", value: firstLogins.length, color: "text-red-500" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <h2 className="font-semibold text-gray-800">Liste des membres</h2>
          <div className="flex flex-wrap gap-2">
            <input type="text" placeholder="Rechercher…" value={search} onChange={e=>setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-40"
            />
            {(["all","alhassane","youssouf"] as const).map(g => (
              <button key={g} onClick={() => setGroupFilter(g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${groupFilter===g ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                {g==="all"?"Tous":g.charAt(0).toUpperCase()+g.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Nom</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Identifiant</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium hidden sm:table-cell">Groupe</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Rôle</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Statut</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.full_name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.username}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full capitalize text-gray-600">{p.group_name}</span>
                  </td>
                  <td className="px-4 py-3">
                    {p.role === "admin"
                      ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Admin</span>
                      : <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Membre</span>}
                  </td>
                  <td className="px-4 py-3">
                    {p.is_first_login
                      ? <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Pas encore connecté</span>
                      : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Actif</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setConfirmReset(p)}
                      disabled={resettingId === p.id}
                      className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {resettingId === p.id ? "…" : "Réinitialiser MDP"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmReset && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Réinitialiser le mot de passe ?</h3>
            <p className="text-gray-600 text-sm mb-4">
              Le mot de passe de <strong>{confirmReset.full_name}</strong> sera réinitialisé à{" "}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">Cotisation2025!</code>.
              L&apos;utilisateur devra le changer à sa prochaine connexion.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmReset(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={() => resetPassword(confirmReset)}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium">
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium z-50 max-w-sm ${toast.type==="success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
