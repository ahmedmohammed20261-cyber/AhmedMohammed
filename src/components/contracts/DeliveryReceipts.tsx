import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Trash2, Printer, FileText } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { logAction } from '../../lib/audit';
import { useReactToPrint } from 'react-to-print';

export default function DeliveryReceipts({ contractId }: { contractId: string }) {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    receipt_number: '',
    delivery_date: new Date().toISOString().split('T')[0],
    recipient_name: '',
    recipient_phone: '',
    notes: '',
  });

  const printRef = useRef<HTMLDivElement>(null);
  const [printingReceipt, setPrintingReceipt] = useState<any>(null);
  const [contractDetails, setContractDetails] = useState<any>(null);

  useEffect(() => {
    fetchData();
    fetchContractDetails();
  }, [contractId]);

  async function fetchContractDetails() {
    const { data } = await supabase.from('contracts').select('*').eq('id', contractId).single();
    if (data) setContractDetails(data);
  }

  async function fetchData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('delivery_receipts')
        .select('*')
        .eq('contract_id', contractId)
        .order('delivery_date', { ascending: false });

      if (error) {
        // If table doesn't exist yet, just set empty
        if (error.code === '42P01') {
          setReceipts([]);
          return;
        }
        throw error;
      }
      setReceipts(data || []);
    } catch (error) {
      console.error('Error fetching delivery receipts:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (receipt: any = null) => {
    if (receipt) {
      setEditingReceipt(receipt);
      setFormData({
        receipt_number: receipt.receipt_number,
        delivery_date: receipt.delivery_date,
        recipient_name: receipt.recipient_name,
        recipient_phone: receipt.recipient_phone || '',
        notes: receipt.notes || '',
      });
    } else {
      setEditingReceipt(null);
      setFormData({
        receipt_number: `REC-${Math.floor(Math.random() * 10000)}`,
        delivery_date: new Date().toISOString().split('T')[0],
        recipient_name: '',
        recipient_phone: '',
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingReceipt(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      contract_id: contractId,
      receipt_number: formData.receipt_number,
      delivery_date: formData.delivery_date,
      recipient_name: formData.recipient_name,
      recipient_phone: formData.recipient_phone,
      notes: formData.notes,
    };

    try {
      if (editingReceipt) {
        const { error } = await supabase
          .from('delivery_receipts')
          .update(payload)
          .eq('id', editingReceipt.id);
        if (error) throw error;
        await logAction('UPDATE', 'DELIVERY_RECEIPT', editingReceipt.id, payload);
      } else {
        const { data, error } = await supabase
          .from('delivery_receipts')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (data) {
          await logAction('CREATE', 'DELIVERY_RECEIPT', data.id, payload);
        }
      }
      handleCloseModal();
      fetchData();
    } catch (error) {
      console.error('Error saving delivery receipt:', error);
      alert('فشل في حفظ سند التسليم. تأكد من تحديث قاعدة البيانات.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف هذا السند؟ سيتم حذف جميع التسليمات المرتبطة به.')) {
      try {
        const { error } = await supabase.from('delivery_receipts').delete().eq('id', id);
        if (error) throw error;
        await logAction('DELETE', 'DELIVERY_RECEIPT', id);
        fetchData();
      } catch (error) {
        console.error('Error deleting delivery receipt:', error);
        alert('فشل في حذف السند');
      }
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'سند تسليم',
    onAfterPrint: () => setPrintingReceipt(null)
  });

  const triggerPrint = (receipt: any) => {
    setPrintingReceipt(receipt);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  if (loading) {
    return <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">محاضر وسندات التسليم الرسمية</h3>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="-mr-1 ml-2 h-4 w-4" />
          إضافة محضر استلام
        </button>
      </div>

      {receipts.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">لا توجد محاضر تسليم رسمية مسجلة بعد.</p>
          <p className="text-xs text-gray-400 mt-1">قم بإنشاء محضر استلام لطباعته وتوقيعه من قبل المستلم.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {receipts.map((receipt) => (
            <div key={receipt.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-lg text-gray-900">سند رقم: {receipt.receipt_number}</h4>
                  <p className="text-sm text-gray-500">{formatDate(receipt.delivery_date)}</p>
                </div>
                <div className="flex space-x-2 space-x-reverse">
                  <button onClick={() => triggerPrint(receipt)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="طباعة">
                    <Printer size={18} />
                  </button>
                  <button onClick={() => handleOpenModal(receipt)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="تعديل">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDelete(receipt.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="حذف">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">المستلم:</span>
                  <span className="font-medium text-gray-900">{receipt.recipient_name}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">رقم التواصل:</span>
                  <span className="font-medium text-gray-900">{receipt.recipient_phone || '-'}</span>
                </div>
                {receipt.notes && (
                  <div className="pt-1">
                    <span className="text-gray-500 block mb-1">ملاحظات:</span>
                    <p className="text-gray-700 bg-gray-50 p-2 rounded text-xs">{receipt.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden Print View */}
      <div className="hidden">
        <div ref={printRef} className="p-8 bg-white text-right" dir="rtl">
          {printingReceipt && contractDetails && (
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">محضر استلام بضاعة</h1>
                <h2 className="text-xl text-gray-600">سند تسليم رسمي</h2>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="space-y-3">
                  <div className="flex border-b border-gray-200 pb-2">
                    <span className="font-bold w-32">رقم السند:</span>
                    <span>{printingReceipt.receipt_number}</span>
                  </div>
                  <div className="flex border-b border-gray-200 pb-2">
                    <span className="font-bold w-32">تاريخ التسليم:</span>
                    <span>{formatDate(printingReceipt.delivery_date)}</span>
                  </div>
                  <div className="flex border-b border-gray-200 pb-2">
                    <span className="font-bold w-32">رقم العقد:</span>
                    <span>{contractDetails.contract_number}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex border-b border-gray-200 pb-2">
                    <span className="font-bold w-32">المحافظة/الفرع:</span>
                    <span>{contractDetails.governorate} - {contractDetails.branch}</span>
                  </div>
                  <div className="flex border-b border-gray-200 pb-2">
                    <span className="font-bold w-32">اسم المستلم:</span>
                    <span>{printingReceipt.recipient_name}</span>
                  </div>
                  <div className="flex border-b border-gray-200 pb-2">
                    <span className="font-bold w-32">رقم التواصل:</span>
                    <span>{printingReceipt.recipient_phone || '_________________'}</span>
                  </div>
                </div>
              </div>

              <div className="mb-8 min-h-[200px] border border-gray-300 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-4 border-b pb-2">التفاصيل والملاحظات:</h3>
                <p className="whitespace-pre-wrap leading-relaxed">
                  {printingReceipt.notes || 'تم استلام البضاعة الموضحة أعلاه بحالة جيدة ومطابقة للمواصفات المطلوبة.'}
                </p>
              </div>

              <div className="mt-16 grid grid-cols-2 gap-16 text-center">
                <div>
                  <h4 className="font-bold mb-8">المُسلّم (المورد)</h4>
                  <div className="border-b border-gray-400 w-48 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">الاسم والتوقيع</p>
                </div>
                <div>
                  <h4 className="font-bold mb-8">المُستلم (الجهة)</h4>
                  <div className="border-b border-gray-400 w-48 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">الاسم والتوقيع / الختم</p>
                </div>
              </div>
              
              <div className="mt-16 text-center text-sm text-gray-500 border-t pt-4">
                <p>تم إنشاء هذا السند بواسطة نظام إدارة المقاولات</p>
                <p>{new Date().toLocaleString('ar-SA')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseModal}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {editingReceipt ? 'تعديل محضر الاستلام' : 'إنشاء محضر استلام رسمي'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">رقم السند / المحضر</label>
                      <input
                        type="text"
                        required
                        value={formData.receipt_number}
                        onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">تاريخ التسليم</label>
                      <input
                        type="date"
                        required
                        value={formData.delivery_date}
                        onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">اسم المستلم</label>
                      <input
                        type="text"
                        required
                        value={formData.recipient_name}
                        onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">رقم هاتف المستلم (اختياري)</label>
                      <input
                        type="text"
                        value={formData.recipient_phone}
                        onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ملاحظات المحضر</label>
                      <textarea
                        rows={3}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="تفاصيل البضاعة المسلمة، حالتها، أو أي شروط أخرى..."
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mr-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {saving ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:mr-3 sm:w-auto sm:text-sm"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
