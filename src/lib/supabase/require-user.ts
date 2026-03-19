import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function requireUserContext() {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return { supabase: null, user: null, message: "Supabase 环境变量尚未配置" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, message: "请先登录后再执行此操作" };
  }

  return { supabase, user, message: "" };
}
