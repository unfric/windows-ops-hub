import { useEffect, useState, useCallback } from "react";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Pencil, Send, Ban, Trash2, Users, Loader2, Mail, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { PageHeader, PageWrapper } from "@/components/shared/DashboardComponents";

const ALL_ROLES = [
  "sales", "finance", "survey", "design", "procurement",
  "stores", "production", "quality", "dispatch", "installation",
  "management", "admin",
] as const;

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  active: boolean;
  status: string;
  invited_at: string | null;
  joined_at: string | null;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
}

type ModalMode = "add" | "edit" | null;

export default function UserManagementPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRoles, setFormRoles] = useState<string[]>([]);
  const [formActive, setFormActive] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const data = await api.users.list();
      setProfiles(data.profiles || []);
      setRoles(data.roles || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getUserRoles = (userId: string) =>
    roles.filter((r) => r.user_id === userId).map((r) => r.role);

  const openAddModal = () => {
    setFormName("");
    setFormEmail("");
    setFormRoles([]);
    setFormActive(true);
    setEditUserId(null);
    setModalMode("add");
  };

  const openEditModal = (profile: Profile) => {
    setFormName(profile.name);
    setFormEmail(profile.email);
    setFormRoles(getUserRoles(profile.user_id));
    setFormActive(profile.active);
    setEditUserId(profile.user_id);
    setModalMode("edit");
  };

  const toggleFormRole = (role: string) => {
    setFormRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modalMode === "add") {
        if (!formEmail.trim()) {
          toast.error("Email is required");
          setSaving(false);
          return;
        }
        await api.users.invite({
          email: formEmail.trim(),
          name: formName.trim(),
          roles: formRoles
        });
        toast.success("Invitation sent");
      } else if (modalMode === "edit" && editUserId) {
        await api.users.update(editUserId, {
          profile: {
            active: formActive,
            name: formName.trim(),
            status: formActive ? "active" : "disabled"
          },
          roles: formRoles
        });
        toast.success("User updated");
      }
      setModalMode(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleResendInvite = async (profile: Profile) => {
    try {
      await api.users.resendInvite(profile.user_id);
      toast.success("Invitation resent successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend invite");
    }
  };

  const handleDisableUser = async (profile: Profile) => {
    try {
      await api.users.update(profile.user_id, {
        profile: { active: false, status: "disabled" }
      });
      toast.success("User disabled");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to disable user");
    }
  };

  const handleDeleteUser = async (profile: Profile) => {
    if (!window.confirm(`Are you absolutely sure you want to delete ${profile.email}? This will permanently remove their account from the system.`)) return;

    try {
      await api.users.delete(profile.user_id);
      toast.success("User deleted successfully");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    }
  };

  const getStatusBadge = (profile: Profile) => {
    const status = profile.status || (profile.active ? "active" : "disabled");
    switch (status) {
      case "invited":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">Invited</Badge>;
      case "active":
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>;
      case "disabled":
        return <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-slate-200">Disabled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd MMM yyyy");
    } catch {
      return "—";
    }
  };

  return (
    <PageWrapper title="User Management">
      <PageHeader
        title="Personnel Command"
        subtitle="Manage secure access and roles across the ecosystem"
        icon={Users}
      >
        <Button onClick={openAddModal} className="shadow-lg shadow-primary/20">
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </PageHeader>

      <div className="rounded-2xl border bg-card/60 backdrop-blur-md shadow-sm overflow-hidden transition-all duration-500 hover:shadow-md">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="font-bold text-xs uppercase tracking-widest py-5 px-6">Identified Personnel</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-widest py-5">Access Matrix</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-widest py-5">Current Status</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-widest py-5">Temporal Logs</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-widest py-5 text-right px-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                    <p className="text-sm font-medium text-slate-400">Fetching Personnel Registry...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : profiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center border-2 border-dashed border-slate-200">
                      <Users className="h-8 w-8 text-slate-300" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">No personnel found</h3>
                      <p className="text-sm text-slate-400">Initialize the first system commander to begin.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              profiles.map((p) => (
                <TableRow key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                  <TableCell className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 leading-tight">{p.name || "UNIDENTIFIED"}</span>
                      <span className="text-xs text-slate-400 font-medium">{p.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {getUserRoles(p.user_id).length > 0
                        ? getUserRoles(p.user_id).map((r) => (
                          <Badge key={r} variant="outline" className="text-[10px] font-black uppercase bg-white shadow-sm border-slate-200 text-slate-600">
                            {r}
                          </Badge>
                        ))
                        : <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Zero Permissions</span>}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">{getStatusBadge(p)}</TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-12 text-slate-400 font-bold uppercase">Invited:</span>
                        <span className="text-slate-600 font-medium">{formatDate(p.invited_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-12 text-slate-400 font-bold uppercase">Joined:</span>
                        <span className="text-slate-600 font-medium">{formatDate(p.joined_at)}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button variant="ghost" size="icon" className="h-8 w-8 bg-white shadow-sm border hover:bg-slate-50" onClick={() => openEditModal(p)} title="Configure">
                        <Pencil className="h-3.5 w-3.5 text-slate-600" />
                      </Button>
                      {p.status === "invited" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-white shadow-sm border hover:bg-primary/10 hover:text-primary" onClick={() => handleResendInvite(p)} title="Resend Invite">
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {p.status !== "disabled" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-white shadow-sm border hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDisableUser(p)} title="Deactivate">
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 bg-white shadow-sm border hover:bg-destructive hover:text-white" onClick={() => handleDeleteUser(p)} title="Purge Records">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modalMode !== null} onOpenChange={(open) => !open && setModalMode(null)}>
        <DialogContent className="sm:max-w-md rounded-[32px] border-none shadow-2xl bg-white/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              {modalMode === "add" ? "Initialize Operative" : "Update Protocols"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Commander Identity</Label>
              <div className="relative">
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Victor Kaine"
                  className="h-12 bg-slate-50 border-none shadow-inner focus-visible:ring-primary rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Communication NEXUS (Email)</Label>
              <div className="relative">
                <Mail className="absolute right-4 top-3.5 h-5 w-5 text-slate-200" />
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="commander@unfric.io"
                  className="h-12 bg-slate-50 border-none shadow-inner focus-visible:ring-primary rounded-xl"
                  disabled={modalMode === "edit"}
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Access Authorization Level</Label>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                {ALL_ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-3 text-sm capitalize cursor-pointer group hover:text-primary transition-colors">
                    <Checkbox
                      checked={formRoles.includes(role)}
                      onCheckedChange={() => toggleFormRole(role)}
                      className="rounded-md data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <span className="font-bold text-slate-600 group-hover:text-primary">{role}</span>
                  </label>
                ))}
              </div>
            </div>
            {modalMode === "edit" && (
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-slate-400" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-tight">Access Link Active</span>
                    <span className="text-[10px] text-slate-400 font-medium">Control operative's system state</span>
                  </div>
                </div>
                <Switch checked={formActive} onCheckedChange={setFormActive} className="data-[state=checked]:bg-emerald-500" />
              </div>
            )}
          </div>
          <DialogFooter className="gap-3 sm:justify-center pt-2">
            <Button variant="ghost" onClick={() => setModalMode(null)} className="rounded-2xl font-bold uppercase text-xs tracking-widest h-12 px-6">
              Discard
            </Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-2xl font-black uppercase text-xs tracking-[0.2em] h-12 px-10 shadow-lg shadow-primary/20">
              {saving ? "Processing..." : modalMode === "add" ? "Authorize Operative" : "Update Records"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
