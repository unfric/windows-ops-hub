import { corsHeaders } from "./cors.ts";

/**
 * Returns a standardized JSON response with CORS headers.
 */
export const jsonResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
};

/**
 * Returns a standardized error response with CORS headers and database error details.
 */
export const errorResponse = (error: any, status = 400) => {
  const message = error?.message || error || "An unexpected error occurred";
  const details = error?.details || null;
  const hint = error?.hint || null;
  const code = error?.code || null;

  return new Response(JSON.stringify({ 
    error: message, 
    details, 
    hint, 
    code,
    success: false 
  }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
};
