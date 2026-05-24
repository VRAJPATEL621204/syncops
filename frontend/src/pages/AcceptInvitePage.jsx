import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Shield, User, Lock, Phone, CheckCircle, AlertCircle, ArrowRight, Building2, Users, Users2, MessageSquare, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { inviteAPI, authAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import PasswordStrengthBar from '@/components/ui/PasswordStrengthBar';
import 'react-phone-number-input/style.css';

const AcceptInvitePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, user: currentUser, isAuthenticated } = useAuth();
  
  const tokenFromUrl = searchParams.get('token');
  
  // Steps: 'input' | 'loading' | 'form' | 'login' | 'existing_login' | 'processing' | 'success' | 'error'
  const [step, setStep] = useState(tokenFromUrl ? 'loading' : 'input');
  const [inviteToken, setInviteToken] = useState(tokenFromUrl || '');
  const [inviteData, setInviteData] = useState(null);
  const [userExists, setUserExists] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    loginEmail: '',
    loginPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
      const { invite, userExists: emailExists } = response.data.data;
      setInviteData(invite);
      
      // Check if user is already logged in
      if (isAuthenticated && currentUser) {
        if (currentUser.organizationId === invite.organization.id) {
          setStep('processing');
          await handleAcceptInvite(token);
          return;
        } else {
          setError('You belong to a different organization. Cannot accept this invite.');
          setStep('error');
          return;
        }
      }
      
      // Email already has an account → go straight to login, pre-fill email
      if (emailExists) {
        setUserExists(true);
        setFormData(prev => ({ ...prev, loginEmail: invite.email }));
        setStep('form');
      } else {
        // New user → show signup form
        setStep('form');
      }
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

  const handleNewUserSubmit = async (e) => {
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

    await handleAcceptInvite(inviteToken || tokenFromUrl, {
      fullName: formData.fullName,
      password: formData.password,
      phoneNumber: formData.phoneNumber,
    });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.loginPassword) {
      setError('Please enter your password');
      return;
    }

    // Pass password directly to acceptInvite — backend verifies it for existing users
    await handleAcceptInvite(inviteToken || tokenFromUrl, {
      password: formData.loginPassword,
    });
  };

  const handleAcceptInvite = async (token, data = {}, authToken = null) => {
    setLoading(true);
    try {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const response = await inviteAPI.acceptInvite({
        token,
        ...data,
      }, { headers });

      const { user } = response.data.data;
      const isNewUser = response.data.isNewUser;
      
      // Cookie set by backend — just store user in context
      login(user);
      setSuccess(true);
      setSuccessMessage(isNewUser 
        ? 'Account created successfully!' 
        : "You've been added to the team!"
      );
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      const errorCode = err.response?.data?.code;
      const errorMsg = err.response?.data?.message || 'Failed to accept invitation';
      
      if (errorCode === 'INVALID_PASSWORD') {
        setError('Incorrect password. Please try again.');
        return; // stay on login form
      } else if (errorCode === 'ALREADY_IN_TEAM') {
        setError('You already belong to this team.');
      } else if (errorCode === 'DIFFERENT_ORG') {
        setError('You already belong to a different organization.');
      } else if (errorCode === 'NEW_USER_REQUIRED_FIELDS') {
        setUserExists(true);
        setStep('form');
        setError('');
        return;
      } else {
        setError(errorMsg);
      }
      
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'loading' || step === 'processing') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900 border-slate-800 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 border-4 border-cyan-600/30 border-t-cyan-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">
              {step === 'processing' ? 'Adding you to the team...' : 'Validating invitation...'}
            </p>
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
    <div className="min-h-screen bg-[hsl(222,47%,5%)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="/logo.png" alt="SyncOps" className="w-11 h-11 rounded-xl object-contain" />
          <span className="text-2xl font-bold text-[hsl(210,40%,98%)]">SyncOps</span>
        </div>

        <Card className="bg-[hsl(222,47%,7%)] border-[hsl(217,33%,12%)]">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-semibold text-[hsl(210,40%,98%)]">
              {step === 'input' ? 'Accept Invitation' : userExists ? 'Sign in to Join' : 'Create Account'}
            </CardTitle>
            <CardDescription className="text-[hsl(215,20%,55%)] text-sm">
              {step === 'input'
                ? 'Enter your invitation token to get started'
                : userExists
                  ? 'Your email is already registered — sign in to accept the invite'
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
                <div className="space-y-1.5">
                  <Label htmlFor="token" className="text-[hsl(215,20%,70%)] text-sm">
                    Invitation Token
                  </Label>
                  <Input
                    id="token"
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                    placeholder="Paste your invitation token here"
                    className="bg-[hsl(217,33%,10%)] border border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,35%)] focus:border-cyan-500"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !inviteToken.trim()}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-11"
                >
                  {loading ? 'Validating...' : 'Continue'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            )}

            {step === 'form' && inviteData && !userExists && (
              <form onSubmit={handleNewUserSubmit} className="space-y-4">
                {/* Invite Info */}
                <div className="p-4 bg-[hsl(217,33%,10%)] rounded-xl space-y-3 border border-[hsl(217,33%,15%)]">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-cyan-400" />
                    <div>
                      <p className="text-xs text-[hsl(215,20%,45%)])">Organization</p>
                      <p className="text-sm text-[hsl(210,40%,98%)] font-medium">{inviteData.organization?.name}</p>
                    </div>
                  </div>
                  {inviteData.team && (
                    <div className="flex items-center gap-3">
                      <Users2 className="w-4 h-4 text-cyan-400" />
                      <div>
                        <p className="text-xs text-[hsl(215,20%,45%)]">Team</p>
                        <p className="text-sm text-[hsl(210,40%,98%)] font-medium">{inviteData.team.name}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <div>
                      <p className="text-xs text-[hsl(215,20%,45%)]">Role</p>
                      <p className="text-sm text-[hsl(210,40%,98%)] font-medium capitalize">{inviteData.role}</p>
                    </div>
                  </div>
                  {inviteData.welcomeMessage && (
                    <div className="flex items-start gap-3 pt-2 border-t border-[hsl(217,33%,15%)]">
                      <MessageSquare className="w-4 h-4 text-amber-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-[hsl(215,20%,45%)]">Message from inviter</p>
                        <p className="text-sm text-[hsl(215,20%,70%)] italic">"{inviteData.welcomeMessage}"</p>
                      </div>
                    </div>
                  )}
                </div>

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
                    className="bg-[hsl(217,33%,10%)] border border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,35%)] focus:border-cyan-500"
                  />
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
                    onChange={(value) => setFormData(prev => ({ ...prev, phoneNumber: value || '' }))}
                    disabled={loading}
                    className="phone-input-custom"
                  />
                  <p className="text-xs text-[hsl(215,20%,45%)]">Used for OTP verification</p>
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
                      className="bg-[hsl(217,33%,10%)] border border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,35%)] focus:border-cyan-500 pr-10"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(215,20%,45%)] hover:text-[hsl(210,40%,98%)] transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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
                      className="bg-[hsl(217,33%,10%)] border border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,35%)] focus:border-cyan-500 pr-10"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(215,20%,45%)] hover:text-[hsl(210,40%,98%)] transition-colors">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Passwords match
                    </p>
                  )}
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Passwords do not match
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('input')}
                    className="flex-1 border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] bg-transparent hover:bg-[hsl(217,33%,12%)]"
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


            {/* Existing User Login Form */}
            {step === 'form' && inviteData && userExists && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Invite context card */}
                <div className="p-4 bg-[hsl(217,33%,10%)] rounded-xl border border-[hsl(217,33%,15%)] space-y-3">
                  <p className="text-xs text-[hsl(215,20%,45%)] uppercase tracking-wide font-medium">You've been invited to</p>
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <p className="text-xs text-[hsl(215,20%,45%)]">Organization</p>
                      <p className="text-sm text-[hsl(210,40%,98%)] font-medium">{inviteData.organization?.name}</p>
                    </div>
                  </div>
                  {inviteData.team && (
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <p className="text-xs text-[hsl(215,20%,45%)]">Team</p>
                        <p className="text-sm text-[hsl(210,40%,98%)] font-medium">{inviteData.team.name}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Email — pre-filled, read-only */}
                <div className="space-y-1.5">
                  <Label htmlFor="loginEmail" className="text-[hsl(215,20%,70%)] text-sm flex items-center gap-2">
                    <UserPlus className="w-3.5 h-3.5 text-cyan-500" />
                    Email
                  </Label>
                  <Input
                    id="loginEmail"
                    name="loginEmail"
                    type="email"
                    value={formData.loginEmail}
                    onChange={handleChange}
                    readOnly={!!inviteData?.email}
                    className="bg-[hsl(217,33%,8%)] border border-[hsl(217,33%,15%)] text-[hsl(215,20%,60%)] cursor-default"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="loginPassword" className="text-[hsl(215,20%,70%)] text-sm flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-cyan-500" />
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="loginPassword"
                      name="loginPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.loginPassword}
                      onChange={handleChange}
                      autoFocus
                      className="bg-[hsl(217,33%,10%)] border border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,35%)] focus:border-cyan-500 pr-10"
                      placeholder="Enter your password"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(215,20%,45%)] hover:text-[hsl(210,40%,98%)] transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-11"
                >
                  {loading ? (
                    <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</span>
                  ) : (
                    <span className="flex items-center gap-2"><LogIn className="w-4 h-4" />Sign in &amp; Join Team</span>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setUserExists(false)}
                  className="w-full text-[hsl(215,20%,45%)] hover:text-[hsl(210,40%,98%)]"
                >
                  Back to signup
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AcceptInvitePage;
