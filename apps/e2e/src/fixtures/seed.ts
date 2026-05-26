import { getPayload } from "payload"
import config from "../../payload-config"

export type SeededPost = {
  readonly id: string
  readonly title: string
  readonly slug: string
  readonly sectionHeading: string
  readonly sectionBody: string
}

export const seedPublishedPost = async (): Promise<SeededPost> => {
  const payload = await getPayload({ config })
  const title = "E2E published post"
  const slug = "e2e-published-post"
  const sectionHeading = "Section heading"
  const sectionBody = "Section body content for the E2E suite."
  const created = await payload.create({
    collection: "posts",
    data: {
      title,
      slug,
      description: "Seeded for the end-to-end suite.",
      sections: [{ heading: sectionHeading, body: sectionBody }],
      _status: "published",
    },
  })
  return {
    id: String(created.id),
    title,
    slug,
    sectionHeading,
    sectionBody,
  }
}
