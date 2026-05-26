"use client";

import Link from "next/link";
import { Clock3, CreditCard, Film, KeyRound, Mail, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  apiFetch,
  changePassword,
  type CreditHistoryItem,
  type UserProfile,
  type VideoListItem,
  updateProfile
} from "@/lib/api";
import { clearToken, readToken } from "@/lib/session";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function ProfilePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditHistoryItem[]>([]);
  const [emailDraft, setEmailDraft] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const activeToken = readToken();
    if (!activeToken) {
      router.replace("/auth");
      return;
    }

    setToken(activeToken);
    void Promise.all([
      apiFetch<UserProfile>("/auth/me", activeToken),
      apiFetch<CreditHistoryItem[]>("/credits/history", activeToken),
      apiFetch<VideoListItem[]>("/videos", activeToken)
    ])
      .then(([user, history, userVideos]) => {
        setProfile(user);
        setEmailDraft(user.email);
        setCreditHistory(history);
        setVideos(userVideos);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to load profile");
      });
  }, [router]);

  async function saveEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    try {
      setError(null);
      setMessage(null);
      const next = await updateProfile(emailDraft, token);
      setProfile(next);
      setMessage("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update profile");
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    try {
      setError(null);
      setMessage(null);
      await changePassword(currentPassword, newPassword, token);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update password");
    }
  }

  function signOut() {
    clearToken();
    router.push("/auth");
  }

  if (error && !profile) {
    return <main className="rounded-[30px] border border-[#723327] bg-[#321812] px-8 py-10 text-sm text-[#f2b7ac]">{error}</main>;
  }

  if (!profile) {
    return (
      <main className="rounded-[30px] border border-white/8 bg-panel px-8 py-10 text-stone-300 shadow-panel">
        Loading your account workspace...
      </main>
    );
  }

  return (
    <main className="space-y-6 rounded-[30px] border border-white/8 bg-[#14100d]/95 px-5 py-5 shadow-panel lg:px-6">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(240,177,103,0.2),_transparent_32%),linear-gradient(180deg,_#211711_0%,_#17120f_100%)]">
          <CardContent className="p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-[#f0c890]">
                  <UserRound className="h-4 w-4" />
                  Profile
                </div>
                <h1 className="mt-5 font-display text-4xl font-bold text-[#f8ead6]">{profile.email}</h1>
                <p className="mt-3 max-w-xl text-sm leading-7 text-stone-300">
                  Manage identity, password, credits, and your recent work from one place.
                </p>
              </div>
              <Button variant="secondary" onClick={signOut} className="rounded-full px-5">
                Sign out
              </Button>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-black/15 p-5">
                <div className="text-sm text-stone-400">Credits left</div>
                <div className="mt-2 text-3xl font-bold text-white">{profile.credits_remaining}</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/15 p-5">
                <div className="text-sm text-stone-400">Videos</div>
                <div className="mt-2 text-3xl font-bold text-white">{videos.length}</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/15 p-5">
                <div className="text-sm text-stone-400">Member since</div>
                <div className="mt-2 text-lg font-semibold text-white">{formatDate(profile.created_at)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/8 bg-[#f2e8da] text-[#201611]">
          <CardContent className="space-y-5 p-8">
            <div>
              <h2 className="font-display text-3xl font-bold">Quick actions</h2>
              <p className="mt-2 text-sm leading-7 text-[#6f5947]">
                Jump back into uploads or review the most recent work in your library.
              </p>
            </div>
            <div className="grid gap-3">
              <Link href="/upload">
                <Button className="h-12 w-full rounded-full">Upload a new video</Button>
              </Link>
              <Link href="/">
                <Button variant="secondary" className="h-12 w-full rounded-full border-[#d5c4af] bg-white text-[#201611]">
                  Open library
                </Button>
              </Link>
            </div>
            <div className="rounded-[24px] border border-[#dccab4] bg-white/70 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#7a5a35]">
                <Film className="h-4 w-4" />
                Recent uploads
              </div>
              <div className="mt-4 space-y-3">
                {videos.slice(0, 3).map((video) => (
                  <Link
                    key={video.id}
                    href={`/video/${video.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[#e5d8c7] bg-white px-4 py-3 transition hover:border-[#c6ac8a]"
                  >
                    <div>
                      <div className="font-semibold text-[#201611]">{video.title}</div>
                      <div className="text-sm text-[#7b6550]">{formatDate(video.created_at)}</div>
                    </div>
                    <Badge>{video.status}</Badge>
                  </Link>
                ))}
                {videos.length === 0 ? <div className="text-sm text-[#7b6550]">No uploads yet.</div> : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {error ? <div className="rounded-2xl border border-[#723327] bg-[#321812] p-4 text-sm text-[#f2b7ac]">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-[#3f6247] bg-[#142017] p-4 text-sm text-[#bfe4c6]">{message}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[0.8fr_0.8fr_1.1fr]">
        <Card>
          <CardContent className="space-y-5 p-7">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-[#f0b167]" />
              <h2 className="font-display text-2xl font-semibold text-white">Account email</h2>
            </div>
            <form onSubmit={saveEmail} className="space-y-4">
              <Input value={emailDraft} onChange={(event) => setEmailDraft(event.target.value)} type="email" required />
              <Button type="submit" className="w-full rounded-full">
                Save profile
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5 p-7">
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-[#f0b167]" />
              <h2 className="font-display text-2xl font-semibold text-white">Password</h2>
            </div>
            <form onSubmit={savePassword} className="space-y-4">
              <Input
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                type="password"
                placeholder="Current password"
                required
              />
              <Input
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                placeholder="New password"
                required
              />
              <Button type="submit" className="w-full rounded-full">
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5 p-7">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-[#f0b167]" />
              <h2 className="font-display text-2xl font-semibold text-white">Credit history</h2>
            </div>
            <div className="space-y-3">
              {creditHistory.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div>
                    <div className="font-semibold text-white">{item.reason}</div>
                    <div className="flex items-center gap-2 text-sm text-stone-400">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDate(item.created_at)}
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${item.delta < 0 ? "text-[#ffb39f]" : "text-[#c8f0b5]"}`}>
                    {item.delta > 0 ? `+${item.delta}` : item.delta}
                  </div>
                </div>
              ))}
              {creditHistory.length === 0 ? <div className="text-sm text-stone-400">No credit activity yet.</div> : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
