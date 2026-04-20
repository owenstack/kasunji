import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	users: defineTable({
		clerkId: v.string(),
		username: v.string(),
		email: v.string(),
		avatarUrl: v.optional(v.string()),
		squadcoCustomerId: v.optional(v.string()),
		squadcoVirtualAccount: v.optional(v.string()),
		createdAt: v.number(),
	})
		.index("by_clerk_id", ["clerkId"])
		.index("by_email", ["email"]),

	conversations: defineTable({
		participantIds: v.array(v.string()),
		lastMessageAt: v.number(),
		lastMessagePreview: v.string(),
	}).index("by_participant", ["participantIds"]),

	messages: defineTable({
		conversationId: v.id("conversations"),
		senderId: v.string(),
		type: v.union(
			v.literal("text"),
			v.literal("money_sent"),
			v.literal("money_received"),
		),
		content: v.string(),
		amount: v.optional(v.number()),
		transactionId: v.optional(v.string()),
		status: v.optional(
			v.union(
				v.literal("pending"),
				v.literal("success"),
				v.literal("failed"),
			),
		),
		createdAt: v.number(),
	}).index("by_conversation", ["conversationId", "createdAt"]),

	transactions: defineTable({
		squadcoTransactionRef: v.string(),
		senderId: v.string(),
		receiverId: v.string(),
		amount: v.number(),
		status: v.union(
			v.literal("pending"),
			v.literal("success"),
			v.literal("failed"),
		),
		messageId: v.optional(v.id("messages")),
		createdAt: v.number(),
	})
		.index("by_sender", ["senderId"])
		.index("by_receiver", ["receiverId"])
		.index("by_transaction_ref", ["squadcoTransactionRef"]),
});
