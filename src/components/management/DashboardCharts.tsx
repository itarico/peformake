import { memo } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts';

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const RevenueHistoryChart = memo(({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
      <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} />
      <YAxis fontSize={9} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
      <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ fontSize: '11px', borderRadius: '4px' }} />
      <Area type="monotone" dataKey="receita" stroke="hsl(var(--primary))" fillOpacity={0.05} fill="hsl(var(--primary))" strokeWidth={1.5} />
      <Area type="monotone" dataKey="lucro" stroke="hsl(var(--success))" fillOpacity={0.05} fill="hsl(var(--success))" strokeWidth={1.5} />
      <Area type="monotone" dataKey="custos" stroke="hsl(var(--destructive))" fillOpacity={0.05} fill="hsl(var(--destructive))" strokeWidth={1.5} />
    </AreaChart>
  </ResponsiveContainer>
));

export const RetentionTrendChart = memo(({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
      <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
      <YAxis fontSize={10} axisLine={false} tickLine={false} />
      <Tooltip />
      <Legend verticalAlign="top" height={36}/>
      <Bar dataKey="churn" name="Churn (Perda)" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
      <Bar dataKey="clientes" name="Ativos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
));

export const DistributionPieChart = memo(({ data, colors }: { data: any[], colors: string[] }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie 
        data={data} 
        dataKey="value" 
        nameKey="name" 
        cx="50%" 
        cy="50%" 
        outerRadius={80} 
        fill="#8884d8" 
        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
      >
        {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
      </Pie>
      <Tooltip formatter={(v: any) => typeof v === 'number' ? fmt(v) : v} />
    </PieChart>
  </ResponsiveContainer>
));
