import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Building2, Link2, User, Mail, Phone, Lock, ArrowRight, CheckCircle } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authAPI } from '@/services/api';
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
  const [step, setStep] = useState(1);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep1 = () => {
    if (!formData.organizationName || !formData.organizationSlug) {
      setError('Please fill in all organization details');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.fullName || !formData.email || !formData.phoneNumber || !formData.password) {
      setError('Please fill in all admin details');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (validateStep1()) {
      setStep(2);
    }
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

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-cyan-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">SyncOps</span>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-white text-center">
              Create Organization
            </CardTitle>
            <CardDescription className="text-slate-400 text-center">
              {step === 1 ? 'Step 1: Organization Details' : 'Step 2: Admin Account'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Progress */}
            <div className="flex gap-2 mb-6">
              <div className={`flex-1 h-1 rounded ${step >= 1 ? 'bg-cyan-600' : 'bg-slate-700'}`} />
              <div className={`flex-1 h-1 rounded ${step >= 2 ? 'bg-cyan-600' : 'bg-slate-700'}`} />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="organizationName" className="text-slate-300 flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-cyan-500" />
                    Organization Name
                  </Label>
                  <Input
                    id="organizationName"
                    name="organizationName"
                    placeholder="Acme Corporation"
                    value={formData.organizationName}
                    onChange={handleChange}
                    disabled={loading}
                    required
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizationSlug" className="text-slate-300 flex items-center gap-3">
                    <Link2 className="w-4 h-4 text-cyan-500" />
                    Organization Slug
                  </Label>
                  <Input
                    id="organizationSlug"
                    name="organizationSlug"
                    placeholder="acme-corp"
                    value={formData.organizationSlug}
                    onChange={handleChange}
                    disabled={loading}
                    required
                    pattern="[a-z0-9-]+"
                    title="Only lowercase letters, numbers, and hyphens"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500"
                  />
                  <p className="text-xs text-slate-500">
                    Used in URLs: syncops.io/o/{formData.organizationSlug || 'your-org'}
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-11"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-slate-300 flex items-center gap-3">
                    <User className="w-4 h-4 text-cyan-500" />
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={handleChange}
                    disabled={loading}
                    required
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300 flex items-center gap-3">
                    <Mail className="w-4 h-4 text-cyan-500" />
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
                    required
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-3">
                    <Phone className="w-4 h-4 text-cyan-500" />
                    Phone Number
                  </Label>
                  <PhoneInput
                    international
                    countryCallingCodeEditable={false}
                    defaultCountry="IN"
                    value={formData.phoneNumber}
                    onChange={(value) => setFormData((prev) => ({ ...prev, phoneNumber: value || '' }))}
                    disabled={loading}
                    className="phone-input-custom"
                  />
                  <p className="text-xs text-slate-500">Phone number with country code for SMS OTP</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300 flex items-center gap-3">
                    <Lock className="w-4 h-4 text-cyan-500" />
                    Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    required
                    minLength={8}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500"
                  />
                  <p className="text-xs text-slate-500">Minimum 8 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-300">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                    required
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    {loading ? 'Creating...' : 'Create Organization'}
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="text-cyan-500 hover:text-cyan-400">
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
