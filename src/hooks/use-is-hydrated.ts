import { useEffect, useState } from "react";

/**
 * Returns true after the component has hydrated on the client.
 *
 * Use this to disable interactive elements until React hydration is complete,
 * preventing race conditions where clicks occur before event handlers are attached.
 *
 * @example
 * const isHydrated = useIsHydrated();
 * return <Button disabled={!isHydrated}>Click me</Button>;
 */
export function useIsHydrated(): boolean {
	const [isHydrated, setIsHydrated] = useState(false);

	useEffect(() => {
		setIsHydrated(true);
	}, []);

	return isHydrated;
}
