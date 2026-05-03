export type CustomerInput = {
  email: string;
  externalId?: string | null;
};

export type RandomizedCustomer = CustomerInput & {
  group: "TREATMENT" | "CONTROL";
};

export function randomizeCustomers(
  customers: CustomerInput[],
  treatmentPct: number
): RandomizedCustomer[] {
  const shuffled = [...customers];

  // Fisher-Yates with crypto.getRandomValues for proper randomness
  for (let i = shuffled.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const j = buf[0] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const treatmentCount = Math.round(shuffled.length * treatmentPct);

  return shuffled.map((c, i) => ({
    ...c,
    group: i < treatmentCount ? ("TREATMENT" as const) : ("CONTROL" as const),
  }));
}
