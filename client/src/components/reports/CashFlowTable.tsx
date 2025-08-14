import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";

// Define the data structure for cash flow
interface CashFlowData {
  month: number;
  baseAmount: number;
  correction: number;
  correctedAmount: number;
  bonusPayment: number;
  totalAmount: number;
}

interface CashFlowTableProps {
  data: CashFlowData[];
}

export default function CashFlowTable({ data }: CashFlowTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead>Parcela Base</TableHead>
              <TableHead>Correção</TableHead>
              <TableHead>Valor Corrigido</TableHead>
              <TableHead>Reforço</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.month}</TableCell>
                <TableCell>{formatCurrency(item.baseAmount)}</TableCell>
                <TableCell>{formatCurrency(item.correction)}</TableCell>
                <TableCell>{formatCurrency(item.correctedAmount)}</TableCell>
                <TableCell>{formatCurrency(item.bonusPayment)}</TableCell>
                <TableCell className="font-medium">{formatCurrency(item.totalAmount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}