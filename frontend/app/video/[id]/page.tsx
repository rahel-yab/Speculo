"use client";

import { Copy } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { QAPanel } from "@/components/QAPanel";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch, type VideoDetail } from "@/lib/api";
import { formatDuration } from "@/lib/utils";

export default function VideoPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoElement = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const activeToken = localStorage.getItem("avip_token") ?? "";
    setToken(activeToken);
    void apiFetch<VideoDetail>(`/videos/${params.id}`, activeToken)
      .then(setVideo)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load video"));
  }, [params.id]);

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
    return <div className="rounded-2xl border border-[#5a2a2a] bg-[#2a1717] p-4 text-sm text-[#ffb6b6]">{error}</div>;
  }

  if (!video?.video_url) {
    return <div className="rounded-2xl border border-white/8 bg-panel p-8 text-slate-400 shadow-panel">Loading video details...</div>;
  }

  return (
    <main className="space-y-8 rounded-b-[28px] border border-white/8 bg-[#12110f] px-8 py-10">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl font-bold text-white">{video.title}</h1>
            <Badge>{video.status}</Badge>
            <span className="text-sm text-slate-400">{formatDuration(video.duration_seconds)}</span>
          </div>
          <VideoPlayer src={video.video_url} onReady={(element) => (videoElement.current = element)} />
          <QAPanel videoId={params.id} token={token} />
        </div>

        <Card className="h-fit">
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-semibold text-white">Chapters</h2>
              <p className="text-sm text-slate-400">Click a chapter to seek the player or copy a timestamped link.</p>
            </div>
            <div className="space-y-3">
              {video.chapters.map((chapter) => (
                <div key={chapter.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <button className="text-left" onClick={() => seekTo(chapter.start_seconds)}>
                      <div className="font-semibold text-white">{chapter.title}</div>
                      <div className="mt-1 text-sm text-slate-400">
                        {formatDuration(chapter.start_seconds)} - {formatDuration(chapter.end_seconds)}
                      </div>
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => copyTimestamp(chapter.start_seconds)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{chapter.summary}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
