import { ConfigList } from "@/components/settings/ConfigList";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Factory } from "lucide-react";

/**
 * Production Infrastructure settings.
 */
export default function ProductionSettingsPage() {
  return (
    <div className="max-w-3xl pb-20 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Accordion type="multiple" className="space-y-4" defaultValue={["units"]}>
        <AccordionItem value="units" className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <AccordionTrigger className="hover:no-underline px-6 py-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Factory className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold uppercase tracking-widest text-slate-900 block">Infrastructure</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">Manufacturing Units and Assets</span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4">
            <ConfigList table="production_units" title="Production Clusters" />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
