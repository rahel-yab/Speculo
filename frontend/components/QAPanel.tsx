"use client";

import { FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { streamQa } from "@/lib/api";

export function QAPanel({ videoId, token }: { videoId: string; token: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAnswer("");
    setError(null);
    startTransition(() => {
      void streamQa(videoId, question, token, (chunk) => {
        setAnswer((current) => current + chunk);
      }).catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to answer that question");
      });
    });
  }

  return (
    <div className="space-y-4 rounded-[24px] border border-white/8 bg-panel p-6 shadow-panel">
      <div>
        <h3 className="font-display text-2xl font-semibold text-white">Ask This Video</h3>
        <p className="text-sm text-stone-400">Answers stream from transcript-grounded context so the response stays tied to the uploaded material.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What are the key takeaways?" />
        <Button disabled={isPending || question.trim().length < 2}>{isPending ? "Thinking..." : "Ask"}</Button>
      </form>
      <div className="min-h-32 rounded-2xl border border-white/8 bg-[#181411] p-4 text-sm leading-7 text-stone-300">
        {error ? <span className="text-[#f2b7ac]">{error}</span> : answer || "Your streamed answer will appear here."}
      </div>
    </div>
  );
}
