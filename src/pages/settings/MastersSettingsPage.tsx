import { ConfigList } from "./GeneralSettingsPage";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Users, Building, Briefcase, Paintbrush, Package, Truck } from "lucide-react";

export default function MastersSettingsPage() {
  return (
    <div className="max-w-3xl pb-20">
      <Accordion type="multiple" className="space-y-4">
        <AccordionItem value="sales" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-semibold">Sales Team</span>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <ConfigList table="salespersons" title="Salespersons" />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="clients" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline flex items-center gap-2">
            <Building className="h-4 w-4 text-primary" />
            <span className="font-semibold">Clients & Dealers</span>
          </AccordionTrigger>
          <AccordionContent className="pt-2 space-y-4">
            <ConfigList table="dealers" title="Dealer Names" />
            <ConfigList table="project_client_names" title="Project Client Names" />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="projects" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <span className="font-semibold">Projects</span>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <ConfigList table="project_names" title="Project Names" />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="products" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <span className="font-semibold">Product Catalog</span>
          </AccordionTrigger>
          <AccordionContent className="pt-2 space-y-4">
            <ConfigList table="other_product_types" title="Products" />
            <ConfigList table="colour_shades" title="Colour Shades" />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="operations" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            <span className="font-semibold">Operations & Supply Chain</span>
          </AccordionTrigger>
          <AccordionContent className="pt-2 space-y-4">
            <ConfigList table="production_units" title="Production Units" />
            <ConfigList table="coating_vendors" title="Coating Vendors" />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
