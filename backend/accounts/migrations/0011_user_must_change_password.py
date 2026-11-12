from django.db import migrations, models


def flag_advisers_who_have_never_logged_in(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    LoginSession = apps.get_model("accounts", "LoginSession")
    users_with_sessions = LoginSession.objects.using(schema_editor.connection.alias).values("user_id")
    User.objects.using(schema_editor.connection.alias).filter(role="adviser").exclude(
        pk__in=users_with_sessions
    ).update(must_change_password=True)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0010_loginsession_password_reset_reason"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="must_change_password",
            field=models.BooleanField(
                default=False,
                help_text="Require the adviser to choose a new password at their first login.",
            ),
        ),
        migrations.RunPython(flag_advisers_who_have_never_logged_in, migrations.RunPython.noop),
    ]
