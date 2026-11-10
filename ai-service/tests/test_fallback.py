import unittest
from app.main import fallback_reply

class FallbackTests(unittest.TestCase):
    def test_order_tracking_does_not_claim_access(self):
        reply = fallback_reply("track my order")
        self.assertIn("My Orders", reply)
        self.assertIn("cannot access", reply)

    def test_product_recommendation_asks_for_budget(self):
        reply = fallback_reply("recommend a product")
        self.assertIn("budget", reply)

if __name__ == "__main__":
    unittest.main()
