import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ——— User Banking Info ———

/**
 * Get the current user's banking info.
 */
export const getMyBankingInfo = query({
    args: {},
    handler: async (ctx) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) return null;

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();
        if (!profile) return null;

        return await ctx.db
            .query("bankingInfo")
            .withIndex("by_userId", (q) => q.eq("userId", profile._id))
            .unique();
    },
});

/**
 * Save or update the current user's banking info.
 */
export const saveMyBankingInfo = mutation({
    args: {
        firstName: v.string(),
        lastName: v.string(),
        bankName: v.string(),
        accountType: v.union(v.literal("chequing"), v.literal("savings")),
        accountNumber: v.string(),
        currency: v.union(v.literal("TTD"), v.literal("USD")),
    },
    handler: async (ctx, args) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) throw new Error("Not authenticated");

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();
        if (!profile) throw new Error("Profile not found");

        const existing = await ctx.db
            .query("bankingInfo")
            .withIndex("by_userId", (q) => q.eq("userId", profile._id))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                ...args,
                updatedAt: Date.now(),
            });
            return existing._id;
        } else {
            return await ctx.db.insert("bankingInfo", {
                userId: profile._id,
                ...args,
                updatedAt: Date.now(),
            });
        }
    },
});

// ——— Admin Bank Account (receiving payments) ———

/**
 * Get the default admin bank account (visible to all authenticated users for payment).
 */
export const getAdminBankAccount = query({
    args: {},
    handler: async (ctx) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) return null;

        const defaults = await ctx.db
            .query("adminBankAccount")
            .withIndex("by_isDefault", (q) => q.eq("isDefault", true))
            .collect();

        return defaults[0] ?? null;
    },
});

/**
 * Admin: Save or update the admin's default bank account.
 */
export const saveAdminBankAccount = mutation({
    args: {
        firstName: v.string(),
        lastName: v.string(),
        bankName: v.string(),
        accountType: v.union(v.literal("chequing"), v.literal("savings")),
        accountNumber: v.string(),
        currency: v.union(v.literal("TTD"), v.literal("USD")),
        conversionRate: v.number(),
    },
    handler: async (ctx, args) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) throw new Error("Not authenticated");

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();
        if (!profile || profile.role !== "admin") {
            throw new Error("Unauthorized. Admin access required.");
        }

        // Find existing default
        const existing = await ctx.db
            .query("adminBankAccount")
            .withIndex("by_isDefault", (q) => q.eq("isDefault", true))
            .collect();

        if (existing.length > 0) {
            // Update existing
            await ctx.db.patch(existing[0]._id, {
                ...args,
                adminId: profile._id,
                isDefault: true,
                updatedAt: Date.now(),
            });
            return existing[0]._id;
        } else {
            return await ctx.db.insert("adminBankAccount", {
                adminId: profile._id,
                ...args,
                isDefault: true,
                updatedAt: Date.now(),
            });
        }
    },
});

/**
 * Admin: Update only the currency and conversion rate.
 */
export const updateAdminCurrency = mutation({
    args: {
        currency: v.union(v.literal("TTD"), v.literal("USD")),
        conversionRate: v.number(),
    },
    handler: async (ctx, args) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) throw new Error("Not authenticated");

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();
        if (!profile || profile.role !== "admin") {
            throw new Error("Unauthorized. Admin access required.");
        }

        const existing = await ctx.db
            .query("adminBankAccount")
            .withIndex("by_isDefault", (q) => q.eq("isDefault", true))
            .collect();

        if (existing.length === 0) {
            throw new Error("No admin bank account set. Please set up banking info first.");
        }

        await ctx.db.patch(existing[0]._id, {
            currency: args.currency,
            conversionRate: args.conversionRate,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

// ——— Payment Verification ———

/**
 * Check if the current user is verified to join a specific batch.
 */
export const getMyPaymentStatus = query({
    args: { batchId: v.id("batches") },
    handler: async (ctx, args) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) return null;

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();
        if (!profile) return null;

        const verification = await ctx.db
            .query("paymentVerifications")
            .withIndex("by_batchId_userId", (q) =>
                q.eq("batchId", args.batchId).eq("userId", profile._id)
            )
            .unique();

        return verification;
    },
});

/**
 * Admin: List all users and their payment status for a batch.
 */
export const listPaymentStatuses = query({
    args: { batchId: v.id("batches") },
    handler: async (ctx, args) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) return [];

        const admin = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();
        if (!admin || admin.role !== "admin") return [];

        // Get all profiles
        const allProfiles = await ctx.db.query("profiles").collect();

        // Get existing verifications for this batch
        const verifications = await ctx.db
            .query("paymentVerifications")
            .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
            .collect();

        // Check who is already a member of this batch
        const members = await ctx.db
            .query("batchMembers")
            .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
            .collect();

        const memberUserIds = new Set(members.map(m => m.userId));

        return allProfiles.map((p) => {
            const verification = verifications.find(v => v.userId === p._id);
            return {
                _id: p._id,
                name: p.name,
                email: p.email,
                role: p.role,
                verified: verification?.verified ?? false,
                verificationId: verification?._id ?? null,
                isAlreadyMember: memberUserIds.has(p._id),
            };
        });
    },
});

/**
 * Admin: Mark a user's payment as verified or unverified for a batch.
 */
export const adminVerifyPayment = mutation({
    args: {
        userId: v.id("profiles"),
        batchId: v.id("batches"),
        verified: v.boolean(),
    },
    handler: async (ctx, args) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) throw new Error("Not authenticated");

        const admin = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();
        if (!admin || admin.role !== "admin") {
            throw new Error("Unauthorized. Admin access required.");
        }

        const existing = await ctx.db
            .query("paymentVerifications")
            .withIndex("by_batchId_userId", (q) =>
                q.eq("batchId", args.batchId).eq("userId", args.userId)
            )
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                verified: args.verified,
                verifiedBy: admin._id,
                verifiedAt: Date.now(),
            });
        } else {
            await ctx.db.insert("paymentVerifications", {
                userId: args.userId,
                batchId: args.batchId,
                verified: args.verified,
                verifiedBy: admin._id,
                verifiedAt: Date.now(),
            });
        }

        const target = await ctx.db.get(args.userId);
        return { success: true, name: target?.name ?? "User", verified: args.verified };
    },
});
