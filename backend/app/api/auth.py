from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.core.database import get_supabase
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.models.user import UserRegister, UserLogin, TokenOut, UserOut

router = APIRouter()


def _user_public(row: dict) -> dict:
    return {k: row.get(k) for k in ("id", "email", "full_name", "avatar_url", "created_at")}


@router.post("/register", response_model=TokenOut)
def register(payload: UserRegister):
    sb = get_supabase()

    existing = sb.table("users").select("id").eq("email", payload.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already in use")

    insert = sb.table("users").insert({
        "email": payload.email,
        "full_name": payload.full_name,
        "password_hash": hash_password(payload.password),
    }).execute()

    if not insert.data:
        raise HTTPException(status_code=500, detail="Failed to create user")

    user = insert.data[0]
    token = create_access_token(subject=user["id"])

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _user_public(user)
    }

@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends()):
    sb = get_supabase()
    res = sb.table("users").select("*").eq("email", form.username).execute()
    if not res.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = res.data[0]
    if not verify_password(form.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(subject=user["id"])
    return {"access_token": token, "token_type": "bearer", "user": _user_public(user)}


@router.post("/login-json", response_model=TokenOut)
def login_json(payload: UserLogin):
    sb = get_supabase()
    res = sb.table("users").select("*").eq("email", payload.email).execute()
    if not res.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = res.data[0]
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(subject=user["id"])
    return {"access_token": token, "token_type": "bearer", "user": _user_public(user)}


@router.get("/me", response_model=UserOut)
def me(user=Depends(get_current_user)):
    return user
