const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const Stripe = require("stripe");

// Use the secret key from your Render environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors({ origin: ["https://nuwaii.com", "https://www.nuwaii.com"] }));
app.use(bodyParser.json());

// Health check
app.get("/", (_req, res) => res.send("✅ nuwaii-stripe backend is running"));

// Create checkout session
app.post("/api/checkout", async (req, res) => {
  try {
    const { email } = req.body || {};
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: "https://nuwaii.com/app?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://nuwaii.com/cancel",
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Verify active subscription
app.get("/api/verify-session", async (req, res) => {
  try {
    const sid = req.query.session_id;
    if (!sid) return res.json({ paid: false });

    const s = await stripe.checkout.sessions.retrieve(sid, { expand: ["subscription"] });
    const active =
      s.payment_status === "paid" &&
      (s.subscription?.status === "active" || s.subscription?.status === "trialing");

    res.json({ paid: !!active, email: s.customer_email });
  } catch (err) {
    res.status(500).json({ paid: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 nuwaii-stripe running on ${PORT}`));
