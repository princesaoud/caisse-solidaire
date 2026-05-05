"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentProfile, setCurrentProfile] = useState<{id: string; username: string; full_name: string} | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("profiles").select("id,username,full_name").eq("user_id", user.id).single();
      if (data) {
        setCurrentProfile(data);
        setNewUsername(data.username);
      }
    }
    load();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) { setError("Les mots de passe ne correspondent pas."); return; }
    if (newPassword.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères."); return; }
    if (!newUsername.trim()) { setError("L'identifiant ne peut pas être vide."); return; }

    const cleanUsername = newUsername.trim().toLowerCase().replace(/\s+/g, "_");
    setLoading(true);

    const supabase = createClient();

    // Check username availability (excluding current profile)
    const { data: available } = await supabase.rpc("is_username_available", {
      p_username: cleanUsername,
      p_exclude_id: currentProfile?.id,
    });

    if (!available) {
      setError("Cet identifiant est déjà pris. Veuillez en choisir un autre.");
      setLoading(false);
      return;
    }

    // Update password
    const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
    if (pwError) { setError("Erreur lors du changement de mot de passe: " + pwError.message); setLoading(false); return; }

    // Update profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ username: cleanUsername, is_first_login: false })
      .eq("id", currentProfile?.id);

    if (profileError) { setError("Erreur lors de la mise à jour du profil: " + profileError.message); setLoading(false); return; }

    // Check role to redirect
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", currentProfile?.id).single();
    if (profile?.role === "admin") router.push("/admin/dashboard");
    else router.push("/dashboard");
  }

  if (!currentProfile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-600 border-t-transparent"/>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 rounded-full mb-3">
            <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Première connexion</h1>
          <p className="text-gray-500 text-sm mt-1">
            Bienvenue, <strong>{currentProfile.full_name}</strong> !<br/>
            Veuillez choisir votre identifiant et mot de passe personnels.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouvel identifiant</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-900"
              placeholder="identifiant_unique"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Lettres, chiffres, tirets et underscores uniquement.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-900"
              placeholder="Minimum 8 caractères"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-900"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? "Enregistrement…" : "Enregistrer et continuer"}
          </button>
        </form>
      </div>
    </div>
  );
}
