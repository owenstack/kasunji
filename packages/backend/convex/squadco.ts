"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

export const createVirtualAccount = action({
	args: {
		clerkId: v.string(),
		firstName: v.string(),
		lastName: v.string(),
		email: v.string(),
		mobileNum: v.string(),
		bvn: v.string(),
		dob: v.string(),
		gender: v.union(v.literal("1"), v.literal("2")),
		address: v.string(),
	},
	handler: async (ctx, args) => {
		const baseUrl = process.env.SQUADCO_API_URL;
		const secretKey = process.env.SQUADCO_SECRET_KEY;

		if (!baseUrl || !secretKey) {
			throw new Error(
				"Squadco environment variables are not configured",
			);
		}

		const customerIdentifier = `KASUNJI_${args.clerkId}`;

		const res = await fetch(`${baseUrl}/virtual-account`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${secretKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				customer_identifier: customerIdentifier,
				first_name: args.firstName,
				last_name: args.lastName,
				email: args.email,
				mobile_num: args.mobileNum,
				bvn: args.bvn,
				dob: args.dob,
				gender: args.gender,
				address: args.address,
			}),
		});

		const data = await res.json();

		if (!data.success) {
			throw new Error(
				data.message || "Failed to create Squadco virtual account",
			);
		}

		await ctx.runMutation(internal.users.saveSquadcoAccount, {
			clerkId: args.clerkId,
			squadcoCustomerId: data.data.customer_identifier,
			squadcoVirtualAccount: data.data.virtual_account_number,
		});

		return {
			virtualAccountNumber: data.data.virtual_account_number,
			customerIdentifier: data.data.customer_identifier,
		};
	},
});

export const getWalletBalance = action({
	args: {},
	handler: async () => {
		const baseUrl = process.env.SQUADCO_API_URL;
		const secretKey = process.env.SQUADCO_SECRET_KEY;

		if (!baseUrl || !secretKey) {
			throw new Error(
				"Squadco environment variables are not configured",
			);
		}

		const res = await fetch(`${baseUrl}/merchant/balance?currency_id=NGN`, {
			headers: {
				Authorization: `Bearer ${secretKey}`,
			},
		});

		const data = await res.json();

		if (!data.success) {
			throw new Error(data.message || "Failed to fetch wallet balance");
		}

		return {
			balanceKobo: Number(data.data.balance),
			balanceNaira: Number(data.data.balance) / 100,
		};
	},
});
