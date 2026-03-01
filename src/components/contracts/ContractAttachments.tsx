import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, Trash2, FileText, Download, AlertCircle } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { logAction } from '../../lib/audit';

export default function ContractAttachments({ contractId }: { contractId: string }) {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAttachments();
  }, [contractId]);

  async function fetchAttachments() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('يجب اختيار ملف للرفع.');
      }

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${contractId}/${fileName}`;

      // 1. Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
           alert('خطأ: يرجى إنشاء حاوية تخزين (Bucket) باسم "attachments" في لوحة تحكم Supabase الخاص بك وجعلها عامة (Public).');
           return;
        }
        throw uploadError;
      }

      // 2. Get signed URL (valid for 10 years for simplicity, or just store the path and generate signed url on the fly)
      // Actually, it's better to store the file path in the database and generate a signed URL when viewing.
      // But since the current schema uses file_url, we'll store the path in file_url and generate signed URL on render.
      // Let's modify the insert to store filePath.
      
      const { data, error: dbError } = await supabase
        .from('attachments')
        .insert([
          {
            contract_id: contractId,
            file_url: filePath, // Storing path instead of public URL
            file_type: file.type || fileExt,
          }
        ])
        .select()
        .single();

      if (dbError) throw dbError;
      if (data) {
        await logAction('CREATE', 'ATTACHMENT', data.id, { file_url: filePath, file_type: file.type || fileExt });
      }

      fetchAttachments();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert(error.message || 'فشل في رفع الملف');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string, fileUrl: string) => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف هذا المرفق؟')) {
      try {
        // Extract file path from URL or use it directly if it's already a path
        let filePath = fileUrl;
        if (fileUrl.startsWith('http')) {
          const urlObj = new URL(fileUrl);
          const pathParts = urlObj.pathname.split('/');
          filePath = `${pathParts[pathParts.length - 2]}/${pathParts[pathParts.length - 1]}`;
        }

        // 1. Delete from storage
        const { error: storageError } = await supabase.storage
          .from('attachments')
          .remove([filePath]);

        if (storageError) console.error('Storage deletion error:', storageError);

        // 2. Delete from database
        const { error: dbError } = await supabase.from('attachments').delete().eq('id', id);
        if (dbError) throw dbError;
        
        await logAction('DELETE', 'ATTACHMENT', id);
        fetchAttachments();
      } catch (error) {
        console.error('Error deleting attachment:', error);
        alert('فشل في حذف المرفق');
      }
    }
  };

  const handleDownload = async (fileUrl: string) => {
    try {
      let url = fileUrl;
      // If it's a path (not a full URL), generate a signed URL
      if (!fileUrl.startsWith('http')) {
        const { data, error } = await supabase.storage
          .from('attachments')
          .createSignedUrl(fileUrl, 60 * 60); // 1 hour expiry
          
        if (error) throw error;
        url = data.signedUrl;
      }
      
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('فشل في فتح الملف');
    }
  };

  if (loading) {
    return <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">مرفقات العقد</h3>
        
        <div>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <label
            htmlFor="file-upload"
            className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${uploading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'}`}
          >
            <Upload className="-mr-1 ml-2 h-4 w-4" />
            {uploading ? 'جاري الرفع...' : 'رفع ملف'}
          </label>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="mr-3">
            <p className="text-sm text-blue-700">
              ملاحظة: لكي تعمل ميزة المرفقات، يجب التأكد من إنشاء حاوية تخزين (Bucket) باسم <strong>attachments</strong> في Supabase وتعيينها كـ Public.
            </p>
          </div>
        </div>
      </div>

      {attachments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد مرفقات</h3>
          <p className="mt-1 text-sm text-gray-500">قم برفع صور الفواتير، العقود، أو مستندات التسليم.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {attachments.map((attachment) => (
              <li key={attachment.id}>
                <div className="px-4 py-4 flex items-center sm:px-6">
                  <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                    <div className="truncate">
                      <div className="flex text-sm">
                        <p className="font-medium text-indigo-600 truncate">
                          مستند مرفق
                        </p>
                        <p className="ml-1 flex-shrink-0 font-normal text-gray-500">
                          - {attachment.file_type}
                        </p>
                      </div>
                      <div className="mt-2 flex">
                        <div className="flex items-center text-sm text-gray-500">
                          <p>
                            تم الرفع في {formatDate(attachment.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mr-5 flex-shrink-0 flex space-x-4 space-x-reverse">
                    <button
                      onClick={() => handleDownload(attachment.file_url)}
                      className="text-gray-400 hover:text-indigo-600"
                      title="تحميل / عرض"
                    >
                      <Download size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(attachment.id, attachment.file_url)}
                      className="text-gray-400 hover:text-red-600"
                      title="حذف"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
