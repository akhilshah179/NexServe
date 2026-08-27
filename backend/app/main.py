"""
NexServe — FastAPI Application Entry Point.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database import Base, engine, SessionLocal
import app.models  # Ensures all SQLAlchemy models are registered
from app.models.service import Category, Service
from app.models.user import User, UserRole, VerificationStatus
from app.routes import (
    health_router,
    auth_router,
    services_router,
    bookings_router,
    contact_router,
    admin_router,
    payments_router,
    addresses_router,
    providers_router,
    reviews_router,
    notifications_router,
    chat_router,
    emergency_router,
    availability_router,
)



# ── Database Initialization & Seeding ─────────────────────
def init_db():
    """Create database tables and seed default categories, providers, and services if empty."""
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # ── Seed Categories ──────────────────────────────
        if db.query(Category).count() == 0:
            default_categories = [
                Category(name="Home Cleaning", description="Professional home cleaning, deep cleaning, and sanitization services.", icon_url="🏠"),
                Category(name="AC Repair", description="AC installation, repair, gas refill, and maintenance services.", icon_url="❄️"),
                Category(name="Salon & Spa", description="Haircuts, styling, facials, massages, and grooming at your doorstep.", icon_url="💇"),
                Category(name="Tutoring", description="Expert tutors for all subjects, exam prep, and skill development.", icon_url="📚"),
                Category(name="Fitness Training", description="Personal trainers, yoga instructors, and nutritionists.", icon_url="💪"),
                Category(name="Car Service", description="Car wash, detailing, repairs, and periodic maintenance.", icon_url="🚗"),
                Category(name="Plumbing", description="Pipe repairs, installations, leak fixing, and drainage services.", icon_url="🔧"),
                Category(name="Electrician", description="Wiring, repairs, appliance installation, and electrical inspections.", icon_url="⚡"),
                Category(name="Painting", description="Interior and exterior painting, texture work, and waterproofing.", icon_url="🎨"),
                Category(name="Pest Control", description="Termite treatment, cockroach control, and general pest management.", icon_url="🪲"),
                Category(name="Packers & Movers", description="Packing, loading, transport, and unpacking for home and office.", icon_url="📦"),
                Category(name="Laundry", description="Washing, ironing, dry cleaning, and stain removal services.", icon_url="🧹"),
            ]
            db.add_all(default_categories)
            db.commit()

        # ── Seed Providers & Services ────────────────────
        if db.query(User).filter(User.role == UserRole.PROVIDER).count() == 0:
            _seed_providers_and_services(db)

    finally:
        db.close()


def _seed_providers_and_services(db):
    """Seed realistic provider users and their service offerings."""
    categories = {cat.name: cat.id for cat in db.query(Category).all()}

    # Provider profiles: (name, email, bio, location, rating, review_count, experience_years, hourly_rate)
    providers_data = [
        # Home Cleaning
        ("Priya Sharma", "priya.sharma@nexserve.com", "Expert in deep cleaning and sanitization with 5+ years of experience.", "Koramangala, Bengaluru", 4.9, 156, 5, 499),
        ("Rahul Verma", "rahul.verma@nexserve.com", "Professional home cleaning specialist covering all Bengaluru areas.", "Indiranagar, Bengaluru", 4.7, 98, 3, 399),

        # AC Repair
        ("Suresh Kumar", "suresh.kumar@nexserve.com", "Certified AC technician for all brands — Samsung, LG, Daikin, Voltas.", "HSR Layout, Bengaluru", 4.8, 210, 7, 599),
        ("Deepak Singh", "deepak.singh@nexserve.com", "AC installation, gas refill, and annual maintenance expert.", "Whitefield, Bengaluru", 4.6, 87, 4, 549),

        # Salon & Spa
        ("Ananya Patel", "ananya.patel@nexserve.com", "Celebrity hairstylist offering premium salon services at your home.", "JP Nagar, Bengaluru", 4.9, 312, 8, 799),
        ("Meera Reddy", "meera.reddy@nexserve.com", "Bridal makeup artist and spa therapist with international training.", "MG Road, Bengaluru", 4.8, 245, 6, 699),

        # Tutoring
        ("Dr. Arun Nair", "arun.nair@nexserve.com", "PhD in Mathematics — teaches JEE, NEET, and board exam preparation.", "Electronic City, Bengaluru", 4.9, 178, 10, 899),
        ("Sneha Gupta", "sneha.gupta@nexserve.com", "English and Science tutor with experience teaching CBSE and ICSE curricula.", "Marathahalli, Bengaluru", 4.7, 134, 5, 649),

        # Fitness Training
        ("Vikram Joshi", "vikram.joshi@nexserve.com", "Certified personal trainer and sports nutritionist — CrossFit & HIIT.", "Jayanagar, Bengaluru", 4.8, 189, 6, 749),
        ("Kavya Rao", "kavya.rao@nexserve.com", "Yoga instructor certified by Isha Foundation. Hatha and Vinyasa styles.", "Malleshwaram, Bengaluru", 4.9, 223, 8, 599),

        # Car Service
        ("AutoCare Pros - Karthik", "karthik.auto@nexserve.com", "Complete car care — detailing, denting, painting, and periodic service.", "BTM Layout, Bengaluru", 4.7, 167, 9, 899),
        ("SpeedFix Garage - Ravi", "ravi.speedfix@nexserve.com", "Multi-brand car repair specialist with doorstep pickup and delivery.", "Hebbal, Bengaluru", 4.6, 112, 5, 799),

        # Plumbing
        ("Mohammed Ismail", "ismail.plumber@nexserve.com", "Master plumber — pipe fitting, leak repair, bathroom renovation.", "Rajajinagar, Bengaluru", 4.8, 198, 12, 449),
        ("Ganesh Hegde", "ganesh.hegde@nexserve.com", "Plumbing and drainage solutions for residential and commercial properties.", "Yelahanka, Bengaluru", 4.6, 89, 4, 399),

        # Electrician
        ("Srinivas Murthy", "srinivas.electric@nexserve.com", "Licensed electrician — wiring, MCB panel, inverter and UPS installation.", "Banashankari, Bengaluru", 4.8, 176, 10, 499),
        ("Naveen Prakash", "naveen.electric@nexserve.com", "Smart home automation and electrical safety inspection specialist.", "Sarjapur Road, Bengaluru", 4.7, 134, 6, 549),

        # Painting
        ("ColorCraft - Ajay", "ajay.colorcraft@nexserve.com", "Premium interior painting, texture finishes, and wall art specialist.", "Basavanagudi, Bengaluru", 4.8, 145, 8, 599),
        ("PaintPro - Manish", "manish.paintpro@nexserve.com", "Full house painting with Asian Paints and Berger. Waterproofing expert.", "KR Puram, Bengaluru", 4.6, 98, 5, 499),

        # Pest Control
        ("SafeGuard Pest - Sunil", "sunil.safeguard@nexserve.com", "Eco-friendly pest control — termite, cockroach, bed bugs, and rodents.", "Koramangala, Bengaluru", 4.7, 134, 7, 699),
        ("PestFree Solutions - Amit", "amit.pestfree@nexserve.com", "Commercial and residential pest management with annual maintenance.", "Whitefield, Bengaluru", 4.5, 76, 4, 599),

        # Packers & Movers
        ("SwiftMove - Rajesh", "rajesh.swiftmove@nexserve.com", "End-to-end relocation services — packing, transport, and setup.", "HSR Layout, Bengaluru", 4.8, 212, 10, 1499),
        ("EasyShift - Pankaj", "pankaj.easyshift@nexserve.com", "Local and intercity moving with insurance and real-time tracking.", "Electronic City, Bengaluru", 4.6, 145, 6, 1299),

        # Laundry
        ("FreshFold - Lakshmi", "lakshmi.freshfold@nexserve.com", "Premium laundry and dry cleaning with free pickup and delivery.", "Indiranagar, Bengaluru", 4.8, 189, 5, 299),
        ("CleanPress - Arjun", "arjun.cleanpress@nexserve.com", "Wash, iron, and stain removal services. Same-day delivery available.", "JP Nagar, Bengaluru", 4.7, 123, 3, 249),
    ]

    # Map provider index to category name
    provider_category_map = [
        "Home Cleaning", "Home Cleaning",
        "AC Repair", "AC Repair",
        "Salon & Spa", "Salon & Spa",
        "Tutoring", "Tutoring",
        "Fitness Training", "Fitness Training",
        "Car Service", "Car Service",
        "Plumbing", "Plumbing",
        "Electrician", "Electrician",
        "Painting", "Painting",
        "Pest Control", "Pest Control",
        "Packers & Movers", "Packers & Movers",
        "Laundry", "Laundry",
    ]

    # Service offerings per category
    services_per_category = {
        "Home Cleaning": [
            ("Full Home Deep Cleaning", "Complete deep cleaning of all rooms, kitchen, and bathrooms with eco-friendly products.", 60),
            ("Kitchen & Bathroom Cleaning", "Thorough cleaning and sanitization of kitchen and bathroom areas.", 45),
        ],
        "AC Repair": [
            ("AC Service & Gas Refill", "Complete AC servicing including filter cleaning, gas top-up, and performance check.", 60),
            ("AC Installation / Uninstallation", "Professional split/window AC mounting, copper piping, and electrical setup.", 90),
        ],
        "Salon & Spa": [
            ("Haircut & Styling", "Professional haircut, blow dry, and styling at your doorstep.", 45),
            ("Full Body Spa & Massage", "Relaxing full body massage with aromatherapy oils and hot towel treatment.", 90),
        ],
        "Tutoring": [
            ("One-on-One Subject Tutoring", "Personalized tutoring session for any subject — Math, Science, English.", 60),
            ("Exam Prep Crash Course", "Intensive exam preparation session with practice tests and strategies.", 90),
        ],
        "Fitness Training": [
            ("Personal Training Session", "Custom workout session with form correction and progress tracking.", 60),
            ("Yoga & Meditation Class", "Guided yoga flow with breathing exercises and mindfulness meditation.", 60),
        ],
        "Car Service": [
            ("Full Car Detailing", "Interior vacuuming, dashboard polish, exterior wash, wax, and tire shine.", 120),
            ("Periodic Car Service", "Engine oil change, filter replacement, brake check, and multi-point inspection.", 180),
        ],
        "Plumbing": [
            ("Leak Repair & Pipe Fixing", "Emergency leak repair, pipe replacement, and joint sealing.", 45),
            ("Bathroom Fixture Installation", "Installation of taps, showers, water heaters, and toilet fittings.", 60),
        ],
        "Electrician": [
            ("Wiring & Switchboard Repair", "Electrical wiring, switchboard installation, and MCB panel setup.", 60),
            ("Appliance Installation", "Installation of fans, lights, geysers, and home automation devices.", 45),
        ],
        "Painting": [
            ("Full Room Painting", "Complete room painting with primer, two coats, and edge finishing.", 240),
            ("Texture & Accent Wall", "Decorative texture finish or accent wall design with premium paints.", 180),
        ],
        "Pest Control": [
            ("General Pest Control", "Treatment for cockroaches, ants, spiders, and common household pests.", 60),
            ("Termite Treatment", "Anti-termite chemical treatment for walls, doors, and wooden furniture.", 120),
        ],
        "Packers & Movers": [
            ("Local House Shifting", "Complete packing, loading, transport, unloading, and unpacking within city.", 480),
            ("Office Relocation", "Professional office moving with IT equipment handling and furniture disassembly.", 480),
        ],
        "Laundry": [
            ("Wash & Iron (10 items)", "Machine wash and professional ironing for up to 10 garments.", 30),
            ("Dry Cleaning (5 items)", "Premium dry cleaning service for delicate fabrics and formal wear.", 30),
        ],
    }

    # Create providers
    created_providers = []
    for i, (name, email, bio, location, rating, review_count, exp, rate) in enumerate(providers_data):
        provider = User(
            email=email,
            full_name=name,
            role=UserRole.PROVIDER,
            is_active=True,
            google_id=f"seeded-provider-{i+1}",
            bio=bio,
            location=location,
            rating=rating,
            review_count=review_count,
            experience_years=exp,
            hourly_rate=rate,
        )
        db.add(provider)
        created_providers.append(provider)

    db.commit()
    for p in created_providers:
        db.refresh(p)

    # Create services for each provider
    for i, provider in enumerate(created_providers):
        cat_name = provider_category_map[i]
        cat_id = categories.get(cat_name)
        if not cat_id:
            continue

        service_list = services_per_category.get(cat_name, [])
        # First provider of each category gets first service, second gets second
        service_index = i % 2
        if service_index < len(service_list):
            title, desc, duration = service_list[service_index]
            service = Service(
                title=title,
                description=desc,
                price=provider.hourly_rate,
                duration_minutes=duration,
                category_id=cat_id,
                provider_id=provider.id,
                is_active=True,
                rating=provider.rating,
                review_count=provider.review_count,
            )
            db.add(service)

        # Also give each provider the other service in their category
        other_index = 1 - service_index
        if other_index < len(service_list):
            title2, desc2, duration2 = service_list[other_index]
            service2 = Service(
                title=title2,
                description=desc2,
                price=round(provider.hourly_rate * 1.2, 2),
                duration_minutes=duration2,
                category_id=cat_id,
                provider_id=provider.id,
                is_active=True,
                rating=round(provider.rating - 0.1, 1),
                review_count=max(0, provider.review_count - 20),
            )
            db.add(service2)

    db.commit()

    # Seed an admin user for testing
    if db.query(User).filter(User.role == UserRole.ADMIN).count() == 0:
        admin = User(
            email="admin@nexserve.com",
            full_name="NexServe Admin",
            role=UserRole.ADMIN,
            is_active=True,
            google_id="seeded-admin-1",
            bio="Platform administrator",
            location="Bengaluru, India",
            rating=5.0,
            review_count=0,
            experience_years=0,
            hourly_rate=0,
        )
        db.add(admin)
        db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    if os.getenv("TESTING") != "true":
        init_db()
    yield



# ── Create the FastAPI App ────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Smart Multi-Service Booking and Management System API",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS Middleware ───────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include Routers ───────────────────────────────────────
app.include_router(health_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(services_router, prefix="/api")
app.include_router(services_router, prefix="/api/v1")
app.include_router(bookings_router, prefix="/api")
app.include_router(bookings_router, prefix="/api/v1")
app.include_router(contact_router, prefix="/api")
app.include_router(contact_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(payments_router, prefix="/api")
app.include_router(payments_router, prefix="/api/v1")
app.include_router(addresses_router, prefix="/api")
app.include_router(addresses_router, prefix="/api/v1")
app.include_router(providers_router, prefix="/api")
app.include_router(providers_router, prefix="/api/v1")
app.include_router(reviews_router, prefix="/api")
app.include_router(reviews_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(emergency_router, prefix="/api")
app.include_router(emergency_router, prefix="/api/v1")
app.include_router(availability_router, prefix="/api")
app.include_router(availability_router, prefix="/api/v1")



# ── Root Endpoint ─────────────────────────────────────────
@app.get("/", tags=["Root"])
def root():
    """Welcome endpoint — confirms the API is running."""
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/api/v1/health",
    }
