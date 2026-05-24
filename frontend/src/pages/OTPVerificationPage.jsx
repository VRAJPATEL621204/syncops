import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Shield, Smartphone, RefreshCw, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { otpAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const OTPVerificationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [success, setSuccess] = useState(false);

  // Get data from navigation state
  const { tempUserId, phoneNumber, devOtp, email, purpose } = location.state || {};

  useEffect(() => {
    if (!tempUserId || !phoneNumber) {
      navigate('/create-organization');
      return;
    }
  }, [tempUserId, phoneNumber, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (index, value) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/\D/g, '');
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      // Focus last input after paste
      document.getElementById('otp-5')?.focus();
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError('');
    try {
      await otpAPI.resendOTP({
        userId: tempUserId,
        phoneNumber,
        purpose: purpose || 'verification',
      });
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let response;
      if (purpose === 'signup') {
        response = await otpAPI.verifySignup({
          phoneNumber,
          otp: otpCode,
          tempUserId,
        });
      } else {
        response = await otpAPI.verifyLogin({
          email,
          phoneNumber,
          otp: otpCode,
        });
      }

      const { user } = response.data.data;
      
      // Cookie set by backend
      login(user);
      
      setSuccess(true);
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  const maskPhoneNumber = (phone) => {
    if (!phone) return '';
    return phone.replace(/\d(?=\d{4})/g, '*');
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900 border-slate-800 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-600/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-white mb-2">
              Verification Successful!
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
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-cyan-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">SyncOps</span>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-cyan-600/20 flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-6 h-6 text-cyan-500" />
            </div>
            <CardTitle className="text-xl font-bold text-white">
              Verify Your Phone
            </CardTitle>
            <CardDescription className="text-slate-400">
              Enter the 6-digit OTP sent to<br />
              <span className="text-cyan-400 font-medium">{maskPhoneNumber(phoneNumber)}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {/* Dev Mode Notice */}
            {devOtp && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-sm text-center">
                <span className="font-medium">Development Mode:</span> Use OTP <span className="font-bold">{devOtp}</span>
              </div>
            )}

            {/* OTP Inputs */}
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={loading || success}
                  className="w-12 h-12 text-center text-xl font-bold bg-slate-800 border-slate-700 text-white focus:border-cyan-500 focus:ring-cyan-500 disabled:opacity-50"
                />
              ))}
            </div>
            <p className="text-xs text-center text-slate-500">
              Tip: You can paste the full 6-digit code
            </p>

            {/* Verify Button */}
            <Button
              onClick={handleSubmit}
              disabled={loading || otp.join('').length !== 6}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-11"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Verify OTP
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            {/* Resend Section */}
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-2">Didn't receive the code?</p>
              {countdown > 0 ? (
                <p className="text-sm text-slate-500">
                  Resend in <span className="text-cyan-500">{countdown}s</span>
                </p>
              ) : (
                <Button
                  variant="ghost"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="text-cyan-500 hover:text-cyan-400"
                >
                  {resendLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Resend OTP
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Back Link */}
            <div className="text-center pt-4 border-t border-slate-800">
              <Link
                to={purpose === 'signup' ? '/create-organization' : '/login'}
                className="text-sm text-slate-400 hover:text-slate-300"
              >
                Go back
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OTPVerificationPage;
