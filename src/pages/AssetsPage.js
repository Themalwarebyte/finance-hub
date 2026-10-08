import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BizPageHeader } from "@/components/finance/BizParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { formatMoney, formatShortDate } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
const ASSET_CLASSES = [
    { value: "money_market_fund", label: "Money market fund" },
    { value: "sacco_deposit", label: "SACCO deposits (liquid)" },
    { value: "sacco_share_capital", label: "SACCO share capital (locked-in)" },
    { value: "treasury_bill", label: "Treasury bill (discount)" },
    { value: "treasury_bond", label: "Treasury bond (coupon)" },
    { value: "infrastructure_bond", label: "Infrastructure bond (tax-free coupon)" },
];
export default function AssetsPage() {
    const securities = useQuery(api.invest.listSecurities, {});
    const createSecurity = useMutation(api.invest.createSecurity);
    const recordTxn = useMutation(api.invest.recordTxn);
    const updatePrice = useMutation(api.invest.updatePrice);
    const [open, setOpen] = useState(false);
    const [symbol, setSymbol] = useState("");
    const [name, setName] = useState("");
    const [assetClass, setAssetClass] = useState("money_market_fund");
    const [qty, setQty] = useState("1");
    const [saving, setSaving] = useState(false);
    const [cashOpen, setCashOpen] = useState(false);
    const [cashSecurity, setCashSecurity] = useState("");
    const [cashKind, setCashKind] = useState("contribution");
    const [cashAmount, setCashAmount] = useState("");
    const [cashSaving, setCashSaving] = useState(false);
    if (securities === undefined) {
        return _jsx("div", { className: "text-muted-foreground text-sm", children: "Loading assets\u2026" });
    }
    const fundAssets = securities.filter((security) => security.assetClass !== "equity" && security.assetClass !== "etf");
    const handleCreate = async (event) => {
        event.preventDefault();
        if (!symbol.trim() || !name.trim()) {
            toast.error("Symbol and name are required.");
            return;
        }
        setSaving(true);
        try {
            await createSecurity({
                symbol: symbol.trim(),
                name: name.trim(),
                assetClass: assetClass,
                qtyInput: qty.trim() || "1",
            });
            toast.success("Asset added");
            setOpen(false);
            setSymbol("");
            setName("");
        }
        catch {
            toast.error("Couldn't add the asset.");
        }
        finally {
            setSaving(false);
        }
    };
    const handleCash = async (event) => {
        event.preventDefault();
        const cents = Math.round(Number.parseFloat(cashAmount || "0") * 100);
        if (!cashSecurity || !Number.isFinite(cents) || cents <= 0) {
            toast.error("Choose an asset and a positive amount.");
            return;
        }
        setCashSaving(true);
        try {
            await recordTxn({
                securityId: cashSecurity,
                kind: cashKind,
                amountCents: cents,
            });
            toast.success("Cash movement recorded");
            setCashOpen(false);
            setCashAmount("");
        }
        catch {
            toast.error("Couldn't record the movement.");
        }
        finally {
            setCashSaving(false);
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs(BizPageHeader, { title: "Other Investment Assets", subtitle: "Money market funds, SACCO deposits vs share capital, and government securities. SACCO deposits and share capital are tracked separately \u2014 their liquidity and returns differ.", children: [_jsx(Button, { onClick: () => setCashOpen(true), children: "Record deposit / withdrawal" }), _jsxs(Button, { variant: "outline", onClick: () => setOpen(true), children: [_jsx(Plus, { className: "size-4" }), " Add asset"] })] }), _jsx("p", { className: "text-muted-foreground text-xs", children: "Performance comes only from recorded deposits, withdrawals and distributions \u2014 no fixed hypothetical rate is applied anywhere." }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [fundAssets.map((asset) => (_jsxs("div", { className: "surface-card flex flex-col gap-2 rounded-xl border p-4", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: asset.name }), _jsx("p", { className: "text-muted-foreground text-xs", children: ASSET_CLASSES.find((c) => c.value === asset.assetClass)?.label ?? asset.assetClass })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => {
                                            setCashSecurity(asset._id);
                                            setCashKind("interest");
                                            setCashOpen(true);
                                        }, children: "Record distribution" })] }), _jsxs("div", { className: "text-muted-foreground text-xs", children: ["Latest valuation:", " ", asset.latestPrice
                                        ? `${formatMoney(asset.latestPrice.priceCents)} (${asset.latestPrice.source}, ${formatShortDate(asset.latestPrice.recordedAt)})`
                                        : "no valuation entered yet"] })] }, asset._id))), fundAssets.length === 0 && (_jsx("div", { className: "text-muted-foreground surface-card rounded-xl border p-8 text-center text-sm sm:col-span-2", children: "No fund/SACCO/government assets yet \u2014 add one to start tracking deposits and terms." }))] }), _jsx(Dialog, { open: open, onOpenChange: setOpen, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Add investment asset" }) }), _jsxs("form", { onSubmit: handleCreate, className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "Asset type" }), _jsxs(Select, { value: assetClass, onValueChange: setAssetClass, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: ASSET_CLASSES.map((option) => (_jsx(SelectItem, { value: option.value, children: option.label }, option.value))) })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "asset-symbol", children: "Symbol / short code" }), _jsx(Input, { id: "asset-symbol", value: symbol, onChange: (event) => setSymbol(event.target.value), placeholder: "MMF1" })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "asset-qty", children: "Units" }), _jsx(Input, { id: "asset-qty", value: qty, onChange: (event) => setQty(event.target.value) })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "asset-name", children: "Name" }), _jsx(Input, { id: "asset-name", value: name, onChange: (event) => setName(event.target.value), placeholder: "CIC MMF" })] }), _jsx(DialogFooter, { children: _jsxs(Button, { type: "submit", disabled: saving, children: [saving && _jsx(Loader2, { className: "animate-spin" }), " Add asset"] }) })] })] }) }), _jsx(Dialog, { open: cashOpen, onOpenChange: setCashOpen, children: _jsxs(DialogContent, { className: "sm:max-w-sm", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Record cash movement" }) }), _jsxs("form", { onSubmit: handleCash, className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "Asset" }), _jsxs(Select, { value: cashSecurity, onValueChange: setCashSecurity, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Choose" }) }), _jsx(SelectContent, { children: fundAssets.map((asset) => (_jsx(SelectItem, { value: asset._id, children: asset.symbol }, asset._id))) })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { children: "Type" }), _jsxs(Select, { value: cashKind, onValueChange: setCashKind, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "contribution", children: "Deposit" }), _jsx(SelectItem, { value: "withdrawal", children: "Withdrawal" }), _jsx(SelectItem, { value: "interest", children: "Distribution / interest" }), _jsx(SelectItem, { value: "fee", children: "Fee" })] })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Label, { htmlFor: "cash-amount", children: "Amount (KSh)" }), _jsx(Input, { id: "cash-amount", inputMode: "decimal", value: cashAmount, onChange: (event) => setCashAmount(event.target.value) })] }), _jsx(DialogFooter, { children: _jsxs(Button, { type: "submit", disabled: cashSaving, children: [cashSaving && _jsx(Loader2, { className: "animate-spin" }), " Record"] }) })] })] }) })] }));
}
