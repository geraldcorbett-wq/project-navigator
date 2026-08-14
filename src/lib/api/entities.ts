import type { SupabaseClient } from "@supabase/supabase-js";

export type EntityType = "memory" | "circle" | "schedule" | "conversation";
const config = {
  memory: { table: "memories", label: "content", href: "/memories" },
  circle: { table: "circles", label: "name", href: "/circles" },
  schedule: { table: "schedule_items", label: "title", href: "/schedule" },
  conversation: { table: "conversations", label: "title", href: "/conversations" }
} as const;
export function isEntityType(value: unknown): value is EntityType { return typeof value === "string" && value in config; }
export async function ownedEntity(supabase: SupabaseClient<any,"public",any>, userId:string, type:EntityType, id:string) {
  const c=config[type]; const {data,error}=await supabase.from(c.table).select(`id,${c.label}`).eq("id",id).eq("user_id",userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const entityId = String(row.id);
  return { id: entityId, type, label: String(row[c.label] ?? "Untitled"), href: type === "conversation" ? `${c.href}/${entityId}` : c.href };
}
export async function searchOwnedEntities(supabase: SupabaseClient<any,"public",any>, userId:string, q:string) {
  const out:any[]=[];
  for (const type of Object.keys(config) as EntityType[]) { const c=config[type]; let query=supabase.from(c.table).select(`id,${c.label}`).eq("user_id",userId).limit(12); if(q) query=query.ilike(c.label,`%${q}%`); const {data,error}=await query; if(error) throw error; for (const item of data || []) { const row = item as Record<string, unknown>; const entityId = String(row.id); out.push({ id: entityId, type, label: String(row[c.label] ?? "Untitled"), href: type === "conversation" ? `${c.href}/${entityId}` : c.href }); } }
  return out.slice(0,30);
}
