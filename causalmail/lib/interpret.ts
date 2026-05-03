import type { StudyResult } from "@prisma/client";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
}

export function interpretITT(result: StudyResult): string {
  const { ittEstimate, ittSignificant, ittCiLower, ittCiUpper } = result;
  if (ittEstimate === null || ittSignificant === null) return "";

  if (!ittSignificant) {
    return "We couldn't detect a clear effect. The email may have had too small an impact to measure with this sample size, or it may not have worked. Try a larger list or a stronger offer.";
  }

  if (ittEstimate > 0) {
    return `This email worked. It caused an estimated ${fmt(ittEstimate)} of additional revenue per customer (95% CI: ${fmt(ittCiLower!)} to ${fmt(ittCiUpper!)}).`;
  }

  return `This email was associated with an estimated ${fmt(ittEstimate)} decrease in revenue per customer (95% CI: ${fmt(ittCiLower!)} to ${fmt(ittCiUpper!)}). The negative effect is statistically significant.`;
}

export function interpretLATE(result: StudyResult): string {
  const { lateEstimate, lateCiLower, lateCiUpper, weakInstrument, firstStageF } =
    result;

  if (lateEstimate === null) return "";

  const ciExcludesZero =
    lateCiLower !== null &&
    lateCiUpper !== null &&
    (lateCiLower > 0 || lateCiUpper < 0);

  let prefix = "";
  if (weakInstrument) {
    prefix = `Note: The instrument is weak (F = ${firstStageF?.toFixed(1)}), so this estimate should be treated with caution. `;
  }

  if (!ciExcludesZero) {
    return `${prefix}We can't detect a reliable effect for engaged customers with this data.`;
  }

  if (lateEstimate > 0) {
    return `${prefix}For customers who engaged with your email, the estimated causal effect was ${fmt(lateEstimate)} per customer (95% CI: ${fmt(lateCiLower!)} to ${fmt(lateCiUpper!)}).`;
  }

  return `${prefix}For customers who engaged with your email, the estimated effect was a ${fmt(lateEstimate)} decrease in revenue per customer (95% CI: ${fmt(lateCiLower!)} to ${fmt(lateCiUpper!)}).`;
}

type StudyForInsights = {
  name: string;
  createdAt: Date;
  results: StudyResult | null;
};

export function interpretDashboardInsights(
  studies: StudyForInsights[]
): string[] {
  const completed = studies.filter(
    (s) => s.results?.ittEstimate !== null && s.results?.ittEstimate !== undefined
  );
  if (completed.length === 0) return [];

  const insights: string[] = [];

  const best = completed.reduce((a, b) =>
    (a.results!.ittEstimate ?? -Infinity) > (b.results!.ittEstimate ?? -Infinity)
      ? a
      : b
  );
  insights.push(
    `Your most effective campaign was "${best.name}" with an estimated ${fmt(best.results!.ittEstimate!)} effect per customer.`
  );

  if (completed.length >= 2) {
    const estimates = completed.map((s) => s.results!.ittEstimate!);
    const avg = estimates.reduce((a, b) => a + b, 0) / estimates.length;
    insights.push(
      `Your average causal effect across ${completed.length} completed studies is ${fmt(avg)} per customer.`
    );

    // Trend: simple linear regression of ITT estimate on campaign date
    const xs = completed.map((s) => s.createdAt.getTime());
    const ys = estimates;
    const n = xs.length;
    const xBar = xs.reduce((a, b) => a + b, 0) / n;
    const yBar = ys.reduce((a, b) => a + b, 0) / n;
    const numerator = xs.reduce((s, x, i) => s + (x - xBar) * (ys[i] - yBar), 0);
    const denominator = xs.reduce((s, x) => s + (x - xBar) ** 2, 0);
    const slope = denominator !== 0 ? numerator / denominator : 0;

    if (slope > 0) {
      insights.push(
        `Your email effectiveness has been trending upward across your last ${n} campaigns.`
      );
    } else if (slope < 0) {
      insights.push(
        `Your email effectiveness has been trending downward — consider testing new offers or audiences.`
      );
    }

    // Sample size recommendation (80% power, two-sided 5% test)
    const ses = completed
      .map((s) => s.results?.ittSe)
      .filter((se): se is number => se !== null && se !== undefined);
    if (ses.length > 0 && Math.abs(avg) > 0) {
      const avgVariance = ses.reduce((a, b) => a + b * b, 0) / ses.length;
      const n_rec = Math.ceil(
        ((1.96 + 0.84) ** 2 * 2 * avgVariance) / avg ** 2
      );
      insights.push(
        `Based on your typical effect sizes, you need at least ${n_rec.toLocaleString()} customers per group to reliably detect results.`
      );
    }
  }

  return insights;
}
