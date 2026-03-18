import * as XLSX from "xlsx";
import { api } from "@/services/api";

/** Column mapping: Excel header → DB field */
const FIELD_MAP: Record<string, string> = {
  // 1. Sales & Identity
  "Quotation No": "quote_no",
  "SO No": "sales_order_no",
  "Order Name": "order_name",
  "Type": "order_type",
  "Owner": "dealer_name",
  "Salesperson": "salesperson",
  "Shade": "colour_shade",
  "Product Type": "product_type",
  "Win": "total_windows",
  "Sqft": "sqft",
  "Order Date": "order_date",
  "TAT Date": "tat_date",
  "Target Delv": "target_delivery_date",
  "Disp Date": "dispatch_date",

  // 2. Commercials
  "Order Value": "order_value",
  "Receipt": "advance_received",
  // "Balance" is inserted here in export

  // 3. Governance
  "Commercial Status": "commercial_status",
  "Prod. Appr": "approval_for_production",
  "Disp. Appr": "approval_for_dispatch",

  // 4. Pre-Production
  "Survey": "survey_done_windows",
  "Survey Remarks": "survey_remarks",
  "Design": "design_released_windows",
  // "ATW" is inserted here in export
  "Design Remarks": "design_remarks",

  // 5. Store & Materials
  "Store H": "hardware_availability",
  "Store E": "extrusion_availability",
  "Store G": "glass_availability",
  "Store C": "coated_extrusion_availability",
  "Store Remarks": "store_remarks",

  // 6. Procurement & Supply
  "Hardware PO": "hardware_po_status",
  "Hardware Date": "hardware_delivery_date",
  "Extrusion PO": "extrusion_po_status",
  "Extrusion Date": "extrusion_delivery_date",
  "Glass PO": "glass_po_status",
  "Glass Date": "glass_delivery_date",
  "Coating PO": "coating_status",
  "Coating Date": "coating_delivery_date",
  "Procurement Remarks": "procurement_remarks",

  // 7. Execution (Import enabled)
  "Production": "windows_packed",
  "Dispatch": "windows_dispatched",
  "Install": "windows_installed",

  // 8. Maintenance / Issues
  "Finance Remarks": "finance_remarks",
  "Rework Qty": "rework_qty",
  "Rework Issue": "rework_issue",
};

const IMPORT_HEADERS = [
  "Order Name",
  "Owner",
  "Target Delv",
  "Quotation No",
  "SO No",
  "Type",
  "Salesperson",
  "Shade",
  "Product Type",
  "Win",
  "Sqft",
  "Order Value",
  "Receipt",
  "Commercial Status",
  "Order Date",
  "TAT Date",
  "Disp Date",
  "Prod. Appr",
  "Disp. Appr",
  "Survey",
  "Design",
  "Store H",
  "Store E",
  "Store G",
  "Store C",
  "Production",
  "Dispatch",
  "Install",
];

interface ImportResult {
  created: number;
  updated: number;
  errors: string[];
}

export async function importOrdersFromFile(
  file: File, 
  onProgress?: (current: number, total: number) => void
): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

  const result: ImportResult = { created: 0, updated: 0, errors: [] };

  // Fetch existing orders to check for duplicates and settings for defaults
  let existingOrders: any[] = [];
  let defaultTatDays = 30;
  try {
    const [ordersData, settingsData] = await Promise.all([
      api.orders.list(),
      api.settings.list()
    ]);
    existingOrders = ordersData.orders || [];
    const appSettings = settingsData.app_settings || [];
    const tatSetting = appSettings.find((s: any) => s.key === "default_tat_days");
    if (tatSetting) defaultTatDays = Number(tatSetting.value) || 30;
  } catch (err) {
    console.error("Error fetching dependencies for import:", err);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const record: Record<string, any> = {};

    for (const excelHeader of IMPORT_HEADERS) {
      const dbField = FIELD_MAP[excelHeader];
      if (!dbField) continue;
      
      const val = row[excelHeader];
      if (val !== undefined && val !== null && val !== "") {
        // Handle all window counts and rework as rounded integers
        if (["total_windows", "rework_qty", "survey_done_windows", "design_released_windows", "windows_packed", "windows_dispatched", "windows_installed"].includes(dbField)) {
          record[dbField] = Math.max(0, Math.round(Number(val) || 0));
        } else if (["sqft", "order_value", "advance_received"].includes(dbField)) {
          record[dbField] = Number(val) || 0;
        } else if (["order_date", "tat_date", "target_delivery_date", "dispatch_date", "hardware_delivery_date", "extrusion_delivery_date", "glass_delivery_date", "coating_delivery_date"].includes(dbField)) {
          // Attempt to handle Excel date objects or strings
          if (typeof val === "number") {
             const date = XLSX.SSF.parse_date_code(val);
             record[dbField] = new Date(date.y, date.m - 1, date.d).toISOString().split('T')[0];
          } else {
             const d = new Date(val);
             if (!isNaN(d.getTime())) record[dbField] = d.toISOString().split('T')[0];
             else record[dbField] = String(val).trim();
          }
        } else {
          record[dbField] = String(val).trim();
        }
      }
    }

    // Auto-calculate TAT if missing but order_date is imported (or use current date)
    if (!record.tat_date) {
      const baseDate = record.order_date ? new Date(record.order_date) : new Date();
      if (!isNaN(baseDate.getTime())) {
        const d = new Date(baseDate.getTime());
        d.setDate(d.getDate() + defaultTatDays);
        record.tat_date = d.toISOString().split('T')[0];
      }
    }
    if (!record.target_delivery_date && record.tat_date) {
      record.target_delivery_date = record.tat_date;
    }
    const storeToProcMap: Record<string, string> = {
      hardware_availability: "hardware_po_status",
      extrusion_availability: "extrusion_po_status",
      glass_availability: "glass_po_status",
      coated_extrusion_availability: "coating_status",
    };

    for (const [storeField, poField] of Object.entries(storeToProcMap)) {
      if (record[storeField] !== undefined) {
        record[poField] = record[storeField];
      }
    }

    // Validate advance doesn't exceed order value
    if (record.advance_received && record.order_value && record.advance_received > record.order_value) {
      result.errors.push(`Row ${i + 2}: Receipt exceeds Order Value`);
      continue;
    }

    if (!record.order_name && !record.quote_no) {
      result.errors.push(`Row ${i + 2}: Missing Order Name and Quotation No`);
      continue;
    }

    if (!record.product_type) {
      result.errors.push(`Row ${i + 2}: Product Type is required`);
      continue;
    }

    // Check if order exists by quote_no
    const existing = record.quote_no ? existingOrders.find(o => o.quote_no === record.quote_no) : null;

    if (onProgress) onProgress(i + 1, rows.length);

    try {
      if (existing) {
        await api.orders.update(existing.id, record);
        result.updated++;
      } else {
        // Create new
        if (!record.order_name) {
          result.errors.push(`Row ${i + 2}: Order Name is required for new orders`);
          continue;
        }
        if (!record.dealer_name) record.dealer_name = "";
        if (!record.order_type) record.order_type = "Retail";
        if (!record.order_date) record.order_date = new Date().toISOString().split('T')[0];
        if (!record.commercial_status) record.commercial_status = "Pipeline";

        await api.orders.create(record);
        result.created++;
      }
    } catch (err: any) {
      result.errors.push(`Row ${i + 2}: ${err.message || "Unknown error"}`);
    }
  }

  return result;
}

/** Comprehensive export for Global Order dashboard */
export function exportOrdersToExcel(
  orders: Record<string, any>[],
  receiptMap: Record<string, number> = {},
  packedMap: Record<string, number> = {},
  dispatchMap: Record<string, number> = {},
  installMap: Record<string, number> = {},
  filename = "orders.xlsx"
) {
  const exportRows = orders.map((o) => {
    const receipt = receiptMap[o.id] ?? 0;
    const packedCount = packedMap[o.id] ?? 0;
    const dispatched = dispatchMap[o.id] ?? 0;
    const installed = installMap[o.id] ?? 0;
    const balance = (Number(o.order_value) || 0) - receipt;

    // Create an object with all fields from FIELD_MAP
    const row: Record<string, any> = {};
    for (const [header, field] of Object.entries(FIELD_MAP)) {
      row[header] = o[field] ?? "";
    }

    // Add calculated fields & sync with screen
    row["Receipt"] = receipt;
    row["Production"] = packedCount;
    row["Dispatch"] = dispatched;
    row["Install"] = installed;
    row["ATW"] = o.design_released_windows || 0;
    row["Balance"] = balance;

    return row;
  });

  const headers = [
    "Order Name", "Owner", "Target Delv", "Quotation No", "SO No", "Type", "Salesperson", "Shade", "Product Type", "Win", "Sqft",
    "Order Value", "Receipt", "Balance", // Commercials grouped
    "Commercial Status", "Prod. Appr", "Disp. Appr", // Governance
    "Survey", "Survey Remarks", "Design", "ATW", "Design Remarks", // Pre-Production
    "Store H", "Store E", "Store G", "Store C", "Store Remarks", // Materials
    "Hardware PO", "Hardware Date", "Extrusion PO", "Extrusion Date", "Glass PO", "Glass Date", "Coating PO", "Coating Date", "Procurement Remarks", // Procurement
    "Production", "Dispatch", "Install", // Execution
    "Finance Remarks", "Rework Qty", "Rework Issue" // Maintenance
  ];

  const ws = XLSX.utils.json_to_sheet(exportRows, { header: headers });

  const colWidths = headers.map((h) => ({
    wch: Math.max(h.length, ...exportRows.map((r) => String(r[h] ?? "").length)),
  }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  XLSX.writeFile(wb, filename);
}

/** Generic export for module-specific dashboards */
export function exportDataToExcel(data: any[], headers: string[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data, { header: headers });

  // Auto-width
  const colWidths = headers.map((h) => ({
    wch: Math.max(h.length, ...data.map((r) => String(r[h] ?? "").length)),
  }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, filename);
}

/** Generate a blank template */
export function downloadImportTemplate() {
  const ws = XLSX.utils.json_to_sheet([], { header: IMPORT_HEADERS });
  ws["!cols"] = IMPORT_HEADERS.map((h) => ({ wch: h.length + 4 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  XLSX.writeFile(wb, "orders_import_template.xlsx");
}
