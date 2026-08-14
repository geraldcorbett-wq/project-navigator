import type { SupabaseClient } from "@supabase/supabase-js";
import type { EntityType } from "./entities";

export async function deleteEntityLinks(
  supabase: SupabaseClient<any, "public", any>,
  userId: string,
  entityType: EntityType,
  entityId: string
) {
  const { error } = await supabase
    .from("entity_links")
    .delete()
    .eq("user_id", userId)
    .or(
      `and(source_type.eq.${entityType},source_id.eq.${entityId}),and(target_type.eq.${entityType},target_id.eq.${entityId})`
    );

  if (error) throw error;
}
