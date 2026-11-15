import { createElement } from "react";

import { getAccountIcon, getAccountProvider, type Account, type AccountProvider } from "@/lib/accounts";
import { cn } from "@/lib/utils";

/**
 * A provider's real logo in a round tile. App-icon logos fill the circle;
 * wordmarks (cards, some banks) sit contained on white so they stay legible
 * on both the dark app and the light entry screen.
 */
export function ProviderLogo({
  provider,
  className,
}: {
  provider: AccountProvider;
  className?: string;
}) {
  if (provider.fit === "contain") {
    // The inset comes from the image's own size, not padding: percentage
    // padding is measured against the parent's width, not this tile's.
    return (
      <span
        className={cn("flex shrink-0 items-center justify-center rounded-full bg-white", className)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static logo */}
        <img src={provider.logo} alt="" draggable={false} className="size-[72%] object-contain" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static logo, no optimisation needed
    <img
      src={provider.logo}
      alt=""
      draggable={false}
      className={cn("shrink-0 rounded-full object-cover", className)}
    />
  );
}

/**
 * An account's logo when it's a known provider, otherwise the icon for its
 * kind. `className` sizes the logo; `iconClassName` sizes the fallback icon,
 * which usually sits smaller inside the caller's own tile.
 */
export function AccountIcon({
  account,
  className,
  iconClassName,
}: {
  account: Pick<Account, "id" | "name" | "kind" | "provider">;
  className?: string;
  iconClassName?: string;
}) {
  const provider = getAccountProvider(account);
  if (provider) return <ProviderLogo provider={provider} className={className} />;
  return createElement(getAccountIcon(account.kind), { className: iconClassName ?? className });
}

/** True when the account renders a logo rather than a plain icon. */
export function hasAccountLogo(account: Pick<Account, "id" | "name" | "provider">) {
  return Boolean(getAccountProvider(account));
}
