import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, Search, Filter } from 'lucide-react';
import { formatDate } from '../lib/utils';
import HelpButton from '../components/HelpButton';

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.entity_type.toLowerCase().includes(search.toLowerCase()) || 
                          log.action.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterType === 'ALL' || log.entity_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-emerald-600 bg-emerald-100';
      case 'UPDATE': return 'text-blue-600 bg-blue-100';
      case 'DELETE': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'CREATE': return 'إنشاء';
      case 'UPDATE': return 'تحديث';
      case 'DELETE': return 'حذف';
      default: return action;
    }
  };

  const getEntityText = (entity: string) => {
    switch (entity) {
      case 'CONTRACT': return 'عقد';
      case 'SUPPLIER': return 'مورد';
      case 'CONTRACT_ITEM': return 'عنصر عقد';
      case 'DELIVERY': return 'تسليم';
      case 'PAYMENT': return 'دفعة';
      case 'ATTACHMENT': return 'مرفق';
      default: return entity;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">سجل الحركات</h1>
            <p className="text-sm text-gray-500 mt-1">تتبع جميع التغييرات والإجراءات في النظام</p>
          </div>
          <HelpButton 
            title="سجل الحركات"
            content={
              <div className="space-y-4">
                <p>هذه الشاشة تعرض سجلاً كاملاً بجميع الإجراءات التي تمت في النظام (إنشاء، تعديل، حذف).</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>التتبع:</strong> يمكنك معرفة متى تم إجراء أي تغيير وعلى أي عنصر (عقد، مورد، دفعة، إلخ).</li>
                  <li><strong>البحث والفلترة:</strong> استخدم شريط البحث أو القائمة المنسدلة لتصفية السجلات حسب نوع العنصر أو الإجراء.</li>
                  <li><strong>التفاصيل:</strong> يتم عرض تفاصيل التغييرات في عمود "التفاصيل" (إن وجدت).</li>
                </ul>
                <p><strong>ملاحظة:</strong> يتم عرض آخر 100 حركة فقط للحفاظ على سرعة النظام.</p>
              </div>
            }
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="البحث في السجل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div className="relative min-w-[200px]">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="block w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="ALL">الكل</option>
            <option value="CONTRACT">العقود</option>
            <option value="SUPPLIER">الموردين</option>
            <option value="CONTRACT_ITEM">عناصر العقود</option>
            <option value="DELIVERY">التسليمات</option>
            <option value="PAYMENT">المدفوعات</option>
            <option value="ATTACHMENT">المرفقات</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200 border-dashed">
          <Activity className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد حركات</h3>
          <p className="mt-1 text-sm text-gray-500">لم يتم العثور على أي سجلات تطابق بحثك.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
          <ul className="divide-y divide-gray-200">
            {filteredLogs.map((log) => (
              <li key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                      {getActionText(log.action)}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {getEntityText(log.entity_type)}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      ID: {log.entity_id.substring(0, 8)}...
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDate(log.created_at)}
                  </div>
                </div>
                {log.details && (
                  <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 overflow-x-auto">
                    <pre className="text-xs font-mono" dir="ltr">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
