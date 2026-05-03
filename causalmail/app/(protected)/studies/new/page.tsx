import { NewStudyForm } from "@/components/study/new-study-form";

export default function NewStudyPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">New study</h1>
        <p className="text-muted-foreground mt-1">
          Upload your customer list, write your email, and we&apos;ll handle the
          randomization.
        </p>
      </div>
      <NewStudyForm />
    </div>
  );
}
