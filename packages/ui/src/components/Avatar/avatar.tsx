"use client"

import { Avatar as BaseAvatar } from "@base-ui/react/avatar"
import { cn } from "@repo/ui/utils/cn"
import {
  AVATAR_PX,
  type AvatarSize,
  type AvatarVariants,
  avatar,
} from "./avatar.variants"

const CLOUDINARY_UPLOAD_RE = /\/image\/upload\//

const buildCloudinarySrc = (url: string, px: number): string =>
  CLOUDINARY_UPLOAD_RE.test(url)
    ? url.replace(
        CLOUDINARY_UPLOAD_RE,
        `/image/upload/c_thumb,g_face,w_${px},h_${px},f_auto,q_auto/`
      )
    : url

export type AvatarProps = React.ComponentProps<typeof BaseAvatar.Root> &
  AvatarVariants & {
    src?: string | null
    alt?: string
    initials: string
  }

export const Avatar = ({
  className,
  size,
  shape,
  src,
  alt = "",
  initials,
  ...props
}: AvatarProps) => {
  const resolvedSize: AvatarSize = size ?? "md"
  const px = AVATAR_PX[resolvedSize]
  const src1x = src ? buildCloudinarySrc(src, px) : null
  const src2x = src ? buildCloudinarySrc(src, px * 2) : null

  return (
    <BaseAvatar.Root
      className={cn(avatar({ size, shape }), className)}
      {...props}
    >
      {src1x && (
        <BaseAvatar.Image
          alt={alt}
          className="size-full object-cover"
          src={src1x}
          {...(src2x ? { srcSet: `${src1x} 1x, ${src2x} 2x` } : {})}
        />
      )}
      <BaseAvatar.Fallback
        aria-hidden="true"
        className="flex size-full items-center justify-center"
      >
        {initials}
      </BaseAvatar.Fallback>
    </BaseAvatar.Root>
  )
}
