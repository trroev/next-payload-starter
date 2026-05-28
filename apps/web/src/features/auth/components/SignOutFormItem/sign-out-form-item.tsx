"use client"

import { cn } from "@repo/ui/utils/cn"
import { useTransition } from "react"
import { signOutAction } from "../../actions/sign-out"

const buttonClass = cn(
  "text-left text-heading-md text-text-primary hover:text-text-secondary"
)

export const SignOutFormItem = () => {
  const [isPending, startTransition] = useTransition()

  const handleSignOut = (): void => {
    startTransition(async () => {
      await signOutAction()
    })
  }

  return (
    <button
      className={buttonClass}
      disabled={isPending}
      onClick={handleSignOut}
      type="button"
    >
      {isPending ? "Signing out…" : "Sign out"}
    </button>
  )
}
