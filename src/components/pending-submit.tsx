"use client";

import { useFormStatus } from "react-dom";

type PendingSubmitProps = {
  idleLabel: string;
  pendingLabel: string;
  idleHint: string;
  pendingHint: string;
  className?: string;
};

export function PendingSubmit({
  idleLabel,
  pendingLabel,
  idleHint,
  pendingHint,
  className = "",
}: PendingSubmitProps) {
  const { pending } = useFormStatus();

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-[#8a6f61]" aria-live="polite">
        {pending ? pendingHint : idleHint}
      </p>
      <button
        type="submit"
        disabled={pending}
        className={`rounded-2xl bg-[#7f6255] px-4 py-3 text-sm text-white transition hover:bg-[#6d5349] disabled:opacity-60 ${className}`}
      >
        {pending ? pendingLabel : idleLabel}
      </button>
    </div>
  );
}
