# Lance Go-Live Checklist

Private ops notes. No secrets in this file.

## Identity: brand in public, legal in paperwork

- Public everywhere (site, footer, license, Paddle display name, receipts): **Lance** / "Made by independent freelancers".
- Private everywhere (Paddle KYC, bank, CRA, verification docs): legal name, spelled identically in all four places.
- Never put a home address on anything customer-facing. Receipts can show the
  business address — use a mailbox/virtual business address, never home.

## Business registration (Alberta)

- Trade name via registry agent or Ownr (~$49–65 all-in, no NUANS needed, no
  renewal). Required within 6 months of operating under a non-legal name.
- Incorporate (Ownr ~$499, up to $300 back with RBC business account) when
  revenue or risk justifies the shield. Trade name gives zero liability
  protection.

## Money setup

- [ ] Paddle payment methods enabled (Checkout settings)
- [ ] Bank/payout details entered (Business account > Payouts)
- [ ] Business verification passed (dashboard confirms)
- [ ] Hosted-checkout approval email sent to sellers@paddle.com
- [ ] GitHub Secrets set: PADDLE_MONTHLY_PRICE_ID, PADDLE_YEARLY_PRICE_ID,
      PADDLE_ONETIME_PRICE_ID, PADDLE_CHECKOUT_URL
- [ ] License worker secrets set (7 total); pool stocked (5 keys)
- [ ] Notification destination created; endpoint secret wired
- [ ] Resend sending domain verified (buyer emails need it; test mode is inbox-only)

## Insurance & admin (fund from first revenue)

- [ ] Tech E&O + general liability (Zensurance/HUB, a few hundred $/yr)
- [ ] Separate bank account for business money
- [ ] GST/HST registration past $30k/12mo revenue
- [ ] Trademark "Lance" via CIPO (~$250 DIY) once earning

## Launch (Oct 1)

- [ ] Quota refresh → scheduled v1.0.0 release builds
- [ ] $0 discount live test: checkout → key email → activate in app
- [ ] Product Hunt + Show HN + lifetime launch price ($149)
- [ ] QA click-through pass
