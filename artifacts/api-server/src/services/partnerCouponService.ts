import { Influencer } from "../models/Influencer";
import { Ambassador } from "../models/Ambassador";

/**
 * Partner Coupon Service — single owner of Influencer/Ambassador coupon
 * lookups for the Marketing/Partners system.
 *
 * The Pricing system calls this instead of importing Influencer/Ambassador
 * models directly, so changes to partner data/models don't ripple into
 * pricing code (and pricing changes can't accidentally corrupt partner data).
 */

export interface PartnerCouponResult {
  type: "influencer" | "ambassador";
  discountPercent: number;
  partnerName: string;
}

/** Check plan-independent partner coupon codes (influencer / ambassador). */
export async function findPartnerCoupon(code: string): Promise<PartnerCouponResult | null> {
  const influencer = await Influencer.findOne({ coupon_code: code });
  if (influencer && influencer.customer_discount_percentage > 0) {
    return {
      type: "influencer",
      discountPercent: influencer.customer_discount_percentage,
      partnerName: influencer.name,
    };
  }

  const ambassador = await Ambassador.findOne({ referral_code: code });
  if (ambassador && ambassador.customer_discount_percentage > 0) {
    return {
      type: "ambassador",
      discountPercent: ambassador.customer_discount_percentage,
      partnerName: ambassador.name,
    };
  }

  return null;
}
