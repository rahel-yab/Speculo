"use client";

import Link from "next/link";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    <main className="grid gap-6 rounded-[32px] border border-white/8 bg-[#17120f]/95 px-5 py-5 shadow-panel lg:grid-cols-[1.05fr_0.95fr] lg:px-6 lg:py-6">
      <section className="overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(247,197,123,0.24),_transparent_32%),linear-gradient(180deg,_#221814_0%,_#17120f_100%)] p-8 text-[#f6ead8]">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm uppercase tracking-[0.22em] text-[#e8c89a]">
          <Sparkles className="h-4 w-4" />
          User workspace
        </div>
        <h1 className="mt-8 max-w-[10ch] font-display text-5xl font-bold leading-[0.95]">
          Video intelligence for real teams.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-stone-300">
          Sign in to upload, transcribe, search, ask questions, and manage your workspace from one place.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[24px] border border-white/10 bg-black/15 p-5">
            <div className="text-sm uppercase tracking-[0.2em] text-stone-400">Included</div>
            <div className="mt-3 text-2xl font-semibold text-white">Profile management</div>
            <p className="mt-2 text-sm leading-7 text-stone-300">Update your account, track credits, and keep recent uploads close at hand.</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/15 p-5">
            <div className="text-sm uppercase tracking-[0.2em] text-stone-400">Workflow</div>
            <div className="mt-3 text-2xl font-semibold text-white">Searchable video library</div>
            <p className="mt-2 text-sm leading-7 text-stone-300">From upload to chapters and Q&A, each video lives in a usable workspace instead of a demo screen.</p>
          </div>
        </div>
      </section>

      <Card className="border-white/8 bg-[#f3eadc] text-[#211814] shadow-[0_25px_70px_rgba(0,0,0,0.18)]">
        <CardContent className="p-8">
          <div className="flex rounded-full bg-[#e7dbc8] p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-full px-4 py-3 transition ${mode === "login" ? "bg-[#201611] text-[#f7ecde]" : "text-[#6b5644]"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-full px-4 py-3 transition ${mode === "register" ? "bg-[#201611] text-[#f7ecde]" : "text-[#6b5644]"}`}
            >
              Create account
            </button>
          </div>

          <div className="mt-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#201611] text-[#f0b167]">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <h2 className="mt-5 font-display text-3xl font-bold">
              {mode === "login" ? "Welcome back" : "Set up your account"}
            </h2>
            <p className="mt-2 text-sm text-[#6b5644]">
              {mode === "login"
                ? "Use your email and password to access your library."
                : "Create an account and we’ll sign you in right away."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              type="email"
              placeholder="Work email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-14 border-[#d7c7b2] bg-white text-[#211814] placeholder:text-[#8d7763]"
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-14 border-[#d7c7b2] bg-white text-[#211814] placeholder:text-[#8d7763]"
              required
            />
            {mode === "register" ? (
              <Input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-14 border-[#d7c7b2] bg-white text-[#211814] placeholder:text-[#8d7763]"
                required
              />
            ) : null}
            {error ? <div className="rounded-2xl border border-[#d89586] bg-[#f8ded7] p-4 text-sm text-[#7a2415]">{error}</div> : null}
            <Button type="submit" disabled={busy} className="h-14 w-full rounded-full text-base">
              {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-sm text-[#6b5644]">
            By continuing you’ll land in your library, where uploads, profile settings, and search are tied to your account.
          </p>
          <Link href="/" className="mt-3 inline-block text-sm font-semibold text-[#201611] underline underline-offset-4">
            Back to library
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
