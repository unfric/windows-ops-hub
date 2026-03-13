import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_OPTIONS, STATUS_LABELS, type StatusField } from "@/lib/statusConfig";
import { useUserRoles } from "@/hooks/useUserRoles";
import { toast } from "sonner";

interface StatusDropdownProps {
  field: StatusField;
  value: string;
  onValueChange: (value: string) => void;
  showLabel?: boolean;
}

export default function StatusDropdown({ field, value, onValueChange, showLabel = true }: StatusDropdownProps) {
  const options = STATUS_OPTIONS[field];
  const { hasRole } = useUserRoles();

  const handleChange = (newValue: string) => {
    // Management gate: only management or admin can set "Deviation Approved"
    if (field === "finance_status" && newValue === "Deviation Approved") {
      if (!hasRole("management") && !hasRole("admin")) {
        toast.error("Only Management can approve deviations");
        return;
      }
    }
    onValueChange(newValue);
  };

  return (
    <div className="space-y-1">
      {showLabel && (
        <Label className="text-xs text-muted-foreground">{STATUS_LABELS[field]} Status</Label>
      )}
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => {
            const isRestricted = field === "finance_status" && opt === "Deviation Approved"
              && !hasRole("management") && !hasRole("admin");
            return (
              <SelectItem key={opt} value={opt} disabled={isRestricted}>
                {opt}{isRestricted ? " 🔒" : ""}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
