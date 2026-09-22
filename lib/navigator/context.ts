import type { SupabaseClient } from "@supabase/supabase-js";

type Section = { name: string; data: unknown };
const MAX_SECTION_ROWS = 60;
const MAX_CONTEXT_CHARS = 28000;

function safeStringify(value: unknown): string {
  try { return JSON.stringify(value); } catch { return "null"; }
}

export async function buildNavigatorContext(supabase: SupabaseClient<any, "public", any>, userId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const queries = await Promise.all([
    supabase.from("profiles").select("preferred_name,display_name,preferred_language,time_zone,navigator_name").eq("id", userId).maybeSingle(),
    supabase.from("orientation").select("situation,focus,desired_outcome,constraints,context,updated_at").eq("user_id", userId).maybeSingle(),
    supabase.from("memories").select("id,content,category,importance,is_pinned,updated_at").eq("user_id", userId).order("is_pinned", { ascending:false }).order("updated_at", { ascending:false }).limit(MAX_SECTION_ROWS),
    supabase.from("missions").select("id,title,description,status,due_at,updated_at").eq("user_id", userId).order("updated_at", { ascending:false }).limit(MAX_SECTION_ROWS),
    supabase.from("tasks").select("id,mission_id,title,status,due_at,position,updated_at").eq("user_id", userId).order("updated_at", { ascending:false }).limit(MAX_SECTION_ROWS),
    supabase.from("schedule_items").select("id,circle_id,title,notes,starts_at,ends_at,time_zone,status,is_pinned,updated_at").eq("user_id", userId).order("starts_at", { ascending:true }).limit(MAX_SECTION_ROWS),
    supabase.from("circles").select("id,user_id,name,description,is_pinned,updated_at,circle_members(id,user_id,display_name,email,role,relationship_label)").order("updated_at", { ascending:false }).limit(MAX_SECTION_ROWS),
    supabase.from("knowledge_items").select("id,kind,title,content,tags,updated_at").eq("user_id", userId).order("updated_at", { ascending:false }).limit(30),
    supabase.from("notifications").select("id,title,body,type,read_at,created_at").eq("user_id", userId).order("created_at", { ascending:false }).limit(30),
    supabase.from("conversations").select("id,title,summary,status,last_message_at").eq("user_id", userId).order("last_message_at", { ascending:false }).limit(40),
    supabase.from("events").select("event_type,entity_type,entity_id,payload,occurred_at").eq("user_id", userId).order("occurred_at", { ascending:false }).limit(60),
    supabase.from("background_jobs").select("id,job_type,status,run_after,completed_at,error,updated_at").eq("user_id", userId).order("updated_at", { ascending:false }).limit(30),
    supabase.from("entity_links").select("source_type,source_id,target_type,target_id,created_at").eq("user_id", userId).order("created_at", { ascending:false }).limit(60),
    supabase.from("contact_interactions").select("circle_member_id,interaction_kind,occurred_at").eq("user_id", userId).gte("occurred_at", thirtyDaysAgo).order("occurred_at", { ascending:false }).limit(500)
  ]);
  const sections: Section[] = [
    { name: "profile", data: queries[0].data }, { name: "orientation", data: queries[1].data },
    { name: "memories", data: queries[2].data || [] }, { name: "missions", data: queries[3].data || [] },
    { name: "tasks", data: queries[4].data || [] }, { name: "calendar", data: queries[5].data || [] },
    { name: "circles", data: queries[6].data || [] }, { name: "knowledge", data: queries[7].data || [] },
    { name: "notifications", data: queries[8].data || [] },
    { name: "conversations", data: queries[9].data || [] },
    { name: "events", data: queries[10].data || [] },
    { name: "background_jobs", data: queries[11].data || [] },
    { name: "relationships", data: queries[12].data || [] }
  ];
  const interactions = (queries[13].data || []) as Array<{circle_member_id:string; interaction_kind:string; occurred_at:string}>;
  const counts = new Map<string, number>();
  for (const item of interactions) counts.set(item.circle_member_id, (counts.get(item.circle_member_id) || 0) + 1);
  sections.push({ name: "contact_interactions_last_30_days", data: Array.from(counts.entries()).map(([circle_member_id,count])=>({circle_member_id,count})).sort((a,b)=>b.count-a.count) });
  let text = sections.map(section => `${section.name}: ${safeStringify(section.data)}`).join("\n");
  if (text.length > MAX_CONTEXT_CHARS) text = text.slice(0, MAX_CONTEXT_CHARS) + "\n[Navigator context truncated by containment limit]";
  return { text, profile: queries[0].data };
}
