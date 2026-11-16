import phone from "@/assets/p-phone.jpg";
import headphones from "@/assets/p-headphones.jpg";
import sneakers from "@/assets/p-sneakers.jpg";
import laptop from "@/assets/p-laptop.jpg";
import watch from "@/assets/p-watch.jpg";
import kettle from "@/assets/p-kettle.jpg";
import top from "@/assets/p-dress.jpg";

export type Category = { slug: string; name: string };
export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  img: string;
  /** Extra gallery photos (seller products); first equals img. */
  images?: string[];
  price: number;
  oldPrice: number;
  rating: number;
  reviews: number;
  express: boolean;
  description: string;
  highlights: string[];
  /** Set for products listed by a marketplace seller. */
  seller?: { name: string; slug: string };
  stock?: number;
};

export const categories: Category[] = [
  { slug: "mobiles", name: "موبايلات" },
  { slug: "laptops", name: "لابتوب" },
  { slug: "audio", name: "سماعات" },
  { slug: "watches", name: "ساعات" },
  { slug: "fashion", name: "موضة" },
  { slug: "sports", name: "رياضة" },
  { slug: "home", name: "المنزل والمطبخ" },
  { slug: "gaming", name: "ألعاب" },
];

const p = (x: Omit<Product, "oldPrice"> & { off: number }): Product => {
  const { off, ...rest } = x;
  return { ...rest, oldPrice: Math.round(x.price / (1 - off / 100)) };
};

export const products: Product[] = [
  p({ id: "pro-max-256", name: "موبايل برو ماكس 256 جيجا تيتانيوم أسود", brand: "نوفا", category: "mobiles", img: phone, price: 64999, off: 12, rating: 4.8, reviews: 1284, express: true, description: "شاشة 6.9 بوصة فائقة السطوع، ثلاث كاميرات خلفية 48 ميجابكسل وبطارية تدوم طوال اليوم.", highlights: ["ذاكرة 256 جيجا", "شاشة 6.9 بوصة 120 هرتز", "كاميرا 48 ميجابكسل", "ضمان سنتين"] }),
  p({ id: "ultra-512", name: "موبايل ألترا 512 جيجا مع قلم ذكي", brand: "جالاكسا", category: "mobiles", img: phone, price: 54999, off: 18, rating: 4.7, reviews: 932, express: true, description: "أداء قوي للألعاب والتصوير مع قلم ذكي مدمج وشحن سريع 45 وات.", highlights: ["ذاكرة 512 جيجا", "رام 12 جيجا", "شحن سريع 45 وات", "مقاوم للماء IP68"] }),
  p({ id: "lite-128", name: "موبايل لايت 128 جيجا ثنائي الشريحة", brand: "نوفا", category: "mobiles", img: phone, price: 8999, off: 22, rating: 4.4, reviews: 2210, express: false, description: "موبايل اقتصادي بشاشة كبيرة وبطارية 5000 مللي أمبير.", highlights: ["ذاكرة 128 جيجا", "بطارية 5000 مللي أمبير", "شريحتين"] }),
  p({ id: "airbook-14", name: "لابتوب إير بوك 14 بوصة معالج i7 رام 16 جيجا", brand: "زين", category: "laptops", img: laptop, price: 42999, off: 15, rating: 4.6, reviews: 418, express: true, description: "لابتوب خفيف بوزن 1.2 كجم مع شاشة عالية الدقة وبطارية حتى 14 ساعة.", highlights: ["معالج i7 الجيل 13", "رام 16 جيجا", "SSD 512 جيجا", "وزن 1.2 كجم"] }),
  p({ id: "workbook-15", name: "لابتوب ورك بوك 15.6 بوصة i5 رام 8 جيجا", brand: "زين", category: "laptops", img: laptop, price: 24999, off: 10, rating: 4.3, reviews: 276, express: false, description: "مناسب للدراسة والعمل اليومي مع لوحة مفاتيح رقمية كاملة.", highlights: ["معالج i5", "رام 8 جيجا", "SSD 256 جيجا"] }),
  p({ id: "anc-headphones", name: "سماعة رأس لاسلكية بخاصية إلغاء الضوضاء", brand: "ساوند", category: "audio", img: headphones, price: 2499, off: 35, rating: 4.5, reviews: 3120, express: true, description: "إلغاء ضوضاء نشط وصوت نقي مع بطارية 40 ساعة.", highlights: ["إلغاء الضوضاء", "بطارية 40 ساعة", "بلوتوث 5.3"] }),
  p({ id: "bt-headphones", name: "سماعة بلوتوث خفيفة بعمر بطارية 40 ساعة", brand: "ساوند", category: "audio", img: headphones, price: 1299, off: 40, rating: 4.2, reviews: 1876, express: false, description: "سماعة مريحة للاستخدام اليومي مع ميكروفون للمكالمات.", highlights: ["بطارية 40 ساعة", "ميكروفون مدمج", "قابلة للطي"] }),
  p({ id: "gaming-headset", name: "سماعة ألعاب بصوت محيطي وميكروفون", brand: "بلاي", category: "gaming", img: headphones, price: 1799, off: 25, rating: 4.4, reviews: 642, express: true, description: "صوت محيطي 7.1 لتجربة ألعاب غامرة مع ميكروفون قابل للفصل.", highlights: ["صوت محيطي 7.1", "ميكروفون قابل للفصل", "متوافقة مع الكمبيوتر والكونسول"] }),
  p({ id: "fit-watch", name: "ساعة ذكية رياضية بشاشة لمس ومتابعة نبض", brand: "بلس", category: "watches", img: watch, price: 3299, off: 30, rating: 4.5, reviews: 1540, express: true, description: "تتابع الخطوات والنبض والنوم مع بطارية تدوم 10 أيام.", highlights: ["متابعة النبض والنوم", "بطارية 10 أيام", "مقاومة للماء"] }),
  p({ id: "classic-watch", name: "ساعة ذكية كلاسيك بإطار معدني", brand: "بلس", category: "watches", img: watch, price: 5499, off: 20, rating: 4.6, reviews: 488, express: false, description: "تصميم أنيق مع مكالمات بلوتوث وإشعارات الموبايل.", highlights: ["مكالمات بلوتوث", "إطار معدني", "أكثر من 100 وضع رياضي"] }),
  p({ id: "run-shoes", name: "حذاء جري رياضي خفيف للرجال أبيض", brand: "رَن", category: "sports", img: sneakers, price: 1899, off: 20, rating: 4.4, reviews: 990, express: true, description: "نعل مرن ومريح للجري والمشي لمسافات طويلة.", highlights: ["خامة تسمح بالتهوية", "نعل مطاطي مرن", "مقاسات 40 إلى 45"] }),
  p({ id: "walk-sneakers", name: "كوتشي رياضي مريح للمشي", brand: "رَن", category: "fashion", img: sneakers, price: 1499, off: 25, rating: 4.3, reviews: 712, express: false, description: "كوتشي يومي خفيف يناسب كل الإطلالات.", highlights: ["خفيف الوزن", "سهل التنظيف", "مقاسات 38 إلى 45"] }),
  p({ id: "linen-top", name: "بلوزة كتان نسائي بحزام بيج", brand: "ليلى", category: "fashion", img: top, price: 899, off: 30, rating: 4.5, reviews: 356, express: true, description: "بلوزة من الكتان الطبيعي بحزام للخصر، مثالية للصيف.", highlights: ["كتان طبيعي 100٪", "حزام للخصر", "مقاسات S إلى XL"] }),
  p({ id: "steel-kettle", name: "غلاية كهربائية ستانلس ستيل 1.7 لتر", brand: "بيتي", category: "home", img: kettle, price: 1199, off: 28, rating: 4.6, reviews: 2045, express: true, description: "غلي سريع بقوة 2200 وات مع فصل تلقائي للأمان.", highlights: ["سعة 1.7 لتر", "قوة 2200 وات", "فصل تلقائي"] }),
  p({ id: "mini-kettle", name: "غلاية كهربائية صغيرة للسفر 0.8 لتر", brand: "بيتي", category: "home", img: kettle, price: 649, off: 15, rating: 4.1, reviews: 430, express: false, description: "غلاية صغيرة وخفيفة مناسبة للسفر والمكتب.", highlights: ["سعة 0.8 لتر", "خفيفة الوزن", "قاعدة دوارة"] }),
];

export const fmt = (n: number) => n.toLocaleString("ar-EG");
export const discountPercent = (x: Product) => (x.oldPrice > x.price ? Math.round((1 - x.price / x.oldPrice) * 100) : 0);
export const isSellerProductId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export const getProduct = (id: string) => products.find((x) => x.id === id);
export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);
export const productsInCategory = (slug: string) => products.filter((x) => x.category === slug);

const norm = (s: string) => s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").trim();

export function searchProducts(q: string): Product[] {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return products;
  return products.filter((x) => {
    const hay = norm(`${x.name} ${x.brand} ${getCategory(x.category)?.name ?? ""}`);
    return terms.every((t) => hay.includes(t));
  });
}
