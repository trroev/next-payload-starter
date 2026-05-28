import type { HeaderAuth } from "@repo/types/HeaderAuth"
import Link from "next/link"
import type React from "react"
import { MobileAuth } from "../MobileAuth"
import { UserMenu } from "../UserMenu"
import { SiteFooter } from "./site-footer"
import { SiteHeader } from "./site-header.client"

export type AppShellProps = {
  auth: HeaderAuth
  desktopSignOutSlot: React.ReactNode
  mobileSignOutSlot: React.ReactNode
  children: React.ReactNode
}

export const AppShell = ({
  auth,
  desktopSignOutSlot,
  mobileSignOutSlot,
  children,
}: AppShellProps) => {
  const desktopAuth =
    auth.status === "signed-in" ? (
      <UserMenu auth={auth} signOutSlot={desktopSignOutSlot} />
    ) : (
      <Link
        className="text-body text-text-secondary hover:text-text-primary"
        href="/sign-in"
      >
        Sign in
      </Link>
    )

  return (
    <>
      <SiteHeader
        authSlot={desktopAuth}
        mobileAuthSlot={
          <MobileAuth auth={auth} signOutSlot={mobileSignOutSlot} />
        }
      />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  )
}
