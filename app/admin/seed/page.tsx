"use client";
import { useState } from "react";

export default function SeedPage() {
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{summary: Record<string,number>; results: string[]} | null>(null);
  const [error, setError] = useState("");

  async function handleSeed(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/seed", {
        method: "POST",
        headers: { "x-seed-secret": secret },
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Erreur inconnue");
      else setResult(data);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h2 className="font-bold text-amber-800">⚠️ Initialisation des données</h2>
        <p className="text-amber-700 text-sm mt-1">
          Cette page crée tous les comptes utilisateurs et importe l&apos;historique des cotisations.
          Ne l&apos;exécutez qu&apos;une seule fois, juste après avoir configuré Supabase.
        </p>
      </div>

      <form onSubmit={handleSeed} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Lancer l&apos;initialisation</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Clé secrète (SEED_SECRET)</label>
          <input
            type="password" value={secret} onChange={e => setSecret(e.target.value)}
            placeholder="Entrez la clé configurée dans vos variables d'environnement"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
        <button type="submit" disabled={loading}
          className="bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors">
          {loading ? "Initialisation en cours… (peut prendre 1-2 min)" : "Lancer l'initialisation"}
        </button>
      </form>

      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
          <h3 className="font-semibold text-gray-900">Résultats</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{result.summary.created}</div>
              <div className="text-green-700">Créés</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-600">{result.summary.skipped}</div>
              <div className="text-gray-700">Ignorés</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{result.summary.errors}</div>
              <div className="text-red-700">Erreurs</div>
            </div>
          </div>
          <div className="bg-gray-900 text-green-400 rounded-lg p-3 text-xs font-mono max-h-60 overflow-y-auto">
            {result.results.map((r, i) => <div key={i}>{r}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}
