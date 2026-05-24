/* tslint:disable */
/* eslint-disable */
/**
 * This file is a placeholder. Payload regenerates it from `payload.config.ts`.
 *
 * To regenerate after editing collections, run:
 *
 *   pnpm --filter @repo/payload payload generate:types
 *
 * Or boot the dev server with `pnpm dev` — Payload regenerates on start.
 */

export interface Config {
  collections: {
    admins: Admin
    media: Media
    posts: Post
    users: User
  }
  globals: Record<string, never>
}

export interface Admin {
  id: string | number
  email?: string
  password?: string | null
  collection?: string
  createdAt?: string
  updatedAt?: string
}

export interface User {
  id: string
  email: string
  name?: string | null
  avatar?: (string | null) | Media
  betterAuthId?: string | null
  createdAt: string
  updatedAt: string
}

export interface Media {
  id: string
  alt?: string | null
  url?: string | null
  width?: number | null
  height?: number | null
  filename?: string | null
  mimeType?: string | null
  filesize?: number | null
  createdAt: string
  updatedAt: string
}

export interface Post {
  id: string
  title: string
  slug?: string | null
  description?: string | null
  coverImage?: (string | null) | Media
  author?: string | null
  authorUser?: (string | null) | User
  richTextBody?: unknown
  sections?:
    | Array<{
        heading: string
        body: string
        id?: string | null
      }>
    | null
  publishedAt?: string | null
  _status?: ("draft" | "published") | null
  meta?: {
    title?: string | null
    description?: string | null
    image?: (string | null) | Media
  } | null
  createdAt: string
  updatedAt: string
}

declare module "payload" {
  export interface GeneratedTypes extends Config {}
}
