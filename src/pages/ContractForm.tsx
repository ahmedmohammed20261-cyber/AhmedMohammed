import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save } from 'lucide-react';
import { logAction } from '../lib/audit';

export default function ContractForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  
  const [formData, setFormData] = useState({
    contract_number: '',
    governorate: '',
    branch: '',
    contract_date: new Date().toISOString().split('T')[0],
    currency: 'SAR',
    status: 'new',
    notes: '',
  });

  useEffect(() => {
    if (isEdit) {
      fetchContract();
    }
  }, [id]);

  async function fetchContract() {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          contract_number: data.contract_number,
          governorate: data.governorate,
          branch: data.branch,
          contract_date: data.contract_date,
          currency: data.currency || 'SAR',
          status: data.status,
          notes: data.notes || '',
        });
      }
    } catch (error) {
      console.error('Error fetching contract:', error);
      navigate('/contracts');
    } finally {
      setInitialLoading(false);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      const payload = {
        ...formData,
        user_id: user.id,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('contracts')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
        await logAction('UPDATE', 'CONTRACT', id as string, payload);
      } else {
        const { data, error } = await supabase
          .from('contracts')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (data) {
          await logAction('CREATE', 'CONTRACT', data.id, payload);
        }
      }

      navigate('/contracts');
    } catch (error) {
      console.error('Error saving contract:', error);
      alert('Failed to save contract');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center space-x-4">
        <Link to="/contracts" className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'تعديل العقد' : 'عقد جديد'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEdit ? 'تحديث تفاصيل العقد' : 'إنشاء عقد توريد جديد'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="contract_number" className="block text-sm font-medium text-gray-700">
              رقم العقد
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="contract_number"
                id="contract_number"
                required
                value={formData.contract_number}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
              />
            </div>
          </div>

          <div>
            <label htmlFor="governorate" className="block text-sm font-medium text-gray-700">
              المحافظة
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="governorate"
                id="governorate"
                required
                value={formData.governorate}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
              />
            </div>
          </div>

          <div>
            <label htmlFor="branch" className="block text-sm font-medium text-gray-700">
              الفرع
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="branch"
                id="branch"
                required
                value={formData.branch}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
              />
            </div>
          </div>

          <div>
            <label htmlFor="contract_date" className="block text-sm font-medium text-gray-700">
              تاريخ العقد
            </label>
            <div className="mt-1">
              <input
                type="date"
                name="contract_date"
                id="contract_date"
                required
                value={formData.contract_date}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
              />
            </div>
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
              العملة
            </label>
            <div className="mt-1">
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
              >
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="EUR">يورو (EUR)</option>
                <option value="AED">درهم إماراتي (AED)</option>
                <option value="EGP">جنيه مصري (EGP)</option>
                <option value="KWD">دينار كويتي (KWD)</option>
                <option value="QAR">ريال قطري (QAR)</option>
                <option value="OMR">ريال عماني (OMR)</option>
                <option value="BHD">دينار بحريني (BHD)</option>
                <option value="JOD">دينار أردني (JOD)</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              الحالة
            </label>
            <div className="mt-1">
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
              >
                <option value="new">جديد</option>
                <option value="in_progress">قيد التنفيذ</option>
                <option value="completed">مكتمل</option>
                <option value="paid">مدفوع</option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              ملاحظات
            </label>
            <div className="mt-1">
              <textarea
                id="notes"
                name="notes"
                rows={4}
                value={formData.notes}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md py-2 px-3"
              />
            </div>
          </div>
        </div>

        <div className="pt-5 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="mr-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <Save className="-mr-1 ml-2 h-5 w-5" />
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
