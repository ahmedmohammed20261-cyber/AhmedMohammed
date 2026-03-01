import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, DollarSign, TrendingUp, AlertCircle, CheckCircle, Globe } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import HelpButton from '../components/HelpButton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function Dashboard() {
  const [statsByCurrency, setStatsByCurrency] = useState<Record<string, any>>({});
  const [chartDataByCurrency, setChartDataByCurrency] = useState<Record<string, any>>({});
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(['SAR']);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('SAR');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch all contracts to get their currencies and dates
        const { data: contracts } = await supabase
          .from('contracts')
          .select('id, currency, status, contract_date');

        // Fetch all contract items
        const { data: items } = await supabase
          .from('contract_items')
          .select('contract_id, quantity, sale_price');

        // Fetch all purchases
        const { data: purchases } = await supabase
          .from('contract_purchases')
          .select('contract_id, quantity, purchase_price, purchase_date');

        // Fetch all expenses
        const { data: expenses } = await supabase
          .from('contract_expenses')
          .select('contract_id, amount, expense_date');

        // Fetch all payments
        const { data: payments } = await supabase
          .from('payments')
          .select('contract_id, amount, payment_date');

        const grouped: Record<string, any> = {};
        const charts: Record<string, any> = {};

        if (contracts) {
          contracts.forEach(c => {
            const curr = c.currency || 'SAR';
            if (!grouped[curr]) {
              grouped[curr] = { totalContracts: 0, totalValue: 0, totalCost: 0, totalReceived: 0 };
              charts[curr] = { statusData: {}, monthlyData: {} };
            }
            grouped[curr].totalContracts += 1;
            
            // Status Chart Data
            const status = c.status || 'new';
            charts[curr].statusData[status] = (charts[curr].statusData[status] || 0) + 1;
          });
        }

        if (items && contracts) {
          items.forEach(item => {
            const contract = contracts.find(c => c.id === item.contract_id);
            if (contract) {
              const curr = contract.currency || 'SAR';
              const value = (item.quantity * item.sale_price);
              
              grouped[curr].totalValue += value;

              // Monthly Revenue Data (based on contract date)
              if (contract.contract_date) {
                const month = format(parseISO(contract.contract_date), 'MMM yyyy', { locale: ar });
                if (!charts[curr].monthlyData[month]) {
                  charts[curr].monthlyData[month] = { name: month, الإيرادات: 0, التكاليف: 0 };
                }
                charts[curr].monthlyData[month].الإيرادات += value;
              }
            }
          });
        }

        if (purchases && contracts) {
          purchases.forEach(purchase => {
            const contract = contracts.find(c => c.id === purchase.contract_id);
            if (contract) {
              const curr = contract.currency || 'SAR';
              const cost = (purchase.quantity * purchase.purchase_price);
              
              grouped[curr].totalCost += cost;

              // Monthly Cost Data (based on purchase date)
              if (purchase.purchase_date) {
                const month = format(parseISO(purchase.purchase_date), 'MMM yyyy', { locale: ar });
                if (!charts[curr].monthlyData[month]) {
                  charts[curr].monthlyData[month] = { name: month, الإيرادات: 0, التكاليف: 0 };
                }
                charts[curr].monthlyData[month].التكاليف += cost;
              }
            }
          });
        }

        if (expenses && contracts) {
          expenses.forEach(expense => {
            const contract = contracts.find(c => c.id === expense.contract_id);
            if (contract) {
              const curr = contract.currency || 'SAR';
              
              grouped[curr].totalCost += expense.amount;

              // Monthly Cost Data (based on expense date)
              if (expense.expense_date) {
                const month = format(parseISO(expense.expense_date), 'MMM yyyy', { locale: ar });
                if (!charts[curr].monthlyData[month]) {
                  charts[curr].monthlyData[month] = { name: month, الإيرادات: 0, التكاليف: 0 };
                }
                charts[curr].monthlyData[month].التكاليف += expense.amount;
              }
            }
          });
        }

        if (payments && contracts) {
          payments.forEach(payment => {
            const contract = contracts.find(c => c.id === payment.contract_id);
            if (contract) {
              const curr = contract.currency || 'SAR';
              grouped[curr].totalReceived += payment.amount;
            }
          });
        }

        // Calculate derived stats and format chart data
        Object.keys(grouped).forEach(curr => {
          grouped[curr].totalProfit = grouped[curr].totalValue - grouped[curr].totalCost;
          grouped[curr].remainingAmount = grouped[curr].totalValue - grouped[curr].totalReceived;
          
          // Format Status Data
          const statusMap: Record<string, string> = {
            'new': 'جديد',
            'in_progress': 'قيد التنفيذ',
            'completed': 'مكتمل',
            'paid': 'مدفوع'
          };
          
          charts[curr].formattedStatusData = Object.keys(charts[curr].statusData).map(key => ({
            name: statusMap[key] || key,
            value: charts[curr].statusData[key]
          }));

          // Format Monthly Data
          charts[curr].formattedMonthlyData = Object.values(charts[curr].monthlyData);
        });

        setStatsByCurrency(grouped);
        setChartDataByCurrency(charts);
        
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
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">لوحة القيادة</h1>
            <p className="text-sm text-gray-500 mt-1">نظرة عامة على أعمال المقاولات الخاصة بك</p>
          </div>
          <HelpButton 
            title="لوحة القيادة"
            content={
              <div className="space-y-4">
                <p>هذه الشاشة تقدم لك نظرة عامة سريعة وشاملة على حالة أعمالك ومشاريعك.</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>إجمالي العقود:</strong> يعرض عدد العقود المسجلة في النظام للعملة المحددة.</li>
                  <li><strong>القيمة الإجمالية للعقود:</strong> مجموع قيمة جميع العقود (سعر البيع × الكمية).</li>
                  <li><strong>إجمالي المقبوضات:</strong> المبالغ التي تم تحصيلها فعلياً من العملاء.</li>
                  <li><strong>المبلغ المتبقي:</strong> المبالغ المتبقية التي لم يتم تحصيلها بعد (القيمة الإجمالية - المقبوضات).</li>
                  <li><strong>إجمالي الربح:</strong> الأرباح المتوقعة (القيمة الإجمالية - إجمالي التكلفة).</li>
                </ul>
                <p>يمكنك تغيير العملة من القائمة المنسدلة في الأعلى لعرض الإحصائيات الخاصة بكل عملة على حدة.</p>
              </div>
            }
          />
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

      {/* Charts Section */}
      {chartDataByCurrency[selectedCurrency] && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Monthly Revenue vs Cost */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">الإيرادات والتكاليف الشهرية</h3>
            <div className="h-80" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartDataByCurrency[selectedCurrency].formattedMonthlyData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} tickFormatter={(value) => `${value}`} />
                  <Tooltip 
                    cursor={{ fill: '#F3F4F6' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="الإيرادات" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="التكاليف" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Contracts by Status */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">حالة العقود</h3>
            <div className="h-80" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartDataByCurrency[selectedCurrency].formattedStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartDataByCurrency[selectedCurrency].formattedStatusData.map((entry: any, index: number) => {
                      const colors = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
