"use client";

export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="page-shell container empty-panel"><h1>Something went wrong</h1><p>The page could not be loaded. Try again in a moment.</p><button className="button button-primary" type="button" onClick={() => reset()}>Retry</button></div>;
}
