"use server"

import { signOutAction } from "./sign-out"

export const headerSignOutAction = async (): Promise<void> => {
  await signOutAction()
}
