from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0009_mysql_active_device_guard")]

    operations = [
        migrations.AlterField(
            model_name="loginsession",
            name="end_reason",
            field=models.CharField(
                blank=True,
                choices=[
                    ("replaced", "Replaced by a newer login on this device"),
                    ("logout", "Logged out"),
                    ("server_restart", "Invalidated after server restart"),
                    ("account_disabled", "Account disabled"),
                    ("password_reset", "Password reset by an administrator"),
                ],
                max_length=32,
            ),
        ),
    ]
