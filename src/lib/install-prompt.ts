"use client";

import * as React from "react";

/**
 * Chrome on Android (and desktop Chromium) fires `beforeinstallprompt` once,
 * early in the page load, when the app can be installed. Keeping the event
 * lets the install guide offer a real one-tap "Install" button later, long
 * after the event fired. Safari never fires it: iOS installs only through the
 * Share sheet, which is why the guide explains the steps instead.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

let listening = false;

/** Starts capturing the install prompt. Safe to call more than once. */
export function captureInstallPrompt() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    // Stop Chrome's own mini-infobar; the guide offers the install instead.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

/** Mounted once in the root layout so the prompt is caught on any page. */
export function InstallPromptCapture() {
  React.useEffect(() => {
    captureInstallPrompt();
  }, []);
  return null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether Chrome is offering a direct install right now. */
export function useCanPromptInstall() {
  return React.useSyncExternalStore(
    subscribe,
    () => deferred !== null,
    () => false,
  );
}

/** Shows the browser's install dialog. Resolves true when the user accepts. */
export async function promptInstall() {
  const event = deferred;
  if (!event) return false;
  await event.prompt();
  const { outcome } = await event.userChoice;
  // The event can only be used once.
  deferred = null;
  notify();
  return outcome === "accepted";
}

/** True when the page is running as the installed app, not in a browser tab. */
export function isRunningInstalled() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // iOS Safari's own flag for home-screen web apps.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export type InstallPlatform = "ios" | "android";

/** A best guess at the device, to open the guide on the right tab. */
export function detectInstallPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "ios";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  // iPadOS reports itself as a Mac; touch support gives it away.
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  return "ios";
}
