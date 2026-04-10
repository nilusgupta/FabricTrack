from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import secrets
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# App setup
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ─── Pydantic Models ───
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "sales"
    department: str = "Sales"

class CreateUserRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "sales"
    department: str = "Sales"

class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None

class StageCreate(BaseModel):
    name: str
    order: int
    color: str = "#9CA3AF"
    description: str = ""

class StageUpdate(BaseModel):
    name: Optional[str] = None
    order: Optional[int] = None
    color: Optional[str] = None
    description: Optional[str] = None

class EnquiryCreate(BaseModel):
    customer_name: str
    fabric_type: str
    quantity: str
    current_stage_id: Optional[str] = None
    assigned_to: Optional[str] = None
    department: Optional[str] = None
    notes: str = ""

class EnquiryUpdate(BaseModel):
    customer_name: Optional[str] = None
    fabric_type: Optional[str] = None
    quantity: Optional[str] = None
    current_stage_id: Optional[str] = None
    assigned_to: Optional[str] = None
    department: Optional[str] = None
    notes: Optional[str] = None

# ─── Auth Routes ───
@api_router.post("/auth/login")
async def login(req: LoginRequest, response: Response, request: Request):
    email = req.email.strip().lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    # Brute force check
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        lockout_until = attempt.get("locked_until")
        if lockout_until and datetime.now(timezone.utc) < lockout_until:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
        else:
            await db.login_attempts.delete_one({"identifier": identifier})

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"locked_until": datetime.now(timezone.utc) + timedelta(minutes=15)}},
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)
    return {"_id": user_id, "email": user["email"], "name": user["name"], "role": user["role"], "department": user.get("department", "")}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access_token = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
        return {"message": "Token refreshed"}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ─── User Management Routes ───
@api_router.get("/users")
async def get_users(request: Request):
    await get_current_user(request)
    users = await db.users.find({}, {"password_hash": 0}).to_list(1000)
    for u in users:
        u["_id"] = str(u["_id"])
        if "created_at" in u and isinstance(u["created_at"], datetime):
            u["created_at"] = u["created_at"].isoformat()
    return users

@api_router.post("/users")
async def create_user(req: CreateUserRequest, request: Request):
    await require_admin(request)
    email = req.email.strip().lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    user_doc = {
        "email": email,
        "password_hash": hash_password(req.password),
        "name": req.name,
        "role": req.role,
        "department": req.department,
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    return {"_id": str(result.inserted_id), "email": email, "name": req.name, "role": req.role, "department": req.department, "is_active": True}

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, req: UpdateUserRequest, request: Request):
    await require_admin(request)
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    user["_id"] = str(user["_id"])
    if "created_at" in user and isinstance(user["created_at"], datetime):
        user["created_at"] = user["created_at"].isoformat()
    return user

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request):
    await require_admin(request)
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

# ─── Stage Master Routes ───
@api_router.get("/stages")
async def get_stages(request: Request):
    await get_current_user(request)
    stages = await db.stages.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return stages

@api_router.post("/stages")
async def create_stage(req: StageCreate, request: Request):
    await require_admin(request)
    stage_id = secrets.token_hex(12)
    stage_doc = {
        "id": stage_id,
        "name": req.name,
        "order": req.order,
        "color": req.color,
        "description": req.description,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.stages.insert_one(stage_doc)
    return {k: v for k, v in stage_doc.items() if k != "_id"}

@api_router.put("/stages/{stage_id}")
async def update_stage(stage_id: str, req: StageUpdate, request: Request):
    await require_admin(request)
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.stages.update_one({"id": stage_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Stage not found")
    stage = await db.stages.find_one({"id": stage_id}, {"_id": 0})
    return stage

@api_router.delete("/stages/{stage_id}")
async def delete_stage(stage_id: str, request: Request):
    await require_admin(request)
    result = await db.stages.delete_one({"id": stage_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Stage not found")
    return {"message": "Stage deleted"}

# ─── Enquiry Routes ───
@api_router.get("/enquiries")
async def get_enquiries(request: Request, stage: Optional[str] = None, department: Optional[str] = None, assigned_to: Optional[str] = None, search: Optional[str] = None):
    await get_current_user(request)
    query = {}
    if stage:
        query["current_stage_id"] = stage
    if department:
        query["department"] = department
    if assigned_to:
        query["assigned_to"] = assigned_to
    if search:
        query["$or"] = [
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"fabric_type": {"$regex": search, "$options": "i"}}
        ]
    enquiries = await db.enquiries.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return enquiries

@api_router.get("/enquiries/{enquiry_id}")
async def get_enquiry(enquiry_id: str, request: Request):
    await get_current_user(request)
    enquiry = await db.enquiries.find_one({"id": enquiry_id}, {"_id": 0})
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    history = await db.enquiry_history.find({"enquiry_id": enquiry_id}, {"_id": 0}).sort("changed_at", -1).to_list(100)
    enquiry["history"] = history
    return enquiry

@api_router.post("/enquiries")
async def create_enquiry(req: EnquiryCreate, request: Request):
    user = await get_current_user(request)
    enquiry_id = secrets.token_hex(12)
    now = datetime.now(timezone.utc).isoformat()
    enquiry_doc = {
        "id": enquiry_id,
        "customer_name": req.customer_name,
        "fabric_type": req.fabric_type,
        "quantity": req.quantity,
        "current_stage_id": req.current_stage_id or "",
        "assigned_to": req.assigned_to or "",
        "department": req.department or user.get("department", ""),
        "notes": req.notes,
        "created_by": user["_id"],
        "created_by_name": user["name"],
        "created_at": now,
        "updated_at": now
    }
    await db.enquiries.insert_one(enquiry_doc)
    # Add initial history entry
    if req.current_stage_id:
        history_doc = {
            "id": secrets.token_hex(12),
            "enquiry_id": enquiry_id,
            "from_stage": "",
            "to_stage": req.current_stage_id,
            "changed_by": user["_id"],
            "changed_by_name": user["name"],
            "changed_at": now,
            "notes": "Enquiry created"
        }
        await db.enquiry_history.insert_one(history_doc)
    return {k: v for k, v in enquiry_doc.items() if k != "_id"}

@api_router.put("/enquiries/{enquiry_id}")
async def update_enquiry(enquiry_id: str, req: EnquiryUpdate, request: Request):
    user = await get_current_user(request)
    existing = await db.enquiries.find_one({"id": enquiry_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Track stage changes in history
    if "current_stage_id" in update_data and update_data["current_stage_id"] != existing.get("current_stage_id", ""):
        history_doc = {
            "id": secrets.token_hex(12),
            "enquiry_id": enquiry_id,
            "from_stage": existing.get("current_stage_id", ""),
            "to_stage": update_data["current_stage_id"],
            "changed_by": user["_id"],
            "changed_by_name": user["name"],
            "changed_at": datetime.now(timezone.utc).isoformat(),
            "notes": f"Stage updated"
        }
        await db.enquiry_history.insert_one(history_doc)

    await db.enquiries.update_one({"id": enquiry_id}, {"$set": update_data})
    enquiry = await db.enquiries.find_one({"id": enquiry_id}, {"_id": 0})
    return enquiry

@api_router.delete("/enquiries/{enquiry_id}")
async def delete_enquiry(enquiry_id: str, request: Request):
    await require_admin(request)
    result = await db.enquiries.delete_one({"id": enquiry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    await db.enquiry_history.delete_many({"enquiry_id": enquiry_id})
    return {"message": "Enquiry deleted"}

# ─── Dashboard Routes ───
@api_router.get("/dashboard")
async def get_dashboard(request: Request):
    await get_current_user(request)
    total = await db.enquiries.count_documents({})
    stages = await db.stages.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    stage_map = {s["id"]: s["name"] for s in stages}

    # By stage
    by_stage_pipeline = [{"$group": {"_id": "$current_stage_id", "count": {"$sum": 1}}}]
    by_stage_raw = await db.enquiries.aggregate(by_stage_pipeline).to_list(100)
    by_stage = [{"stage_id": s["_id"], "stage_name": stage_map.get(s["_id"], "Unknown"), "count": s["count"]} for s in by_stage_raw]

    # By department
    by_dept_pipeline = [{"$group": {"_id": "$department", "count": {"$sum": 1}}}]
    by_dept_raw = await db.enquiries.aggregate(by_dept_pipeline).to_list(100)
    by_department = [{"department": d["_id"] or "Unassigned", "count": d["count"]} for d in by_dept_raw]

    # Recent enquiries
    recent = await db.enquiries.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)

    # Users count
    users_count = await db.users.count_documents({})

    return {
        "total_enquiries": total,
        "by_stage": by_stage,
        "by_department": by_department,
        "recent_enquiries": recent,
        "total_users": users_count,
        "total_stages": len(stages)
    }

# ─── Reports Routes ───
@api_router.get("/reports/enquiries")
async def report_enquiries(request: Request, start_date: Optional[str] = None, end_date: Optional[str] = None, stage: Optional[str] = None, department: Optional[str] = None, assigned_to: Optional[str] = None):
    await get_current_user(request)
    query = {}
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        query.setdefault("created_at", {})["$lte"] = end_date
    if stage:
        query["current_stage_id"] = stage
    if department:
        query["department"] = department
    if assigned_to:
        query["assigned_to"] = assigned_to
    enquiries = await db.enquiries.find(query, {"_id": 0}).sort("created_at", -1).to_list(5000)
    return {"total": len(enquiries), "enquiries": enquiries}

@api_router.get("/reports/stage-summary")
async def report_stage_summary(request: Request):
    await get_current_user(request)
    stages = await db.stages.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    stage_map = {s["id"]: s for s in stages}
    pipeline = [{"$group": {"_id": "$current_stage_id", "count": {"$sum": 1}}}]
    raw = await db.enquiries.aggregate(pipeline).to_list(100)

    summary = []
    for s in stages:
        count = 0
        for r in raw:
            if r["_id"] == s["id"]:
                count = r["count"]
                break
        # Calculate avg time: look at history entries for this stage
        history_entries = await db.enquiry_history.find({"to_stage": s["id"]}, {"_id": 0}).to_list(5000)
        avg_hours = 0
        if history_entries:
            durations = []
            for h in history_entries:
                # Find the next stage change for this enquiry
                next_change = await db.enquiry_history.find_one(
                    {"enquiry_id": h["enquiry_id"], "from_stage": s["id"]},
                    {"_id": 0}
                )
                if next_change:
                    try:
                        start = datetime.fromisoformat(h["changed_at"])
                        end = datetime.fromisoformat(next_change["changed_at"])
                        durations.append((end - start).total_seconds() / 3600)
                    except (ValueError, TypeError):
                        pass
            if durations:
                avg_hours = round(sum(durations) / len(durations), 1)

        summary.append({
            "stage_id": s["id"],
            "stage_name": s["name"],
            "color": s["color"],
            "count": count,
            "avg_hours_in_stage": avg_hours
        })
    return summary

@api_router.get("/reports/user-performance")
async def report_user_performance(request: Request):
    await get_current_user(request)
    users = await db.users.find({}, {"password_hash": 0}).to_list(1000)
    performance = []
    for u in users:
        uid = str(u["_id"])
        total_assigned = await db.enquiries.count_documents({"assigned_to": uid})
        # Get completed count - enquiries at last stage
        stages = await db.stages.find({}, {"_id": 0}).sort("order", -1).limit(1).to_list(1)
        completed = 0
        if stages:
            last_stage_id = stages[0]["id"]
            completed = await db.enquiries.count_documents({"assigned_to": uid, "current_stage_id": last_stage_id})
        performance.append({
            "user_id": uid,
            "user_name": u["name"],
            "department": u.get("department", ""),
            "role": u["role"],
            "total_assigned": total_assigned,
            "completed": completed,
            "completion_rate": round((completed / total_assigned * 100) if total_assigned > 0 else 0, 1)
        })
    return performance

@api_router.get("/reports/department")
async def report_department(request: Request):
    await get_current_user(request)
    pipeline = [
        {"$group": {
            "_id": "$department",
            "total": {"$sum": 1}
        }}
    ]
    raw = await db.enquiries.aggregate(pipeline).to_list(100)
    stages = await db.stages.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    result = []
    for dept in raw:
        dept_name = dept["_id"] or "Unassigned"
        stage_breakdown = []
        for s in stages:
            count = await db.enquiries.count_documents({"department": dept["_id"], "current_stage_id": s["id"]})
            stage_breakdown.append({"stage_name": s["name"], "stage_id": s["id"], "color": s["color"], "count": count})
        result.append({
            "department": dept_name,
            "total": dept["total"],
            "stage_breakdown": stage_breakdown
        })
    return result

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Startup
@app.on_event("startup")
async def startup():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.stages.create_index("id", unique=True)
    await db.enquiries.create_index("id", unique=True)
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "department": "Admin",
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin password updated")
    # Write test credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n## Admin\n- Email: {admin_email}\n- Password: {admin_password}\n- Role: admin\n\n## Auth Endpoints\n- POST /api/auth/login\n- POST /api/auth/logout\n- GET /api/auth/me\n- POST /api/auth/refresh\n")

@app.on_event("shutdown")
async def shutdown():
    client.close()
