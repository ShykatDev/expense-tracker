"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"
import { cn } from "cn"

function Progress({
  className,
  value,
  min = 0,
  max = 100,
  ...props
}: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn("w-full", className)}
      value={value}
      min={min}
      max={max}
      {...props}
    />
  )
}

function ProgressTrack({
  className,
  ...props
}: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      data-slot="progress-track"
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-white/10",
        className,
      )}
      {...props}
    />
  )
}

function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn(
        "h-full rounded-full bg-foreground transition-[width] duration-500",
        className,
      )}
      {...props}
    />
  )
}

export { Progress, ProgressIndicator, ProgressTrack }
