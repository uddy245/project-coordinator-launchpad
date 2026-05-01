"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchForm({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q.length === 0) {
      router.push("/search");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-wrap gap-3">
      <div className="flex-1 min-w-0">
        <Input
          type="search"
          placeholder="e.g. RAID log · sponsor · stakeholder · scope"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Search modules"
          autoFocus
        />
      </div>
      <Button type="submit">Search</Button>
    </form>
  );
}
