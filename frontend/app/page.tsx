"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronRight, LayoutGrid, LoaderCircle, Plus, SearchIcon, Sparkles, Video } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { SearchBar } from "@/components/SearchBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { lusitana } from "@/app/ui/fonts";
import { apiFetch, loginUser, registerUser, type SearchResult, type UserProfile, type VideoListItem } from "@/lib/api";
import { readToken, writeToken } from "@/lib/session";
import { formatDuration } from "@/lib/utils";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium"
  }).format(new Date(value));
}

export default function LibraryPage() {
  const router = useRouter();
  const [activeStory, setActiveStory] = useState<"search" | "upload" | "qa">("search");
  const [token, setToken] = useState("");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupBusy, setSignupBusy] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  const stories = {
    search: {
      label: "Search",
      title: "Ask a question and jump straight to the right moment.",
      text: "Speculo keeps transcripts, timestamps, and answers together so you can move from idea to exact clip without digging.",
      bullets: ["Transcript matches", "Timestamp jumps", "Answer snippets"]
    },
    upload: {
      label: "Upload",
      title: "Drop in a file and let the workspace do the rest.",
      text: "Uploads flow into one clean library with status, summary, and chapters so nothing feels hidden.",
      bullets: ["Simple upload flow", "Clear processing status", "Auto-organized library"]
    },
    qa: {
      label: "Q&A",
      title: "Turn long videos into something you can actually use.",
      text: "Ask follow-up questions, review the sources, and keep the conversation inside a calm, readable layout.",
      bullets: ["Follow-up questions", "Readable answers", "Video sources"]
    }
  };

  useEffect(() => {
    const activeToken = readToken();
    setToken(activeToken);
    if (!activeToken) {
      setLoading(false);
      return;
    }

    void Promise.all([
      apiFetch<UserProfile>("/auth/me", activeToken),
      apiFetch<VideoListItem[]>("/videos", activeToken)
    ])
      .then(([profile, library]) => {
        setUser(profile);
        setVideos(library);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load workspace");
      })
      .finally(() => setLoading(false));
  }, []);

  async function loadVideos(activeToken: string) {
    const data = await apiFetch<VideoListItem[]>("/videos", activeToken);
    setVideos(data);
  }

  async function handleSearch(query: string) {
    if (!query.trim()) {
      setResults([]);
      if (token) {
        await loadVideos(token);
      }
      return;
    }
    const matches = await apiFetch<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`, token);
    setResults(matches);
  }

  function cardTint(index: number) {
    const palette = [
      "bg-[#ede2d0] text-[#4c3726]",
      "bg-[#d9e7dd] text-[#244535]",
      "bg-[#e8d8ce] text-[#6a3c2b]",
      "bg-[#e9dfc4] text-[#5d4a22]"
    ];
    return palette[index % palette.length];
  }

  function statusLine(video: VideoListItem) {
    if (video.status !== "ready") {
      return { text: `${video.status[0].toUpperCase()}${video.status.slice(1)} in progress`, className: "text-[#f2c283]" };
    }
    return {
      text: video.summary ? video.summary : "Ready for semantic search, timestamp jumps, and Q&A.",
      className: "text-stone-500"
    };
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignupError(null);
    setSignupBusy(true);

    try {
      await registerUser(signupEmail, signupPassword);
      const tokenResponse = await loginUser(signupEmail, signupPassword);
      writeToken(tokenResponse.access_token);
      router.push("/");
    } catch (err) {
      setSignupError(err instanceof Error ? err.message : "Unable to create account");
    } finally {
      setSignupBusy(false);
    }
  }

  if (!token) {
    const story = stories[activeStory];

    return (
      <main className="space-y-8 rounded-[32px] border border-[#e3ddd1] bg-[#f7f3eb] px-5 py-5 text-[#1f1a17] shadow-[0_30px_90px_rgba(23,18,13,0.08)] lg:px-6">
        <section className="grid gap-6 rounded-[28px] border border-[#e1dbd0] bg-[radial-gradient(circle_at_top_left,_rgba(214,193,163,0.36),_transparent_32%),linear-gradient(180deg,_#fffaf4_0%,_#f2eadf_100%)] p-7 lg:grid-cols-[1.08fr_0.92fr] lg:p-8">
          <div className="flex flex-col justify-between gap-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d9d1c2] bg-white/75 px-4 py-2 text-xs uppercase tracking-[0.26em] text-[#7b6757]">
                <Sparkles className="h-4 w-4" />
                Speculo
              </div>
              <div className="max-w-2xl space-y-5">
                <h1 className="max-w-[12ch] font-display text-5xl font-semibold leading-[0.92] text-[#18120f] lg:text-6xl">
                  Clean video knowledge, without the clutter.
                </h1>
                <p className={`${lusitana.className} max-w-xl text-lg leading-8 text-[#5d534a]`}>
                  A simple workspace for uploading, searching, and asking questions about video content. Built to feel calm, readable, and quick to understand.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/auth?mode=register">
                  <Button className="h-12 rounded-full px-6 text-base">
                    Sign up
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/auth">
                  <Button variant="secondary" className="h-12 rounded-full px-6 text-base">
                    Sign in
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Fast search", value: "Find exact moments" },
                { label: "Clear library", value: "See uploads at a glance" },
                { label: "Account aware", value: "Keep everything personal" }
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-[#ddd5c6] bg-white/78 p-4 shadow-[0_10px_24px_rgba(23,18,13,0.04)]">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#8a7664]">{item.label}</div>
                  <div className="mt-2 text-sm font-medium text-[#2f281f]">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden border-[#e1dbd0] bg-white text-[#1f1a17] shadow-[0_24px_70px_rgba(23,18,13,0.08)]">
            <CardContent className="p-6 sm:p-7">
              <div className="flex flex-wrap gap-2 rounded-full bg-[#f2ece2] p-1">
                {(Object.keys(stories) as Array<keyof typeof stories>).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveStory(key)}
                    className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                      activeStory === key ? "bg-[#18120f] text-white shadow-sm" : "text-[#66584a] hover:bg-white"
                    }`}
                  >
                    {stories[key].label}
                  </button>
                ))}
              </div>

              <div className="mt-6 rounded-[24px] border border-[#e8dfd1] bg-[#fcfaf6] p-5">
                <div className="text-sm uppercase tracking-[0.24em] text-[#8a7664]">Interactive preview</div>
                <h2 className="mt-3 max-w-md font-display text-3xl font-semibold leading-tight text-[#18120f]">
                  {story.title}
                </h2>
                <p className={`${lusitana.className} mt-4 text-[1.02rem] leading-8 text-[#5d534a]`}>
                  {story.text}
                </p>
                <div className="mt-6 grid gap-3">
                  {story.bullets.map((bullet) => (
                    <div key={bullet} className="flex items-center gap-3 rounded-2xl border border-[#e3dbcf] bg-white px-4 py-3 text-sm font-medium text-[#30271f]">
                      <ChevronRight className="h-4 w-4 text-[#9b7f59]" />
                      {bullet}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {[
            {
              title: "Readable by default",
              text: "Soft contrast, clear spacing, and restrained color keep the interface simple to scan."
            },
            {
              title: "Built for action",
              text: "The landing page stays interactive, so visitors can explore the product without feeling lost."
            },
            {
              title: "One obvious next step",
              text: "The footer and hero both lead to the same signup and sign-in flow, so users never wonder where to go."
            }
          ].map((item) => (
            <Card key={item.title} className="border-[#e1dbd0] bg-white text-[#1f1a17] shadow-[0_18px_46px_rgba(23,18,13,0.06)]">
              <CardContent className="p-6">
                <h2 className="font-display text-2xl font-semibold text-[#18120f]">{item.title}</h2>
                <p className={`${lusitana.className} mt-3 text-[1rem] leading-7 text-[#5d534a]`}>{item.text}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <footer className="flex flex-col gap-5 rounded-[28px] border border-[#e1dbd0] bg-white px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.26em] text-[#8a7664]">Get started</div>
            <p className={`${lusitana.className} mt-2 max-w-xl text-[1.02rem] leading-7 text-[#5d534a]`}>
              Sign up to create your workspace or sign in if you already have an account.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth?mode=register">
              <Button className="h-12 rounded-full px-6 text-base">
                Sign up
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/auth">
              <Button variant="secondary" className="h-12 rounded-full px-6 text-base">
                Sign in
              </Button>
            </Link>
          </div>
        </footer>
      </main>
    );
  }

  return (
    <main className="space-y-8 rounded-[32px] border border-white/8 bg-[#15110d]/95 px-5 py-5 shadow-panel lg:px-6">
      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(240,177,103,0.18),_transparent_28%),linear-gradient(180deg,_#1f1712_0%,_#16110e_100%)] p-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#f0c890]">
            <LayoutGrid className="h-4 w-4" />
            Library
          </div>
          <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="font-display text-4xl font-bold text-[#f8ead6]">
                {user ? `${user.email.split("@")[0]}'s workspace` : "Your workspace"}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-stone-300">
                Search across processed footage, jump directly into answers, and keep recent uploads organized.
              </p>
            </div>
            <Link href="/upload">
              <Button className="h-12 rounded-full px-6">
                <Plus className="mr-2 h-4 w-4" />
                Upload video
              </Button>
            </Link>
          </div>
        </div>

        <Card className="bg-[#f2e8da] text-[#211814]">
          <CardContent className="grid gap-4 p-7 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div>
              <div className="text-sm text-[#7a5d43]">Videos</div>
              <div className="mt-2 text-3xl font-bold">{videos.length}</div>
            </div>
            <div>
              <div className="text-sm text-[#7a5d43]">Ready</div>
              <div className="mt-2 text-3xl font-bold">{videos.filter((video) => video.status === "ready").length}</div>
            </div>
            <div>
              <div className="text-sm text-[#7a5d43]">Latest upload</div>
              <div className="mt-2 text-sm font-semibold">
                {videos[0] ? formatDate(videos[0].created_at) : "No uploads yet"}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SearchBar onSearch={handleSearch} />
        <div className="rounded-[24px] border border-white/8 bg-[#1d1712] px-5 py-4 text-sm text-stone-300">
          Search returns transcript-level matches with timestamps, then you can open the exact moment in the player.
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-[#723327] bg-[#321812] p-4 text-sm text-[#f2b7ac]">{error}</div> : null}

      {results.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-3xl font-semibold text-white">
            <SearchIcon className="h-6 w-6 text-[#f0b167]" />
            Search results
          </div>
          {results.map((result) => (
            <Card key={result.chunk_id} className="border-white/10 bg-[#1b1612]">
              <CardContent className="flex flex-col gap-5 p-5 md:flex-row">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ede2d0] text-[#4c3726]">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-display text-2xl font-semibold text-white">{result.video_title}</div>
                      <div className="text-sm text-stone-400">
                        Match at {formatDuration(result.start_seconds)} to {formatDuration(result.end_seconds)}
                      </div>
                    </div>
                    <Link href={`/video/${result.video_id}?t=${Math.floor(result.start_seconds)}`}>
                      <Button variant="secondary" className="rounded-full">
                        Open match
                      </Button>
                    </Link>
                  </div>
                  <p className="text-sm leading-7 text-stone-300">{result.text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : (
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">Recent videos</h2>
              <p className="text-sm text-stone-400">Each upload carries its transcript, chapters, status, and summary.</p>
            </div>
          </div>
          {loading ? (
            <div className="rounded-[24px] border border-white/8 bg-[#1b1713] p-10 text-center text-stone-400">
              Loading your library...
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {videos.map((video, index) => {
                const meta = statusLine(video);
                return (
                  <Link href={`/video/${video.id}`} key={video.id}>
                    <Card className="overflow-hidden border-white/10 bg-[#1b1612] transition hover:-translate-y-1 hover:border-[#f0b167]/25">
                      <div className={cardTint(index)}>
                        <div className="relative flex aspect-video items-center justify-center">
                          {video.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={video.thumbnail_url} alt={video.title} className="h-full w-full object-cover" />
                          ) : video.status === "ready" ? (
                            <Video className="h-12 w-12" />
                          ) : (
                            <LoaderCircle className="h-10 w-10 animate-spin" />
                          )}
                          <div className="absolute bottom-3 right-3 rounded-full bg-black/35 px-3 py-1 text-sm font-semibold text-white">
                            {formatDuration(video.duration_seconds)}
                          </div>
                        </div>
                      </div>
                      <CardContent className="space-y-3 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="line-clamp-2 font-display text-[2rem] font-semibold leading-none text-white">
                            {video.title}
                          </h2>
                          <Badge>{video.status}</Badge>
                        </div>
                        <div className="text-sm text-stone-500">{formatDate(video.created_at)}</div>
                        <p className={`line-clamp-3 text-[1rem] leading-7 ${meta.className}`}>{meta.text}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
          {!loading && videos.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/12 bg-[#1b1713] p-10 text-center text-stone-400">
              <LayoutGrid className="mx-auto mb-4 h-10 w-10 text-stone-500" />
              No videos yet. Start with an upload and this library will fill in with transcripts, chapters, and searchable moments.
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}
