"use client"

import { Menu } from "@repo/ui/components/Menu"
import { useTransition } from "react"
import { signOutAction } from "../../actions/sign-out"

export const SignOutMenuItem = () => {
  const [isPending, startTransition] = useTransition()

  const handleSignOut = (): void => {
    startTransition(async () => {
      await signOutAction()
    })
  }

  return (
    <Menu.Item
      disabled={isPending}
      onClick={handleSignOut}
      variant="destructive"
    >
      {isPending ? "Signing out…" : "Sign out"}
    </Menu.Item>
  )
}
