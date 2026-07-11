import { describe, expect, it } from "vitest";
import {
  buildExcelBuffer,
  gridToRecords,
  parseNumber,
  parseYesNo,
  readExcelSheetGrid,
} from "@/lib/import/parse-excel";

describe("parse-excel helpers", () => {
  it("maps a grid to normalised header records", () => {
    const records = gridToRecords({
      headers: ["Country", "GRAA"],
      rows: [["South Africa", "Y"]],
    });
    expect(records[0]).toEqual({ country: "South Africa", graa: "Y" });
  });

  it("parses yes/no and currency-like numbers", () => {
    expect(parseYesNo("Yes")).toBe(true);
    expect(parseYesNo("N")).toBe(false);
    expect(parseNumber("R 24.06")).toBe(24.06);
    expect(parseNumber("")).toBeUndefined();
  });

  it("round-trips a sheet through exceljs in memory", async () => {
    const grid = {
      headers: ["Country", "Total Score"],
      rows: [["Kenya", "12"]],
    };
    const buffer = await buildExcelBuffer({ Territories: grid });
    const read = await readExcelSheetGrid(buffer, "Territories");
    expect(read.headers).toEqual(["Country", "Total Score"]);
    expect(read.rows[0]).toEqual(["Kenya", "12"]);
  });
});
