"use client"

import { authClient } from "@repo/auth/client"
import { Button } from "@repo/ui/components/Button"
import { useRouter } from "next/navigation"
import { useState } from "react"

export const SignOutButton = () => {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <Button disabled={isSigningOut} onClick={handleSignOut} variant="secondary">
      {isSigningOut ? "Signing out…" : "Sign out"}
    </Button>
  )
}
