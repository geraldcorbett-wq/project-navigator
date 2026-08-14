"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../lib/supabase/client";

export type EntityType = "memory" | "circle" | "schedule" | "conversation";

type SelectionState = {
  active: boolean;
  sourceType: EntityType | null;
  sourceId: string | null;
  returnTo: string;
};

export function useLinkSelection() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [state, setState] = useState<SelectionState>({ active: false, sourceType: null, sourceId: null, returnTo: "/" });
  const [selectionMessage, setSelectionMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sourceType = params.get("sourceType") as EntityType | null;
    const sourceId = params.get("sourceId");
    setState({
      active: params.get("select") === "1" && !!sourceType && !!sourceId,
      sourceType,
      sourceId,
      returnTo: params.get("returnTo") || "/"
    });
  }, []);

  async function selectEntity(targetType: EntityType, targetId: string) {
    if (!state.active || !state.sourceType || !state.sourceId) return;
    if (state.sourceType === targetType && state.sourceId === targetId) {
      setSelectionMessage("Choose a different item.");
      return;
    }
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) { setSelectionMessage("Sign in to create a link."); return; }
    const response = await fetch("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        source_type: state.sourceType,
        source_id: state.sourceId,
        target_type: targetType,
        target_id: targetId
      })
    });
    const body = response.status === 204 ? null : await response.json();
    if (!response.ok) { setSelectionMessage(body?.error || "Could not create link."); return; }
    router.replace(state.returnTo);
  }

  function cancelSelection() { router.replace(state.returnTo); }

  return { selectionMode: state.active, selectEntity, cancelSelection, selectionMessage };
}
