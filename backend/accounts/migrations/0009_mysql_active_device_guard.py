from django.db import migrations, models
from django.db.models import F
from django.utils import timezone


def remove_legacy_partial_constraint(apps, schema_editor):
    """Remove the prior conditional index when the database created it."""
    login_session = apps.get_model("accounts", "LoginSession")
    constraint_name = "one_active_login_per_device"
    with schema_editor.connection.cursor() as cursor:
        constraints = schema_editor.connection.introspection.get_constraints(
            cursor, login_session._meta.db_table
        )
    if constraint_name in constraints:
        constraint = next(
            constraint
            for constraint in login_session._meta.constraints
            if constraint.name == constraint_name
        )
        schema_editor.remove_constraint(login_session, constraint)


def close_duplicate_active_sessions(apps, schema_editor):
    """Normalize databases where the former conditional index was unsupported."""
    LoginSession = apps.get_model("accounts", "LoginSession")
    alias = schema_editor.connection.alias
    active_sessions = (
        LoginSession.objects.using(alias)
        .filter(ended_at__isnull=True)
        .order_by("device_id", "-created_at", "-id")
        .values_list("id", "device_id")
    )
    seen_devices = set()
    duplicate_ids = []
    for session_id, device_id in active_sessions.iterator():
        if device_id in seen_devices:
            duplicate_ids.append(session_id)
        else:
            seen_devices.add(device_id)

    if duplicate_ids:
        LoginSession.objects.using(alias).filter(id__in=duplicate_ids).update(
            ended_at=timezone.now(), end_reason="replaced"
        )


def backfill_active_device_ids(apps, schema_editor):
    LoginSession = apps.get_model("accounts", "LoginSession")
    LoginSession.objects.using(schema_editor.connection.alias).filter(
        ended_at__isnull=True
    ).update(active_device_id=F("device_id"))


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0008_email_as_login"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    remove_legacy_partial_constraint, migrations.RunPython.noop
                ),
            ],
            state_operations=[
                migrations.RemoveConstraint(
                    model_name="loginsession",
                    name="one_active_login_per_device",
                ),
            ],
        ),
        migrations.RunPython(
            close_duplicate_active_sessions, migrations.RunPython.noop
        ),
        migrations.AddField(
            model_name="loginsession",
            name="active_device_id",
            field=models.CharField(
                blank=True,
                editable=False,
                max_length=64,
                null=True,
                unique=True,
            ),
        ),
        migrations.RunPython(backfill_active_device_ids, migrations.RunPython.noop),
    ]
