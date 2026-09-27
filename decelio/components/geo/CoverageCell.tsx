export function CoverageCell({ state, label }: { state: "cited" | "absent" | "pending" | "rival"; label: string }) {
  const styles = {
    cited: "border-cited bg-cited",
    absent: "border-line bg-surface",
    pending: "border-signal bg-signal-light",
    rival: "border-rival bg-rival",
  };
  const status = { cited: "cité", absent: "absent", pending: "en attente", rival: "concurrent" }[state];
  return <div className="flex justify-center" role="img" aria-label={`${label}: ${status}`}><span className={`h-5 w-5 rounded-sm border ${styles[state]}`} /></div>;
}
