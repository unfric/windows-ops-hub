import { api } from "@/services/api";

/** Column mapping: Excel header → DB field */
const FIELD_MAP: Record<string, string> = {
  // Sales / General
  "Order Type": "order_type",
  "Order Name": "order_name",
  "Order Owner": "dealer_name",
  "Quotation No": "quote_no",
  "SO No": "sales_order_no",
  "Colour Shade": "colour_shade",
  "Salesperson": "salesperson",
  "Product Type": "product_type",
  "No of Windows": "total_windows",
  "Sqft": "sqft",
  "Order Value": "order_value",
  "Receipt": "advance_received",
  "Commercial Status": "commercial_status",

  // Department Statuses
  "Survey Status": "survey_status",
  "Survey Done Win": "survey_done_windows",
  "Design Status": "design_status",
  "ATW Win": "design_released_windows",
  "Finance Status": "finance_status",
  "Hardware Avl": "hardware_availability",
  "Extrusion Avl": "extrusion_availability",
  "Glass Avl": "glass_availability",
  "Coated Extrusion Avl": "coated_extrusion_availability",
  "Hardware PO": "hardware_po_status",
  "Extrusion PO": "extrusion_po_status",
  "Glass PO": "glass_po_status",
  "Coating Status": "coating_status",
  "Prod Approval": "approval_for_production",
  "Disp Approval": "approval_for_dispatch",
  "Dispatch Status": "dispatch_status",
  "Installation Status": "installation_status",
  
  // Remarks
  "Finance Remarks": "finance_remarks",
  "Procurement Remarks": "procurement_remarks",
  "Store Remarks": "store_remarks",
  "Design Remarks": "design_remarks",
  "Survey Remarks": "survey_remarks",

  // Rework
  "Rework Issue": "rework_issue",
  "Rework Qty": "rework_qty",
};

const IMPORT_HEADERS = Object.keys(FIELD_MAP);

interface ImportResult {
  created: number;
  updated: number;
  errors: string[];
}

export async function importOrdersFromFile(file: File): Promise<ImportResult> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

  const result: ImportResult = { created: 0, updated: 0, errors: [] };

  // Fetch existing orders to check for duplicates
  let existingOrders: any[] = [];
  try {
    const data = await api.orders.list();
    existingOrders = data.orders || [];
  } catch (err) {
    console.error("Error fetching existing orders for import:", err);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const record: Record<string, any> = {};

    for (const [excelHeader, dbField] of Object.entries(FIELD_MAP)) {
      const val = row[excelHeader];
      if (val !== undefined && val !== null && val !== "") {
        if (["total_windows", "rework_qty"].includes(dbField)) {
          record[dbField] = Math.round(Number(val) || 0);
        } else if (["sqft", "order_value", "advance_received"].includes(dbField)) {
          record[dbField] = Number(val) || 0;
        } else {
          record[dbField] = String(val).trim();
        }
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
export async function exportOrdersToExcel(
  orders: Record<string, any>[],
  receiptMap: Record<string, number> = {},
  filename = "orders.xlsx"
) {
  const XLSX = await import("xlsx");
  const exportRows = orders.map((o) => {
    const receipt = receiptMap[o.id] ?? 0;
    const balance = (Number(o.order_value) || 0) - receipt;

    // Create an object with all fields from FIELD_MAP
    const row: Record<string, any> = {};
    for (const [header, field] of Object.entries(FIELD_MAP)) {
      row[header] = o[field] ?? "";
    }

    // Add calculated fields
    row["Receipt"] = receipt;
    row["Balance"] = balance;

    return row;
  });

  const headers = [...Object.keys(FIELD_MAP), "Balance"];

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
export async function exportDataToExcel(data: any[], headers: string[], filename: string) {
  const XLSX = await import("xlsx");
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
export async function downloadImportTemplate() {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet([], { header: IMPORT_HEADERS });
  ws["!cols"] = IMPORT_HEADERS.map((h) => ({ wch: h.length + 4 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  XLSX.writeFile(wb, "orders_import_template.xlsx");
}
