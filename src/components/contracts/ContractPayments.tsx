import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { logAction } from '../../lib/audit';

export default function ContractPayments({ contractId, currency }: { contractId: string, currency: string }) {
  const [payments, setPayments] = useState<any[]>([]);
  const [totalContractValue, setTotalContractValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [contractId]);

  async function fetchData() {
    try {
      setLoading(true);
      
      // Fetch items to calculate total contract value
      const { data: itemsData, error: itemsError } = await supabase
        .from('contract_items')
        .select('quantity, sale_price')
        .eq('contract_id', contractId);

      if (itemsError) throw itemsError;
      
      let totalValue = 0;
      if (itemsData) {
        itemsData.forEach(item => {
          totalValue += item.quantity * item.sale_price;
        });
      }
      setTotalContractValue(totalValue);

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('contract_id', contractId)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);
      
    } catch (error) {
      console.error('Error fetching payments data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (payment: any = null) => {
    if (payment) {
      setEditingPayment(payment);
      setFormData({
        amount: payment.amount.toString(),
        payment_date: payment.payment_date,
        notes: payment.notes || '',
      });
    } else {
      setEditingPayment(null);
      setFormData({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPayment(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      contract_id: contractId,
      amount: parseFloat(formData.amount),
      payment_date: formData.payment_date,
      notes: formData.notes,
    };

    try {
      if (editingPayment) {
        const { error } = await supabase
          .from('payments')
          .update(payload)
          .eq('id', editingPayment.id);
        if (error) throw error;
        await logAction('UPDATE', 'PAYMENT', editingPayment.id, payload);
      } else {
        const { data, error } = await supabase
          .from('payments')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (data) {
          await logAction('CREATE', 'PAYMENT', data.id, payload);
        }
      }
      handleCloseModal();
      fetchData();
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('فشل في حفظ الدفعة');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف هذه الدفعة؟')) {
      try {
        const { error } = await supabase.from('payments').delete().eq('id', id);
        if (error) throw error;
        await logAction('DELETE', 'PAYMENT', id);
        fetchData();
      } catch (error) {
        console.error('Error deleting payment:', error);
        alert('فشل في حذف الدفعة');
      }
    }
  };

  const totalReceived = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remainingBalance = totalContractValue - totalReceived;

  if (loading) {
    return <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">سجل المدفوعات</h3>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="-mr-1 ml-2 h-4 w-4" />
          إضافة دفعة
        </button>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500">إجمالي قيمة العقد</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalContractValue, currency)}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 shadow-sm">
          <p className="text-sm text-emerald-700">إجمالي المقبوضات</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(totalReceived, currency)}</p>
        </div>
        <div className={`p-4 rounded-lg border shadow-sm ${remainingBalance > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`text-sm ${remainingBalance > 0 ? 'text-amber-700' : 'text-gray-500'}`}>المبلغ المتبقي</p>
          <p className={`text-xl font-bold mt-1 ${remainingBalance > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{formatCurrency(remainingBalance, currency)}</p>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
          <p className="text-sm text-gray-500">لا توجد مدفوعات مسجلة بعد.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المبلغ</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ملاحظات</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">إجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{formatCurrency(payment.amount, currency)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(payment.payment_date)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{payment.notes}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleOpenModal(payment)} className="text-indigo-600 hover:text-indigo-900 ml-3">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(payment.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseModal}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {editingPayment ? 'تعديل الدفعة' : 'إضافة دفعة جديدة'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">المبلغ</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">تاريخ الدفعة</label>
                      <input
                        type="date"
                        required
                        value={formData.payment_date}
                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ملاحظات</label>
                      <textarea
                        rows={3}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
