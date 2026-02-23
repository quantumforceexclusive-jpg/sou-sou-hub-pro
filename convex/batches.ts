import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { closeBatchAndRandomize } from "./fairness";

/**
 * Ensure an initial batch exists. If no batches exist, creates Batch #1.
 */
export const ensureInitialBatch = mutation({
    args: {},
    handler: async (ctx) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) {
            throw new Error("Not authenticated");
        }

        // Check if any batches exist
        const existingBatch = await ctx.db.query("batches").first();
        if (existingBatch) {
            return existingBatch._id;
        }

        // Create Batch #1 with defaults
        const batchId = await ctx.db.insert("batches", {
            number: 1,
            status: "open",
            maxMembers: 50,
            frequency: "monthly",
            duration: 12,
            amount: 1000,
            createdAt: Date.now(),
        });

        return batchId;
    },
});

/**
 * List all batches ordered by number descending, with member counts.
 */
export const listBatches = query({
    args: {},
    handler: async (ctx) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) {
            return [];
        }

        const batches = await ctx.db
            .query("batches")
            .withIndex("by_number")
            .order("desc")
            .collect();

        // For each batch, get member count and pending leave requests
        const batchesWithCounts = await Promise.all(
            batches.map(async (batch) => {
                const members = await ctx.db
                    .query("batchMembers")
                    .withIndex("by_batchId", (q) => q.eq("batchId", batch._id))
                    .collect();

                const pendingLeaves = await ctx.db
                    .query("leaveRequests")
                    .withIndex("by_batchId", (q) => q.eq("batchId", batch._id))
                    .collect();

                return {
                    ...batch,
                    memberCount: members.length,
                    pendingLeaveCount: pendingLeaves.filter(r => r.status === "pending").length,
                };
            })
        );

        return batchesWithCounts;
    },
});

/**
 * Get the newest open batch.
 */
export const getOpenBatch = query({
    args: {},
    handler: async (ctx) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) {
            return null;
        }

        const openBatches = await ctx.db
            .query("batches")
            .withIndex("by_status", (q) => q.eq("status", "open"))
            .collect();

        if (openBatches.length === 0) return null;

        // Return the one with the highest number
        return openBatches.reduce((latest, batch) =>
            batch.number > latest.number ? batch : latest
        );
    },
});

/**
 * Get the current user's membership and batch details.
 */
export const getMyMembership = query({
    args: {},
    handler: async (ctx) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) {
            return null;
        }

        // Get user profile
        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();

        if (!profile) return null;

        // Get all memberships for this user
        const memberships = await ctx.db
            .query("batchMembers")
            .withIndex("by_userId", (q) => q.eq("userId", profile._id))
            .collect();

        // Enrich with batch details + leave request status
        const enriched = await Promise.all(
            memberships.map(async (m) => {
                const batch = await ctx.db.get(m.batchId);

                // Check if user has a pending leave request for this batch
                const leaveRequest = await ctx.db
                    .query("leaveRequests")
                    .withIndex("by_batchId_userId", (q) =>
                        q.eq("batchId", m.batchId).eq("userId", profile._id)
                    )
                    .unique();

                return {
                    ...m,
                    batch,
                    leaveRequestStatus: leaveRequest?.status ?? null,
                };
            })
        );

        return enriched;
    },
});

export const getMyMembershipAndDashboardStats = query({
    args: {},
    handler: async (ctx) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) return null;

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();

        if (!profile) return null;

        const memberships = await ctx.db
            .query("batchMembers")
            .withIndex("by_userId", (q) => q.eq("userId", profile._id))
            .collect();

        const statsList = await Promise.all(memberships.map(async (m) => {
            const batch = await ctx.db.get(m.batchId);
            if (!batch) return null;

            const members = await ctx.db
                .query("batchMembers")
                .withIndex("by_batchId", (q) => q.eq("batchId", batch._id))
                .collect();

            const memberCount = members.length;
            const amount = batch.amount ?? 1000;
            const totalMonthlyPool = amount * memberCount;

            let currentMonthOfCycle = 0;
            let nextPayoutMember = null;
            let nextPayoutDate = null;

            if (batch.payoutOrderLocked && batch.cycleStartDate) {
                // Determine current month
                const now = Date.now();
                const startDate = new Date(batch.cycleStartDate);
                const currDate = new Date(now);

                const monthDiff = (currDate.getFullYear() - startDate.getFullYear()) * 12 + (currDate.getMonth() - startDate.getMonth());
                currentMonthOfCycle = Math.min(Math.max(monthDiff + 1, 1), memberCount);

                // Find next unpaid member
                const sorted = members.filter(x => !!x.payoutMonth || !!x.payoutMonthIndex).sort((a, b) => {
                    if (a.payoutMonthIndex && b.payoutMonthIndex) {
                        if (a.payoutMonthIndex !== b.payoutMonthIndex) return a.payoutMonthIndex - b.payoutMonthIndex;
                        return (a.payoutRoundIndex ?? 0) - (b.payoutRoundIndex ?? 0);
                    }
                    if (a.payoutMonth && b.payoutMonth) return a.payoutMonth - b.payoutMonth;
                    return a.memberNumber - b.memberNumber;
                });
                const nextUnpaid = sorted.find(x => x.payoutStatus !== "paid");
                if (nextUnpaid) {
                    const monthsStr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    if (nextUnpaid.payoutMonthIndex) {
                        const mStr = monthsStr[nextUnpaid.payoutMonthIndex - 1];
                        nextPayoutMember = `${nextUnpaid.displayName} (${mStr}${nextUnpaid.payoutRoundIndex ? ' - R' + nextUnpaid.payoutRoundIndex : ''})`;
                    } else {
                        nextPayoutMember = `${nextUnpaid.displayName} (Month ${nextUnpaid.payoutMonth})`;
                    }

                    // calculate next payout date using cycleStartDate + offset (1st of the resulting month)
                    const payoutDate = new Date(batch.cycleStartDate);
                    const offsetMonth = nextUnpaid.payoutMonthIndex ? nextUnpaid.payoutMonthIndex : (nextUnpaid.payoutMonth ?? 1);
                    payoutDate.setMonth(payoutDate.getMonth() + offsetMonth - 1);
                    // Payout day rule: 1st of each month at 09:00 POS time (UTC-4)
                    payoutDate.setDate(1);
                    payoutDate.setUTCHours(13, 0, 0, 0); // 13:00 UTC is 09:00 in America/Port_of_Spain

                    nextPayoutDate = payoutDate.getTime();
                }
            }

            return {
                role: profile.role,
                myMembership: {
                    batchNumber: batch.number,
                    memberNumber: m.memberNumber,
                    displayName: m.displayName,
                    payoutMonth: m.payoutMonth,
                },
                batch: {
                    _id: batch._id,
                    status: batch.status,
                    number: batch.number,
                    payoutOrderLocked: batch.payoutOrderLocked,
                },
                memberCount,
                monthlyContributionAmount: amount,
                totalMonthlyPool,
                currentMonthOfCycle,
                nextPayoutMember,
                nextPayoutDate,
                fairnessSeedCommitHash: batch.fairnessSeedCommitHash,
                fairnessSeedRevealed: batch.fairnessSeedRevealed,
            };
        }));

        return statsList.filter(s => s !== null);
    },
});

/**
 * Get members of a specific batch.
 */
export const getBatchMembers = query({
    args: { batchId: v.id("batches") },
    handler: async (ctx, args) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) {
            return [];
        }

        const members = await ctx.db
            .query("batchMembers")
            .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
            .collect();

        return members;
    },
});

/**
 * Join the current open batch.
 */
export const joinOpenBatch = mutation({
    args: {},
    handler: async (ctx) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) {
            throw new Error("Not authenticated");
        }

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();

        if (!profile) {
            throw new Error("User profile not found. Please complete sign up.");
        }

        const openBatches = await ctx.db
            .query("batches")
            .withIndex("by_status", (q) => q.eq("status", "open"))
            .collect();

        if (openBatches.length === 0) {
            throw new Error("No open batch available.");
        }

        const openBatch = openBatches.reduce((latest, batch) =>
            batch.number > latest.number ? batch : latest
        );

        // Check if user already in this batch
        const existingInBatch = await ctx.db
            .query("batchMembers")
            .withIndex("by_batchId_userId", (q) =>
                q.eq("batchId", openBatch._id).eq("userId", profile._id)
            )
            .unique();

        if (existingInBatch) {
            throw new Error("You have already joined this batch.");
        }

        // Check if user is in any open batch
        const userMemberships = await ctx.db
            .query("batchMembers")
            .withIndex("by_userId", (q) => q.eq("userId", profile._id))
            .collect();

        for (const membership of userMemberships) {
            const batch = await ctx.db.get(membership.batchId);
            if (batch && batch.status === "open") {
                throw new Error("You are already a member of an open batch.");
            }
        }

        // Check payment verification
        const paymentVerification = await ctx.db
            .query("paymentVerifications")
            .withIndex("by_batchId_userId", (q) =>
                q.eq("batchId", openBatch._id).eq("userId", profile._id)
            )
            .unique();

        if (!paymentVerification || !paymentVerification.verified) {
            throw new Error("PAYMENT_NOT_VERIFIED");
        }

        const currentMembers = await ctx.db
            .query("batchMembers")
            .withIndex("by_batchId", (q) => q.eq("batchId", openBatch._id))
            .collect();

        const memberNumber = currentMembers.length + 1;
        const paddedNum = String(memberNumber).padStart(2, "0");
        const displayName = `${profile.name} #${paddedNum}`;

        await ctx.db.insert("batchMembers", {
            batchId: openBatch._id,
            userId: profile._id,
            memberNumber,
            displayName,
            joinedAt: Date.now(),
        });

        // Check if batch is now full
        if (memberNumber >= openBatch.maxMembers) {
            await closeBatchAndRandomize(ctx, openBatch._id);
        }

        return { memberNumber, displayName };
    },
});

/**
 * Request to leave an open batch.
 */
export const requestLeaveBatch = mutation({
    args: {
        batchId: v.id("batches"),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) throw new Error("Not authenticated");

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();
        if (!profile) throw new Error("Profile not found");

        // Verify the batch is open
        const batch = await ctx.db.get(args.batchId);
        if (!batch) throw new Error("Batch not found");
        if (batch.status !== "open") throw new Error("Cannot leave a closed batch.");

        // Verify user is a member
        const membership = await ctx.db
            .query("batchMembers")
            .withIndex("by_batchId_userId", (q) =>
                q.eq("batchId", args.batchId).eq("userId", profile._id)
            )
            .unique();
        if (!membership) throw new Error("You are not a member of this batch.");

        // Check for existing pending request
        const existing = await ctx.db
            .query("leaveRequests")
            .withIndex("by_batchId_userId", (q) =>
                q.eq("batchId", args.batchId).eq("userId", profile._id)
            )
            .unique();
        if (existing && existing.status === "pending") {
            throw new Error("You already have a pending leave request for this batch.");
        }

        await ctx.db.insert("leaveRequests", {
            batchId: args.batchId,
            userId: profile._id,
            status: "pending",
            reason: args.reason,
            requestedAt: Date.now(),
        });

        return { success: true };
    },
});

/**
 * Get leave requests for a batch (admin view).
 */
export const getLeaveRequests = query({
    args: { batchId: v.id("batches") },
    handler: async (ctx, args) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) return [];

        const requests = await ctx.db
            .query("leaveRequests")
            .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
            .collect();

        // Enrich with user profile info
        const enriched = await Promise.all(
            requests.map(async (req) => {
                const profile = await ctx.db.get(req.userId);
                return {
                    ...req,
                    userName: profile?.name ?? "Unknown",
                    userEmail: profile?.email ?? "",
                };
            })
        );

        return enriched;
    },
});

/**
 * Admin: Approve or deny a leave request.
 */
export const adminHandleLeaveRequest = mutation({
    args: {
        requestId: v.id("leaveRequests"),
        decision: v.union(v.literal("approved"), v.literal("denied")),
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

        const request = await ctx.db.get(args.requestId);
        if (!request) throw new Error("Leave request not found.");
        if (request.status !== "pending") throw new Error("Request already resolved.");

        // Update the request status
        await ctx.db.patch(args.requestId, {
            status: args.decision,
            resolvedAt: Date.now(),
        });

        // If approved, remove member from the batch
        if (args.decision === "approved") {
            const membership = await ctx.db
                .query("batchMembers")
                .withIndex("by_batchId_userId", (q) =>
                    q.eq("batchId", request.batchId).eq("userId", request.userId)
                )
                .unique();

            if (membership) {
                await ctx.db.delete(membership._id);
            }
        }

        return { success: true, decision: args.decision };
    },
});

/**
 * Admin: Update batch frequency and duration settings.
 */
export const adminUpdateBatchSettings = mutation({
    args: {
        batchId: v.id("batches"),
        frequency: v.union(v.literal("weekly"), v.literal("monthly")),
        duration: v.number(),
        amount: v.optional(v.number()),
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

        const batch = await ctx.db.get(args.batchId);
        if (!batch) throw new Error("Batch not found");

        await ctx.db.patch(args.batchId, {
            frequency: args.frequency,
            duration: args.duration,
            amount: args.amount,
        });

        return { success: true };
    },
});

/**
 * Admin-only: Close the current open batch early and create the next batch.
 */
export const adminCloseBatch = mutation({
    args: { batchId: v.id("batches") },
    handler: async (ctx, args) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) {
            throw new Error("Not authenticated");
        }

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();

        if (!profile || profile.role !== "admin") {
            throw new Error("Unauthorized. Admin access required.");
        }

        const batch = await ctx.db.get(args.batchId);
        if (!batch) {
            throw new Error("Batch not found.");
        }
        if (batch.status !== "open") {
            throw new Error("Batch is already closed.");
        }

        // Close the batch and perform randomization algorithm
        await closeBatchAndRandomize(ctx, args.batchId);

        return { closedBatchNumber: batch.number, newBatchNumber: batch.number + 1 };
    },
});

/**
 * Admin-only: Mark a member's payout as paid.
 */
export const adminMarkPayoutPaid = mutation({
    args: { batchId: v.id("batches"), memberId: v.id("batchMembers") },
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

        const member = await ctx.db.get(args.memberId);
        if (!member || member.batchId !== args.batchId) {
            throw new Error("Payout member not found in this batch.");
        }

        await ctx.db.patch(member._id, {
            payoutStatus: "paid",
            paidAt: Date.now(),
        });

        return { success: true };
    },
});

/**
 * Admin-only: Reveal the fairness seed for a locked batch.
 */
export const adminRevealFairnessSeed = mutation({
    args: { batchId: v.id("batches") },
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

        const batch = await ctx.db.get(args.batchId);
        if (!batch) throw new Error("Batch not found.");

        if (!batch.payoutOrderLocked) {
            throw new Error("Cannot reveal seed on an unlocked batch.");
        }

        await ctx.db.patch(args.batchId, {
            fairnessSeedRevealed: true,
        });

        return { success: true };
    },
});

/**
 * Get payout availability for the current open batch (supports monthly selection).
 */
export const getOpenBatchPayoutAvailability = query({
    args: {},
    handler: async (ctx) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) return null;

        const openBatches = await ctx.db
            .query("batches")
            .withIndex("by_status", (q) => q.eq("status", "open"))
            .collect();

        if (openBatches.length === 0) return null;
        const openBatch = openBatches.reduce((latest, batch) =>
            batch.number > latest.number ? batch : latest
        );

        const members = await ctx.db
            .query("batchMembers")
            .withIndex("by_batchId", (q) => q.eq("batchId", openBatch._id))
            .collect();

        const memberCount = members.length;
        const roundCount = Math.max(1, Math.ceil(memberCount / 12));

        const availabilityByMonth: Record<number, { total: number, taken: number, remaining: number }> = {};
        for (let m = 1; m <= 12; m++) {
            availabilityByMonth[m] = { total: roundCount, taken: 0, remaining: roundCount };
        }

        for (const m of members) {
            if (m.requestedMonthIndex) {
                if (availabilityByMonth[m.requestedMonthIndex]) {
                    availabilityByMonth[m.requestedMonthIndex].taken += 1;
                    availabilityByMonth[m.requestedMonthIndex].remaining -= 1;
                }
            }
        }

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();

        let myReservation = null;
        if (profile) {
            const me = members.find(m => m.userId === profile._id);
            if (me && me.requestedMonthIndex) {
                myReservation = {
                    monthIndex: me.requestedMonthIndex,
                    roundIndex: me.requestedRoundIndex,
                };
            }
        }

        return {
            batchId: openBatch._id,
            memberCount,
            roundCount,
            availabilityByMonth,
            myReservation,
        };
    },
});

/**
 * Request a specific payout month
 */
export const setRequestedPayoutMonth = mutation({
    args: { batchId: v.id("batches"), monthIndex: v.number() },
    handler: async (ctx, args) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) throw new Error("Not authenticated");

        if (args.monthIndex < 1 || args.monthIndex > 12) throw new Error("Invalid month");

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();
        if (!profile) throw new Error("Profile not found");

        const batch = await ctx.db.get(args.batchId);
        if (!batch) throw new Error("Batch not found");
        if (batch.status !== "open") throw new Error("Batch is not open");

        const members = await ctx.db
            .query("batchMembers")
            .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
            .collect();

        const me = members.find(m => m.userId === profile._id);
        if (!me) throw new Error("You are not a member of this batch");

        const memberCount = members.length;
        const roundCount = Math.max(1, Math.ceil(memberCount / 12));

        const takenRounds = members
            .filter(m => m.requestedMonthIndex === args.monthIndex && m._id !== me._id)
            .map(m => m.requestedRoundIndex)
            .filter(Boolean) as number[];

        let foundRoundIndex = null;
        for (let r = 1; r <= roundCount; r++) {
            if (!takenRounds.includes(r)) {
                foundRoundIndex = r;
                break;
            }
        }

        if (!foundRoundIndex) {
            throw new Error("Month is fully booked");
        }

        await ctx.db.patch(me._id, {
            requestedMonthIndex: args.monthIndex,
            requestedRoundIndex: foundRoundIndex,
        });

        return { success: true, monthIndex: args.monthIndex, roundIndex: foundRoundIndex };
    },
});

export const clearRequestedPayoutMonth = mutation({
    args: { batchId: v.id("batches") },
    handler: async (ctx, args) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) throw new Error("Not authenticated");

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();
        if (!profile) throw new Error("Profile not found");

        const me = await ctx.db
            .query("batchMembers")
            .withIndex("by_batchId_userId", (q) =>
                q.eq("batchId", args.batchId).eq("userId", profile._id)
            )
            .unique();
        if (!me) throw new Error("You are not a member of this batch");

        await ctx.db.patch(me._id, {
            requestedMonthIndex: undefined,
            requestedRoundIndex: undefined,
        });

        return { success: true };
    },
});

/**
 * Get payout schedule for an active or closed batch.
 */
export const getBatchPayoutSchedule = query({
    args: { batchId: v.id("batches") },
    handler: async (ctx, args) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) return null;

        const batch = await ctx.db.get(args.batchId);
        if (!batch) return null;

        const members = await ctx.db
            .query("batchMembers")
            .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
            .collect();

        // Sort by payoutMonthIndex/Round (if locked manual) or payoutMonth (if locked random) or just by memberNumber
        members.sort((a, b) => {
            if (a.payoutMonthIndex && b.payoutMonthIndex) {
                if (a.payoutMonthIndex !== b.payoutMonthIndex) {
                    return a.payoutMonthIndex - b.payoutMonthIndex;
                }
                return (a.payoutRoundIndex ?? 0) - (b.payoutRoundIndex ?? 0);
            }
            if (a.payoutMonth && b.payoutMonth) return a.payoutMonth - b.payoutMonth;
            return a.memberNumber - b.memberNumber;
        });

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        return {
            payoutAssignmentMode: batch.payoutAssignmentMode,
            members: members.map(m => {
                let label = "-";
                if (m.payoutMonthIndex) {
                    const monthName = months[m.payoutMonthIndex - 1];
                    label = m.payoutRoundIndex ? `${monthName} — Round ${m.payoutRoundIndex}` : monthName;
                } else if (m.payoutMonth) {
                    const monthNum = m.payoutMonth;
                    label = monthNum <= 12 ? months[monthNum - 1] : `Period ${monthNum}`;
                }

                return {
                    _id: m._id,
                    displayName: m.displayName,
                    payoutMonthIndex: m.payoutMonthIndex,
                    payoutRoundIndex: m.payoutRoundIndex,
                    payoutMonth: m.payoutMonth,
                    payoutLabel: label,
                    payoutStatus: m.payoutStatus,
                    paidAt: m.paidAt,
                };
            }),
        };
    },
});

/**
 * Get fairness verification data for a closed batch.
 */
export const getFairnessVerification = query({
    args: { batchId: v.id("batches") },
    handler: async (ctx, args) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) return null;

        const batch = await ctx.db.get(args.batchId);
        if (!batch || !batch.payoutOrderLocked) return null;

        const members = await ctx.db
            .query("batchMembers")
            .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
            .collect();

        // Create mapping of month -> member
        const mapping: Record<number, number> = {};
        for (const m of members) {
            if (m.payoutMonth) {
                mapping[m.payoutMonth] = m.memberNumber;
            }
        }

        return {
            commitHash: batch.fairnessSeedCommitHash,
            scheduleMapping: mapping,
            isRevealed: batch.fairnessSeedRevealed,
            seed: batch.fairnessSeedRevealed ? batch.fairnessSeedSecret : null,
            verificationInstructions: batch.fairnessSeedRevealed
                ? "Deterministically seed the PRNG (SFC32 + Cyrb128) with this secret string, generate array [1..N], and shuffle via Fisher-Yates traversing backwards. It will match the schedule mapping."
                : null
        };
    },
});

/**
 * Admin-only: Delete a batch completely, including all memberships and history.
 * Optionally resets things if all batches are deleted.
 */
export const adminDeleteBatch = mutation({
    args: { batchId: v.id("batches") },
    handler: async (ctx, args) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) throw new Error("Not authenticated");

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();

        if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
            throw new Error("Unauthorized. Admin access required.");
        }

        const batch = await ctx.db.get(args.batchId);
        if (!batch) throw new Error("Batch not found.");

        // Delete all members
        const members = await ctx.db.query("batchMembers").withIndex("by_batchId", q => q.eq("batchId", args.batchId)).collect();
        for (const m of members) await ctx.db.delete(m._id);

        // Delete all leave requests
        const leaveRequests = await ctx.db.query("leaveRequests").withIndex("by_batchId", q => q.eq("batchId", args.batchId)).collect();
        for (const lr of leaveRequests) await ctx.db.delete(lr._id);

        // Delete all payment verifications
        const payments = await ctx.db.query("paymentVerifications").withIndex("by_batchId", q => q.eq("batchId", args.batchId)).collect();
        for (const p of payments) await ctx.db.delete(p._id);

        // Delete all leave codes generated for this batch
        const codes = await ctx.db.query("leaveCodes").withIndex("by_batchId", q => q.eq("batchId", args.batchId)).collect();
        for (const c of codes) await ctx.db.delete(c._id);

        // Finally, delete the batch itself
        await ctx.db.delete(args.batchId);

        return { success: true };
    }
});

/**
 * Admin-only: Force create a new manual open batch.
 * It will find the highest batch number and automatically sequence it.
 */
export const adminCreateBatch = mutation({
    args: {},
    handler: async (ctx) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) throw new Error("Not authenticated");

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();

        if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
            throw new Error("Unauthorized. Admin access required.");
        }

        // Find the latest batch to determine the sequence number
        const batches = await ctx.db.query("batches").collect();
        const latestBatch = batches.reduce((latest: any, current) => {
            if (!latest) return current;
            return current.number > latest.number ? current : latest;
        }, null);

        const newNumber = latestBatch ? latestBatch.number + 1 : 1;

        const newBatchId = await ctx.db.insert("batches", {
            number: newNumber,
            status: "open",
            maxMembers: latestBatch ? latestBatch.maxMembers : 50,
            frequency: latestBatch ? latestBatch.frequency : "monthly",
            duration: latestBatch ? latestBatch.duration : 12,
            amount: latestBatch ? latestBatch.amount : 1000,
            createdAt: Date.now(),
        });

        return { success: true, batchId: newBatchId, number: newNumber };
    }
});
