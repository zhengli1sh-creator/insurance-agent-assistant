"use server";

import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";

function valueOf(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function withMessage(path: string, message: string) {
  return `${path}?message=${encodeURIComponent(message)}`;
}

export async function signInAction(formData: FormData) {
  const email = valueOf(formData, "email");
  const password = valueOf(formData, "password");
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect(withMessage("/login", "请先配置 Supabase 环境变量后再启用登录。"));
  }

  if (!email || !password) {
    redirect(withMessage("/login", "请完整输入邮箱与密码。"));
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(withMessage("/login", error.message || "登录失败，请检查账号或密码。"));
  }

  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const displayName = valueOf(formData, "displayName");
  const email = valueOf(formData, "email");
  const phone = valueOf(formData, "phone");
  const password = valueOf(formData, "password");
  const region = valueOf(formData, "region");
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect(withMessage("/register", "请先配置 Supabase 环境变量后再启用注册。"));
  }

  if (!displayName || !email || !phone || !password || !region) {
    redirect(withMessage("/register", "请完整填写注册信息。"));
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        phone,
        region,
      },
    },
  });

  if (error) {
    redirect(withMessage("/register", error.message || "注册失败，请稍后重试。"));
  }

  if (!data.session) {
    redirect(withMessage("/login", "注册成功，请先完成邮箱确认后再登录。"));
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await getSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/login");
}
