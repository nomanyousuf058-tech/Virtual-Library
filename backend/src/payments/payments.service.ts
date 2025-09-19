import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Payment } from './entities/payment.entity';
import { EscrowPayment } from './entities/escrow-payment.entity';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private logger = new Logger(PaymentsService.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(EscrowPayment)
    private escrowRepository: Repository<EscrowPayment>,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });
  }

  async createCheckoutSession(bookId: string, userId: string, price: number) {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Book Purchase - ${bookId}`,
              },
              unit_amount: Math.round(price * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${this.configService.get('FRONTEND_URL')}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.configService.get('FRONTEND_URL')}/payment/cancel`,
        client_reference_id: userId,
        metadata: {
          bookId,
          userId,
          type: 'book_purchase',
        },
      });

      return { sessionId: session.id, url: session.url };
    } catch (error) {
      this.logger.error('Error creating checkout session:', error);
      throw new Error('Failed to create payment session');
    }
  }

  async createEscrowPayment(projectId: string, options: {
    amount: number;
    clientId: string;
    translatorId: string;
    description: string;
  }): Promise<string> {
    try {
      // Create a Payment Intent with capture_method manual
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(options.amount * 100),
        currency: 'usd',
        capture_method: 'manual',
        description: options.description,
        metadata: {
          projectId,
          clientId: options.clientId,
          translatorId: options.translatorId,
          type: 'escrow',
        },
      });

      // Store escrow payment in database
      const escrowPayment = this.escrowRepository.create({
        paymentIntentId: paymentIntent.id,
        projectId,
        clientId: options.clientId,
        translatorId: options.translatorId,
        amount: options.amount,
        status: 'pending',
        description: options.description,
      });

      await this.escrowRepository.save(escrowPayment);

      return paymentIntent.client_secret;
    } catch (error) {
      this.logger.error('Error creating escrow payment:', error);
      throw new Error('Failed to create escrow payment');
    }
  }

  async releaseEscrowPayment(paymentIntentId: string, userId: string): Promise<void> {
    const escrowPayment = await this.escrowRepository.findOne({
      where: { paymentIntentId },
    });

    if (!escrowPayment) {
      throw new Error('Escrow payment not found');
    }

    // Verify user has permission to release (client or admin)
    if (escrowPayment.clientId !== userId) {
      throw new Error('Not authorized to release this payment');
    }

    try {
      // Capture the payment intent
      await this.stripe.paymentIntents.capture(paymentIntentId);

      // Update escrow status
      escrowPayment.status = 'released';
      escrowPayment.releasedAt = new Date();
      await this.escrowRepository.save(escrowPayment);

      // Initiate payout to translator
      await this.initiatePayout(
        escrowPayment.translatorId,
        escrowPayment.amount * 0.85, // 15% platform fee
        `Payment for project: ${escrowPayment.projectId}`
      );
    } catch (error) {
      this.logger.error('Error releasing escrow payment:', error);
      throw new Error('Failed to release escrow payment');
    }
  }

  async refundEscrowPayment(paymentIntentId: string, reason: string): Promise<void> {
    const escrowPayment = await this.escrowRepository.findOne({
      where: { paymentIntentId },
    });

    if (!escrowPayment) {
      throw new Error('Escrow payment not found');
    }

    try {
      // Cancel the payment intent
      await this.stripe.paymentIntents.cancel(paymentIntentId, {
        cancellation_reason: 'requested_by_customer',
      });

      // Update escrow status
      escrowPayment.status = 'refunded';
      escrowPayment.refundReason = reason;
      escrowPayment.refundedAt = new Date();
      await this.escrowRepository.save(escrowPayment);
    } catch (error) {
      this.logger.error('Error refunding escrow payment:', error);
      throw new Error('Failed to refund escrow payment');
    }
  }

  async initiatePayout(userId: string, amount: number, description: string): Promise<void> {
    try {
      // Get user's Stripe Connect account ID
      const userStripeAccount = await this.getUserStripeAccount(userId);
      
      if (!userStripeAccount) {
        throw new Error('User does not have a connected Stripe account');
      }

      // Create transfer to user's Stripe account
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        destination: userStripeAccount,
        description,
      });

      this.logger.log(`Payout initiated: ${transfer.id} to user ${userId}`);
    } catch (error) {
      this.logger.error('Error initiating payout:', error);
      throw new Error('Failed to initiate payout');
    }
  }

  async handleWebhookEvent(payload: any, signature: string): Promise<void> {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
    
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object);
          break;
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;
        case 'transfer.failed':
          await this.handleTransferFailed(event.data.object);
          break;
        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error('Webhook error:', error);
      throw new Error('Webhook handler failed');
    }
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const { bookId, userId } = session.metadata;
    
    // Record payment in database
    const payment = this.paymentRepository.create({
      stripeSessionId: session.id,
      paymentIntentId: session.payment_intent as string,
      userId,
      bookId,
      amount: session.amount_total / 100, // Convert from cents
      status: 'completed',
      currency: session.currency,
    });

    await this.paymentRepository.save(payment);

    // Grant user access to the book
    await this.grantBookAccess(userId, bookId);
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    // Handle successful payments (if not already handled by checkout.session.completed)
    this.logger.log(`Payment succeeded: ${paymentIntent.id}`);
  }

  private async handleTransferFailed(transfer: Stripe.Transfer) {
    // Handle failed transfers (notify admin, retry logic, etc.)
    this.logger.error(`Transfer failed: ${transfer.id}`, transfer.failure_message);
  }

  private async getUserStripeAccount(userId: string): Promise<string | null> {
    // Implementation to retrieve user's Stripe Connect account ID
    // This would typically come from your database
    return 'acct_123456789'; // Example
  }

  private async grantBookAccess(userId: string, bookId: string): Promise<void> {
    // Implementation to grant user access to the purchased book
    // This would update your database to reflect the purchase
  }
}