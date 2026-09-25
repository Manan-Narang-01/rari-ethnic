"""event page builder and campaign audit logs

Revision ID: 65c617e78d59
Revises: d566c8af579a
Create Date: 2026-09-25 10:44:53.961988

Converts every existing campaign's fixed hero/shloka/attribute_groups fields
into an equivalent `sections` list, so the live Navratri page renders
identically after this deploy. Order matches the current hardcoded
NavratriLanding.jsx layout exactly: hero -> shloka -> full drop grid -> Garba
Ready edit -> day-colours guide -> any other attribute groups (previously
defined but never actually rendered anywhere -- this is the first time they
become visible) -> Family Function edit -> urgency banner.
"""
import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '65c617e78d59'
down_revision: Union[str, Sequence[str], None] = 'd566c8af579a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Migration-scoped table definition (only the columns this migration touches)
# -- never import the live app.db.models ORM classes into a migration, since
# their column set changes over time and would break replaying old revisions.
_campaigns = sa.table(
    "campaigns",
    sa.column("id", sa.String),
    sa.column("hero_eyebrow", sa.String),
    sa.column("hero_title", sa.String),
    sa.column("hero_subtitle", sa.String),
    sa.column("hero_image", sa.String),
    sa.column("hero_image_crop", postgresql.JSONB),
    sa.column("hero_secondary_image", sa.String),
    sa.column("hero_secondary_image_crop", postgresql.JSONB),
    sa.column("cta_label", sa.String),
    sa.column("order_by_note", sa.String),
    sa.column("shloka", sa.String),
    sa.column("shloka_translation", sa.String),
    sa.column("attribute_groups", postgresql.JSONB),
    sa.column("sections", postgresql.JSONB),
)


def _new_id() -> str:
    return str(uuid.uuid4())


def _build_sections(row) -> list:
    sections = []

    sections.append({
        "id": _new_id(), "type": "hero", "enabled": True,
        "config": {
            "eyebrow": row.hero_eyebrow or "", "title": row.hero_title or "",
            "subtitle": row.hero_subtitle or "", "image": row.hero_image,
            "image_crop": row.hero_image_crop, "secondary_image": row.hero_secondary_image,
            "secondary_image_crop": row.hero_secondary_image_crop,
            "cta_label": row.cta_label or "", "cta_anchor": "navratri-drop",
            "order_by_note": row.order_by_note or "",
        },
    })

    if row.shloka:
        sections.append({
            "id": _new_id(), "type": "shloka", "enabled": True,
            "config": {"quote": row.shloka, "translation": row.shloka_translation or ""},
        })

    sections.append({
        "id": _new_id(), "type": "product_grid", "enabled": True,
        "config": {
            "heading": "Navratri Collection", "subheading": "The full drop",
            "filter": {"is_navratri": True},
            "empty_state_message": "New Navratri pieces coming soon. Follow us on WhatsApp to know first.",
        },
    })

    sections.append({
        "id": _new_id(), "type": "product_grid", "enabled": True,
        "config": {
            "heading": "Garba Ready", "subheading": "Curated edit",
            "filter": {"edit_tag": "Garba Ready"}, "empty_state_message": "",
        },
    })

    groups = row.attribute_groups or []
    day_colours = next((g for g in groups if g.get("key") == "day-colours"), None)
    if day_colours:
        sections.append({
            "id": _new_id(), "type": "attribute_grid", "enabled": True,
            "config": {
                "heading": day_colours.get("title") or "Day 1-9 Colours",
                "subheading": "Every day carries its colour. Wear yours with intention.",
                "layout": "badges", "items": day_colours.get("items", []),
            },
        })

    for group in groups:
        if group.get("key") == "day-colours":
            continue
        sections.append({
            "id": _new_id(), "type": "attribute_grid", "enabled": True,
            "config": {
                "heading": group.get("title") or "", "subheading": "",
                "layout": "list", "items": group.get("items", []),
            },
        })

    sections.append({
        "id": _new_id(), "type": "product_grid", "enabled": True,
        "config": {
            "heading": "Family Function", "subheading": "Curated edit",
            "filter": {"edit_tag": "Family Function"}, "empty_state_message": "",
        },
    })

    sections.append({
        "id": _new_id(), "type": "urgency_banner", "enabled": True,
        "config": {
            "heading": "Pre-order now for guaranteed pre-Navratri delivery.",
            "subtext": "Limited stock · Made-to-measure closing soon",
            "cta_label": "Reserve your piece", "cta_link": "/shop/lehengas",
        },
    })

    return sections


def upgrade() -> None:
    op.create_table('campaign_audit_logs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('campaign_id', sa.String(), nullable=False),
        sa.Column('campaign_name', sa.String(), nullable=False),
        sa.Column('actor_id', sa.String(), nullable=False),
        sa.Column('actor_name', sa.String(), nullable=False),
        sa.Column('actor_email', sa.String(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('changes', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_campaign_audit_logs_campaign_id', 'campaign_audit_logs', ['campaign_id'], unique=False)

    op.add_column('campaigns', sa.Column('sections', postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    bind = op.get_bind()
    rows = bind.execute(sa.select(
        _campaigns.c.id, _campaigns.c.hero_eyebrow, _campaigns.c.hero_title, _campaigns.c.hero_subtitle,
        _campaigns.c.hero_image, _campaigns.c.hero_image_crop, _campaigns.c.hero_secondary_image,
        _campaigns.c.hero_secondary_image_crop, _campaigns.c.cta_label, _campaigns.c.order_by_note,
        _campaigns.c.shloka, _campaigns.c.shloka_translation, _campaigns.c.attribute_groups,
    )).all()
    for row in rows:
        bind.execute(
            _campaigns.update().where(_campaigns.c.id == row.id).values(sections=_build_sections(row))
        )

    op.alter_column('campaigns', 'sections', nullable=False)

    op.drop_column('campaigns', 'shloka_translation')
    op.drop_column('campaigns', 'shloka')
    op.drop_column('campaigns', 'cta_label')
    op.drop_column('campaigns', 'hero_secondary_image_crop')
    op.drop_column('campaigns', 'hero_subtitle')
    op.drop_column('campaigns', 'hero_title')
    op.drop_column('campaigns', 'hero_image')
    op.drop_column('campaigns', 'hero_secondary_image')
    op.drop_column('campaigns', 'order_by_note')
    op.drop_column('campaigns', 'hero_eyebrow')
    op.drop_column('campaigns', 'attribute_groups')
    op.drop_column('campaigns', 'hero_image_crop')


def downgrade() -> None:
    op.add_column('campaigns', sa.Column('hero_image_crop', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True))
    op.add_column('campaigns', sa.Column('attribute_groups', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True))
    op.add_column('campaigns', sa.Column('hero_eyebrow', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.add_column('campaigns', sa.Column('order_by_note', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.add_column('campaigns', sa.Column('hero_secondary_image', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.add_column('campaigns', sa.Column('hero_image', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.add_column('campaigns', sa.Column('hero_title', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.add_column('campaigns', sa.Column('hero_subtitle', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.add_column('campaigns', sa.Column('hero_secondary_image_crop', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True))
    op.add_column('campaigns', sa.Column('cta_label', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.add_column('campaigns', sa.Column('shloka', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.add_column('campaigns', sa.Column('shloka_translation', sa.VARCHAR(), autoincrement=False, nullable=True))
    # Data is not reconstructed from `sections` on downgrade -- this is a
    # schema rollback safety net, not a lossless round-trip.
    op.execute("UPDATE campaigns SET hero_eyebrow='', hero_title='', hero_subtitle='', cta_label='', order_by_note='', shloka='', shloka_translation='', attribute_groups='[]'::jsonb")
    op.alter_column('campaigns', 'hero_eyebrow', nullable=False)
    op.alter_column('campaigns', 'hero_title', nullable=False)
    op.alter_column('campaigns', 'hero_subtitle', nullable=False)
    op.alter_column('campaigns', 'cta_label', nullable=False)
    op.alter_column('campaigns', 'order_by_note', nullable=False)
    op.alter_column('campaigns', 'shloka', nullable=False)
    op.alter_column('campaigns', 'shloka_translation', nullable=False)
    op.alter_column('campaigns', 'attribute_groups', nullable=False)
    op.drop_column('campaigns', 'sections')
    op.drop_index('ix_campaign_audit_logs_campaign_id', table_name='campaign_audit_logs')
    op.drop_table('campaign_audit_logs')
