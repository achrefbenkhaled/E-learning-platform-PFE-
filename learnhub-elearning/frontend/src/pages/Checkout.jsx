import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { CreditCard, Lock, CheckCircle, ArrowLeft, Shield } from 'lucide-react';
import api from '../utils/api.js';
import { validateCardNumber, validateExpiry, validateCvv } from '../utils/validators.js';

const Checkout = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [card, setCard] = useState({
    cardName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
  });

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const { data } = await api.get(`/api/courses/${courseId}`);
        setCourse(data.course || data);
      } catch (err) {
        setError('Course not found');
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId]);

  useEffect(() => {
    if (!loading) {
      gsap.fromTo('.checkout-card', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.15 });
    }
  }, [loading]);

  const formatCardNumber = (val) => {
    const v = val.replace(/\D/g, '').slice(0, 16);
    return v.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val) => {
    const v = val.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 2) return v.slice(0, 2) + '/' + v.slice(2);
    return v;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cardErr = validateCardNumber(card.cardNumber);
    const expErr = validateExpiry(card.expiryDate);
    const cvvErr = validateCvv(card.cvv);
    if (cardErr || expErr || cvvErr) {
      setError(cardErr || expErr || cvvErr);
      return;
    }

    setProcessing(true);

    try {
      await api.post('/api/courses/checkout', {
        courseId,
        cardName: card.cardName,
        cardNumber: card.cardNumber.replace(/\s/g, ''),
        expiryDate: card.expiryDate,
        cvv: card.cvv,
      });
      setSuccess(true);
      setTimeout(() => navigate(`/courses/${courseId}`), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Payment failed. Try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-bdr border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-400/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-400/30">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-black text-txt mb-2">Payment Successful!</h2>
          <p className="text-txt-muted">You're now enrolled in <span className="text-yellow-400">{course?.title}</span></p>
          <p className="text-txt-muted text-sm mt-2">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface py-12 px-4">
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-txt-secondary hover:text-yellow-400 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Order Summary */}
        <div className="checkout-card card p-6 mb-6">
          <h2 className="text-lg font-bold text-txt mb-4">Order Summary</h2>
          <div className="flex items-center gap-4 p-4 bg-surface rounded-xl border border-bdr">
            <div className="w-14 h-14 rounded-xl bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-txt truncate">{course?.title}</h3>
              <p className="text-sm text-txt-muted">{course?.totalSessions || course?.sessions?.length || 0} sessions</p>
            </div>
            <span className="text-xl font-black text-yellow-400">${course?.price}</span>
          </div>
        </div>

        {/* Payment Form */}
        <div className="checkout-card card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-bold text-txt">Payment Details</h2>
            <span className="ml-auto badge badge-green flex items-center gap-1">
              <Shield className="w-3 h-3" /> Secure
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-txt-secondary mb-2">Cardholder Name</label>
              <input
                type="text"
                value={card.cardName}
                onChange={(e) => setCard({ ...card, cardName: e.target.value })}
                placeholder="John Doe"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-txt-secondary mb-2">Card Number</label>
              <input
                type="text"
                value={card.cardNumber}
                onChange={(e) => setCard({ ...card, cardNumber: formatCardNumber(e.target.value) })}
                placeholder="4242 4242 4242 4242"
                className="input-field"
                maxLength={19}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-txt-secondary mb-2">Expiry</label>
                <input
                  type="text"
                  value={card.expiryDate}
                  onChange={(e) => setCard({ ...card, expiryDate: formatExpiry(e.target.value) })}
                  placeholder="MM/YY"
                  className="input-field"
                  maxLength={5}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-txt-secondary mb-2">CVV</label>
                <input
                  type="text"
                  value={card.cvv}
                  onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="123"
                  className="input-field"
                  maxLength={4}
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={processing} className="btn-primary w-full py-3.5 text-base">
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  `Pay $${course?.price}`
                )}
              </button>
            </div>

            <p className="text-xs text-txt-muted text-center">
              This is a demo checkout. No real payment will be processed.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
