"use client";

import Link from "next/link";
import { Copy, MessagesSquare, PlayCircle } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { QAPanel } from "@/components/QAPanel";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch, type VideoDetail } from "@/lib/api";
import { readToken } from "@/lib/session";
import { formatDuration } from "@/lib/utils";

export default function VideoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoElement = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const activeToken = readToken();
    if (!activeToken) {
      router.replace("/auth");
      return;
    }

    setToken(activeToken);
    void apiFetch<VideoDetail>(`/videos/${params.id}`, activeToken)
      .then(setVideo)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load video"));
  }, [params.id, router]);

  useEffect(() => {
    const timestamp = Number(searchParams.get("t") ?? "");
    if (!videoElement.current || Number.isNaN(timestamp)) return;
    videoElement.current.currentTime = timestamp;
  }, [searchParams, video]);

  function seekTo(seconds: number) {
    if (!videoElement.current) return;
    videoElement.current.currentTime = seconds;
    videoElement.current.play().catch(() => undefined);
  }

  function copyTimestamp(seconds: number) {
    const url = `${window.location.origin}/video/${params.id}?t=${Math.floor(seconds)}`;
    void navigator.clipboard.writeText(url);
  }

  if (error) {
    return <div className="rounded-2xl border border-[#723327] bg-[#321812] p-4 text-sm text-[#f2b7ac]">{error}</div>;
  }

  if (!video?.video_url) {
    return <div className="rounded-[28px] border border-white/8 bg-panel p-8 text-stone-300 shadow-panel">Loading video details...</div>;
  }

  return (
    <main className="space-y-6 rounded-[32px] border border-white/8 bg-[#15110d]/95 px-5 py-5 shadow-panel lg:px-6">
      <section className="rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(240,177,103,0.15),_transparent_28%),linear-gradient(180deg,_#1e1611_0%,_#16110d_100%)] p-7">
        <Link href="/" className="text-sm font-semibold text-stone-300 underline-offset-4 hover:text-white hover:underline">
          Back to library
        </Link>
        <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-4xl font-bold text-[#f8ead6]">{video.title}</h1>
              <Badge>{video.status}</Badge>
              <span className="text-sm text-stone-400">{formatDuration(video.duration_seconds)}</span>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300">
              Review chapters, ask transcript-aware questions, and share precise timestamps from the same page.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/upload">
              <Button variant="secondary" className="rounded-full px-5">
                New upload
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="secondary" className="rounded-full px-5">
                Profile
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardContent className="space-y-6 p-6">
              <div className="flex items-center gap-3">
                <PlayCircle className="h-5 w-5 text-[#f0b167]" />
                <h2 className="font-display text-2xl font-semibold text-white">Playback</h2>
              </div>
              <VideoPlayer src={video.video_url} onReady={(element) => (videoElement.current = element)} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-3">
                <MessagesSquare className="h-5 w-5 text-[#f0b167]" />
                <h2 className="font-display text-2xl font-semibold text-white">Ask this video</h2>
              </div>
              <QAPanel videoId={params.id} token={token} />
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardContent className="space-y-5 p-6">
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-semibold text-white">Chapters</h2>
              <p className="text-sm text-stone-400">Click any chapter to seek instantly or copy a link to that exact moment.</p>
            </div>
            <div className="space-y-3">
              {video.chapters.map((chapter) => (
                <div key={chapter.id} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <button className="text-left" onClick={() => seekTo(chapter.start_seconds)}>
                      <div className="font-semibold text-white">{chapter.title}</div>
                      <div className="mt-1 text-sm text-stone-400">
                        {formatDuration(chapter.start_seconds)} - {formatDuration(chapter.end_seconds)}
                      </div>
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => copyTimestamp(chapter.start_seconds)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-stone-300">{chapter.summary}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
