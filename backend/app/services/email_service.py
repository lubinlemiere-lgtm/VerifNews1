# ###########################################################################
# # email_service.py — Envoi d'emails via SMTP (SendGrid, Gmail, etc.)
# # Utilise aiosmtplib pour ne pas bloquer l'event loop FastAPI
# ###########################################################################

import logging
from email.message import EmailMessage

import aiosmtplib

from app.config import settings

logger = logging.getLogger(__name__)


def _is_configured() -> bool:
    """Verifie que les variables SMTP sont renseignees."""
    return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)


async def send_email(to: str, subject: str, html_body: str) -> bool:
    """Envoie un email. Retourne True si envoye, False sinon."""
    if not _is_configured():
        logger.warning(
            "⚠️ SMTP not configured - password reset emails will NOT be sent. "
            "Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in environment. "
            "(attempted recipient: %s)",
            to,
        )
        return False

    msg = EmailMessage()
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(subject)  # Fallback texte
    msg.add_alternative(html_body, subtype="html")

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        logger.info("Email sent to %s — subject: %s", to, subject)
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to, e)
        return False


async def send_password_reset_email(to: str, reset_token: str) -> bool:
    """Envoie l'email de reset mot de passe avec le token."""
    reset_url = f"{settings.APP_FRONTEND_URL}/reset-password?token={reset_token}"

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #1A1A2E; font-size: 24px; margin: 0;">VerifNews</h1>
            <p style="color: #666; font-size: 14px;">Information verifiee, toujours.</p>
        </div>

        <h2 style="color: #333; font-size: 20px;">Reinitialisation du mot de passe</h2>

        <p style="color: #555; line-height: 1.6;">
            Vous avez demande la reinitialisation de votre mot de passe.
            Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
        </p>

        <div style="text-align: center; margin: 32px 0;">
            <a href="{reset_url}"
               style="background-color: #6C63FF; color: white; padding: 14px 32px;
                      border-radius: 8px; text-decoration: none; font-weight: 600;
                      font-size: 16px; display: inline-block;">
                Reinitialiser mon mot de passe
            </a>
        </div>

        <p style="color: #999; font-size: 13px; line-height: 1.5;">
            Ce lien expire dans 15 minutes.<br>
            Si vous n'avez pas fait cette demande, ignorez cet email.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #bbb; font-size: 11px; text-align: center;">
            &copy; VerifNews — Ne repondez pas a cet email.
        </p>
    </div>
    """

    return await send_email(to, "VerifNews — Reinitialisation du mot de passe", html)
