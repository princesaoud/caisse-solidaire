"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      // Look up email by username
      const { data: emailData, error: fnError } = await supabase
        .rpc("get_email_by_username", { p_username: username.trim().toLowerCase() });

      if (fnError || !emailData) {
        setError("Identifiant ou mot de passe incorrect.");
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailData,
        password,
      });

      if (signInError) {
        setError("Identifiant ou mot de passe incorrect.");
        setLoading(false);
        return;
      }

      // Check if first login
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_first_login, role")
        .eq("user_id", (await supabase.auth.getUser()).data.user!.id)
        .single();

      if (profile?.is_first_login) {
        router.push("/change-password");
      } else if (profile?.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Caisse Solidaire</h1>
          <p className="text-gray-500 text-sm mt-1">OnPoint — Suivi des cotisations</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Identifiant</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-gray-900"
              placeholder="Votre identifiant"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-gray-900"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? "Connexion en cours…" : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Première connexion ? Utilisez le mot de passe temporaire fourni par l&apos;administrateur.
        </p>
      </div>
    </div>
  );
}
