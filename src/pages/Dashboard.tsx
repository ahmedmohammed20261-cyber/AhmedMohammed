import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, DollarSign, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalContracts: 0,
    totalValue: 0,
    totalReceived: 0,
    remainingAmount: 0,
    totalProfit: 0,
    loading: true,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch total contracts
        const { count: contractsCount } = await supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true });

        // Fetch contract items for total value and profit
        const { data: items } = await supabase
          .from('contract_items')
          .select('quantity, sale_price, purchase_price');

        let totalValue = 0;
        let totalCost = 0;

        if (items) {
          items.forEach((item) => {
            totalValue += item.quantity * item.sale_price;
            totalCost += item.quantity * item.purchase_price;
          });
        }

        const totalProfit = totalValue - totalCost;

        // Fetch total payments received
        const { data: payments } = await supabase
          .from('payments')
          .select('amount');

        let totalReceived = 0;
        if (payments) {
          payments.forEach((payment) => {
            totalReceived += payment.amount;
          });
        }

        const remainingAmount = totalValue - totalReceived;

        setStats({
          totalContracts: contractsCount || 0,
          totalValue,
          totalReceived,
          remainingAmount,
          totalProfit,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    }

    fetchStats();
  }, []);

  if (stats.loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const statCards = [
    {
      title: 'إجمالي العقود',
      value: stats.totalContracts.toString(),
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      title: 'القيمة الإجمالية للعقود',
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      color: 'bg-indigo-500',
    },
    {
      title: 'إجمالي المقبوضات',
      value: formatCurrency(stats.totalReceived),
      icon: CheckCircle,
      color: 'bg-emerald-500',
    },
    {
      title: 'المبلغ المتبقي',
      value: formatCurrency(stats.remainingAmount),
      icon: AlertCircle,
      color: 'bg-amber-500',
    },
    {
      title: 'إجمالي الربح',
      value: formatCurrency(stats.totalProfit),
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">لوحة القيادة</h1>
        <p className="text-sm text-gray-500 mt-1">نظرة عامة على أعمال المقاولات الخاصة بك</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}>
                <Icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
