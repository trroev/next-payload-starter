import path from "node:path"
import { fileURLToPath } from "node:url"
import { mongooseAdapter } from "@payloadcms/db-mongodb"
import { cloudStoragePlugin } from "@payloadcms/plugin-cloud-storage"
import { seoPlugin } from "@payloadcms/plugin-seo"
import { env as authEnv } from "@repo/env/auth"
import { env as cloudinaryEnv } from "@repo/env/cloudinary"
import { env as payloadEnv } from "@repo/env/payload"
import { cloudinaryAdapter } from "@repo/payload/adapters/cloudinary"
import { Admins } from "@repo/payload/collections/Admins"
import { Media } from "@repo/payload/collections/Media"
import { Posts } from "@repo/payload/collections/Posts"
import { Users } from "@repo/payload/collections/Users"
import type { Post } from "@repo/payload/payload-types"
import { buildConfig } from "payload"

const dirname = path.dirname(fileURLToPath(import.meta.url))

type CreatePayloadConfigOptions = {
  readonly baseDir: string
}

export function createPayloadConfig({ baseDir }: CreatePayloadConfigOptions) {
  return buildConfig({
    admin: {
      autoLogin:
        payloadEnv.PAYLOAD_ADMIN_EMAIL && payloadEnv.PAYLOAD_ADMIN_PASSWORD
          ? {
              email: payloadEnv.PAYLOAD_ADMIN_EMAIL,
              password: payloadEnv.PAYLOAD_ADMIN_PASSWORD,
              prefillOnly: payloadEnv.PAYLOAD_ADMIN_PREFILL_ONLY,
            }
          : undefined,
      avatar: "gravatar",
      importMap: {
        baseDir,
      },
      meta: {
        titleSuffix: " | Starter",
      },
      user: Admins.slug,
    },
    collections: [Admins, Media, Posts, Users],
    db: mongooseAdapter({
      url: authEnv.MONGODB_URI,
    }),
    plugins: [
      cloudStoragePlugin({
        collections: {
          media: {
            adapter: cloudinaryAdapter({
              config: {
                cloud_name: cloudinaryEnv.CLOUDINARY_CLOUD_NAME,
                api_key: cloudinaryEnv.CLOUDINARY_API_KEY,
                api_secret: cloudinaryEnv.CLOUDINARY_API_SECRET,
              },
              folder: "starter",
            }),
            disableLocalStorage: true,
            disablePayloadAccessControl: true,
          },
        },
      }),
      seoPlugin({
        collections: ["posts"],
        generateDescription: ({ doc }) =>
          (doc as Post).description?.slice(0, 160) ?? "",
        generateImage: ({ doc }) => {
          const coverImage = (doc as Post).coverImage
          return typeof coverImage === "object" && coverImage !== null
            ? coverImage.id
            : (coverImage ?? "")
        },
        generateTitle: ({ doc }) => (doc as Post).title,
        tabbedUI: true,
        uploadsCollection: "media",
      }),
    ],
    secret: payloadEnv.PAYLOAD_SECRET,
    typescript: {
      outputFile: path.resolve(dirname, "types", "payload-types.ts"),
    },
  })
}
