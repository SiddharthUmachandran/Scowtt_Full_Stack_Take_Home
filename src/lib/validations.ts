import { z } from "zod";

export const MovieSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(100, "Title must be under 100 characters"),
});

export type MovieInput = z.infer<typeof MovieSchema>;