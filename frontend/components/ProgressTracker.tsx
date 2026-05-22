"use client";

import { useEffect, useMemo, useState } from "react";

import { Progress } from "@/components/ui/progress";
import { progressSocket, type ProgressMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

const steps = [
  { key: "upload", label: "Upload" },
  { key: "extracting", label: "Extract" },
  { key: "transcribing", label: "Transcribe" },
  { key: "embedding", label: "Embed" },
  { key: "chapters", label: "Chapters" },
  { key: "ready", label: "Ready" }
];

export function ProgressTracker({
  videoId,
  token,
  uploadPercent,
  onComplete
}: {
  videoId: string | null;
  token: string;
  uploadPercent: number;
  onComplete: () => void;
}) {
  const [progress, setProgress] = useState<ProgressMessage>({
    status: "upload",
    percent: uploadPercent,
    message: "Uploading video"
  });

  useEffect(() => {
    setProgress((current) => ({ ...current, percent: Math.max(current.percent, uploadPercent) }));
  }, [uploadPercent]);

  useEffect(() => {
    if (!videoId) return;
    const socket = progressSocket(videoId, token);
    socket.onmessage = (event) => {
      const next = JSON.parse(event.data) as ProgressMessage;
      setProgress(next);
      if (next.status === "ready") {
        onComplete();
      }
    };
    return () => socket.close();
  }, [videoId, token, onComplete]);

  const activeStep = useMemo(() => {
    if (progress.status === "embedding" && progress.message.toLowerCase().includes("chapter")) {
      return "chapters";
    }
    return progress.status;
  }, [progress]);

  return (
    <div className="space-y-5 rounded-[24px] border border-white/8 bg-panel p-6 shadow-panel">
      <div className="space-y-2">
        <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Pipeline Progress</div>
        <div className="text-2xl font-semibold text-white">{progress.message}</div>
      </div>
      <Progress value={progress.percent} />
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {steps.map((step) => {
          const active = step.key === activeStep;
          const completed =
            progress.percent === 100 ||
            steps.findIndex((item) => item.key === step.key) < steps.findIndex((item) => item.key === activeStep);
          return (
            <div
              key={step.key}
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                active && "border-accent/40 bg-accent/10 text-white",
                !active && completed && "border-white/10 bg-white/6 text-slate-200",
                !active && !completed && "border-white/8 bg-[#1d1c19] text-slate-500"
              )}
            >
              {step.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
