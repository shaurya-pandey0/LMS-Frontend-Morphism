"""Deterministic rule-based insight fallback.

Mirrors the Spring Boot ``InsightService`` so the AI service always has a
sensible, dependency-free answer when the LLM is unavailable or returns
invalid output. Every Insight produced here is a validated Pydantic object.
"""

from __future__ import annotations

from typing import List

from .schemas import Insight, InsightCategory, LifestyleContext, Severity

# Mood vocabularies shared with the chat grounding.
NEGATIVE_MOODS = {"anxious", "tired", "sad", "stressed", "angry"}
POSITIVE_MOODS = {"happy", "calm", "grateful", "great", "good"}


def rule_based_insights(ctx: LifestyleContext) -> List[Insight]:
    insights: List[Insight] = []

    # Sleep
    if ctx.avg_sleep_hours is not None:
        if ctx.avg_sleep_hours < ctx.min_sleep_hours:
            insights.append(Insight(
                category=InsightCategory.SLEEP,
                severity=Severity.WARNING,
                title="Insufficient sleep",
                message=(
                    f"You're averaging {ctx.avg_sleep_hours:.1f} hours of sleep, below the "
                    f"{ctx.min_sleep_hours:.1f}-hour minimum. Try an earlier wind-down routine."
                ),
            ))
        elif ctx.avg_sleep_hours >= ctx.good_sleep_hours:
            insights.append(Insight(
                category=InsightCategory.SLEEP,
                severity=Severity.POSITIVE,
                title="Healthy sleep",
                message=f"Nice work — you're averaging {ctx.avg_sleep_hours:.1f} hours of sleep.",
            ))

    # Spending
    if ctx.weekly_spend is not None and ctx.weekly_spend > ctx.spend_threshold:
        insights.append(Insight(
            category=InsightCategory.SPENDING,
            severity=Severity.WARNING,
            title="Overspending",
            message=(
                f"You've spent {ctx.weekly_spend:.2f} this week, above your "
                f"{ctx.spend_threshold:.2f} threshold. Review your largest categories."
            ),
        ))

    # Habit consistency
    if ctx.habit_consistency is not None and ctx.habit_consistency < ctx.habit_consistency_threshold:
        insights.append(Insight(
            category=InsightCategory.HABITS,
            severity=Severity.WARNING,
            title="Low consistency",
            message=(
                f"You logged habits on only {ctx.habit_consistency * 100:.0f}% of days. "
                "Small daily wins build momentum."
            ),
        ))

    # Hydration
    if ctx.avg_water_ml is not None and ctx.avg_water_ml < ctx.min_water_ml:
        insights.append(Insight(
            category=InsightCategory.HYDRATION,
            severity=Severity.WARNING,
            title="Low hydration",
            message=(
                f"You're averaging {ctx.avg_water_ml:.0f} ml of water a day, below the "
                f"{ctx.min_water_ml:.0f} ml target. Keep a bottle within reach."
            ),
        ))

    # Mood
    if ctx.mood_counts:
        negative = sum(v for k, v in ctx.mood_counts.items() if k.lower() in NEGATIVE_MOODS)
        positive = sum(v for k, v in ctx.mood_counts.items() if k.lower() in POSITIVE_MOODS)
        if negative > positive:
            insights.append(Insight(
                category=InsightCategory.MOOD,
                severity=Severity.WARNING,
                title="Mood dip",
                message="Your recent moods skew negative. Lean on activities that recharge you.",
            ))
        elif positive > 0 and positive >= negative:
            insights.append(Insight(
                category=InsightCategory.MOOD,
                severity=Severity.POSITIVE,
                title="Positive mood",
                message="Your mood has been largely positive. Keep doing what's working.",
            ))

    if not insights:
        insights.append(Insight(
            category=InsightCategory.GENERAL,
            severity=Severity.INFO,
            title="Not enough data yet",
            message="Keep logging your days, expenses, and journal entries to unlock insights.",
        ))

    return insights
