from django.db import migrations


class CreateModelIfMissing(migrations.CreateModel):
    """Create an initial table only when it is absent from the database."""

    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        model = to_state.apps.get_model(app_label, self.name)
        existing_tables = schema_editor.connection.introspection.table_names()
        if model._meta.db_table in existing_tables:
            return
        super().database_forwards(app_label, schema_editor, from_state, to_state)

    def database_backwards(self, app_label, schema_editor, from_state, to_state):
        # The initial file tables may predate this migration and may contain
        # the only copies of uploaded documents. Never drop their data on a
        # migration rollback.
        return
