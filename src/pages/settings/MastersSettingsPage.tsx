import { ConfigList } from "@/components/settings/ConfigList";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Building, Briefcase, Package, Truck, Target } from "lucide-react";

/**
 * Masters Dashboard for managing core industrial entities.
 */
export default function MastersSettingsPage() {
  return (
    <div className="max-w-3xl pb-20 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Accordion type="multiple" className="space-y-4" defaultValue={["sales"]}>
        {/* Sales Team */}
        <AccordionItem value="sales" className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <AccordionTrigger className="hover:no-underline px-6 py-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold uppercase tracking-widest text-slate-900 block">Force Command</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">Sales Personnel Registry</span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4">
            <ConfigList table="salespersons" title="Salespersons" />
          </AccordionContent>
        </AccordionItem>

        {/* Clients & Dealers */}
        <AccordionItem value="clients" className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <AccordionTrigger className="hover:no-underline px-6 py-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold uppercase tracking-widest text-slate-900 block">External Entities</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">Dealers and Corporate Clients</span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 space-y-6">
            <ConfigList table="dealers" title="Dealer Network" />
            <ConfigList table="project_client_names" title="Corporate Clients" />
          </AccordionContent>
        </AccordionItem>

        {/* Projects */}
        <AccordionItem value="projects" className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <AccordionTrigger className="hover:no-underline px-6 py-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold uppercase tracking-widest text-slate-900 block">Project Portfolio</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">Active Industrial Sites</span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4">
            <ConfigList table="project_names" title="Project Sites" />
          </AccordionContent>
        </AccordionItem>

        {/* Products */}
        <AccordionItem value="products" className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <AccordionTrigger className="hover:no-underline px-6 py-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold uppercase tracking-widest text-slate-900 block">Material Matrix</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">Product Lines and Specifications</span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 space-y-6">
            <ConfigList table="other_product_types" title="System Types" />
            <ConfigList table="colour_shades" title="Architectural Shades" />
          </AccordionContent>
        </AccordionItem>

        {/* Operations */}
        <AccordionItem value="operations" className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <AccordionTrigger className="hover:no-underline px-6 py-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Truck className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <span className="text-sm font-bold uppercase tracking-widest text-slate-900 block">Supply Chain</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">Logistics and Vendor Endpoints</span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-4 space-y-6">
            <ConfigList table="production_units" title="Production Clusters" />
            <ConfigList table="coating_vendors" title="Coating Partners" />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
