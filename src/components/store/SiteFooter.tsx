import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Facebook, Instagram, Mail, MessageCircle, Music2, Phone } from "lucide-react";
import { categories, fmt } from "@/lib/catalog";
import { brandQuery, deliveryQuery } from "@/lib/settings.functions";

export function SiteFooter() {
  const brand = useQuery(brandQuery).data;
  const delivery = useQuery(deliveryQuery).data;
  if (!brand) return null;
  const { contact, social } = brand;
  const wa = contact.whatsapp.replace(/[^\d]/g, "");
  const socials = [
    { href: social.facebook, label: "فيسبوك", I: Facebook },
    { href: social.instagram, label: "إنستجرام", I: Instagram },
    { href: social.tiktok, label: "تيك توك", I: Music2 },
  ].filter((s) => s.href);
  return (
    <footer className="mt-10 bg-secondary text-secondary-foreground">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm md:grid-cols-4">
        <div>
          <div className="text-3xl font-black text-primary">{brand.storeName}</div>
          {brand.tagline && <p className="mt-2 opacity-70">{brand.tagline}</p>}
          {socials.length > 0 && (
            <div className="mt-3 flex gap-3">
              {socials.map(({ href, label, I }) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="opacity-70 hover:opacity-100"><I className="h-5 w-5" /></a>)}
            </div>
          )}
        </div>
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
          <div className="mb-2 font-bold">الشحن والتواصل</div>
          {delivery && <p className="py-0.5 opacity-70">توصيل مجاني للطلبات فوق {fmt(delivery.freeShippingMin)} ج.م</p>}
          <p className="py-0.5 opacity-70">الدفع عند الاستلام</p>
          {contact.phone && <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 py-0.5 opacity-70 hover:opacity-100"><Phone className="h-4 w-4" /><span dir="ltr">{contact.phone}</span></a>}
          {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 py-0.5 opacity-70 hover:opacity-100"><MessageCircle className="h-4 w-4" />واتساب</a>}
          {contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 py-0.5 opacity-70 hover:opacity-100"><Mail className="h-4 w-4" /><span dir="ltr">{contact.email}</span></a>}
        </div>
      </div>
      <div className="border-t border-secondary-foreground/10 py-4 text-center text-xs opacity-60">© ٢٠٢٦ {brand.storeName}. {brand.copyright} · <Link to="/admin-login" className="hover:underline">دخول المسؤول</Link></div>
    </footer>
  );
}
