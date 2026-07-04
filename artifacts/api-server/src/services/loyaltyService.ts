import { LoyaltyCard } from "../models/LoyaltyCard";
import { Booking } from "../models/Booking";

/**
 * Loyalty Service — single owner of all Loyalty Card business rules.
 *
 * Other systems (e.g. Bookings) must go through these functions instead of
 * importing the LoyaltyCard model directly. This keeps the "10 stamps = new
 * card generation" rule in one place, so changing loyalty logic later can't
 * silently break the booking flow (and vice versa).
 */

export interface LoyaltyCardSnapshot {
  cardId: string;
  generation: number;
}

/** Look up a card's current generation for a booking that wants to apply it. */
export async function getCardSnapshot(cardId: string): Promise<LoyaltyCardSnapshot | null> {
  const card = await LoyaltyCard.findById(cardId).select("cardGeneration").lean();
  if (!card) return null;
  return { cardId: String(card._id), generation: card.cardGeneration ?? 1 };
}

/**
 * After a booking is recorded against a card, check whether that generation
 * is now full (10 non-ignored bookings) and advance the card if so.
 * Returns true if the card generation was advanced.
 */
export async function advanceGenerationIfFull(cardId: string, generation: number): Promise<boolean> {
  const countInGen = await Booking.countDocuments({
    loyaltyCardId: cardId,
    loyaltyCardGeneration: generation,
    ignored: { $ne: true },
  });

  if (countInGen < 10) return false;

  await LoyaltyCard.findByIdAndUpdate(cardId, {
    cardGeneration: generation + 1,
    refreshedAt: new Date(),
  });
  return true;
}
