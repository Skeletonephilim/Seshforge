import { useState } from 'react';
import { Coffee, Heart, Zap, DollarSign, Github, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

export default function SupportPage() {
  const { toast } = useToast();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const paymentOptions = {
    buyMeACoffee: 'https://buymeacoffee.com/yourusername',
    kofi: 'https://ko-fi.com/yourusername',
    github: 'https://github.com/sponsors/yourusername',
    bitcoin: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    ethereum: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    monero: '48Fki6ySPQQqZnFK4FS3FHYJqPq9T8jJhJqhXwHjxKkbN7PuL8TQmFE3a3V9T0vKc6RiN8vN8oYhB8pV3G8qJ8pP8gQhJ'
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(label);
    setTimeout(() => setCopiedAddress(null), 2000);
    
    toast({
      title: 'Address Copied',
      description: `${label} address copied to clipboard`,
      duration: 2000,
    });
  };

  const supportTiers = [
    {
      icon: Coffee,
      name: 'Coffee',
      amount: '$3',
      description: 'Buy me a coffee to fuel late-night coding sessions',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      icon: Heart,
      name: 'Supporter',
      amount: '$10',
      description: 'Support ongoing development and new features',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      icon: Zap,
      name: 'Champion',
      amount: '$25',
      description: 'Champion the mission of accessible security training',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      icon: DollarSign,
      name: 'Custom',
      amount: 'Any',
      description: 'Choose your own amount - every bit helps!',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
  ];

  const cryptoOptions = [
    {
      name: 'Bitcoin',
      symbol: 'BTC',
      address: paymentOptions.bitcoin,
      icon: '₿',
      color: 'text-orange-500',
    },
    {
      name: 'Ethereum',
      symbol: 'ETH',
      address: paymentOptions.ethereum,
      icon: 'Ξ',
      color: 'text-blue-500',
    },
    {
      name: 'Monero',
      symbol: 'XMR',
      address: paymentOptions.monero,
      icon: 'ɱ',
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="container max-w-6xl py-8">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Heart className="w-8 h-8 text-red-500" />
          <h1 className="text-4xl font-bold">Support SeshForge</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          SeshForge is <strong>completely free</strong> and will always remain free. 
          If you find value in this training platform, consider supporting its development.
        </p>
      </div>

      <Card className="mb-8 border-blue-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            Why Support?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Your support helps with:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• AI API costs (DevvAI, image generation)</li>
                <li>• Database hosting and infrastructure</li>
                <li>• New feature development</li>
                <li>• Content creation (scenarios, drills, exams)</li>
                <li>• Bug fixes and maintenance</li>
                <li>• Keeping the platform ad-free forever</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What you get:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✓ Warm fuzzy feeling of supporting open security training</li>
                <li>✓ Karma points (not tracked, but definitely real)</li>
                <li>✓ Eternal gratitude from the developer</li>
                <li>✓ Knowledge you are helping others learn cybersecurity</li>
                <li>✓ No premium features, no paywalls, no ads - ever</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Support Tiers</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {supportTiers.map((tier) => {
            const Icon = tier.icon;
            return (
              <Card key={tier.name} className="relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-32 h-32 ${tier.bgColor} rounded-full blur-3xl -z-10`} />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-6 h-6 ${tier.color}`} />
                    <Badge variant="outline" className={tier.color}>
                      {tier.amount}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {tier.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator className="my-8" />

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Support (Card/PayPal)</CardTitle>
            <CardDescription>
              One-time or recurring support via trusted platforms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={() => window.open(paymentOptions.buyMeACoffee, '_blank')}
            >
              <Coffee className="w-5 h-5 mr-3 text-amber-500" />
              <div className="text-left">
                <div className="font-semibold">Buy Me a Coffee</div>
                <div className="text-xs text-muted-foreground">
                  One-time support via credit card or PayPal
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={() => window.open(paymentOptions.kofi, '_blank')}
            >
              <Heart className="w-5 h-5 mr-3 text-red-500" />
              <div className="text-left">
                <div className="font-semibold">Ko-fi</div>
                <div className="text-xs text-muted-foreground">
                  Support via card, PayPal, or monthly membership
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={() => window.open(paymentOptions.github, '_blank')}
            >
              <Github className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">GitHub Sponsors</div>
                <div className="text-xs text-muted-foreground">
                  Monthly sponsorship directly through GitHub
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cryptocurrency</CardTitle>
            <CardDescription>
              Privacy-focused, decentralized support
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cryptoOptions.map((crypto) => (
              <div key={crypto.symbol} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl ${crypto.color}`}>{crypto.icon}</span>
                    <div>
                      <div className="font-semibold">{crypto.name}</div>
                      <div className="text-xs text-muted-foreground">{crypto.symbol}</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={copiedAddress === crypto.symbol ? 'default' : 'outline'}
                    onClick={() => copyToClipboard(crypto.address, crypto.symbol)}
                  >
                    {copiedAddress === crypto.symbol ? 'Copied!' : 'Copy Address'}
                  </Button>
                </div>
                <div className="bg-muted/50 p-2 rounded font-mono text-xs break-all">
                  {crypto.address}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 border-green-500/20 bg-green-500/5">
        <CardContent className="py-6">
          <div className="flex items-start gap-3">
            <Heart className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Thank You!</h3>
              <p className="text-sm text-muted-foreground">
                Your support, whether financial or through using and sharing the platform, 
                helps make high-quality cybersecurity training accessible to everyone. 
                The app will <strong>never</strong> have premium features, paywalls, or ads. 
                We believe security education should be free and accessible to all.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                If you cannot contribute financially, no worries! Help by:
                sharing the app with others, reporting bugs, or suggesting improvements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Join the community helping democratize cybersecurity training
        </p>
        <div className="flex items-center justify-center gap-8 mt-4">
          <div>
            <div className="text-2xl font-bold">100%</div>
            <div className="text-xs text-muted-foreground">Free Forever</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <div className="text-2xl font-bold">0</div>
            <div className="text-xs text-muted-foreground">Premium Features</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <div className="text-2xl font-bold">0</div>
            <div className="text-xs text-muted-foreground">Ads</div>
          </div>
        </div>
      </div>
    </div>
  );
}
