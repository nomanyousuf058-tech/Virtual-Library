import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '../contexts/AuthContext';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

interface PaymentButtonProps {
  bookId: string;
  price: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  bookId,
  price,
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handlePayment = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          bookId,
          price,
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment session');
      }

      const { sessionId } = await response.json();
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error('Stripe failed to initialize');
      }

      const result = await stripe.redirectToCheckout({ sessionId });

      if (result.error) {
        onError?.(result.error.message);
      } else {
        onSuccess?.();
      }
    } catch (error) {
      onError?.(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="payment-button"
    >
      {loading ? 'Processing...' : `Buy for $${price}`}
    </button>
  );
};

export default PaymentButton;