import { useState, useEffect } from 'react';
import { X, Mail, UserPlus, Check, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inviteAPI, teamAPI } from '@/services/api';
import { toast } from '@/hooks/use-toast';

export default function InviteModal({ isOpen, onClose, onSuccess, defaultRole = 'manager' }) {
  const [formData, setFormData] = useState({
    email: '',
    role: defaultRole,
    teamId: '',
    welcomeMessage: '',
  });
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingTeams, setFetchingTeams] = useState(false);
  const [errors, setErrors] = useState({});
  const [inviteResult, setInviteResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTeams();
      setInviteResult(null);
      setCopied(false);
    }
  }, [isOpen]);

  const fetchTeams = async () => {
    setFetchingTeams(true);
    try {
      const response = await teamAPI.getTeams();
      setTeams(response.data.data || []);
    } catch (error) {
      console.error('Fetch teams error:', error);
    } finally {
      setFetchingTeams(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await inviteAPI.createInvite({
        email: formData.email.trim(),
        role: formData.role,
        teamId: formData.teamId || undefined,
        welcomeMessage: formData.welcomeMessage.trim() || undefined,
      });

      setInviteResult(response.data.data);
      toast({
        title: 'Invitation Sent',
        description: `Invite sent to ${formData.email}`,
        variant: 'success',
      });
      onSuccess?.(response.data.data);
    } catch (error) {
      console.error('Create invite error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteResult?.devToken) {
      const link = `${window.location.origin}/accept-invite?token=${inviteResult.devToken}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setFormData({ email: '', role: defaultRole, teamId: '', welcomeMessage: '' });
    setInviteResult(null);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  // Success state after invite is sent
  if (inviteResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Invitation Sent!</h2>
            <p className="text-slate-400 mb-6">
              An invitation has been sent to <span className="text-cyan-400">{formData.email}</span>
            </p>

            {inviteResult.devToken && (
              <div className="bg-slate-800 rounded-lg p-4 mb-4">
                <p className="text-xs text-slate-500 mb-2">Development Mode - Copy Invite Link:</p>
                <div className="flex gap-2">
                  <code className="flex-1 bg-slate-950 px-3 py-2 rounded text-xs text-cyan-400 truncate">
                    {window.location.origin}/accept-invite?token={inviteResult.devToken}
                  </code>
                  <Button
                    size="sm"
                    onClick={copyInviteLink}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setInviteResult(null);
                  setFormData({ email: '', role: defaultRole, teamId: '', welcomeMessage: '' });
                }}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                Invite Another
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <UserPlus className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Invite {formData.role === 'manager' ? 'Manager' : 'Employee'}
              </h2>
              <p className="text-xs text-slate-400">Send an invitation to join your organization</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="colleague@company.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                className={`pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500 ${
                  errors.email ? 'border-red-500' : ''
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-400">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-slate-300">Role</Label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
            >
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teamId" className="text-slate-300">
              Assign to Team <span className="text-slate-500">(Optional)</span>
            </Label>
            <select
              id="teamId"
              name="teamId"
              value={formData.teamId}
              onChange={handleChange}
              disabled={loading || fetchingTeams}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none disabled:opacity-50"
            >
              <option value="">Select a team...</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
            {fetchingTeams && (
              <p className="text-xs text-slate-500">Loading teams...</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcomeMessage" className="text-slate-300">
              Welcome Message <span className="text-slate-500">(Optional)</span>
            </Label>
            <textarea
              id="welcomeMessage"
              name="welcomeMessage"
              placeholder="Add a personal message to the invitation email..."
              value={formData.welcomeMessage}
              onChange={handleChange}
              disabled={loading}
              rows={3}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Invite'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
