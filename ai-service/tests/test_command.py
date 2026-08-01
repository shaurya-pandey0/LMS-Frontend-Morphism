"""Unit tests for /command endpoint in ai-service."""

import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import CommandStatus, CommandTarget


class TestCommandEndpoint(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_command_chat_mode(self):
        response = self.client.post("/command", json={
            "target": "chat",
            "text": "Hello assistant",
            "date": "2026-07-29"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["target"], "chat")
        self.assertEqual(data["status"], "success")

    def test_command_expense_valid_extraction(self):
        response = self.client.post("/command", json={
            "target": "expense",
            "text": "Spent ₹25.50 on Lunch today",
            "date": "2026-07-29"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["target"], "expense")
        self.assertEqual(data["status"], "success")
        self.assertIsNotNone(data["payload"])
        self.assertEqual(data["payload"]["amount"], 25.5)
        self.assertEqual(data["payload"]["category"], "Food")
        self.assertEqual(data["payload"]["date"], "2026-07-29")

    def test_command_expense_single_still_returns_one_payload(self):
        response = self.client.post("/command", json={
            "target": "expense",
            "text": "Spent ₹25.50 on Lunch today",
            "date": "2026-07-29"
        })
        data = response.json()
        self.assertEqual(len(data["payloads"]), 1)
        # payload stays the first entry for older callers.
        self.assertEqual(data["payload"], data["payloads"][0])

    def test_command_expense_extracts_every_expense_in_one_message(self):
        """Regression: a message describing two spends produced only one draft.

        The extraction schema was a single object, so all but one expense was
        silently discarded. Both the model path and this rule fallback must now
        return one entry per distinct amount.
        """
        response = self.client.post("/command", json={
            "target": "expense",
            "text": "bruh i ate 500 and sent 344 to the house owner",
            "date": "2026-08-02"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")

        payloads = data["payloads"]
        self.assertEqual(len(payloads), 2, f"expected two drafts, got {payloads}")

        amounts = [p["amount"] for p in payloads]
        self.assertEqual(amounts, [500.0, 344.0])

        by_amount = {p["amount"]: p for p in payloads}
        self.assertEqual(by_amount[500.0]["category"], "Food")
        # Inferred from the purpose of the payment, not from the word "rent".
        self.assertEqual(by_amount[344.0]["category"], "Housing")
        for p in payloads:
            self.assertEqual(p["date"], "2026-08-02")

        self.assertIn("2 expenses", data["message"])

    def test_command_expense_unclear_category_falls_back_without_losing_amount(self):
        response = self.client.post("/command", json={
            "target": "expense",
            "text": "paid 90 for something I can't remember",
            "date": "2026-08-02"
        })
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(len(data["payloads"]), 1)
        self.assertEqual(data["payloads"][0]["amount"], 90.0)
        self.assertEqual(data["payloads"][0]["category"], "Misc")

    def test_extraction_list_tolerates_a_bad_sibling(self):
        """One unusable entry must not discard the valid ones beside it.

        Validation happens per list, so a `gt=0` constraint on amount would make
        a single `amount: 0` from the model fail the whole ExtractedExpenseList
        and throw away the good expenses with it. The handler filters instead.
        """
        from app.schemas import ExtractedExpenseList

        parsed = ExtractedExpenseList.model_validate({
            "expenses": [
                {"category": "Food", "amount": 0},        # unusable
                {"category": "Housing", "amount": 344},   # must survive
            ]
        })
        self.assertEqual(len(parsed.expenses), 2)
        self.assertEqual(parsed.expenses[1].amount, 344)

    def test_command_expense_missing_amount_triggers_clarification(self):
        response = self.client.post("/command", json={
            "target": "expense",
            "text": "Bought some groceries earlier",
            "date": "2026-07-29"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["target"], "expense")
        self.assertEqual(data["status"], "clarification_needed")
        self.assertIsNone(data["payload"])
        self.assertIn("amount", data["message"])

    def test_command_daily_log_valid_extraction(self):
        response = self.client.post("/command", json={
            "target": "daily_log",
            "text": "Slept 7.5 hours and drank 2000 ml of water today",
            "date": "2026-07-29"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["target"], "daily_log")
        self.assertEqual(data["status"], "success")
        self.assertIsNotNone(data["payload"])
        self.assertEqual(data["payload"]["sleepHours"], 7.5)
        self.assertEqual(data["payload"]["waterIntake"], 2000.0)
        # A daily log merges per date, so it is always exactly one draft.
        self.assertEqual(data["payloads"], [data["payload"]])

    def test_command_daily_log_missing_fields_triggers_clarification(self):
        response = self.client.post("/command", json={
            "target": "daily_log",
            "text": "Just checking in for today",
            "date": "2026-07-29"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["target"], "daily_log")
        self.assertEqual(data["status"], "clarification_needed")
        self.assertIsNone(data["payload"])


if __name__ == "__main__":
    unittest.main()
