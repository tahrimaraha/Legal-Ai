import { useState } from 'react';
import { CreditCard, Smartphone, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { useLang } from '../../context/LanguageContext';

interface PaymentProcessProps {
  amount: number;
  urgency: 'normal' | 'urgent';
  onPaymentComplete: () => void;
  onCancel: () => void;
}

type PaymentStep = 'method' | 'account' | 'processing' | 'success';

export function PaymentProcess({ amount, urgency, onPaymentComplete, onCancel }: PaymentProcessProps) {
  const { lang } = useLang();
  const [currentStep, setCurrentStep] = useState<PaymentStep>('method');
  const [selectedMethod, setSelectedMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'card'>('bkash');
  const [accountNumber, setAccountNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');

  const paymentMethods = [
    { id: 'bkash', name: 'bKash', color: 'bg-pink-500', logo: '📱' },
    { id: 'nagad', name: 'Nagad', color: 'bg-orange-500', logo: '💳' },
    { id: 'rocket', name: 'Rocket', color: 'bg-purple-500', logo: '🚀' },
    { id: 'card', name: 'Credit/Debit Card', color: 'bg-blue-500', logo: '💳' }
  ];

  const handleMethodSelect = () => {
    setCurrentStep('account');
  };

  const handleAccountSubmit = () => {
    if (accountNumber.length >= 10 && transactionId.length >= 6) {
      setCurrentStep('processing');
      setTimeout(() => {
        setCurrentStep('success');
        setTimeout(onPaymentComplete, 1500);
      }, 2000);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-clay text-white p-4 text-center">
        <h3 className="font-display text-lg font-bold">
          {lang === 'bn' ? 'যাচাই ফি পেমেন্ট' : 'Verification Payment'}
        </h3>
        <div className="mt-2 text-clay-tint">
          <span className="text-2xl font-bold">৳{amount}</span>
          <span className="ml-2 text-sm opacity-90">
            ({urgency === 'urgent' ? (lang === 'bn' ? 'জরুরি' : 'Urgent') : (lang === 'bn' ? 'সাধারণ' : 'Standard')})
          </span>
        </div>
      </div>

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
                <span className="font-medium">{method.name}</span>
                {selectedMethod === method.id && (
                  <CheckCircle2 className="h-5 w-5 text-clay-deep ml-auto" />
                )}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-granite-soft">
            <Button variant="primary" size="md" onClick={handleMethodSelect} className="w-full">
              {lang === 'bn' ? 'পরবর্তী' : 'Continue'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel} className="w-full mt-2">
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
          </div>
        </div>
      )}

      {/* Account & Transaction Details */}
      {currentStep === 'account' && (
        <div className="p-6 space-y-4">
          <div className="text-center space-y-2">
            <Smartphone className="h-12 w-12 text-clay-deep mx-auto" />
            <h4 className="font-semibold text-ink">
              {lang === 'bn' ? 'পেমেন্ট বিবরণ দিন' : 'Enter Payment Details'}
            </h4>
            <p className="text-sm text-granite">
              {lang === 'bn' 
                ? `আপনার ${paymentMethods.find(m => m.id === selectedMethod)?.name} একাউন্ট নম্বর এবং লেনদেন আইডি দিন`
                : `Enter your ${paymentMethods.find(m => m.id === selectedMethod)?.name} account number and transaction ID`}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                {lang === 'bn' ? 'একাউন্ট নম্বর' : 'Account Number'}
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder={lang === 'bn' ? '০১৭XXXXXXXX' : '01XXXXXXXXX'}
                className="w-full p-3 border border-granite rounded text-center font-mono text-lg tracking-wide focus:border-clay focus:ring-1 focus:ring-clay outline-none"
                maxLength={15}
              />
              <p className="text-xs text-granite mt-1">
                {lang === 'bn' ? 'সংখ্যা শুধুমাত্র' : 'Numbers only'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                {lang === 'bn' ? 'লেনদেন আইডি' : 'Transaction ID'}
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                placeholder={lang === 'bn' ? 'TXN1234567' : 'TXN1234567'}
                className="w-full p-3 border border-granite rounded text-center font-mono text-lg tracking-wide focus:border-clay focus:ring-1 focus:ring-clay outline-none"
                maxLength={20}
              />
              <p className="text-xs text-granite mt-1">
                {lang === 'bn' ? 'পেমেন্ট সেবা প্রদানকারীর থেকে পান' : 'Get this from your payment provider'}
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-xs text-blue-800">
              {lang === 'bn' 
                ? '📝 নিশ্চিত করুন যে একাউন্ট নম্বর এবং লেনদেন আইডি সঠিক, কারণ এটি যাচাই করা হবে'
                : '📝 Ensure account number and transaction ID are correct - they will be verified'}
            </p>
          </div>

          <div className="pt-4 space-y-2">
            <Button 
              variant="primary" 
              size="md" 
              onClick={handleAccountSubmit} 
              className="w-full"
              disabled={accountNumber.length < 10 || transactionId.length < 6}
            >
              {lang === 'bn' ? 'পেমেন্ট যাচাই করুন' : 'Verify Payment'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep('method')} className="w-full">
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
            {lang === 'bn' ? 'পেমেন্ট যাচাই হচ্ছে...' : 'Verifying Payment...'}
          </h4>
          <p className="text-sm text-granite">
            {lang === 'bn' 
              ? 'অনুগ্রহ করে অপেক্ষা করুন, আমরা আপনার লেনদেন যাচাই করছি'
              : 'Please wait while we verify your transaction'}
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
              ? 'আপনার যাচাইয়ের অনুরোধ পাঠানো হচ্ছে...'
              : 'Submitting your verification request...'}
          </p>
        </div>
      )}
    </div>
  );
}