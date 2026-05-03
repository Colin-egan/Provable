import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <main className="flex flex-col flex-1">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <Badge variant="secondary" className="mb-6">
          Free during beta
        </Badge>
        <h1 className="text-5xl font-bold tracking-tight text-foreground mb-4 max-w-2xl">
          Find out if your emails actually cause sales.
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground mb-10">
          Upload your customer list, send an email to a random half, and
          we&apos;ll tell you exactly how much revenue it caused — not just who
          clicked.
        </p>
        <Link
          href="/signup"
          className={cn(buttonVariants({ size: "lg" }))}
        >
          Start Your First Study
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
            Sign in
          </Link>
        </p>
      </section>

      {/* How it works */}
      <section className="border-t bg-muted/40 px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">
            How it works
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Upload",
                description:
                  "Upload your customer list as a CSV. We'll validate emails and remove duplicates automatically.",
              },
              {
                step: "2",
                title: "Send",
                description:
                  "We randomly assign customers to treatment and control. Send your email to the treatment group.",
              },
              {
                step: "3",
                title: "Learn",
                description:
                  "After your outcome window closes, enter revenue and get a plain-English causal estimate.",
              },
            ].map(({ step, title, description }) => (
              <div key={step} className="flex flex-col items-center text-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                  {step}
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample results card */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">
            What the output looks like
          </h2>
          <p className="text-center text-muted-foreground mb-10 text-sm">
            Plain English. No econometrics required.
          </p>
          <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-green-900 dark:text-green-100">
                ITT Effect{" "}
                <span className="text-xs font-normal opacity-70">
                  (effect of sending)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-4xl font-bold text-green-900 dark:text-green-100">
                +$14.82
              </p>
              <p className="text-xs text-green-800 dark:text-green-200 opacity-80">
                95% CI: $8.40 to $21.24
              </p>
              <div className="flex items-center gap-2">
                <Badge>Significant</Badge>
                <span className="text-xs opacity-70">p = 0.001</span>
              </div>
              <p className="text-sm text-green-900 dark:text-green-100">
                This email worked. It caused an estimated $14.82 of additional
                revenue per customer (95% CI: $8.40 to $21.24).
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
