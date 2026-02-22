import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ——— Helper: verify caller is admin ———
async function requireAdmin(ctx: any) {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");

    const profile = await ctx.db
        .query("profiles")
        .withIndex("by_authUserId", (q: any) => q.eq("authUserId", authUserId))
        .unique();

    if (!profile || profile.role !== "admin") {
        throw new Error("Unauthorized. Admin access required.");
    }

    return profile;
}

// ——— Simple SHA-256 hash using Web Crypto API (available in Convex runtime) ———
async function sha256(message: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ——— Generate a random encrypted-format leave code ———
function generateEncryptedCode(): string {
    const hex = "0123456789ABCDEF";
    let code = "SSH-";
    for (let i = 0; i < 16; i++) {
        code += hex[Math.floor(Math.random() * hex.length)];
        if (i === 3 || i === 7 || i === 11) code += "-";
    }
    return code; // e.g. SSH-A7F2-B9C4-E1D8-3F06
}

/**
 * Check if the current user is an admin. Used by the frontend to guard routes.
 */
export const checkAdminAccess = query({
    args: {},
    handler: async (ctx) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) return { isAdmin: false, isAuthenticated: false };

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();

        if (!profile) return { isAdmin: false, isAuthenticated: true };

        return {
            isAdmin: profile.role === "admin",
            isAuthenticated: true,
            role: profile.role,
        };
    },
});

/**
 * Fetch contact details of all admins for users who want to request a leave code.
 */
export const getAdminContacts = query({
    args: {},
    handler: async (ctx) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) return [];

        const admins = await ctx.db
            .query("profiles")
            .filter((q) => q.eq(q.field("role"), "admin"))
            .collect();

        return admins.map((admin) => ({
            name: admin.name,
            email: admin.email,
            phone: admin.phone || "Not provided",
        }));
    },
});

/**
 * List all user profiles (admin only).
 */
export const listAllProfiles = query({
    args: {},
    handler: async (ctx) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) return [];

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();

        if (!profile || profile.role !== "admin") return [];

        const allProfiles = await ctx.db.query("profiles").collect();

        // Enrich with membership info
        const enriched = await Promise.all(
            allProfiles.map(async (p) => {
                const memberships = await ctx.db
                    .query("batchMembers")
                    .withIndex("by_userId", (q) => q.eq("userId", p._id))
                    .collect();

                let profileImageUrl = null;
                if (p.profileImageStorageId) {
                    profileImageUrl = await ctx.storage.getUrl(p.profileImageStorageId);
                }

                return {
                    ...p,
                    profileImageUrl,
                    membershipCount: memberships.length,
                };
            })
        );

        return enriched;
    },
});

/**
 * Admin: Update a user's role.
 */
export const updateUserRole = mutation({
    args: {
        userId: v.id("profiles"),
        role: v.union(v.literal("member"), v.literal("admin"), v.literal("moderator")),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const target = await ctx.db.get(args.userId);
        if (!target) throw new Error("User not found");

        await ctx.db.patch(args.userId, {
            role: args.role,
            updatedAt: Date.now(),
        });

        return { success: true, name: target.name, newRole: args.role };
    },
});

/**
 * Admin: Completely delete a user and all associated records from the application.
 */
export const deleteUser = mutation({
    args: {
        userId: v.id("profiles"),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const target = await ctx.db.get(args.userId);
        if (!target) throw new Error("User not found");

        // Prevent admin from deleting themselves
        const callerAuthId = await getAuthUserId(ctx);
        if (target.authUserId === callerAuthId) {
            throw new Error("You cannot delete your own admin account.");
        }

        // Delete all batchMembers for this user
        const memberships = await ctx.db
            .query("batchMembers")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .collect();
        for (const membership of memberships) {
            await ctx.db.delete(membership._id);
        }

        // Delete all leaveRequests for this user
        const requests = await ctx.db
            .query("leaveRequests")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .collect();
        for (const req of requests) {
            await ctx.db.delete(req._id);
        }

        // Delete all paymentVerifications for this user
        const payments = await ctx.db
            .query("paymentVerifications")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .collect();
        for (const payment of payments) {
            await ctx.db.delete(payment._id);
        }

        // Delete banking info for this user
        const banks = await ctx.db
            .query("bankingInfo")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .collect();
        for (const bank of banks) {
            await ctx.db.delete(bank._id);
        }

        // Note: the auth connection stays in `@convex-dev/auth`, but the user profile itself is gone
        // Meaning they cannot successfully login/interact since `getMe` fails. 
        await ctx.db.delete(args.userId);

        return { success: true };
    },
});

/**
 * Admin: Generate an encrypted leave code for a batch.
 */
export const generateLeaveCode = mutation({
    args: {
        batchId: v.id("batches"),
    },
    handler: async (ctx, args) => {
        const admin = await requireAdmin(ctx);

        const batch = await ctx.db.get(args.batchId);
        if (!batch) throw new Error("Batch not found");

        // Generate the encrypted-format code
        const code = generateEncryptedCode();
        const codeHash = await sha256(code);

        await ctx.db.insert("leaveCodes", {
            batchId: args.batchId,
            code,
            codeHash,
            generatedBy: admin._id,
            used: false,
            createdAt: Date.now(),
        });

        // Return the plaintext code for the admin to share with the member
        return { code, batchNumber: batch.number };
    },
});

/**
 * Admin: List all leave codes for a batch (shows which are used/unused).
 */
export const listLeaveCodes = query({
    args: { batchId: v.id("batches") },
    handler: async (ctx, args) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) return [];

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();

        if (!profile || profile.role !== "admin") return [];

        const codes = await ctx.db
            .query("leaveCodes")
            .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
            .collect();

        // Enrich with who used it
        const enriched = await Promise.all(
            codes.map(async (c) => {
                let usedByName = null;
                if (c.usedBy) {
                    const user = await ctx.db.get(c.usedBy);
                    usedByName = user?.name ?? "Unknown";
                }
                return {
                    ...c,
                    usedByName,
                };
            })
        );

        return enriched;
    },
});

/**
 * Verify a leave code and process the leave request.
 * Called by the member when they enter the code in the popup.
 */
export const verifyLeaveCode = mutation({
    args: {
        batchId: v.id("batches"),
        code: v.string(),
    },
    handler: async (ctx, args) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) throw new Error("Not authenticated");

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();
        if (!profile) throw new Error("Profile not found");

        // Hash the submitted code
        const submittedHash = await sha256(args.code.trim().toUpperCase());

        // Find a matching unused code for this batch
        const codes = await ctx.db
            .query("leaveCodes")
            .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
            .collect();

        const matchingCode = codes.find(
            (c) => c.codeHash === submittedHash && !c.used
        );

        if (!matchingCode) {
            throw new Error("Invalid or expired leave code. Please contact your admin.");
        }

        // Verify user is a member of this batch
        const membership = await ctx.db
            .query("batchMembers")
            .withIndex("by_batchId_userId", (q) =>
                q.eq("batchId", args.batchId).eq("userId", profile._id)
            )
            .unique();

        if (!membership) {
            throw new Error("You are not a member of this batch.");
        }

        // Mark code as used
        await ctx.db.patch(matchingCode._id, {
            used: true,
            usedBy: profile._id,
            usedAt: Date.now(),
        });

        // Remove the member from the batch
        await ctx.db.delete(membership._id);

        // Create an approved leave request record for audit
        await ctx.db.insert("leaveRequests", {
            batchId: args.batchId,
            userId: profile._id,
            status: "approved",
            reason: `Left via admin code: ${args.code.substring(0, 8)}...`,
            requestedAt: Date.now(),
            resolvedAt: Date.now(),
        });

        return { success: true };
    },
});
