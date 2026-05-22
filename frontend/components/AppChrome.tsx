"use client";

import Link from "next/link";
import { LayoutGrid, Play, Upload, Zap } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Library", icon: LayoutGrid },
  { href: "/video", label: "Video", icon: Play },
  { href: "/upload", label: "Upload", icon: Upload }
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
  const [credits, setCredits] = useState<number | null>(null);
  const [initials, setInitials] = useState("AI");

  useEffect(() => {
    const token = localStorage.getItem("avip_token");
    if (!token) return;
    void Promise.allSettled([
      apiFetch<{ credits_remaining: number }>("/credits/balance", token),
      apiFetch<{ email: string }>("/auth/me", token)
    ]).then(([balance, me]) => {
      if (balance.status === "fulfilled") {
        setCredits(balance.value.credits_remaining);
      }
      if (me.status === "fulfilled") {
        setInitials(initialsFromEmail(me.value.email));
      }
    });
  }, []);

  return (
    <header className="mb-10 rounded-[28px] border border-white/8 bg-panel shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-5 px-8 py-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-display text-[2rem] font-bold tracking-tight text-accent">
            speculo
          </Link>
          <nav className="flex flex-wrap items-center gap-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : item.href === "/video"
                    ? pathname.startsWith("/video")
                    : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href === "/video" && !pathname.startsWith("/video") ? "/" : item.href}
                  className={cn(
                    "inline-flex items-center gap-3 rounded-2xl border px-6 py-3 text-[1.05rem] font-medium transition",
                    active
                      ? "border-white/18 bg-white/6 text-white"
                      : "border-white/10 bg-transparent text-slate-200 hover:border-white/18 hover:bg-white/5"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4 self-start lg:self-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-5 py-2 text-lg font-semibold text-accent">
            <Zap className="h-4 w-4 fill-current" />
            {credits ?? 0} credits
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-lg font-semibold text-accent">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
