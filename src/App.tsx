/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Contracts from './pages/Contracts';
import ContractDetails from './pages/ContractDetails';
import ContractForm from './pages/ContractForm';
import Suppliers from './pages/Suppliers';
import Settings from './pages/Settings';
import AuditLogs from './pages/AuditLogs';
import { hasSupabaseConfig } from './lib/supabase';
import { AlertCircle } from 'lucide-react';

function MissingConfig() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">إعدادات مفقودة</h2>
        <p className="text-gray-600 mb-6">
          يرجى تكوين متغيرات بيئة Supabase لتشغيل هذا التطبيق.
        </p>
        <div className="text-left bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm font-mono text-gray-800 break-all space-y-2">
          <div>VITE_SUPABASE_URL="your_url"</div>
          <div>VITE_SUPABASE_ANON_KEY="your_key"</div>
        </div>
        <p className="text-gray-500 text-sm mt-6">
          أضف هذه المتغيرات في لوحة الأسرار (أيقونة المفتاح) في AI Studio وأعد تشغيل الخادم.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  if (!hasSupabaseConfig) {
    return <MissingConfig />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="contracts/new" element={<ContractForm />} />
          <Route path="contracts/:id" element={<ContractDetails />} />
          <Route path="contracts/:id/edit" element={<ContractForm />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}
