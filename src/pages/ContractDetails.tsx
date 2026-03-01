import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Edit, Trash2, Package, Truck, DollarSign, Paperclip, Printer, ShoppingCart, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import ContractItems from '../components/contracts/ContractItems';
import ContractPurchases from '../components/contracts/ContractPurchases';
import ContractExpenses from '../components/contracts/ContractExpenses';
import ContractDeliveries from '../components/contracts/ContractDeliveries';
import ContractPayments from '../components/contracts/ContractPayments';
import ContractAttachments from '../components/contracts/ContractAttachments';
import { ContractPrintView } from '../components/contracts/ContractPrintView';
import HelpButton from '../components/HelpButton';
import { logAction } from '../lib/audit';

export default function ContractDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('items');
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);
  const [printData, setPrintData] = useState({ items: [], payments: [] });

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

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onBeforePrint: async () => {
      setIsPrinting(true);
      try {
        const [itemsRes, paymentsRes] = await Promise.all([
          supabase.from('contract_items').select('*').eq('contract_id', id),
          supabase.from('contract_payments').select('*').eq('contract_id', id)
        ]);
        
        setPrintData({
          items: itemsRes.data || [],
          payments: paymentsRes.data || []
        });
        
        // Small delay to ensure state is updated and rendered before printing
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Error fetching print data:', error);
      } finally {
        setIsPrinting(false);
      }
    },
  });

  const handleDelete = async () => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف هذا العقد؟')) {
      try {
        const { error } = await supabase.from('contracts').delete().eq('id', id);
        if (error) throw error;
        await logAction('DELETE', 'CONTRACT', id as string);
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
    { id: 'items', name: 'الأصناف (البيع)', icon: Package },
    { id: 'purchases', name: 'المشتريات', icon: ShoppingCart },
    { id: 'expenses', name: 'المصاريف', icon: Receipt },
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
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">عقد #{contract.contract_number}</h1>
              <p className="text-sm text-gray-500">{contract.governorate} - {contract.branch}</p>
            </div>
            <HelpButton 
              title="تفاصيل العقد"
              content={
                <div className="space-y-4">
                  <p>هذه الشاشة هي المركز الرئيسي لإدارة كل ما يخص هذا العقد.</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li><strong>العناصر:</strong> إضافة وإدارة المواد المطلوبة للعقد (الكمية، سعر الشراء، سعر البيع، المورد).</li>
                    <li><strong>التسليمات:</strong> تتبع ما تم تسليمه من المواد للعميل وتواريخ التسليم.</li>
                    <li><strong>المدفوعات:</strong> تسجيل الدفعات المالية المستلمة من العميل وتواريخها.</li>
                    <li><strong>المرفقات:</strong> رفع وحفظ المستندات والصور المتعلقة بالعقد (مثل صور الفواتير أو العقود الورقية).</li>
                  </ul>
                  <p><strong>الطباعة:</strong> يمكنك استخدام زر "طباعة" في الأعلى لتصدير الفاتورة أو التقرير المالي للعقد كملف PDF.</p>
                </div>
              }
            />
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center"
            title="طباعة / تصدير PDF"
          >
            <Printer size={18} className={isPrinting ? 'animate-pulse' : ''} />
            <span className="mr-2 text-sm hidden sm:inline">{isPrinting ? 'جاري التجهيز...' : 'طباعة'}</span>
          </button>
          <Link
            to={`/contracts/${id}/edit`}
            className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center"
            title="تعديل"
          >
            <Edit size={18} />
          </Link>
          <button
            onClick={handleDelete}
            className="p-2 rounded-md border border-red-300 bg-white text-red-600 hover:bg-red-50 transition-colors flex items-center"
            title="حذف"
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
          {activeTab === 'items' && <ContractItems contractId={id as string} currency={contract.currency || 'SAR'} />}
          {activeTab === 'purchases' && <ContractPurchases contractId={id as string} currency={contract.currency || 'SAR'} />}
          {activeTab === 'expenses' && <ContractExpenses contractId={id as string} currency={contract.currency || 'SAR'} />}
          {activeTab === 'deliveries' && <ContractDeliveries contractId={id as string} />}
          {activeTab === 'payments' && <ContractPayments contractId={id as string} currency={contract.currency || 'SAR'} />}
          {activeTab === 'attachments' && <ContractAttachments contractId={id as string} />}
        </div>
      </div>

      <ContractPrintView 
        ref={printRef} 
        contract={contract} 
        items={printData.items} 
        payments={printData.payments} 
      />
    </div>
  );
}
