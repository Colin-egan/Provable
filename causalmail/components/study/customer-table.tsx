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

  return (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All ({customers.length})</TabsTrigger>
        <TabsTrigger value="treatment">Treatment ({treatment.length})</TabsTrigger>
        <TabsTrigger value="control">Control ({control.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="all" className="mt-4">
        <CustomerRows customers={customers} editable={editable} />
      </TabsContent>
      <TabsContent value="treatment" className="mt-4">
        <CustomerRows customers={treatment} editable={editable} />
      </TabsContent>
      <TabsContent value="control" className="mt-4">
        <CustomerRows customers={control} editable={editable} />
      </TabsContent>
    </Tabs>
  );
}

function CustomerRows({
  customers,
  editable,
}: {
  customers: Customer[];
  editable: boolean;
}) {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Group</TableHead>
            <TableHead className="w-32">Revenue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                No customers.
              </TableCell>
            </TableRow>
          ) : (
            customers.map((c) => (
              <CustomerRow key={c.id} customer={c} editable={editable} />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function CustomerRow({ customer, editable }: { customer: Customer; editable: boolean }) {
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

  return (
    <TableRow>
      <TableCell className="font-mono text-sm">{customer.email}</TableCell>
      <TableCell>
        <Badge variant={customer.group === "TREATMENT" ? "default" : "secondary"}>
          {customer.group === "TREATMENT" ? "Treatment" : "Control"}
        </Badge>
      </TableCell>
      <TableCell>
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
            {customer.revenue !== null
              ? new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(customer.revenue)
              : "—"}
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}
