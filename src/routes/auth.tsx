import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { useQuery as useBrandQuery } from "@tanstack/react-query";
import { brandQuery } from "@/lib/settings.functions";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { signUpErrorMessage } from "@/lib/auth-errors";
import { isNativeShell } from "@/lib/native-shell";

export const Route = createFileRoute("/auth")({
  validateSearch: zodValidator(z.object({ redirect: z.string().optional() })),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | سين" },
      { name: "description", content: "سجّل الدخول أو أنشئ حسابًا في سين لإتمام طلباتك ومتابعتها." },
      { property: "og:title", content: "تسجيل الدخول | سين" },
      { property: "og:description", content: "ادخل إلى حسابك في سين." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const safePath = (p?: string) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/");
const RETURN_KEY = "seen-auth-return";

function GoogleLogo() {
  return (
    <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
  );
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const target = safePath(redirect);
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const brandName = useBrandQuery(brandQuery).data?.storeName;
  // Google/Lovable sign-in leaves the Android app for the browser, so the app offers email only.
  const [inApp, setInApp] = useState(false);
  useEffect(() => setInApp(isNativeShell()), []);

  useEffect(() => {
    if (ready && user) {
      const saved = safePath(sessionStorage.getItem(RETURN_KEY) ?? undefined);
      sessionStorage.removeItem(RETURN_KEY);
      navigate({ to: target !== "/" ? target : saved, replace: true });
    }
  }, [ready, user, target, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message.includes("Invalid") ? "البريد أو كلمة المرور غير صحيحة" : error.message.includes("confirm") ? "يرجى تأكيد بريدك الإلكتروني أولًا" : "تعذر تسجيل الدخول");
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + target } });
      if (error) toast.error(signUpErrorMessage(error));
      else setSent(true);
    }
    setBusy(false);
  };

  const social = async (provider: "google" | "lovable") => {
    sessionStorage.setItem(RETURN_KEY, target);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (result.error) toast.error("تعذر تسجيل الدخول، حاول مرة أخرى");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <Link to="/" className="mb-6 text-4xl font-black">{brandName}<span className="text-accent">.</span></Link>
      <div className="w-full max-w-sm space-y-4 rounded-lg bg-card p-6 shadow-sm">
        {sent ? (
          <div className="space-y-2 text-center">
            <h1 className="text-xl font-black">تحقق من بريدك</h1>
            <p className="text-sm text-muted-foreground">أرسلنا رابط تأكيد إلى {email}. اضغط عليه ثم عُد لتسجيل الدخول.</p>
            <button onClick={() => { setSent(false); setMode("in"); }} className="text-sm font-bold text-accent">العودة لتسجيل الدخول</button>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-black">{mode === "in" ? "تسجيل الدخول" : "إنشاء حساب جديد"}</h1>
            {inApp ? (
              <p className="text-center text-xs text-muted-foreground">سجّل الدخول ببريدك الإلكتروني داخل التطبيق.</p>
            ) : (
              <>
            <button type="button" onClick={() => social("google")} className="flex h-10 w-full items-center justify-center gap-2.5 rounded-md border border-[#747775] bg-[#FFFFFF] px-3 text-sm font-medium text-[#1F1F1F]">
              <GoogleLogo /><span>المتابعة باستخدام Google</span>
            </button>
            <button type="button" onClick={() => social("lovable")} className="lovable-auth-button w-full">المتابعة باستخدام Lovable</button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />أو<span className="h-px flex-1 bg-border" /></div>
              </>
            )}
            <form onSubmit={submit} className="space-y-3">
              <label className="block text-sm font-semibold">البريد الإلكتروني
                <input type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm font-semibold">كلمة المرور
                <input type="password" required minLength={6} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
              </label>
              <button disabled={busy} className="w-full rounded-md bg-primary py-2.5 font-black text-primary-foreground disabled:opacity-60">{busy ? "جارٍ..." : mode === "in" ? "دخول" : "إنشاء الحساب"}</button>
            </form>
            <p className="text-center text-sm">
              {mode === "in" ? "ليس لديك حساب؟ " : "لديك حساب بالفعل؟ "}
              <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="font-bold text-accent">{mode === "in" ? "أنشئ حسابًا" : "سجّل الدخول"}</button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
