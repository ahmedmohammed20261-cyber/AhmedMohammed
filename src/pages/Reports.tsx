import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, TrendingUp, MapPin, DollarSign, Download } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import HelpButton from '../components/HelpButton';

export default function Reports() {
  const [activeReport, setActiveReport] = useState('profit');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [currency, setCurrency] = useState('SAR');
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(['SAR']);

  useEffect(() => {
    fetchCurrencies();
  }, []);

  useEffect(() => {
    if (activeReport === 'profit') {
      fetchProfitReport();
    } else if (activeReport === 'governorate') {
      fetchGovernorateReport();
    } else if (activeReport === 'balances') {
      fetchBalancesReport();
    }
  }, [activeReport, currency]);

  async function fetchCurrencies() {
    const { data } = await supabase.from('contracts').select('currency');
    if (data) {
      const currencies = Array.from(new Set(data.map(c => c.currency || 'SAR')));
      setAvailableCurrencies(currencies as string[]);
      if (currencies.length > 0 && !currencies.includes(currency)) {
        setCurrency(currencies[0] as string);
      }
    }
  }

  async function fetchProfitReport() {
    setLoading(true);
    try {
      const { data: contracts } = await supabase.from('contracts').select('id, contract_number, currency');
      const { data: items } = await supabase.from('contract_items').select('contract_id, quantity, sale_price');
      const { data: purchases } = await supabase.from('contract_purchases').select('contract_id, quantity, purchase_price');
      const { data: expenses } = await supabase.from('contract_expenses').select('contract_id, amount');

      if (!contracts) return;

      const reportData = contracts
        .filter(c => (c.currency || 'SAR') === currency)
        .map(contract => {
          const contractItems = items?.filter(i => i.contract_id === contract.id) || [];
          const contractPurchases = purchases?.filter(p => p.contract_id === contract.id) || [];
          const contractExpenses = expenses?.filter(e => e.contract_id === contract.id) || [];

          const revenue = contractItems.reduce((sum, item) => sum + (item.quantity * item.sale_price), 0);
          const purchasesCost = contractPurchases.reduce((sum, p) => sum + (p.quantity * p.purchase_price), 0);
          const expensesCost = contractExpenses.reduce((sum, e) => sum + e.amount, 0);
          const totalCost = purchasesCost + expensesCost;
          const profit = revenue - totalCost;

          return {
            id: contract.id,
            contract_number: contract.contract_number,
            revenue,
            totalCost,
            profit
          };
        });

      setData(reportData);
    } catch (error) {
      console.error('Error fetching profit report:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchGovernorateReport() {
    setLoading(true);
    try {
      const { data: contracts } = await supabase.from('contracts').select('id, governorate, branch, currency');
      const { data: items } = await supabase.from('contract_items').select('contract_id, quantity, sale_price');

      if (!contracts) return;

      const grouped: Record<string, any> = {};

      contracts
        .filter(c => (c.currency || 'SAR') === currency)
        .forEach(contract => {
          const key = `${contract.governorate} - ${contract.branch}`;
          if (!grouped[key]) {
            grouped[key] = { name: key, contractsCount: 0, totalValue: 0 };
          }
          
          grouped[key].contractsCount += 1;
          
          const contractItems = items?.filter(i => i.contract_id === contract.id) || [];
          const value = contractItems.reduce((sum, item) => sum + (item.quantity * item.sale_price), 0);
          grouped[key].totalValue += value;
        });

      setData(Object.values(grouped));
    } catch (error) {
      console.error('Error fetching governorate report:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBalancesReport() {
    setLoading(true);
    try {
      const { data: contracts } = await supabase.from('contracts').select('id, contract_number, currency');
      const { data: items } = await supabase.from('contract_items').select('contract_id, quantity, sale_price');
      const { data: payments } = await supabase.from('payments').select('contract_id, amount');

      if (!contracts) return;

      const reportData = contracts
        .filter(c => (c.currency || 'SAR') === currency)
        .map(contract => {
          const contractItems = items?.filter(i => i.contract_id === contract.id) || [];
          const contractPayments = payments?.filter(p => p.contract_id === contract.id) || [];

          const totalValue = contractItems.reduce((sum, item) => sum + (item.quantity * item.sale_price), 0);
          const totalReceived = contractPayments.reduce((sum, p) => sum + p.amount, 0);
          const remaining = totalValue - totalReceived;

          return {
            id: contract.id,
            contract_number: contract.contract_number,
            totalValue,
            totalReceived,
            remaining
          };
        });

      setData(reportData);
    } catch (error) {
      console.error('Error fetching balances report:', error);
    } finally {
      setLoading(false);
    }
  }

  const reports = [
    { id: 'profit', name: 'أرباح العقود', icon: TrendingUp, description: 'تحليل الإيرادات والتكاليف والأرباح لكل عقد' },
    { id: 'governorate', name: 'تقرير المحافظات والفروع', icon: MapPin, description: 'إجمالي حجم العمل موزعاً على المحافظات والفروع' },
    { id: 'balances', name: 'الأرصدة (ما لنا وما علينا)', icon: DollarSign, description: 'المبالغ المستحقة والمقبوضة والمتبقية لكل عقد' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">التقارير</h1>
            <p className="text-sm text-gray-500 mt-1">تقارير تفصيلية عن أداء أعمالك</p>
          </div>
          <HelpButton 
            title="التقارير"
            content={
              <div className="space-y-4">
                <p>هذه الشاشة توفر لك تقارير مالية وإدارية شاملة.</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>أرباح العقود:</strong> يعرض الإيرادات (سعر البيع) والتكاليف (المشتريات + المصاريف) وصافي الربح لكل عقد.</li>
                  <li><strong>تقرير المحافظات:</strong> يوضح حجم العمل (عدد العقود والقيمة الإجمالية) في كل محافظة وفرع.</li>
                  <li><strong>الأرصدة:</strong> يوضح المبالغ الإجمالية للعقود، ما تم قبضه، والمبالغ المتبقية التي لم تُحصل بعد.</li>
                </ul>
                <p>يمكنك تغيير العملة من القائمة المنسدلة لعرض التقارير الخاصة بكل عملة.</p>
              </div>
            }
          />
        </div>
        
        {availableCurrencies.length > 0 && (
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 py-1 pr-2 pl-6 cursor-pointer"
            >
              {availableCurrencies.map(curr => (
                <option key={curr} value={curr}>العملة: {curr}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reports.map((report) => {
          const Icon = report.icon;
          const isActive = activeReport === report.id;
          return (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={`text-right p-4 rounded-xl border transition-all ${
                isActive 
                  ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                  : 'bg-white border-gray-200 hover:border-indigo-100 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                  <Icon size={20} />
                </div>
                <h3 className={`font-semibold ${isActive ? 'text-indigo-900' : 'text-gray-900'}`}>{report.name}</h3>
              </div>
              <p className="text-sm text-gray-500">{report.description}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {reports.find(r => r.id === activeReport)?.name}
          </h3>
          <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50">
            <Download className="mr-2 h-4 w-4" />
            تصدير CSV
          </button>
        </div>
        
        <div className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
          ) : !data || data.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد بيانات</h3>
              <p className="mt-1 text-sm text-gray-500">لا تتوفر بيانات لهذا التقرير بالعملة المحددة.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                {activeReport === 'profit' && (
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم العقد</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإيرادات</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التكاليف</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الربح/الخسارة</th>
                  </tr>
                )}
                {activeReport === 'governorate' && (
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المحافظة - الفرع</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عدد العقود</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">القيمة الإجمالية</th>
                  </tr>
                )}
                {activeReport === 'balances' && (
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم العقد</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">قيمة العقد</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المقبوض</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المتبقي</th>
                  </tr>
                )}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeReport === 'profit' && data.map((row: any) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.contract_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(row.revenue, currency)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{formatCurrency(row.totalCost, currency)}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${row.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(row.profit, currency)}
                    </td>
                  </tr>
                ))}
                {activeReport === 'governorate' && data.map((row: any) => (
                  <tr key={row.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.contractsCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{formatCurrency(row.totalValue, currency)}</td>
                  </tr>
                ))}
                {activeReport === 'balances' && data.map((row: any) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.contract_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(row.totalValue, currency)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600">{formatCurrency(row.totalReceived, currency)}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${row.remaining > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                      {formatCurrency(row.remaining, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                {activeReport === 'profit' && (
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">الإجمالي</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatCurrency(data.reduce((s: number, r: any) => s + r.revenue, 0), currency)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">{formatCurrency(data.reduce((s: number, r: any) => s + r.totalCost, 0), currency)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">{formatCurrency(data.reduce((s: number, r: any) => s + r.profit, 0), currency)}</td>
                  </tr>
                )}
                {activeReport === 'governorate' && (
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">الإجمالي</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{data.reduce((s: number, r: any) => s + r.contractsCount, 0)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">{formatCurrency(data.reduce((s: number, r: any) => s + r.totalValue, 0), currency)}</td>
                  </tr>
                )}
                {activeReport === 'balances' && (
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">الإجمالي</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatCurrency(data.reduce((s: number, r: any) => s + r.totalValue, 0), currency)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">{formatCurrency(data.reduce((s: number, r: any) => s + r.totalReceived, 0), currency)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-amber-600">{formatCurrency(data.reduce((s: number, r: any) => s + r.remaining, 0), currency)}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
