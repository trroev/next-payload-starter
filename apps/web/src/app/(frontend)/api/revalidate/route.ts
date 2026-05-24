import { env } from "@repo/env/app"
import { revalidatePath, revalidateTag } from "next/cache"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { match, P } from "ts-pattern"

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get("authorization")
  const body: unknown = await request.json().catch(() => null)

  return match({ auth, body })
    .when(
      ({ auth }) => auth !== `Bearer ${env.REVALIDATION_SECRET}`,
      () => NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    )
    .with({ body: { tag: P.string } }, ({ body: { tag } }) => {
      revalidateTag(tag, "default")
      if (tag === "homepage") {
        revalidatePath("/")
      }
      return NextResponse.json({ revalidated: true, tag })
    })
    .with({ body: { slug: P.string } }, ({ body: { slug } }) => {
      revalidatePath("/")
      revalidatePath("/posts")
      revalidatePath(`/posts/${slug}`)
      revalidateTag(`post:${slug}`, "default")
      return NextResponse.json({ revalidated: true, slug })
    })
    .otherwise(() =>
      NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    )
}
