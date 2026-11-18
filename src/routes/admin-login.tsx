import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery as useBrandQuery } from "@tanstack/react-query";
import { brandQuery } from "@/lib/settings.functions";
import { amIAdmin } from "@/lib/admin.functions";
import { signUpErrorMessage } from "@/lib/auth-errors";

export const Route = createFileRoute("/admin-login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "دخول المسؤول | سين" },
      { name: "description", content: "تسجيل دخول مسؤول متجر سين إلى لوحة الإدارة." },
      { property: "og:title", content: "دخول المسؤول | سين" },
      { property: "og:description", content: "دخول لوحة إدارة سين." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(amIAdmin);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const brandName = useBrandQuery(brandQuery).data?.storeName;

  useEffect(() => {
    supabase.rpc("admin_exists").then(({ data }) => setHasAdmin(!!data));
  }, []);

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message.includes("confirm") ? "يرجى تأكيد بريدك الإلكتروني أولًا" : "البريد أو كلمة المرور غير صحيحة");
      return;
    }
    const { isAdmin } = await checkAdmin();
    if (!isAdmin) {
      await supabase.auth.signOut();
      toast.error("هذا الحساب ليس حساب مسؤول");
      return;
    }
    navigate({ to: "/admin", replace: true });
  };

  const createAdmin = async () => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + "/admin-login", data: { signup_as: "admin" } },
    });
    if (error) toast.error(signUpErrorMessage(error));
    else setSent(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { await (hasAdmin === false ? createAdmin() : signIn()); } finally { setBusy(false); }
  };

  const creating = hasAdmin === false;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <Link to="/" className="mb-6 text-4xl font-black">{brandName}<span className="text-accent">.</span></Link>
      <div className="w-full max-w-sm space-y-4 rounded-lg bg-card p-6 shadow-sm">
        {sent ? (
          <div className="space-y-2 text-center">
            <h1 className="text-xl font-black">تحقق من بريدك</h1>
            <p className="text-sm text-muted-foreground">أرسلنا رابط تأكيد إلى {email}. اضغط عليه ثم سجّل الدخول هنا.</p>
            <button onClick={() => { setSent(false); setHasAdmin(true); }} className="text-sm font-bold text-accent">العودة لتسجيل الدخول</button>
          </div>
        ) : (
          <>
            <h1 className="flex items-center gap-2 text-xl font-black"><ShieldCheck className="h-6 w-6" />{creating ? "إنشاء حساب المسؤول" : "دخول المسؤول"}</h1>
            {creating && <p className="text-sm text-muted-foreground">لا يوجد مسؤول للمتجر بعد. الحساب الذي تنشئه هنا سيصبح حساب المسؤول.</p>}
            <form onSubmit={submit} className="space-y-3">
              <label className="block text-sm font-semibold">البريد الإلكتروني
                <input type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm font-semibold">كلمة المرور
                <input type="password" required minLength={8} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                {creating && <span className="mt-1 block text-xs font-normal text-muted-foreground">٨ أحرف على الأقل، ولا تستخدم كلمة مرور شائعة مثل 12345678 أو password.</span>}
              </label>
              <button disabled={busy || hasAdmin === null} className="w-full rounded-md bg-primary py-2.5 font-black text-primary-foreground disabled:opacity-60">
                {busy ? "جارٍ..." : creating ? "إنشاء حساب المسؤول" : "دخول"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
