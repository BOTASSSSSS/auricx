"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { MarketType, MarketStatus, CS2_TEAMS } from "@/lib/types";
import { X } from "lucide-react";

interface CreateMarketDialogProps {
  open: boolean;
  onClose: () => void;
}

const ASSET_OPTIONS = [
  { id: "ak47-redline", label: "AK-47 Redline" },
  { id: "awp-asiimov", label: "AWP Asiimov" },
  { id: "m9-doppler", label: "M9 Bayonet Doppler" },
  { id: "vice-gloves", label: "Sport Gloves Vice" },
  { id: "butterfly-fade", label: "Butterfly Knife Fade" },
  { id: "m4a1-printstream", label: "M4A1-S Printstream" },
  { id: "__custom__", label: "Custom…" },
];

const TEAM_OPTIONS = [
  ...CS2_TEAMS.map((t) => ({ id: t.id, label: t.name })),
  { id: "__custom__", label: "Custom…" },
];

const MARKET_TYPES: [MarketType, string][] = [
  ["binary", "Binary (Yes/No)"],
  ["perp_index", "Perp Index"],
  ["prediction_winner", "Winner"],
  ["prediction_overunder", "Over/Under"],
];

export function CreateMarketDialog({ open, onClose }: CreateMarketDialogProps) {
  const { addMarket } = useStore();
  const { toast } = useToast();
  const [type, setType] = useState<MarketType>("binary");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiresHours, setExpiresHours] = useState(48);
  const [assetId, setAssetId] = useState("ak47-redline");
  const [customAsset, setCustomAsset] = useState("");
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [customTeamA, setCustomTeamA] = useState("");
  const [customTeamB, setCustomTeamB] = useState("");
  const [status, setStatus] = useState<MarketStatus>("active");

  if (!open) return null;

  const isBinary = type === "binary" || type === "prediction_winner" || type === "prediction_overunder";
  const isPerp = type === "perp_index";

  const resolvedTeamA = teamA === "__custom__" ? customTeamA : CS2_TEAMS.find((t) => t.id === teamA)?.name || "";
  const resolvedTeamB = teamB === "__custom__" ? customTeamB : CS2_TEAMS.find((t) => t.id === teamB)?.name || "";
  const resolvedAsset = assetId === "__custom__" ? customAsset : assetId;

  const handleCreate = () => {
    if (!title.trim()) {
      toast("Title is required", "error");
      return;
    }

    const teamALogo = teamA !== "__custom__" ? CS2_TEAMS.find((t) => t.id === teamA)?.logo : undefined;

    addMarket({
      type,
      title: title.trim(),
      description: description.trim(),
      status,
      expiresAt: Date.now() + expiresHours * 60 * 60 * 1000,
      ...(isPerp
        ? { assetId: resolvedAsset }
        : {
            odds: {
              yes: parseFloat((1.5 + Math.random() * 1.0).toFixed(2)),
              no: parseFloat((1.5 + Math.random() * 1.0).toFixed(2)),
            },
            outcome: null,
            ...(resolvedTeamA && { teamA: resolvedTeamA }),
            ...(resolvedTeamB && { teamB: resolvedTeamB }),
            ...(teamALogo && { iconPath: teamALogo }),
          }),
    });

    toast("Market created!", "success");
    setTitle("");
    setDescription("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-white">
          <X size={20} />
        </button>

        <h2 className="text-lg font-bold mb-5">Create Market</h2>

        <div className="space-y-4">
          {/* Type */}
          <div>
            <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {MARKET_TYPES.map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setType(val)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${
                    type === val
                      ? "bg-accent/20 text-accent border border-accent/40"
                      : "bg-card border border-border text-muted hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isBinary ? "e.g. NAVI vs FaZe — Winner" : "e.g. AK-47 Redline Index"}
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief description..."
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent/50 resize-none"
            />
          </div>

          {/* Teams (for binary) */}
          {isBinary && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">Team A (YES)</label>
                <select
                  value={teamA}
                  onChange={(e) => setTeamA(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50"
                >
                  <option value="">— None —</option>
                  {TEAM_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                {teamA === "__custom__" && (
                  <input
                    value={customTeamA}
                    onChange={(e) => setCustomTeamA(e.target.value)}
                    placeholder="Team name"
                    className="w-full mt-1 bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
                  />
                )}
              </div>
              <div>
                <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">Team B (NO)</label>
                <select
                  value={teamB}
                  onChange={(e) => setTeamB(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50"
                >
                  <option value="">— None —</option>
                  {TEAM_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                {teamB === "__custom__" && (
                  <input
                    value={customTeamB}
                    onChange={(e) => setCustomTeamB(e.target.value)}
                    placeholder="Team name"
                    className="w-full mt-1 bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
                  />
                )}
              </div>
            </div>
          )}

          {/* Asset (for perps) */}
          {isPerp && (
            <div>
              <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">Asset</label>
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50"
              >
                {ASSET_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              {assetId === "__custom__" && (
                <input
                  value={customAsset}
                  onChange={(e) => setCustomAsset(e.target.value)}
                  placeholder="Custom asset ID (e.g. my-skin-index)"
                  className="w-full mt-1 bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
                />
              )}
            </div>
          )}

          {/* Status + Expiration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">Status</label>
              <div className="flex gap-2">
                {(["active", "upcoming"] as MarketStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      status === s
                        ? "bg-accent/20 text-accent border border-accent/40"
                        : "bg-card border border-border text-muted hover:text-white"
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider mb-1.5 block">
                Expires In (h)
              </label>
              <input
                type="number"
                value={expiresHours}
                onChange={(e) => setExpiresHours(Number(e.target.value))}
                min={1}
                className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50"
              />
            </div>
          </div>

          <button onClick={handleCreate} className="btn-primary w-full mt-2">
            Create Market
          </button>
        </div>
      </div>
    </div>
  );
}
