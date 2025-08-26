import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const codeVariants = cva(
  "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm",
  {
    variants: {
      variant: {
        default: "",
        secondary: "bg-secondary text-secondary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Code({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"code"> &
  VariantProps<typeof codeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "code"

  return (
    <Comp
      data-slot="code"
      className={cn(codeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Code, codeVariants }