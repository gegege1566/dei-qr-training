import fs from "node:fs";
import path from "node:path";

import { nanoid } from "nanoid";
import xlsx from "xlsx";

import { db } from "../src/lib/db/client";
import { questions } from "../src/lib/db/schema";

const DATA_DIR = path.resolve(process.cwd(), "data");
const EXCEL_PATH = path.join(DATA_DIR, "DEI_banners.xlsx");
const BANNER_DIR = path.resolve(process.cwd(), "public", "banners");

type RawRow = {
  [key: string]: unknown;
  "No."?: number;
  大分類?: string;
  中分類?: string;
  小分類?: string;
  "小分類の概要（DEI的問題点の解説）"?: string;
  "バナーのDEI的問題点の解説"?: string;
  ファイル名?: string;
};

const ensureDataDir = () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
};

const loadRows = () => {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`Excel file not found at ${EXCEL_PATH}`);
  }

  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error("Excel sheet is empty");
  }

  return xlsx.utils.sheet_to_json<RawRow>(sheet, { defval: "" });
};

const toRecord = (row: RawRow) => {
  const fileName = String(row["ファイル名"] ?? "").trim();
  if (!fileName) {
    return null;
  }

  const baseName = fileName.replace(path.extname(fileName), "");
  const webpName = `${baseName}.webp`;
  const imagePath = `/banners/${webpName}`;
  const diskImagePath = path.join(BANNER_DIR, webpName);

  if (!fs.existsSync(diskImagePath)) {
    console.warn(`⚠️  Missing banner asset for ${fileName} → ${diskImagePath}`);
  }

  return {
    id: nanoid(16),
    number: Number(row["No."] ?? 0),
    majorCategory: String(row["大分類"] ?? ""),
    mediumCategory: String(row["中分類"] ?? ""),
    minorCategory: String(row["小分類"] ?? ""),
    minorSummary: String(row["小分類の概要（DEI的問題点の解説）"] ?? "") || null,
    bannerInsight: String(row["バナーのDEI的問題点の解説"] ?? "") || null,
    fileName,
    imagePath,
    createdAt: Date.now(),
  } satisfies typeof questions.$inferInsert;
};

const main = async () => {
  ensureDataDir();
  const rows = loadRows();
  console.log(`Loaded ${rows.length} rows from Excel.`);

  const records = rows
    .map(toRecord)
    .filter((record): record is NonNullable<ReturnType<typeof toRecord>> => Boolean(record));

  await db.delete(questions);
  if (records.length) {
    await db.insert(questions).values(records);
  }

  console.log(`Imported ${records.length} question records.`);
};

main().catch((error) => {
  console.error("Failed to seed questions", error);
  process.exitCode = 1;
});
