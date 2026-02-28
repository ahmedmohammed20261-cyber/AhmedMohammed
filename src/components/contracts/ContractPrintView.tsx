import React, { forwardRef } from 'react';
import { formatCurrency, formatDate } from '../../lib/utils';

interface ContractPrintViewProps {
  contract: any;
  items: any[];
  payments: any[];
}

export const ContractPrintView = forwardRef<HTMLDivElement, ContractPrintViewProps>(
  ({ contract, items, payments }, ref) => {
    if (!contract) return null;

    const currency = contract.currency || 'SAR';
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const totalPaid = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
    const remaining = totalAmount - totalPaid;

    return (
      <div style={{ display: 'none' }}>
        <div ref={ref} className="p-10 bg-white text-black w-full min-h-screen" dir="rtl">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-indigo-900">أحمد محمد زنقاح</h1>
              <p className="text-gray-600 font-medium">لإدارة المقاولات والتوريدات</p>
            </div>
            <div className="text-left">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">فاتورة / تقرير عقد</h2>
              <p className="text-sm text-gray-600">رقم العقد: <span className="font-mono">{contract.contract_number}</span></p>
              <p className="text-sm text-gray-600">تاريخ الإصدار: {formatDate(new Date().toISOString())}</p>
            </div>
          </div>

          {/* Contract Info */}
          <div className="bg-gray-50 p-6 rounded-lg mb-8 border border-gray-200">
            <h3 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4 text-indigo-800">معلومات العقد</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="mb-2"><strong className="text-gray-700">المحافظة:</strong> {contract.governorate}</p>
                <p className="mb-2"><strong className="text-gray-700">الفرع:</strong> {contract.branch}</p>
                <p className="mb-2"><strong className="text-gray-700">تاريخ العقد:</strong> {formatDate(contract.contract_date)}</p>
              </div>
              <div>
                <p className="mb-2"><strong className="text-gray-700">الحالة:</strong> {
                  contract.status === 'new' ? 'جديد' : 
                  contract.status === 'in_progress' ? 'قيد التنفيذ' : 
                  contract.status === 'completed' ? 'مكتمل' : 'مدفوع'
                }</p>
                <p className="mb-2"><strong className="text-gray-700">العملة المعتمدة:</strong> {currency}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <h3 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4 text-indigo-800">البنود والمواد</h3>
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-indigo-50 text-indigo-900">
                  <th className="border border-gray-300 p-3 font-semibold">البند</th>
                  <th className="border border-gray-300 p-3 font-semibold w-24">الكمية</th>
                  <th className="border border-gray-300 p-3 font-semibold w-32">سعر الوحدة</th>
                  <th className="border border-gray-300 p-3 font-semibold w-32">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-3">{item.name}</td>
                    <td className="border border-gray-300 p-3">{item.quantity}</td>
                    <td className="border border-gray-300 p-3">{formatCurrency(item.unit_price, currency)}</td>
                    <td className="border border-gray-300 p-3 font-medium">{formatCurrency(item.quantity * item.unit_price, currency)}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="border border-gray-300 p-6 text-center text-gray-500">لا توجد بنود مسجلة في هذا العقد</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="flex justify-end mb-12">
            <div className="w-1/2 bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4 text-indigo-800">الملخص المالي</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-gray-800">
                  <span>إجمالي قيمة العقد:</span>
                  <span className="font-bold">{formatCurrency(totalAmount, currency)}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>إجمالي المدفوعات:</span>
                  <span className="font-bold">{formatCurrency(totalPaid, currency)}</span>
                </div>
                <div className="flex justify-between text-red-600 border-t border-gray-300 pt-3 mt-3 text-lg">
                  <span className="font-bold">المبلغ المتبقي:</span>
                  <span className="font-bold">{formatCurrency(remaining, currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-8 border-t border-gray-300 text-center text-sm text-gray-500">
            <p className="mb-1">تم إصدار هذا المستند آلياً من نظام إدارة المقاولات والتوريدات</p>
            <p>© {new Date().getFullYear()} أحمد محمد زنقاح. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </div>
    );
  }
);

ContractPrintView.displayName = 'ContractPrintView';
