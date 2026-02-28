import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Mail, Shield } from 'lucide-react';
import HelpButton from '../components/HelpButton';

export default function Settings() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الإعدادات</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة إعدادات حسابك</p>
        </div>
        <HelpButton 
          title="الإعدادات"
          content={
            <div className="space-y-4">
              <p>هذه الشاشة تعرض معلومات حسابك الشخصي وإعدادات النظام.</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>معرف المستخدم:</strong> المعرف الفريد الخاص بك في النظام.</li>
                <li><strong>البريد الإلكتروني:</strong> البريد الإلكتروني المستخدم لتسجيل الدخول.</li>
                <li><strong>آخر تسجيل دخول:</strong> تاريخ ووقت آخر مرة قمت فيها بتسجيل الدخول إلى النظام.</li>
              </ul>
            </div>
          }
        />
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">معلومات الملف الشخصي</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">التفاصيل الشخصية وإعدادات التطبيق.</p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <User className="ml-2 h-5 w-5 text-gray-400" />
                معرف المستخدم
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {user.id}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Mail className="ml-2 h-5 w-5 text-gray-400" />
                البريد الإلكتروني
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {user.email}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <Shield className="ml-2 h-5 w-5 text-gray-400" />
                آخر تسجيل دخول
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {new Date(user.last_sign_in_at).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
