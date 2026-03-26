"use client";

import type { LiveAuditHistory } from "../lib/audit-types";
import { History, Link as LinkIcon } from "lucide-react";

export default function LiveDatabaseHistory({
  records,
}: {
  records: LiveAuditHistory[];
}) {
  return (
    <div className="liquid-glass-soft rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-2">
        <History className="h-4 w-4 text-emerald-300" />
        <h3 className="text-lg font-semibold text-emerald-50">
          Recent Live Audits
        </h3>
      </div>
      {records.length === 0 ? (
        <p className="mt-3 text-sm text-emerald-100/65">
          No audit records available.
        </p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm text-emerald-100/90">
          {records.map((record) => (
            <li
              key={record.id}
              className="rounded-xl border border-emerald-300/20 bg-black/45 px-3 py-3 transition hover:bg-emerald-900/20"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center truncate">
                  <LinkIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                  {record.url}
                </span>
                <span className="rounded-md bg-emerald-500/15 px-2 py-1 font-semibold text-emerald-200">
                  {record.scores.overall}
                </span>
              </div>
              <div className="mt-1 text-xs font-mono text-emerald-100/55">
                {new Date(record.timestamp).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
