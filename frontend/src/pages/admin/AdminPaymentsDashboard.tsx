import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { listVerifications, listConsultations, recordLawyerPayout, getPlatformPaymentAccounts, savePlatformPaymentAccounts } from '../../lib/api';
import { PaymentAccountsForm } from '../../components/ui/PaymentAccountsForm';
import { PaymentStatusCard } from '../../components/ui/PaymentStatusCard';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { AdminPaymentFlow } from '../../components/ui/AdminPaymentFlow';
import type { VerificationRequest, ConsultationRequest } from '../../mocks/types';

export default function AdminPaymentsDashboard() {
  const { lang, num } = useLang();
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [consultations, setConsultations] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<{
    type: 'verification' | 'consultation';
    recipient: string;
    amount: number;
    details: string;
    id: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      listVerifications('admin'),
      listConsultations()
    ]).then(([verificationData, consultationData]) => {
      setVerifications(verificationData);
      setConsultations(consultationData);
      setLoading(false);
    });
  }, []);

  const handlePayLawyer = (req: VerificationRequest) => {
    const lawyerFee = req.urgency === 'urgent' ? 150 : 100;
    setSelectedPayment({
      type: 'verification',
      recipient: req.claimedByLawyerName || 'Unknown Lawyer',
      amount: lawyerFee,
      details: `Verification: ${req.questionExcerptEn.slice(0, 50)}...`,
      id: req.id
    });
    setPaymentModalOpen(true);
  };

  const handlePayConsultationLawyer = (consultation: ConsultationRequest) => {
    setSelectedPayment({
      type: 'consultation',
      recipient: consultation.lawyerName || 'Unknown Lawyer',
      amount: consultation.feeBdt,
      details: `Consultation: ${consultation.topicEn.slice(0, 50)}...`,
      id: consultation.id
    });
    setPaymentModalOpen(true);
  };

  const handlePaymentComplete = async () => {
    setPaymentModalOpen(false);
    if (selectedPayment) {
      // Persist the payout first; the list below only updates once it is saved.
      await recordLawyerPayout(selectedPayment.type, selectedPayment.id);
    }
    // Update the verification/consultation status to mark payment as processed
    if (selectedPayment) {
      if (selectedPayment.type === 'verification') {
        setVerifications(prev => prev.map(v => 
          v.id === selectedPayment.id 
            ? { ...v, verdict: { ...v.verdict!, paymentProcessed: true } }
            : v
        ));
      } else {
        setConsultations(prev => prev.map(c => 
          c.id === selectedPayment.id 
            ? { ...c, paymentProcessed: true }
            : c
        ));
      }
    }
    setSelectedPayment(null);
  };

  const handleCancelPayment = () => {
    setPaymentModalOpen(false);
    setSelectedPayment(null);
  };

  // Calculate payment statistics
  const completedVerifications = verifications.filter(v => v.status === 'completed');
  const completedConsultations = consultations.filter(c => c.status === 'completed');
  const pendingPayments = completedVerifications.filter(v => !v.verdict?.paymentProcessed).length + 
                          completedConsultations.filter(c => !c.paymentProcessed).length;
  
  const totalRevenue = completedVerifications.reduce((sum, v) => sum + v.feeBdt, 0) +
                       completedConsultations.reduce((sum, c) => sum + c.feeBdt, 0);
  const totalPayouts = completedVerifications.reduce((sum, v) => {
    const lawyerFee = v.urgency === 'urgent' ? 150 : 100;
    return sum + lawyerFee;
  }, 0) + completedConsultations.reduce((sum, c) => sum + c.feeBdt, 0);
  const netProfit = totalRevenue - totalPayouts;

  const stats = [
    {
      title: lang === 'bn' ? 'মোট আয়' : 'Total Revenue',
      value: `৳${num(totalRevenue)}`,
      icon: DollarSign,
      note: lang === 'bn' ? 'সম্পন্ন কাজ থেকে সর্বমোট' : 'all time, from completed work'
    },
    {
      title: lang === 'bn' ? 'আইনজীবী পেমেন্ট' : 'Lawyer Payouts',
      value: `৳${num(totalPayouts)}`,
      icon: Users,
      note: lang === 'bn' ? 'সম্পন্ন যাচাই' : 'completed verifications'
    },
    {
      title: lang === 'bn' ? 'নেট মুনাফা' : 'Net Profit',
      value: `৳${num(netProfit)}`,
      icon: TrendingUp,
      note: lang === 'bn' ? 'সিস্টেম রাখা' : 'system retention'
    },
    {
      title: lang === 'bn' ? 'মুলতুবি পেমেন্ট' : 'Pending Payouts',
      value: num(pendingPayments),
      icon: AlertCircle,
      note: lang === 'bn' ? 'অবিলম্বে প্রক্রিয়া করুন' : 'process immediately'
    }
  ];

  return (
    <div className="space-y-6 font-body">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {lang === 'bn' ? 'পেমেন্ট ও আর্থিক ড্যাশবোর্ড' : 'Payments & Finance Dashboard'}
        </h1>
        <p className="mt-1 text-xs text-granite">
          {lang === 'bn'
            ? 'যাচাই সেবার জন্য নাগরিক পেমেন্ট ও আইনজীবী প্রাপ্য পর্যবেক্ষণ'
            : 'Monitor citizen payments and lawyer earning payouts for verification services'}
        </p>
      </div>

      {/* Where clients pay verification fees */}
      <PaymentAccountsForm
        title={lang === 'bn' ? 'যাচাই ফি গ্রহণের একাউন্ট (প্ল্যাটফর্ম)' : 'Where clients pay verification fees (platform)'}
        description={
          lang === 'bn'
            ? 'নাগরিক যাচাই অনুরোধের সময় এই নম্বর/একাউন্ট দেখবেন। পরামর্শ ফি সরাসরি আইনজীবীর নিজের একাউন্টে যায়।'
            : 'Clients see these when requesting a lawyer verification. Consultation fees go directly to each lawyer’s own accounts.'
        }
        load={() => getPlatformPaymentAccounts().then((r) => r.accounts)}
        save={savePlatformPaymentAccounts}
      />

      {/* Verification fees waiting for the admin to confirm */}
      {(() => {
        const toReview = verifications.filter((v) => v.payment?.status === 'submitted');
        return (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-ink">
              {lang === 'bn' ? 'নিশ্চিত করার অপেক্ষায় যাচাই ফি' : 'Verification fees to confirm'}
              <span className="ml-2 rounded bg-clay-tint px-2 py-0.5 font-mono text-xs text-clay-deep">{num(toReview.length)}</span>
            </h2>
            {toReview.length === 0 ? (
              <p className="rounded border border-granite-soft bg-white p-4 text-sm text-granite">
                {lang === 'bn' ? 'এই মুহূর্তে কোনো পেমেন্ট নিশ্চিত করার বাকি নেই।' : 'No payments waiting for confirmation.'}
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {toReview.map((v) => (
                  <div key={v.id} className="space-y-2">
                    <p className="text-xs text-granite">
                      <strong className="text-ink">{v.citizenName}</strong> · {lang === 'bn' ? v.questionExcerptBn : v.questionExcerptEn}
                    </p>
                    <PaymentStatusCard
                      payment={v.payment}
                      kind="verification"
                      recordId={v.id}
                      canReview
                      onChange={(payment) => setVerifications((list) => list.map((x) => (x.id === v.id ? { ...x, payment } : x)))}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })()}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            label={stat.title}
            value={stat.value}
            icon={stat.icon}
            sub={stat.note}
          />
        ))}
      </div>

      {/* Payment Flow Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <div className="bg-white rounded border border-granite shadow-sm p-5">
          <h3 className="font-display text-lg font-bold text-ink mb-4">
            {lang === 'bn' ? 'আয়ের বিভাজন' : 'Revenue Breakdown'}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-granite-soft">
              <span className="text-sm text-ink-soft">
                {lang === 'bn' ? 'সাধারণ যাচাই (৳২০০)' : 'Standard Verification (₳200)'}
              </span>
              <div className="text-right">
                <div className="font-bold text-ink">
                  {verifications.filter(v => v.urgency === 'normal' && v.status === 'completed').length} × ৳200
                </div>
                <div className="text-xs text-granite">
                  = ৳{num(verifications.filter(v => v.urgency === 'normal' && v.status === 'completed').length * 200)}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-granite-soft">
              <span className="text-sm text-ink-soft">
                {lang === 'bn' ? 'জরুরি যাচাই (৳৩০০)' : 'Urgent Verification (₳300)'}
              </span>
              <div className="text-right">
                <div className="font-bold text-ink">
                  {verifications.filter(v => v.urgency === 'urgent' && v.status === 'completed').length} × ৳300
                </div>
                <div className="text-xs text-granite">
                  = ৳{num(verifications.filter(v => v.urgency === 'urgent' && v.status === 'completed').length * 300)}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 font-bold text-clay-deep">
              <span>{lang === 'bn' ? 'মোট আয়' : 'Total Revenue'}</span>
              <span>৳{num(totalRevenue)}</span>
            </div>
          </div>
        </div>

        {/* Payout Breakdown */}
        <div className="bg-white rounded border border-granite shadow-sm p-5">
          <h3 className="font-display text-lg font-bold text-ink mb-4">
            {lang === 'bn' ? 'আইনজীবী প্রাপ্য' : 'Lawyer Payouts'}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-granite-soft">
              <span className="text-sm text-ink-soft">
                {lang === 'bn' ? 'সাধারণ যাচাই (৳১০০)' : 'Standard Verification (₳100)'}
              </span>
              <div className="text-right">
                <div className="font-bold text-ink">
                  {verifications.filter(v => v.urgency === 'normal' && v.status === 'completed').length} × ৳100
                </div>
                <div className="text-xs text-granite">
                  = ৳{num(verifications.filter(v => v.urgency === 'normal' && v.status === 'completed').length * 100)}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-granite-soft">
              <span className="text-sm text-ink-soft">
                {lang === 'bn' ? 'জরুরি যাচাই (৳১৫০)' : 'Urgent Verification (₳150)'}
              </span>
              <div className="text-right">
                <div className="font-bold text-ink">
                  {verifications.filter(v => v.urgency === 'urgent' && v.status === 'completed').length} × ৳150
                </div>
                <div className="text-xs text-granite">
                  = ৳{num(verifications.filter(v => v.urgency === 'urgent' && v.status === 'completed').length * 150)}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 font-bold text-brick">
              <span>{lang === 'bn' ? 'মোট প্রাপ্য' : 'Total Payouts'}</span>
              <span>৳{num(totalPayouts)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-granite-soft font-bold text-clay-deep">
              <span>{lang === 'bn' ? 'সিস্টেম আয় (নেট)' : 'System Revenue (Net)'}</span>
              <span>৳{num(netProfit)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded border border-granite shadow-sm">
        <div className="p-5 border-b border-granite-soft">
          <h3 className="font-display text-lg font-bold text-ink">
            {lang === 'bn' ? 'সাম্প্রতিক লেনদেন' : 'Recent Transactions'}
          </h3>
        </div>
        <div className="divide-y divide-granite-soft">
          {verifications
            .filter(v => v.status === 'completed')
            .slice(0, 10)
            .map((req) => {
              const lawyerFee = req.urgency === 'urgent' ? 150 : 100;
              const systemFee = req.feeBdt - lawyerFee;
              
              return (
                <div key={req.id} className="p-5 hover:bg-bone/40 transition">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <StatusBadge status="completed" size="sm" />
                        <span className="font-mono text-xs text-granite">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.urgency === 'urgent' 
                            ? 'bg-brick/10 text-brick border border-brick/30'
                            : 'bg-clay-tint text-clay-deep border border-clay/30'
                        }`}>
                          {req.urgency === 'urgent' ? 'URGENT' : 'STANDARD'}
                        </span>
                      </div>
                      <p className="text-sm text-ink font-medium line-clamp-1">
                        {req.questionExcerptBn}
                      </p>
                      <p className="text-xs text-granite mt-1">
                        {lang === 'bn' ? 'যাচাইকারী' : 'Verified by'}: {req.claimedByLawyerName}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right space-y-1">
                        <div className="text-sm">
                          <span className="text-granite text-xs">{lang === 'bn' ? 'নাগরিক পেমেন্ট' : 'Citizen Payment'}:</span>
                          <div className="font-bold text-clay-deep">৳{req.feeBdt}</div>
                        </div>
                        <div className="text-xs">
                          <span className="text-granite">{lang === 'bn' ? 'আইনজীবী' : 'Lawyer'}:</span>
                          <span className="text-brick font-medium"> -৳{lawyerFee}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-granite">{lang === 'bn' ? 'সিস্টেম' : 'System'}:</span>
                          <span className="text-clay-deep font-bold"> +৳{systemFee}</span>
                        </div>
                      </div>
                      
                      {/* Pay Lawyer Button */}
                      <div className="flex flex-col gap-2">
                        {req.verdict?.paymentProcessed ? (
                          <div className="flex items-center gap-1 text-green-600 text-xs">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>{lang === 'bn' ? 'পরিশোধিত' : 'Paid'}</span>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handlePayLawyer(req)}
                            className="text-xs"
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            {lang === 'bn' ? 'পেমেন্ট করুন' : 'Pay Lawyer'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Admin Payment Modal */}
      <Modal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={lang === 'bn' ? 'আইনজীবী পেমেন্ট' : 'Lawyer Payment'}
      >
        {selectedPayment && (
          <AdminPaymentFlow
            paymentType={selectedPayment.type}
            recipient={selectedPayment.recipient}
            amount={selectedPayment.amount}
            details={selectedPayment.details}
            onPaymentComplete={handlePaymentComplete}
            onCancel={handleCancelPayment}
          />
        )}
      </Modal>
    </div>
  );
}