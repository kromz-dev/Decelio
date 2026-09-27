import { z } from "zod";

export const email = z.string().trim().toLowerCase().email("Adresse email invalide.").max(254);
export const password = z.string().min(12, "Le mot de passe doit contenir au moins 12 caractères.").max(128);

export const registerSchema = z.object({
  email,
  password,
  name: z.string().trim().min(1, "Le nom est requis.").max(100),
  acceptTerms: z
    .unknown()
    .superRefine((val, ctx) => {
      if (val !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Vous devez accepter les conditions générales de vente.",
        });
      }
    }),
});

export const loginSchema = z.object({ email, password });

export const passwordResetRequestSchema = z.object({ email });

export const passwordResetConfirmSchema = z.object({
  token: z.string().trim().min(1, "Jeton de réinitialisation invalide."),
  password,
});
