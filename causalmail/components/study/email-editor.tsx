"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  studyName: string;
  subject: string;
  body: string;
  onStudyNameChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onComplete: () => void;
};

export function EmailEditor({
  studyName,
  subject,
  body,
  onStudyNameChange,
  onSubjectChange,
  onBodyChange,
  onComplete,
}: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="study-name">Study name</Label>
        <Input
          id="study-name"
          placeholder="e.g. Q3 Re-engagement Campaign"
          value={studyName}
          onChange={(e) => onStudyNameChange(e.target.value)}
        />
      </div>

      <p className="text-sm text-muted-foreground bg-muted rounded-md px-4 py-3">
        This email will only be sent to the treatment group. The control group
        will not receive anything.
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="subject">Subject line</Label>
        <Input
          id="subject"
          placeholder="e.g. A special offer just for you"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="body">Email body</Label>
        <textarea
          id="body"
          rows={10}
          placeholder="Write your email here…"
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
        />
      </div>

      <Button
        onClick={onComplete}
        disabled={!studyName.trim() || !subject.trim() || !body.trim()}
      >
        Continue →
      </Button>
    </div>
  );
}
