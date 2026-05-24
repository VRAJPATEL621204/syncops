import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authAPI } from '@/services/api';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.email) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Enter a valid email address';
    }
    if (!formData.password) {
      errs.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      const { tempUserId, phoneNumber, devOtp } = response.data.data;

      // Navigate to OTP verification
      navigate('/verify-otp', {
        state: {
          tempUserId,
          phoneNumber,
          devOtp,
          email: formData.email,
          purpose: 'login',
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(222,47%,5%)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="/logo.png" alt="SyncOps" className="w-11 h-11 rounded-xl object-contain" />
          <span className="text-2xl font-bold text-[hsl(210,40%,98%)]">SyncOps</span>
        </div>

        <Card className="bg-[hsl(222,47%,7%)] border-[hsl(217,33%,12%)]">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-semibold text-[hsl(210,40%,98%)]">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-[hsl(215,20%,55%)] text-sm">
              Sign in to your organization
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="email"
                  className={`bg-[hsl(217,33%,10%)] border text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,35%)] focus:border-cyan-500 transition-colors ${
                    fieldErrors.email ? 'border-red-500/60' : 'border-[hsl(217,33%,17%)]'
                  }`}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{fieldErrors.email}
                  </p>
                )}
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
                    autoComplete="current-password"
                    className={`bg-[hsl(217,33%,10%)] border text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,35%)] focus:border-cyan-500 pr-10 transition-colors ${
                      fieldErrors.password ? 'border-red-500/60' : 'border-[hsl(217,33%,17%)]'
                    }`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(215,20%,45%)] hover:text-[hsl(210,40%,98%)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{fieldErrors.password}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-11"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-800 text-center space-y-3">
              <p className="text-sm text-slate-400">
                Don't have an account?{' '}
                <Link to="/create-organization" className="text-cyan-500 hover:text-cyan-400 font-medium">
                  Create organization
                </Link>
              </p>
              <p className="text-sm text-slate-500">
                Have an invite?{' '}
                <Link to="/accept-invite" className="text-cyan-500 hover:text-cyan-400 font-medium">
                  Join team
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-slate-500">
          Protected by phone-based OTP verification
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
