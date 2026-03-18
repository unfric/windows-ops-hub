import { verifyUser, getSupabaseAdmin } from "../_shared/auth.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Handles all order-related operations.
 */
// @ts-ignore
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await verifyUser(req);
    if ("error" in authResult) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { supabase } = authResult;

    const { action, ...payload } = await req.json();
    const supabaseAdmin = getSupabaseAdmin();

    switch (action) {
      case "list":
        return await handleList(supabaseAdmin);
      case "get":
        return await handleGet(supabaseAdmin, payload.id);
      case "create":
        return await handleCreate(supabaseAdmin, payload.data, authResult.user);
      case "update":
        return await handleUpdate(supabaseAdmin, payload.id, payload.data, authResult.user);
      case "update-field":
        return await handleUpdateField(supabaseAdmin, payload.id, payload.field, payload.value, payload.module, authResult.user);
      case "add-log":
        return await handleAddLog(supabaseAdmin, payload.table, payload.data, authResult.user);
      case "update-log":
        return await handleUpdateLog(supabaseAdmin, payload.table, payload.id, payload.data, authResult.user);
      case "delete-log":
        return await handleDeleteLog(supabaseAdmin, payload.table, payload.id, authResult.user);
      case "delete":
        return await handleDelete(supabaseAdmin, payload.id);
      default:
        return errorResponse(`Action '${action}' not found`, 404);
    }
  } catch (err: any) {
    console.error("Orders API Error:", err);
    return errorResponse(err, 500);
  }
});

async function handleList(supabase: any) {
  // Parallel fetching for aggregation (mirrors front-end logic but on server)
  const [
    ordersRes, 
    paymentsRes, 
    prodLogsRes, 
    dispatchLogsRes, 
    installLogsRes, 
    reworkRes
  ] = await Promise.all([
    supabase.from("orders").select("*").order("created_at", { ascending: false }),
    supabase.from("payment_logs").select("order_id, amount, status"),
    supabase.from("production_logs").select("order_id, stage, windows_completed"),
    supabase.from("dispatch_logs").select("order_id, windows_dispatched"),
    supabase.from("installation_logs").select("order_id, windows_installed"),
    supabase.from("rework_logs").select("order_id, status, rework_qty"),
  ]);

  if (ordersRes.error) return errorResponse(ordersRes.error);

  // Return aggregated data structure
  return jsonResponse({
    orders: ordersRes.data,
    payment_logs: paymentsRes.data,
    production_logs: prodLogsRes.data,
    dispatch_logs: dispatchLogsRes.data,
    installation_logs: installLogsRes.data,
    rework_logs: reworkRes.data,
  });
}

async function handleGet(supabase: any, id: string) {
  if (!id) return errorResponse("Order ID is required");

  // Fetch order and all its related logs in parallel for the detail view
  const [orderRes, reworkRes, prodRes, dispatchRes, installRes, paymentsRes] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("rework_logs").select("*").eq("order_id", id).order("reported_at", { ascending: false }),
    supabase.from("production_logs").select("*").eq("order_id", id).order("reported_at", { ascending: false }),
    supabase.from("dispatch_logs").select("*").eq("order_id", id).order("reported_at", { ascending: false }),
    supabase.from("installation_logs").select("*").eq("order_id", id).order("reported_at", { ascending: false }),
    supabase.from("payment_logs").select("*").eq("order_id", id).order("payment_date", { ascending: false }),
  ]);

  if (orderRes.error) return errorResponse(orderRes.error);
  if (!orderRes.data) return errorResponse("Order not found", 404);

  return jsonResponse({
    ...orderRes.data,
    rework_logs: reworkRes.data || [],
    production_logs: prodRes.data || [],
    dispatch_logs: dispatchRes.data || [],
    installation_logs: installRes.data || [],
    payment_logs: paymentsRes.data || [],
  });
}

async function handleUpdateField(supabase: any, id: string, field: string, value: any, moduleName: string, user: any) {
  if (!id || !field) return errorResponse("ID and Field are required");

  // 1. Fetch current value for logging
  const { data: current, error: fetchErr } = await supabase
    .from("orders")
    .select(field)
    .eq("id", id)
    .single();
  
  if (fetchErr) return errorResponse(fetchErr);
  const oldValue = current[field];

  // 2. Perform update
  const { error: updateErr } = await supabase
    .from("orders")
    .update({ 
      [field]: value,
      updated_by: user.id 
    })
    .eq("id", id);
  
  if (updateErr) return errorResponse(updateErr);

  // 3. Automated logging in parallel
  const oldValStr = oldValue != null ? String(oldValue) : null;
  const newValStr = value != null ? String(value) : null;

  // Insert into audit logs and sync advance if needed
  const promises: Promise<any>[] = [
    supabase.from("audit_log").insert({
      entity_type: "orders",
      entity_id: id,
      field,
      old_value: oldValStr,
      new_value: newValStr,
      updated_by: user.id
    }),
    supabase.from("order_activity_log").insert({
      order_id: id,
      module: moduleName || "System",
      field_name: field,
      old_value: oldValStr,
      new_value: newValStr,
      updated_by: user.id,
      timestamp: new Date().toISOString()
    })
  ];

  if (field === "advance_received") {
    promises.push(syncAdvanceReceived(supabase, id, Number(oldValue) || 0, Number(value) || 0, user.id));
  }

  await Promise.all(promises);

  return jsonResponse({ success: true, oldValue, newValue: value });
}

async function handleAddLog(supabase: any, table: string, data: any, user: any) {
  if (!table || !data) return errorResponse("Table and Data are required");
  
  // Inject user_id into correct columns based on table
  const logData = { ...data };
  if (!logData.updated_by && !logData.entered_by) {
    // If it's a log table, use entered_by. If it's an audit table, use updated_by.
    if (table.endsWith("_logs") || table === "dispatch" || table === "installation") {
      logData.entered_by = user.id;
    } else {
      logData.updated_by = user.id;
    }
  }

  const { data: result, error } = await supabase
    .from(table)
    .insert(logData)
    .select()
    .single();

  if (error) return errorResponse(error);
  return jsonResponse(result, 201);
}

async function handleUpdateLog(supabase: any, table: string, id: string, data: any, _user: any) {
  if (!table || !id || !data) return errorResponse("Table, ID, and Data are required");

  const { data: result, error } = await supabase
    .from(table)
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) return errorResponse(error);
  return jsonResponse(result);
}

async function handleDeleteLog(supabase: any, table: string, id: string, _user: any) {
  if (!table || !id) return errorResponse("Table and ID are required");

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("id", id);

  if (error) return errorResponse(error);
  return jsonResponse({ success: true });
}

async function handleCreate(supabase: any, data: any, user: any) {
  if (!data) return errorResponse("Data is required");

  const { data: result, error } = await supabase
    .from("orders")
    .insert({ 
      ...data, 
      created_by: user.id,
      updated_by: user.id
    })
    .select()
    .single();

  if (error) return errorResponse(error);

  if (result.advance_received > 0) {
    await syncAdvanceReceived(supabase, result.id, 0, result.advance_received, user.id);
  }

  return jsonResponse(result, 201);
}

async function handleUpdate(supabase: any, id: string, data: any, user: any) {
  if (!id) return errorResponse("Order ID is required");
  if (!data) return errorResponse("Data is required");

  delete data.id;
  delete data.created_at;

  // Fetch old order to safely compare advance_received
  const { data: oldOrder } = await supabase.from("orders").select("advance_received").eq("id", id).maybeSingle();

  const { data: result, error } = await supabase
    .from("orders")
    .update({ 
      ...data, 
      updated_by: user.id 
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return errorResponse(error);

  const oldAdvance = oldOrder ? Number(oldOrder.advance_received) || 0 : 0;
  const newAdvance = Number(result.advance_received) || 0;
  
  if (oldAdvance !== newAdvance) {
    await syncAdvanceReceived(supabase, id, oldAdvance, newAdvance, user.id);
  }

  return jsonResponse(result);
}

// Internal sync helper
async function syncAdvanceReceived(supabase: any, orderId: string, oldAdvance: number, newAdvance: number, userId: string) {
  if (newAdvance > 0 && newAdvance !== oldAdvance) {
    await supabase.from("payment_logs").insert({
      order_id: orderId,
      amount: newAdvance,
      source_module: "Sales",
      status: "Draft",
      entered_by: userId,
      payment_date: new Date().toISOString().split("T")[0]
    });
  }
}

async function handleDelete(supabase: any, id: string) {
  if (!id) return errorResponse("Order ID is required");

  // 1. Fetch order info
  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("order_name")
    .eq("id", id)
    .single();

  if (fetchErr) return errorResponse(fetchErr);

  // 2. Only block deletion if there are CONFIRMED payments (financial record)
  const { data: confirmedPayments } = await supabase
    .from("payment_logs")
    .select("id")
    .eq("order_id", id)
    .eq("status", "Confirmed")
    .limit(1);

  if (confirmedPayments && confirmedPayments.length > 0) {
    return errorResponse(
      `Cannot delete '${order.order_name}' because it has confirmed payments. Please reverse all confirmed payments before deleting.`,
      400
    );
  }

  // 3. Delete all child logs (cascade cleanup)
  await Promise.all([
    supabase.from("production_logs").delete().eq("order_id", id),
    supabase.from("dispatch_logs").delete().eq("order_id", id),
    supabase.from("installation_logs").delete().eq("order_id", id),
    supabase.from("rework_logs").delete().eq("order_id", id),
    supabase.from("payment_logs").delete().eq("order_id", id), // deletes draft/pending payments
    supabase.from("order_activity_log").delete().eq("order_id", id),
  ]);

  // 4. Delete the order itself
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", id);

  if (error) return errorResponse(error);

  // 5. Cleanup audit logs
  await supabase
    .from("audit_log")
    .delete()
    .eq("entity_id", id)
    .eq("entity_type", "orders");

  return jsonResponse({ success: true });
}
