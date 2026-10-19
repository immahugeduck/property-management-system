import Image from "next/image"
import { cn } from "@/lib/utils"

interface BrandLogoProps {
  /** Height/size classes, e.g. "h-9". Width follows the logo's aspect ratio. */
  className?: string
  priority?: boolean
}

/**
 * Property HQ logo. The white-lettered version is the default (the app runs
 * in dark mode); the dark-lettered version swaps in automatically when the
 * page is in light mode.
 */
export function BrandLogo({ className, priority }: BrandLogoProps) {
  return (
    <>
      <Image
        src="/logo.png"
        alt="Property HQ"
        width={800}
        height={220}
        priority={priority}
        className={cn("hidden w-auto object-contain dark:block", className)}
      />
      <Image
        src="/logo-light.png"
        alt="Property HQ"
        width={800}
        height={221}
        priority={priority}
        className={cn("block w-auto object-contain dark:hidden", className)}
      />
    </>
  )
}
