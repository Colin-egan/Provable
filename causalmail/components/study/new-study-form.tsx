"use client";

import { useState } from "react";
import { CsvUpload } from "./csv-upload";
import { BaselineSetup } from "./baseline-setup";
import { EmailEditor } from "./email-editor";
import { StudyConfig } from "./study-config";
import { StudyReview } from "./study-review";
import type { CustomerInput } from "@/lib/randomize";

const STEPS = ["Upload list", "Baseline data", "Write email", "Configure", "Review"] as const;

type FormData = {
  customers: CustomerInput[];
  emailSubject: string;
  emailBody: string;
  studyName: string;
  treatmentPct: number;
  outcomeWindowDays: number;
};

export function NewStudyForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    customers: [],
    emailSubject: "",
    emailBody: "",
    studyName: "",
    treatmentPct: 0.5,
    outcomeWindowDays: 7,
  });

  function patch<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-sm ${i === step ? "font-medium" : "text-muted-foreground"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 0 && (
        <CsvUpload
          onComplete={(customers) => {
            patch("customers", customers);
            setStep(1);
          }}
        />
      )}

      {step === 1 && (
        <BaselineSetup
          customers={form.customers}
          onComplete={(customers) => {
            patch("customers", customers);
            setStep(2);
          }}
        />
      )}

      {step === 2 && (
        <EmailEditor
          studyName={form.studyName}
          subject={form.emailSubject}
          body={form.emailBody}
          onStudyNameChange={(v) => patch("studyName", v)}
          onSubjectChange={(v) => patch("emailSubject", v)}
          onBodyChange={(v) => patch("emailBody", v)}
          onComplete={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <StudyConfig
          totalCustomers={form.customers.length}
          treatmentPct={form.treatmentPct}
          outcomeWindowDays={form.outcomeWindowDays}
          onTreatmentPctChange={(v) => patch("treatmentPct", v)}
          onOutcomeWindowChange={(v) => patch("outcomeWindowDays", v)}
          onComplete={() => setStep(4)}
        />
      )}

      {step === 4 && (
        <StudyReview
          customers={form.customers}
          emailSubject={form.emailSubject}
          emailBody={form.emailBody}
          studyName={form.studyName}
          treatmentPct={form.treatmentPct}
          outcomeWindowDays={form.outcomeWindowDays}
        />
      )}
    </div>
  );
}
