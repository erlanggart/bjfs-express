ALTER TABLE payment_proofs 
ADD COLUMN payment_type VARCHAR(50) DEFAULT 'full' AFTER status;
