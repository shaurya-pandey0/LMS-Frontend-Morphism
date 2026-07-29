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
