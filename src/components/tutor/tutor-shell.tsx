"use client";

import { useState } from "react";
import { TutorDrawer } from "@/components/tutor/tutor-drawer";

export function TutorShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={[
        "flex min-h-screen flex-col bg-background transition-[padding] duration-200 ease-in-out",
        open ? "md:pr-[28rem]" : "",
      ].join(" ")}
    >
      {children}
      <TutorDrawer open={open} setOpen={setOpen} />
    </div>
  );
}
