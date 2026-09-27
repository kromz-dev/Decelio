import * as React from "react"
import { cn } from "cn"

/**
 * Verdict : l'état de lisibilité d'un site pour un assistant IA.
 *
 * Quatre valeurs, chacune portée par trois signaux redondants — une forme,
 * un mot et une couleur — pour rester lisible sans la couleur (daltonisme,
 * impression noir et blanc, rapport PDF) :
 *
 *   lu       cercle plein + coche       vert
 *   refuse   octogone plein + croix     rouge
 *   vide     anneau en pointillés       ambre
 *   inconnu  anneau + point d'interrogation   gris
 *
 * `variant="stamp"` : puce à fond doux (en-têtes, alertes, rapport).
 * `variant="inline"` : glyphe + mot sans fond (cellules de tableau).
 * `variant="glyph"` : glyphe seul avec libellé pour lecteur d'écran (colonnes étroites).
 */
export type VerdictValue = "lu" | "refuse" | "vide" | "inconnu"

export const VERDICTS: Record<
  VerdictValue,
  { label: string; description: string; tone: "ok" | "stop" | "warn" | "unknown" }
> = {
  lu: {
    label: "Lu",
    description: "L'assistant lit le contenu de la page.",
    tone: "ok",
  },
  refuse: {
    label: "Refusé",
    description: "L'assistant est bloqué : robots.txt, pare-feu ou code HTTP d'erreur.",
    tone: "stop",
  },
  vide: {
    label: "Vide",
    description: "La page répond mais ne livre pas assez de texte utile.",
    tone: "warn",
  },
  inconnu: {
    label: "Inconnu",
    description: "Pas encore vérifié, ou impossible de conclure : à vérifier.",
    tone: "unknown",
  },
}

/** Traduit les statuts historiques du moteur (OK, BLOQUÉ, COQUILLE VIDE, ACTIVE…) en verdict. */
export function verdictFromStatus(status: string | null | undefined): VerdictValue {
  const s = (status ?? "").trim().toUpperCase()
  if (["OK", "ACTIVE", "LU", "READABLE", "200"].includes(s)) return "lu"
  if (["BLOQUÉ", "BLOQUE", "BLOCKED", "REFUSÉ", "REFUSE", "403", "401", "429"].includes(s)) return "refuse"
  if (["COQUILLE VIDE", "VIDE", "EMPTY", "THIN"].includes(s)) return "vide"
  // « À VÉRIFIER » (blocage général sans preuve de ciblage) reste « Inconnu », jamais « Refusé ».
  return "inconnu"
}

const toneText: Record<VerdictValue, string> = {
  lu: "text-ok",
  refuse: "text-stop",
  vide: "text-warn",
  inconnu: "text-unknown",
}

const toneStamp: Record<VerdictValue, string> = {
  lu: "bg-ok-soft text-ok border-ok/20",
  refuse: "bg-stop-soft text-stop border-stop/20",
  vide: "bg-warn-soft text-warn border-warn/20",
  inconnu: "bg-unknown-soft text-unknown border-unknown/20",
}

const glyphSize = { sm: 14, md: 16, lg: 20 } as const

export function VerdictGlyph({
  value,
  size = "md",
  className,
}: {
  value: VerdictValue
  size?: keyof typeof glyphSize
  className?: string
}) {
  const px = glyphSize[size]
  const common = {
    width: px,
    height: px,
    viewBox: "0 0 16 16",
    "aria-hidden": true as const,
    focusable: false as const,
    className: cn("shrink-0", toneText[value], className),
  }
  switch (value) {
    case "lu":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path
            d="M4.8 8.3l2.1 2.1 4.3-4.6"
            fill="none"
            stroke="var(--paper)"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case "refuse":
      return (
        <svg {...common}>
          <path d="M5.1 1h5.8L15 5.1v5.8L10.9 15H5.1L1 10.9V5.1z" fill="currentColor" />
          <path
            d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8"
            stroke="var(--paper)"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      )
    case "vide":
      return (
        <svg {...common}>
          <circle
            cx="8"
            cy="8"
            r="6.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeDasharray="2.6 2.3"
            strokeLinecap="round"
          />
        </svg>
      )
    case "inconnu":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <path
            d="M6.1 6.5a1.9 1.9 0 1 1 2.8 1.7c-.6.3-.9.7-.9 1.3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <circle cx="8" cy="11.6" r="1" fill="currentColor" />
        </svg>
      )
  }
}

export type VerdictProps = React.ComponentProps<"span"> & {
  value: VerdictValue
  variant?: "stamp" | "inline" | "glyph"
  size?: "sm" | "md" | "lg"
  /** Précision courte affichée après le mot : "403", "148 car.", "robots.txt". */
  detail?: React.ReactNode
}

export function Verdict({
  value,
  variant = "stamp",
  size = "md",
  detail,
  className,
  ...props
}: VerdictProps) {
  const { label } = VERDICTS[value]

  if (variant === "glyph") {
    return (
      <span
        data-slot="verdict"
        data-verdict={value}
        title={label}
        className={cn("inline-flex items-center justify-center", className)}
        {...props}
      >
        <VerdictGlyph value={value} size={size} />
        <span className="sr-only">{label}</span>
      </span>
    )
  }

  const text =
    size === "sm" ? "type-caption" : size === "lg" ? "text-[15px] leading-5" : "type-table"

  if (variant === "inline") {
    return (
      <span
        data-slot="verdict"
        data-verdict={value}
        className={cn("inline-flex items-center gap-1.5 font-medium", text, toneText[value], className)}
        {...props}
      >
        <VerdictGlyph value={value} size={size} />
        <span>{label}</span>
        {detail != null && (
          <span className="font-normal text-ink-2 tnum">{detail}</span>
        )}
      </span>
    )
  }

  return (
    <span
      data-slot="verdict"
      data-verdict={value}
      className={cn(
        "inline-flex w-fit items-center rounded-xs border font-semibold whitespace-nowrap",
        size === "sm" ? "h-5 gap-1 px-1.5" : size === "lg" ? "h-8 gap-2 px-2.5" : "h-6 gap-1.5 px-2",
        text,
        toneStamp[value],
        className
      )}
      {...props}
    >
      <VerdictGlyph value={value} size={size} />
      <span>{label}</span>
      {detail != null && (
        <span className="font-normal tnum">{detail}</span>
      )}
    </span>
  )
}
