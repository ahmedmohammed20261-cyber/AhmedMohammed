import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Edit, ShoppingCart } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { logAction } from '../../lib/audit';

interface ContractPurchasesProps {
  contractId: string;
  currency: string;
}

export default function ContractPurchases({ contractId, currency }: ContractPurchasesProps) {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    item_name: '',
    quantity: '',
    purchase_price: '',
    supplier_id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    invoice_number: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [contractId]);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      
      const [purchasesRes, suppliersRes] = await Promise.all([
        supabase
          .from('contract_purchases')
          .select('*, suppliers(name)')
          .eq('contract_id', contractId)
          .order('created_at', { ascending: false }),
        supabase
          .from('suppliers')
          .select('id, name')
          .order('name')
      ]);

      if (purchasesRes.error) {
        // If table doesn't exist, this will fail. We catch it.
        if (purchasesRes.error.code === '42P01') {
          setError('جدول المشتريات غير موجود. يرجى تحديث قاعدة البيانات.');
        } else {
          throw purchasesRes.error;
        }
      } else {
        setPurchases(purchasesRes.data || []);
      }
      
      if (suppliersRes.error) throw suppliersRes.error;
      setSuppliers(suppliersRes.data || []);
      
    } catch (error: any) {
      console.error('Error fetching data:', error);
      if (!error.message?.includes('relation "contract_purchases" does not exist')) {
        alert('Failed to fetch purchases');
      }
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        contract_id: contractId,
        item_name: formData.item_name,
        quantity: Number(formData.quantity),
        purchase_price: Number(formData.purchase_price),
        supplier_id: formData.supplier_id || null,
        purchase_date: formData.purchase_date,
        invoice_number: formData.invoice_number,
        notes: formData.notes
      };

      const { data, error } = await supabase
        .from('contract_purchases')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        await logAction('CREATE', 'CONTRACT_PURCHASE', data.id, payload);
      }

      setFormData({
        item_name: '',
        quantity: '',
        purchase_price: '',
        supplier_id: '',
        purchase_date: new Date().toISOString().split('T')[0],
        invoice_number: '',
        notes: ''
      });
      setIsAdding(false);
      fetchData();
    } catch (error) {
      console.error('Error adding purchase:', error);
      alert('Failed to add purchase');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف عملية الشراء هذه؟')) {
      try {
        const { error } = await supabase
          .from('contract_purchases')
          .delete()
          .eq('id', id);

        if (error) throw error;
        await logAction('DELETE', 'CONTRACT_PURCHASE', id);
        fetchData();
      } catch (error) {
        console.error('Error deleting purchase:', error);
        alert('Failed to delete purchase');
      }
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-700 text-center">
        {error}
      </div>
    );
  }

  const totalPurchases = purchases.reduce((sum, p) => sum + (p.quantity * p.purchase_price), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">المشتريات</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="-mr-1 ml-2 h-4 w-4" />
          إضافة مشتريات
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">الصنف</label>
              <input
                type="text"
                required
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">الكمية</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">سعر الشراء</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  className="block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">{currency}</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">المورد</label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border"
              >
                <option value="">-- اختر المورد --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">تاريخ الشراء</label>
              <input
                type="date"
                required
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">رقم الفاتورة</label>
              <input
                type="text"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700">ملاحظات</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 space-x-reverse mt-4">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              حفظ
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div></div>
      ) : purchases.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200 border-dashed">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد مشتريات</h3>
          <p className="mt-1 text-sm text-gray-500">قم بإضافة المشتريات المرتبطة بهذا العقد.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الصنف</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الكمية</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">السعر</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجمالي</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المورد / الفاتورة</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">إجراءات</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchases.map((purchase) => (
                <tr key={purchase.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{purchase.item_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{purchase.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(purchase.purchase_price, currency)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(purchase.quantity * purchase.purchase_price, currency)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{purchase.suppliers?.name || '-'}</div>
                    <div className="text-xs text-gray-400">{purchase.invoice_number ? `فاتورة: ${purchase.invoice_number}` : ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(purchase.purchase_date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                    <button onClick={() => handleDelete(purchase.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-left">إجمالي المشتريات:</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">{formatCurrency(totalPurchases, currency)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
