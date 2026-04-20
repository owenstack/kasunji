import { query } from "./_generated/server";

export const get = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			return {
				message: "Not authenticated",
			};
		}

		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) =>
				q.eq("clerkId", identity.subject),
			)
			.unique();

		return {
			message: user ? `Welcome, ${user.username}` : "User not synced yet",
		};
	},
});
