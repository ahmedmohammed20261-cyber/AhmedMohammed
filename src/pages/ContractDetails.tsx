import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Edit, Trash2, Package, Truck, DollarSign, Paperclip } from 'lucide-react';
import { format } from 'date-fns';

export default function ContractDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('items');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContract();
  }, [id]);

  async function fetchContract() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setContract(data);
    } catch (error) {
      console.error('Error fetching contract:', error);
      navigate('/contracts');
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async () => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف هذا العقد؟')) {
      try {
        const { error } = await supabase.from('contracts').delete().eq('id', id);
        if (error) throw error;
        navigate('/contracts');
      } catch (error) {
        console.error('Error deleting contract:', error);
        alert('Failed to delete contract');
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  if (!contract) return null;

  const tabs = [
    { id: 'items', name: 'العناصر', icon: Package },
    { id: 'deliveries', name: 'التسليمات', icon: Truck },
    { id: 'payments', name: 'المدفوعات', icon: DollarSign },
    { id: 'attachments', name: 'المرفقات', icon: Paperclip },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/contracts" className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">عقد #{contract.contract_number}</h1>
            <p className="text-sm text-gray-500">{contract.governorate} - {contract.branch}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link
            to={`/contracts/${id}/edit`}
            className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Edit size={18} />
          </Link>
          <button
            onClick={handleDelete}
            className="p-2 rounded-md border border-red-300 bg-white text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">معلومات العقد</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">التفاصيل والحالة.</p>
        </div>
        <div className="px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">التاريخ</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {format(new Date(contract.contract_date), 'MMMM dd, yyyy')}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">الحالة</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800`}>
                  {contract.status === 'new' ? 'جديد' : contract.status === 'in_progress' ? 'قيد التنفيذ' : contract.status === 'completed' ? 'مكتمل' : 'مدفوع'}
                </span>
              </dd>
            </div>
            {contract.notes && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">ملاحظات</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 whitespace-pre-wrap">
                  {contract.notes}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    ${activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center
                  `}
                >
                  <Icon className={`ml-2 h-5 w-5 ${activeTab === tab.id ? 'text-indigo-500' : 'text-gray-400'}`} />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
        
        <div className="mt-6">
          {activeTab === 'items' && <div className="text-center py-12 text-gray-500">وحدة العناصر قريباً</div>}
          {activeTab === 'deliveries' && <div className="text-center py-12 text-gray-500">وحدة التسليمات قريباً</div>}
          {activeTab === 'payments' && <div className="text-center py-12 text-gray-500">وحدة المدفوعات قريباً</div>}
          {activeTab === 'attachments' && <div className="text-center py-12 text-gray-500">وحدة المرفقات قريباً</div>}
        </div>
      </div>
    </div>
  );
}
