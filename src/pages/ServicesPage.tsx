import { BizPageHeader, useEnsureGHub } from "@/components/finance/BizParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatMoney } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Service = {
  _id: string;
  name: string;
  description?: string | null;
  priceMinCents: number;
  priceMaxCents: number;
  active: boolean;
};

const EMPTY_FORM = {
  name: "",
  description: "",
  priceMin: "",
  priceMax: "",
};

export default function ServicesPage() {
  useEnsureGHub();
  const services = useQuery(api.services.listServices, {});
  const seed = useMutation(api.services.seedDefaultServices);
  const createService = useMutation(api.services.createService);
  const updateService = useMutation(api.services.updateService);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  if (services === undefined) {
    return <div className="text-muted-foreground text-sm">Loading services…</div>;
  }

  const rows = services as Service[];

  const openDialog = (service: Service | null) => {
    setEditing(service);
    setForm(
      service
        ? {
            name: service.name,
            description: service.description ?? "",
            priceMin: (service.priceMinCents / 100).toFixed(0),
            priceMax: (service.priceMaxCents / 100).toFixed(0),
          }
        : EMPTY_FORM,
    );
    setOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const min = Math.round(Number.parseFloat(form.priceMin || "0") * 100);
    const max = Math.round(Number.parseFloat(form.priceMax || "0") * 100);
    if (!form.name.trim() || !Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min) {
      toast.error("Name and a valid price range (max ≥ min > 0) are required.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateService({
          serviceId: editing._id as Id<"services">,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          priceMinCents: min,
          priceMaxCents: max,
          active: editing.active,
        });
        toast.success("Service updated");
      } else {
        await createService({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          priceMinCents: min,
          priceMaxCents: max,
          active: true,
        });
        toast.success("Service added");
      }
      setOpen(false);
    } catch {
      toast.error("Couldn't save the service.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="GHub Services Catalogue"
        subtitle="Reference data for proposals — prices are ranges you quote from, not transactions."
      >
        {rows.length === 0 && (
          <Button
            variant="outline"
            onClick={() =>
              void seed({})
                .then(() => toast.success("Default services added"))
                .catch(() => toast.error("Couldn't seed the catalogue."))
            }
          >
            <Sparkles className="size-4" /> Load the 5 default services
          </Button>
        )}
        <Button onClick={() => openDialog(null)}>
          <Plus className="size-4" /> Add service
        </Button>
      </BizPageHeader>

      <section className="surface-card rounded-xl border p-4">
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No services yet. Load the five default GHub services or add your own.
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((service) => (
              <li key={service._id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{service.name}</p>
                    <Badge variant={service.active ? "default" : "secondary"}>
                      {service.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {service.description && (
                    <p className="text-muted-foreground mt-0.5 text-xs">{service.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums">
                    {formatMoney(service.priceMinCents, { cents: false })} –{" "}
                    {formatMoney(service.priceMaxCents, { cents: false })}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => openDialog(service)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void updateService({
                        serviceId: service._id as Id<"services">,
                        name: service.name,
                        description: service.description ?? undefined,
                        priceMinCents: service.priceMinCents,
                        priceMaxCents: service.priceMaxCents,
                        active: !service.active,
                      })
                        .then(() =>
                          toast.success(service.active ? "Service deactivated" : "Service activated"),
                        )
                        .catch(() => toast.error("Update failed."))
                    }
                  >
                    {service.active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit service" : "Add service"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="service-name">Name</Label>
              <Input
                id="service-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="service-desc">Description</Label>
              <Input
                id="service-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="service-min">Price from (KSh)</Label>
                <Input
                  id="service-min"
                  inputMode="decimal"
                  value={form.priceMin}
                  onChange={(e) => setForm({ ...form, priceMin: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="service-max">Price to (KSh)</Label>
                <Input
                  id="service-max"
                  inputMode="decimal"
                  value={form.priceMax}
                  onChange={(e) => setForm({ ...form, priceMax: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                {editing ? "Save changes" : "Add service"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
