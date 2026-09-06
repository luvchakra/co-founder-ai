"use client";

import { useActionState, useState } from "react";
import { Pencil, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import type { RenameActionState } from "@/lib/tenancy/types";

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * Same collapsed-by-default, click-to-edit pattern as EditableText, but for a knowledge
 * source's content: the collapsed view truncates (sources can run up to 15,000 chars),
 * while editing opens the full untruncated text in a textarea.
 */
export function EditableSourceContent({
  content,
  action,
}: {
  content: string;
  action: (prevState: RenameActionState, formData: FormData) => Promise<RenameActionState>;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<RenameActionState, FormData>(
    action,
    null,
  );

  // Adjust state during render (compare against previous), not a useEffect -- same
  // pattern EditableText/EditableName use to exit edit mode after a successful save.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state && "success" in state && editing) setEditing(false);
  }

  if (!editing) {
    return (
      <div className="mt-1 flex items-start gap-2">
        <p className="text-muted-foreground">{truncate(content, 200)}</p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Edit source content"
          className="mt-0.5 shrink-0 text-muted-foreground transition-[color,transform] duration-100 hover:text-foreground active:scale-90"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-1 flex flex-col gap-2">
      <Textarea name="value" defaultValue={content} autoFocus rows={4} />
      <div className="flex items-center gap-2">
        <SubmitButton size="sm" pendingText="Saving...">
          Save
        </SubmitButton>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={pending}
          aria-label="Cancel"
          className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
        {state && "error" in state ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
