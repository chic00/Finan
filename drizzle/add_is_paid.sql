-- Adiciona campo isPaid para controlar se a conta do ciclo atual foi paga
ALTER TABLE "recurring_transactions" ADD COLUMN "is_paid" boolean DEFAULT false NOT NULL;
ALTER TABLE "recurring_transactions" ADD COLUMN "paid_at" timestamp;
