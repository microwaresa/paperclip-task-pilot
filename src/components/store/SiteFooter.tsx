import { Link } from "@tanstack/react-router";
import { categories } from "@/lib/catalog";

export function SiteFooter() {
  return (
    <footer className="mt-10 bg-secondary text-secondary-foreground">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm md:grid-cols-4">
        <div><div className="text-3xl font-black text-primary">سين</div><p className="mt-2 opacity-70">اكتشف عالمًا من الاختيارات</p></div>
        <div>
          <div className="mb-2 font-bold">الأقسام</div>
          {categories.slice(0, 5).map((c) => (
            <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} className="block py-0.5 opacity-70 hover:opacity-100">{c.name}</Link>
          ))}
        </div>
        <div>
          <div className="mb-2 font-bold">حسابي</div>
          <Link to="/orders" search={{ placed: undefined }} className="block py-0.5 opacity-70 hover:opacity-100">طلباتي</Link>
          <Link to="/cart" className="block py-0.5 opacity-70 hover:opacity-100">العربة</Link>
          <Link to="/favorites" className="block py-0.5 opacity-70 hover:opacity-100">المفضلة</Link>
        </div>
        <div>
          <div className="mb-2 font-bold">الشحن والدفع</div>
          <p className="py-0.5 opacity-70">توصيل مجاني للطلبات فوق ٢٠٠ ج.م</p>
          <p className="py-0.5 opacity-70">الدفع عند الاستلام</p>
        </div>
      </div>
      <div className="border-t border-secondary-foreground/10 py-4 text-center text-xs opacity-60">© ٢٠٢٦ سين. جميع الحقوق محفوظة. · <Link to="/admin-login" className="hover:underline">دخول المسؤول</Link></div>
    </footer>
  );
}
