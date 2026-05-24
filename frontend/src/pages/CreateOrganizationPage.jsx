import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Building2, Link2, User, Mail, Phone, Lock, ArrowRight, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authAPI } from '@/services/api';
import PasswordStrengthBar from '@/components/ui/PasswordStrengthBar';
import 'react-phone-number-input/style.css';

const CreateOrganizationPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationSlug: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateStep1 = () => {
    const errs = {};
    if (!formData.organizationName.trim()) errs.organizationName = 'Organization name is required';
    if (!formData.organizationSlug.trim()) {
      errs.organizationSlug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.organizationSlug)) {
      errs.organizationSlug = 'Only lowercase letters, numbers, and hyphens';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = 'Full name is required';
    if (!formData.email) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Enter a valid email address';
    }
    if (!formData.phoneNumber) errs.phoneNumber = 'Phone number is required';
    if (!formData.password) {
      errs.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }
    if (!formData.confirmPassword) {
      errs.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    setError('');
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateStep2()) return;

    setLoading(true);
    try {
      const response = await authAPI.signup({
        organizationName: formData.organizationName,
        organizationSlug: formData.organizationSlug,
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        password: formData.password,
      });

      const { tempUserId, phoneNumber, devOtp } = response.data.data;
      
      // Navigate to OTP verification
      navigate('/verify-otp', {
        state: {
          tempUserId,
          phoneNumber,
          devOtp,
          email: formData.email,
          purpose: 'signup',
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field) =>
    `bg-[hsl(217,33%,10%)] border text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,35%)] focus:border-cyan-500 transition-colors ${
      fieldErrors[field] ? 'border-red-500/60' : 'border-[hsl(217,33%,17%)]'
    }`;

  const FieldError = ({ field }) =>
    fieldErrors[field] ? (
      <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
        <AlertCircle className="w-3 h-3" />{fieldErrors[field]}
      </p>
    ) : null;

  return (
    <div className="min-h-screen bg-[hsl(222,47%,5%)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="/logo.png" alt="SyncOps" className="w-11 h-11 rounded-xl object-contain" />
          <span className="text-2xl font-bold text-[hsl(210,40%,98%)]">SyncOps</span>
        </div>

        <Card className="bg-[hsl(222,47%,7%)] border-[hsl(217,33%,12%)]">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold text-[hsl(210,40%,98%)] text-center">
              Create Organization
            </CardTitle>
            <CardDescription className="text-[hsl(215,20%,55%)] text-sm text-center">
              {step === 1 ? 'Step 1 of 2 — Organization Details' : 'Step 2 of 2 — Admin Account'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Progress */}
            <div className="flex gap-2 mb-6">
              <div className={`flex-1 h-1 rounded-full transition-colors ${step >= 1 ? 'bg-cyan-500' : 'bg-[hsl(217,33%,15%)]'}`} />
              <div className={`flex-1 h-1 rounded-full transition-colors ${step >= 2 ? 'bg-cyan-500' : 'bg-[hsl(217,33%,15%)]'}`} />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="organizationName" className="text-[hsl(215,20%,70%)] text-sm flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-cyan-500" />
                    Organization Name
                  </Label>
                  <Input
                    id="organizationName"
                    name="organizationName"
                    placeholder="Acme Corporation"
                    value={formData.organizationName}
                    onChange={handleChange}
                    disabled={loading}
                    className={inputCls('organizationName')}
                  />
                  <FieldError field="organizationName" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="organizationSlug" className="text-[hsl(215,20%,70%)] text-sm flex items-center gap-2">
                    <Link2 className="w-3.5 h-3.5 text-cyan-500" />
                    Organization Slug
                  </Label>
                  <Input
                    id="organizationSlug"
                    name="organizationSlug"
                    placeholder="acme-corp"
                    value={formData.organizationSlug}
                    onChange={handleChange}
                    disabled={loading}
                    className={inputCls('organizationSlug')}
                  />
                  <FieldError field="organizationSlug" />
                  {!fieldErrors.organizationSlug && (
                    <p className="text-xs text-[hsl(215,20%,45%)]">
                      Used in URLs: syncops.io/o/{formData.organizationSlug || 'your-org'}
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-11 mt-2">
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-[hsl(215,20%,70%)] text-sm flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-cyan-500" />
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={handleChange}
                    disabled={loading}
                    className={inputCls('fullName')}
                  />
                  <FieldError field="fullName" />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[hsl(215,20%,70%)] text-sm flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-cyan-500" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    className={inputCls('email')}
                  />
                  <FieldError field="email" />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label className="text-[hsl(215,20%,70%)] text-sm flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-cyan-500" />
                    Phone Number
                  </Label>
                  <PhoneInput
                    international
                    countryCallingCodeEditable={false}
                    defaultCountry="IN"
                    value={formData.phoneNumber}
                    onChange={(value) => {
                      setFormData((prev) => ({ ...prev, phoneNumber: value || '' }));
                      if (fieldErrors.phoneNumber) setFieldErrors((prev) => ({ ...prev, phoneNumber: '' }));
                    }}
                    disabled={loading}
                    className={`phone-input-custom${fieldErrors.phoneNumber ? ' phone-input-error' : ''}`}
                  />
                  <FieldError field="phoneNumber" />
                  {!fieldErrors.phoneNumber && <p className="text-xs text-[hsl(215,20%,45%)]">Used for OTP verification</p>}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-[hsl(215,20%,70%)] text-sm flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-cyan-500" />
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={loading}
                      className={`${inputCls('password')} pr-10`}
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(215,20%,45%)] hover:text-[hsl(210,40%,98%)] transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <FieldError field="password" />
                  <PasswordStrengthBar password={formData.password} />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-[hsl(215,20%,70%)] text-sm">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      disabled={loading}
                      className={`${inputCls('confirmPassword')} pr-10`}
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(215,20%,45%)] hover:text-[hsl(210,40%,98%)] transition-colors">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <FieldError field="confirmPassword" />
                  {formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Passwords match
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}
                    className="flex-1 border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] bg-transparent hover:bg-[hsl(217,33%,12%)]">
                    Back
                  </Button>
                  <Button type="submit" disabled={loading}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white">
                    {loading ? 'Creating...' : 'Create Organization'}
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-[hsl(215,20%,55%)]">
                Already have an account?{' '}
                <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateOrganizationPage;
