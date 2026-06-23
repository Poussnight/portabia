#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""PortabIA — backend isolé (port 5006, DB portabia_db). Conçu par E²SN — Guillaume BOUTON. Apache-2.0.

TOTALEMENT séparé d'E²SNauthor. N'appelle JAMAIS d'IA. Confidentialité 2 couches :
le contenu migré n'est jamais reçu ni stocké ; seules l'identité du compte + des
métadonnées d'action sont conservées (avec consentement).
Sécurité : bcrypt, JWT durci (type+exp), IDOR (user_id du token), rate-limit, lockout.
"""
import os
import re
import hmac
import hashlib
import datetime as dt
from functools import wraps

import jwt
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
except Exception:
    pass

DATABASE_URL = os.environ['DATABASE_URL']
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-insecure-change-me')
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'https://preview.essn.fr').split(',')
APP_BASE_URL = os.environ.get('APP_BASE_URL', 'https://preview.essn.fr/portabia/')
ACCESS_TTL_H = 24
MAX_FAILED = 5
LOCK_MIN = 15
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')

app = Flask(__name__)
CORS(app, origins=CORS_ORIGINS, supports_credentials=False)
limiter = Limiter(key_func=get_remote_address, default_limits=["240/hour"],
                  storage_uri="memory://")


def db():
    if 'db' not in g:
        g.db = psycopg2.connect(DATABASE_URL)
    return g.db


@app.teardown_appcontext
def _close(exc):
    d = g.pop('db', None)
    if d is not None:
        d.close()


def cur():
    return db().cursor(cursor_factory=RealDictCursor)


# ── Auth helpers (durcis, cf. audit E²SN) ──────────────────────────────────
def make_token(user):
    payload = {
        'user_id': user['id'], 'email': user['email'], 'type': 'access',
        'exp': dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=ACCESS_TTL_H),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


def verify_token(token):
    try:
        p = jwt.decode(token, JWT_SECRET, algorithms=['HS256'], options={'require': ['exp']})
        if p.get('type') != 'access':
            return None
        return p
    except (jwt.PyJWTError, ValueError, KeyError):
        return None


def require_auth(f):
    @wraps(f)
    def w(*a, **k):
        tok = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
        p = verify_token(tok)
        if not p:
            return jsonify({'error': 'Authentification requise'}), 401
        # IDOR : l'identité vient TOUJOURS du token, jamais du body.
        request.uid = p['user_id']
        return f(*a, **k)
    return w


def safe_user(row):
    if not row:
        return None
    d = dict(row)
    for s in ('password_hash', 'verify_token'):
        d.pop(s, None)
    for kk, vv in list(d.items()):
        if hasattr(vv, 'isoformat'):
            d[kk] = vv.isoformat()
    return d


def _hash_email(email):
    return hmac.new(JWT_SECRET.encode(), email.lower().strip().encode(), hashlib.sha256).hexdigest()


# ── Mail (contact@essn.fr) — parrainage + vérification ─────────────────────
def send_mail(to_email, subject, html):
    import smtplib, ssl
    from email.mime.text import MIMEText
    from email.utils import formataddr
    host = os.environ.get('CONTACT_SMTP_HOST', 'mail.hostinger.com')
    port = int(os.environ.get('CONTACT_SMTP_PORT', '465'))
    user = os.environ.get('CONTACT_SMTP_USER', '')
    pw = os.environ.get('CONTACT_SMTP_PASS', '')
    if not user or not pw:
        app.logger.warning('SMTP non configuré — mail non envoyé')
        return False
    msg = MIMEText(html, 'html', 'utf-8')
    msg['Subject'] = subject
    msg['From'] = formataddr(('PortabIA · E²SN', user))
    msg['To'] = to_email
    try:
        with smtplib.SMTP_SSL(host, port, context=ssl.create_default_context()) as s:
            s.login(user, pw)
            s.sendmail(user, to_email, msg.as_string())
        return True
    except OSError as e:
        app.logger.error('mail err %s', e)
        return False


def send_mail_async(to_email, subject, html):
    """Envoi non bloquant (l'inscription/parrainage ne doit pas attendre le SMTP)."""
    import threading
    threading.Thread(target=send_mail, args=(to_email, subject, html), daemon=True).start()


def _mail_shell(title, body_html, cta_url=None, cta_label=None):
    cta = (f'<a href="{cta_url}" style="display:inline-block;background:#e07856;color:#fff;'
           f'text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;margin-top:8px">'
           f'{cta_label}</a>') if cta_url else ''
    return (f'<div style="font-family:Geist,Arial,sans-serif;color:#0d1b2a;max-width:560px;line-height:1.55">'
            f'<div style="font-family:Georgia,serif;font-size:24px;margin-bottom:6px">Portab<span style="font-style:italic;color:#e07856">IA</span></div>'
            f'<h2 style="font-weight:600;font-size:18px">{title}</h2>{body_html}{cta}'
            f'<p style="font-size:12px;color:#6b6557;margin-top:24px">Service gratuit opéré par E²SN — Guillaume BOUTON · '
            f'<a href="{APP_BASE_URL}" style="color:#6b6557">PortabIA</a></p></div>')


# ── Health ─────────────────────────────────────────────────────────────────
@app.get('/api/health')
def health():
    return jsonify({'status': 'ok', 'service': 'portabia', 'by': 'E²SN — Guillaume BOUTON'})


# ── Inscription (PII + opt-in rappel CNIL) ────────────────────────────────
@app.post('/api/auth/register')
@limiter.limit("10/hour")
def register():
    d = request.get_json(silent=True) or {}
    email = (d.get('email') or '').strip().lower()
    pw = d.get('password') or ''
    name = (d.get('name') or '').strip()
    if not EMAIL_RE.match(email):
        return jsonify({'error': 'E-mail invalide'}), 400
    if len(pw) < 10:
        return jsonify({'error': 'Mot de passe trop court (10 caractères minimum)'}), 400
    if not name:
        return jsonify({'error': 'Nom requis'}), 400
    consent = bool(d.get('consent_callback'))
    with cur() as c:
        c.execute("SELECT id FROM users WHERE email=%s", (email,))
        if c.fetchone():
            return jsonify({'error': 'Un compte existe déjà avec cet e-mail'}), 409
        vtok = hashlib.sha256(os.urandom(24)).hexdigest()
        c.execute("""INSERT INTO users (email,password_hash,name,phone,professional_function,
                     organization,consent_callback,consent_callback_at,verify_token)
                     VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
                  (email, generate_password_hash(pw), name, (d.get('phone') or '').strip() or None,
                   (d.get('professional_function') or '').strip() or None,
                   (d.get('organization') or '').strip() or None,
                   consent, dt.datetime.now(dt.timezone.utc) if consent else None, vtok))
        user = c.fetchone()
        db().commit()
    # e-mail de vérification (double opt-in)
    link = f"{APP_BASE_URL}#verify={vtok}"
    send_mail_async(email, 'Confirmez votre compte PortabIA',
              _mail_shell('Bienvenue sur PortabIA',
                          '<p>Confirmez votre e-mail pour activer votre compte.</p>',
                          link, 'Confirmer mon e-mail'))
    return jsonify({'token': make_token(user), 'user': safe_user(user)}), 201


@app.post('/api/auth/verify-email')
@limiter.limit("20/hour")
def verify_email():
    tok = (request.get_json(silent=True) or {}).get('token', '')
    if not tok:
        return jsonify({'error': 'Token requis'}), 400
    with cur() as c:
        c.execute("UPDATE users SET email_verified=TRUE, verify_token=NULL WHERE verify_token=%s RETURNING id", (tok,))
        ok = c.fetchone()
        db().commit()
    return jsonify({'verified': bool(ok)})


@app.post('/api/auth/login')
@limiter.limit("15/15minutes")
def login():
    d = request.get_json(silent=True) or {}
    email = (d.get('email') or '').strip().lower()
    pw = d.get('password') or ''
    with cur() as c:
        c.execute("SELECT * FROM users WHERE email=%s", (email,))
        user = c.fetchone()
        now = dt.datetime.now(dt.timezone.utc)
        if user and user['locked_until'] and user['locked_until'] > now:
            return jsonify({'error': 'Compte temporairement verrouillé, réessayez plus tard'}), 429
        if not user or not check_password_hash(user['password_hash'], pw):
            if user:
                fails = user['failed_logins'] + 1
                locked = now + dt.timedelta(minutes=LOCK_MIN) if fails >= MAX_FAILED else None
                c.execute("UPDATE users SET failed_logins=%s, locked_until=%s WHERE id=%s",
                          (fails, locked, user['id']))
                db().commit()
            return jsonify({'error': 'E-mail ou mot de passe incorrect'}), 401
        if user['status'] != 'active':
            return jsonify({'error': 'Compte inactif'}), 403
        c.execute("UPDATE users SET failed_logins=0, locked_until=NULL WHERE id=%s", (user['id'],))
        db().commit()
    return jsonify({'token': make_token(user), 'user': safe_user(user)})


@app.get('/api/auth/me')
@require_auth
def me():
    with cur() as c:
        c.execute("SELECT * FROM users WHERE id=%s", (request.uid,))
        return jsonify({'user': safe_user(c.fetchone())})


# ── Historique d'actions (MÉTADONNÉES only ; IDOR-safe) ───────────────────
@app.get('/api/history')
@require_auth
def history_list():
    with cur() as c:
        c.execute("SELECT id,source_ai,target_ai,axes,scope,label,created_at FROM action_history "
                  "WHERE user_id=%s ORDER BY created_at DESC LIMIT 200", (request.uid,))
        rows = c.fetchall()
    for r in rows:
        if hasattr(r['created_at'], 'isoformat'):
            r['created_at'] = r['created_at'].isoformat()
    return jsonify({'history': rows})


@app.post('/api/history')
@require_auth
@limiter.limit("120/hour")
def history_add():
    d = request.get_json(silent=True) or {}
    # On REFUSE tout champ de contenu : on ne stocke que des métadonnées.
    src = (d.get('source_ai') or '')[:32]
    tgt = (d.get('target_ai') or '')[:32]
    if not src or not tgt:
        return jsonify({'error': 'source_ai et target_ai requis'}), 400
    import json as _json
    axes = d.get('axes') or []
    axes = [str(x)[:32] for x in axes][:10] if isinstance(axes, list) else []
    with cur() as c:
        c.execute("INSERT INTO action_history (user_id,source_ai,target_ai,axes,scope,label) "
                  "VALUES (%s,%s,%s,%s,%s,%s) RETURNING id",
                  (request.uid, src, tgt, _json.dumps(axes), (d.get('scope') or '')[:16] or None,
                   (d.get('label') or '')[:120] or None))
        rid = c.fetchone()['id']
        db().commit()
    return jsonify({'id': rid}), 201


@app.delete('/api/history/<int:hid>')
@require_auth
def history_del(hid):
    with cur() as c:
        # IDOR : on supprime UNIQUEMENT si la ligne appartient au user du token.
        c.execute("DELETE FROM action_history WHERE id=%s AND user_id=%s RETURNING id", (hid, request.uid))
        ok = c.fetchone()
        db().commit()
    return (jsonify({'deleted': True}), 200) if ok else (jsonify({'error': 'Introuvable'}), 404)


# ── Parrainage (e-mail invité conforme, non conservé) ─────────────────────
@app.post('/api/referral')
@require_auth
@limiter.limit("20/day")
def referral():
    d = request.get_json(silent=True) or {}
    invited = (d.get('email') or '').strip().lower()
    if not EMAIL_RE.match(invited):
        return jsonify({'error': 'E-mail invité invalide'}), 400
    h = _hash_email(invited)
    with cur() as c:
        c.execute("SELECT name FROM users WHERE id=%s", (request.uid,))
        sender = c.fetchone()
        # anti-spam : un même invité une seule fois par parrain
        c.execute("SELECT 1 FROM referrals WHERE user_id=%s AND invited_hash=%s", (request.uid, h))
        if c.fetchone():
            return jsonify({'error': 'Invitation déjà envoyée à ce contact'}), 409
        c.execute("INSERT INTO referrals (user_id, invited_hash) VALUES (%s,%s)", (request.uid, h))
        db().commit()
    body = (f"<p>{(sender or {}).get('name','Un utilisateur')} vous invite à essayer "
            f"<b>PortabIA</b> — l'outil gratuit pour migrer votre historique d'une IA à l'autre, "
            f"sans rien perdre et sans que vos données ne quittent votre navigateur.</p>"
            f"<p style='font-size:12px;color:#6b6557'>Vous recevez cet e-mail unique car un utilisateur a "
            f"saisi votre adresse. Elle n'est pas conservée. "
            f"<a href='{APP_BASE_URL}#unsubscribe' style='color:#6b6557'>Ne plus recevoir</a>.</p>")
    send_mail_async(invited, 'Une invitation à essayer PortabIA',
              _mail_shell('On vous invite sur PortabIA', body, APP_BASE_URL, 'Découvrir PortabIA'))
    # NB : l'e-mail invité n'est PAS stocké (seul le hash, pour l'anti-spam).
    return jsonify({'sent': True}), 201


# ── Avis (modération + anti-spam) ──────────────────────────────────────────
@app.get('/api/reviews')
def reviews_list():
    with cur() as c:
        c.execute("SELECT author_name,rating,comment,created_at FROM reviews "
                  "WHERE status='approved' ORDER BY created_at DESC LIMIT 50")
        rows = c.fetchall()
    for r in rows:
        if hasattr(r['created_at'], 'isoformat'):
            r['created_at'] = r['created_at'].isoformat()
    return jsonify({'reviews': rows})


@app.post('/api/reviews')
@limiter.limit("5/day")
def reviews_add():
    d = request.get_json(silent=True) or {}
    if (d.get('website') or '').strip():  # honeypot anti-bot
        return jsonify({'ok': True}), 201
    try:
        rating = int(d.get('rating', 0))
    except (TypeError, ValueError):
        rating = 0
    comment = (d.get('comment') or '').strip()
    if rating < 1 or rating > 5 or len(comment) < 5:
        return jsonify({'error': 'Note (1-5) et commentaire requis'}), 400
    uid = None
    tok = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    p = verify_token(tok)
    if p:
        uid = p['user_id']
    with cur() as c:
        c.execute("INSERT INTO reviews (user_id,author_name,rating,comment,status) "
                  "VALUES (%s,%s,%s,%s,'pending') RETURNING id",
                  (uid, (d.get('author_name') or 'Anonyme')[:60], rating, comment[:1000]))
        db().commit()
    return jsonify({'submitted': True, 'note': 'Avis soumis à modération.'}), 201


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5006, debug=False)
