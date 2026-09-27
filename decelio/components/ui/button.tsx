import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * Bouton du système Decelio.
 * - `default` : encre pleine, une seule par écran (action principale).
 * - `outline` : action secondaire, même poids visuel que le texte.
 * - `secondary` : fond discret pour les actions de groupe (filtres, exports).
 * - `ghost` : actions de ligne dans les tableaux.
 * - `destructive` : suppression confirmée uniquement.
 * - `link` : navigation dans une phrase.
 * Le libellé est un verbe ("Ajouter un site"), sans flèche ni icône décorative.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent text-sm font-medium whitespace-nowrap select-none outline-none transition-[background-color,border-color,color,box-shadow,opacity] duration-(--duration-1) ease-(--ease-brand) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-stop [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-ink/88 active:bg-ink/80 aria-expanded:bg-ink/88",
        outline:
          "border-line bg-surface text-ink-2 hover:text-ink hover:bg-surface-2 active:bg-line/60 aria-expanded:bg-surface-2 shadow-sm",
        secondary:
          "bg-surface-2 text-ink hover:bg-line/70 active:bg-line aria-expanded:bg-line/70",
        ghost:
          "text-ink hover:bg-surface-2 active:bg-line/60 aria-expanded:bg-surface-2",
        destructive:
          "bg-stop text-white hover:bg-stop/90 active:bg-stop/80 focus-visible:outline-stop",
        link:
          "h-auto rounded-none border-0 p-0 text-cobalt underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        sm: "h-8 gap-1.5 px-3 text-[13px]/[18px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 px-5 text-[15px] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xl: "h-12 px-6 text-base has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-9",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
