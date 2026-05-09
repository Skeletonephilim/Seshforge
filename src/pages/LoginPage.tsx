import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Terminal, Skull } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const { sendOTP, verifyOTP, isLoading } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    try {
      await sendOTP(email);
      setStep('otp');
      toast({
        title: 'Code Sent',
        description: 'Check your email for the verification code',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send verification code',
        variant: 'destructive',
      });
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter the 6-digit code',
        variant: 'destructive',
      });
      return;
    }

    try {
      await verifyOTP(email, otp);
      toast({
        title: 'Welcome to SeshForge',
        description: 'Authentication successful',
      });
      // Navigate to dashboard after successful login
      navigate('/', { replace: true });
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: 'Invalid code or code expired',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animated-grid">
      <div className="absolute inset-0 scan-lines pointer-events-none opacity-20" />
      
      <Card className="w-full max-w-md terminal-window relative z-10">
        <div className="terminal-header">
          <div className="terminal-dot bg-destructive"></div>
          <div className="terminal-dot bg-chart-3"></div>
          <div className="terminal-dot bg-secondary"></div>
          <span className="ml-2 text-xs text-muted-foreground font-mono">root@lucy:~$</span>
        </div>
        
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <Skull className="w-16 h-16 text-destructive" />
              <Terminal className="w-8 h-8 text-destructive/80 absolute -bottom-1 -right-1" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-gradient-primary">
            SeshForge
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Lucy's Pentesting Training Dojo
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 'email' ? (
            <div key="email-form">
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-mono text-sm">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="operator@seshforge.dev"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="font-mono"
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full neon-glow"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    <>
                      <Terminal className="w-4 h-4 mr-2" />
                      Request Access
                    </>
                  )}
                </Button>
              </form>
            </div>
          ) : (
            <div key="otp-form">
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="font-mono text-sm">
                    Verification Code
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={isLoading}
                    className="font-mono text-center text-2xl tracking-widest"
                    autoFocus
                    maxLength={6}
                  />
                  <p className="text-xs text-muted-foreground text-center font-mono">
                    Code sent to {email}
                  </p>
                </div>

                <div className="space-y-2">
                  <Button
                    type="submit"
                    className="w-full neon-glow"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Skull className="w-4 h-4 mr-2" />
                        Verify & Enter
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setStep('email');
                      setOtp('');
                    }}
                    disabled={isLoading}
                  >
                    Change Email
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="mt-6 p-4 bg-muted/30 rounded-md border border-border">
            <p className="text-xs text-muted-foreground font-mono text-center">
              <span className="text-secondary">{'>'}</span> Authentication required for platform access
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
