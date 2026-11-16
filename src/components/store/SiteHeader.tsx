import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Heart, LogOut, MapPin, Package, Search, ShoppingCart, Sparkles, User } from "lucide-react";
import { categories, fmt } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader({ initialQuery = "" }: { initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { count, favorites } = useCart();
  const { user } = useAuth();

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate({ to: "/search", search: { q: q.trim(), sort: "relevance" } });
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <header className="sticky top-0 z-30 bg-primary text-primary-foreground shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link to="/" className="text-3xl font-black tracking-tight">سين<span className="text-accent">.</span></Link>
        <div className="hidden items-center gap-1 text-xs md:flex">
          <MapPin className="h-4 w-4" />
          <div><div className="opacity-70">التوصيل إلى</div><div className="font-bold">مصر</div></div>
        </div>
        <form onSubmit={onSearch} role="search" className="flex flex-1 items-center rounded-md bg-card px-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="عن ماذا تبحث؟"
            aria-label="ابحث في المنتجات"
            className="w-full bg-transparent px-2 py-2.5 text-sm text-foreground outline-none"
          />
          <button type="submit" aria-label="بحث"><Search className="h-4 w-4 text-muted-foreground" /></button>
        </form>
        {user ? (
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger className="hidden items-center gap-1 text-sm font-semibold sm:flex"><User className="h-5 w-5" />حسابي</DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="max-w-56 truncate text-xs font-normal text-muted-foreground">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/orders" search={{ placed: undefined }}><Package className="h-4 w-4" />طلباتي</Link></DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}><LogOut className="h-4 w-4" />تسجيل الخروج</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link to="/auth" search={{ redirect: undefined }} className="hidden items-center gap-1 text-sm font-semibold sm:flex"><User className="h-5 w-5" />تسجيل الدخول</Link>
        )}
        <Link to="/favorites" aria-label="المفضلة" className="relative"><Heart className="h-6 w-6" />{favorites.length > 0 && <CountBadge n={favorites.length} />}</Link>
        <Link to="/cart" aria-label="العربة" className="relative"><ShoppingCart className="h-6 w-6" />{count > 0 && <CountBadge n={count} />}</Link>
      </div>
      <nav className="border-t border-primary-foreground/10 bg-card text-foreground">
        <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 py-2 text-sm font-semibold">
          {categories.map((c) => (
            <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} className="whitespace-nowrap hover:text-accent" activeProps={{ className: "text-accent" }}>{c.name}</Link>
          ))}
          <Link to="/search" search={{ q: "", sort: "discount" }} className="whitespace-nowrap text-destructive">العروض</Link>
          <Link to="/assistant" className="flex items-center gap-1 whitespace-nowrap text-accent"><Sparkles className="h-4 w-4" />مساعد التسوق</Link>
        </div>
      </nav>
    </header>
  );
}

function CountBadge({ n }: { n: number }) {
  return <span className="absolute -top-2 -left-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-secondary-foreground">{fmt(n)}</span>;
}
