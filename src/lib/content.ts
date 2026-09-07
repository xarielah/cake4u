import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export type Business = CollectionEntry<'siteConfig'>['data'];
export type Category = CollectionEntry<'categories'>;
export type Addon = CollectionEntry<'addons'>;
export type Faq = CollectionEntry<'faq'>;
export type Testimonial = CollectionEntry<'testimonials'>;
export type HomeContent = CollectionEntry<'home'>['data'];
export type Page = CollectionEntry<'pages'>;

/** עובדות העסק. רשומה יחידה מתוך src/content/site.json */
export async function getBusiness(): Promise<Business> {
  const entry = await getEntry('siteConfig', 'site');
  if (!entry) {
    throw new Error('לא נמצא src/content/site.json — בלעדיו אי אפשר לבנות את האתר.');
  }
  return entry.data;
}

/** הטקסטים של עמוד הבית */
export async function getHome(): Promise<HomeContent> {
  const entry = await getEntry('home', 'home');
  if (!entry) {
    throw new Error('לא נמצא src/content/home.json — בלעדיו אי אפשר לבנות את עמוד הבית.');
  }
  return entry.data;
}

/** עמוד תוכן סטטי לפי מזהה (about / terms / privacy / accessibility) */
export async function getPage(id: string): Promise<Page> {
  const entry = await getEntry('pages', id);
  if (!entry) {
    throw new Error(`לא נמצא עמוד התוכן "${id}" בתיקייה src/content/pages/.`);
  }
  return entry;
}

const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;

export async function getCategories(): Promise<Category[]> {
  return (await getCollection('categories')).sort(byOrder);
}

export async function getAddons(): Promise<Addon[]> {
  return (await getCollection('addons')).sort(byOrder);
}

/** @param onlyFeatured להצגה מקוצרת בעמוד הבית */
export async function getFaq(onlyFeatured = false): Promise<Faq[]> {
  const entries = await getCollection('faq');
  return entries.filter((entry) => !onlyFeatured || entry.data.featured).sort(byOrder);
}

export async function getTestimonials(): Promise<Testimonial[]> {
  return (await getCollection('testimonials')).sort(byOrder);
}

/** התוספות שרלוונטיות לקטגוריה מסוימת (ריק ב-categories = מתאים לכולן) */
export async function getAddonsForCategory(categoryId: string): Promise<Addon[]> {
  const addons = await getAddons();
  return addons.filter(
    (addon) =>
      addon.data.categories.length === 0 ||
      addon.data.categories.some((ref) => ref.id === categoryId),
  );
}
