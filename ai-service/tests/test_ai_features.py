import unittest
from app.main import fallback_reply, linear_forecast

class AssistantTests(unittest.TestCase):
    def test_order_tracking_is_not_fabricated(self):
        answer = fallback_reply("track my order")
        self.assertIn("My Orders", answer)
        self.assertIn("cannot access", answer)

    def test_refund_requires_human_review(self):
        answer = fallback_reply("I need a refund")
        self.assertIn("cannot approve", answer)

    def test_linear_forecast_non_negative(self):
        result = linear_forecast([10, 12, 14, 16, 18, 20, 22], 5)
        self.assertEqual(len(result), 5)
        self.assertTrue(all(value >= 0 for value in result))
        self.assertGreater(result[-1], result[0])

    def test_flat_history_stays_flat(self):
        self.assertEqual(linear_forecast([5, 5, 5, 5, 5], 3), [5.0, 5.0, 5.0])

if __name__ == "__main__":
    unittest.main()
