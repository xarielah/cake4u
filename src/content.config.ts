import { defineCollection, reference } from "astro:content";
import { z } from "zod/v4";
import { file, glob } from "astro/loaders";

/**
 * ============================================================
 *  שכבת התוכן — Content Layer API
 * ============================================================
 *  כל מה שכתוב כאן הוא תוכן שנערך פעם אחת, לפני ההשקה.
 *  הסכמות אוכפות את התקינות בזמן build: טעות עריכה שוברת
 *  את הבילד עם הודעה ברורה, במקום להגיע לאוויר בשקט.
 *
 *  קבצי התוכן נמצאים ב-src/content/.
 * ============================================================
 */

/** מספר לוואטסאפ: ספרות בלבד, פורמט בינלאומי, בלי + ובלי 0 מוביל */
const whatsappNumber = z
  .string()
  .regex(
    /^[1-9]\d{7,14}$/,
    "מספר וואטסאפ חייב להיות בפורמט בינלאומי, ספרות בלבד, בלי + ובלי 0 מוביל. לדוגמה: 050-123-4567 => 972501234567",
  );

/** מחיר בשקלים — מספר שלם, לא מחרוזת, כדי שאפשר יהיה לחשב ולהציג אחיד */
const priceIls = z.number().int().positive("מחיר חייב להיות מספר חיובי בשקלים");

/**
 * 1) siteConfig — קובץ יחיד עם עובדות העסק.
 * הפרסר עוטף את האובייקט ברשומה אחת בשם 'site'.
 */
const siteConfig = defineCollection({
  loader: file("src/content/site.json", {
    parser: (text) => ({ site: JSON.parse(text) }),
  }),
  schema: ({ image }) =>
    z.object({
      businessName: z.string().min(2),
      ownerName: z.string().min(2),

      /** לוגו העסק. הנתיב יחסי ל-src/content/ (למשל ../assets/logo.png) */
      logo: image(),

      /** יעד כל כפתורי ה-CTA באתר */
      whatsappNumber,
      /** אותו מספר בתצוגה ידידותית לעין */
      phoneDisplay: z.string().min(9),

      city: z.string().min(2),
      region: z.string().min(2),
      /** היישובים שאליהם יש משלוח — מוצג באתר ומוזרק לסכמת LocalBusiness */
      deliveryAreas: z.array(z.string().min(2)).min(1),
      pickupNote: z.string().min(5),
      deliveryNote: z.string().min(5),

      /** זמן התראה מינימלי בימים — מסנן פונים לרגע האחרון */
      minLeadTimeDays: z.number().int().positive(),
      /** עוגות מעוצבות מורכבות דורשות יותר */
      customLeadTimeDays: z.number().int().positive(),
      /** סכום הזמנה מינימלי. 0 = אין מינימום */
      minOrderIls: z.number().int().nonnegative(),

      kashrut: z.object({
        status: z.enum(["כשר", "כשר למהדרין", "ללא כשרות"]),
        /** האם יש תעודת כשרות בתוקף */
        hasCertificate: z.boolean(),
        /** ניסוח מדויק שמוצג ללקוח — חשוב משפטית ולסינון פונים */
        detail: z.string().min(10),
      }),

      allergens: z.object({
        /** הצהרה שמופיעה ליד המוצרים ובשאלות הנפוצות */
        statement: z.string().min(20),
        /** אלרגנים שקיימים במטבח ולכן ייתכן זיהום צולב */
        mayContain: z.array(z.string().min(2)).min(1),
      }),

      social: z.object({
        instagram: z.url(),
        instagramHandle: z.string().startsWith("@"),
        facebook: z.url().or(z.literal("")),
      }),

      /** זמני מענה בוואטסאפ — לא שעות פתיחה של חנות */
      hours: z.object({
        display: z.string().min(5),
        schema: z
          .array(
            z.object({
              days: z.array(
                z.enum([
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ]),
              ),
              opens: z.string().regex(/^\d{2}:\d{2}$/),
              closes: z.string().regex(/^\d{2}:\d{2}$/),
            }),
          )
          .min(1),
      }),
    }),
});

/**
 * 2) categories — קטגוריות המוצרים. קובץ JSON אחד לכל קטגוריה.
 * כל קטגוריה מקבלת עמוד משלה, ולכן גם סכמת Product עם priceRange.
 */
const categories = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/categories" }),
  schema: ({ image }) =>
    z
      .object({
        /** ה-slug קובע את כתובת העמוד: /categories/<slug> */
        slug: z
          .string()
          .regex(
            /^[a-z0-9-]+$/,
            "slug באותיות לטיניות קטנות, ספרות ומקפים בלבד",
          ),
        name: z.string().min(2),
        /** משפט אחד שמופיע בכרטיס ובתוצאות החיפוש */
        shortDescription: z.string().min(20).max(200),
        /** תיאור מלא לעמוד הקטגוריה */
        description: z.string().min(40),

        /** מחיר "החל מ-" — לא מחיר לכל פריט (CLAUDE.md סעיף 3) */
        priceFrom: priceIls,

        /**
         * טבלת מחירים לפי מספר מנות. מעגנת ציפיות ומעלה ערך הזמנה:
         * לקוח שרואה שההפרש בין 20 ל-30 מנות קטן, מזמין יותר.
         */
        priceTable: z
          .array(
            z.object({
              servings: z.number().int().positive(),
              price: priceIls,
            }),
          )
          .min(2)
          .refine(
            (rows) =>
              rows.every(
                (row, i) => i === 0 || row.servings > rows[i - 1]!.servings,
              ),
            "טבלת המחירים חייבת להיות מסודרת לפי מספר מנות בסדר עולה",
          )
          .refine(
            (rows) =>
              rows.every((row, i) => i === 0 || row.price > rows[i - 1]!.price),
            "מחיר לכמות גדולה יותר לא יכול להיות נמוך יותר",
          ),

        /** טעמים אפשריים — מוצגים כרשימה, ונכנסים לבחירה בטופס ההזמנה */
        flavors: z.array(z.string().min(2)).min(1),

        /** תמונת קאבר. אופציונלית — בלעדיה מוצג פלייסהולדר ולא נשבר כלום */
        coverImage: image().optional(),
        /** alt בעברית — חובה אם יש תמונה (נאכף למטה) */
        coverAlt: z.string().min(5).optional(),

        /**
         * גריד התמונות בעמוד הקטגוריה. ריק = מוצגת רק תמונת הקאבר.
         * הגלריה השוטפת מגיעה מאינסטגרם בזמן build; אלה תמונות הקבע.
         */
        gallery: z
          .array(
            z.object({
              image: image(),
              alt: z
                .string()
                .min(5, "alt בעברית חובה לכל תמונה (CLAUDE.md סעיף 6)"),
            }),
          )
          .default([]),

        /** דורש יותר זמן מברירת המחדל? להשאיר ריק כדי לרשת מ-siteConfig */
        leadTimeDays: z.number().int().positive().optional(),

        /** סדר תצוגה — קטן יותר מופיע קודם */
        order: z.number().int().nonnegative(),
      })
      .refine((data) => !data.coverImage || Boolean(data.coverAlt), {
        message:
          "לכל תמונת קאבר חייב להיות coverAlt בעברית (נגישות — CLAUDE.md סעיף 6)",
        path: ["coverAlt"],
      }),
});

/**
 * 3) addons — תוספות במחיר קבוע. מנוף ישיר לערך ההזמנה הממוצע.
 */
const addons = defineCollection({
  loader: file("src/content/addons.json"),
  schema: z.object({
    name: z.string().min(2),
    /** מחיר קבוע בשקלים */
    price: priceIls,
    /** הסבר קצר — מה הלקוח מקבל */
    description: z.string().min(10),
    /** להצגה כברירת מחדל בטופס ההזמנה */
    featured: z.boolean().default(false),
    /** רלוונטי רק לקטגוריות מסוימות. ריק = מתאים לכולן */
    categories: z.array(reference("categories")).default([]),
    order: z.number().int().nonnegative(),
  }),
});

/**
 * 4) faq — שאלות נפוצות. כלי סינון: כל שאלה שנענית כאן
 * היא שיחת וואטסאפ שלא צריכה לקרות.
 */
const faq = defineCollection({
  loader: file("src/content/faq.json"),
  schema: z.object({
    question: z.string().min(5),
    answer: z.string().min(20),
    /** להצגה בעמוד הבית (מוצגות רק המסומנות) */
    featured: z.boolean().default(false),
    order: z.number().int().nonnegative(),
  }),
});

/**
 * 5) testimonials — המלצות לקוחות.
 */
const testimonials = defineCollection({
  loader: file("src/content/testimonials.json"),
  schema: z.object({
    customerName: z.string().min(2),
    text: z.string().min(20).max(400),
    /** דירוג 1–5, מספר שלם */
    rating: z.number().int().min(1).max(5),
    /** באיזה אירוע — מוסיף אמינות */
    occasion: z.string().min(2).optional(),
    order: z.number().int().nonnegative(),
  }),
});

/**
 * 6) home — הטקסטים של עמוד הבית. קובץ יחיד.
 * כל מילה בעמוד הבית מגיעה מכאן, כדי שאפשר יהיה לשנות ניסוח
 * בלי לגעת בקומפוננטות.
 */
const home = defineCollection({
  loader: file("src/content/home.json", {
    parser: (text) => ({ home: JSON.parse(text) }),
  }),
  schema: ({ image }) =>
    z.object({
      hero: z.object({
        /** שורה קטנה מעל הכותרת */
        eyebrow: z.string().min(2),
        title: z.string().min(5).max(80),
        subtitle: z.string().min(20).max(220),
        ctaLabel: z.string().min(2),
        secondaryCtaLabel: z.string().min(2),
        /** תמונה סטטית אחת. לא קרוסלה — זו תמונת ה-LCP. */
        image: image(),
        imageAlt: z.string().min(5),
      }),

      sections: z.object({
        categoriesTitle: z.string().min(2),
        categoriesLead: z.string().min(10),
        stepsTitle: z.string().min(2),
        stepsLead: z.string().min(10),
        testimonialsTitle: z.string().min(2),
      }),

      /** "איך זה עובד" — בדיוק שלושה צעדים */
      steps: z
        .array(
          z.object({
            title: z.string().min(2),
            text: z.string().min(15),
          }),
        )
        .length(3, 'סקשן "איך זה עובד" בנוי משלושה צעדים בדיוק'),

      /** באנר הסיום */
      finalCta: z.object({
        title: z.string().min(5),
        text: z.string().min(15),
        buttonLabel: z.string().min(2),
      }),
    }),
});

/**
 * 7) pages — עמודי תוכן סטטיים (עליי, תקנון, נגישות, פרטיות).
 * הגוף נכתב ב-Markdown, כדי שעריכה לא תדרוש נגיעה ב-HTML.
 */
const pages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pages" }),
  schema: ({ image }) =>
    z
      .object({
        /** כותרת H1 בעמוד */
        title: z.string().min(2),
        /** meta description */
        description: z.string().min(20).max(200),
        /** תמונה אופציונלית בראש העמוד */
        image: image().optional(),
        imageAlt: z.string().min(5).optional(),
        /** תאריך עדכון אחרון — מוצג בעמודים משפטיים */
        updated: z.coerce.date().optional(),
        /** עמוד טיוטה שאסור שיאונדקס */
        noindex: z.boolean().default(false),
      })
      .refine((data) => !data.image || Boolean(data.imageAlt), {
        message: "לכל תמונה חייב להיות imageAlt בעברית (CLAUDE.md סעיף 6)",
        path: ["imageAlt"],
      }),
});

export const collections = {
  siteConfig,
  categories,
  addons,
  faq,
  testimonials,
  home,
  pages,
};
