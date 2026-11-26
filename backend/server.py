import asyncio
import io
import logging
import os
import re
import uuid
import warnings
from contextlib import suppress
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Literal, Optional

import httpx
import jwt
import requests
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, File, HTTPException, Query, Request, Response, UploadFile
from fastapi.concurrency import run_in_threadpool
from jwt import PyJWKClient
from motor.motor_asyncio import AsyncIOMotorClient
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING, IndexModel, ReturnDocument
from pymongo.errors import DuplicateKeyError
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
db = client[os.environ["DB_NAME"]]

CLERK_SECRET_KEY = os.environ.get("CLERK_SECRET_KEY", "")
CLERK_API = "https://api.clerk.com/v1"
_jwks_client: Optional[PyJWKClient] = None


def clerk_frontend_api() -> str:
    """Clerk Frontend API host, decoded from the publishable key (pk_test_/pk_live_ + base64 host$)."""
    fapi = (os.environ.get("CLERK_FRONTEND_API") or "").strip()
    if fapi:
        return fapi
    pk = (os.environ.get("CLERK_PUBLISHABLE_KEY") or os.environ.get("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY") or "").strip()
    if not re.match(r"^pk_(test|live)_", pk):
        return ""
    import base64
    b = pk.split("_", 2)[2]
    try:
        return base64.b64decode(b + "=" * (-len(b) % 4)).decode().rstrip("$")
    except Exception:
        return ""


CLERK_FAPI = clerk_frontend_api()

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "hireavatar"
storage_key: Optional[str] = None

INDEXES: dict[str, list[IndexModel]] = {
    "users": [IndexModel([("user_id", ASCENDING)], name="user_id", unique=True)],
    "user_sessions": [IndexModel([("session_token", ASCENDING)], name="session_token", unique=True)],
    "presenters": [
        IndexModel([("user_id", ASCENDING)], name="user_id", unique=True),
        IndexModel([("categories", ASCENDING)], name="categories"),
        IndexModel([("created_at", DESCENDING)], name="created_desc"),
    ],
    "offers": [
        IndexModel([("offer_id", ASCENDING)], name="offer_id", unique=True),
        IndexModel([("business_id", ASCENDING), ("created_at", DESCENDING)], name="business"),
        IndexModel([("presenter_id", ASCENDING), ("created_at", DESCENDING)], name="presenter"),
    ],
    "conversations": [
        IndexModel([("conversation_id", ASCENDING)], name="conversation_id", unique=True),
        IndexModel([("business_id", ASCENDING), ("presenter_id", ASCENDING)], name="pair", unique=True),
        IndexModel([("updated_at", DESCENDING)], name="updated_desc"),
    ],
    "messages": [IndexModel([("conversation_id", ASCENDING), ("created_at", ASCENDING)], name="conv_time")],
    "files": [IndexModel([("storage_path", ASCENDING)], name="storage_path", unique=True)],
}

CATEGORIES = ["Fashion", "Beauty", "Tech", "Food", "Fitness", "Travel", "Finance", "Education", "Real Estate", "Lifestyle"]


def now() -> datetime:
    return datetime.now(timezone.utc)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


# ---------------------------------------------------------------- models
class User(BaseModel):
    user_id: str
    email: str = ""
    name: str = ""
    picture: str = ""
    role: Optional[Literal["presenter", "business"]] = None
    business_name: str = ""


class RoleIn(BaseModel):
    role: Literal["presenter", "business"]
    business_name: str = ""


class Presenter(BaseModel):
    user_id: str
    name: str
    headline: str = ""
    bio: str = ""
    city: str = ""
    languages: List[str] = []
    categories: List[str] = []
    photos: List[str] = []
    price_per_video: int = 500
    price_part_time: int = 15000
    price_full_time: int = 35000
    online: bool = True
    is_seed: bool = False


class PresenterUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    headline: str = Field("", max_length=80)
    bio: str = Field("", max_length=600)
    city: str = Field("", max_length=40)
    languages: List[str] = []
    categories: List[str] = []
    photos: List[str] = Field(default_factory=list, max_length=6)
    price_per_video: int = Field(ge=100, le=10_000_000)
    price_part_time: int = Field(ge=100, le=10_000_000)
    price_full_time: int = Field(ge=100, le=10_000_000)


def profile_is_public(data: dict) -> bool:
    """A newly chosen presenter role should not expose an empty marketplace card."""
    return bool(data.get("name", "").strip()) and any(
        [data.get("headline", "").strip(), data.get("bio", "").strip(), data.get("city", "").strip(), data.get("photos"), data.get("categories")]
    )


def valid_photo_urls(photos: List[str]) -> bool:
    return all(url.startswith("/api/files/") or url.startswith("https://") for url in photos)


class OfferIn(BaseModel):
    presenter_id: str
    plan: Literal["per_video", "part_time", "full_time"]
    brief: str = Field(min_length=5, max_length=1000)
    budget: int = Field(ge=100, le=100_000_000)


class Offer(BaseModel):
    offer_id: str
    business_id: str
    business_name: str
    presenter_id: str
    presenter_name: str
    presenter_photo: str = ""
    plan: str
    brief: str
    budget: int
    status: Literal["pending", "accepted", "declined"]
    conversation_id: str
    created_at: datetime


class RespondIn(BaseModel):
    action: Literal["accept", "decline"]


class MessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class Message(BaseModel):
    message_id: str
    conversation_id: str
    sender_id: str
    text: str
    created_at: datetime


class Conversation(BaseModel):
    conversation_id: str
    business_id: str
    business_name: str
    presenter_id: str
    presenter_name: str
    presenter_photo: str = ""
    last_message: str = ""
    updated_at: datetime


# ---------------------------------------------------------------- auth
def get_jwks() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        if CLERK_FAPI:
            _jwks_client = PyJWKClient(f"https://{CLERK_FAPI}/.well-known/jwks.json", cache_jwk_set=True, lifespan=600)
        else:
            _jwks_client = PyJWKClient(
                f"{CLERK_API}/jwks", headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"}, cache_jwk_set=True, lifespan=600
            )
    return _jwks_client


def verify_clerk(token: str) -> dict:
    key = get_jwks().get_signing_key_from_jwt(token).key
    claims = jwt.decode(token, key, algorithms=["RS256"], options={"verify_aud": False}, leeway=10,
                        issuer=f"https://{CLERK_FAPI}" if CLERK_FAPI else None)
    if not claims.get("sub"):
        raise ValueError("no sub")
    return claims


async def fetch_clerk_profile(user_id: str) -> dict:
    if not CLERK_SECRET_KEY:
        return {}
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{CLERK_API}/users/{user_id}", headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"})
        if r.status_code != 200:
            return {}
        d = r.json()
        emails = d.get("email_addresses") or []
        primary = next((e for e in emails if e.get("id") == d.get("primary_email_address_id")), emails[0] if emails else {})
        name = " ".join(x for x in [d.get("first_name"), d.get("last_name")] if x)
        return {"email": primary.get("email_address", ""), "name": name, "picture": d.get("image_url", "")}
    except Exception as exc:
        logger.warning("clerk profile fetch failed: %s", exc)
        return {}


async def current_user(request: Request) -> User:
    auth = request.headers.get("Authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = auth[7:].strip()
    user_id = None
    # Internal sessions (test accounts seeded directly in the database).
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if sess:
        exp = sess["expires_at"]
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp > now():
            user_id = sess["user_id"]
    if not user_id:
        if not CLERK_FAPI and not CLERK_SECRET_KEY:
            raise HTTPException(401, "Sign-in is not configured")
        try:
            claims = await run_in_threadpool(verify_clerk, token)
        except Exception:
            raise HTTPException(401, "Invalid session token")
        user_id = claims["sub"]
    doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        profile = await fetch_clerk_profile(user_id)
        doc = User(user_id=user_id, **profile).model_dump()
        doc["created_at"] = now()
        await db.users.update_one({"user_id": user_id}, {"$setOnInsert": doc}, upsert=True)
        doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return User(**doc)


Auth = Depends(current_user)

# ---------------------------------------------------------------- storage
def init_storage() -> str:
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    global storage_key
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    if resp.status_code == 503:
        storage_key = None
        key = init_storage()
        resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    if resp.status_code == 402:
        raise HTTPException(402, "Storage is out of credits")
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------------------------------------------------------------- app
app = FastAPI()


@app.get("/health", include_in_schema=False)
@app.head("/health", include_in_schema=False)
async def health():
    return {"status": "ok"}


api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"message": "HireAvatar API"}


@api.get("/clerk/config")
async def clerk_config():
    publishable_key = (
        os.environ.get("CLERK_PUBLISHABLE_KEY")
        or os.environ.get("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY")
        or ""
    ).strip()
    enabled = bool(publishable_key and CLERK_FAPI)
    if enabled:
        try:
            async with httpx.AsyncClient(timeout=5, follow_redirects=True) as c:
                response = await c.get(f"https://{CLERK_FAPI}/.well-known/jwks.json")
            enabled = response.status_code == 200
        except Exception:
            enabled = False
    return {
        "enabled": enabled,
        "publishable_key": publishable_key if enabled else "",
        "proxy_url": "",
    }


@api.get("/categories")
async def categories():
    return CATEGORIES


@api.get("/me", response_model=User)
async def me(user: User = Auth):
    return user


class ProfileSync(BaseModel):
    email: str = Field("", max_length=200)
    name: str = Field("", max_length=100)
    picture: str = Field("", max_length=500)


@api.post("/me/sync", response_model=User)
async def sync_me(body: ProfileSync, user: User = Auth):
    """Fill display details from the signed-in Clerk user (display only; identity comes from the verified token)."""
    upd = {k: v.strip() for k, v in body.model_dump().items() if v.strip()}
    if upd:
        await db.users.update_one({"user_id": user.user_id}, {"$set": upd})
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return User(**doc)


@api.post("/me/role", response_model=User)
async def set_role(body: RoleIn, user: User = Auth):
    if user.role and user.role != body.role:
        raise HTTPException(400, "Role already chosen")
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"role": body.role, "business_name": body.business_name.strip()}})
    if body.role == "presenter" and not await db.presenters.find_one({"user_id": user.user_id}, {"_id": 1}):
        p = Presenter(user_id=user.user_id, name=user.name or user.email.split("@")[0] or "Presenter",
                      photos=[user.picture] if user.picture else [], online=True).model_dump()
        p["created_at"] = now()
        p["is_listed"] = False
        await db.presenters.insert_one(p)
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return User(**doc)


@api.get("/presenters", response_model=List[Presenter])
async def list_presenters(q: str = "", category: str = "", skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=50)):
    filters: list[dict] = [{"$or": [{"is_seed": True}, {"is_listed": True}]}]
    if category and category != "All":
        filters.append({"categories": category})
    if q.strip():
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        filters.append({"$or": [{"name": rx}, {"headline": rx}, {"city": rx}, {"categories": rx}]})
    query = filters[0] if len(filters) == 1 else {"$and": filters}
    docs = await db.presenters.find(query, {"_id": 0}).sort([("is_seed", ASCENDING), ("created_at", DESCENDING), ("user_id", ASCENDING)]).skip(skip).limit(limit).to_list(limit)
    return [Presenter(**d) for d in docs]


@api.get("/presenters/me", response_model=Presenter)
async def my_presenter(user: User = Auth):
    doc = await db.presenters.find_one({"user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "No presenter profile")
    return Presenter(**doc)


@api.put("/presenters/me", response_model=Presenter)
async def update_presenter(body: PresenterUpdate, user: User = Auth):
    if user.role != "presenter":
        raise HTTPException(403, "Only presenters can edit a presenter profile")
    data = body.model_dump()
    data["categories"] = [c for c in data["categories"] if c in CATEGORIES]
    if not valid_photo_urls(data["photos"]):
        raise HTTPException(422, "Photos must be secure image URLs uploaded through HireAvatar")
    data["is_listed"] = profile_is_public(data)
    await db.presenters.update_one({"user_id": user.user_id}, {"$set": data, "$setOnInsert": {"created_at": now(), "user_id": user.user_id}}, upsert=True)
    doc = await db.presenters.find_one({"user_id": user.user_id}, {"_id": 0})
    photo = (doc.get("photos") or [""])[0]
    await db.offers.update_many({"presenter_id": user.user_id}, {"$set": {"presenter_name": doc["name"], "presenter_photo": photo}})
    await db.conversations.update_many({"presenter_id": user.user_id}, {"$set": {"presenter_name": doc["name"], "presenter_photo": photo}})
    return Presenter(**doc)


@api.get("/presenters/{presenter_id}", response_model=Presenter)
async def get_presenter(presenter_id: str):
    doc = await db.presenters.find_one({"user_id": presenter_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Presenter not found")
    return Presenter(**doc)


@api.post("/upload")
async def upload(file: UploadFile = File(...), user: User = Auth):
    if user.role != "presenter":
        raise HTTPException(403, "Only presenters can upload profile photos")
    chunks: list[bytes] = []
    total = 0
    while chunk := await file.read(1024 * 1024):
        total += len(chunk)
        if total > 8 * 1024 * 1024:
            raise HTTPException(413, "Image must be under 8 MB")
        chunks.append(chunk)
    data = b"".join(chunks)
    if not data:
        raise HTTPException(400, "Image file is empty")
    formats = {
        "PNG": ("image/png", "png"),
        "JPEG": ("image/jpeg", "jpg"),
        "GIF": ("image/gif", "gif"),
        "WEBP": ("image/webp", "webp"),
    }
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as image:
                image.verify()
                media = formats.get(image.format or "")
    except (UnidentifiedImageError, Image.DecompressionBombWarning, OSError, ValueError):
        media = None
    if not media:
        raise HTTPException(400, "Only valid PNG, JPEG, GIF, and WebP images are allowed")
    content_type, ext = media
    path = f"{APP_NAME}/uploads/{user.user_id}/{uuid.uuid4().hex}.{ext}"
    result = await run_in_threadpool(put_object, path, data, content_type)
    await db.files.insert_one({"storage_path": result["path"], "owner_id": user.user_id, "content_type": content_type,
                               "original_filename": file.filename, "created_at": now()})
    return {"url": f"/api/files/{result['path']}"}


@api.get("/files/{path:path}")
async def download(path: str):
    # Presenter photos are public profile content.
    rec = await db.files.find_one({"storage_path": path}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "File not found")
    data, ctype = await run_in_threadpool(get_object, path)
    return Response(content=data, media_type=rec.get("content_type") or ctype, headers={"Cache-Control": "public, max-age=31536000, immutable"})


# ---------------------------------------------------------------- offers & chat
async def conv_for(business: User, presenter: dict) -> str:
    c = Conversation(conversation_id=new_id("conv"), business_id=business.user_id,
                     business_name=business.business_name or business.name or "Business",
                     presenter_id=presenter["user_id"], presenter_name=presenter["name"],
                     presenter_photo=(presenter.get("photos") or [""])[0], updated_at=now())
    pair = {"business_id": business.user_id, "presenter_id": presenter["user_id"]}
    try:
        await db.conversations.update_one(pair, {"$setOnInsert": c.model_dump()}, upsert=True)
    except DuplicateKeyError:
        # A competing first offer created the pair after our upsert check; use that conversation.
        pass
    existing = await db.conversations.find_one(pair, {"_id": 0, "conversation_id": 1})
    if not existing:
        raise HTTPException(503, "Couldn't start the conversation. Please try again.")
    return existing["conversation_id"]


PLAN_LABEL = {"per_video": "Per Video", "part_time": "Part-time", "full_time": "Full-time"}


@api.post("/offers", response_model=Offer)
async def create_offer(body: OfferIn, user: User = Auth):
    if user.role != "business":
        raise HTTPException(403, "Only businesses can send offers")
    p = await db.presenters.find_one({"user_id": body.presenter_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Presenter not found")
    conv_id = await conv_for(user, p)
    o = Offer(offer_id=new_id("offer"), business_id=user.user_id, business_name=user.business_name or user.name or "Business",
              presenter_id=p["user_id"], presenter_name=p["name"], presenter_photo=(p.get("photos") or [""])[0],
              plan=body.plan, brief=body.brief.strip(), budget=body.budget, status="pending",
              conversation_id=conv_id, created_at=now())
    await db.offers.insert_one(o.model_dump())
    text = f"New {PLAN_LABEL[body.plan]} offer · ₹{body.budget:,}\n{o.brief}"
    await db.messages.insert_one(Message(message_id=new_id("msg"), conversation_id=conv_id, sender_id=user.user_id, text=text, created_at=now()).model_dump())
    await db.conversations.update_one({"conversation_id": conv_id}, {"$set": {"last_message": text, "updated_at": now()}})
    return o


@api.get("/offers", response_model=List[Offer])
async def list_offers(status: str = "", skip: int = Query(0, ge=0), limit: int = Query(30, ge=1, le=100), user: User = Auth):
    query: dict = {"$or": [{"business_id": user.user_id}, {"presenter_id": user.user_id}]}
    if status in ("pending", "accepted", "declined"):
        query["status"] = status
    docs = await db.offers.find(query, {"_id": 0}).sort([("created_at", DESCENDING), ("offer_id", ASCENDING)]).skip(skip).limit(limit).to_list(limit)
    return [Offer(**d) for d in docs]


@api.post("/offers/{offer_id}/respond", response_model=Offer)
async def respond_offer(offer_id: str, body: RespondIn, user: User = Auth):
    status = "accepted" if body.action == "accept" else "declined"
    o = await db.offers.find_one_and_update(
        {"offer_id": offer_id, "presenter_id": user.user_id, "status": "pending"},
        {"$set": {"status": status}},
        projection={"_id": 0},
        return_document=ReturnDocument.AFTER,
    )
    if not o:
        existing = await db.offers.find_one({"offer_id": offer_id}, {"_id": 0, "presenter_id": 1})
        if not existing or existing["presenter_id"] != user.user_id:
            raise HTTPException(404, "Offer not found")
        raise HTTPException(400, "Offer already answered")
    text = f"Offer {status} · {PLAN_LABEL.get(o['plan'], o['plan'])}"
    await db.messages.insert_one(Message(message_id=new_id("msg"), conversation_id=o["conversation_id"], sender_id=user.user_id, text=text, created_at=now()).model_dump())
    await db.conversations.update_one({"conversation_id": o["conversation_id"]}, {"$set": {"last_message": text, "updated_at": now()}})
    return Offer(**o)


async def own_conv(conv_id: str, user: User) -> dict:
    c = await db.conversations.find_one({"conversation_id": conv_id}, {"_id": 0})
    if not c or user.user_id not in (c["business_id"], c["presenter_id"]):
        raise HTTPException(404, "Conversation not found")
    return c


@api.get("/conversations", response_model=List[Conversation])
async def list_convs(user: User = Auth):
    docs = await db.conversations.find({"$or": [{"business_id": user.user_id}, {"presenter_id": user.user_id}]}, {"_id": 0}).sort([("updated_at", DESCENDING), ("conversation_id", ASCENDING)]).to_list(100)
    return [Conversation(**d) for d in docs]


@api.get("/conversations/{conv_id}", response_model=Conversation)
async def get_conv(conv_id: str, user: User = Auth):
    return Conversation(**await own_conv(conv_id, user))


@api.get("/conversations/{conv_id}/messages", response_model=List[Message])
async def list_messages(conv_id: str, user: User = Auth):
    await own_conv(conv_id, user)
    docs = await db.messages.find({"conversation_id": conv_id}, {"_id": 0}).sort([("created_at", DESCENDING), ("message_id", DESCENDING)]).limit(200).to_list(200)
    return [Message(**d) for d in reversed(docs)]


@api.post("/conversations/{conv_id}/messages", response_model=Message)
async def send_message(conv_id: str, body: MessageIn, user: User = Auth):
    await own_conv(conv_id, user)
    m = Message(message_id=new_id("msg"), conversation_id=conv_id, sender_id=user.user_id, text=body.text.strip(), created_at=now())
    await db.messages.insert_one(m.model_dump())
    await db.conversations.update_one({"conversation_id": conv_id}, {"$set": {"last_message": m.text, "updated_at": m.created_at}})
    return m


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ---------------------------------------------------------------- seed
U = "?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=80&w=800"
SEED = [
    ("Ganesh Reddy", "Telugu & English explainer videos", "Hyderabad", ["Tech", "Education"], 500, "https://images.unsplash.com/photo-1500648767791-00dcc994a43e"),
    ("Ananya Roy", "Warm, relatable lifestyle host", "Kolkata", ["Lifestyle", "Beauty"], 1499, "https://images.unsplash.com/photo-1749700332031-cf99864959ea"),
    ("Meera Iyer", "Food & travel storyteller", "Chennai", ["Food", "Travel"], 799, "https://images.unsplash.com/photo-1725033489648-a819750348eb"),
    ("Rahul Sharma", "Confident finance & real estate presenter", "Delhi", ["Finance", "Real Estate"], 1999, "https://images.unsplash.com/photo-1628619487925-e9b8fc4c6b08"),
    ("Arjun Rao", "High-energy fitness creator", "Bengaluru", ["Fitness", "Lifestyle"], 1799, "https://images.unsplash.com/photo-1749353709853-6ed9969b1125"),
    ("Sofia Verma", "Fashion & beauty face", "Mumbai", ["Fashion", "Beauty"], 2499, "https://images.unsplash.com/photo-1618746647602-1384364ac94b"),
    ("Priya Kapoor", "Product demos that convert", "Pune", ["Tech", "Fashion"], 999, "https://images.unsplash.com/photo-1662850886700-4ec19bd30d11"),
    ("Vikram Patel", "Trusted voice for education brands", "Ahmedabad", ["Education", "Finance"], 1299, "https://images.unsplash.com/photo-1598966739654-5e9a252d8c32"),
]


async def seed():
    for i, (name, headline, city, cats, price, img) in enumerate(SEED):
        uid = f"seed_presenter_{i + 1}"
        p = Presenter(user_id=uid, name=name, headline=headline, city=city, categories=cats, languages=["English", "Hindi"],
                      bio=f"Hi, I'm {name.split()[0]}. I present on camera for brands — clear scripts, natural delivery and quick turnaround. Based in {city}.",
                      photos=[img + U], price_per_video=price, price_part_time=price * 12, price_full_time=price * 28,
                      online=True, is_seed=True).model_dump()
        p["created_at"] = now()
        p["is_listed"] = True
        await db.presenters.update_one({"user_id": uid}, {"$setOnInsert": p}, upsert=True)


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)


@app.on_event("startup")
async def startup():
    app.state.index_task = asyncio.create_task(ensure_indexes())
    await seed()
    try:
        await run_in_threadpool(init_storage)
    except Exception as exc:
        logger.error("storage init failed: %s", exc)


@app.on_event("shutdown")
async def shutdown():
    app.state.index_task.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()
