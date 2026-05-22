"use client";

import Link from "next/link";
import { LayoutGrid, LoaderCircle, Plus, Sparkles, Video } from "lucide-react";
import { useEffect, useState } from "react";

import { SearchBar } from "@/components/SearchBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch, type SearchResult, type VideoListItem } from "@/lib/api";
import { formatDuration } from "@/lib/utils";

export default function LibraryPage() {
  const [token, setToken] = useState("");
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("avip_token") ?? "";
    setToken(saved);
    if (saved) {
      void loadVideos(saved);
    }
  }, []);

  async function loadVideos(activeToken: string) {
    try {
      setError(null);
      const data = await apiFetch<VideoListItem[]>("/videos", activeToken);
      setVideos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load videos");
    }
  }

  async function handleSearch(query: string) {
    if (!query.trim()) {
      setResults([]);
      await loadVideos(token);
      return;
    }
    const matches = await apiFetch<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`, token);
    setResults(matches);
  }

  function saveToken() {
    localStorage.setItem("avip_token", token);
    void loadVideos(token);
  }

  function cardTint(index: number) {
    const palette = [
      "bg-[#dcdaf0] text-accent",
      "bg-[#d6ebe3] text-[#1b9f79]",
      "bg-[#f3e8cf] text-gold",
      "bg-[#f1dfd8] text-coral"
    ];
    return palette[index % palette.length];
  }

  function statusLine(video: VideoListItem) {
    if (video.status !== "ready") {
      return { text: `${video.status[0].toUpperCase()}${video.status.slice(1)}...`, className: "text-gold" };
    }
    return {
      text: video.summary ? video.summary : "Ready for semantic search and Q&A",
      className: "text-slate-400"
    };
  }

  return (
    <main className="space-y-10 rounded-b-[28px] border border-white/8 bg-[#12110f] px-8 py-10">
      <section className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <SearchBar onSearch={handleSearch} />
          <div className="flex gap-3">
            <Input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="JWT token"
              className="h-[60px]"
            />
            <Button onClick={saveToken} className="h-[60px] min-w-[110px]">
              Save
            </Button>
          </div>
        </div>
        {error ? <div className="rounded-2xl border border-[#5a2a2a] bg-[#2a1717] p-4 text-sm text-[#ffb6b6]">{error}</div> : null}
      </section>

      {results.length > 0 ? (
        <section className="space-y-5">
          <div className="flex items-center gap-3 text-3xl font-semibold text-white">
            <Sparkles className="h-6 w-6 text-accent" />
            Search results
          </div>
          {results.map((result) => (
            <Card key={result.chunk_id} className="border-white/10 bg-[#353431]">
              <CardContent className="flex gap-5 p-4">
                <div className="h-14 w-14 rounded-2xl bg-[#dcdaf0]" />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-display text-xl font-semibold text-white">{result.video_title}</div>
                      <div className="text-sm text-slate-400">
                        Match at {formatDuration(result.start_seconds)} to {formatDuration(result.end_seconds)}
                      </div>
                    </div>
                    <Link href={`/video/${result.video_id}?t=${Math.floor(result.start_seconds)}`}>
                      <Button variant="secondary">Open Match</Button>
                    </Link>
                  </div>
                  <p className="text-sm leading-7 text-slate-300">{result.text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : (
        <section className="space-y-10">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-white">Recent videos</h2>
              <p className="text-sm text-slate-500">Semantic indexing and chapter extraction for every upload.</p>
            </div>
            <Link href="/upload">
              <Button variant="secondary" className="h-14 px-6 text-xl font-medium">
                <Plus className="mr-2 h-5 w-5" />
                Upload video
              </Button>
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {videos.map((video, index) => {
              const meta = statusLine(video);
              return (
                <Link href={`/video/${video.id}`} key={video.id}>
                  <Card className="overflow-hidden border-white/10 bg-[#33322f] transition hover:-translate-y-1 hover:border-white/20">
                    <div className={cardTint(index)}>
                      <div className="relative flex aspect-video items-center justify-center">
                        <div className="absolute left-3 top-3 h-3 w-3 rounded-full bg-sage" />
                        {video.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={video.thumbnail_url} alt={video.title} className="h-full w-full object-cover" />
                        ) : video.status === "ready" ? (
                          <Video className="h-12 w-12" />
                        ) : (
                          <LoaderCircle className="h-10 w-10 animate-spin" />
                        )}
                        <div className="absolute bottom-3 right-3 rounded-lg bg-black/40 px-2.5 py-1 text-[0.95rem] font-semibold text-white">
                          {formatDuration(video.duration_seconds)}
                        </div>
                      </div>
                    </div>
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="line-clamp-2 font-display text-[2rem] font-semibold leading-none text-white">
                          {video.title}
                        </h2>
                        <Badge>{video.status}</Badge>
                      </div>
                      <div className="text-[0.98rem] text-slate-400">
                        {video.status === "ready" ? "Ready for Q&A" : "Processing pipeline active"}
                      </div>
                      <p className={`line-clamp-2 text-[1.15rem] ${meta.className}`}>{meta.text}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
          {videos.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/12 bg-[#1b1a18] p-10 text-center text-slate-400">
              <LayoutGrid className="mx-auto mb-4 h-10 w-10 text-slate-500" />
              No videos yet. Upload one to kick off transcription, embeddings, chapters, and Q&A.
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}
