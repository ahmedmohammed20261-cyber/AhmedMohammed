import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, DollarSign, TrendingUp, AlertCircle, CheckCircle, Globe } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

export default function Dashboard() {
  const [statsByCurrency, setStatsByCurrency] = useState<Record<string, any>>({});
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(['SAR']);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('SAR');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch all contracts to get their currencies
        const { data: contracts } = await supabase
          .from('contracts')
          .select('id, currency');

        // Fetch all contract items
        const { data: items } = await supabase
          .from('contract_items')
          .select('contract_id, quantity, sale_price, purchase_price');

        // Fetch all payments
        const { data: payments } = await supabase
          .from('payments')
          .select('contract_id, amount');

        const grouped: Record<string, any> = {};

        if (contracts) {
          contracts.forEach(c => {
            const curr = c.currency || 'SAR';
            if (!grouped[curr]) {
              grouped[curr] = { totalContracts: 0, totalValue: 0, totalCost: 0, totalReceived: 0 };
            }
            grouped[curr].totalContracts += 1;
          });
        }

        if (items && contracts) {
          items.forEach(item => {
            const contract = contracts.find(c => c.id === item.contract_id);
            if (contract) {
              const curr = contract.currency || 'SAR';
              if (!grouped[curr]) grouped[curr] = { totalContracts: 0, totalValue: 0, totalCost: 0, totalReceived: 0 };
              grouped[curr].totalValue += (item.quantity * item.sale_price);
              grouped[curr].totalCost += (item.quantity * item.purchase_price);
            }
          });
        }

        if (payments && contracts) {
          payments.forEach(payment => {
            const contract = contracts.find(c => c.id === payment.contract_id);
            if (contract) {
              const curr = contract.currency || 'SAR';
              if (!grouped[curr]) grouped[curr] = { totalContracts: 0, totalValue: 0, totalCost: 0, totalReceived: 0 };
              grouped[curr].totalReceived += payment.amount;
            }
          });
        }

        // Calculate derived stats
        Object.keys(grouped).forEach(curr => {
          grouped[curr].totalProfit = grouped[curr].totalValue - grouped[curr].totalCost;
          grouped[curr].remainingAmount = grouped[curr].totalValue - grouped[curr].totalReceived;
        });

        setStatsByCurrency(grouped);
        
        const currencies = Object.keys(grouped);
        if (currencies.length > 0) {
          setAvailableCurrencies(currencies);
          if (!currencies.includes(selectedCurrency)) {
            setSelectedCurrency(currencies[0]);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  const currentStats = statsByCurrency[selectedCurrency] || {
    totalContracts: 0,
    totalValue: 0,
    totalReceived: 0,
    remainingAmount: 0,
    totalProfit: 0,
  };

  const statCards = [
    {
      title: 'إجمالي العقود',
      value: currentStats.totalContracts.toString(),
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      title: 'القيمة الإجمالية للعقود',
      value: formatCurrency(currentStats.totalValue, selectedCurrency),
      icon: DollarSign,
      color: 'bg-indigo-500',
    },
    {
      title: 'إجمالي المقبوضات',
      value: formatCurrency(currentStats.totalReceived, selectedCurrency),
      icon: CheckCircle,
      color: 'bg-emerald-500',
    },
    {
      title: 'المبلغ المتبقي',
      value: formatCurrency(currentStats.remainingAmount, selectedCurrency),
      icon: AlertCircle,
      color: 'bg-amber-500',
    },
    {
      title: 'إجمالي الربح',
      value: formatCurrency(currentStats.totalProfit, selectedCurrency),
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">لوحة القيادة</h1>
          <p className="text-sm text-gray-500 mt-1">نظرة عامة على أعمال المقاولات الخاصة بك</p>
        </div>
        
        {availableCurrencies.length > 0 && (
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            <Globe className="w-4 h-4 text-gray-400 ml-2 mr-1" />
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 py-1 pr-2 pl-6 cursor-pointer"
            >
              {availableCurrencies.map(curr => (
                <option key={curr} value={curr}>العملة: {curr}</option>
              ))}
            </select>
          </div>
        )}
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
