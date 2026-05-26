"use client";

import { Command, Loader2, Search } from "lucide-react";
import { FormEvent, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";

export function SearchBar({
  onSearch
}: {
  onSearch: (query: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(() => {
      void onSearch(query);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 rounded-[24px] border border-white/8 bg-[#1d1712] p-4 shadow-panel">
      <Search className="h-5 w-5 text-stone-500" />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search across your videos with natural language..."
        className="h-12 border-0 bg-[#28211c] shadow-none focus:ring-0"
      />
      <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-[#28211c] px-3 py-2 text-sm text-stone-400 sm:flex">
        <Command className="h-4 w-4" />
        K
      </div>
      {isPending ? <Loader2 className="h-5 w-5 animate-spin text-accent" /> : null}
    </form>
  );
}
