from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from app.core.config import settings
from app.api import auth, users, projects, tasks, comments, materials, activities, material_types

app = FastAPI(title="Planner API", version="1.0.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(comments.router, prefix="/api/comments", tags=["comments"])
app.include_router(materials.router, prefix="/api/materials", tags=["materials"])
app.include_router(material_types.router, prefix="/api/material-types", tags=["material-types"])
app.include_router(activities.router, prefix="/api/activities", tags=["activities"])


@app.get("/")
def root():
    return {"status": "ok", "service": "Planner API"}


@app.get("/health")
def health():
    return {"status": "healthy"}

