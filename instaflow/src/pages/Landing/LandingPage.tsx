import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  MessageCircle,
  TrendingUp,
  Shield,
  Clock,
  Users,
  CheckCircle2,
  ArrowRight,
  Play,
  Star,
  ChevronDown,
  Instagram,
  Sparkles,
  BarChart3,
  Bot,
  Send,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/cn';

/**
 * Landing Page
 * A stunning, ManyChat-inspired landing page for InstaFlow
 */

const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-200">
                IF
              </div>
              <span className="text-xl font-black tracking-tight">InstaFlow</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-semibold text-gray-600 hover:text-indigo-600 transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm font-semibold text-gray-600 hover:text-indigo-600 transition-colors">
                How It Works
              </a>
              <a href="#pricing" className="text-sm font-semibold text-gray-600 hover:text-indigo-600 transition-colors">
                Pricing
              </a>
              <a href="#faq" className="text-sm font-semibold text-gray-600 hover:text-indigo-600 transition-colors">
                FAQ
              </a>
            </div>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Log In
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="gradient" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Start Free
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 p-4 space-y-4">
            <a href="#features" className="block text-sm font-semibold text-gray-600 hover:text-indigo-600 py-2">
              Features
            </a>
            <a href="#how-it-works" className="block text-sm font-semibold text-gray-600 hover:text-indigo-600 py-2">
              How It Works
            </a>
            <a href="#pricing" className="block text-sm font-semibold text-gray-600 hover:text-indigo-600 py-2">
              Pricing
            </a>
            <a href="#faq" className="block text-sm font-semibold text-gray-600 hover:text-indigo-600 py-2">
              FAQ
            </a>
            <div className="pt-4 space-y-3">
              <Link to="/login" className="block">
                <Button variant="outline" fullWidth>Log In</Button>
              </Link>
              <Link to="/login" className="block">
                <Button variant="gradient" fullWidth>Start Free</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 -left-40 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl" />
          <div className="absolute top-40 -right-40 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 left-1/2 w-96 h-96 bg-pink-200/30 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-sm font-bold mb-8 animate-in slide-in-from-bottom-4 duration-700">
              <Sparkles className="w-4 h-4" />
              <span>Powered by Meta's Official API</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-6 animate-in slide-in-from-bottom-4 duration-700 delay-100">
              Turn Comments Into{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Customers
              </span>
              <br />
              Automatically
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto mb-10 animate-in slide-in-from-bottom-4 duration-700 delay-200">
              The #1 Instagram automation platform that sends personalized DMs to everyone who comments on your posts. 
              Grow your business while you sleep.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-in slide-in-from-bottom-4 duration-700 delay-300">
              <Link to="/login">
                <Button variant="gradient" size="xl" rightIcon={<ArrowRight className="w-5 h-5" />}>
                  Start Free Trial
                </Button>
              </Link>
              <Button variant="outline" size="xl" leftIcon={<Play className="w-5 h-5" />}>
                Watch Demo
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-500 animate-in slide-in-from-bottom-4 duration-700 delay-400">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-white"
                    />
                  ))}
                </div>
                <span className="font-semibold">2,000+ creators</span>
              </div>
              <div className="hidden sm:block w-px h-6 bg-gray-200" />
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="ml-1 font-semibold">4.9/5 rating</span>
              </div>
            </div>
          </div>

          {/* Hero Image / Mockup */}
          <div className="mt-16 relative animate-in slide-in-from-bottom-8 duration-1000 delay-500">
            <div className="relative mx-auto max-w-5xl">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-3xl opacity-20 scale-105" />
              
              {/* Dashboard Preview */}
              <div className="relative bg-gray-900 rounded-2xl lg:rounded-3xl shadow-2xl shadow-gray-900/20 overflow-hidden border border-gray-800">
                {/* Browser Chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/80 border-b border-gray-700">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-gray-700 rounded-lg px-4 py-1.5 text-xs text-gray-400 text-center">
                      app.instaflow.io/dashboard
                    </div>
                  </div>
                </div>
                
                {/* Dashboard Content */}
                <div className="p-4 lg:p-6 bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950">
                  <div className="grid grid-cols-12 gap-4 lg:gap-6">
                    {/* Sidebar */}
                    <div className="hidden lg:block col-span-2 space-y-3">
                      {['Dashboard', 'Posts', 'Automations', 'Analytics', 'Settings'].map((item, i) => (
                        <div
                          key={item}
                          className={cn(
                            'px-3 py-2 rounded-xl text-xs font-medium',
                            i === 2 ? 'bg-indigo-600 text-white' : 'text-gray-500'
                          )}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                    
                    {/* Main Content */}
                    <div className="col-span-12 lg:col-span-10 space-y-4">
                      {/* Stats Row */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                          { label: 'DMs Sent Today', value: '1,248', change: '+12%' },
                          { label: 'Response Rate', value: '94%', change: '+3%' },
                          { label: 'New Leads', value: '156', change: '+28%' },
                          { label: 'Revenue', value: '$4,200', change: '+15%' },
                        ].map((stat) => (
                          <div key={stat.label} className="bg-gray-800/50 rounded-xl p-3 lg:p-4 border border-gray-700/50">
                            <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
                            <div className="flex items-end gap-2">
                              <span className="text-lg lg:text-2xl font-black text-white">{stat.value}</span>
                              <span className="text-xs font-bold text-green-400">{stat.change}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Automations */}
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-bold text-white">Active Automations</span>
                          <span className="text-xs text-indigo-400 font-semibold">View All →</span>
                        </div>
                        <div className="space-y-2">
                          {[
                            { name: 'Product Launch Promo', trigger: 'INFO', sent: 847 },
                            { name: 'Free Guide Giveaway', trigger: 'GUIDE', sent: 623 },
                            { name: 'Webinar Registration', trigger: 'REGISTER', sent: 412 },
                          ].map((auto) => (
                            <div key={auto.name} className="flex items-center justify-between py-2 px-3 bg-gray-700/30 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-sm text-white font-medium">{auto.name}</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs">
                                <span className="text-gray-500">Keyword: <span className="text-indigo-400">{auto.trigger}</span></span>
                                <span className="text-gray-400">{auto.sent} sent</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos Section */}
      <section className="py-12 border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-semibold text-gray-400 mb-8 uppercase tracking-wider">
            Trusted by creators and brands worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16 opacity-50">
            {['Meta', 'Instagram', 'Shopify', 'Stripe', 'Vercel'].map((brand) => (
              <div key={brand} className="text-2xl font-black text-gray-400">
                {brand}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-full mb-4">
              Features
            </span>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-6">
              Everything You Need to{' '}
              <span className="text-indigo-600">Scale</span>
            </h2>
            <p className="text-lg text-gray-600">
              Powerful automation tools designed for creators, agencies, and businesses who want to maximize their Instagram engagement.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                icon: <Bot className="w-6 h-6" />,
                title: 'AI-Powered Responses',
                description: 'Intelligent DMs that feel personal. Our AI understands intent and responds naturally.',
                gradient: 'from-indigo-500 to-purple-500',
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: 'Instant Delivery',
                description: 'DMs sent within seconds of a comment. No delays, no missed opportunities.',
                gradient: 'from-yellow-500 to-orange-500',
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: 'Meta Official Partner',
                description: '100% compliant with Instagram policies. No risk of shadowbans or account issues.',
                gradient: 'from-green-500 to-emerald-500',
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: 'Advanced Analytics',
                description: 'Track opens, clicks, and conversions. Know exactly what\'s working.',
                gradient: 'from-blue-500 to-cyan-500',
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: 'Audience Segmentation',
                description: 'Target specific keywords, intents, or all comments. You\'re in control.',
                gradient: 'from-pink-500 to-rose-500',
              },
              {
                icon: <Clock className="w-6 h-6" />,
                title: 'Scheduling & Timing',
                description: 'Set active hours, campaign dates, and follow-up sequences.',
                gradient: 'from-violet-500 to-purple-500',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group relative bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 hover:-translate-y-1"
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white mb-5 shadow-lg',
                    feature.gradient
                  )}
                >
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 lg:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-full mb-4">
              How It Works
            </span>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-6">
              Set Up in{' '}
              <span className="text-indigo-600">3 Minutes</span>
            </h2>
            <p className="text-lg text-gray-600">
              No coding required. Connect your Instagram and start automating in minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: '01',
                title: 'Connect Instagram',
                description: 'Securely link your Instagram Business or Creator account using Meta\'s official API.',
                icon: <Instagram className="w-8 h-8" />,
              },
              {
                step: '02',
                title: 'Create Automation',
                description: 'Set trigger keywords, craft your DM message, and customize public replies.',
                icon: <MessageCircle className="w-8 h-8" />,
              },
              {
                step: '03',
                title: 'Watch It Work',
                description: 'Sit back as InstaFlow automatically engages with every matching comment.',
                icon: <TrendingUp className="w-8 h-8" />,
              },
            ].map((item, index) => (
              <div key={item.step} className="relative">
                {index < 2 && (
                  <div className="hidden md:block absolute top-16 left-[60%] w-[80%] border-t-2 border-dashed border-indigo-200" />
                )}
                <div className="relative bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                      {item.icon}
                    </div>
                    <span className="text-5xl font-black text-gray-100">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-full mb-4">
              Testimonials
            </span>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-6">
              Loved by <span className="text-indigo-600">Creators</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                quote: 'InstaFlow increased my DM responses by 400%. I went from 50 leads a week to 200+. Game changer!',
                author: 'Sarah Chen',
                role: 'E-commerce Entrepreneur',
                avatar: '👩‍💼',
              },
              {
                quote: 'Finally, an automation tool that doesn\'t get my account flagged. The Meta API integration is exactly what I needed.',
                author: 'Marcus Johnson',
                role: 'Content Creator, 500K followers',
                avatar: '👨‍🎨',
              },
              {
                quote: 'We manage 30+ client accounts. InstaFlow saves us 20 hours per week. The ROI is incredible.',
                author: 'Emily Rodriguez',
                role: 'Agency Owner',
                avatar: '👩‍💻',
              },
            ].map((testimonial) => (
              <div
                key={testimonial.author}
                className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-2xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{testimonial.author}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 lg:py-32 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider rounded-full mb-4">
              Pricing
            </span>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-6">
              Simple, Transparent{' '}
              <span className="text-indigo-400">Pricing</span>
            </h2>
            <p className="text-lg text-gray-400">
              Start free. Scale as you grow. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Starter',
                price: 'Free',
                period: 'forever',
                description: 'Perfect for trying out InstaFlow',
                features: ['100 DMs per month', '1 automation', 'Basic analytics', 'Email support'],
                cta: 'Start Free',
                popular: false,
              },
              {
                name: 'Pro',
                price: '₹999',
                period: '/month',
                description: 'For growing creators and businesses',
                features: [
                  'Unlimited DMs',
                  'Unlimited automations',
                  'Advanced analytics',
                  'AI-powered responses',
                  'Priority support',
                  'Custom CTA buttons',
                ],
                cta: 'Start Pro Trial',
                popular: true,
              },
              {
                name: 'Agency',
                price: '₹4,999',
                period: '/month',
                description: 'For teams managing multiple accounts',
                features: [
                  'Everything in Pro',
                  '10 Instagram accounts',
                  'Team collaboration',
                  'White-label reports',
                  'Dedicated account manager',
                  'API access',
                ],
                cta: 'Contact Sales',
                popular: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  'relative rounded-2xl p-8 border transition-transform hover:-translate-y-1',
                  plan.popular
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-600 border-indigo-500 shadow-2xl shadow-indigo-500/30 scale-105'
                    : 'bg-gray-800/50 border-gray-700'
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-400 text-yellow-900 text-xs font-black uppercase tracking-wider rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <p className={cn('text-sm', plan.popular ? 'text-indigo-200' : 'text-gray-400')}>
                    {plan.description}
                  </p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className={cn('text-sm', plan.popular ? 'text-indigo-200' : 'text-gray-500')}>
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <CheckCircle2
                        className={cn(
                          'w-5 h-5 shrink-0',
                          plan.popular ? 'text-indigo-200' : 'text-indigo-400'
                        )}
                      />
                      <span className={plan.popular ? 'text-white' : 'text-gray-300'}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/login">
                  <Button
                    variant={plan.popular ? 'dark' : 'outline'}
                    fullWidth
                    className={!plan.popular ? 'border-gray-600 text-white hover:bg-gray-700' : ''}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 lg:py-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-full mb-4">
              FAQ
            </span>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-6">
              Frequently Asked <span className="text-indigo-600">Questions</span>
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                question: 'Is InstaFlow safe to use with my Instagram account?',
                answer:
                  'Yes! InstaFlow uses Meta\'s official Graph API, making it 100% compliant with Instagram\'s terms of service. We\'re an official Meta partner, so there\'s no risk of shadowbans or account restrictions.',
              },
              {
                question: 'How fast are the automated DMs sent?',
                answer:
                  'DMs are typically sent within 2-5 seconds of a comment being posted. Our webhook infrastructure ensures near-instant delivery.',
              },
              {
                question: 'Can I customize the DM messages?',
                answer:
                  'Absolutely! You can create fully customized messages, use dynamic placeholders (like the commenter\'s name), and even add CTA buttons with links.',
              },
              {
                question: 'Do I need a Business or Creator account?',
                answer:
                  'Yes, InstaFlow requires an Instagram Business or Creator account connected to a Facebook Page. This is required by Meta\'s API for messaging capabilities.',
              },
              {
                question: 'Can I cancel anytime?',
                answer:
                  'Yes, you can cancel your subscription at any time. There are no long-term contracts or cancellation fees.',
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left bg-white hover:bg-gray-50 transition-colors"
                >
                  <span className="font-bold text-gray-900 pr-4">{faq.question}</span>
                  <ChevronDown
                    className={cn(
                      'w-5 h-5 text-gray-400 shrink-0 transition-transform',
                      openFaq === index && 'rotate-180'
                    )}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6 text-gray-600 leading-relaxed animate-in slide-in-from-top-2 duration-200">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-6">
            Ready to 10x Your Engagement?
          </h2>
          <p className="text-xl text-indigo-100 mb-10 max-w-2xl mx-auto">
            Join thousands of creators and businesses who are growing faster with InstaFlow.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login">
              <Button variant="dark" size="xl" rightIcon={<ArrowRight className="w-5 h-5" />}>
                Start Free Trial
              </Button>
            </Link>
            <Button
              variant="outline"
              size="xl"
              className="border-white/30 text-white hover:bg-white/10"
              leftIcon={<Send className="w-5 h-5" />}
            >
              Talk to Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-sm">
                  IF
                </div>
                <span className="text-xl font-black text-white">InstaFlow</span>
              </Link>
              <p className="text-sm leading-relaxed">
                The #1 Instagram automation platform for creators and businesses.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">
              © {new Date().getFullYear()} InstaFlow. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
