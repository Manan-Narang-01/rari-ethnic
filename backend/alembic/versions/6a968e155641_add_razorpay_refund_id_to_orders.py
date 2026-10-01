"""add razorpay refund id to orders

Revision ID: 6a968e155641
Revises: 65c617e78d59
Create Date: 2026-09-30 22:52:06.145832

Supports auto-refunding a Razorpay payment that lands after the
pending_payment expiry sweep has already cancelled its order (see
OrderService.expire_stale_pending_payments and api/v1/payments.py) -- an
audit trail for "we took your money late, here's proof we gave it back".
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6a968e155641'
down_revision: Union[str, Sequence[str], None] = '65c617e78d59'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('razorpay_refund_id', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('orders', 'razorpay_refund_id')
