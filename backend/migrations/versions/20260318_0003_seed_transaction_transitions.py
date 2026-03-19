from __future__ import annotations

from alembic import op

revision = "20260318_0003"
down_revision = "20260318_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        DECLARE
            schema_name text;
            transaction_type_id integer;
            requested_badge_id integer;
            cancelled_badge_id integer;
        BEGIN
            SELECT id INTO transaction_type_id FROM schema_core.transition_types WHERE key = 'transaction';
            SELECT id INTO requested_badge_id FROM schema_core.badges WHERE key = 'req';
            SELECT id INTO cancelled_badge_id FROM schema_core.badges WHERE key = 'cancel';

            FOREACH schema_name IN ARRAY ARRAY['schema_mi', 'schema_md', 'schema_ma', 'schema_mc']
            LOOP
                IF to_regclass(schema_name || '.badge_transitions') IS NOT NULL THEN
                    EXECUTE format(
                        'INSERT INTO %I.badge_transitions (id, type_id, from_id, to_id)
                         SELECT COALESCE(MAX(id), 0) + 1, $1, $2, $3
                         FROM %I.badge_transitions
                         WHERE NOT EXISTS (
                             SELECT 1 FROM %I.badge_transitions
                             WHERE type_id = $1 AND from_id = $2 AND to_id = $3
                         )',
                        schema_name,
                        schema_name,
                        schema_name
                    )
                    USING transaction_type_id, requested_badge_id, cancelled_badge_id;
                END IF;
            END LOOP;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DO $$
        DECLARE
            schema_name text;
            transaction_type_id integer;
            requested_badge_id integer;
            cancelled_badge_id integer;
        BEGIN
            SELECT id INTO transaction_type_id FROM schema_core.transition_types WHERE key = 'transaction';
            SELECT id INTO requested_badge_id FROM schema_core.badges WHERE key = 'req';
            SELECT id INTO cancelled_badge_id FROM schema_core.badges WHERE key = 'cancel';

            FOREACH schema_name IN ARRAY ARRAY['schema_mi', 'schema_md', 'schema_ma', 'schema_mc']
            LOOP
                IF to_regclass(schema_name || '.badge_transitions') IS NOT NULL THEN
                    EXECUTE format(
                        'DELETE FROM %I.badge_transitions
                         WHERE type_id = $1 AND from_id = $2 AND to_id = $3',
                        schema_name
                    )
                    USING transaction_type_id, requested_badge_id, cancelled_badge_id;
                END IF;
            END LOOP;
        END $$;
        """
    )
