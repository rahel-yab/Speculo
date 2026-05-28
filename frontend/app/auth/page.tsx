"use client";

import Link from "next/link";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { lusitana } from "@/app/ui/fonts";
import { loginUser, registerUser } from "@/lib/api";
import { readToken, writeToken } from "@/lib/session";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (readToken()) {
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "register") {
        await registerUser(email, password);
      }
      const token = await loginUser(email, password);
      writeToken(token.access_token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-[calc(100vh-1.5rem)] gap-6 rounded-[32px] border border-[#e1dbd0] bg-[#f6f2eb] px-5 py-5 text-[#1f1a17] shadow-[0_30px_90px_rgba(23,18,13,0.08)] lg:grid-cols-[0.95fr_1.05fr] lg:px-6 lg:py-6">
      <section className="overflow-hidden rounded-[28px] border border-[#e1dbd0] bg-[radial-gradient(circle_at_top_left,_rgba(206,178,141,0.22),_transparent_35%),linear-gradient(180deg,_#fbf8f2_0%,_#f3ede3_100%)] p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#d9d1c2] bg-white/70 px-4 py-2 text-sm uppercase tracking-[0.22em] text-[#7b6757]">
          <Sparkles className="h-4 w-4" />
          Speculo
        </div>
        <h1 className="mt-8 max-w-[10ch] font-display text-5xl font-semibold leading-[0.95] text-[#18120f]">
          {mode === "login" ? "Sign in to your workspace." : "Create your workspace."}
        </h1>
        <p className={`${lusitana.className} mt-5 max-w-xl text-lg leading-8 text-[#5d534a]`}>
          {mode === "login"
            ? "Access uploads, search, and Q&A from a quiet interface that stays focused on the work."
            : "Create your account to start uploading, searching, and asking questions in a calm, organized space."}
        </p>
        <div className="mt-10 rounded-[24px] border border-[#ddd5c6] bg-white/75 p-5 text-sm leading-7 text-[#564b41] shadow-[0_10px_24px_rgba(23,18,13,0.04)]">
          Speculo keeps the interface quiet so the content stays front and center.
        </div>
      </section>

      <Card className="border-[#e1dbd0] bg-white text-[#1f1a17] shadow-[0_24px_70px_rgba(23,18,13,0.08)]">
        <CardContent className="p-8">
          <div className="mt-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#18120f] text-[#f0b167]">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <h2 className="mt-5 font-display text-3xl font-semibold">
              {mode === "login" ? "Welcome back" : "Set up your account"}
            </h2>
            <p className="mt-2 text-sm text-[#64584c]">
              {mode === "login"
                ? "Use your email and password to access your library."
                : "Create an account and you’ll be taken straight into Speculo."}
            </p>
          </div>

          <div className="mt-6 grid rounded-full bg-[#f2ece2] p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-full px-4 py-3 transition ${mode === "login" ? "bg-[#18120f] text-white" : "text-[#66584a]"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`rounded-full px-4 py-3 transition ${mode === "register" ? "bg-[#18120f] text-white" : "text-[#66584a]"}`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              type="email"
              placeholder="Work email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-14 border-[#d7d0c4] bg-[#fcfbf8] text-[#211814] placeholder:text-[#8d7763]"
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-14 border-[#d7d0c4] bg-[#fcfbf8] text-[#211814] placeholder:text-[#8d7763]"
              required
            />
            {mode === "register" ? (
              <Input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-14 border-[#d7d0c4] bg-[#fcfbf8] text-[#211814] placeholder:text-[#8d7763]"
                required
              />
            ) : null}
            {error ? <div className="rounded-2xl border border-[#e4b0a5] bg-[#fae8e4] p-4 text-sm text-[#8c2e1d]">{error}</div> : null}
            <Button type="submit" disabled={busy} className="h-14 w-full rounded-full text-base">
              {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-sm text-[#64584c]">
            {mode === "login" ? "Need an account? " : "Already have an account? "}
            <Link href={mode === "login" ? "/auth?mode=register" : "/auth"} className="font-semibold text-[#18120f] underline underline-offset-4">
              {mode === "login" ? "Create one" : "Sign in"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
