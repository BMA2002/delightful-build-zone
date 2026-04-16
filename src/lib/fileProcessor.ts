import * as XLSX from "xlsx";

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface ParsedFileResult {
  rows: ParsedRow[];
  headers: string[];
  hasContainerInfo: boolean;
  hasSealInfo: boolean;
  rowsWithContainers: number;
  fileType: "po" | "mt" | "excel" | "csv";
}

const CONTAINER_PATTERNS = ["container_number", "container no", "container", "cont_no", "containernumber"];
const SEAL_PATTERNS = ["seal_number", "seal no", "seal", "sealnumber", "seal_no"];

function matchesColumn(header: string, patterns: string[]): boolean {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, "");
  return patterns.some((p) => h.includes(p.replace(/[^a-z0-9]/g, "")));
}

function detectFileType(fileName: string): "po" | "mt" | "excel" | "csv" {
  const ext = fileName.toLowerCase().split(".").pop() || "";
  if (ext === "po" || ext === "ez6") return "po";
  if (ext === "mt") return "mt";
  if (ext === "csv") return "csv";
  return "excel";
}

export function parseFile(file: File): Promise<ParsedFileResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, { defval: null });
        
        if (jsonData.length === 0) {
          resolve({ rows: [], headers: [], hasContainerInfo: false, hasSealInfo: false, rowsWithContainers: 0, fileType: detectFileType(file.name) });
          return;
        }

        const headers = Object.keys(jsonData[0]);
        const containerCol = headers.find((h) => matchesColumn(h, CONTAINER_PATTERNS));
        const sealCol = headers.find((h) => matchesColumn(h, SEAL_PATTERNS));

        let rowsWithContainers = 0;
        if (containerCol) {
          rowsWithContainers = jsonData.filter((row) => row[containerCol] && String(row[containerCol]).trim()).length;
        }

        resolve({
          rows: jsonData,
          headers,
          hasContainerInfo: !!containerCol && rowsWithContainers > 0,
          hasSealInfo: !!sealCol && jsonData.some((r) => r[sealCol] && String(r[sealCol]).trim()),
          rowsWithContainers,
          fileType: detectFileType(file.name),
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export function generateDummyContainer(prefix: string, dateStr: string, seq: number): string {
  return `${prefix}-${dateStr}-${String(seq).padStart(3, "0")}`;
}

export function generateDummySeal(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(3, "0")}`;
}

export function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

export function splitAllocation(
  rows: ParsedRow[],
  method: string,
  numSplits: number,
  headers: string[]
): ParsedRow[][] {
  if (numSplits <= 0 || rows.length === 0) return [rows];

  const palletCol = headers.find((h) => h.toLowerCase().includes("pallet"));
  const cartonCol = headers.find((h) => h.toLowerCase().includes("carton"));

  if (method === "by_pallets" && palletCol) {
    return splitByNumericColumn(rows, palletCol, numSplits);
  }
  if (method === "by_cartons" && cartonCol) {
    return splitByNumericColumn(rows, cartonCol, numSplits);
  }
  // Default: equal distribution
  return equalSplit(rows, numSplits);
}

function equalSplit(rows: ParsedRow[], n: number): ParsedRow[][] {
  const result: ParsedRow[][] = Array.from({ length: n }, () => []);
  rows.forEach((row, i) => result[i % n].push(row));
  return result;
}

function splitByNumericColumn(rows: ParsedRow[], col: string, n: number): ParsedRow[][] {
  const totalVal = rows.reduce((sum, r) => sum + (Number(r[col]) || 0), 0);
  const targetPerSplit = totalVal / n;
  const result: ParsedRow[][] = [[]];
  let currentSum = 0;

  for (const row of rows) {
    const val = Number(row[col]) || 0;
    if (result.length < n && currentSum + val > targetPerSplit * 1.1 && result[result.length - 1].length > 0) {
      result.push([]);
      currentSum = 0;
    }
    result[result.length - 1].push(row);
    currentSum += val;
  }

  // Ensure we have exactly n groups
  while (result.length < n) result.push([]);
  return result.slice(0, n);
}

export function rowsToWorkbook(rows: ParsedRow[], sheetName = "Data"): XLSX.WorkBook {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

export function downloadWorkbook(wb: XLSX.WorkBook, fileName: string) {
  XLSX.writeFile(wb, fileName);
}

export function rowsToCsv(rows: ParsedRow[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}
