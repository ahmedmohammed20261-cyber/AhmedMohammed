import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export default function ContractDeliveries({ contractId }: { contractId: string }) {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    contract_item_id: '',
    quantity_delivered: '',
    delivery_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [contractId]);

  async function fetchData() {
    try {
      setLoading(true);
      // Fetch items for this contract
      const { data: itemsData, error: itemsError } = await supabase
        .from('contract_items')
        .select('*')
        .eq('contract_id', contractId);

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      if (itemsData && itemsData.length > 0) {
        const itemIds = itemsData.map(item => item.id);
        
        // Fetch deliveries for these items
        const { data: deliveriesData, error: deliveriesError } = await supabase
          .from('deliveries')
          .select('*')
          .in('contract_item_id', itemIds)
          .order('delivery_date', { ascending: false });

        if (deliveriesError) throw deliveriesError;
        setDeliveries(deliveriesData || []);
      } else {
        setDeliveries([]);
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (delivery: any = null) => {
    if (delivery) {
      setEditingDelivery(delivery);
      setFormData({
        contract_item_id: delivery.contract_item_id,
        quantity_delivered: delivery.quantity_delivered.toString(),
        delivery_date: delivery.delivery_date,
        notes: delivery.notes || '',
      });
    } else {
      setEditingDelivery(null);
      setFormData({
        contract_item_id: items.length > 0 ? items[0].id : '',
        quantity_delivered: '',
        delivery_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDelivery(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      contract_item_id: formData.contract_item_id,
      quantity_delivered: parseFloat(formData.quantity_delivered),
      delivery_date: formData.delivery_date,
      notes: formData.notes,
    };

    try {
      if (editingDelivery) {
        const { error } = await supabase
          .from('deliveries')
          .update(payload)
          .eq('id', editingDelivery.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('deliveries')
          .insert([payload]);
        if (error) throw error;
      }
      handleCloseModal();
      fetchData();
    } catch (error) {
      console.error('Error saving delivery:', error);
      alert('فشل في حفظ التسليم');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف هذا التسليم؟')) {
      try {
        const { error } = await supabase.from('deliveries').delete().eq('id', id);
        if (error) throw error;
        fetchData();
      } catch (error) {
        console.error('Error deleting delivery:', error);
        alert('فشل في حذف التسليم');
      }
    }
  };

  const getItemName = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    return item ? item.item_name : 'عنصر غير معروف';
  };

  const getRemainingQuantity = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return 0;
    
    const totalDelivered = deliveries
      .filter(d => d.contract_item_id === itemId)
      .reduce((sum, d) => sum + Number(d.quantity_delivered), 0);
      
    return item.quantity - totalDelivered;
  };

  if (loading) {
    return <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div></div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
        <p className="text-sm text-gray-500">يرجى إضافة عناصر للعقد أولاً قبل إضافة التسليمات.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">سجل التسليمات</h3>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="-mr-1 ml-2 h-4 w-4" />
          إضافة تسليم
        </button>
      </div>

      {/* Summary Cards for Remaining Quantities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {items.map(item => {
          const remaining = getRemainingQuantity(item.id);
          const isComplete = remaining <= 0;
          return (
            <div key={item.id} className={`p-4 rounded-lg border ${isComplete ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}>
              <h4 className="font-medium text-gray-900 truncate">{item.item_name}</h4>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-gray-500">المطلوب: {item.quantity}</span>
                <span className={`font-bold ${isComplete ? 'text-emerald-600' : 'text-amber-600'}`}>
                  المتبقي: {remaining > 0 ? remaining : 0}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {deliveries.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
          <p className="text-sm text-gray-500">لا توجد تسليمات مسجلة بعد.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العنصر</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الكمية المسلمة</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ملاحظات</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">إجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deliveries.map((delivery) => (
                <tr key={delivery.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getItemName(delivery.contract_item_id)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{delivery.quantity_delivered}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(delivery.delivery_date)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{delivery.notes}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleOpenModal(delivery)} className="text-indigo-600 hover:text-indigo-900 ml-3">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(delivery.id)} className="text-red-600 hover:text-red-900">
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
                    {editingDelivery ? 'تعديل التسليم' : 'إضافة تسليم جديد'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">العنصر</label>
                      <select
                        required
                        value={formData.contract_item_id}
                        onChange={(e) => setFormData({ ...formData, contract_item_id: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        {items.map(item => (
                          <option key={item.id} value={item.id}>{item.item_name} (المتبقي: {getRemainingQuantity(item.id)})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">الكمية المسلمة</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.quantity_delivered}
                        onChange={(e) => setFormData({ ...formData, quantity_delivered: e.target.value })}
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
