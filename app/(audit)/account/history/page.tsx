"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../../../../components/ui/Button";

type AccountHistoryItem = {
  id: string;
  url: string;
  industry: string;
  overall: number;
  status: string;
  timestamp: string;
};

export default function AccountHistoryPage() {
  const [history, setHistory] = useState<AccountHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await fetch("/api/account/history?limit=200", {
          cache: "no-store",
        });
        const json = (await response.json()) as {
          error?: string;
          history?: AccountHistoryItem[];
        };
        if (!response.ok) {
          throw new Error(json.error || "Unable to load history");
        }
        if (mounted) {
          setHistory(json.history || []);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Unable to load history",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground px-6 pt-14 pb-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Account History
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              All past audits tied to your account.
            </p>
          </div>
          <Link href="/audit">
            <Button>Run new audit</Button>
          </Link>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground">Loading history...</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && !error && history.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-8">
            <p className="text-sm text-muted-foreground">
              No audits yet. Run your first audit to see history here.
            </p>
          </div>
        )}

        {!loading && !error && history.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="min-w-full text-sm">
              <thead className="border-b border-border bg-secondary/40">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">URL</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Industry
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Overall</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr
                    key={`${item.id}-${item.timestamp}`}
                    className="border-b border-border/70"
                  >
                    <td className="px-4 py-3 text-foreground/90 max-w-[360px] truncate">
                      {item.url}
                    </td>
                    <td className="px-4 py-3 capitalize text-foreground/80">
                      {item.industry.replaceAll("_", " ")}
                    </td>
                    <td className="px-4 py-3 font-semibold">{item.overall}</td>
                    <td className="px-4 py-3">{item.status}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/audit?url=${encodeURIComponent(item.url)}&autoStart=1`}
                        className="underline"
                      >
                        Re-run
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
