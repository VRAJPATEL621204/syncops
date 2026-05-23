import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Shield, User, Lock, Phone, CheckCircle, AlertCircle, ArrowRight, Building2, Users, Users2, MessageSquare } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { inviteAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import 'react-phone-number-input/style.css';

const AcceptInvitePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const tokenFromUrl = searchParams.get('token');
  
  const [step, setStep] = useState(tokenFromUrl ? 'loading' : 'input');
  const [inviteToken, setInviteToken] = useState(tokenFromUrl || '');
  const [inviteData, setInviteData] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (tokenFromUrl) {
      validateInvite(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const validateInvite = async (token) => {
    setLoading(true);
    setError('');
    try {
      const response = await inviteAPI.validateInvite(token);
      setInviteData(response.data.data.invite);
      setStep('form');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired invitation');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSubmit = (e) => {
    e.preventDefault();
    if (inviteToken.trim()) {
      validateInvite(inviteToken.trim());
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName || !formData.password || !formData.phoneNumber) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await inviteAPI.acceptInvite({
        token: inviteToken || tokenFromUrl,
        fullName: formData.fullName,
        password: formData.password,
        phoneNumber: formData.phoneNumber,
      });

      const { user, token } = response.data.data;
      login(user, token);
      setSuccess(true);
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900 border-slate-800 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 border-4 border-cyan-600/30 border-t-cyan-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900 border-slate-800 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-600/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-white mb-2">
              Welcome to the Team!
            </CardTitle>
            <CardDescription className="text-slate-400">
              Redirecting to your dashboard...
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white">
              {step === 'input' ? 'Accept Invitation' : 'Join Organization'}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {step === 'input' 
                ? 'Enter your invitation token to get started'
                : 'Create your account to join the team'
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {step === 'input' && (
              <form onSubmit={handleTokenSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="token" className="text-slate-300">
                    Invitation Token
                  </Label>
                  <Input
                    id="token"
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                    placeholder="Paste your invitation token here"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !inviteToken.trim()}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {loading ? 'Validating...' : 'Continue'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            )}

            {step === 'form' && inviteData && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Invite Info */}
                <div className="p-4 bg-slate-800/50 rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-cyan-500" />
                    <div>
                      <p className="text-xs text-slate-500">Organization</p>
                      <p className="text-sm text-white font-medium">{inviteData.organization?.name}</p>
                    </div>
                  </div>
                  {inviteData.team && (
                    <div className="flex items-center gap-3">
                      <Users2 className="w-5 h-5 text-cyan-500" />
                      <div>
                        <p className="text-xs text-slate-500">Team</p>
                        <p className="text-sm text-white font-medium">{inviteData.team.name}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-cyan-500" />
                    <div>
                      <p className="text-xs text-slate-500">Role</p>
                      <p className="text-sm text-white font-medium capitalize">{inviteData.role}</p>
                    </div>
                  </div>
                  {inviteData.welcomeMessage && (
                    <div className="flex items-start gap-3 pt-2 border-t border-slate-700/50">
                      <MessageSquare className="w-5 h-5 text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-500">Message from inviter</p>
                        <p className="text-sm text-slate-300 italic">"{inviteData.welcomeMessage}"</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-slate-300 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </Label>
                  <PhoneInput
                    international
                    countryCallingCodeEditable={false}
                    defaultCountry="IN"
                    value={formData.phoneNumber}
                    onChange={(value) => setFormData(prev => ({ ...prev, phoneNumber: value || '' }))}
                    disabled={loading}
                    className="phone-input-custom"
                  />
                  <p className="text-xs text-slate-500">Phone number with country code for SMS OTP verification</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
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
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('input')}
                    className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    {loading ? 'Joining...' : 'Join Organization'}
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

export default AcceptInvitePage;
