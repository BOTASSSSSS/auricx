"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { X } from "lucide-react";

interface DepositDialogProps {
  open: boolean;
  onClose: () => void;
  mode: "eth" | "skin";
}

const SKIN_OPTIONS = [
  { id: "ak47-redline", label: "AK-47 Redline" },
  { id: "awp-asiimov", label: "AWP Asiimov" },
  { id: "m9-doppler", label: "M9 Bayonet Doppler" },
  { id: "vice-gloves", label: "Sport Gloves Vice" },
  { id: "butterfly-fade", label: "Butterfly Knife Fade" },
  { id: "m4a1-printstream", label: "M4A1-S Printstream" },
];

export function DepositDialog({ open, onClose, mode }: DepositDialogProps) {
  const { depositETH, depositSkin } = useStore();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [assetId, setAssetId] = useState("ak47-redline");

  if (!open) return null;

  const handleDeposit = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;
    if (mode === "eth") {
      depositETH(val);
      toast(`Deposited ${val.toFixed(4)} ETH`, "success");
    } else {
      depositSkin(assetId, Math.floor(val));
      toast(`Deposited ${Math.floor(val)} skin tokens`, "success");
    }
    setAmount("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-white">
          <X size={20} />
        </button>

        <h2 className="text-lg font-bold mb-4">
          {mode === "eth" ? "Deposit ETH" : "Deposit Skin Token"}
        </h2>

        <div className="space-y-4">
          {mode === "skin" && (
            <div>
              <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">
                Skin Token
              </label>
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50"
              >
                {SKIN_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">
              Amount {mode === "eth" ? "(ETH)" : "(units)"}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={0}
              step={mode === "eth" ? "0.01" : "1"}
              placeholder="0.00"
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50"
            />
          </div>

          <button onClick={handleDeposit} className="btn-primary w-full">
            Deposit
          </button>

          <p className="text-[11px] text-muted text-center">
            Demo mode — tokens are simulated
          </p>
        </div>
      </div>
    </div>
  );
}
