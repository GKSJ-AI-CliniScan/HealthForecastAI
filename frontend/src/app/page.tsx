"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white font-sans text-sm">
        Initializing Clinical Decision Intelligence...
      </div>
    );
  }

  return (
    <iframe
      src="/index.html"
      title="HealthForecastAI Clinical Dashboard"
      className="w-screen h-screen border-0 m-0 p-0 block"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
