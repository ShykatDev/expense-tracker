"use client";

import { toast, Toaster } from "@yusufceng1z/ding-react";
import * as React from "react";

/**
 * Ding's toaster, set up once for the whole app: dark, top-centre, with its
 * short sound cue for each toast type at half volume.
 *
 * Browsers only allow audio after the user has interacted with the page, so
 * the very first toast after a cold start may be silent; Ding handles that
 * quietly.
 */
export function AppToaster() {
  React.useEffect(() => {
    toast.configure({ sound: true, volume: 0.5 });
  }, []);

  return <Toaster theme="dark" position="top-center" />;
}
