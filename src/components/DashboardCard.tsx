import { Paper } from '@mui/material';
import type { PaperProps } from '@mui/material';

export default function DashboardCard({ children, ...props }: PaperProps) {
  return (
    <Paper
      sx={{
        p: 4,
        background: '#222',
        color: '#fff',
        borderRadius: 4,
        minHeight: 320,
        width: '100%',
        boxShadow: '0 4px 24px #0006',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        ...props.sx,
      }}
      {...props}
    >
      {children}
    </Paper>
  );
} 