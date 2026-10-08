import { BizPageHeader, useEnsureGHub } from "@/components/finance/BizParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatMoney, formatDate } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

export default function ContractsPage() {
  useEnsureGHub();
  const proposals = useQuery(api.businessSales.listProposals, {});
  const contracts = useQuery(api.businessSales.listContracts, {});
  const setStatus = useMutation(api.businessSales.setProposalStatus);
  const setContractStatus = useMutation(api.businessSales.setContractStatus);

  if (proposals === undefined || contracts === undefined) {
    return <div className="text-muted-foreground text-sm">Loading proposals and contracts…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <BizPageHeader
        title="Proposals & Contracts"
        subtitle="Quotations become contracts; retainers feed monthly recurring revenue."
      />

      <section className="surface-card rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Quotations ({proposals.length})</h2>
        {proposals.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">
            No quotations yet. Create one from a lead once discovery is underway.
          </p>
        ) : (
          <ul className="mt-3 divide-y">
            {proposals.map((proposal) => {
              const clientName = "—";
              return (
                <li key={proposal._id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{proposal.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {clientName} · {proposal.items.length} items
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMoney(proposal.totalCents)}
                    </span>
                    <Badge variant={proposal.status === "accepted" ? "default" : "secondary"}>
                      {proposal.status}
                    </Badge>
                    {proposal.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void setStatus({
                            proposalId: proposal._id as Id<"proposals">,
                            status: "sent",
                          })
                            .then(() => toast.success("Marked as sent"))
                            .catch(() => toast.error("Update failed"))
                        }
                      >
                        Send
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="surface-card rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Contracts ({contracts.length})</h2>
        {contracts.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">
            No contracts yet. Convert a Won lead to create one automatically.
          </p>
        ) : (
          <ul className="mt-3 divide-y">
            {contracts.map((contract) => (
              <li key={contract._id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">
                    {contract.title}{" "}
                    {contract.isRetainer && (
                      <Badge variant="outline" className="ml-1">
                        Retainer
                      </Badge>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Starts {formatDate(contract.startDate)} · {contract.billingFrequency} ·{" "}
                    {contract.status}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums">
                    {formatMoney(contract.billingAmountCents)}
                  </span>
                  {contract.status === "active" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void setContractStatus({
                          contractId: contract._id as Id<"contracts">,
                          status: "ended",
                        })
                          .then(() => toast.success("Contract ended"))
                          .catch(() => toast.error("Update failed"))
                      }
                    >
                      End
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-xs">{contract.status}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
