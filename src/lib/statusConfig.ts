export const STATUS_OPTIONS = {
  commercial_status: ["Pipeline", "Confirmed", "Hold", "Cancelled"],
  finance_status: ["Pending Approval", "Advance Received", "Deviation Approved", "Finance Approved"],
  survey_status: ["Pending", "Completed"],
  design_status: ["Pending", "Released"],
  dispatch_status: ["Not Dispatched", "Partially Dispatched", "Fully Dispatched"],
  installation_status: ["Pending", "Planned", "Completed"],
} as const;

export type StatusField = keyof typeof STATUS_OPTIONS;

export const STATUS_LABELS: Record<StatusField, string> = {
  commercial_status: "Commercial",
  finance_status: "Finance",
  survey_status: "Survey",
  design_status: "Design",
  dispatch_status: "Dispatch",
  installation_status: "Installation",
};
