import mongoose from "mongoose";
import crypto from "crypto";
import { Wallet, IWallet } from "../models/Wallet";
import { WalletTransaction, WalletTxType } from "../models/WalletTransaction";

// ── Generate unique transaction ID ────────────────────────────────────────────
function genTxId(): string {
  return `TXN-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

// ── Get or create wallet for a partner ───────────────────────────────────────
export async function getOrCreateWallet(
  partnerType: "influencer" | "ambassador" | "referral",
  partnerCode: string,
  initBalance?: number
): Promise<IWallet> {
  const code = partnerCode.toUpperCase().trim();
  let wallet = await Wallet.findOne({ partnerType, partnerCode: code });
  if (!wallet) {
    const initialBal = initBalance ?? 0;
    wallet = await Wallet.create({
      partnerType,
      partnerCode: code,
      wallet_balance: initialBal,
      lifetime_earnings: initialBal,
      pending_withdrawal: 0,
      total_withdrawn: 0,
      last_updated: new Date(),
    });
  }
  return wallet;
}

// ── Credit wallet (commission earned, etc.) ───────────────────────────────────
export async function creditWallet(
  partnerType: "influencer" | "ambassador" | "referral",
  partnerCode: string,
  amount: number,
  description: string,
  referenceId?: string
): Promise<void> {
  if (amount <= 0) throw new Error("Credit amount must be positive");
  const code = partnerCode.toUpperCase().trim();

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const wallet = await Wallet.findOneAndUpdate(
        { partnerType, partnerCode: code },
        {
          $inc: { wallet_balance: amount, lifetime_earnings: amount },
          $set: { last_updated: new Date() },
        },
        { new: true, upsert: true, session }
      );
      await WalletTransaction.create(
        [
          {
            transaction_id: genTxId(),
            wallet_id: wallet!._id,
            partner_type: partnerType,
            partner_code: code,
            amount,
            type: "credit" as WalletTxType,
            status: "completed",
            description,
            reference_id: referenceId ?? null,
            created_at: new Date(),
          },
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
}

// ── Debit wallet (manual deduction) ──────────────────────────────────────────
export async function debitWallet(
  partnerType: "influencer" | "ambassador" | "referral",
  partnerCode: string,
  amount: number,
  description: string,
  referenceId?: string
): Promise<void> {
  if (amount <= 0) throw new Error("Debit amount must be positive");
  const code = partnerCode.toUpperCase().trim();

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const wallet = await Wallet.findOneAndUpdate(
        { partnerType, partnerCode: code, wallet_balance: { $gte: amount } },
        {
          $inc: { wallet_balance: -amount },
          $set: { last_updated: new Date() },
        },
        { new: true, session }
      );
      if (!wallet) throw new Error("Insufficient wallet balance");
      await WalletTransaction.create(
        [
          {
            transaction_id: genTxId(),
            wallet_id: wallet._id,
            partner_type: partnerType,
            partner_code: code,
            amount,
            type: "debit" as WalletTxType,
            status: "completed",
            description,
            reference_id: referenceId ?? null,
            created_at: new Date(),
          },
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
}

// ── Record withdrawal request (balance → pending) ─────────────────────────────
export async function recordWithdrawalRequest(
  partnerType: "influencer" | "ambassador" | "referral",
  partnerCode: string,
  amount: number,
  requestId: string,
  currentBalance: number
): Promise<void> {
  const code = partnerCode.toUpperCase().trim();

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Upsert wallet if not exist (initialize from current balance)
      let wallet = await Wallet.findOne({ partnerType, partnerCode: code }).session(session);
      if (!wallet) {
        const initBal = Math.max(0, currentBalance);
        [wallet] = await Wallet.create(
          [
            {
              partnerType,
              partnerCode: code,
              wallet_balance: initBal,
              lifetime_earnings: initBal,
              pending_withdrawal: 0,
              total_withdrawn: 0,
              last_updated: new Date(),
            },
          ],
          { session }
        );
      }

      // Deduct from wallet_balance, add to pending_withdrawal
      await Wallet.findByIdAndUpdate(
        wallet._id,
        {
          $inc: { wallet_balance: -amount, pending_withdrawal: amount },
          $set: { last_updated: new Date() },
        },
        { session }
      );

      await WalletTransaction.create(
        [
          {
            transaction_id: genTxId(),
            wallet_id: wallet._id,
            partner_type: partnerType,
            partner_code: code,
            amount,
            type: "withdrawal_request" as WalletTxType,
            status: "pending",
            description: `Withdrawal request ${requestId}`,
            reference_id: requestId,
            created_at: new Date(),
          },
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
}

// ── Record withdrawal success (pending → total_withdrawn) ─────────────────────
export async function recordWithdrawalSuccess(
  partnerType: "influencer" | "ambassador" | "referral",
  partnerCode: string,
  amount: number,
  requestId: string
): Promise<void> {
  const code = partnerCode.toUpperCase().trim();

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const wallet = await Wallet.findOneAndUpdate(
        { partnerType, partnerCode: code },
        {
          $inc: { pending_withdrawal: -amount, total_withdrawn: amount },
          $set: { last_updated: new Date() },
        },
        { new: true, session }
      );
      if (!wallet) return;

      // Update the pending transaction to success
      await WalletTransaction.findOneAndUpdate(
        { reference_id: requestId, type: "withdrawal_request" },
        { $set: { status: "completed" } },
        { session }
      );

      await WalletTransaction.create(
        [
          {
            transaction_id: genTxId(),
            wallet_id: wallet._id,
            partner_type: partnerType,
            partner_code: code,
            amount,
            type: "withdrawal_success" as WalletTxType,
            status: "completed",
            description: `Withdrawal paid — ${requestId}`,
            reference_id: requestId,
            created_at: new Date(),
          },
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
}

// ── Record withdrawal failure (pending → back to wallet_balance) ───────────────
export async function recordWithdrawalFailed(
  partnerType: "influencer" | "ambassador" | "referral",
  partnerCode: string,
  amount: number,
  requestId: string
): Promise<void> {
  const code = partnerCode.toUpperCase().trim();

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const wallet = await Wallet.findOneAndUpdate(
        { partnerType, partnerCode: code },
        {
          $inc: { pending_withdrawal: -amount, wallet_balance: amount },
          $set: { last_updated: new Date() },
        },
        { new: true, session }
      );
      if (!wallet) return;

      await WalletTransaction.findOneAndUpdate(
        { reference_id: requestId, type: "withdrawal_request" },
        { $set: { status: "failed" } },
        { session }
      );

      await WalletTransaction.create(
        [
          {
            transaction_id: genTxId(),
            wallet_id: wallet._id,
            partner_type: partnerType,
            partner_code: code,
            amount,
            type: "withdrawal_failed" as WalletTxType,
            status: "failed",
            description: `Withdrawal failed — amount returned to wallet — ${requestId}`,
            reference_id: requestId,
            created_at: new Date(),
          },
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
}

// ── Manual adjustment ─────────────────────────────────────────────────────────
export async function adjustWallet(
  partnerType: "influencer" | "ambassador" | "referral",
  partnerCode: string,
  amount: number,
  description: string,
  referenceId?: string
): Promise<void> {
  const code = partnerCode.toUpperCase().trim();

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const wallet = await Wallet.findOneAndUpdate(
        { partnerType, partnerCode: code },
        {
          $inc: {
            wallet_balance: amount,
            ...(amount > 0 ? { lifetime_earnings: amount } : {}),
          },
          $set: { last_updated: new Date() },
        },
        { new: true, upsert: true, session }
      );
      await WalletTransaction.create(
        [
          {
            transaction_id: genTxId(),
            wallet_id: wallet!._id,
            partner_type: partnerType,
            partner_code: code,
            amount: Math.abs(amount),
            type: "adjustment" as WalletTxType,
            status: "completed",
            description,
            reference_id: referenceId ?? null,
            created_at: new Date(),
          },
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
}
