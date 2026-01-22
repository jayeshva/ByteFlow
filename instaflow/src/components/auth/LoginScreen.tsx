
import React, { useState } from 'react';
import { Zap, ShieldCheck, BarChart2 } from 'lucide-react';
import { useRef, useEffect } from 'react';
import { ArrowRight, ChevronLeft, Mail, Lock, User, RefreshCw } from 'lucide-react';
import { AuthService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { handleLoginSuccess } from '../../store/authActions';
import { isValidEmail, sanitizeInput } from '../../lib/security';
import type { AppDispatch } from '../../store/store';
import { GoogleLogin } from '@react-oauth/google';

interface LoginScreenProps {}

const LoginScreen: React.FC<LoginScreenProps> = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [step, setStep] = useState<'form' | 'otp' | 'reset'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Password validation
  const passwordChecks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleGoogleLoginSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError('');
    try {
      // The credential is the id_token from Google
      const result = await AuthService.loginWithGoogle(credentialResponse.credential);
      if (result.success) {
        await dispatch(handleLoginSuccess(result));
        navigate('/dashboard');
      } else {
        setError(result.error || 'Google login failed');
      }
    } catch (err) {
      setError('Google login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleOtpChange = (index: number, value: string) => {
    // Only allow alphanumeric
    if (!/^[a-zA-Z0-9]*$/.test(value)) return;
    
    const newOtp = [...otp];
    
    // Handle deletion (value is empty, means backspace was pressed)
    if (value === '' && otp[index] !== '') {
      newOtp[index] = '';
      setOtp(newOtp);
      // Move to previous box
      if (index > 0) {
        setTimeout(() => otpRefs.current[index - 1]?.focus(), 10);
      }
      return;
    }
    
    // Handle input
    newOtp[index] = value.slice(-1); // Take only last character
    setOtp(newOtp);

    // Move to next box if we entered a character
    if (value !== '' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };




  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    // Password validation for signup and reset password
    if ((mode === 'signup' && step === 'form') || (mode === 'forgot' && step === 'reset')) {
      if (!isPasswordValid) {
        setError('Password must have 8+ chars, uppercase, lowercase, number, and special character.');
        setIsLoading(false);
        return;
      }
    }

    const sanitizedEmail = sanitizeInput(email);
    const sanitizedName = sanitizeInput(name);
    
    try {
      if (mode === 'login') {
        if (step === 'form') {
          const result = await AuthService.login({ email: sanitizedEmail, password });
          if (result.success) {
            if (result.otpRequired) {
              setStep('otp');
              setSuccessMessage('OTP sent to your email.');
              return;
            }
            
            await dispatch(handleLoginSuccess(result));
            navigate('/dashboard');
          } else {
            setError(result.message || 'Login failed');
          }
        } else if (step === 'otp') {
          // Verify OTP and complete login
          const otpString = otp.join('');
          if (otpString.length < 6) {
            setError('Please enter the full 6-digit code.');
            setIsLoading(false);
            return;
          }
          const result = await AuthService.verifyOtp(sanitizedEmail, otpString);
          if (result.success) {
            console.log(result, 'result');
            await dispatch(handleLoginSuccess(result));
            navigate('/dashboard');
          } else {
            setError(result.error || 'Invalid OTP');
          }
        }
      } 
      else if (mode === 'signup') {
        if (step === 'form') {
          const result = await AuthService.signup({ name: sanitizedName, email: sanitizedEmail, password });
          if (result.success) {
            setSuccessMessage('Verification code sent. Check your email.');
            setStep('otp');
          } else {
            setError(result.error || 'Signup failed');
          }
        } else {
          const otpString = otp.join('');
          if (otpString.length < 6) {
            setError('Please enter the full 6-digit code.');
            setIsLoading(false);
            return;
          }
          const verifyResult = await AuthService.verifyEmail(email, otpString);
          if (verifyResult.success) {
            const loginResult = await AuthService.login({ email, password });
            if (loginResult.success) {
              await dispatch(handleLoginSuccess(loginResult));
              navigate('/dashboard');
            } else {
              setError((loginResult as any).message || (loginResult as any).error || 'Login failed');
            }
          } else {
            setError(verifyResult.error || 'Invalid verification code.');
          }
        }
      }
      else if (mode === 'forgot') {
        if (step === 'form') {
          const result = await AuthService.forgotPassword(email);
          if (result.success) {
            setStep('otp');
            setSuccessMessage('Reset code sent to your email.');
          }
          else setError(result.error || 'Failed to send reset code.');
        } 
        else if (step === 'otp') {
          const otpString = otp.join('');
          if (otpString.length < 6) {
            setError('Please enter the full 6-digit code.');
            setIsLoading(false);
            return;
          }
          // Verify reset code with backend
          const verifyResult = await AuthService.verifyResetCode(email, otpString);
          if (verifyResult.success) {
            setStep('reset');
            setSuccessMessage('Code verified! Enter your new password.');
          } else {
            setError(verifyResult.error || 'Invalid reset code.');
          }
        }
        else if (step === 'reset') {
          const otpString = otp.join('');
          const result = await AuthService.resetPassword(email, otpString, password);
          if (result.success) {
            setSuccessMessage('Password reset successful! Please login.');
            setMode('login');
            setStep('form');
            setPassword('');
            setOtp(['', '', '', '', '', '']);
          } else {
            setError(result.error || 'Failed to reset password.');
          }
        }
      }
    } catch (err) {
      setError('Connection to server failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (step === 'otp') {
      otpRefs.current[0]?.focus();
    }
  }, [step]);

  const renderHeader = () => {
    if (mode === 'login') return { title: 'Workspace Access', sub: 'Securely access your automation dashboard' };
    if (mode === 'signup') {
      if (step === 'form') return { title: 'Create Account', sub: 'Join the next generation of creators' };
      return { title: 'Verify Email', sub: `We sent a code to ${email}` };
    }
    if (mode === 'forgot') {
      if (step === 'form') return { title: 'Recover Password', sub: 'Enter your email to receive a reset code' };
      if (step === 'otp') return { title: 'Security Check', sub: `Enter the code sent to ${email}` };
      return { title: 'New Password', sub: 'Choose a strong password for your account' };
    }
    return { title: '', sub: '' };
  };
  const headerText = renderHeader();

  return (
    <div className="min-h-screen instagram-gradient flex items-center justify-center p-6 font-sans">
      <div className="bg-white rounded-[3.5rem] shadow-2xl overflow-hidden max-w-6xl w-full flex flex-col md:flex-row animate-scale-in">
        {/* Left Panel: Value Prop */}
        <div className="md:w-[55%] p-16 bg-gray-50 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100/30 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          
          <div className="flex items-center space-x-3 mb-12 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-white font-black italic shadow-xl">
              IF
            </div>
            <span className="text-3xl font-black tracking-tighter">InstaFlow</span>
          </div>
          
          <h1 className="text-5xl font-black text-gray-900 mb-6 leading-[1.1] relative z-10">
            Automate <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8">Growth</span> via Meta API.
          </h1>
          <p className="text-gray-500 mb-12 text-xl leading-relaxed font-medium max-w-lg relative z-10">
            The world's first AI-driven comment-to-DM engine. Secure, official, and built for professional creators.
          </p>

          <div className="space-y-8 relative z-10">
            <Feature icon={<Zap size={22} className="text-yellow-500"/>} title="Meta Webhook Engine" desc="DMs are triggered instantly as comments hit Meta servers." />
            <Feature icon={<ShieldCheck size={22} className="text-green-500"/>} title="Official Meta Partner" desc="We use Graph API v18.0. No shadowbans, ever." />
            <Feature icon={<BarChart2 size={22} className="text-indigo-500"/>} title="Conversion Dashboard" desc="See exactly how many sales your comments generated." />
          </div>
        </div>

        {/* Right Panel: Action */}
        <div className="md:w-1/2 p-10 md:p-20 flex flex-col justify-center items-center relative bg-white">
          {(step !== 'form' || mode === 'forgot') && (
             <button 
               onClick={() => {
                 // Clear OTP and messages when going back
                 setOtp(['', '', '', '', '', '']);
                 setError('');
                 setSuccessMessage('');
                 
                 if (step === 'reset') {
                   setStep('otp');
                 } else if (step === 'otp') {
                   setStep('form');
                 } else {
                   // Going back to login from forgot password
                   setMode('login');
                   setStep('form');
                   setPassword('');
                 }
               }}
               className="absolute top-10 left-10 p-4 hover:bg-gray-50 rounded-2xl text-gray-400 hover:text-indigo-600 transition-all flex items-center space-x-2 group"
             >
               <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
               <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
             </button>
          )}

          <div className="w-full max-w-sm">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-3">
                {headerText.title}
              </h2>
              <p className="text-gray-400 text-sm font-medium">
                {headerText.sub}
              </p>
            </div>

            {error && (
              <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100 animate-in slide-in-from-top-4">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="mb-8 p-4 bg-green-50 text-green-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-green-100 animate-in slide-in-from-top-4">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-5">
              {step === 'form' || step === 'reset' ? (
                <>
                  {mode === 'signup' && step === 'form' && (
                    <div className="relative group">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-600 transition-colors">
                        <User size={18} />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-16 pr-6 py-5 bg-gray-50/50 border border-gray-100 focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm text-gray-900 placeholder:text-gray-300"
                        required
                      />
                    </div>
                  )}
                  {step === 'form' && (
                    <div className="relative group">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-600 transition-colors">
                        <Mail size={18} />
                      </div>
                      <input 
                        type="email" 
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-16 pr-6 py-5 bg-gray-50/50 border border-gray-100 focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm text-gray-900 placeholder:text-gray-300"
                        required
                      />
                    </div>
                  )}
                  {(mode !== 'forgot' || step === 'reset') && (
                    <div className="space-y-2">
                      <div className="relative group">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-600 transition-colors">
                          <Lock size={18} />
                        </div>
                        <input 
                          type="password" 
                          placeholder={step === 'reset' ? "New Password" : "Password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-16 pr-6 py-5 bg-gray-50/50 border border-gray-100 focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm text-gray-900 placeholder:text-gray-300"
                          required
                        />
                      </div>
                      {/* Password requirements - only for signup and reset */}
                      {(mode === 'signup' || (mode === 'forgot' && step === 'reset')) && password.length > 0 && (
                        <div className="grid grid-cols-2 gap-1 px-2 text-[10px]">
                          <span className={passwordChecks.minLength ? 'text-green-600' : 'text-gray-400'}>
                            ✓ 8+ characters
                          </span>
                          <span className={passwordChecks.hasUppercase ? 'text-green-600' : 'text-gray-400'}>
                            ✓ Uppercase
                          </span>
                          <span className={passwordChecks.hasLowercase ? 'text-green-600' : 'text-gray-400'}>
                            ✓ Lowercase
                          </span>
                          <span className={passwordChecks.hasNumber ? 'text-green-600' : 'text-gray-400'}>
                            ✓ Number
                          </span>
                          <span className={passwordChecks.hasSpecialChar ? 'text-green-600' : 'text-gray-400'}>
                            ✓ Special (!@#$...)
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-8 py-4">
                  <div className="flex justify-between gap-3">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpRefs.current[idx] = el; }}
                        type="text"
                        inputMode="text"
                        autoComplete="off"
                        maxLength={2}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyUp={(e) => {

                          if (e.key === 'Backspace' && otp[idx] === '' && idx > 0) {
                            const newOtp = [...otp];
                            newOtp[idx - 1] = '';
                            setOtp(newOtp);
                            otpRefs.current[idx - 1]?.focus();
                          }
                        }}
                        className="w-full h-14 text-center text-xl font-black bg-gray-50/50 border border-gray-100 focus:border-indigo-600 focus:bg-white rounded-xl outline-none transition-all shadow-inner"
                      />
                    ))}
                  </div>
                  <div className="text-center">
                    {mode !== 'signup' && (
                      <button 
                        type="button"
                        onClick={async () => {
                          setError('');
                          const result = mode === 'forgot' 
                            ? await AuthService.forgotPassword(email) 
                            : await AuthService.sendOtp(email);
                          if (result.success) {
                            setSuccessMessage('Code resent successfully!');
                          } else {
                            setError(result.error || 'Failed to resend code.');
                          }
                        }}
                        className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center justify-center space-x-2 mx-auto hover:opacity-70 transition-opacity"
                      >
                        <RefreshCw size={12} />
                        <span>Resend Code</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-black hover:bg-gray-900 text-white font-black py-5 rounded-2xl flex items-center justify-center space-x-3 shadow-2xl shadow-gray-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  <span className="uppercase tracking-widest text-xs">
                    {isLoading ? 'Processing...' : 
                     mode === 'login' ? 'Sign In' : 
                     mode === 'signup' ? (step === 'form' ? 'Get Started' : 'Verify & Join') :
                     (step === 'form' ? 'Send Reset Code' : step === 'otp' ? 'Verify Code' : 'Update Password')}
                  </span>
                  <ArrowRight size={18} />
                </button>
              </div>

              {mode === 'login' && (
                <div className="text-right">
                  <button 
                    type="button"
                    onClick={() => { 
                      setMode('forgot'); 
                      setStep('form'); 
                      setError(''); 
                      setOtp(['', '', '', '', '', '']);
                      setPassword('');
                    }}
                    className="text-[10px] font-black text-gray-300 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </form>

            {step === 'form' && mode !== 'forgot' && (
              <>
                <div className="relative my-12">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-gray-300">
                    <span className="bg-white px-6">Social Connect</span>
                  </div>
                </div>

                <div className="w-full flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleLoginSuccess}
                    onError={() => setError('Google login failed')}
                    theme="outline"
                    size="large"
                    text="continue_with"
                    shape="pill"
                    width="100%"
                  />
                </div>
              </>
            )}

            <div className="mt-12 text-center">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                {mode === 'login' ? "New here?" : "Already a member?"}
                <button 
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setStep('form');
                    setError('');
                    setSuccessMessage('');
                    setOtp(['', '', '', '', '', '']);
                    setPassword('');
                  }}
                  className="ml-2 text-indigo-600 hover:underline"
                >
                  {mode === 'login' ? 'Create Free Account' : 'Login now'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Feature = ({ icon, title, desc }: any) => (
  <div className="flex items-start space-x-5 group">
    <div className="mt-1 p-3 bg-white rounded-2xl shadow-sm border border-gray-100 group-hover:scale-110 transition-transform duration-300">
      {icon}
    </div>
    <div className="text-left">
      <h3 className="font-black text-gray-900 text-base tracking-tight">{title}</h3>
      <p className="text-sm text-gray-400 font-medium leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default LoginScreen;
