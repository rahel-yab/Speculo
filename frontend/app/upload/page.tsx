"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Film, Sparkles, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { DragEvent, useCallback, useEffect, useState } from "react";

import { ProgressTracker } from "@/components/ProgressTracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch, type UserProfile, uploadVideo } from "@/lib/api";
import { readToken } from "@/lib/session";

export default function UploadPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const activeToken = readToken();
    if (!activeToken) {
      router.replace("/auth");
      return;
    }

    setToken(activeToken);
    void apiFetch<UserProfile>("/auth/me", activeToken)
      .then(setUser)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load session"));
  }, [router]);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setFile(event.dataTransfer.files[0] ?? null);
  }, []);

  async function beginUpload() {
    if (!token || !file) return;
    try {
      setError(null);
      const result = await uploadVideo(file, token, setUploadPercent);
      setVideoId(result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <main className="grid gap-6 rounded-[32px] border border-white/8 bg-[#15110d]/95 px-5 py-5 shadow-panel lg:grid-cols-[1fr_0.95fr] lg:px-6">
      <section className="space-y-6">
        <div className="rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(240,177,103,0.18),_transparent_28%),linear-gradient(180deg,_#1f1712_0%,_#15110d_100%)] p-7">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-stone-300 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to library
          </Link>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#f0c890]">
                <Sparkles className="h-4 w-4" />
                Upload studio
              </div>
              <h1 className="mt-5 font-display text-4xl font-bold text-[#f8ead6]">Bring in a video and let the pipeline handle the rest.</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-stone-300">
                We’ll extract audio, transcribe, generate chapters, create embeddings, and return a searchable workspace.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/15 px-5 py-4 text-sm text-stone-300">
              <div className="font-semibold text-white">{user?.email ?? "Signed in"}</div>
              <div className="mt-1">{user?.credits_remaining ?? 0} credits remaining</div>
            </div>
          </div>
        </div>

        <Card className="border-white/8 bg-[#f2e8da] text-[#211814]">
          <CardContent className="space-y-5 p-7">
            <div>
              <h2 className="font-display text-3xl font-bold">Drop zone</h2>
              <p className="mt-2 text-sm leading-7 text-[#6f5947]">
                Choose one video file. As soon as the upload finishes, backend progress takes over live.
              </p>
            </div>
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className="rounded-[28px] border border-dashed border-[#cfb89b] bg-white p-8 text-center"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#f7efe5] text-[#a26322]">
                {file ? <Film className="h-9 w-9" /> : <UploadCloud className="h-9 w-9" />}
              </div>
              <p className="mt-5 text-2xl font-semibold">{file ? file.name : "Drag a video here"}</p>
              <p className="mt-2 text-sm text-[#6f5947]">MP4, MOV, and other `video/*` formats work here.</p>
              <label className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-full border border-[#d0b291] px-5 py-3 text-sm font-semibold text-[#211814] transition hover:bg-[#f4ebdf]">
                Choose file
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[#dcc9b3] bg-white p-4">
                <div className="text-sm font-semibold">1. Upload</div>
                <p className="mt-2 text-sm text-[#6f5947]">Secure file transfer with visible progress.</p>
              </div>
              <div className="rounded-[22px] border border-[#dcc9b3] bg-white p-4">
                <div className="text-sm font-semibold">2. Process</div>
                <p className="mt-2 text-sm text-[#6f5947]">Audio extraction, transcript, embeddings, and chapters.</p>
              </div>
              <div className="rounded-[22px] border border-[#dcc9b3] bg-white p-4">
                <div className="text-sm font-semibold">3. Review</div>
                <p className="mt-2 text-sm text-[#6f5947]">Open the finished video in its own searchable page.</p>
              </div>
            </div>
            <Button onClick={() => void beginUpload()} disabled={!file || !token} className="h-12 rounded-full px-6">
              Start upload
            </Button>
            {error ? <div className="rounded-2xl border border-[#d89586] bg-[#f8ded7] p-4 text-sm text-[#7a2415]">{error}</div> : null}
          </CardContent>
        </Card>
      </section>

      <div className="space-y-6">
        <ProgressTracker
          videoId={videoId}
          token={token}
          uploadPercent={uploadPercent}
          onComplete={() => {
            if (videoId) router.push(`/video/${videoId}`);
          }}
        />
        <Card>
          <CardContent className="space-y-4 p-7">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-[#f0b167]" />
              <h2 className="font-display text-2xl font-semibold text-white">What you get back</h2>
            </div>
            <div className="space-y-3 text-sm leading-7 text-stone-300">
              <p>A dedicated video page with playback, chapters, and transcript-aware Q&A.</p>
              <p>A searchable library card so the upload stays discoverable later.</p>
              <p>Account-linked history through your profile and credit balance.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
