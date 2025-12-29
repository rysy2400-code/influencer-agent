'use client';

import { useState, useEffect } from 'react';

export default function UserProfileModal({ isOpen, onClose, session, userProfile, onUpdate }) {
  const [formData, setFormData] = useState({
    shipping_full_name: '',
    shipping_country: '',
    shipping_state_province: '',
    shipping_city: '',
    shipping_address_line: '',
    shipping_post_zip_code: '',
    shipping_telephone: '',
    payment_method: '',
    payment_account: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // 当模态框打开或用户信息更新时，填充表单
  useEffect(() => {
    if (isOpen && userProfile) {
      setFormData({
        shipping_full_name: userProfile.shipping_full_name || '',
        shipping_country: userProfile.shipping_country || '',
        shipping_state_province: userProfile.shipping_state_province || '',
        shipping_city: userProfile.shipping_city || '',
        shipping_address_line: userProfile.shipping_address_line || '',
        shipping_post_zip_code: userProfile.shipping_post_zip_code || '',
        shipping_telephone: userProfile.shipping_telephone || '',
        payment_method: userProfile.payment_method || '',
        payment_account: userProfile.payment_account || '',
      });
    }
  }, [isOpen, userProfile]);

  // 国家列表
  const countries = [
    'United States',
    'Canada',
    'United Kingdom',
    'Australia',
    'Germany',
    'France',
    'Italy',
    'Spain',
    'Japan',
    'South Korea',
    'China',
    'India',
    'Brazil',
    'Mexico',
    'Other',
  ];

  // 支付方式
  const paymentMethods = ['Paypal', 'Zelle'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // 清除该字段的错误
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.shipping_full_name.trim()) {
      newErrors.shipping_full_name = 'Please enter your full name';
    }
    if (!formData.shipping_country) {
      newErrors.shipping_country = 'Please select a country';
    }
    if (!formData.shipping_state_province.trim()) {
      newErrors.shipping_state_province = 'Please enter state/province';
    }
    if (!formData.shipping_city.trim()) {
      newErrors.shipping_city = 'Please enter city';
    }
    if (!formData.shipping_address_line.trim()) {
      newErrors.shipping_address_line = 'Please enter address line';
    }
    if (!formData.shipping_post_zip_code.trim()) {
      newErrors.shipping_post_zip_code = 'Please enter postal/zip code';
    }
    if (!formData.shipping_telephone.trim()) {
      newErrors.shipping_telephone = 'Please enter phone number';
    }
    if (!formData.payment_method) {
      newErrors.payment_method = 'Please select payment method';
    }
    if (!formData.payment_account.trim()) {
      newErrors.payment_account = 'Please enter payment account';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      if (!session || !session.access_token) {
        throw new Error('No valid session found');
      }

      const response = await fetch('/api/user-profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Save failed');
      }

      // 通知父组件更新用户信息
      if (onUpdate) {
        onUpdate();
      }
      
      alert('Profile saved successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert(error.message || 'Save failed, please try again');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-50/10 backdrop-blur-sm">
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg shadow-blue-500/10 border border-blue-100/50 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-blue-100/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">Profile Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Manage your shipping and payment information
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 寄样信息 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-blue-700 border-b border-blue-200 pb-2">
              Shipping Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="shipping_full_name"
                  value={formData.shipping_full_name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors ${
                    errors.shipping_full_name ? 'border-red-500' : 'border-blue-200'
                  }`}
                  placeholder="Emily Johnson"
                />
                {errors.shipping_full_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.shipping_full_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  name="shipping_country"
                  value={formData.shipping_country}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors ${
                    errors.shipping_country ? 'border-red-500' : 'border-blue-200'
                  }`}
                >
                  <option value="">Select Country</option>
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                {errors.shipping_country && (
                  <p className="mt-1 text-sm text-red-600">{errors.shipping_country}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State/Province <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="shipping_state_province"
                  value={formData.shipping_state_province}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors ${
                    errors.shipping_state_province ? 'border-red-500' : 'border-blue-200'
                  }`}
                  placeholder="California"
                />
                {errors.shipping_state_province && (
                  <p className="mt-1 text-sm text-red-600">{errors.shipping_state_province}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="shipping_city"
                  value={formData.shipping_city}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors ${
                    errors.shipping_city ? 'border-red-500' : 'border-blue-200'
                  }`}
                  placeholder="Los Angeles"
                />
                {errors.shipping_city && (
                  <p className="mt-1 text-sm text-red-600">{errors.shipping_city}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="shipping_address_line"
                  value={formData.shipping_address_line}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors ${
                    errors.shipping_address_line ? 'border-red-500' : 'border-blue-200'
                  }`}
                  placeholder="456 Sunset Boulevard, Apt 302"
                />
                {errors.shipping_address_line && (
                  <p className="mt-1 text-sm text-red-600">{errors.shipping_address_line}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postal/Zip Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="shipping_post_zip_code"
                  value={formData.shipping_post_zip_code}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors ${
                    errors.shipping_post_zip_code ? 'border-red-500' : 'border-blue-200'
                  }`}
                  placeholder="90028"
                />
                {errors.shipping_post_zip_code && (
                  <p className="mt-1 text-sm text-red-600">{errors.shipping_post_zip_code}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="shipping_telephone"
                  value={formData.shipping_telephone}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors ${
                    errors.shipping_telephone ? 'border-red-500' : 'border-blue-200'
                  }`}
                  placeholder="+1 (213) 555-7890"
                />
                {errors.shipping_telephone && (
                  <p className="mt-1 text-sm text-red-600">{errors.shipping_telephone}</p>
                )}
              </div>
            </div>
          </div>

          {/* 收款信息 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-blue-700 border-b border-blue-200 pb-2">
              Payment Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors ${
                    errors.payment_method ? 'border-red-500' : 'border-blue-200'
                  }`}
                >
                  <option value="">Select Payment Method</option>
                  {paymentMethods.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
                {errors.payment_method && (
                  <p className="mt-1 text-sm text-red-600">{errors.payment_method}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Account <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="payment_account"
                  value={formData.payment_account}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors ${
                    errors.payment_account ? 'border-red-500' : 'border-blue-200'
                  }`}
                  placeholder="emily.johnson@gmail.com"
                />
                {errors.payment_account && (
                  <p className="mt-1 text-sm text-red-600">{errors.payment_account}</p>
                )}
              </div>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-blue-100/50">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

