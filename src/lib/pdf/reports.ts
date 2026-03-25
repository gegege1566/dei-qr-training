import jsPDF from "jspdf";

import type { Participant, Response } from "@/lib/db/schema";

export type ParticipantReportInput = {
  participant: Pick<Participant, "nickname" | "publicId" | "volumeLevel" | "createdAt">;
  responses: Array<
    Pick<Response, "order" | "answerText" | "totalScore" | "evaluationSummary"> & {
      questionNumber: number;
    }
  >;
};

export const buildParticipantReport = ({
  participant,
  responses,
}: ParticipantReportInput) => {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("DEI Training Report", 20, 20);
  doc.setFontSize(10);
  doc.text(
    `Nickname: ${participant.nickname} / ID: ${participant.publicId} / Volume: ${participant.volumeLevel}`,
    20,
    30,
  );

  let cursorY = 40;
  responses.forEach((response) => {
    if (cursorY > 270) {
      doc.addPage();
      cursorY = 20;
    }

    doc.setFontSize(11);
    doc.text(`Q${response.questionNumber} / Score ${response.totalScore}`, 20, cursorY);
    cursorY += 6;
    doc.setFontSize(10);
    doc.text(`Answer: ${response.answerText}`, 20, cursorY, { maxWidth: 170 });
    cursorY += 6;
    doc.text(
      `LLM Feedback: ${response.evaluationSummary ?? "(pending)"}`,
      20,
      cursorY,
      { maxWidth: 170 },
    );
    cursorY += 10;
  });

  return doc.output("arraybuffer");
};
