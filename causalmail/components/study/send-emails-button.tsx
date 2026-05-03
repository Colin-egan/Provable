"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { sendEmails } from "@/actions/send-emails";

type Props = {
  studyId: string;
  treatmentCount: number;
};

export function SendEmailsButton({ studyId, treatmentCount }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await sendEmails(studyId);
        toast.success("Emails are sending!");
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Failed to send emails. Please try again.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" />}>
        Send Emails
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send emails to treatment group?</DialogTitle>
          <DialogDescription>
            This will send your email to{" "}
            <span className="font-semibold">{treatmentCount}</span> customers in
            the treatment group. The control group will not receive anything.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Sending…" : "Send Emails"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
