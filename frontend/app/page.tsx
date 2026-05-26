"use client";

import Link from "next/link";
import { ArrowRight, LayoutGrid, LoaderCircle, Plus, SearchIcon, Sparkles, Video } from "lucide-react";
import { useEffect, useState } from "react";

import { SearchBar } from "@/components/SearchBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch, type SearchResult, type UserProfile, type VideoListItem } from "@/lib/api";
import { readToken } from "@/lib/session";
import { formatDuration } from "@/lib/utils";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium"
  }).format(new Date(value));
}

export default function LibraryPage() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (!token) {
    return (
      <main className="grid gap-6 rounded-[32px] border border-white/8 bg-[#17120f]/95 px-5 py-5 shadow-panel lg:grid-cols-[1.15fr_0.85fr] lg:px-6">
        <section className="rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(240,177,103,0.2),_transparent_36%),linear-gradient(180deg,_#1f1712_0%,_#16110e_100%)] p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#f0c890]">
            <Sparkles className="h-4 w-4" />
            Full workspace
          </div>
          <h1 className="mt-8 max-w-[12ch] font-display text-5xl font-bold leading-[0.94] text-[#f8ead6]">
            Upload, search, and manage every video account-side.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-300">
            This is now structured as a user product, not just an uploader. Sign in to manage your profile, keep a private library, and work through transcripts and answers in one flow.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/auth">
              <Button className="h-12 rounded-full px-6 text-base">
                Sign in
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/auth?mode=register">
              <Button variant="secondary" className="h-12 rounded-full px-6 text-base">
                Create account
              </Button>
            </Link>
          </div>
        </section>

        <Card className="border-white/8 bg-[#f2e8da] text-[#211814]">
          <CardContent className="space-y-5 p-8">
            <h2 className="font-display text-3xl font-bold">What changed</h2>
            <div className="grid gap-4">
              <div className="rounded-[24px] border border-[#dbcab6] bg-white/80 p-5">
                <div className="font-semibold">Real account flow</div>
                <p className="mt-2 text-sm leading-7 text-[#6f5947]">Users can now sign in, open a profile page, update email, and change password.</p>
              </div>
              <div className="rounded-[24px] border border-[#dbcab6] bg-white/80 p-5">
                <div className="font-semibold">Private workspace</div>
                <p className="mt-2 text-sm leading-7 text-[#6f5947]">Credits, uploads, recent activity, search, and profile management are tied together.</p>
              </div>
              <div className="rounded-[24px] border border-[#dbcab6] bg-white/80 p-5">
                <div className="font-semibold">Cleaner interface</div>
                <p className="mt-2 text-sm leading-7 text-[#6f5947]">The library and upload screens now use a warmer, more editorial visual system instead of a generic AI dashboard look.</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
