import { useMemo } from "react";

interface Step {
  label: string;
  tab: string;
  status?: string;
  qty?: number;
  total?: number;
  shortStatus: string;
  isCompleted: boolean;
  isPending: boolean;
}

export function usePipelineSteps(order: any) {
  const reworkLogs = useMemo(() => order?.rework_logs || [], [order?.rework_logs]);
  const productionLogs = useMemo(() => order?.production_logs || [], [order?.production_logs]);
  const dispatchLogs = useMemo(() => order?.dispatch_logs || [], [order?.dispatch_logs]);
  const installLogs = useMemo(() => order?.installation_logs || [], [order?.installation_logs]);

  const packedCount = useMemo(() => 
    productionLogs.filter((l: any) => l.stage === "Packed").reduce((s: number, l: any) => s + (l.windows_completed || 0), 0),
  [productionLogs]);

  const dispatchedCount = useMemo(() => 
    dispatchLogs.reduce((s: number, l: any) => s + (l.windows_dispatched || 0), 0),
  [dispatchLogs]);

  const installedCount = useMemo(() => 
    installLogs.reduce((s: number, l: any) => s + (l.windows_installed || 0), 0),
  [installLogs]);

  const steps: Step[] = useMemo(() => {
    if (!order) return [];

    const rawSteps = [
      { label: "Details", tab: "details" },
      { label: "Survey", tab: "survey", status: order.survey_status, qty: order.survey_done_windows, total: order.total_windows },
      { label: "Finance", tab: "finance", status: order.finance_status },
      { label: "Design", tab: "design", status: order.design_status, qty: order.design_released_windows, total: order.survey_done_windows },
      { label: "Materials", tab: "materials" },
      { label: "Production", tab: "production", qty: packedCount, total: order.total_windows },
      { label: "Dispatch", tab: "dispatch", qty: dispatchedCount, total: order.design_released_windows || 0 },
      { label: "Installation", tab: "installation", qty: installedCount, total: order.total_windows },
      { label: "Rework", tab: "rework" },
    ];

    return rawSteps.map(step => {
      let shortStatus = "Pnd";
      
      if (step.label === "Materials") {
        const availabilities = [
          order.hardware_availability,
          order.extrusion_availability,
          order.glass_availability,
          order.coated_extrusion_availability
        ];
        if (availabilities.every(v => v === "In Stock / Available" || v === "Not Required")) shortStatus = "Stock";
        else if (availabilities.some(v => v?.includes("Partial") || v?.includes("In Stock") || v?.includes("Placed") || v?.includes("Sent"))) shortStatus = "Part Avl";
      }
      else if (step.label === "Finance") {
        const s = step.status?.toLowerCase() || "";
        if (s.includes("finance approved")) shortStatus = "Fin Appr";
        else if (s.includes("deviation approved")) shortStatus = "Dev Appr";
        else if (s.includes("advance received")) shortStatus = "Adv Recv";
      }
      else if (step.label === "Rework") {
        if (!reworkLogs || reworkLogs.length === 0) shortStatus = "NA";
        else {
          const solved = reworkLogs.filter((l: any) => l.status === "Solved" || l.status === "Closed").length;
          shortStatus = `${solved}/${reworkLogs.length}`;
        }
      }
      else if (step.qty !== undefined && step.total !== undefined) {
        if (step.total > 0 && step.qty >= step.total) shortStatus = "Comp";
        else shortStatus = `${step.qty}/${step.total}`;
      }
      else if (step.status) {
        shortStatus = step.status.substring(0, 5);
      }

      const isCompleted = 
        shortStatus === "Comp" || 
        shortStatus === "Fin Appr" || 
        shortStatus === "Stock" || 
        (step.label === "Rework" && reworkLogs.length > 0 && shortStatus.split("/")[0] === shortStatus.split("/")[1]);
      
      const isPending = shortStatus === "Pnd" || shortStatus === "NA";

      return { ...step, shortStatus, isCompleted, isPending };
    });
  }, [order, packedCount, dispatchedCount, installedCount, reworkLogs]);

  return { steps, reworkLogs };
}
