"use client";

import Link from "next/link";
import { LayoutGrid, LogOut, Upload, UserRound, Zap } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { apiFetch, type UserProfile } from "@/lib/api";
import { clearToken, readToken, SESSION_EVENT } from "@/lib/session";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Library", icon: LayoutGrid },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/profile", label: "Profile", icon: UserRound }
];

function initialsFromEmail(email: string) {
  const [name] = email.split("@");
  return name
    .split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AI";
}

export function AppChrome() {
  const pathname = usePathname();
  const router = useRouter();
  const [credits, setCredits] = useState<number | null>(null);
  const [initials, setInitials] = useState("AI");
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    function loadSession() {
      const token = readToken();
      if (!token) {
        setCredits(null);
        setInitials("AI");
        setUser(null);
        return;
      }
      void Promise.allSettled([
        apiFetch<{ credits_remaining: number }>("/credits/balance", token),
        apiFetch<UserProfile>("/auth/me", token)
      ]).then(([balance, me]) => {
        if (balance.status === "fulfilled") {
          setCredits(balance.value.credits_remaining);
        }
        if (me.status === "fulfilled") {
          setUser(me.value);
          setInitials(initialsFromEmail(me.value.email));
        }
      });
    }

    loadSession();
    window.addEventListener("storage", loadSession);
    window.addEventListener(SESSION_EVENT, loadSession);
    return () => {
      window.removeEventListener("storage", loadSession);
      window.removeEventListener(SESSION_EVENT, loadSession);
    };
  }, [pathname]);

  function signOut() {
    clearToken();
    router.push("/auth");
  }

  return (
    <header className="mb-8 rounded-[30px] border border-white/8 bg-panel/95 shadow-[0_30px_90px_rgba(14,11,7,0.24)] backdrop-blur">
      <div className="flex flex-col gap-5 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
          <Link href="/" className="font-display text-[2rem] font-bold tracking-tight text-[#f6e6d0]">
            Northstar
          </Link>
          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-3 rounded-full border px-4 py-2.5 text-[0.98rem] font-medium transition",
                    active
                      ? "border-[#f0b167]/30 bg-[#f0b167]/12 text-[#fff3df]"
                      : "border-white/10 bg-transparent text-stone-300 hover:border-white/20 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          {user ? (
            <>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f0b167]/25 bg-[#f0b167]/10 px-4 py-2 text-sm font-semibold text-[#ffd6a4]">
                <Zap className="h-4 w-4 fill-current" />
                {credits ?? user.credits_remaining} credits
              </div>
              <Link
                href="/profile"
                className="flex items-center gap-3 rounded-full border border-white/10 bg-[#181512] px-3 py-2 pr-4 text-stone-200 transition hover:border-white/20"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f2e6d8] text-sm font-bold text-[#1d1712]">
                  {initials}
                </div>
                <div className="hidden text-left sm:block">
                  <div className="max-w-[180px] truncate text-sm font-semibold text-white">{user.email}</div>
                  <div className="text-xs text-stone-400">Manage account</div>
                </div>
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut} className="rounded-full border border-white/10 px-4 text-stone-300">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth">
                <Button variant="secondary" className="rounded-full px-5">
                  Sign in
                </Button>
              </Link>
              <Link href="/auth?mode=register">
                <Button className="rounded-full px-5">Create account</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
