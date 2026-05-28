export type SignedInAuth = {
  status: "signed-in"
  displayName: string
  initials: string
  avatarUrl: string | null
}

export type HeaderAuth = SignedInAuth | { status: "anonymous" }
