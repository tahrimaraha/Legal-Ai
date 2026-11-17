import { useState } from 'react';
import { CreditCard, Users, CheckCircle2, ArrowRight, DollarSign } from 'lucide-react';
import { Button } from './Button';
import { useLang } from '../../context/LanguageContext';

interface AdminPaymentFlowProps {
  paymentType: 'verification' | 'consultation';
  recipient: string;
  amount: number;
  details: string;
  onPaymentComplete: () => void;
  onCancel: () => void;
}

type AdminPaymentStep = 'confirm' | 'method' | 'processing' | 'success';

export function AdminPaymentFlow({ 
  paymentType, 
  recipient, 
  amount, 
  details, 
  onPaymentComplete, 
  onCancel 
}: AdminPaymentFlowProps) {
  const { lang } = useLang();
  const [currentStep, setCurrentStep] = useState<AdminPaymentStep>('confirm');
  const [selectedMethod, setSelectedMethod] = useState<'bank' | 'bkash' | 'nagad'>('bank');

  const paymentMethods = [
    { 
      id: 'bank', 
      name: lang === 'bn' ? 'ব্যাংক ট্রান্সফার' : 'Bank Transfer', 
      color: 'bg-blue-500', 
      logo: '🏦',
      desc: lang === 'bn' ? 'সরাসরি ব্যাংক একাউন্টে' : 'Direct to bank account'
    },
    { 
      id: 'bkash', 
      name: 'bKash Business', 
      color: 'bg-pink-500', 
      logo: '📱',
      desc: lang === 'bn' ? 'ব্যবসায়িক একাউন্ট' : 'Business account transfer'
    },
    { 
      id: 'nagad', 
      name: 'Nagad Business', 
      color: 'bg-orange-500', 
      logo: '💳',
      desc: lang === 'bn' ? 'ব্যবসায়িক একাউন্ট' : 'Business account transfer'
    }
  ];

  const handleConfirmPayment = () => {
    setCurrentStep('method');
  };

  const handleSelectMethod = () => {
    setCurrentStep('processing');
    // Simulate admin payment processing
    setTimeout(() => {
      setCurrentStep('success');
      setTimeout(onPaymentComplete, 2000);
    }, 3000);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-clay text-white p-4 text-center">
        <DollarSign className="h-8 w-8 mx-auto mb-2" />
        <h3 className="font-display text-lg font-bold">
          {lang === 'bn' 
            ? `${paymentType === 'verification' ? 'যাচাই' : 'পরামর্শ'} পেমেন্ট` 
            : `${paymentType === 'verification' ? 'Verification' : 'Consultation'} Payment`}
        </h3>
        <div className="mt-2 text-clay-tint">
          <span className="text-2xl font-bold">৳{amount}</span>
          <span className="ml-2 text-sm opacity-90">
            {lang === 'bn' ? 'আইনজীবীকে প্রদেয়' : 'to be paid to lawyer'}
          </span>
        </div>
      </div>

      {/* Payment Confirmation */}
      {currentStep === 'confirm' && (
        <div className="p-6 space-y-4">
          <div className="text-center space-y-2">
            <Users className="h-12 w-12 text-clay-deep mx-auto" />
            <h4 className="font-semibold text-ink">
              {lang === 'bn' ? 'পেমেন্ট নিশ্চিতকরণ' : 'Payment Confirmation'}
            </h4>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-granite-soft pb-2">
              <span className="text-granite">{lang === 'bn' ? 'প্রাপক' : 'Recipient'}:</span>
              <span className="font-medium text-ink">{recipient}</span>
            </div>
            <div className="flex justify-between border-b border-granite-soft pb-2">
              <span className="text-granite">{lang === 'bn' ? 'সেবা' : 'Service'}:</span>
              <span className="font-medium text-ink">
                {lang === 'bn' 
                  ? (paymentType === 'verification' ? 'এআই উত্তর যাচাই' : 'আইনি পরামর্শ')
                  : (paymentType === 'verification' ? 'AI Answer Verification' : 'Legal Consultation')}
              </span>
            </div>
            <div className="flex justify-between border-b border-granite-soft pb-2">
              <span className="text-granite">{lang === 'bn' ? 'পরিমাণ' : 'Amount'}:</span>
              <span className="font-bold text-clay-deep">৳{amount}</span>
            </div>
            {details && (
              <div className="pt-2">
                <span className="text-granite text-xs block mb-1">{lang === 'bn' ? 'বিস্তারিত' : 'Details'}:</span>
                <p className="text-xs text-ink-soft bg-bone p-2 rounded">{details}</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-granite-soft space-y-2">
            <Button 
              variant="primary" 
              size="md" 
              onClick={handleConfirmPayment} 
              className="w-full"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              {lang === 'bn' ? 'পেমেন্ট প্রক্রিয়া শুরু করুন' : 'Proceed with Payment'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel} className="w-full">
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
          </div>
        </div>
      )}

      {/* Payment Method Selection */}
      {currentStep === 'method' && (
        <div className="p-6 space-y-4">
          <h4 className="font-semibold text-ink mb-4">
            {lang === 'bn' ? 'পেমেন্ট পদ্ধতি নির্বাচন করুন' : 'Select Payment Method'}
          </h4>
          
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id as any)}
                className={`w-full p-4 rounded-lg border-2 transition flex items-center gap-3 ${
                  selectedMethod === method.id
                    ? 'border-clay bg-clay-tint text-clay-deep'
                    : 'border-granite hover:border-clay hover:bg-bone'
                }`}
              >
                <div className={`w-10 h-10 rounded ${method.color} flex items-center justify-center text-white text-lg`}>
                  {method.logo}
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium">{method.name}</div>
                  <div className="text-xs text-granite">{method.desc}</div>
                </div>
                {selectedMethod === method.id && (
                  <CheckCircle2 className="h-5 w-5 text-clay-deep" />
                )}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-granite-soft">
            <Button variant="primary" size="md" onClick={handleSelectMethod} className="w-full">
              {lang === 'bn' ? 'পেমেন্ট সম্পন্ন করুন' : 'Complete Payment'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep('confirm')} className="w-full mt-2">
              {lang === 'bn' ? 'পিছনে' : 'Back'}
            </Button>
          </div>
        </div>
      )}

      {/* Processing */}
      {currentStep === 'processing' && (
        <div className="p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-clay-tint rounded-full flex items-center justify-center mx-auto animate-pulse">
            <CreditCard className="h-8 w-8 text-clay-deep" />
          </div>
          <h4 className="font-semibold text-ink">
            {lang === 'bn' ? 'পেমেন্ট প্রক্রিয়াধীন...' : 'Processing Payment...'}
          </h4>
          <p className="text-sm text-granite">
            {lang === 'bn' 
              ? `${paymentMethods.find(m => m.id === selectedMethod)?.name} এর মাধ্যমে পেমেন্ট পাঠানো হচ্ছে`
              : `Sending payment via ${paymentMethods.find(m => m.id === selectedMethod)?.name}`}
          </p>
          <div className="animate-spin mx-auto w-6 h-6 border-2 border-clay-tint border-t-clay rounded-full"></div>
        </div>
      )}

      {/* Success */}
      {currentStep === 'success' && (
        <div className="p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h4 className="font-semibold text-ink">
            {lang === 'bn' ? 'পেমেন্ট সফল!' : 'Payment Successful!'}
          </h4>
          <p className="text-sm text-granite">
            {lang === 'bn' 
              ? `${recipient} কে ৳${amount} সফলভাবে পাঠানো হয়েছে`
              : `৳${amount} has been successfully sent to ${recipient}`}
          </p>
          <div className="text-xs text-granite">
            {lang === 'bn' ? 'লেনদেনের বিস্তারিত ইমেইলে পাঠানো হবে' : 'Transaction details will be emailed'}
          </div>
        </div>
      )}
    </div>
  );
}