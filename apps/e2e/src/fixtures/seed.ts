import { getPayload } from "payload"
import config from "../../payload-config"

export type SeededPost = {
  readonly id: string
  readonly title: string
  readonly slug: string
  readonly sectionHeading: string
  readonly sectionBody: string
}

const lexicalParagraph = (text: string) => ({
  root: {
    type: "root",
    children: [
      {
        type: "paragraph",
        version: 1,
        direction: "ltr" as const,
        format: "" as const,
        indent: 0,
        textFormat: 0,
        textStyle: "",
        children: [
          {
            type: "text",
            version: 1,
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text,
          },
        ],
      },
    ],
    direction: "ltr" as const,
    format: "" as const,
    indent: 0,
    version: 1,
  },
})

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
      sections: [
        { heading: sectionHeading, body: lexicalParagraph(sectionBody) },
      ],
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
