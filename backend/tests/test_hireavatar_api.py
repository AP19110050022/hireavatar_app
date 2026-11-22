"""HireAvatar backend regression tests (auth, presenters, upload, offers, conversations)."""
import io
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

FE_ENV = dotenv_values("/app/frontend/.env")
BE_ENV = dotenv_values("/app/backend/.env")
BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or FE_ENV["EXPO_PUBLIC_BACKEND_URL"]).rstrip("/")
API = f"{BASE_URL}/api"
BIZ = {"Authorization": "Bearer test_token_business"}
PRES = {"Authorization": "Bearer test_token_presenter"}

mdb = MongoClient(BE_ENV["MONGO_URL"])[BE_ENV["DB_NAME"]]
CREATED = {"users": [], "tokens": [], "offers": [], "convs": [], "files": []}


def make_user(role=None, name="TEST_user"):
    uid = f"TEST_{uuid.uuid4().hex[:10]}"
    tok = f"TEST_tok_{uuid.uuid4().hex}"
    mdb.users.insert_one({"user_id": uid, "email": f"{uid}@example.com", "name": name, "picture": "", "role": role,
                          "business_name": "", "created_at": datetime.now(timezone.utc)})
    mdb.user_sessions.insert_one({"session_token": tok, "user_id": uid, "expires_at": datetime.now(timezone.utc) + timedelta(days=1)})
    CREATED["users"].append(uid)
    CREATED["tokens"].append(tok)
    return uid, {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="session", autouse=True)
def cleanup():
    yield
    for uid in CREATED["users"]:
        mdb.users.delete_one({"user_id": uid})
        mdb.presenters.delete_one({"user_id": uid})
    for t in CREATED["tokens"]:
        mdb.user_sessions.delete_one({"session_token": t})
    for oid in CREATED["offers"]:
        mdb.offers.delete_one({"offer_id": oid})
    for cid in CREATED["convs"]:
        mdb.conversations.delete_one({"conversation_id": cid})
        mdb.messages.delete_many({"conversation_id": cid})
    for p in CREATED["files"]:
        mdb.files.delete_one({"storage_path": p})


def presenter_payload(**kw):
    base = {"name": "TEST_Presenter", "headline": "TEST headline", "bio": "bio", "city": "Pune", "languages": ["English"],
            "categories": ["Tech", "NotACat"], "photos": [], "price_per_video": 700, "price_part_time": 9000, "price_full_time": 20000}
    base.update(kw)
    return base


# --- public catalogue
class TestPublic:
    def test_categories(self):
        r = requests.get(f"{API}/categories")
        assert r.status_code == 200 and "Tech" in r.json() and len(r.json()) == 10

    def test_presenters_list_and_paging(self):
        r = requests.get(f"{API}/presenters", params={"limit": 50})
        assert r.status_code == 200
        allp = r.json()
        ids = [p["user_id"] for p in allp]
        assert all(f"seed_presenter_{i}" in ids for i in range(1, 9))
        assert all("_id" not in p for p in allp)
        p1 = requests.get(f"{API}/presenters", params={"skip": 0, "limit": 3}).json()
        p2 = requests.get(f"{API}/presenters", params={"skip": 3, "limit": 3}).json()
        assert len(p1) == 3 and len(p2) == 3
        assert not set(x["user_id"] for x in p1) & set(x["user_id"] for x in p2)
        assert requests.get(f"{API}/presenters", params={"limit": 0}).status_code == 422
        assert requests.get(f"{API}/presenters", params={"limit": 51}).status_code == 422

    def test_presenters_filter_category_and_q(self):
        r = requests.get(f"{API}/presenters", params={"category": "Food", "limit": 50}).json()
        assert r and all("Food" in p["categories"] for p in r)
        r = requests.get(f"{API}/presenters", params={"q": "hyderabad"}).json()
        assert any(p["user_id"] == "seed_presenter_1" for p in r)
        r = requests.get(f"{API}/presenters", params={"q": "(.*"})
        assert r.status_code == 200
        r = requests.get(f"{API}/presenters", params={"category": "All", "limit": 50}).json()
        assert len(r) >= 8

    def test_presenter_detail_and_404(self):
        r = requests.get(f"{API}/presenters/seed_presenter_1")
        assert r.status_code == 200
        d = r.json()
        assert d["name"] == "Ganesh Reddy" and d["price_per_video"] == 500 and d["price_full_time"] == 14000
        assert requests.get(f"{API}/presenters/nope_404").status_code == 404


# --- auth / me / role
class TestAuth:
    @pytest.mark.parametrize("hdr", [{}, {"Authorization": "Bearer bad_token_xyz"}, {"Authorization": "Basic abc"}])
    def test_unauthorized(self, hdr):
        for m, path in [("get", "/me"), ("get", "/offers"), ("get", "/conversations"), ("post", "/me/role")]:
            r = getattr(requests, m)(f"{API}{path}", headers=hdr, json={"role": "business"})
            assert r.status_code == 401, f"{m} {path} -> {r.status_code}"

    def test_expired_session_401(self):
        uid, h = make_user("business")
        mdb.user_sessions.update_one({"session_token": h["Authorization"][7:]}, {"$set": {"expires_at": datetime.now(timezone.utc) - timedelta(hours=1)}})
        assert requests.get(f"{API}/me", headers=h).status_code == 401

    def test_me(self):
        b = requests.get(f"{API}/me", headers=BIZ).json()
        p = requests.get(f"{API}/me", headers=PRES).json()
        assert b["user_id"] == "test_business_1" and b["role"] == "business"
        assert p["user_id"] == "test_presenter_1" and p["role"] == "presenter"

    def test_role_business_then_switch_blocked(self):
        uid, h = make_user(None)
        assert requests.get(f"{API}/me", headers=h).json()["role"] is None
        r = requests.post(f"{API}/me/role", headers=h, json={"role": "business", "business_name": "  TEST_Co  "})
        assert r.status_code == 200 and r.json()["role"] == "business" and r.json()["business_name"] == "TEST_Co"
        assert requests.post(f"{API}/me/role", headers=h, json={"role": "presenter"}).status_code == 400
        assert requests.get(f"{API}/me", headers=h).json()["role"] == "business"
        assert requests.post(f"{API}/me/role", headers=h, json={"role": "admin"}).status_code == 422

    def test_role_presenter_creates_profile(self):
        uid, h = make_user(None, name="TEST_Pres")
        r = requests.post(f"{API}/me/role", headers=h, json={"role": "presenter"})
        assert r.status_code == 200 and r.json()["role"] == "presenter"
        me = requests.get(f"{API}/presenters/me", headers=h)
        assert me.status_code == 200 and me.json()["user_id"] == uid and me.json()["name"] == "TEST_Pres"
        assert requests.get(f"{API}/presenters/{uid}").status_code == 200
        assert requests.post(f"{API}/me/role", headers=h, json={"role": "business"}).status_code == 400


# --- presenter profile edit
class TestPresenterMe:
    def test_business_forbidden(self):
        assert requests.put(f"{API}/presenters/me", headers=BIZ, json=presenter_payload()).status_code == 403
        assert requests.get(f"{API}/presenters/me", headers=BIZ).status_code == 404

    def test_update_and_validation(self):
        uid, h = make_user(None, name="TEST_Edit")
        requests.post(f"{API}/me/role", headers=h, json={"role": "presenter"})
        r = requests.put(f"{API}/presenters/me", headers=h, json=presenter_payload())
        assert r.status_code == 200, r.text
        assert r.json()["categories"] == ["Tech"] and r.json()["price_per_video"] == 700
        g = requests.get(f"{API}/presenters/{uid}").json()
        assert g["headline"] == "TEST headline" and g["price_part_time"] == 9000
        for bad in [{"price_per_video": 99}, {"price_part_time": 50}, {"price_full_time": 0}, {"name": ""},
                    {"photos": ["x"] * 7}, {"headline": "x" * 81}]:
            assert requests.put(f"{API}/presenters/me", headers=h, json=presenter_payload(**bad)).status_code == 422, bad

    def test_get_presenter_me(self):
        r = requests.get(f"{API}/presenters/me", headers=PRES)
        assert r.status_code == 200 and r.json()["user_id"] == "test_presenter_1"


# --- upload + public file fetch
class TestUpload:
    def test_upload_image_and_fetch(self):
        from PIL import Image
        buf = io.BytesIO()
        Image.new("RGB", (8, 8), (255, 0, 128)).save(buf, "PNG")
        png = buf.getvalue()
        r = requests.post(f"{API}/upload", headers=PRES, files={"file": ("TEST_photo.png", png, "image/png")}, timeout=60)
        assert r.status_code == 200, r.text
        url = r.json()["url"]
        assert url.startswith("/api/files/")
        CREATED["files"].append(url[len("/api/files/"):])
        g = requests.get(f"{BASE_URL}{url}", timeout=60)
        assert g.status_code == 200 and g.content == png and g.headers["content-type"].startswith("image/png")

    def test_upload_rejects_non_image_and_unauth(self):
        r = requests.post(f"{API}/upload", headers=PRES, files={"file": ("a.txt", b"hello", "text/plain")})
        assert r.status_code == 400
        r = requests.post(f"{API}/upload", files={"file": ("a.png", b"x", "image/png")})
        assert r.status_code == 401
        assert requests.get(f"{API}/files/hireavatar/uploads/nope.png").status_code == 404


# --- offers + conversations + messages
class TestOffersChat:
    def test_full_flow(self):
        # fresh presenter so offer state is isolated
        pid, ph = make_user(None, name="TEST_OfferPres")
        requests.post(f"{API}/me/role", headers=ph, json={"role": "presenter"})
        body = {"presenter_id": pid, "plan": "part_time", "brief": "TEST_ brief for a promo", "budget": 12000}
        assert requests.post(f"{API}/offers", headers=PRES, json=body).status_code == 403
        assert requests.post(f"{API}/offers", headers=BIZ, json={**body, "presenter_id": "nope"}).status_code == 404
        assert requests.post(f"{API}/offers", headers=BIZ, json={**body, "budget": 50}).status_code == 422
        assert requests.post(f"{API}/offers", headers=BIZ, json={**body, "brief": "hi"}).status_code == 422
        assert requests.post(f"{API}/offers", headers=BIZ, json={**body, "plan": "weekly"}).status_code == 422
        r = requests.post(f"{API}/offers", headers=BIZ, json=body)
        assert r.status_code == 200, r.text
        o = r.json()
        CREATED["offers"].append(o["offer_id"])
        CREATED["convs"].append(o["conversation_id"])
        assert o["status"] == "pending" and o["business_name"] == "Acme" and o["presenter_name"] == "TEST_OfferPres"

        # both sides see it + status filter
        assert any(x["offer_id"] == o["offer_id"] for x in requests.get(f"{API}/offers", headers=BIZ, params={"limit": 100}).json())
        assert any(x["offer_id"] == o["offer_id"] for x in requests.get(f"{API}/offers", headers=ph, params={"status": "pending"}).json())
        assert not any(x["offer_id"] == o["offer_id"] for x in requests.get(f"{API}/offers", headers=ph, params={"status": "accepted"}).json())
        assert not any(x["offer_id"] == o["offer_id"] for x in requests.get(f"{API}/offers", headers=PRES).json())

        # respond: only the presenter
        assert requests.post(f"{API}/offers/{o['offer_id']}/respond", headers=BIZ, json={"action": "accept"}).status_code == 404
        assert requests.post(f"{API}/offers/{o['offer_id']}/respond", headers=PRES, json={"action": "accept"}).status_code == 404
        assert requests.post(f"{API}/offers/{o['offer_id']}/respond", headers=ph, json={"action": "maybe"}).status_code == 422
        r = requests.post(f"{API}/offers/{o['offer_id']}/respond", headers=ph, json={"action": "accept"})
        assert r.status_code == 200 and r.json()["status"] == "accepted"
        assert requests.post(f"{API}/offers/{o['offer_id']}/respond", headers=ph, json={"action": "decline"}).status_code == 400
        assert any(x["offer_id"] == o["offer_id"] for x in requests.get(f"{API}/offers", headers=BIZ, params={"status": "accepted", "limit": 100}).json())

        # second offer reuses conversation, decline path
        r2 = requests.post(f"{API}/offers", headers=BIZ, json={**body, "plan": "per_video", "budget": 800}).json()
        CREATED["offers"].append(r2["offer_id"])
        assert r2["conversation_id"] == o["conversation_id"]
        d = requests.post(f"{API}/offers/{r2['offer_id']}/respond", headers=ph, json={"action": "decline"})
        assert d.status_code == 200 and d.json()["status"] == "declined"

        cid = o["conversation_id"]
        # conversations visible to both
        assert any(c["conversation_id"] == cid for c in requests.get(f"{API}/conversations", headers=BIZ).json())
        convs = requests.get(f"{API}/conversations", headers=ph).json()
        assert convs[0]["conversation_id"] == cid and convs[0]["last_message"].startswith("Offer declined")
        assert requests.get(f"{API}/conversations/{cid}", headers=ph).json()["business_id"] == "test_business_1"

        msgs = requests.get(f"{API}/conversations/{cid}/messages", headers=BIZ).json()
        assert len(msgs) == 4 and msgs[0]["text"].startswith("New Part-time offer · ₹12,000")
        m = requests.post(f"{API}/conversations/{cid}/messages", headers=ph, json={"text": "  TEST_ hello  "})
        assert m.status_code == 200 and m.json()["text"] == "TEST_ hello"
        assert requests.post(f"{API}/conversations/{cid}/messages", headers=ph, json={"text": ""}).status_code == 422
        msgs = requests.get(f"{API}/conversations/{cid}/messages", headers=BIZ).json()
        assert msgs[-1]["text"] == "TEST_ hello" and msgs[-1]["sender_id"] == pid
        assert requests.get(f"{API}/conversations/{cid}", headers=BIZ).json()["last_message"] == "TEST_ hello"

        # non-participant -> 404
        for path in [f"/conversations/{cid}", f"/conversations/{cid}/messages"]:
            assert requests.get(f"{API}{path}", headers=PRES).status_code == 404
        assert requests.post(f"{API}/conversations/{cid}/messages", headers=PRES, json={"text": "x"}).status_code == 404
        assert requests.get(f"{API}/conversations/conv_nope", headers=BIZ).status_code == 404

    def test_existing_seed_offer_visible(self):
        b = requests.get(f"{API}/offers", headers=BIZ, params={"limit": 100}).json()
        p = requests.get(f"{API}/offers", headers=PRES, params={"limit": 100}).json()
        common = {o["offer_id"] for o in b} & {o["offer_id"] for o in p}
        assert common, "expected existing offer between test_business_1 and test_presenter_1"
