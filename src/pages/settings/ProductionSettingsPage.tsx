import { ConfigList } from "./GeneralSettingsPage";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Factory } from "lucide-react";

export default function ProductionSettingsPage() {
  return (
    <div className="max-w-3xl pb-20">
      <Accordion type="multiple" className="space-y-4">
        <AccordionItem value="units" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline flex items-center gap-2">
            <Factory className="h-4 w-4 text-primary" />
            <span className="font-semibold">Production Infrastructure</span>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <ConfigList table="production_units" title="Production Units" />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
