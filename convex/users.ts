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

        // Create new user profile
        const now = Date.now();
        const profileId = await ctx.db.insert("profiles", {
            name: args.name,
            email: args.email,
            role: "member",
            authUserId,
            createdAt: now,
            updatedAt: now,
        });

        return profileId;
    },
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
