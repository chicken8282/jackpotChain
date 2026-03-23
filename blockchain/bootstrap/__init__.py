"""Local bootstrap helpers for development-only node setup."""

from .local_onboarding_reward import (
    LOCAL_ONBOARDING_BOOTSTRAP_ADDRESS,
    ensure_local_onboarding_reward_bootstrap,
)

__all__ = [
    "LOCAL_ONBOARDING_BOOTSTRAP_ADDRESS",
    "ensure_local_onboarding_reward_bootstrap",
]
