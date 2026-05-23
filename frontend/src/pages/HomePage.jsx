import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Zap,
  Users,
  Lock,
  MessageSquare,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Radio,
  AlertTriangle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import MainLayout from '@/layouts/MainLayout';

const HomePage = () => {
  const features = [
    {
      icon: AlertTriangle,
      title: 'Incident Management',
      description: 'Real-time incident tracking, prioritization, and resolution workflows for your operations team.',
    },
    {
      icon: MessageSquare,
      title: 'Secure Operational Rooms',
      description: 'Dedicated collaboration spaces with role-based access for sensitive operational discussions.',
    },
    {
      icon: Lock,
      title: 'OTP-Secured Access',
      description: 'Phone-based two-factor authentication ensures only authorized personnel access critical systems.',
    },
    {
      icon: Users,
      title: 'Multi-Role Coordination',
      description: 'Streamlined workflows for Admins, Managers, and Employees with granular permissions.',
    },
    {
      icon: BarChart3,
      title: 'Operational Analytics',
      description: 'Comprehensive insights into incident patterns, response times, and team performance.',
    },
    {
      icon: ShieldCheck,
      title: 'Enterprise Security',
      description: 'Bank-grade encryption, audit logs, and compliance-ready security architecture.',
    },
  ];

  const workflowSteps = [
    { step: '01', title: 'Create Organization', desc: 'Setup your enterprise workspace in seconds' },
    { step: '02', title: 'Invite Team', desc: 'Add managers and employees via secure email invites' },
    { step: '03', title: 'Coordinate Operations', desc: 'Manage incidents in real-time with your team' },
    { step: '04', title: 'Analyze & Improve', desc: 'Leverage analytics to optimize response times' },
  ];

  const roles = [
    {
      title: 'Admin',
      description: 'Full control over organization, user management, and system configuration.',
      permissions: ['Create organization', 'Invite managers & employees', 'Access all incidents', 'View analytics'],
    },
    {
      title: 'Manager',
      description: 'Team oversight with ability to coordinate incidents and manage employees.',
      permissions: ['Invite employees', 'Manage team incidents', 'Create operational rooms', 'View team analytics'],
    },
    {
      title: 'Employee',
      description: 'Focused access to assigned incidents and collaboration tools.',
      permissions: ['View assigned incidents', 'Join operational rooms', 'Update incident status', 'Collaborate with team'],
    },
  ];

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-slate-950">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-600/10 border border-cyan-600/20">
                <Radio className="w-4 h-4 text-cyan-500" />
                <span className="text-sm text-cyan-400">Real-time Operations Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Real-time Incident{' '}
                <span className="text-cyan-500">Coordination</span> for Modern Operations
              </h1>

              <p className="text-lg text-slate-400 max-w-xl">
                SyncOps empowers enterprise teams to coordinate incidents, manage workflows, 
                and secure operational communications with military-grade security.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link to="/create-organization">
                  <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    Create Organization
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    Join SyncOps
                  </Button>
                </Link>
              </div>

              <div className="flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-cyan-500" />
                  <span>OTP Security</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-cyan-500" />
                  <span>Real-time Sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-cyan-500" />
                  <span>Enterprise Ready</span>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative">
              <div className="relative bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-6 shadow-2xl">
                {/* Dashboard Preview */}
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold text-white">Operations Dashboard</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-slate-400">Live</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Active', value: '12', color: 'text-amber-500' },
                      { label: 'Resolved', value: '48', color: 'text-green-500' },
                      { label: 'Teams', value: '5', color: 'text-cyan-500' },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-slate-800/50 rounded-lg p-3 text-center">
                        <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                        <div className="text-xs text-slate-500">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Recent Activity */}
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Recent Incidents</div>
                    {[
                      { title: 'Server Outage - DB Cluster', status: 'Critical', time: '2m ago' },
                      { title: 'API Latency Spike', status: 'High', time: '15m ago' },
                      { title: 'Payment Gateway Issue', status: 'Resolved', time: '1h ago' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                        <div>
                          <div className="text-sm text-white">{item.title}</div>
                          <div className="text-xs text-slate-500">{item.time}</div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          item.status === 'Critical' ? 'bg-red-500/20 text-red-400' :
                          item.status === 'High' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-slate-800 rounded-lg p-3 border border-slate-700 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-slate-300">Secure Connection</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything You Need for <span className="text-cyan-500">Operational Excellence</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Powerful tools designed for enterprise operations teams to coordinate, 
              communicate, and resolve incidents faster.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="bg-slate-800/50 border-slate-700 hover:border-cyan-600/30 transition-colors group">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-cyan-600/10 flex items-center justify-center mb-4 group-hover:bg-cyan-600/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-cyan-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Get Started in <span className="text-cyan-500">Minutes</span>
            </h2>
            <p className="text-lg text-slate-400">
              From setup to operational coordination in four simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflowSteps.map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 relative z-10">
                  <div className="text-4xl font-bold text-cyan-600/30 mb-4">{item.step}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </div>
                {index < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-0">
                    <ArrowRight className="w-6 h-6 text-slate-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section id="roles" className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Built for Every <span className="text-cyan-500">Team Member</span>
            </h2>
            <p className="text-lg text-slate-400">
              Role-based access ensures the right people have the right level of control
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {roles.map((role) => (
              <Card key={role.title} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-cyan-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">{role.title}</h3>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">{role.description}</p>
                  <ul className="space-y-2">
                    {role.permissions.map((perm) => (
                      <li key={perm} className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle className="w-4 h-4 text-cyan-500" />
                        {perm}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-600/10 border border-green-600/20 mb-6">
                <Lock className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-400">Enterprise-Grade Security</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Your Operations Data is <span className="text-cyan-500">Protected</span>
              </h2>

              <p className="text-lg text-slate-400 mb-8">
                Military-grade encryption, phone-based OTP verification, and comprehensive 
                audit trails keep your operational data secure.
              </p>

              <div className="space-y-4">
                {[
                  'Phone-based two-factor authentication',
                  'End-to-end encrypted communications',
                  'Role-based access control (RBAC)',
                  'Comprehensive audit logging',
                  'SOC 2 Type II compliant infrastructure',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-600/20 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-cyan-500" />
                    </div>
                    <span className="text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8">
                <div className="flex items-center justify-center mb-8">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-cyan-600/20 flex items-center justify-center">
                      <Shield className="w-12 h-12 text-cyan-500" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-cyan-500" />
                      <span className="text-slate-300">Session Timeout</span>
                    </div>
                    <span className="text-sm text-slate-500">7 days</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-cyan-500" />
                      <span className="text-slate-300">Encryption</span>
                    </div>
                    <span className="text-sm text-slate-500">AES-256</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-cyan-500" />
                      <span className="text-slate-300">OTP Expiry</span>
                    </div>
                    <span className="text-sm text-slate-500">10 minutes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Transform Your <span className="text-cyan-500">Operations</span>?
          </h2>
          <p className="text-lg text-slate-400 mb-8">
            Join thousands of enterprises using SyncOps to coordinate their operations teams.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/create-organization">
              <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                Create Organization
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-cyan-600 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-slate-400">Made with 💖 by Vraj Patel</span>
            </div>
            <div className="text-sm text-slate-500">
              © {new Date().getFullYear()} SyncOps. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </MainLayout>
  );
};

export default HomePage;
