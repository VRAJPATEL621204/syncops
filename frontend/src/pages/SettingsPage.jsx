import { useState, useRef } from 'react';
import { Camera, User, Lock, Save, Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { authAPI, uploadAPI } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import DashboardLayout from '@/layouts/DashboardLayout';

const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    phoneNumber: user?.phoneNumber || '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.profileImage || null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const getInitials = (name) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 10MB allowed', variant: 'destructive' });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleProfileSave = async () => {
    if (!profileForm.fullName.trim()) {
      toast({ title: 'Validation error', description: 'Full name is required', variant: 'destructive' });
      return;
    }

    setProfileLoading(true);
    try {
      let profileImageUrl = user?.profileImage;

      // Upload avatar if new one selected
      if (avatarFile) {
        setAvatarUploading(true);
        const uploadRes = await uploadAPI.uploadFile(avatarFile);
        profileImageUrl = uploadRes.data.data?.mediaUrl || uploadRes.data.data?.url || uploadRes.data.data?.fileUrl;
        setAvatarUploading(false);
      }

      const res = await authAPI.updateProfile({
        fullName: profileForm.fullName.trim(),
        phoneNumber: profileForm.phoneNumber.trim() || null,
        profileImage: profileImageUrl,
      });

      const updatedUser = res.data.data?.user;
      updateUser(updatedUser);
      setAvatarFile(null);
      setAvatarPreview(updatedUser.profileImage || null);

      toast({ title: 'Profile updated', description: 'Your profile has been saved successfully' });
    } catch (error) {
      setAvatarUploading(false);
      toast({
        title: 'Update failed',
        description: error.response?.data?.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({ title: 'Validation error', description: 'All password fields are required', variant: 'destructive' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast({ title: 'Validation error', description: 'New password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: 'Validation error', description: 'New passwords do not match', variant: 'destructive' });
      return;
    }

    setPasswordLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({ title: 'Password changed', description: 'Your password has been updated successfully' });
    } catch (error) {
      toast({
        title: 'Password change failed',
        description: error.response?.data?.message || 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const passwordStrength = (pw) => {
    if (!pw) return null;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: 'w-1/4' };
    if (score === 2) return { label: 'Fair', color: 'bg-yellow-500', width: 'w-2/4' };
    if (score === 3) return { label: 'Good', color: 'bg-blue-500', width: 'w-3/4' };
    return { label: 'Strong', color: 'bg-green-500', width: 'w-full' };
  };

  const strength = passwordStrength(passwordForm.newPassword);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your account details and security</p>
        </div>

        {/* Profile Card */}
        <Card className="bg-[#1E293B] border-slate-700">
          <CardHeader className="border-b border-slate-700 pb-4">
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <User className="w-5 h-5 text-cyan-400" />
              Profile Information
            </CardTitle>
            <CardDescription className="text-slate-500">
              Update your name, phone number, and profile picture
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-5">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-600 bg-slate-800 flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-cyan-400">
                      {getInitials(profileForm.fullName || user?.fullName)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-white" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">{user?.fullName}</p>
                <p className="text-xs text-slate-500"><span className="capitalize">{user?.role}</span> · {user?.email?.toLowerCase()}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-cyan-400 hover:text-cyan-300 mt-1.5 transition-colors"
                >
                  {avatarFile ? 'Change photo' : 'Upload photo'}
                </button>
                {avatarFile && (
                  <button
                    type="button"
                    onClick={() => { setAvatarFile(null); setAvatarPreview(user?.profileImage || null); }}
                    className="text-xs text-slate-500 hover:text-red-400 ml-3 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Full Name</Label>
                <Input
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm(p => ({ ...p, fullName: e.target.value }))}
                  placeholder="Your full name"
                  className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Phone Number</Label>
                <Input
                  value={profileForm.phoneNumber}
                  onChange={(e) => setProfileForm(p => ({ ...p, phoneNumber: e.target.value }))}
                  placeholder="+91 9999999999"
                  className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Email</Label>
                <Input
                  value={user?.email || ''}
                  disabled
                  className="bg-slate-800/50 border-slate-700 text-slate-400 cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-600">Email cannot be changed</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Role</Label>
                <Input
                  value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
                  disabled
                  className="bg-slate-800/50 border-slate-700 text-slate-400 cursor-not-allowed capitalize"
                />
                <p className="text-[11px] text-slate-600">Role is managed by your organization</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleProfileSave}
                disabled={profileLoading}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {profileLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {avatarUploading ? 'Uploading photo...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Password Card */}
        <Card className="bg-[#1E293B] border-slate-700">
          <CardHeader className="border-b border-slate-700 pb-4">
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <Lock className="w-5 h-5 text-cyan-400" />
              Change Password
            </CardTitle>
            <CardDescription className="text-slate-500">
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* Current password */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                  className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">New Password</Label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                  placeholder="Min 8 characters"
                  className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength bar */}
              {strength && (
                <div className="mt-1.5 space-y-1">
                  <div className="h-1 rounded-full bg-slate-700 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
                  </div>
                  <p className="text-[11px] text-slate-500">Strength: <span className="text-slate-300">{strength.label}</span></p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Confirm New Password</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Re-enter new password"
                  className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Match indicator */}
              {passwordForm.confirmPassword && (
                <div className="flex items-center gap-1.5 mt-1">
                  {passwordForm.newPassword === passwordForm.confirmPassword ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-[11px] text-green-400">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-[11px] text-red-400">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <Button
                onClick={handlePasswordSave}
                disabled={passwordLoading}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {passwordLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Update Password
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Info Card */}
        <Card className="bg-[#1E293B] border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="text-slate-500">Account ID</div>
              <div className="text-slate-400 font-mono text-xs">{user?.id?.slice(0, 8)}...{user?.id?.slice(-4)}</div>
            </div>
            <div className="flex items-center justify-between text-sm mt-3">
              <div className="text-slate-500">Organization</div>
              <div className="text-slate-400 text-xs">{user?.organization?.name || user?.organizationId?.slice(0, 8) + '...'}</div>
            </div>
            <div className="flex items-center justify-between text-sm mt-3">
              <div className="text-slate-500">Email Verified</div>
              <div className={`text-xs font-medium ${user?.emailVerified ? 'text-green-400' : 'text-yellow-400'}`}>
                {user?.emailVerified ? '✓ Verified' : 'Not Verified'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
