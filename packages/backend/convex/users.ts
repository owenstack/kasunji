import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

export const syncUser = mutation({
	args: {
		clerkId: v.string(),
		username: v.string(),
		email: v.string(),
		avatarUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, {
				username: args.username,
				email: args.email,
				avatarUrl: args.avatarUrl,
			});
			return existing._id;
		}

		return await ctx.db.insert("users", {
			clerkId: args.clerkId,
			username: args.username,
			email: args.email,
			avatarUrl: args.avatarUrl,
			createdAt: Date.now(),
		});
	},
});

export const saveSquadcoAccount = internalMutation({
	args: {
		clerkId: v.string(),
		squadcoCustomerId: v.string(),
		squadcoVirtualAccount: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
			.unique();

		if (!user) {
			throw new Error(`User not found for clerkId: ${args.clerkId}`);
		}

		await ctx.db.patch(user._id, {
			squadcoCustomerId: args.squadcoCustomerId,
			squadcoVirtualAccount: args.squadcoVirtualAccount,
		});
	},
});

export const getUser = query({
	args: { clerkId: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
			.unique();
	},
});

export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return null;

		return await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) =>
				q.eq("clerkId", identity.subject),
			)
			.unique();
	},
});
