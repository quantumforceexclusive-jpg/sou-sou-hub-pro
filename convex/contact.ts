import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const submitContactMessage = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        subject: v.string(),
        message: v.string(),
    },
    handler: async (ctx, args) => {
        // Basic validation
        if (!args.name.trim() || !args.email.trim() || !args.message.trim()) {
            throw new Error("Missing required fields.");
        }

        if (args.message.length > 5000) {
            throw new Error("Message is too long.");
        }

        // Insert message
        const messageId = await ctx.db.insert("contactMessages", {
            name: args.name.trim(),
            email: args.email.trim().toLowerCase(),
            subject: args.subject,
            message: args.message.trim(),
            createdAt: Date.now(),
            status: "new",
        });

        return messageId;
    },
});
