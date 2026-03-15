import { verifyUser } from "../_shared/auth.ts";
import { jsonResponse, errorResponse } from "../_shared/response.ts";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Handles all order-related operations.
 */
Deno.serve(async (req) => {
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

    switch (action) {
      case "list":
        return await handleList(supabase);
      case "get":
        return await handleGet(supabase, payload.id);
      case "create":
        return await handleCreate(supabase, payload.data);
      case "update":
        return await handleUpdate(supabase, payload.id, payload.data);
      case "update-field":
        return await handleUpdateField(supabase, payload.id, payload.field, payload.value, payload.module, authResult.user);
      case "add-log":
        return await handleAddLog(supabase, payload.table, payload.data, authResult.user);
      case "update-log":
        return await handleUpdateLog(supabase, payload.table, payload.id, payload.data, authResult.user);
      case "delete-log":
        return await handleDeleteLog(supabase, payload.table, payload.id, authResult.user);
      case "delete":
        return await handleDelete(supabase, payload.id);
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
    .update({ [field]: value })
    .eq("id", id);
  
  if (updateErr) return errorResponse(updateErr);

  // 3. Automated logging in parallel
  const oldValStr = oldValue != null ? String(oldValue) : null;
  const newValStr = value != null ? String(value) : null;

  await Promise.all([
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
  ]);

  return jsonResponse({ success: true, oldValue, newValue: value });
}

async function handleAddLog(supabase: any, table: string, data: any, user: any) {
  if (!table || !data) return errorResponse("Table and Data are required");
  
  // Inject user_id if not present and table supports it
  const logData = { ...data, updated_by: data.updated_by || user.id };

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

async function handleCreate(supabase: any, data: any) {
  if (!data) return errorResponse("Data is required");

  const { data: result, error } = await supabase
    .from("orders")
    .insert(data)
    .select()
    .single();

  if (error) return errorResponse(error);
  return jsonResponse(result, 201);
}

async function handleUpdate(supabase: any, id: string, data: any) {
  if (!id) return errorResponse("Order ID is required");
  if (!data) return errorResponse("Data is required");

  delete data.id;
  delete data.created_at;

  const { data: result, error } = await supabase
    .from("orders")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) return errorResponse(error);
  return jsonResponse(result);
}

async function handleDelete(supabase: any, id: string) {
  if (!id) return errorResponse("Order ID is required");

  // 1. Fetch order and check for progress fields
  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("order_name, survey_done_windows, design_released_windows")
    .eq("id", id)
    .single();

  if (fetchErr) return errorResponse(fetchErr);

  if ((order.survey_done_windows || 0) > 0) {
    return errorResponse(`Cannot delete '${order.order_name}' because Survey progress has been recorded (${order.survey_done_windows} windows).`, 400);
  }

  if ((order.design_released_windows || 0) > 0) {
    return errorResponse(`Cannot delete '${order.order_name}' because Design has already been released (${order.design_released_windows} windows).`, 400);
  }

  // 2. Check for related logs in other tables
  const [payments, production, dispatch, installation] = await Promise.all([
    supabase.from("payment_logs").select("id").eq("order_id", id).eq("status", "Confirmed").limit(1),
    supabase.from("production_logs").select("id").eq("order_id", id).limit(1),
    supabase.from("dispatch_logs").select("id").eq("order_id", id).limit(1),
    supabase.from("installation_logs").select("id").eq("order_id", id).limit(1),
  ]);

  if (payments.data && payments.data.length > 0) {
    return errorResponse("Cannot delete an order that has confirmed payments. Delete or reverse payments first.", 400);
  }
  if (production.data && production.data.length > 0) {
    return errorResponse("Cannot delete an order that has production logs. Business has already started manufacturing.", 400);
  }
  if (dispatch.data && dispatch.data.length > 0) {
    return errorResponse("Cannot delete an order that has been partially or fully dispatched.", 400);
  }
  if (installation.data && installation.data.length > 0) {
    return errorResponse("Cannot delete an order that has installation logs recorded.", 400);
  }

  // If all checks pass, proceed with deletion
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", id);

  if (error) return errorResponse(error);

  // Polymorphic cleanup (Audit logs don't have FK Cascades)
  await supabase
    .from("audit_log")
    .delete()
    .eq("entity_id", id)
    .eq("entity_type", "orders");

  return jsonResponse({ success: true });
}
