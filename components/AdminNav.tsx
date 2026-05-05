"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = { full_name: string; username: string };

export default function AdminNav({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const links = [
    { href: "/admin/dashboard", label: "Tableau de bord" },
    { href: "/admin/payments", label: "Cotisations" },
    { href: "/admin/members", label: "Membres" },
  ];

  return (
    <header className="bg-brand-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <span className="font-bold text-base">🏦 Caisse Solidaire</span>
            <nav className="hidden sm:flex gap-1">
              {links.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === l.href
                      ? "bg-brand-600 text-white"
                      : "text-brand-200 hover:bg-brand-700 hover:text-white"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-brand-200 text-sm hidden sm:block">{profile.full_name}</span>
            <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">Admin</span>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="bg-brand-700 hover:bg-brand-900 text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              {loggingOut ? "…" : "Déconnexion"}
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="sm:hidden flex gap-1 pb-2 overflow-x-auto">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                pathname === l.href ? "bg-brand-600 text-white" : "text-brand-200 hover:bg-brand-700"
              }`}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
