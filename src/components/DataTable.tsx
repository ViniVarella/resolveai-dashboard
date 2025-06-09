import { Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';

interface DataTableProps {
  columns: string[];
  rows: Array<string[]>;
  loading?: boolean;
  emptyMessage?: string;
}

export default function DataTable({ columns, rows, loading, emptyMessage }: DataTableProps) {
  return (
    <Table sx={{ color: '#fff', borderCollapse: 'collapse', fontSize: 15 }}>
      <TableHead>
        <TableRow>
          {columns.map(col => (
            <TableCell key={col} sx={{ color: '#aaa', textAlign: 'left', padding: 4 }}>{col}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={columns.length} sx={{ padding: 12, textAlign: 'center' }}>Carregando...</TableCell>
          </TableRow>
        ) : rows.length > 0 ? (
          rows.map((row, idx) => (
            <TableRow key={idx} sx={{ borderTop: '1px solid #333' }}>
              {row.map((cell, i) => (
                <TableCell key={i} sx={{ padding: 4 }}>{cell}</TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} sx={{ padding: 12, textAlign: 'center' }}>
              {emptyMessage || 'Nenhum dado para exibir'}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
} 