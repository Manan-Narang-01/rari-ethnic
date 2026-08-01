"""Generic SMTP sender. Configuration lives in the Payments & Shipping-style
Integration system (category "email", provider "smtp") rather than env vars,
so a Super Admin can set/change it from the admin panel without a redeploy --
see app/models/integration.py PROVIDER_CATALOG["email"]."""
import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.repositories.integration_repo import IntegrationRepository
from app.utils.crypto import decrypt

logger = logging.getLogger(__name__)


async def _get_smtp_config() -> dict:
    integration = await IntegrationRepository.get_by_provider("email", "smtp")
    if not integration or not integration.get("is_enabled"):
        return None
    creds = integration.get("credentials", {})
    host = decrypt(creds.get("host", ""))
    from_email = decrypt(creds.get("from_email", ""))
    if not host or not from_email:
        return None
    try:
        port = int(decrypt(creds.get("port", "")) or 587)
    except ValueError:
        port = 587
    return {
        "host": host,
        "port": port,
        "username": decrypt(creds.get("username", "")),
        "password": decrypt(creds.get("password", "")),
        "from_email": from_email,
        "from_name": decrypt(creds.get("from_name", "")) or "Rari Ethnic",
    }


def _send_sync(cfg: dict, to_emails: list, subject: str, html_body: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{cfg['from_name']} <{cfg['from_email']}>"
    msg["To"] = ", ".join(to_emails)
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(cfg["host"], cfg["port"], timeout=15) as server:
        server.starttls()
        if cfg["username"]:
            server.login(cfg["username"], cfg["password"])
        server.sendmail(cfg["from_email"], to_emails, msg.as_string())


class EmailService:
    @staticmethod
    async def send(to_emails, subject: str, html_body: str) -> bool:
        """Best-effort send -- returns False (and logs) instead of raising,
        so a notification email failing never breaks the request that
        triggered it (e.g. placing an order)."""
        if isinstance(to_emails, str):
            to_emails = [to_emails]
        cfg = await _get_smtp_config()
        if not cfg:
            logger.warning("SMTP not configured/enabled -- skipping email %r to %s", subject, to_emails)
            return False
        try:
            await asyncio.to_thread(_send_sync, cfg, to_emails, subject, html_body)
            return True
        except Exception as e:
            logger.error("Failed to send email %r to %s: %s", subject, to_emails, e)
            return False
