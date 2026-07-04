import { Booking } from "../models/Booking";

/**
 * Loyalty Booking Query Service — the one place the Loyalty Cards system
 * reads Booking data from, for rendering the 10-slot progress view.
 *
 * Keeping this query logic here (instead of inline in the loyalty-cards
 * route) means future changes to the Booking schema only need to update
 * this file to keep the loyalty slots view correct.
 */

export interface CardBookingRecord {
  bookingId: string;
  productName?: string;
  createdAt?: Date | string;
  completedAt?: Date | string;
  completed: boolean;
  isCarryOver?: boolean;
}

/** Bookings still pending from the previous (now-closed) card generation. */
export async function getCarryOverBookings(cardId: string, currentGeneration: number) {
  if (currentGeneration <= 1) return [];
  return Booking.find({
    loyaltyCardId: cardId,
    loyaltyCardGeneration: currentGeneration - 1,
    completed: false,
    ignored: { $ne: true },
  })
    .populate("productId")
    .sort({ createdAt: 1 })
    .lean();
}

/** All bookings recorded against the card's current generation. */
export async function getCurrentGenerationBookings(cardId: string, currentGeneration: number) {
  return Booking.find({
    loyaltyCardId: cardId,
    loyaltyCardGeneration: currentGeneration,
    ignored: { $ne: true },
  })
    .populate("productId")
    .sort({ createdAt: 1 })
    .lean();
}
