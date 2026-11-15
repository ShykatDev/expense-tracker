"use client";

import {
  CheckCircle2,
  Compass,
  Download,
  EllipsisVertical,
  type LucideIcon,
  MonitorSmartphone,
  Share,
  SquarePlus,
} from "lucide-react";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { SheetToggle } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  detectInstallPlatform,
  isRunningInstalled,
  promptInstall,
  useCanPromptInstall,
  type InstallPlatform,
} from "@/lib/install-prompt";
import { cn } from "@/lib/utils";

const PLATFORM_OPTIONS: { value: InstallPlatform; label: string }[] = [
  { value: "ios", label: "iPhone" },
  { value: "android", label: "Android" },
];

interface GuideStep {
  icon: LucideIcon;
  title: React.ReactNode;
  detail?: string;
}

const IOS_STEPS: GuideStep[] = [
  {
    icon: Compass,
    title: "Open this app in Safari",
    detail: "Chrome on iPhone works too, through its Share button.",
  },
  {
    icon: Share,
    title: (
      <>
        Tap <Strong>Share</Strong>
      </>
    ),
    detail: "The square with an arrow, in the toolbar. On newer iOS it may be under ⋯ first.",
  },
  {
    icon: SquarePlus,
    title: (
      <>
        Tap <Strong>Add to Home Screen</Strong>
      </>
    ),
    detail: "Scroll down the list if you don't see it.",
  },
  {
    icon: CheckCircle2,
    title: (
      <>
        Tap <Strong>Add</Strong>
      </>
    ),
    detail: "Pulse appears on your home screen and opens full screen.",
  },
];

const ANDROID_STEPS: GuideStep[] = [
  {
    icon: Compass,
    title: "Open this app in Chrome",
  },
  {
    icon: EllipsisVertical,
    title: (
      <>
        Tap the <Strong>⋮</Strong> menu
      </>
    ),
    detail: "Top right, next to the address bar.",
  },
  {
    icon: Download,
    title: (
      <>
        Tap <Strong>Install app</Strong> or <Strong>Add to Home screen</Strong>
      </>
    ),
  },
  {
    icon: CheckCircle2,
    title: (
      <>
        Tap <Strong>Install</Strong>
      </>
    ),
    detail: "Pulse appears in your app drawer and on the home screen.",
  },
];

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-white">{children}</span>;
}

/**
 * How to install Pulse as an app, with iPhone and Android tabs. It opens on
 * the tab for the current device. Where Chrome offers it, a one-tap
 * "Install" button skips the manual steps; Safari has no such API, so iPhone
 * always follows the Share-sheet steps.
 */
export function InstallGuideDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Read once when the dialog mounts (it only renders on the client).
  const [platform, setPlatform] = React.useState<InstallPlatform>(detectInstallPlatform);
  const [installed] = React.useState(isRunningInstalled);
  const canPrompt = useCanPromptInstall();

  const steps = platform === "ios" ? IOS_STEPS : ANDROID_STEPS;

  async function handleInstall() {
    const accepted = await promptInstall();
    if (accepted) {
      toast.success("Pulse is installing");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Install Pulse</DialogTitle>
          <DialogDescription>
            Add it to your home screen. It opens full screen like a normal app, without the
            browser bars.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4">
          {installed && (
            <p className="flex items-center gap-2 rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200 ring-1 ring-emerald-400/20">
              <CheckCircle2 className="size-4 shrink-0" />
              You&rsquo;re already using the installed app.
            </p>
          )}

          <div className="flex justify-center">
            <SheetToggle
              label="Device"
              value={platform}
              options={PLATFORM_OPTIONS}
              onChange={setPlatform}
            />
          </div>

          {/* Chrome can install directly — no steps needed. */}
          {platform === "android" && canPrompt && !installed && (
            <div className="flex flex-col items-center gap-2 rounded-3xl bg-[#a9c4ff]/10 px-4 py-4 text-center ring-1 ring-[#a9c4ff]/20">
              <MonitorSmartphone className="size-5 text-[#c7d8ff]" />
              <p className="text-sm text-white/85">Your browser can install it in one tap.</p>
              <Button size="lg" className="mt-1 w-full" onClick={handleInstall}>
                <Download className="size-4" />
                Install
              </Button>
              <p className="text-[11px] text-white/45">Or follow the steps below.</p>
            </div>
          )}

          <ol className="flex flex-col gap-1 rounded-3xl bg-white/6 p-2">
            {steps.map((step, index) => (
              <li key={index} className="flex items-start gap-3 rounded-2xl px-2 py-2.5">
                <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/85">
                  <step.icon className="size-[18px]" />
                  <span className="absolute -top-1 -left-1 flex size-5 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-black tabular-nums ring-2 ring-[#141518]">
                    {index + 1}
                  </span>
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className="block text-sm text-white/85">{step.title}</span>
                  {step.detail && (
                    <span className="mt-0.5 block text-xs leading-relaxed text-white/50">
                      {step.detail}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>

          <p className={cn("px-1 text-[11px] leading-relaxed text-white/40")}>
            Your data stays on this device either way. The installed app and the browser tab
            keep separate copies on iPhone, so add your entries in the one you&rsquo;ll keep
            using.
          </p>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" size="lg" />}>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
