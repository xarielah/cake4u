/**
 * בניית קישורי wa.me. אין כאן שרת ואין שליחה —
 * רק פתיחת שיחת וואטסאפ עם טקסט מוכן (CLAUDE.md סעיף 3).
 */

/** @param number מספר בפורמט בינלאומי, כפי שנאכף בסכמת siteConfig */
export function whatsappUrl(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

/** הודעת פתיחה כללית — לכפתורי CTA שאינם טופס ההזמנה */
export function generalInquiryMessage(ownerName: string): string {
  return `היי ${ownerName}, הגעתי מהאתר ואשמח לשמוע על הזמנה 🙂`;
}

export function generalInquiryUrl(number: string, ownerName: string): string {
  return whatsappUrl(number, generalInquiryMessage(ownerName));
}

/** קישור לחיוג ישיר */
export function telHref(number: string): string {
  return `tel:+${number.replace(/\D/g, '')}`;
}
