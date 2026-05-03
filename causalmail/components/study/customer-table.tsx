"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateRevenue } from "@/actions/customers";
import { toast } from "sonner";
import type { Customer } from "@prisma/client";

type Props = {
  customers: Customer[];
  editable?: boolean;
};

export function CustomerTable({ customers, editable = false }: Props) {
  const treatment = customers.filter((c) => c.group === "TREATMENT");
  const control = customers.filter((c) => c.group === "CONTROL");
  const hasBaseline = customers.some((c) => c.baselineRevenue !== null);

  return (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All ({customers.length})</TabsTrigger>
        <TabsTrigger value="treatment">Treatment ({treatment.length})</TabsTrigger>
        <TabsTrigger value="control">Control ({control.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="all" className="mt-4">
        <CustomerRows customers={customers} editable={editable} hasBaseline={hasBaseline} />
      </TabsContent>
      <TabsContent value="treatment" className="mt-4">
        <CustomerRows customers={treatment} editable={editable} hasBaseline={hasBaseline} showEngagement />
      </TabsContent>
      <TabsContent value="control" className="mt-4">
        <CustomerRows customers={control} editable={editable} hasBaseline={hasBaseline} />
      </TabsContent>
    </Tabs>
  );
}

function CustomerRows({
  customers,
  editable,
  hasBaseline,
  showEngagement = false,
}: {
  customers: Customer[];
  editable: boolean;
  hasBaseline: boolean;
  showEngagement?: boolean;
}) {
  const colSpan = 3 + (hasBaseline ? 1 : 0) + (showEngagement ? 1 : 0);

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Group</TableHead>
            {hasBaseline && <TableHead className="text-right">Baseline revenue</TableHead>}
            <TableHead className="w-32 text-right">Revenue</TableHead>
            {showEngagement && <TableHead className="text-right">Email status</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-8">
                No customers.
              </TableCell>
            </TableRow>
          ) : (
            customers.map((c) => (
              <CustomerRow
                key={c.id}
                customer={c}
                editable={editable}
                hasBaseline={hasBaseline}
                showEngagement={showEngagement}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function CustomerRow({
  customer,
  editable,
  hasBaseline,
  showEngagement,
}: {
  customer: Customer;
  editable: boolean;
  hasBaseline: boolean;
  showEngagement: boolean;
}) {
  const [localRevenue, setLocalRevenue] = useState(
    customer.revenue !== null ? String(customer.revenue) : ""
  );
  const [, startTransition] = useTransition();

  function handleBlur() {
    const val = localRevenue.trim();
    const parsed = val === "" ? null : parseFloat(val);
    if (val !== "" && (isNaN(parsed!) || parsed! < 0)) {
      toast.error("Please enter a valid revenue amount.");
      setLocalRevenue(customer.revenue !== null ? String(customer.revenue) : "");
      return;
    }
    startTransition(async () => {
      try {
        await updateRevenue(customer.id, parsed);
      } catch {
        toast.error("Failed to save revenue.");
      }
    });
  }

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return (
    <TableRow>
      <TableCell className="font-mono text-sm">{customer.email}</TableCell>
      <TableCell>
        <Badge variant={customer.group === "TREATMENT" ? "default" : "secondary"}>
          {customer.group === "TREATMENT" ? "Treatment" : "Control"}
        </Badge>
      </TableCell>
      {hasBaseline && (
        <TableCell className="text-right text-sm text-muted-foreground">
          {customer.baselineRevenue !== null ? fmtCurrency(customer.baselineRevenue) : "—"}
        </TableCell>
      )}
      <TableCell className="text-right">
        {editable ? (
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={localRevenue}
            onChange={(e) => setLocalRevenue(e.target.value)}
            onBlur={handleBlur}
            className="w-24 rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        ) : (
          <span className="text-sm">
            {customer.revenue !== null ? fmtCurrency(customer.revenue) : "—"}
          </span>
        )}
      </TableCell>
      {showEngagement && (
        <TableCell className="text-right">
          <div className="flex gap-1 justify-end flex-wrap">
            {customer.emailSentAt && (
              <Badge variant="outline" className="text-xs">Sent</Badge>
            )}
            {customer.emailOpenedAt && (
              <Badge variant="secondary" className="text-xs">Opened</Badge>
            )}
            {customer.emailClickedAt && (
              <Badge variant="default" className="text-xs">Clicked</Badge>
            )}
            {customer.emailBounced && (
              <Badge variant="destructive" className="text-xs">Bounced</Badge>
            )}
            {!customer.emailSentAt && !customer.emailBounced && (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}
