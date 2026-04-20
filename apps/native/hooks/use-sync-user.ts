import { useUser } from "@clerk/expo";
import { api } from "@kasunji/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";

export function useSyncUser() {
	const { user, isSignedIn } = useUser();
	const syncUser = useMutation(api.users.syncUser);
	const syncedUserId = useRef<string | null>(null);

	useEffect(() => {
		if (!isSignedIn || !user) {
			syncedUserId.current = null;
			return;
		}

		if (syncedUserId.current === user.id) return;

		const primaryEmail = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
		if (!primaryEmail) return;

		const username =
			user.username ??
			user.firstName ??
			primaryEmail.split("@")[0];

		void syncUser({
			clerkId: user.id,
			username,
			email: primaryEmail,
			avatarUrl: user.imageUrl,
		})
			.then(() => {
				syncedUserId.current = user.id;
			})
			.catch((error) => {
				console.error("Failed to sync signed-in user to Convex", error);
			});
	}, [isSignedIn, user, syncUser]);
}
