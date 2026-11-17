"""Bilingual (English + Bangla) transactional emails in the LEGAL AI look: cream card, walnut
accents. Each builder returns ``(subject, text, html)``. Inline styles only — email clients
ignore stylesheets."""
from __future__ import annotations

from html import escape

WALNUT = "#6b3c22"
INK = "#3a2112"
MUTED = "#8a6a55"
CREAM = "#fdf6ee"
PAGE = "#efdcc7"


def _layout(preheader: str, body_html: str) -> str:
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:{PAGE};font-family:Segoe UI,Helvetica,Arial,sans-serif;color:{INK};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">{escape(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{PAGE};padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
    <tr><td style="background:#4a2a19;border-radius:12px 12px 0 0;padding:18px 28px;">
      <span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:bold;color:#fbf2e8;letter-spacing:1px;">LEGAL AI</span>
      <span style="font-size:12px;color:#e9d6c4;padding-left:8px;">Legal Assistant · আইনি সহায়ক</span>
    </td></tr>
    <tr><td style="background:{CREAM};border-radius:0 0 12px 12px;padding:32px 28px;">
      {body_html}
    </td></tr>
    <tr><td style="padding:18px 8px;text-align:center;font-size:11px;color:{MUTED};">
      AI Legal Assistant for Citizens · Legal Information Platform<br>
      This is an automated message — please don't reply.
    </td></tr>
  </table>
</td></tr></table></body></html>"""


def _button(href: str, label: str) -> str:
    return (
        f'<a href="{escape(href, quote=True)}" style="display:inline-block;background:{WALNUT};color:#fff7ef;'
        f'text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:8px;">{escape(label)}</a>'
    )


def _h1(text: str) -> str:
    return f'<h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:24px;color:{INK};">{escape(text)}</h1>'


def _p(text: str, muted: bool = False) -> str:
    color = MUTED if muted else INK
    return f'<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:{color};">{text}</p>'


def _divider() -> str:
    return '<hr style="border:none;border-top:1px solid #e3cfbd;margin:24px 0;">'


def verification_email(name: str, link: str, hours: int) -> tuple[str, str, str]:
    subject = "Verify your email — LEGAL AI"
    n = escape(name)
    html = _layout(
        "Confirm your email to start using LEGAL AI.",
        _h1("Verify your email")
        + _p(f"Hi {n},")
        + _p("Thanks for joining LEGAL AI. Please confirm this is your email address to activate your account.")
        + f'<p style="margin:24px 0;">{_button(link, "Verify email address")}</p>'
        + _p(f"This link expires in {hours} hours and can be used once. If the button doesn't work, copy this link into your browser:", muted=True)
        + f'<p style="margin:0 0 14px;font-size:12px;word-break:break-all;color:{WALNUT};">{escape(link)}</p>'
        + _divider()
        + _p("<strong>ইমেইল যাচাই করুন</strong>")
        + _p(f"আপনার অ্যাকাউন্ট চালু করতে উপরের বোতামে ক্লিক করুন। লিংকটি {hours} ঘণ্টা পর্যন্ত একবার ব্যবহারযোগ্য।", muted=True)
        + _p("If you didn't create an account, you can ignore this email. · আপনি অ্যাকাউন্ট না খুলে থাকলে এই ইমেইলটি উপেক্ষা করুন।", muted=True),
    )
    text = (
        f"Hi {name},\n\nConfirm your email to activate your LEGAL AI account:\n{link}\n\n"
        f"The link expires in {hours} hours and can be used once.\n"
        "If you didn't create an account, ignore this email.\n\n"
        f"আপনার অ্যাকাউন্ট চালু করতে লিংকে যান: {link}\n"
    )
    return subject, text, html


def reset_code_email(name: str, code: str, minutes: int) -> tuple[str, str, str]:
    subject = f"{code} is your LEGAL AI password reset code"
    n = escape(name)
    spaced = " ".join(code)
    html = _layout(
        f"Your password reset code is {code}.",
        _h1("Reset your password")
        + _p(f"Hi {n},")
        + _p("Use this code to reset your LEGAL AI password:")
        + f'<p style="margin:20px 0;text-align:center;"><span style="display:inline-block;font-family:Consolas,Menlo,monospace;'
        f'font-size:32px;font-weight:bold;letter-spacing:6px;color:{INK};background:#fff;border:1px solid #dcc8b6;'
        f'border-radius:10px;padding:14px 22px;">{escape(spaced)}</span></p>'
        + _p(f"The code expires in <strong>{minutes} minutes</strong>. Never share it — LEGAL AI staff will never ask for it.", muted=True)
        + _divider()
        + _p("<strong>পাসওয়ার্ড রিসেট কোড</strong>")
        + _p(f"উপরের কোডটি {minutes} মিনিটের মধ্যে ব্যবহার করুন। কোডটি কারো সাথে শেয়ার করবেন না।", muted=True)
        + _p("Didn't ask for this? Ignore this email — your password stays the same. · আপনি অনুরোধ না করে থাকলে উপেক্ষা করুন।", muted=True),
    )
    text = (
        f"Hi {name},\n\nYour LEGAL AI password reset code is: {code}\n"
        f"It expires in {minutes} minutes. Never share it.\n"
        "If you didn't ask for this, ignore this email — your password stays the same.\n\n"
        f"পাসওয়ার্ড রিসেট কোড: {code} ({minutes} মিনিট মেয়াদ)\n"
    )
    return subject, text, html


def password_changed_email(name: str, signin_link: str) -> tuple[str, str, str]:
    subject = "Your LEGAL AI password was changed"
    n = escape(name)
    html = _layout(
        "Your password was just changed.",
        _h1("Password changed")
        + _p(f"Hi {n},")
        + _p("The password for your LEGAL AI account was just changed, and you were signed out on other devices.")
        + f'<p style="margin:24px 0;">{_button(signin_link, "Sign in")}</p>'
        + _p("<strong>Wasn't you?</strong> Reset your password right away from the sign-in page and contact support.", muted=True)
        + _divider()
        + _p("আপনার পাসওয়ার্ড পরিবর্তন করা হয়েছে। আপনি না করে থাকলে এখনই পাসওয়ার্ড রিসেট করুন।", muted=True),
    )
    text = (
        f"Hi {name},\n\nThe password for your LEGAL AI account was just changed and other sessions were signed out.\n"
        f"Sign in: {signin_link}\nIf this wasn't you, reset your password immediately.\n"
    )
    return subject, text, html
