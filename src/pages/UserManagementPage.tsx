import { useEffect, useState } from "react";
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
import { UserPlus, Pencil, Send, Ban, Trash2 } from "lucide-react";
import { format } from "date-fns";

const ALL_ROLES = [
  "sales", "finance", "survey", "design", "procurement",
  "stores", "production", "dispatch", "installation",
  "rework", "management", "admin",
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

  const fetchData = async () => {
    try {
      const data = await api.users.list();
      setProfiles(data.profiles || []);
      setRoles(data.roles || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
        // Using users-api for invitation as well
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
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Invited</Badge>;
      case "active":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge>;
      case "disabled":
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Disabled</Badge>;
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
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={openAddModal}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invited At</TableHead>
              <TableHead>Joined At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : profiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              profiles.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getUserRoles(p.user_id).length > 0
                        ? getUserRoles(p.user_id).map((r) => (
                            <Badge key={r} variant="secondary" className="text-xs capitalize">
                              {r}
                            </Badge>
                          ))
                        : <span className="text-xs text-muted-foreground">No roles</span>}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(p)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(p.invited_at)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(p.joined_at)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => openEditModal(p)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      {p.status === "invited" && (
                        <Button variant="outline" size="sm" onClick={() => handleResendInvite(p)}>
                          <Send className="h-3.5 w-3.5 mr-1" />
                          Resend
                        </Button>
                      )}
                      {p.status !== "disabled" && (
                        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDisableUser(p)} title="Disable User">
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteUser(p)} title="Delete User">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{modalMode === "add" ? "Add User" : "Edit User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="user@example.com"
                disabled={modalMode === "edit"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Roles</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {ALL_ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                    <Checkbox
                      checked={formRoles.includes(role)}
                      onCheckedChange={() => toggleFormRole(role)}
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>
            {modalMode === "edit" && (
              <div className="flex items-center gap-2">
                <Label>Active</Label>
                <Switch checked={formActive} onCheckedChange={setFormActive} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalMode(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : modalMode === "add" ? "Add User" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
