"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  totalCustomers: number;
  treatmentPct: number;
  outcomeWindowDays: number;
  onTreatmentPctChange: (v: number) => void;
  onOutcomeWindowChange: (v: number) => void;
  onComplete: () => void;
};

const OUTCOME_WINDOWS = [3, 7, 14, 30] as const;

export function StudyConfig({
  totalCustomers,
  treatmentPct,
  outcomeWindowDays,
  onTreatmentPctChange,
  onOutcomeWindowChange,
  onComplete,
}: Props) {
  const treatmentCount = Math.round(totalCustomers * treatmentPct);
  const controlCount = totalCustomers - treatmentCount;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Label>
          Treatment allocation —{" "}
          <span className="font-semibold">{Math.round(treatmentPct * 100)}%</span>
        </Label>
        <Slider
          min={10}
          max={90}
          step={5}
          value={[Math.round(treatmentPct * 100)]}
          onValueChange={(v) => {
            const val = Array.isArray(v) ? v[0] : (v as number);
            onTreatmentPctChange(val / 100);
          }}
        />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{treatmentCount}</span>{" "}
          customers will receive your email.{" "}
          <span className="font-medium text-foreground">{controlCount}</span>{" "}
          customers will be the control group and will not receive anything.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="outcome-window">Outcome window</Label>
        <Select
          value={String(outcomeWindowDays)}
          onValueChange={(v) => onOutcomeWindowChange(Number(v))}
        >
          <SelectTrigger id="outcome-window" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OUTCOME_WINDOWS.map((d) => (
              <SelectItem key={d} value={String(d)}>
                {d} days{d === 7 ? " (recommended)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          How long to wait after sending before calculating results. Choose
          based on how quickly your customers typically make purchases.
        </p>
      </div>

      <Button onClick={onComplete}>Continue →</Button>
    </div>
  );
}
