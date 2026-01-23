import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { name, email, company, message } = await req.json();

    if (!name || !email || !company || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Create conversation and initial message in a transaction
    const conversation = await prisma.$transaction(async (tx) => {
      const conv = await tx.enterpriseConversation.create({
        data: {
          subject: `External Inquiry: ${company}`,
          contactName: name,
          contactEmail: email,
          companyName: company,
          source: "Landing Page",
          status: "OPEN",
          lastMessageAt: new Date(),
          messages: {
            create: {
              content: message,
              senderType: "EXTERNAL_VISITOR",
            },
          },
        },
      });

      return conv;
    });

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error("Error creating external enterprise inquiry:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }
}
