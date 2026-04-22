import { Container } from "lucide-react";
import * as XLSX from "xlsx";

export interface ParsedRow {
  [key: string]: string | number | null | undefined;
}

export interface ParsedFileResult {
  rows: ParsedRow[];
  headers: string[];
  hasContainerInfo: boolean;
  hasSealInfo: boolean;
  rowsWithContainers: number;
  fileType: "po" | "mt" | "excel" | "csv";
}

// Exact headers from your CSV/Excel file (in correct order)
const ORDERED_EXPORT_HEADERS = [
  "Season",
  "Location Code",
  "Organization",
  "Date Dispatched",
  "Container No",
  "Seal Number",
  "Barcode",
  "Barcode",                    
  "No Cartons",
  "Gross",
  "Nett",
  "Commodity Code",
  "Variety Code",
  "Grade Code",
  "Pack Code",
  "Count Code",
  "Mark Code",
  "Target Market",
  "Country",
  "Farm No.",
  "PHC",
  "Orchard",
  "Inspection Date",
  "Insp. Point",
  "Insp. Code",
  "Original Intake Date",
  "Consignment Note No.",
  "Temptale",
  "Inventory Code",
  "Phyto Data",
  "UPN",
  "Consec no",
  "Target Country",
  "Production Area",
];

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
    const fileType = detectFileType(file.name);

    reader.onload = (e) => {
      try {
        if (fileType === "po" || fileType === "csv" || fileType === "mt") {
          // Parse as text file
          const text = e.target!.result as string;
          const delimiter = fileType === "po" ? "|" : ",";
          const lines = text.split('\n').map(l => l.trim()).filter(l => l);

          if (lines.length === 0) {
            resolve({
              rows: [],
              headers: [],
              hasContainerInfo: false,
              hasSealInfo: false,
              rowsWithContainers: 0,
              fileType,
            });
            return;
          }

          const headers = lines[0].split(delimiter).map(h => h.trim());
          const rows = lines.slice(1).map(line => {
            const values = line.split(delimiter).map(v => v.trim());
            const row: ParsedRow = {};
            headers.forEach((h, i) => {
              row[h] = values[i] || null;
            });
            return row;
          });

          const containerCol = headers.find((h) => matchesColumn(h, CONTAINER_PATTERNS));
          const sealCol = headers.find((h) => matchesColumn(h, SEAL_PATTERNS));
          const rowsWithContainers = containerCol
            ? rows.filter((row) => row[containerCol] && String(row[containerCol]).trim()).length
            : 0;

          resolve({
            rows,
            headers,
            hasContainerInfo: !!containerCol && rowsWithContainers > 0,
            hasSealInfo: !!sealCol && rows.some((r) => r[sealCol] && String(r[sealCol]).trim()),
            rowsWithContainers,
            fileType,
          });
        } else {
          // Parse as Excel file
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, { defval: null });

          if (jsonData.length === 0) {
            resolve({
              rows: [],
              headers: [],
              hasContainerInfo: false,
              hasSealInfo: false,
              rowsWithContainers: 0,
              fileType,
            });
            return;
          }

          const headers = Object.keys(jsonData[0]);

          const containerCol = headers.find((h) => matchesColumn(h, CONTAINER_PATTERNS));
          const sealCol = headers.find((h) => matchesColumn(h, SEAL_PATTERNS));
          const rowsWithContainers = containerCol
            ? jsonData.filter((row) => row[containerCol] && String(row[containerCol]).trim()).length
            : 0;

          resolve({
            rows: jsonData,
            headers,
            hasContainerInfo: !!containerCol && rowsWithContainers > 0,
            hasSealInfo: !!sealCol && jsonData.some((r) => r[sealCol] && String(r[sealCol]).trim()),
            rowsWithContainers,
            fileType,
          });
        }
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(reader.error);

    if (fileType === "po" || fileType === "csv" || fileType === "mt") {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
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

  // Default: equal split
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

  while (result.length < n) result.push([]);
  return result.slice(0, n);
}

// ==================== EXPORT FUNCTIONS ====================

export function rowsToWorkbook(rows: ParsedRow[], sheetName = "Data"): XLSX.WorkBook {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

export function downloadWorkbook(wb: XLSX.WorkBook, fileName: string) {
  XLSX.writeFile(wb, fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`);
}

export function downloadCSV(rows: ParsedRow[], fileName: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName.endsWith('.csv') ? fileName : `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Exports rows to CSV using the EXACT header order from your file
 */
export function rowsToCsv(rows: ParsedRow[]): string {
  if (rows.length === 0) return "";

  const lines: string[] = [ORDERED_EXPORT_HEADERS.join(",")];

  for (const row of rows) {
    const values = ORDERED_EXPORT_HEADERS.map((header) => {
      const value = row[header] ?? "";

      // Proper CSV escaping
      if (typeof value === "string") {
        if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }

      return String(value);
    });

    lines.push(values.join(","));
  }

  return lines.join("\n");
}