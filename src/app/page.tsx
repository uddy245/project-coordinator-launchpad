import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <h1 className="text-4xl font-bold text-foreground">Launchpad</h1>
      <p className="mt-4 text-muted-foreground">
        AI-powered Project Coordinator training. Coming soon.
      </p>
      <Button className="mt-8">Get Started</Button>
    </main>
  );
}
