"""Plain, self-contained HTML email bodies (inline styles only -- most email
clients strip <style> blocks). Each function returns (subject, html_body)."""

_INK = "#2A2E30"
_TERRACOTTA = "#A0684E"
_CREAM = "#E8E3D7"
_MUTED = "#6E7B85"


def _wrap(title: str, body_html: str) -> str:
    return f"""
    <div style="background:{_CREAM};padding:32px 16px;font-family:Georgia,serif;color:{_INK};">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:4px;overflow:hidden;">
        <div style="background:{_INK};color:{_CREAM};padding:20px 28px;font-size:20px;letter-spacing:0.05em;">
          Rari Ethnic
        </div>
        <div style="padding:28px;">
          <h2 style="margin:0 0 16px;font-size:20px;color:{_INK};">{title}</h2>
          {body_html}
        </div>
        <div style="padding:16px 28px;background:{_CREAM};color:{_MUTED};font-size:12px;">
          Rari Ethnic &middot; Handcrafted in Surat
        </div>
      </div>
    </div>
    """


def _inr(amount: int) -> str:
    return f"₹{amount:,}"


def otp_email(name: str, code: str) -> tuple:
    body = f"""
      <p>Hi {name},</p>
      <p>Your verification code is:</p>
      <p style="font-size:32px;letter-spacing:0.2em;font-weight:bold;color:{_TERRACOTTA};margin:20px 0;">{code}</p>
      <p style="color:{_MUTED};font-size:14px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    """
    return "Verify your Rari Ethnic account", _wrap("Verify your email", body)


def password_reset_email(name: str, reset_link: str) -> tuple:
    body = f"""
      <p>Hi {name},</p>
      <p>Click the button below to reset your password. This link expires in 30 minutes.</p>
      <p style="margin:24px 0;">
        <a href="{reset_link}" style="background:{_TERRACOTTA};color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;">Reset password</a>
      </p>
      <p style="color:{_MUTED};font-size:14px;">If you didn't request this, you can ignore this email.</p>
    """
    return "Reset your Rari Ethnic password", _wrap("Reset your password", body)


def _items_table(items: list) -> str:
    rows = "".join(
        f"""<tr>
              <td style="padding:8px 0;border-bottom:1px solid #eee;">{i['name']}{f" ({i['size']})" if i.get('size') else ""} &times; {i['quantity']}</td>
              <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">{_inr(i['price'] * i['quantity'])}</td>
            </tr>"""
        for i in items
    )
    return f'<table style="width:100%;border-collapse:collapse;font-size:14px;">{rows}</table>'


def order_confirmed_email(order: dict) -> tuple:
    body = f"""
      <p>Hi {order['customer_name']},</p>
      <p>Thank you for your order! We're packing your pieces with care.</p>
      <p style="background:{_CREAM};padding:12px 16px;border-radius:4px;"><strong>Order {order['order_number']}</strong></p>
      {_items_table(order['items'])}
      <p style="margin-top:16px;font-size:16px;"><strong>Total: {_inr(order['total'])}</strong> ({order['payment_method']})</p>
      <p style="color:{_MUTED};font-size:14px;">We'll send another update once it dispatches.</p>
    """
    return f"Order confirmed — {order['order_number']}", _wrap("Order confirmed", body)


_STATUS_COPY = {
    "dispatched": "Your order is on its way!",
    "delivered": "Your order has been delivered.",
    "cancelled": "Your order has been cancelled.",
    "refunded": "Your payment has been refunded.",
}


def order_status_email(order: dict, status: str) -> tuple:
    headline = _STATUS_COPY.get(status, f"Your order status: {status}")
    body = f"""
      <p>Hi {order['customer_name']},</p>
      <p>{headline}</p>
      <p style="background:{_CREAM};padding:12px 16px;border-radius:4px;"><strong>Order {order['order_number']}</strong></p>
    """
    return f"Order {order['order_number']} — {status}", _wrap(headline, body)


def exchange_status_email(exchange: dict) -> tuple:
    status = exchange["status"]
    headline = {
        "approved": "Your exchange request has been approved.",
        "rejected": "Your exchange request could not be approved.",
        "completed": "Your exchange has been completed.",
    }.get(status, f"Your exchange request status: {status}")
    note = f"<p>{exchange['admin_note']}</p>" if exchange.get("admin_note") else ""
    body = f"""
      <p>Hi {exchange['customer_name']},</p>
      <p>{headline}</p>
      <p style="background:{_CREAM};padding:12px 16px;border-radius:4px;"><strong>Order {exchange['order_number']}</strong></p>
      {note}
    """
    return f"Exchange request update — {exchange['order_number']}", _wrap(headline, body)


def admin_new_order_email(order: dict) -> tuple:
    body = f"""
      <p>New order placed on the storefront.</p>
      <p style="background:{_CREAM};padding:12px 16px;border-radius:4px;"><strong>Order {order['order_number']}</strong></p>
      {_items_table(order['items'])}
      <p style="margin-top:16px;font-size:16px;"><strong>Total: {_inr(order['total'])}</strong> ({order['payment_method']})</p>
      <p>{order['customer_name']} &middot; {order['email']} &middot; {order['phone']}</p>
    """
    return f"New order — {order['order_number']}", _wrap("New order", body)


def admin_new_exchange_email(exchange: dict) -> tuple:
    body = f"""
      <p>New exchange request submitted.</p>
      <p style="background:{_CREAM};padding:12px 16px;border-radius:4px;"><strong>Order {exchange['order_number']}</strong></p>
      <p><strong>Reason:</strong> {exchange['reason']}</p>
      {f"<p>{exchange['notes']}</p>" if exchange.get('notes') else ""}
      <p>{exchange['customer_name']} &middot; {exchange['email']} &middot; {exchange['phone']}</p>
    """
    return f"New exchange request — {exchange['order_number']}", _wrap("New exchange request", body)
