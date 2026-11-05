from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db.backends.mysql.base import Database


class Command(BaseCommand):
    help = "Create the configured MySQL database when it does not exist."
    requires_system_checks = []

    def handle(self, *args, **options):
        config = settings.DATABASES["default"]
        if config["ENGINE"] != "django.db.backends.mysql":
            raise CommandError("This project requires the MySQL database backend.")

        database_name = config["NAME"]
        if not database_name or len(database_name) > 64:
            raise CommandError("DB_NAME must contain between 1 and 64 characters.")

        driver_options = config.get("OPTIONS", {})
        connect_options = {
            "host": config["HOST"],
            "user": config["USER"],
            "passwd": config["PASSWORD"],
            "port": int(config["PORT"] or 3306),
            "charset": driver_options.get("charset", "utf8mb4"),
            "connect_timeout": 10,
        }
        if driver_options.get("ssl_mode"):
            connect_options["ssl_mode"] = driver_options["ssl_mode"]

        try:
            connection = Database.connect(**connect_options)
        except Database.Error as exc:
            raise CommandError(
                f"Could not connect to MySQL ({exc}). Check that the server is "
                "running and DB_HOST, DB_PORT, DB_USER, and DB_PASSWORD are correct."
            ) from exc

        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA "
                    "WHERE SCHEMA_NAME = %s",
                    [database_name],
                )
                exists = cursor.fetchone() is not None
                if not exists:
                    quoted_name = database_name.replace("`", "``")
                    cursor.execute(
                        f"CREATE DATABASE `{quoted_name}` "
                        "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                    )
        except Database.Error as exc:
            raise CommandError(
                f"Could not create or inspect the MySQL database '{database_name}'. "
                "The configured MySQL user needs permission to create it on first run."
            ) from exc
        finally:
            connection.close()

        action = "already exists" if exists else "created"
        self.stdout.write(self.style.SUCCESS(f"MySQL database '{database_name}' {action}."))
