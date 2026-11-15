"use client";

import { Cloud, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { GoogleLogo } from "@/components/auth/google-logo";
import { AppMark } from "@/components/brand/app-logo";
import { signIn } from "@/lib/auth-client";

/** Same deep-navy gradient as the app's hero, so sign-in feels like the app. */
const BACKGROUND =
  "radial-gradient(75% 55% at 88% 22%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 70%), radial-gradient(60% 45% at 0% 0%, rgba(96,165,250,0.10) 0%, rgba(96,165,250,0) 70%), linear-gradient(180deg, #0a1f52 0%, #08183d 30%, #050e24 60%, #020409 100%)";

const POINTS = [
  { icon: Smartphone, text: "Your phone and laptop stay in sync" },
  { icon: Cloud, text: "Nothing is lost if you clear the browser" },
  { icon: ShieldCheck, text: "Only you can see your data" },
];

/**
 * The only way in: Continue with Google. There is no email/password form.
 * Google sends the user back to /api/auth/callback/google, which sets the
 * session and lands them on the home page.
 */
export function SignInView() {
  const [pending, setPending] = React.useState(false);

  async function handleGoogle() {
    setPending(true);
    try {
      const result = await signIn.social({ provider: "google", callbackURL: "/" });
      // On success the browser is already navigating to Google.
      if (result?.error) throw new Error(result.error.message);
    } catch {
      toast.error("Couldn’t start Google sign-in. Try again.");
      setPending(false);
    }
  }

  return (
    <main
      className="reveal-target mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pt-[calc(env(safe-area-inset-top)+4rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)] md:my-6 md:min-h-[calc(100dvh-3rem)] md:rounded-[2rem] md:border md:border-white/10"
      style={{ background: BACKGROUND }}
    >
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="flex size-16 items-center justify-center rounded-3xl bg-white/10 ring-1 ring-white/15">
          <AppMark className="size-9 text-white" />
        </span>
        <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-white">Pulse</h1>
        <p className="mt-2 max-w-64 text-sm leading-relaxed text-white/60">
          Your income, spending and goals — at a glance.
        </p>

        <ul className="mt-10 flex w-full flex-col gap-2.5 text-left">
          {POINTS.map((point) => (
            <li
              key={point.text}
              className="flex items-center gap-3 rounded-2xl bg-white/6 px-4 py-3 ring-1 ring-white/8"
            >
              <point.icon className="size-4 shrink-0 text-[#b9d0ff]" />
              <span className="text-sm text-white/80">{point.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={handleGoogle}
          disabled={pending}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-full bg-white text-[15px] font-medium text-neutral-900 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] transition-[transform,opacity] active:scale-[0.98] disabled:opacity-70"
        >
          {pending ? (
            <Loader2 className="size-5 animate-spin text-neutral-500" />
          ) : (
            <GoogleLogo className="size-5" />
          )}
          {pending ? "Opening Google…" : "Continue with Google"}
        </button>
        <p className="text-center text-[11px] leading-relaxed text-white/40">
          Pulse only uses your name, email and photo from Google to identify you.
        </p>
      </div>
    </main>
  );
}
