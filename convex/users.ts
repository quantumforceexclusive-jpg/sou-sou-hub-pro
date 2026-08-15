import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Create or retrieve user profile after authentication.
 * Called after sign-up to store user profile data.
 */
export const createOrGetUser = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        inviteCode: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) {
            // Return null instead of throwing — the client retries until
            // the Convex WebSocket has synced the auth token.
            return null;
        }

        // Check if profile already exists
        const existing = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();

        if (existing) {
            return existing._id;
        }

        const hasExistingProfile = (await ctx.db.query("profiles").first()) !== null;
        const isBootstrapAdmin = !hasExistingProfile && !args.inviteCode;

        // The first account bootstraps the admin user. After that, signups require invite codes.
        if (!args.inviteCode && !isBootstrapAdmin) {
            throw new Error("An invite code is required to sign up.");
        }

        let invite = null;
        if (args.inviteCode) {
            // Validate invite code
            const encoder = new TextEncoder();
            const data = encoder.encode(args.inviteCode.trim().toUpperCase());
            const hashBuffer = await crypto.subtle.digest("SHA-256", data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const submittedHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

            invite = await ctx.db.query("inviteCodes").withIndex("by_codeHash", q => q.eq("codeHash", submittedHash)).unique();

            if (!invite || invite.used) {
                throw new Error("Invalid or already used invite code.");
            }
        }

        // Create new user profile
        const now = Date.now();
        const profileId = await ctx.db.insert("profiles", {
            name: args.name,
            email: args.email,
            role: isBootstrapAdmin ? "admin" : "member",
            authUserId,
            createdAt: now,
            updatedAt: now,
        });

        // Mark invite code as used
        if (invite) {
            await ctx.db.patch(invite._id, {
                used: true,
                usedBy: profileId,
                usedAt: now,
            });
        }

        return profileId;
    },
});

/**
 * The very first signup can create the initial admin account without an invite code.
 */
export const canBootstrapAdmin = query({
    args: {},
    handler: async (ctx) => {
        const existingProfile = await ctx.db.query("profiles").first();
        return existingProfile === null;
    },
});

/**
 * Validate an invite code before allowing a user to sign up.
 */
export const validateInviteCode = query({
    args: { code: v.string() },
    handler: async (ctx, args) => {
        const existingProfile = await ctx.db.query("profiles").first();
        if (!existingProfile && !args.code.trim()) return true;

        if (!args.code.trim()) return false;

        const encoder = new TextEncoder();
        const data = encoder.encode(args.code.trim().toUpperCase());
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const submittedHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        const invite = await ctx.db.query("inviteCodes").withIndex("by_codeHash", q => q.eq("codeHash", submittedHash)).unique();

        if (!invite || invite.used) {
            return false;
        }

        return true;
    }
});

export const getMe = query({
    args: {},
    handler: async (ctx) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) {
            return null;
        }

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();

        if (!profile) return null;

        let profileImageUrl = null;
        if (profile.profileImageStorageId) {
            profileImageUrl = await ctx.storage.getUrl(profile.profileImageStorageId);
        }

        return {
            ...profile,
            profileImageUrl,
        };
    },
});

/**
 * Generate a secure upload URL for profile images.
 */
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) throw new Error("Not authenticated");
        return await ctx.storage.generateUploadUrl();
    },
});

/**
 * Update the user's profile image with the uploaded storage ID.
 */
export const saveMyProfileImage = mutation({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) throw new Error("Not authenticated");

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();

        if (!profile) throw new Error("Profile not found");

        if (profile.profileImageStorageId) {
            await ctx.storage.delete(profile.profileImageStorageId);
        }

        await ctx.db.patch(profile._id, {
            profileImageStorageId: args.storageId,
            updatedAt: Date.now(),
        });
    },
});

/**
 * Update user profile details.
 */
export const updateMyProfile = mutation({
    args: {
        name: v.string(),
        phone: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const authUserId = await getAuthUserId(ctx);
        if (!authUserId) throw new Error("Not authenticated");

        const profile = await ctx.db
            .query("profiles")
            .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
            .unique();

        if (!profile) throw new Error("Profile not found");

        await ctx.db.patch(profile._id, {
            name: args.name,
            phone: args.phone,
            updatedAt: Date.now(),
        });

        return profile._id;
    },
});
