"use client";

import { useRouter } from "next/navigation";
import { Film, Sparkles, UploadCloud } from "lucide-react";
import { DragEvent, useCallback, useState } from "react";

import { ProgressTracker } from "@/components/ProgressTracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { uploadVideo } from "@/lib/api";

export default function UploadPage() {
  const router = useRouter();
  const [token, setToken] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setFile(event.dataTransfer.files[0] ?? null);
  }, []);

  async function beginUpload() {
    const activeToken = token || localStorage.getItem("avip_token") || "";
    if (!activeToken || !file) return;
    localStorage.setItem("avip_token", activeToken);
    try {
      setError(null);
      const result = await uploadVideo(file, activeToken, setUploadPercent);
      setToken(activeToken);
      setVideoId(result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <main className="grid gap-8 rounded-b-[28px] border border-white/8 bg-[#12110f] px-8 py-10 lg:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              <Sparkles className="h-4 w-4 text-accent" />
              Production pipeline
            </div>
            <div className="font-display text-4xl font-bold text-white">Upload and process</div>
            <p className="text-slate-400">Send a video once, then watch extraction, transcription, embeddings, chapters, and summarization complete live.</p>
          </div>
          <Input
            type="text"
            placeholder="JWT token"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            className="rounded-[28px] border border-dashed border-white/12 bg-[#1a1916] p-10 text-center"
          >
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft/10 text-accent">
              {file ? <Film className="h-9 w-9" /> : <UploadCloud className="h-9 w-9" />}
            </div>
            <p className="text-2xl font-semibold text-white">{file ? file.name : "Drop a video file here"}</p>
            <p className="mt-2 text-sm text-slate-500">Accepts any `video/*` file. Upload progress comes from XHR, while backend progress streams over WebSockets.</p>
            <input
              type="file"
              accept="video/*"
              className="mt-6 block w-full text-sm text-slate-400"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <Button onClick={() => void beginUpload()} disabled={!file}>
            Start Upload
          </Button>
          {error ? <div className="rounded-2xl border border-[#5a2a2a] bg-[#2a1717] p-4 text-sm text-[#ffb6b6]">{error}</div> : null}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <ProgressTracker
          videoId={videoId}
          token={token || localStorage.getItem("avip_token") || ""}
          uploadPercent={uploadPercent}
          onComplete={() => {
            if (videoId) router.push(`/video/${videoId}`);
          }}
        />
      </div>
    </main>
  );
}
