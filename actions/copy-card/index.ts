"use server";

import { createSafeAction } from "@/lib/create-safe-action";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { CopyCard } from "./schema";
import { InputType, ReturnType } from "./type";

const handler = async (data: InputType): Promise<ReturnType> => {
  const { userId, orgId } = auth();

  if (!userId || !orgId) {
    return {
      error: "User not authenticated",
    };
  }

  const { id, boardId } = data;

  let card;

  try {
    const cardCopy = await db.card.findUnique({
      where: {
        id,
        list: {
          board: {
            orgId,
          },
        },
      },
    });

    if (!cardCopy) {
      return {
        error: "Card not found !",
      };
    }

    const lastCard = await db.card.findFirst({
      where: {
        listId: cardCopy.listId,
      },
      orderBy: {
        order: "desc",
      },
      select: {
        order: true,
      },
    });

    const newOrder = lastCard ? lastCard.order + 1 : 1;

    card = await db.card.create({
      data: {
        title: `${cardCopy.title} - Copy`,
        description: cardCopy.description,
        order: newOrder,
        listId: cardCopy.listId,
      },
    });
  } catch (error) {
    return {
      error: "Failed to copy card",
    };
  }

  revalidatePath(`/board/${boardId}`);
  return { data: card };
};

export const copyCard = createSafeAction(CopyCard, handler);
