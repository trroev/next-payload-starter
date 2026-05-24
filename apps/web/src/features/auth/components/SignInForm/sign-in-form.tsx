"use client"

import { authClient } from "@repo/auth/client"
import { Button } from "@repo/ui/components/Button"
import { Field } from "@repo/ui/components/Field"
import { Input } from "@repo/ui/components/Input"
import { useForm } from "@tanstack/react-form"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { match } from "ts-pattern"
import { z } from "zod"

const signInSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
})

const isSafeCallbackUrl = (value: string | null): value is string =>
  value?.startsWith("/") === true && !value.startsWith("//")

const friendlySignInError = (code?: string, message?: string): string =>
  match(code)
    .with(
      "INVALID_EMAIL_OR_PASSWORD",
      "INVALID_PASSWORD",
      () => "The email or password you entered is incorrect."
    )
    .with("USER_NOT_FOUND", () => "No account found for that email.")
    .with(
      "EMAIL_NOT_VERIFIED",
      () => "Please verify your email before signing in."
    )
    .otherwise(() => message ?? "Sign in failed. Please try again.")

export const SignInForm = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawCallback = searchParams.get("callbackUrl")
  const callbackUrl = isSafeCallbackUrl(rawCallback) ? rawCallback : "/"
  const [serverError, setServerError] = useState<string | undefined>()

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onChange: signInSchema },
    onSubmit: async ({ value }) => {
      setServerError(undefined)
      const { error } = await authClient.signIn.email(value)
      if (error) {
        setServerError(friendlySignInError(error.code, error.message))
        return
      }
      router.push(callbackUrl)
      router.refresh()
    },
  })

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <form.Field name="email">
        {(field) => (
          <Field
            error={
              field.state.meta.isTouched
                ? field.state.meta.errors[0]?.message
                : undefined
            }
            label="Email"
          >
            <Input
              autoComplete="email"
              id="email"
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              required
              type="email"
              value={field.state.value}
            />
          </Field>
        )}
      </form.Field>
      <form.Field name="password">
        {(field) => (
          <Field
            error={
              field.state.meta.isTouched
                ? field.state.meta.errors[0]?.message
                : undefined
            }
            label="Password"
          >
            <Input
              autoComplete="current-password"
              id="password"
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              required
              type="password"
              value={field.state.value}
            />
          </Field>
        )}
      </form.Field>
      {serverError && (
        <p
          aria-live="polite"
          className="font-sans text-body-sm text-destructive"
          role="alert"
        >
          {serverError}
        </p>
      )}
      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ canSubmit, isSubmitting }) => (
          <Button disabled={!canSubmit || isSubmitting} type="submit">
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
