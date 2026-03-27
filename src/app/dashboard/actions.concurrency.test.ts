import { describe, expect, it, vi } from "vitest";

// Mock the prisma client used by actions.tsx.
vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      movieFact: {
        findFirst: vi.fn(),
      },
      movieFactGenerationState: {
        findUnique: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
    },
  };
});

describe("Generation in-progress flag", () => {
  it("returns in_progress when a non-expired flag exists", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const flagExpiresAt = new Date(now.getTime() + 30_000);

    const actorUserId = "user-1";
    const movieTitle = "The Matrix";
    const generationStateWhere = { userId_movieTitle: { userId: actorUserId, movieTitle } } as const;

    const { prisma } = await import("@/lib/prisma");
    const findFirstMock = prisma.movieFact.findFirst as unknown as ReturnType<typeof vi.fn>;
    const findUniqueMock = prisma.movieFactGenerationState.findUnique as unknown as ReturnType<typeof vi.fn>;
    const createFlagMock = prisma.movieFactGenerationState.create as unknown as ReturnType<typeof vi.fn>;
    const updateManyMock = prisma.movieFactGenerationState.updateMany as unknown as ReturnType<typeof vi.fn>;

    findFirstMock.mockResolvedValue(null);
    findUniqueMock.mockResolvedValue({ expiresAt: flagExpiresAt });
    createFlagMock.mockResolvedValue(undefined);
    updateManyMock.mockResolvedValue({ count: 0 });

    const { decideGenerationPath } = await import("./actions");

    const decision = await decideGenerationPath({
      actorUserId,
      movieTitle,
      now,
      generationStateWhere,
    });

    expect(decision).toEqual({ mode: "in_progress", factText: null });

    // when flag is active, shouldn't start a new generation attempt.
    expect(createFlagMock).not.toHaveBeenCalled();
    expect(updateManyMock).not.toHaveBeenCalled();
  });
});

