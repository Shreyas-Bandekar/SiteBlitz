"use client";

import type { LiveAuditHistory } from "../lib/audit-types";

export default function LiveDatabaseHistory({ records }: { records: LiveAuditHistory[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <h3 className="text-lg font-semibold text-white">Recent Live Audits</h3>
      <ul className="mt-3 space-y-2 text-sm text-white/80">
        {records.map((record) => (
          <li key={record.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate">{record.url}</span>
              <span className="font-semibold">{record.scores.overall}</span>
            </div>
            <div className="mt-1 text-xs font-mono text-white/50">{new Date(record.timestamp).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
